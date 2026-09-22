import 'dotenv/config';
import pg from 'pg';
import { runMigrations } from '../platform/database/runMigrations.js';
import PostgresUnitOfWork from '../platform/database/PostgresUnitOfWork.js';
import CultivationLeaderboardRepository from '../repositories/CultivationLeaderboardRepository.js';
import CultivationLeaderboardService from '../gameplay/leaderboard/CultivationLeaderboardService.js';
import OutboxRepository from '../repositories/OutboxRepository.js';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';

const { Pool } = pg;
const TEST_SCHEMA_PREFIX = 'phase7_verify_';

function assert(condition, code, details = null) {
    if (!condition) {
        const error = new Error(code);
        error.code = code;
        error.details = details;
        throw error;
    }
}

function sanitizeFailureMessage(error) {
    return String(error?.message || 'Unknown Phase 7 verification failure')
        .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[REDACTED_DATABASE_URL]')
        .slice(0, 500);
}

class SchemaScopedPool {
    constructor(pool, schemaName) {
        this.pool = pool;
        this.schemaName = schemaName;
    }

    async connect() {
        const client = await this.pool.connect();
        try {
            await client.query(`SET search_path TO "${this.schemaName}", public`);
            return client;
        } catch (error) {
            client.release();
            throw error;
        }
    }

    async query(text, values) {
        const client = await this.connect();
        try {
            return await client.query(text, values);
        } finally {
            client.release();
        }
    }
}

function loadTestDatabaseUrl(environment) {
    const testUrl = String(
        environment.PHASE7_TEST_DATABASE_URL
        || environment.PROGRESSION_TEST_DATABASE_URL
        || environment.ACTIVITY_TEST_DATABASE_URL
        || ''
    ).trim();
    if (!testUrl) return null;
    assert(/^postgres(?:ql)?:\/\//i.test(testUrl), 'PHASE7_TEST_DATABASE_URL_INVALID');
    const primaryUrl = String(environment.DATABASE_URL || '').trim();
    const identity = (value) => {
        const parsed = new URL(value);
        return [parsed.protocol, parsed.username, parsed.hostname, parsed.port || '5432', parsed.pathname].join('|');
    };
    assert(!primaryUrl || identity(testUrl) !== identity(primaryUrl),
        'PHASE7_TEST_DATABASE_MUST_DIFFER_FROM_PRIMARY');
    return testUrl;
}

async function seedPlayers(database) {
    await database.query(
        `INSERT INTO players (id, name, realm_id, realm_stage, cultivation)
         VALUES
            ('phase7-p1', 'Player One', 1, 10, 900),
            ('phase7-p2', 'Player Two', 2, 1, 100),
            ('phase7-p3', 'Player Three', 1, 9, 800),
            ('phase7-p4', 'Player Four', 3, 2, 50),
            ('phase7-p5', 'Player Five', 2, 5, 400)`
    );
}

async function verifyLeaderboard(database) {
    const gameDataManager = bootstrapGameData();
    const unitOfWork = new PostgresUnitOfWork(database);
    const repository = new CultivationLeaderboardRepository({ database });
    let now = new Date('2026-07-18T00:00:00.000Z');
    const service = new CultivationLeaderboardService({
        repository,
        unitOfWork,
        gameDataManager,
        timeProvider: { now: () => now }
    });

    const concurrent = await Promise.all([service.refreshIfDue(), service.refreshIfDue()]);
    assert(concurrent.filter((result) => result.status === 'REFRESHED').length === 1,
        'LEADERBOARD_CONCURRENT_REFRESH_COUNT_INVALID');
    assert(concurrent.filter((result) => result.status === 'SKIPPED').length === 1,
        'LEADERBOARD_CONCURRENT_REFRESH_LOCK_INVALID');

    const firstPage = await service.list({ limit: 2 });
    assert(firstPage.items.length === 2 && firstPage.items[0].displayName === 'Player Four',
        'LEADERBOARD_DATA_DRIVEN_ORDER_INVALID');
    assert(firstPage.nextCursor, 'LEADERBOARD_NEXT_CURSOR_MISSING');
    const secondPage = await service.list({ limit: 2, cursor: firstPage.nextCursor });
    assert(secondPage.items.length === 2 && secondPage.previousCursor,
        'LEADERBOARD_KEYSET_PAGE_INVALID');

    now = new Date(now.getTime() + 300000);
    await database.query(`UPDATE players SET cultivation = 999999 WHERE id = 'phase7-p5'`);
    const refreshed = await service.refreshIfDue();
    assert(refreshed.status === 'REFRESHED', 'LEADERBOARD_FIVE_MINUTE_REFRESH_INVALID');
    let staleRejected = false;
    try {
        await service.list({ limit: 2, cursor: firstPage.nextCursor });
    } catch (error) {
        staleRejected = error.code === 'LEADERBOARD_CURSOR_STALE';
    }
    assert(staleRejected, 'LEADERBOARD_STALE_CURSOR_NOT_REJECTED');

    let rankConstraintRejected = false;
    try {
        await database.query(
            `INSERT INTO cultivation_leaderboard_entries (
                rank, player_id, display_name, realm_id, realm_order,
                realm_name, realm_stage, cultivation, refreshed_at
             ) VALUES (101, 'phase7-p1', 'Invalid', 1, 1, 'Invalid', 1, 0, CURRENT_TIMESTAMP)`
        );
    } catch (error) {
        rankConstraintRejected = error.code === '23514';
    }
    assert(rankConstraintRejected, 'LEADERBOARD_TOP100_CONSTRAINT_NOT_ENFORCED');

    const explain = await database.query(
        `EXPLAIN (FORMAT JSON)
         SELECT rank, player_id
         FROM cultivation_leaderboard_entries
         WHERE (rank, player_id) > (0::smallint, ''::text)
         ORDER BY rank ASC, player_id ASC
         LIMIT 20`
    );
    assert(Boolean(explain.rows[0]?.['QUERY PLAN']), 'LEADERBOARD_QUERY_PLAN_MISSING');

    return {
        concurrentRefresh: true,
        keysetPages: 2,
        staleCursorRejected: true,
        top100Constraint: true,
        queryPlanCaptured: true
    };
}

async function verifyOutboxSkipLocked(database) {
    const now = new Date('2026-07-18T00:10:00.000Z');
    await database.query(
        `INSERT INTO outbox_events (
            aggregate_type, aggregate_id, event_type, payload, occurred_at, available_at
         )
         SELECT 'VERIFY', sequence::text, 'VERIFY_EVENT',
                jsonb_build_object('sequence', sequence), $1, $1
         FROM generate_series(1, 200) sequence`,
        [now]
    );
    const unitOfWork = new PostgresUnitOfWork(database);
    const repository = new OutboxRepository();
    const [left, right] = await Promise.all([
        unitOfWork.execute((client) => repository.claimBatch(client, {
            workerId: 'phase7-worker-a', limit: 100, leaseSeconds: 60, now
        })),
        unitOfWork.execute((client) => repository.claimBatch(client, {
            workerId: 'phase7-worker-b', limit: 100, leaseSeconds: 60, now
        }))
    ]);
    const leftIds = new Set(left.map((event) => event.id));
    const overlap = right.filter((event) => leftIds.has(event.id));
    assert(left.length === 100 && right.length === 100, 'OUTBOX_CONCURRENT_BATCH_SIZE_INVALID', {
        left: left.length,
        right: right.length,
        overlap: overlap.length
    });
    assert(overlap.length === 0, 'OUTBOX_SKIP_LOCKED_DUPLICATE_CLAIM', {
        left: left.length,
        right: right.length,
        overlap: overlap.length
    });
    return { claimed: left.length + right.length, duplicateClaims: overlap.length };
}

let testDatabaseUrl = null;
let configurationFailed = false;
try {
    testDatabaseUrl = loadTestDatabaseUrl(process.env);
} catch (error) {
    configurationFailed = true;
    console.error(JSON.stringify({
        status: 'FAIL',
        errorCode: error.code || 'PHASE7_TEST_DATABASE_CONFIGURATION_INVALID',
        connectionAttempted: false
    }, null, 2));
    process.exitCode = 1;
}

if (!configurationFailed && !testDatabaseUrl) {
    console.log(JSON.stringify({
        status: 'SKIP',
        reason: 'PHASE7_OR_SHARED_TEST_DATABASE_URL_REQUIRED',
        primaryDatabaseUsed: false
    }, null, 2));
} else if (!configurationFailed) {
    const schemaName = `${TEST_SCHEMA_PREFIX}${process.pid}_${Date.now()}`;
    assert(new RegExp(`^${TEST_SCHEMA_PREFIX}[0-9_]+$`).test(schemaName), 'PHASE7_TEST_SCHEMA_INVALID');
    const rawPool = new Pool({ connectionString: testDatabaseUrl, max: 6 });
    const database = new SchemaScopedPool(rawPool, schemaName);
    let schemaCreated = false;
    let failureStage = 'CREATE_SCHEMA';
    try {
        await rawPool.query(`CREATE SCHEMA "${schemaName}"`);
        schemaCreated = true;
        failureStage = 'RUN_MIGRATIONS';
        const migrations = await runMigrations({ pool: database });
        assert(migrations.applied.includes('015_cultivation_leaderboard.sql'),
            'PHASE7_LEADERBOARD_MIGRATION_NOT_APPLIED');
        failureStage = 'SEED_PLAYERS';
        await seedPlayers(database);
        failureStage = 'VERIFY_LEADERBOARD';
        const leaderboard = await verifyLeaderboard(database);
        failureStage = 'VERIFY_OUTBOX';
        const outbox = await verifyOutboxSkipLocked(database);
        console.log(JSON.stringify({
            status: 'PASS',
            isolatedSchema: true,
            appliedMigrationCount: migrations.applied.length,
            leaderboard,
            outbox
        }, null, 2));
    } catch (error) {
        console.error(JSON.stringify({
            status: 'FAIL',
            errorCode: error.code || 'PHASE7_POSTGRES_VERIFICATION_FAILED',
            failureStage,
            message: sanitizeFailureMessage(error),
            constraint: error.constraint || null,
            details: error.details || null,
            isolatedSchema: schemaCreated
        }, null, 2));
        process.exitCode = 1;
    } finally {
        try {
            if (schemaCreated) {
                assert(schemaName.startsWith(TEST_SCHEMA_PREFIX), 'PHASE7_TEST_SCHEMA_CLEANUP_REJECTED');
                await rawPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
            }
        } catch (error) {
            console.error(JSON.stringify({
                status: 'FAIL',
                errorCode: error.code || 'PHASE7_TEST_SCHEMA_CLEANUP_FAILED',
                cleanupFailed: true
            }, null, 2));
            process.exitCode = 1;
        } finally {
            await rawPool.end().catch(() => {
                process.exitCode = 1;
            });
        }
    }
}
