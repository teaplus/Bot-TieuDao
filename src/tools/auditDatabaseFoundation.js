import PostgresUnitOfWork from '../platform/database/PostgresUnitOfWork.js';
import { runMigrations } from '../platform/database/runMigrations.js';
import { backfillInventorySplit } from '../database/backfills/backfillInventorySplit.js';
import { activateInventoryCutover } from '../database/backfills/activateInventoryCutover.js';
import { calculateInventoryClassificationRevision } from '../database/backfills/backfillInventorySplit.js';
import PersistenceCutoverRepository from '../repositories/PersistenceCutoverRepository.js';
import PlayerInventoryRepository from '../repositories/PlayerInventoryRepository.js';
import PeriodCounterRepository from '../repositories/PeriodCounterRepository.js';
import ResourceLedgerRepository from '../repositories/ResourceLedgerRepository.js';
import PlayerRuntimeRepository from '../repositories/PlayerRuntimeRepository.js';
import RewardClaimRepository from '../repositories/RewardClaimRepository.js';
import ActivityRunRepository from '../repositories/ActivityRunRepository.js';
import OutboxRepository from '../repositories/OutboxRepository.js';

function assert(condition, message, details = {}) {
    if (!condition) {
        const error = new Error(message);
        error.details = details;
        throw error;
    }
}

function createFakePool(options = {}) {
    const queries = [];
    let released = false;

    const client = {
        async query(sql, params = []) {
            const statement = String(sql).trim();
            queries.push({ statement, params });

            if (statement === 'SELECT version, checksum FROM schema_migrations') {
                return { rows: options.appliedRows || [] };
            }

            if (options.failOnWork && statement === 'WORK') {
                throw new Error('EXPECTED_WORK_FAILURE');
            }

            return { rows: [], rowCount: 0 };
        },
        release() {
            released = true;
        }
    };

    return {
        queries,
        client,
        get released() {
            return released;
        },
        async connect() {
            return client;
        }
    };
}

async function auditCommit() {
    const pool = createFakePool();
    const unitOfWork = new PostgresUnitOfWork(pool);
    const result = await unitOfWork.execute(async (client) => {
        await client.query('WORK');
        return 'COMMITTED';
    });
    const statements = pool.queries.map((entry) => entry.statement);

    assert(result === 'COMMITTED', 'UnitOfWork did not return work result');
    assert(statements[0] === 'BEGIN' && statements.at(-1) === 'COMMIT', 'UnitOfWork commit order is invalid', { statements });
    assert(pool.released, 'UnitOfWork did not release client after commit');
}

async function auditRollback() {
    const pool = createFakePool({ failOnWork: true });
    const unitOfWork = new PostgresUnitOfWork(pool);
    let failed = false;

    try {
        await unitOfWork.execute((client) => client.query('WORK'));
    } catch (error) {
        failed = error.message === 'EXPECTED_WORK_FAILURE';
    }

    const statements = pool.queries.map((entry) => entry.statement);
    assert(failed, 'UnitOfWork did not propagate work failure');
    assert(statements.at(-1) === 'ROLLBACK', 'UnitOfWork did not rollback failed work', { statements });
    assert(pool.released, 'UnitOfWork did not release client after rollback');
}

async function auditMigrations() {
    const pool = createFakePool();
    const result = await runMigrations({ pool });
    const statements = pool.queries.map((entry) => entry.statement);

    assert(result.applied.includes('001_legacy_baseline.sql'), 'Legacy baseline migration was not discovered', result);
    assert(result.applied.includes('002_runtime_foundation.sql'), 'Runtime foundation migration was not discovered', result);
    assert(result.applied.includes('003_approved_runtime_parameters.sql'), 'Approved runtime parameter migration was not discovered', result);
    assert(result.applied.includes('004_idle_accumulators.sql'), 'Idle accumulator migration was not discovered', result);
    assert(result.applied.includes('005_wallet_foundation.sql'), 'Wallet foundation migration was not discovered', result);
    assert(result.applied.includes('006_inventory_split_foundation.sql'), 'Inventory split migration was not discovered', result);
    assert(result.applied.includes('007_persistence_cutover_state.sql'), 'Persistence cutover state migration was not discovered', result);
    assert(result.applied.includes('008_economy_audit_foundation.sql'), 'Economy audit migration was not discovered', result);
    assert(result.applied.includes('009_reward_claim_foundation.sql'), 'Reward claim migration was not discovered', result);
    assert(result.applied.includes('010_activity_run_foundation.sql'), 'Activity run migration was not discovered', result);
    assert(result.applied.includes('011_gathering_lazy_activity.sql'), 'Gathering lazy activity migration was not discovered', result);
    assert(result.applied.includes('012_activity_progress_projection.sql'), 'Activity progress projection migration was not discovered', result);
    assert(result.applied.includes('013_sect_membership_policy.sql'), 'Sect membership policy migration was not discovered', result);
    assert(result.applied.includes('014_outbox_delivery_lease.sql'), 'Outbox delivery lease migration was not discovered', result);
    assert(result.applied.includes('015_cultivation_leaderboard.sql'), 'Cultivation leaderboard migration was not discovered', result);
    assert(result.applied.includes('016_rebirth_foundation.sql'), 'Rebirth foundation migration was not discovered', result);
    assert(result.applied.includes('017_rebirth_leaderboard_projection.sql'), 'Rebirth leaderboard migration was not discovered', result);
    assert(result.applied.includes('018_spirit_root_progression_foundation.sql'), 'Spirit Root progression migration was not discovered', result);
    assert(result.applied.includes('019_spirit_root_quality_cutover.sql'), 'Spirit Root quality cutover migration was not discovered', result);
    assert(result.applied.includes('023_repair_starter_realm_stats.sql'), 'Starter Realm stat repair migration was not discovered', result);
    assert(result.applied.includes('024_realm_stat_progression_v2.sql'), 'Realm stat progression v2 migration was not discovered', result);
    assert(result.applied.includes('020_equipment_type_slots.sql'), 'Equipment type slot migration was not discovered', result);
    assert(result.applied.includes('021_player_map_state.sql'), 'Player map state migration was not discovered', result);
    assert(result.applied.includes('022_remap_player_map_route.sql'), 'Player map route remap migration was not discovered', result);
    assert(result.applied.includes('025_profession_foundation.sql'), 'Profession foundation migration was not discovered', result);
    assert(statements.some((statement) => statement.startsWith('SELECT pg_advisory_lock')), 'Migration runner did not acquire advisory lock');
    assert(statements.some((statement) => statement.startsWith('SELECT pg_advisory_unlock')), 'Migration runner did not release advisory lock');
    assert(pool.released, 'Migration runner did not release client');
}

async function auditInventoryBackfill() {
    let maintenanceGuarded = false;
    try {
        await backfillInventorySplit({ environment: {} });
    } catch (error) {
        maintenanceGuarded = error.message === 'INVENTORY_MAINTENANCE_MODE_REQUIRED';
    }
    assert(maintenanceGuarded, 'Inventory backfill must require maintenance mode');

    const sourceRows = [
        {
            id: '1', player_id: 'player', item_id: 'ITEM_A', quantity: '2', rarity: 'COMMON',
            instance_data: {}, equipped_slot: null, created_at: new Date()
        },
        {
            id: '2', player_id: 'player', item_id: 'EQ_A', quantity: '1', rarity: 'COMMON',
            instance_data: {}, equipped_slot: null, created_at: new Date()
        }
    ];
    const backfillStatements = [];
    const client = {
        async query(sql) {
            const statement = String(sql);
            backfillStatements.push(statement);
            if (statement.includes('FROM player_items\n             ORDER BY id')) {
                return { rows: sourceRows, rowCount: sourceRows.length };
            }
            if (statement.includes('AS legacy_count')) {
                return { rows: [{ legacy_count: '2', stack_count: '1', equipment_count: '1' }], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
        }
    };
    const result = await backfillInventorySplit({
        environment: { INVENTORY_MAINTENANCE_MODE: 'true' },
        unitOfWork: { execute: (work) => work(client) },
        gameDataManager: {
            getCollection() {
                return {
                    ITEM_A: { type: 'MATERIAL' },
                    EQ_A: { type: 'EQUIPMENT' }
                };
            }
        }
    });
    assert(result.status === 'BACKFILLED_NOT_CUT_OVER', 'Inventory backfill must not imply cutover', result);
    assert(result.stackCount === 1 && result.equipmentCount === 1, 'Inventory classification is incorrect', result);
    assert(result.sourceRevision?.length === 64, 'Inventory backfill must record a SHA-256 GameData revision', result);
    assert(
        backfillStatements.some((statement) => statement.includes('INSERT INTO persistence_cutovers')),
        'Inventory backfill must persist BACKFILLED cutover state'
    );
}

async function auditCutoverStateGuards() {
    const repository = new PersistenceCutoverRepository();
    let activeBackfillRejected = false;
    try {
        await repository.markBackfilled({
            async query() {
                return { rows: [{ status: 'ACTIVE' }], rowCount: 1 };
            }
        }, { domain: 'INVENTORY', sourceRevision: 'revision' });
    } catch (error) {
        activeBackfillRejected = error.message === 'CUTOVER_ALREADY_ACTIVE:INVENTORY';
    }
    assert(activeBackfillRejected, 'Backfill must not downgrade ACTIVE cutover state');

    let revisionMismatchRejected = false;
    try {
        await repository.markActive({
            async query() {
                return {
                    rows: [{ status: 'BACKFILLED', source_revision: 'old-revision' }],
                    rowCount: 1
                };
            }
        }, { domain: 'INVENTORY', sourceRevision: 'new-revision' });
    } catch (error) {
        revisionMismatchRejected = error.message === 'CUTOVER_SOURCE_REVISION_MISMATCH:INVENTORY';
    }
    assert(revisionMismatchRejected, 'Cutover activation must reject GameData revision mismatch');
}

async function auditInventoryPersistenceRouter() {
    const activeStatements = [];
    const activeRepository = new PlayerInventoryRepository({
        cutoverRepository: { async get() { return { status: 'ACTIVE' }; } }
    });
    const activeDatabase = {
        async query(sql) {
            const statement = String(sql);
            activeStatements.push(statement);
            if (statement.includes('FROM (')) {
                return {
                    rows: [{
                        id: 'E:7', item_id: 'EQ_A', quantity: '1', rarity: 'COMMON',
                        instance_data: {}, equipped_slot: null
                    }],
                    rowCount: 1
                };
            }
            if (statement.includes('INSERT INTO inventory_stacks')) {
                return { rows: [{ id: '8' }], rowCount: 1 };
            }
            if (statement.includes('INSERT INTO equipment_instances')) {
                return { rows: [{ id: '9' }], rowCount: 1 };
            }
            return { rows: [{ id: '7' }], rowCount: 1 };
        }
    };
    const activeEntries = await activeRepository.listEntries(activeDatabase, 'player');
    const stackId = await activeRepository.insertStack(activeDatabase, {
        playerId: 'player', itemId: 'ITEM_A', quantity: 1
    });
    const equipmentId = await activeRepository.insertEquipment(activeDatabase, {
        playerId: 'player', itemId: 'EQ_A'
    });
    assert(activeEntries[0].id === 'E:7', 'Active inventory must expose typed runtime IDs', activeEntries);
    assert(stackId === 'S:8' && equipmentId === 'E:9', 'Active inserts must return typed runtime IDs', { stackId, equipmentId });
    assert(activeStatements.some((statement) => statement.includes('inventory_stacks')), 'Active router did not use inventory_stacks');
    assert(activeStatements.some((statement) => statement.includes('equipment_instances')), 'Active router did not use equipment_instances');

    const legacyStatements = [];
    const legacyRepository = new PlayerInventoryRepository({
        cutoverRepository: { async get() { return { status: 'BACKFILLED' }; } }
    });
    const legacyDatabase = {
        async query(sql) {
            legacyStatements.push(String(sql));
            return { rows: [{ id: '10' }], rowCount: 1 };
        }
    };
    const legacyId = await legacyRepository.insertStack(legacyDatabase, {
        playerId: 'player', itemId: 'ITEM_A', quantity: 1
    });
    assert(legacyId === '10', 'BACKFILLED state must continue using legacy runtime IDs', { legacyId });
    assert(legacyStatements.some((statement) => statement.includes('INSERT INTO player_items')), 'BACKFILLED state switched schema too early');
}

async function auditInventoryActivation() {
    let maintenanceGuarded = false;
    try {
        await activateInventoryCutover({ environment: {} });
    } catch (error) {
        maintenanceGuarded = error.message === 'INVENTORY_MAINTENANCE_MODE_REQUIRED';
    }
    assert(maintenanceGuarded, 'Inventory activation must require maintenance mode');

    const templates = {
        ITEM_A: { type: 'MATERIAL' },
        EQ_A: { type: 'EQUIPMENT' }
    };
    const revision = calculateInventoryClassificationRevision(new Map([
        ['ITEM_A', 'STACK'],
        ['EQ_A', 'EQUIPMENT']
    ]));
    const sourceRows = [
        {
            id: '1', player_id: 'player', item_id: 'ITEM_A', quantity: '2', rarity: 'COMMON',
            instance_data: { quality: 1 }, equipped_slot: null
        },
        {
            id: '2', player_id: 'player', item_id: 'EQ_A', quantity: '1', rarity: 'COMMON',
            instance_data: { affixes: [] }, equipped_slot: null
        }
    ];
    const client = {
        async query(sql, params = []) {
            const statement = String(sql);
            if (statement.includes('FROM player_items\n             ORDER BY id')) {
                return { rows: sourceRows, rowCount: sourceRows.length };
            }
            if (statement.includes('FROM inventory_stacks\n         WHERE legacy_item_id')) {
                return {
                    rows: [{
                        player_id: 'player', item_id: 'ITEM_A', quantity: '2', rarity: 'COMMON',
                        instance_data: { quality: 1 }
                    }],
                    rowCount: 1
                };
            }
            if (statement.includes('FROM equipment_instances\n         WHERE legacy_item_id')) {
                return {
                    rows: [{
                        player_id: 'player', template_id: 'EQ_A', rarity: 'COMMON',
                        instance_data: { affixes: [] }, equipped_slot: null
                    }],
                    rowCount: 1
                };
            }
            if (statement.includes('AS legacy_count')) {
                return { rows: [{ legacy_count: '2', stack_count: '1', equipment_count: '1' }], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
        }
    };
    let activationPayload = null;
    const result = await activateInventoryCutover({
        environment: { INVENTORY_MAINTENANCE_MODE: 'true' },
        gameDataManager: { getCollection: () => templates },
        unitOfWork: { execute: (work) => work(client) },
        cutoverRepository: {
            async get() { return { status: 'BACKFILLED', source_revision: revision }; },
            async markActive(_client, payload) { activationPayload = payload; }
        }
    });
    assert(result.status === 'ACTIVE' && result.verifiedRows === 2, 'Inventory activation result is invalid', result);
    assert(activationPayload?.details?.runtimeRouter === 'PlayerInventoryRepository', 'Activation did not record runtime router', activationPayload);
}

async function auditAtomicPeriodCounter() {
    const statements = [];
    const repository = new PeriodCounterRepository();
    const successClient = {
        async query(sql) {
            statements.push(String(sql));
            return { rows: [{ value: '3' }], rowCount: 1 };
        }
    };
    const value = await repository.incrementWithinLimit(successClient, {
        playerId: 'player',
        counterType: 'SHOP_PURCHASE',
        subjectId: 'GENERAL:ITEM_A',
        periodType: 'DAILY',
        periodKey: '2026-07-16',
        increment: 1,
        limit: 3
    });
    assert(value === '3', 'Period counter must preserve integer-string value', { value });
    assert(
        statements[0].includes('player_period_counters.value + EXCLUDED.value <= $7::bigint'),
        'Period limit must be enforced by the atomic upsert statement'
    );

    let limitRejected = false;
    try {
        await repository.incrementWithinLimit({
            async query() { return { rows: [], rowCount: 0 }; }
        }, {
            playerId: 'player',
            counterType: 'SHOP_PURCHASE',
            subjectId: 'GENERAL:ITEM_A',
            periodType: 'DAILY',
            periodKey: '2026-07-16',
            increment: 1,
            limit: 3,
            errorCode: 'DAILY_LIMIT_REACHED'
        });
    } catch (error) {
        limitRejected = error.message === 'DAILY_LIMIT_REACHED';
    }
    assert(limitRejected, 'Period counter must reject an increment above the limit');
}

async function auditResourceLedger() {
    let recordedParams = null;
    const repository = new ResourceLedgerRepository();
    const ledgerId = await repository.record({
        async query(_sql, params) {
            recordedParams = params;
            return { rows: [{ id: '91' }], rowCount: 1 };
        }
    }, {
        playerId: 'player',
        resourceType: 'CURRENCY',
        resourceId: 'SPIRIT_STONE',
        delta: '-9007199254740993',
        balanceAfter: '900719925474099312345',
        reason: 'AUDIT',
        referenceType: 'AUDIT',
        referenceId: 'reference-1',
        operationId: 'operation-1'
    });
    assert(ledgerId === '91', 'Resource ledger must return a string ID', { ledgerId });
    assert(recordedParams[3] === '-9007199254740993', 'Ledger delta lost precision', recordedParams);
    assert(recordedParams[4] === '900719925474099312345', 'Ledger balance lost precision', recordedParams);

    let negativeRejected = false;
    try {
        await repository.record({ async query() { throw new Error('SHOULD_NOT_QUERY'); } }, {
            playerId: 'player', resourceType: 'ITEM', resourceId: 'ITEM_A', delta: -1,
            balanceAfter: -1, reason: 'AUDIT', referenceType: 'AUDIT', referenceId: 'reference-2'
        });
    } catch (error) {
        negativeRejected = error.message === 'NEGATIVE_LEDGER_BALANCE';
    }
    assert(negativeRejected, 'Resource ledger must reject a negative balance_after');
}

async function auditEconomyMutationAuditTrail() {
    const ledgerEntries = [];
    const counterPayloads = [];
    let logSequence = 0;
    const repository = new PlayerRuntimeRepository({
        walletRepository: {
            async lockPlayer() {},
            async debit(_client, payload) {
                return payload.currencyId === 'SPIRIT_STONE' ? '850' : '100';
            },
            async credit() { return '120'; }
        },
        inventoryRepository: {
            async listCapacityRowsForUpdate() { return []; },
            async addStackableItem(_client, payload) { return `S:${payload.itemId}`; },
            async consumeItemAcrossStacks(_client, payload) {
                return [{ itemId: payload.itemId, inventoryId: 'S:1', quantity: String(payload.quantity) }];
            },
            async getStackQuantity() { return '5'; }
        },
        periodCounterRepository: {
            async incrementWithinLimit(_client, payload) {
                counterPayloads.push(payload);
                return '1';
            }
        },
        resourceLedgerRepository: {
            async recordMany(_client, entries) {
                ledgerEntries.push(...entries);
                return entries.map((_, index) => String(index + 1));
            }
        }
    });
    const client = {
        async query(sql, params) {
            const statement = String(sql);
            if (!statement.includes('INSERT INTO player_')) {
                throw new Error(`UNEXPECTED_ECONOMY_AUDIT_QUERY:${statement}`);
            }
            assert(statement.includes('operation_id'), 'Economy execution log must persist operation_id', { statement });
            assert(params.at(-1)?.startsWith('op-'), 'Economy execution log operation_id is missing', { params });
            logSequence += 1;
            const timestamp = new Date('2026-07-16T00:00:00.000Z');
            if (statement.includes('player_shop_purchases')) {
                return { rows: [{ id: String(logSequence), purchased_at: timestamp }], rowCount: 1 };
            }
            if (statement.includes('player_craft_logs')) {
                return { rows: [{ id: String(logSequence), crafted_at: timestamp }], rowCount: 1 };
            }
            return { rows: [{ id: String(logSequence), exchanged_at: timestamp }], rowCount: 1 };
        }
    };

    await repository.purchaseShopEntry('player', {
        shopId: 'GENERAL', entryId: 'ITEM_A', itemId: 'ITEM_A', quantity: 1,
        currencyId: 'SPIRIT_STONE', price: '150', dailyLimit: 3,
        periodLimit: {
            counterType: 'SHOP_PURCHASE', subjectId: 'GENERAL:ITEM_A', periodType: 'DAILY',
            periodKey: '2026-07-16', increment: 1, limit: 3
        }
    }, { client, operationId: 'op-shop' });
    await repository.craftRecipe('player', {
        recipeId: 'RECIPE_A', resultItemId: 'ITEM_B', resultQuantity: 1,
        costCurrency: { currencyId: 'SPIRIT_STONE', amount: '10' },
        materials: [{ itemId: 'ITEM_A', quantity: 2 }]
    }, { client, operationId: 'op-craft' });
    await repository.exchangeTemplate('player', {
        exchangeId: 'EXCHANGE_A',
        costs: [{ currencyId: 'SECT_POINT', amount: '20' }, { itemId: 'ITEM_A', quantity: 1 }],
        rewards: [{ currencyId: 'HONOR', amount: '5' }, { itemId: 'ITEM_B', quantity: 1 }],
        periodLimits: [
            { counterType: 'EXCHANGE', subjectId: 'EXCHANGE_A', periodType: 'DAILY', periodKey: '2026-07-16', increment: 1, limit: '3' },
            { counterType: 'EXCHANGE', subjectId: 'EXCHANGE_A', periodType: 'LIFETIME', periodKey: 'LIFETIME', increment: 1, limit: '10' }
        ]
    }, { client, operationId: 'op-exchange' });

    assert(counterPayloads.length === 3, 'Shop and exchange must increment every configured period counter', counterPayloads);
    assert(
        counterPayloads.filter((payload) => payload.counterType === 'EXCHANGE').length === 2,
        'Exchange did not increment its full limit list',
        counterPayloads
    );
    const reasons = new Set(ledgerEntries.map((entry) => entry.reason));
    for (const reason of [
        'SHOP_PURCHASE_COST', 'SHOP_PURCHASE_REWARD',
        'CRAFT_CURRENCY_COST', 'CRAFT_MATERIAL_COST', 'CRAFT_RESULT',
        'EXCHANGE_CURRENCY_COST', 'EXCHANGE_ITEM_COST',
        'EXCHANGE_CURRENCY_REWARD', 'EXCHANGE_ITEM_REWARD'
    ]) {
        assert(reasons.has(reason), `Missing economy ledger reason: ${reason}`, { reasons: [...reasons] });
    }
    assert(
        ledgerEntries.every((entry) => entry.operationId?.startsWith('op-')),
        'Every economy ledger entry must retain operation_id',
        ledgerEntries
    );
}

async function auditRewardClaimHeader() {
    let statement = null;
    let params = null;
    const repository = new RewardClaimRepository();
    const result = await repository.create({
        async query(sql, values) {
            statement = String(sql);
            params = values;
            return {
                rows: [{ id: '101', claimed_at: new Date('2026-07-16T00:00:00.000Z') }],
                rowCount: 1
            };
        }
    }, {
        playerId: 'player',
        claimType: 'EXPLORATION',
        sourceRef: 'activity-run-1',
        operationId: 'operation-claim-1',
        rewardTableId: 'MONSTER_DROP',
        rolledRewardSnapshot: [{ type: 'CURRENCY', currencyId: 'SPIRIT_STONE', amount: '10' }]
    });
    assert(result.claimId === '101', 'Reward claim must expose a string claim ID', result);
    assert(statement.includes('INSERT INTO reward_claims'), 'Reward claim repository used the wrong table', { statement });
    assert(params[1] === 'EXPLORATION' && params[2] === 'activity-run-1', 'Reward business identity was not persisted', { params });
    assert(params[3] === 'operation-claim-1', 'Reward operation identity was not persisted', { params });

    let missingSourceRejected = false;
    try {
        await repository.create({ async query() { throw new Error('SHOULD_NOT_QUERY'); } }, {
            playerId: 'player', claimType: 'EXPLORATION', operationId: 'operation-claim-2'
        });
    } catch (error) {
        missingSourceRejected = error.message === 'REWARD_CLAIM_SOURCE_REF_REQUIRED';
    }
    assert(missingSourceRejected, 'Reward claim must require a stable source_ref');
}

async function auditActivityRunIdentity() {
    const repository = new ActivityRunRepository();
    let queryCount = 0;
    const client = {
        async query(sql) {
            queryCount += 1;
            const statement = String(sql);
            if (statement.startsWith('INSERT INTO activity_runs')) {
                return { rows: [], rowCount: 0 };
            }
            if (statement.startsWith('SELECT id, player_id')) {
                return {
                    rows: [{
                        id: '55', player_id: 'player', activity_type: 'EXPLORATION',
                        content_id: 'RANDOM_ENCOUNTER', status: 'IN_PROGRESS'
                    }],
                    rowCount: 1
                };
            }
            throw new Error(`UNEXPECTED_ACTIVITY_RUN_QUERY:${statement}`);
        }
    };
    const reservation = await repository.reserve(client, {
        playerId: 'player',
        activityType: 'EXPLORATION',
        contentId: 'RANDOM_ENCOUNTER',
        operationId: 'operation-run-1',
        inputSnapshot: { realmId: 1 },
        rewardTableId: 'MONSTER_DROP'
    });
    assert(reservation.runId === '55', 'Activity retry must reuse the existing run ID', reservation);
    assert(queryCount === 2, 'Activity reservation conflict must resolve the existing run', { queryCount });

    let conflictRejected = false;
    try {
        await repository.reserve({
            async query(sql) {
                if (String(sql).startsWith('INSERT INTO activity_runs')) return { rows: [], rowCount: 0 };
                return {
                    rows: [{
                        id: '55', player_id: 'player', activity_type: 'SECRET_REALM',
                        content_id: 'WAVES:3', status: 'IN_PROGRESS'
                    }],
                    rowCount: 1
                };
            }
        }, {
            playerId: 'player', activityType: 'EXPLORATION', contentId: 'RANDOM_ENCOUNTER',
            operationId: 'operation-run-1'
        });
    } catch (error) {
        conflictRejected = error.message === 'ACTIVITY_RUN_REQUEST_CONFLICT';
    }
    assert(conflictRejected, 'Activity operation reuse with different content must be rejected');
}

async function auditRewardMutationLedger() {
    const ledgerEntries = [];
    const repository = new PlayerRuntimeRepository({
        walletRepository: {
            async credit() { return '110'; }
        },
        inventoryRepository: {
            async listCapacityRowsForUpdate() { return []; },
            async insertEquipment() { return 'E:1'; },
            async getEquipmentCount() { return '1'; },
            async findStackForUpdate() { return null; },
            async insertStack() { return 'S:1'; },
            async incrementStack() {},
            async getStackQuantity() { return '2'; }
        },
        resourceLedgerRepository: {
            async recordMany(_client, entries) {
                ledgerEntries.push(...entries);
                return entries.map((_, index) => String(index + 1));
            }
        }
    });
    const client = {
        async query(sql) {
            if (String(sql).startsWith('SELECT id FROM players')) {
                return { rows: [{ id: 'player' }], rowCount: 1 };
            }
            throw new Error(`UNEXPECTED_REWARD_LEDGER_QUERY:${String(sql)}`);
        }
    };
    await repository.applyRewards('player', [
        { type: 'CURRENCY', currencyId: 'SPIRIT_STONE', amount: '10' },
        { type: 'ITEM', itemId: 'ITEM_A', quantity: 2, rarity: 'COMMON' },
        { type: 'EQUIPMENT', itemId: 'EQ_A', quantity: 1, rarity: 'COMMON' }
    ], {
        client,
        inventoryCapacity: 10,
        claimId: 'claim-1',
        operationId: 'operation-reward-1'
    });

    assert(ledgerEntries.length === 3, 'Every applied reward resource must create a ledger entry', ledgerEntries);
    assert(
        ledgerEntries.every((entry) => entry.referenceType === 'REWARD_CLAIM' && entry.referenceId === 'claim-1'),
        'Reward ledger must reference the claim header',
        ledgerEntries
    );
    assert(
        new Set(ledgerEntries.map((entry) => entry.reason)).size === 3,
        'Reward ledger must distinguish currency, item and equipment reasons',
        ledgerEntries
    );
}

async function auditActivityProgressProjection() {
    const repository = new PlayerRuntimeRepository();
    const statements = [];
    const client = {
        async query(sql, params) {
            statements.push({ sql: String(sql), params });
            return {
                rows: [{ id: String(statements.length), completed_at: new Date('2026-07-17T00:00:00.000Z') }],
                rowCount: 1
            };
        }
    };

    await repository.recordExplorationResult('player', {
        outcome: 'VICTORY', monsterId: 'MONSTER', monsterTemplateId: 'MONSTER',
        rewardTableId: 'REWARD', activityRunId: '101'
    }, { client });
    await repository.recordSecretRealmResult('player', {
        outcome: 'CLEARED', waveCount: 3, clearedWaves: 3,
        bossMonsterId: 'BOSS', rewardTableId: 'REWARD', activityRunId: '102'
    }, { client });
    await repository.recordGatheringResult('player', {
        gatheringId: 'HERB_GATHERING', rewardTableId: 'REWARD', activityRunId: '103'
    }, { client });

    assert(statements.length === 3, 'Every activity projection must use the injected transaction client', statements);
    assert(statements[0].sql.includes('activity_run_id') && statements[0].params[5] === '101', 'Exploration projection lost activity identity', statements[0]);
    assert(statements[1].sql.includes('activity_run_id') && statements[1].params[6] === '102', 'Secret Realm projection lost activity identity', statements[1]);
    assert(statements[2].sql.includes('activity_run_id') && statements[2].params[4] === '103', 'Gathering projection lost activity identity', statements[2]);
}

async function auditSectMembershipPersistence() {
    const repository = new PlayerRuntimeRepository();
    const statements = [];
    const rejoinAvailableAt = new Date('2026-07-24T00:00:00.000Z');
    const client = {
        async query(sql, params) {
            statements.push({ sql: String(sql), params });
            if (String(sql).includes('SET sect_id = $1')) {
                return { rowCount: 1, rows: [{ id: 'player', sect_id: 'SECT_FIRE' }] };
            }
            return {
                rowCount: 1,
                rows: [{
                    id: 'player', sect_rejoin_available_at: rejoinAvailableAt,
                    sect_policy_revision: 'sect-membership-v1'
                }]
            };
        }
    };

    await repository.joinSect('player', {
        sectId: 'SECT_FIRE', joinedAt: new Date('2026-07-25T00:00:00.000Z')
    }, { client });
    await repository.leaveSect('player', {
        sectId: 'SECT_FIRE', rejoinAvailableAt, policyRevision: 'sect-membership-v1'
    }, { client });

    assert(statements[0].sql.includes('sect_rejoin_available_at <= $3'), 'Sect join SQL does not enforce rejoin cooldown atomically', statements[0]);
    assert(statements[1].sql.includes('sect_id = NULL') && statements[1].sql.includes('sect_policy_revision = $2'), 'Sect leave SQL does not persist membership policy atomically', statements[1]);
    assert(statements[1].params[0] === rejoinAvailableAt, 'Sect leave lost approved rejoin timestamp', statements[1]);
}

async function auditTransactionalOutboxEnqueue() {
    const repository = new OutboxRepository();
    const occurredAt = new Date('2026-07-17T00:00:00.000Z');
    let statement = null;
    let params = null;
    const client = {
        async query(sql, values) {
            statement = String(sql);
            params = values;
            return { rows: [{ id: '901', occurred_at: occurredAt }], rowCount: 1 };
        }
    };
    const result = await repository.enqueue(client, {
        aggregateType: 'PLAYER', aggregateId: 'p1', eventType: 'PLAYER_UPDATED',
        payload: { revision: 2 }, occurredAt
    });
    assert(statement.includes('INSERT INTO outbox_events'), 'Outbox enqueue used the wrong persistence target', { statement });
    assert(params[0] === 'PLAYER' && params[1] === 'p1' && params[2] === 'PLAYER_UPDATED', 'Outbox identity was not persisted', { params });
    assert(params[3] === '{"revision":2}' && result.id === '901', 'Outbox payload/result mapping is invalid', { params, result });

    let missingClientRejected = false;
    try {
        await repository.enqueue(null, {
            aggregateType: 'PLAYER', aggregateId: 'p1', eventType: 'PLAYER_UPDATED', payload: {}
        });
    } catch (error) {
        missingClientRejected = error.message === 'OUTBOX_TRANSACTION_CLIENT_REQUIRED';
    }
    assert(missingClientRejected, 'Outbox enqueue must reject writes outside an injected transaction client');
}

async function auditOutboxLeasePersistence() {
    const repository = new OutboxRepository();
    const statements = [];
    const now = new Date('2026-07-17T00:00:00.000Z');
    const client = {
        async query(sql, params) {
            const statement = String(sql);
            statements.push({ statement, params });
            if (statement.includes('WITH candidates AS')) {
                return {
                    rowCount: 1,
                    rows: [{
                        id: '1', aggregate_type: 'PLAYER', aggregate_id: 'p1',
                        event_type: 'PLAYER_UPDATED', payload: { revision: 2, nested: { value: 1 } },
                        occurred_at: now, attempt_count: 1, locked_at: now
                    }]
                };
            }
            if (statement.includes('SELECT id, attempt_count')) {
                return { rowCount: 1, rows: [{ id: params[0], attempt_count: params[0] === '10' ? 10 : 1 }] };
            }
            if (statement.includes('dead_lettered_at = $3')) {
                return {
                    rowCount: 1,
                    rows: [{
                        id: params[3], attempt_count: params[3] === '10' ? 10 : 1,
                        available_at: params[0], dead_lettered_at: params[2]
                    }]
                };
            }
            if (statement.includes('SET processed_at = $1')) {
                return { rowCount: 1, rows: [{ id: params[1], processed_at: params[0] }] };
            }
            throw new Error(`UNEXPECTED_OUTBOX_QUERY:${statement}`);
        }
    };

    const claimed = await repository.claimBatch(client, {
        workerId: 'worker-a', now, leaseSeconds: 60, limit: 25
    });
    assert(claimed.length === 1 && claimed[0].attemptCount === 1, 'Outbox claim mapping is invalid', claimed);
    assert(Object.isFrozen(claimed[0]) && Object.isFrozen(claimed[0].payload.nested), 'Outbox event envelope must be deeply immutable', claimed[0]);
    assert(statements[0].statement.includes('FOR UPDATE SKIP LOCKED'), 'Outbox claim does not use row ownership with SKIP LOCKED', statements[0]);
    assert(statements[0].params[1] === 60 && statements[0].params[2] === 25, 'Outbox lease/limit parameters were not bound', statements[0]);

    const retry = await repository.fail(client, {
        eventId: '1', workerId: 'worker-a', failedAt: now,
        error: new Error('TRANSIENT'), maxAttempts: 10,
        baseBackoffSeconds: 5, maxBackoffSeconds: 900
    });
    assert(retry.backoffSeconds === 5 && !retry.deadLetteredAt, 'First outbox failure did not schedule 5-second retry', retry);

    const dead = await repository.fail(client, {
        eventId: '10', workerId: 'worker-a', failedAt: now,
        error: new Error('PERMANENT'), maxAttempts: 10,
        baseBackoffSeconds: 5, maxBackoffSeconds: 900
    });
    assert(dead.backoffSeconds === 0 && dead.deadLetteredAt === now, 'Tenth outbox failure was not dead-lettered', dead);

    const acknowledged = await repository.acknowledge(client, {
        eventId: '1', workerId: 'worker-a', processedAt: now
    });
    assert(acknowledged.eventId === '1', 'Outbox acknowledgment mapping is invalid', acknowledged);
}

try {
    await auditCommit();
    await auditRollback();
    await auditMigrations();
    await auditInventoryBackfill();
    await auditCutoverStateGuards();
    await auditInventoryPersistenceRouter();
    await auditInventoryActivation();
    await auditAtomicPeriodCounter();
    await auditResourceLedger();
    await auditEconomyMutationAuditTrail();
    await auditRewardClaimHeader();
    await auditActivityRunIdentity();
    await auditRewardMutationLedger();
    await auditActivityProgressProjection();
    await auditSectMembershipPersistence();
    await auditTransactionalOutboxEnqueue();
    await auditOutboxLeasePersistence();
    console.log(JSON.stringify({ status: 'PASS', checks: ['commit', 'rollback', 'migration-discovery', 'advisory-lock', 'inventory-backfill', 'cutover-state-guards', 'inventory-persistence-router', 'inventory-activation', 'atomic-period-counter', 'resource-ledger', 'economy-mutation-audit-trail', 'reward-claim-header', 'activity-run-identity', 'reward-mutation-ledger', 'activity-progress-projection', 'sect-membership-persistence', 'transactional-outbox-enqueue', 'outbox-lease-persistence'] }, null, 2));
} catch (error) {
    console.error(JSON.stringify({
        status: 'FAIL',
        message: error.message,
        details: error.details || null
    }, null, 2));
    process.exitCode = 1;
}
