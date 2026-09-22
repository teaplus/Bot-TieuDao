import 'dotenv/config';
import pg from 'pg';
import { runMigrations } from '../platform/database/runMigrations.js';
import PostgresUnitOfWork from '../platform/database/PostgresUnitOfWork.js';
import IdempotentOperationExecutor from '../platform/idempotency/IdempotentOperationExecutor.js';
import IdempotencyRepository from '../repositories/IdempotencyRepository.js';
import ActivityRunRepository from '../repositories/ActivityRunRepository.js';
import PlayerRuntimeRepository from '../repositories/PlayerRuntimeRepository.js';
import ExplorationService from '../gameplay/exploration/ExplorationService.js';
import SecretRealmService from '../gameplay/secret-realm/SecretRealmService.js';
import GatheringCompletionService from '../gameplay/gathering/GatheringCompletionService.js';
import PlayerMapService from '../gameplay/maps/PlayerMapService.js';
import MysteryMerchantService from '../gameplay/shop/MysteryMerchantService.js';
import ShopService from '../gameplay/shop/ShopService.js';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';

const { Pool } = pg;
const TEST_SCHEMA_PREFIX = 'activity_verify_';
const FIXED_NOW = new Date('2026-07-20T00:00:00.000Z');

function assert(condition, code) {
    if (!condition) {
        const error = new Error(code);
        error.code = code;
        throw error;
    }
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

class SchemaScopedPlayerRuntimeRepository extends PlayerRuntimeRepository {
    constructor(database) {
        super();
        this.database = database;
    }

    async findById(playerId, options = {}) {
        return super.findById(playerId, {
            ...options,
            client: options.client || this.database
        });
    }

    async getShopPurchaseCounter(playerId, payload, options = {}) {
        return super.getShopPurchaseCounter(playerId, payload, {
            ...options,
            client: options.client || this.database
        });
    }
}

function databaseIdentity(value) {
    const parsed = new URL(value);
    return [parsed.protocol, parsed.hostname, parsed.port || '5432', parsed.pathname].join('|');
}

function loadTestDatabaseUrl(environment) {
    const testUrl = String(environment.ACTIVITY_TEST_DATABASE_URL || '').trim();
    if (!testUrl) return null;
    assert(/^postgres(?:ql)?:\/\//i.test(testUrl), 'ACTIVITY_TEST_DATABASE_URL_INVALID');
    const primaryUrl = String(environment.DATABASE_URL || '').trim();
    assert(!primaryUrl || databaseIdentity(testUrl) !== databaseIdentity(primaryUrl),
        'ACTIVITY_TEST_DATABASE_MUST_DIFFER_FROM_PRIMARY');
    return testUrl;
}

function createSeedProvider(start = 20260720) {
    let seed = start;
    return { nextSeed: () => seed++ };
}

async function seedPlayer(database, context, input) {
    await database.query(
        `INSERT INTO players (
            id, name, realm_id, realm_stage, spiritual_root, spirit_root_id,
            spirit_root_quality_tier_id, cultivation_art_id, cultivation,
            base_atk, base_def, base_hp, base_spd, spirit_stones, last_cultivate
         ) VALUES ($1, $2, 1, 1, 'FIRE', $3, 'LOWER_GRADE',
                   'CP_FIRE_HOANG', 0, 120, 40, 420, 10, 100, $4)`,
        [input.playerId, input.name, context.spiritRoot.id, FIXED_NOW]
    );
    await database.query(
        `INSERT INTO player_cultivation_arts (player_id, art_id)
         VALUES ($1, 'CP_FIRE_HOANG')`,
        [input.playerId]
    );
    await database.query(
        `INSERT INTO player_skills (player_id, skill_id)
         VALUES ($1, 'SK_FIRE_HOANG')`,
        [input.playerId]
    );
    await database.query(
        `INSERT INTO idle_accumulators (player_id, source_id, checkpoint_at, rules_revision)
         VALUES ($1, 'CULTIVATION', $2, 'cultivation-rules-v1')`,
        [input.playerId, FIXED_NOW]
    );
    if (input.ticketQuantity) {
        await database.query(
            `INSERT INTO player_items (player_id, item_id, quantity, rarity)
             VALUES ($1, 'SECRET_REALM_TICKET', $2, 'COMMON')`,
            [input.playerId, input.ticketQuantity]
        );
    }
}

function createOperationExecutor(database) {
    return new IdempotentOperationExecutor({
        unitOfWork: new PostgresUnitOfWork(database),
        idempotencyRepository: new IdempotencyRepository()
    });
}

function createServices(database, context) {
    const playerRuntimeRepository = new SchemaScopedPlayerRuntimeRepository(database);
    const activityRunRepository = new ActivityRunRepository();
    const operationExecutor = createOperationExecutor(database);
    const playerMapService = new PlayerMapService({
        playerRuntimeRepository,
        gameDataManager: context.gameDataManager,
        operationExecutor
    });
    return {
        exploration: new ExplorationService({
            playerRuntimeRepository,
            activityRunRepository,
            operationExecutor,
            playerMapService,
            gameDataManager: context.gameDataManager,
            seedProvider: createSeedProvider(20260720)
        }),
        secretRealm: new SecretRealmService({
            playerRuntimeRepository,
            activityRunRepository,
            operationExecutor,
            gameDataManager: context.gameDataManager,
            seedProvider: createSeedProvider(20260820)
        }),
        gathering: new GatheringCompletionService({
            playerRuntimeRepository,
            activityRunRepository,
            operationExecutor,
            playerMapService,
            gameDataManager: context.gameDataManager,
            rewardTableService: {
                roll(tableId) {
                    return {
                        tableId,
                        tableName: 'Verification Reward',
                        rewards: [{ type: 'CURRENCY', currencyId: 'SPIRIT_STONE', amount: '7' }]
                    };
                }
            },
            timeProvider: { now: () => FIXED_NOW }
        })
    };
}

async function verifyExploration(database, context, service) {
    const playerId = 'activity-exploration';
    await seedPlayer(database, context, { playerId, name: 'Exploration Verify' });
    const startOptions = {
        operationId: 'verify-exploration-start',
        monsterId: 'TPL_MON_FIRE_001',
        stage: 1,
        maxRounds: 2,
        battleId: 'verify-exploration-battle'
    };
    const reservations = await Promise.all([
        service.reserveExploration(playerId, startOptions),
        service.reserveExploration(playerId, startOptions)
    ]);
    assert(reservations[0].runId === reservations[1].runId
        && reservations.filter((result) => result.idempotentReplay === true).length === 1,
    'EXPLORATION_RESERVE_IDEMPOTENCY_INVALID');

    const runBefore = await database.query(
        `SELECT status FROM activity_runs WHERE id = $1`,
        [reservations[0].runId]
    );
    assert(runBefore.rows[0]?.status === 'IN_PROGRESS', 'EXPLORATION_CRASH_STATE_NOT_DURABLE');

    const battleResult = {
        battleId: startOptions.battleId,
        winnerTeam: 'B',
        loserTeam: 'A',
        rounds: 1,
        turns: 1,
        entities: [],
        statistics: {}
    };
    const completionResults = await Promise.all([
        service.completeExploration(playerId, reservations[0], battleResult, {
            operationId: 'verify-exploration-complete-a', completedAt: FIXED_NOW
        }),
        service.completeExploration(playerId, reservations[0], battleResult, {
            operationId: 'verify-exploration-complete-b', completedAt: FIXED_NOW
        })
    ]);
    assert(completionResults.every((result) => result.outcome === 'DEFEAT')
        && completionResults.filter((result) => result.idempotentReplay === true).length === 1,
    'EXPLORATION_COMPLETION_IDEMPOTENCY_INVALID');

    const persisted = await database.query(
        `SELECT run.status, run.result_snapshot->>'outcome' AS outcome,
                (SELECT COUNT(*) FROM player_exploration_runs projection
                 WHERE projection.activity_run_id = run.id) AS projections
         FROM activity_runs run WHERE run.id = $1`,
        [reservations[0].runId]
    );
    assert(persisted.rows[0]?.status === 'COMPLETED'
        && persisted.rows[0]?.outcome === 'DEFEAT'
        && String(persisted.rows[0]?.projections) === '1',
    'EXPLORATION_COMPLETION_PERSISTENCE_INVALID');
    return { reserveReplay: true, crashStateDurable: true, completionReplay: true };
}

async function verifyPlayerMapMovement(database, context) {
    const playerId = 'activity-map-movement';
    await seedPlayer(database, context, { playerId, name: 'Map Movement Verify' });
    await database.query('UPDATE players SET realm_id = 4 WHERE id = $1', [playerId]);
    const service = new PlayerMapService({
        playerRuntimeRepository: new PlayerRuntimeRepository(),
        gameDataManager: context.gameDataManager,
        unitOfWork: new PostgresUnitOfWork(database),
        operationExecutor: createOperationExecutor(database)
    });

    const initial = await service.getCurrentLocation(playerId);
    assert(initial.current.id === 'THANH_VAN_SON_MACH', 'MAP_INITIAL_LOCATION_INVALID');
    const first = await service.move(playerId, 'HIGHER', { operationId: 'verify-map-move-1' });
    const replay = await service.move(playerId, 'HIGHER', { operationId: 'verify-map-move-1' });
    assert(first.current.id === 'HUYEN_MOC_QUOC'
        && replay.current.id === 'HUYEN_MOC_QUOC'
        && replay.idempotentReplay === true,
    'MAP_MOVEMENT_IDEMPOTENCY_INVALID');
    const second = await service.move(playerId, 'HIGHER', { operationId: 'verify-map-move-2' });
    assert(second.current.id === 'DONG_HOANG_DAI_LUC', 'MAP_ADJACENT_ROUTE_INVALID');

    const third = await service.move(playerId, 'HIGHER', {
        operationId: 'verify-map-move-3'
    });
    assert(third.current.id === 'TRUNG_CHAU_THANH_VUC', 'MAP_FOUR_ACTIVE_ROUTE_INVALID');
    const persisted = await database.query(
        `SELECT state.current_map_id,
                (SELECT COUNT(*) FROM player_map_movements movement
                 WHERE movement.player_id = state.player_id) AS movement_count
         FROM player_map_states state WHERE state.player_id = $1`,
        [playerId]
    );
    assert(persisted.rows[0]?.current_map_id === 'TRUNG_CHAU_THANH_VUC'
        && String(persisted.rows[0]?.movement_count) === '4',
    'MAP_MOVEMENT_PERSISTENCE_INVALID');
    return { lazyInitialization: true, adjacentOnly: true, replaySafe: true, activeMapFourReached: true };
}

class RollbackAfterTicketRepository extends PlayerRuntimeRepository {
    async consumeItemByTemplate(...args) {
        await super.consumeItemByTemplate(...args);
        throw new Error('VERIFY_SECRET_REALM_ROLLBACK');
    }
}

async function verifySecretRealmRollback(database, context) {
    const playerId = 'activity-secret-rollback';
    await seedPlayer(database, context, {
        playerId, name: 'Secret Rollback Verify', ticketQuantity: 1
    });
    const service = new SecretRealmService({
        playerRuntimeRepository: new RollbackAfterTicketRepository(),
        activityRunRepository: new ActivityRunRepository(),
        operationExecutor: createOperationExecutor(database),
        gameDataManager: context.gameDataManager,
        seedProvider: createSeedProvider(20260920)
    });
    let rollbackObserved = false;
    try {
        await service.reserveSecretRealm(playerId, {
            operationId: 'verify-secret-rollback',
            waveCount: 1, realmCode: 'LUYEN_KHI', element: 'FIRE', stage: 1
        });
    } catch (error) {
        rollbackObserved = error.message === 'VERIFY_SECRET_REALM_ROLLBACK';
    }
    assert(rollbackObserved, 'SECRET_REALM_FORCED_ROLLBACK_NOT_OBSERVED');
    const persisted = await database.query(
        `SELECT
            (SELECT COALESCE(SUM(quantity), 0) FROM player_items
             WHERE player_id = $1 AND item_id = 'SECRET_REALM_TICKET') AS tickets,
            (SELECT COUNT(*) FROM activity_runs WHERE player_id = $1) AS runs,
            (SELECT COUNT(*) FROM resource_ledger
             WHERE player_id = $1 AND reason = 'SECRET_REALM_TICKET_COST') AS ledger,
            (SELECT COUNT(*) FROM idempotency_records
             WHERE operation_id = 'verify-secret-rollback') AS idempotency_records`,
        [playerId]
    );
    const row = persisted.rows[0];
    assert(String(row.tickets) === '1' && String(row.runs) === '0'
        && String(row.ledger) === '0' && String(row.idempotency_records) === '0',
    'SECRET_REALM_TICKET_ROLLBACK_NOT_ATOMIC');
    return { ticketDebitRolledBack: true, runRolledBack: true, ledgerRolledBack: true };
}

async function verifySecretRealmRace(database, context, service) {
    const playerId = 'activity-secret-race';
    await seedPlayer(database, context, {
        playerId, name: 'Secret Race Verify', ticketQuantity: 1
    });
    const starts = await Promise.allSettled([
        service.reserveSecretRealm(playerId, {
            operationId: 'verify-secret-race-a',
            waveCount: 1, realmCode: 'LUYEN_KHI', element: 'FIRE', stage: 1
        }),
        service.reserveSecretRealm(playerId, {
            operationId: 'verify-secret-race-b',
            waveCount: 1, realmCode: 'LUYEN_KHI', element: 'FIRE', stage: 1
        })
    ]);
    const fulfilled = starts.filter((result) => result.status === 'fulfilled');
    const rejected = starts.filter((result) => result.status === 'rejected');
    assert(fulfilled.length === 1 && rejected.length === 1
        && rejected[0].reason?.message === 'SECRET_REALM_TICKET_REQUIRED',
    'SECRET_REALM_ONE_TICKET_RACE_INVALID');
    const reservation = fulfilled[0].value;

    const crashState = await database.query(
        `SELECT run.status,
                (SELECT COALESCE(SUM(quantity), 0) FROM player_items
                 WHERE player_id = run.player_id AND item_id = 'SECRET_REALM_TICKET') AS tickets,
                (SELECT COUNT(*) FROM resource_ledger
                 WHERE player_id = run.player_id AND reason = 'SECRET_REALM_TICKET_COST') AS ledger
         FROM activity_runs run WHERE run.id = $1`,
        [reservation.runId]
    );
    assert(crashState.rows[0]?.status === 'IN_PROGRESS'
        && String(crashState.rows[0]?.tickets) === '0'
        && String(crashState.rows[0]?.ledger) === '1',
    'SECRET_REALM_RESERVED_CRASH_STATE_INVALID');

    const waveResults = [{
        waveNumber: 1,
        type: 'BOSS',
        outcome: 'DEFEAT',
        carriedHP: '0',
        battleResult: {
            battleId: 'verify-secret-race:wave:1',
            winnerTeam: 'B',
            loserTeam: 'A',
            rounds: 1,
            turns: 1,
            entities: [],
            statistics: {}
        }
    }];
    const completions = await Promise.all([
        service.completeSecretRealm(playerId, reservation, waveResults, {
            operationId: 'verify-secret-complete-a', completedAt: FIXED_NOW
        }),
        service.completeSecretRealm(playerId, reservation, waveResults, {
            operationId: 'verify-secret-complete-b', completedAt: FIXED_NOW
        })
    ]);
    assert(completions.every((result) => result.outcome === 'FAILED')
        && completions.filter((result) => result.idempotentReplay === true).length === 1,
    'SECRET_REALM_COMPLETION_IDEMPOTENCY_INVALID');
    const completed = await database.query(
        `SELECT run.status,
                (SELECT COUNT(*) FROM player_secret_realm_runs projection
                 WHERE projection.activity_run_id = run.id) AS projections,
                (SELECT COUNT(*) FROM reward_claims claim
                 WHERE claim.activity_run_id = run.id) AS reward_claims
         FROM activity_runs run WHERE run.id = $1`,
        [reservation.runId]
    );
    assert(completed.rows[0]?.status === 'COMPLETED'
        && String(completed.rows[0]?.projections) === '1'
        && String(completed.rows[0]?.reward_claims) === '0',
    'SECRET_REALM_COMPLETION_PERSISTENCE_INVALID');
    return { oneTicketRace: true, crashStateDurable: true, completionReplay: true };
}

async function verifyGathering(database, context, service) {
    const playerId = 'activity-gathering';
    await seedPlayer(database, context, { playerId, name: 'Gathering Verify' });
    const starts = await Promise.allSettled([
        service.start(playerId, 'GATHER_THANH_VAN_SON_MACH_HERB', {
            operationId: 'verify-gathering-start-a', startedAt: FIXED_NOW
        }),
        service.start(playerId, 'GATHER_THANH_VAN_SON_MACH_HERB', {
            operationId: 'verify-gathering-start-b', startedAt: FIXED_NOW
        })
    ]);
    const fulfilled = starts.filter((result) => result.status === 'fulfilled');
    const rejected = starts.filter((result) => result.status === 'rejected');
    assert(fulfilled.length === 1 && rejected.length === 1
        && rejected[0].reason?.message === 'GATHERING_ACTIVE_RUN_EXISTS',
    'GATHERING_ACTIVE_RUN_RACE_INVALID');
    const started = fulfilled[0].value;

    let earlyRejected = false;
    try {
        await service.claim(playerId, started.runId, {
            operationId: 'verify-gathering-early-claim', claimedAt: FIXED_NOW
        });
    } catch (error) {
        earlyRejected = error.message === 'GATHERING_NOT_READY';
    }
    assert(earlyRejected, 'GATHERING_EARLY_CLAIM_NOT_REJECTED');
    const beforeClaim = await database.query(
        `SELECT run.status,
                (SELECT COUNT(*) FROM idempotency_records
                 WHERE operation_id = 'verify-gathering-early-claim') AS early_operations,
                (SELECT COUNT(*) FROM reward_claims claim
                 WHERE claim.activity_run_id = run.id) AS reward_claims
         FROM activity_runs run WHERE run.id = $1`,
        [started.runId]
    );
    assert(beforeClaim.rows[0]?.status === 'IN_PROGRESS'
        && String(beforeClaim.rows[0]?.early_operations) === '0'
        && String(beforeClaim.rows[0]?.reward_claims) === '0',
    'GATHERING_EARLY_CLAIM_ROLLBACK_INVALID');

    const claimedAt = new Date(started.readyAt);
    const claims = await Promise.all([
        service.claim(playerId, started.runId, {
            operationId: 'verify-gathering-claim-a', claimedAt
        }),
        service.claim(playerId, started.runId, {
            operationId: 'verify-gathering-claim-b', claimedAt
        })
    ]);
    assert(claims.every((result) => result.status === 'COMPLETED')
        && claims.filter((result) => result.idempotentReplay === true).length === 1,
    'GATHERING_CLAIM_IDEMPOTENCY_INVALID');

    const persisted = await database.query(
        `SELECT run.status,
                (SELECT COUNT(*) FROM reward_claims claim
                 WHERE claim.activity_run_id = run.id) AS reward_claims,
                (SELECT COUNT(*) FROM player_gathering_runs projection
                 WHERE projection.activity_run_id = run.id) AS projections,
                (SELECT amount FROM player_wallets
                 WHERE player_id = run.player_id AND currency_id = 'SPIRIT_STONE') AS spirit_stone,
                (SELECT COUNT(*) FROM resource_ledger ledger
                 JOIN reward_claims claim ON claim.id::text = ledger.reference_id
                 WHERE claim.activity_run_id = run.id
                   AND ledger.reason = 'REWARD_CURRENCY') AS reward_ledger
         FROM activity_runs run WHERE run.id = $1`,
        [started.runId]
    );
    const row = persisted.rows[0];
    assert(row.status === 'COMPLETED' && String(row.reward_claims) === '1'
        && String(row.projections) === '1' && String(row.spirit_stone) === '107'
        && String(row.reward_ledger) === '1',
    'GATHERING_CLAIM_ATOMICITY_INVALID');
    return { activeRunRace: true, earlyClaimRollback: true, claimReplay: true };
}

async function verifyMysteryMerchantPurchaseRace(database, context) {
    const playerId = 'activity-mystery-merchant';
    await seedPlayer(database, context, { playerId, name: 'Merchant Verify' });
    await database.query(
        `UPDATE player_wallets
         SET amount = 1000000, updated_at = $2
         WHERE player_id = $1 AND currency_id = 'SPIRIT_STONE'`,
        [playerId, FIXED_NOW]
    );

    const playerRuntimeRepository = new SchemaScopedPlayerRuntimeRepository(database);
    const operationExecutor = createOperationExecutor(database);
    const playerMapService = new PlayerMapService({
        playerRuntimeRepository,
        gameDataManager: context.gameDataManager,
        operationExecutor
    });
    const mysteryMerchantService = new MysteryMerchantService({
        database,
        gameDataManager: context.gameDataManager
    });
    const shopService = new ShopService({
        playerRuntimeRepository,
        gameDataManager: context.gameDataManager,
        operationExecutor,
        playerMapService,
        mysteryMerchantService
    });
    const explorationService = new ExplorationService({
        playerRuntimeRepository,
        activityRunRepository: new ActivityRunRepository(),
        operationExecutor,
        playerMapService,
        gameDataManager: context.gameDataManager,
        seedProvider: createSeedProvider(500016),
        encounterService: {
            select(seed) {
                return { type: 'MYSTERY_MERCHANT', seed, rulesRevision: 1 };
            }
        },
        mysteryMerchantService
    });
    const exploration = await explorationService.explore(playerId, {
        operationId: 'verify-mystery-exploration',
        completedAt: FIXED_NOW
    });
    const session = exploration.merchantSession;
    assert(exploration.encounterType === 'MYSTERY_MERCHANT'
        && exploration.outcome === 'EVENT' && exploration.battleResult === null,
    'MYSTERY_MERCHANT_EXPLORATION_DISPATCH_INVALID');
    assert(session?.entries?.length === 4, 'MYSTERY_MERCHANT_SESSION_INVALID');

    const catalog = await shopService.listArea(playerId, 'MYSTERY', { now: FIXED_NOW });
    const entry = catalog.entries.find((candidate) => candidate.available);
    assert(entry, 'MYSTERY_MERCHANT_HAS_NO_PURCHASABLE_ENTRY');
    const purchases = await Promise.allSettled([
        shopService.purchaseArea(playerId, 'MYSTERY', entry.id, {
            operationId: 'verify-mystery-buy-a', purchasedAt: FIXED_NOW
        }),
        shopService.purchaseArea(playerId, 'MYSTERY', entry.id, {
            operationId: 'verify-mystery-buy-b', purchasedAt: FIXED_NOW
        })
    ]);
    const fulfilled = purchases.filter((result) => result.status === 'fulfilled');
    const rejected = purchases.filter((result) => result.status === 'rejected');
    assert(fulfilled.length === 1 && rejected.length === 1
        && rejected[0].reason?.message === 'SHOP_ENTRY_SOLD_OUT',
    'MYSTERY_MERCHANT_LAST_STOCK_RACE_INVALID');

    const persisted = await database.query(
        `SELECT entry.stock_remaining, entry.purchase_count,
                (SELECT COUNT(*) FROM player_shop_purchases purchase
                 WHERE purchase.session_id = entry.session_id
                   AND purchase.entry_id = entry.entry_id) AS purchases,
                (SELECT COUNT(*) FROM resource_ledger ledger
                 JOIN player_shop_purchases purchase ON purchase.id::text = ledger.reference_id
                 WHERE purchase.session_id = entry.session_id
                   AND purchase.entry_id = entry.entry_id
                   AND ledger.reference_type = 'SHOP_PURCHASE') AS ledger_entries
         FROM shop_session_entries entry
         WHERE entry.session_id = $1 AND entry.entry_id = $2`,
        [session.sessionId, entry.id]
    );
    const row = persisted.rows[0];
    if (!(Number(row?.stock_remaining) === 0 && Number(row?.purchase_count) === 1
        && Number(row?.purchases) === 1 && Number(row?.ledger_entries) === 2)) {
        const error = new Error(`MYSTERY_MERCHANT_PURCHASE_ATOMICITY_INVALID:${JSON.stringify(row)}`);
        error.code = 'MYSTERY_MERCHANT_PURCHASE_ATOMICITY_INVALID';
        throw error;
    }

    const expiredAt = new Date(FIXED_NOW.getTime() + 901000);
    const expired = await mysteryMerchantService.getActive(playerId, expiredAt);
    assert(expired === null, 'MYSTERY_MERCHANT_LAZY_EXPIRY_INVALID');
    return {
        explorationDispatch: true,
        lastStockRace: true,
        atomicLedger: true,
        lazyExpiry: true
    };
}

function getContext() {
    const gameDataManager = bootstrapGameData();
    setGameDataManager(gameDataManager);
    const spiritRoot = Object.values(gameDataManager.getCollection('spiritRoots'))
        .find((entry) => entry.defensiveElementId === 'FIRE')
        || Object.values(gameDataManager.getCollection('spiritRoots'))[0];
    assert(spiritRoot, 'ACTIVITY_GAME_DATA_UNAVAILABLE');
    return { gameDataManager, spiritRoot };
}

let testDatabaseUrl = null;
let configurationFailed = false;
try {
    testDatabaseUrl = loadTestDatabaseUrl(process.env);
} catch (error) {
    configurationFailed = true;
    console.error(JSON.stringify({
        status: 'FAIL',
        errorCode: error.code || 'ACTIVITY_TEST_DATABASE_CONFIGURATION_INVALID',
        connectionAttempted: false
    }, null, 2));
    process.exitCode = 1;
}

if (!configurationFailed && !testDatabaseUrl) {
    console.log(JSON.stringify({
        status: 'SKIP',
        reason: 'ACTIVITY_TEST_DATABASE_URL_REQUIRED',
        primaryDatabaseUsed: false
    }, null, 2));
} else if (!configurationFailed) {
    const schemaName = `${TEST_SCHEMA_PREFIX}${process.pid}_${Date.now()}`;
    assert(new RegExp(`^${TEST_SCHEMA_PREFIX}[0-9_]+$`).test(schemaName),
        'ACTIVITY_TEST_SCHEMA_INVALID');
    const rawPool = new Pool({ connectionString: testDatabaseUrl, max: 10 });
    const database = new SchemaScopedPool(rawPool, schemaName);
    let schemaCreated = false;
    try {
        await rawPool.query(`CREATE SCHEMA "${schemaName}"`);
        schemaCreated = true;
        const migrations = await runMigrations({ pool: database });
        for (const requiredMigration of [
            '009_reward_claim_foundation.sql',
            '010_activity_run_foundation.sql',
            '011_gathering_lazy_activity.sql',
            '012_activity_progress_projection.sql',
            '021_player_map_state.sql',
            '022_remap_player_map_route.sql',
            '033_shop_product_contract.sql',
            '034_shop_sessions.sql',
            '035_shop_purchase_session_reference.sql',
            '036_exploration_encounter_projection.sql'
        ]) {
            assert(migrations.applied.includes(requiredMigration),
                'ACTIVITY_REQUIRED_MIGRATION_NOT_APPLIED');
        }
        const context = getContext();
        const services = createServices(database, context);
        const exploration = await verifyExploration(database, context, services.exploration);
        const playerMap = await verifyPlayerMapMovement(database, context);
        const secretRealmRollback = await verifySecretRealmRollback(database, context);
        const secretRealm = await verifySecretRealmRace(database, context, services.secretRealm);
        const gathering = await verifyGathering(database, context, services.gathering);
        const mysteryMerchant = await verifyMysteryMerchantPurchaseRace(database, context);
        console.log(JSON.stringify({
            status: 'PASS',
            isolatedSchema: true,
            appliedMigrationCount: migrations.applied.length,
            exploration,
            playerMap,
            secretRealmRollback,
            secretRealm,
            gathering,
            mysteryMerchant
        }, null, 2));
    } catch (error) {
        console.error(JSON.stringify({
            status: 'FAIL',
            errorCode: error.code || 'ACTIVITY_POSTGRES_VERIFICATION_FAILED',
            errorMessage: error instanceof Error ? error.message : String(error),
            isolatedSchema: schemaCreated
        }, null, 2));
        process.exitCode = 1;
    } finally {
        try {
            if (schemaCreated) {
                assert(schemaName.startsWith(TEST_SCHEMA_PREFIX),
                    'ACTIVITY_TEST_SCHEMA_CLEANUP_REJECTED');
                await rawPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
            }
        } catch (error) {
            console.error(JSON.stringify({
                status: 'FAIL',
                errorCode: error.code || 'ACTIVITY_TEST_SCHEMA_CLEANUP_FAILED',
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
