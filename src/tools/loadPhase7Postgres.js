import 'dotenv/config';
import pg from 'pg';
import { performance } from 'node:perf_hooks';
import { runMigrations } from '../platform/database/runMigrations.js';
import PostgresUnitOfWork from '../platform/database/PostgresUnitOfWork.js';
import CultivationLeaderboardRepository from '../repositories/CultivationLeaderboardRepository.js';
import CultivationLeaderboardService from '../gameplay/leaderboard/CultivationLeaderboardService.js';
import OutboxRepository from '../repositories/OutboxRepository.js';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import evaluateOperationalSlo from '../platform/observability/evaluateOperationalSlo.js';

const { Pool } = pg;
const TEST_SCHEMA_PREFIX = 'phase7_load_';

function assert(condition, code, details = null) {
    if (!condition) {
        const error = new Error(code);
        error.code = code;
        error.details = details;
        throw error;
    }
}

function sanitizeFailureMessage(error) {
    return String(error?.message || 'Unknown Phase 7 load failure')
        .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[REDACTED_DATABASE_URL]')
        .slice(0, 500);
}

function readInteger(environment, name, fallback, minimum, maximum) {
    const rawValue = String(environment[name] ?? '').trim();
    const value = rawValue ? Number(rawValue) : fallback;
    assert(Number.isSafeInteger(value) && value >= minimum && value <= maximum,
        `${name}_INVALID`, { minimum, maximum });
    return value;
}

function loadConfiguration(environment) {
    const testDatabaseUrl = String(
        environment.PHASE7_TEST_DATABASE_URL
        || environment.PROGRESSION_TEST_DATABASE_URL
        || environment.ACTIVITY_TEST_DATABASE_URL
        || ''
    ).trim();
    if (!testDatabaseUrl) return null;
    assert(/^postgres(?:ql)?:\/\//i.test(testDatabaseUrl),
        'PHASE7_TEST_DATABASE_URL_INVALID');

    const primaryUrl = String(environment.DATABASE_URL || '').trim();
    const databaseIdentity = (value) => {
        const parsed = new URL(value);
        return [
            parsed.protocol,
            parsed.username,
            parsed.hostname,
            parsed.port || '5432',
            parsed.pathname
        ].join('|');
    };
    assert(!primaryUrl || databaseIdentity(testDatabaseUrl) !== databaseIdentity(primaryUrl),
        'PHASE7_TEST_DATABASE_MUST_DIFFER_FROM_PRIMARY');

    const concurrency = readInteger(environment, 'PHASE7_LOAD_CONCURRENCY', 10, 10, 100);
    const operationsPerWorker = readInteger(
        environment,
        'PHASE7_LOAD_OPERATIONS_PER_WORKER',
        20,
        1,
        10000
    );
    const outboxBatchSize = readInteger(environment, 'PHASE7_LOAD_OUTBOX_BATCH_SIZE', 5, 1, 100);
    const poolMax = readInteger(
        environment,
        'PHASE7_LOAD_POOL_MAX',
        Math.min(20, Math.max(6, concurrency)),
        2,
        100
    );

    return Object.freeze({
        testDatabaseUrl,
        concurrency,
        operationsPerWorker,
        outboxBatchSize,
        poolMax
    });
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

function percentile(values, ratio) {
    if (!values.length) return null;
    const sorted = [...values].sort((left, right) => left - right);
    const index = Math.max(0, Math.ceil(sorted.length * ratio) - 1);
    return Number(sorted[index].toFixed(3));
}

function summarizeLatencies(values) {
    return Object.freeze({
        samples: values.length,
        p50: percentile(values, 0.5),
        p95: percentile(values, 0.95),
        p99: percentile(values, 0.99),
        max: values.length ? Number(Math.max(...values).toFixed(3)) : null
    });
}

async function measure(latencies, task) {
    const startedAt = performance.now();
    try {
        return await task();
    } finally {
        latencies.push(performance.now() - startedAt);
    }
}

async function seedLoadData(database, configuration) {
    await database.query(
        `INSERT INTO players (id, name, realm_id, realm_stage, cultivation)
         SELECT
            'phase7-load-player-' || sequence,
            'Load Player ' || sequence,
            ((sequence - 1) % 15) + 1,
            ((sequence - 1) % 10) + 1,
            sequence * 100
         FROM generate_series(1, 100) sequence`
    );

    const eventCount = configuration.concurrency
        * configuration.operationsPerWorker
        * configuration.outboxBatchSize;
    const occurredAt = new Date();
    await database.query(
        `INSERT INTO outbox_events (
            aggregate_type, aggregate_id, event_type, payload, occurred_at, available_at
         )
         SELECT
            'PHASE7_LOAD',
            sequence::text,
            'PHASE7_LOAD_EVENT',
            jsonb_build_object('sequence', sequence),
            $1,
            $1
         FROM generate_series(1, $2::int) sequence`,
        [occurredAt, eventCount]
    );
    return Object.freeze({ eventCount, occurredAt });
}

async function prepareLeaderboard(database) {
    const gameDataManager = bootstrapGameData();
    const unitOfWork = new PostgresUnitOfWork(database);
    const repository = new CultivationLeaderboardRepository({ database });
    const service = new CultivationLeaderboardService({
        repository,
        unitOfWork,
        gameDataManager
    });
    const refreshed = await service.refreshIfDue({ force: true });
    assert(refreshed.status === 'REFRESHED', 'PHASE7_LOAD_LEADERBOARD_NOT_REFRESHED');
    return service;
}

async function runLeaderboardLoad(service, configuration) {
    const latencies = [];
    const errors = [];
    const workers = Array.from({ length: configuration.concurrency }, (_, workerIndex) => (
        (async () => {
            for (let operationIndex = 0;
                operationIndex < configuration.operationsPerWorker;
                operationIndex += 1) {
                try {
                    const page = await measure(latencies, () => service.list({ limit: 20 }));
                    assert(page.items.length === 20,
                        'PHASE7_LOAD_LEADERBOARD_PAGE_SIZE_INVALID',
                        { workerIndex, operationIndex, size: page.items.length });
                } catch (error) {
                    errors.push(error);
                }
            }
        })()
    ));
    await Promise.all(workers);
    return Object.freeze({
        attempted: configuration.concurrency * configuration.operationsPerWorker,
        errors: Object.freeze(errors),
        latencies: Object.freeze(latencies)
    });
}

async function runOutboxLoad(database, seed, configuration) {
    const unitOfWork = new PostgresUnitOfWork(database);
    const repository = new OutboxRepository();
    const claimedEventIds = new Set();
    const latencies = [];
    const errors = [];

    const workers = Array.from({ length: configuration.concurrency }, (_, workerIndex) => (
        (async () => {
            const workerId = `phase7-load-worker-${workerIndex + 1}`;
            for (let operationIndex = 0;
                operationIndex < configuration.operationsPerWorker;
                operationIndex += 1) {
                try {
                    const claimed = await measure(latencies, () => unitOfWork.execute(
                        (client) => repository.claimBatch(client, {
                            workerId,
                            limit: configuration.outboxBatchSize,
                            leaseSeconds: 60,
                            now: new Date()
                        })
                    ));
                    assert(claimed.length === configuration.outboxBatchSize,
                        'PHASE7_LOAD_OUTBOX_BATCH_UNDERFILLED',
                        { workerIndex, operationIndex, size: claimed.length });
                    for (const event of claimed) {
                        assert(!claimedEventIds.has(event.id),
                            'PHASE7_LOAD_OUTBOX_DUPLICATE_CLAIM',
                            { eventId: event.id });
                        claimedEventIds.add(event.id);
                        await unitOfWork.execute((client) => repository.acknowledge(client, {
                            eventId: event.id,
                            workerId,
                            processedAt: new Date()
                        }));
                    }
                } catch (error) {
                    errors.push(error);
                }
            }
        })()
    ));
    await Promise.all(workers);

    const state = await database.query(
        `SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE processed_at IS NOT NULL)::int AS processed,
            percentile_cont(0.95) WITHIN GROUP (
                ORDER BY EXTRACT(EPOCH FROM (processed_at - occurred_at)) * 1000
            ) FILTER (WHERE processed_at IS NOT NULL) AS dispatch_lag_p95_ms
         FROM outbox_events
         WHERE aggregate_type = 'PHASE7_LOAD'`
    );
    const total = Number(state.rows[0].total);
    const processed = Number(state.rows[0].processed);
    assert(total === seed.eventCount, 'PHASE7_LOAD_OUTBOX_SEED_COUNT_INVALID', {
        expected: seed.eventCount,
        total
    });
    assert(processed === seed.eventCount, 'PHASE7_LOAD_OUTBOX_UNPROCESSED_EVENTS', {
        expected: seed.eventCount,
        processed
    });
    assert(claimedEventIds.size === seed.eventCount,
        'PHASE7_LOAD_OUTBOX_CLAIMED_COUNT_INVALID',
        { expected: seed.eventCount, claimed: claimedEventIds.size });

    return Object.freeze({
        attemptedBatches: configuration.concurrency * configuration.operationsPerWorker,
        eventCount: seed.eventCount,
        claimedEventCount: claimedEventIds.size,
        processedEventCount: processed,
        duplicateClaims: 0,
        dispatchLagP95Ms: Number(Number(state.rows[0].dispatch_lag_p95_ms).toFixed(3)),
        errors: Object.freeze(errors),
        latencies: Object.freeze(latencies)
    });
}

let configuration = null;
let configurationFailed = false;
try {
    configuration = loadConfiguration(process.env);
} catch (error) {
    configurationFailed = true;
    console.error(JSON.stringify({
        status: 'FAIL',
        errorCode: error.code || 'PHASE7_LOAD_CONFIGURATION_INVALID',
        connectionAttempted: false,
        details: error.details || null
    }, null, 2));
    process.exitCode = 1;
}

if (!configurationFailed && !configuration) {
    console.log(JSON.stringify({
        status: 'SKIP',
        reason: 'PHASE7_OR_SHARED_TEST_DATABASE_URL_REQUIRED',
        primaryDatabaseUsed: false
    }, null, 2));
} else if (!configurationFailed) {
    const schemaName = `${TEST_SCHEMA_PREFIX}${process.pid}_${Date.now()}`;
    assert(new RegExp(`^${TEST_SCHEMA_PREFIX}[0-9_]+$`).test(schemaName),
        'PHASE7_LOAD_SCHEMA_INVALID');
    const rawPool = new Pool({
        connectionString: configuration.testDatabaseUrl,
        max: configuration.poolMax
    });
    const database = new SchemaScopedPool(rawPool, schemaName);
    let schemaCreated = false;
    let failureStage = 'CREATE_SCHEMA';
    const startedAt = performance.now();

    try {
        await rawPool.query(`CREATE SCHEMA "${schemaName}"`);
        schemaCreated = true;
        failureStage = 'RUN_MIGRATIONS';
        const migrations = await runMigrations({ pool: database });
        failureStage = 'SEED_LOAD_DATA';
        const seed = await seedLoadData(database, configuration);
        failureStage = 'PREPARE_LEADERBOARD';
        const leaderboardService = await prepareLeaderboard(database);
        failureStage = 'RUN_MIXED_LOAD';
        const [leaderboard, outbox] = await Promise.all([
            runLeaderboardLoad(leaderboardService, configuration),
            runOutboxLoad(database, seed, configuration)
        ]);

        const totalAttempts = leaderboard.attempted + outbox.attemptedBatches;
        const totalErrors = leaderboard.errors.length + outbox.errors.length;
        assert(totalErrors === 0, 'PHASE7_LOAD_OPERATION_ERRORS', {
            leaderboardErrors: leaderboard.errors.map((error) => error.code || error.message),
            outboxErrors: outbox.errors.map((error) => error.code || error.message)
        });

        const leaderboardLatency = summarizeLatencies(leaderboard.latencies);
        const outboxLatency = summarizeLatencies(outbox.latencies);
        const availabilityPercent = ((totalAttempts - totalErrors) / totalAttempts) * 100;
        const elapsedMs = performance.now() - startedAt;
        const sloSample = {
            availabilityPercent,
            interactiveLatencyMs: {
                p95: leaderboardLatency.p95,
                p99: leaderboardLatency.p99
            },
            mutationLatencyMs: { p95: outboxLatency.p95 },
            internalErrorRatePercent: (totalErrors / totalAttempts) * 100,
            outboxDispatchLagMs: { p95: outbox.dispatchLagP95Ms },
            violationDurationMinutes: 0
        };

        console.log(JSON.stringify({
            status: 'PASS',
            isolatedSchema: true,
            primaryDatabaseUsed: false,
            sampleKind: 'BOUNDED_LOAD',
            configuration: {
                concurrency: configuration.concurrency,
                operationsPerWorker: configuration.operationsPerWorker,
                outboxBatchSize: configuration.outboxBatchSize,
                poolMax: configuration.poolMax
            },
            appliedMigrationCount: migrations.applied.length,
            elapsedMs: Number(elapsedMs.toFixed(3)),
            throughputOperationsPerSecond: Number(
                ((totalAttempts / elapsedMs) * 1000).toFixed(3)
            ),
            leaderboard: {
                attempted: leaderboard.attempted,
                latencyMs: leaderboardLatency
            },
            outbox: {
                attemptedBatches: outbox.attemptedBatches,
                eventCount: outbox.eventCount,
                processedEventCount: outbox.processedEventCount,
                duplicateClaims: outbox.duplicateClaims,
                dispatchLagP95Ms: outbox.dispatchLagP95Ms,
                latencyMs: outboxLatency
            },
            sloSample,
            sloEvaluation: evaluateOperationalSlo(sloSample)
        }, null, 2));
    } catch (error) {
        console.error(JSON.stringify({
            status: 'FAIL',
            errorCode: error.code || 'PHASE7_POSTGRES_LOAD_FAILED',
            failureStage,
            message: sanitizeFailureMessage(error),
            details: error.details || null,
            isolatedSchema: schemaCreated,
            primaryDatabaseUsed: false
        }, null, 2));
        process.exitCode = 1;
    } finally {
        try {
            if (schemaCreated) {
                assert(schemaName.startsWith(TEST_SCHEMA_PREFIX),
                    'PHASE7_LOAD_SCHEMA_CLEANUP_REJECTED');
                await rawPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
            }
        } catch (error) {
            console.error(JSON.stringify({
                status: 'FAIL',
                errorCode: error.code || 'PHASE7_LOAD_SCHEMA_CLEANUP_FAILED',
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
