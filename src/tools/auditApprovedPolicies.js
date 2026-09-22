import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import BreakthroughService from '../gameplay/player/BreakthroughService.js';
import Player from '../core/Player.js';
import { assertInventoryCapacity, calculateRequiredInventorySlots } from '../gameplay/inventory/InventoryCapacityPolicy.js';
import PeriodKeyService from '../platform/time/PeriodKeyService.js';
import RuntimePlayerFactory from '../runtime/player/RuntimePlayerFactory.js';
import EquipmentService from '../gameplay/player/EquipmentService.js';
import PlayerWalletRepository from '../repositories/PlayerWalletRepository.js';
import IdempotentOperationExecutor from '../platform/idempotency/IdempotentOperationExecutor.js';
import { createRequestHash } from '../platform/idempotency/createRequestHash.js';
import RewardRuntimeService from '../gameplay/rewards/RewardRuntimeService.js';
import {
    compareDecimal,
    multiplyDecimal,
    subtractDecimal
} from '../shared/numeric/FixedDecimal.js';
import {
    compareIntegerAmounts,
    normalizeIntegerAmount
} from '../shared/numeric/IntegerAmount.js';

function assert(condition, message, details = {}) {
    if (!condition) {
        const error = new Error(message);
        error.details = details;
        throw error;
    }
}

function auditCultivationSpeedAfterBreakthrough() {
    const createPlayer = (realmId, realmStage) => new Player({
        id: `speed-${realmId}-${realmStage}`,
        name: 'Speed Audit',
        realm_id: realmId,
        realm_stage: realmStage,
        cultivation: '0',
        cultivation_art_id: 'CP_FIRE_HOANG',
        spiritual_root: 'Moc Linh Can',
        last_cultivate: new Date('2026-07-22T00:00:00.000Z'),
        equipments: [],
        passive_skills: [],
        active_buffs: []
    });
    const before = createPlayer(1, 1).calculateOfflineCultivation().gainPerMinute;
    const afterMinor = createPlayer(1, 2).calculateOfflineCultivation().gainPerMinute;
    const afterMajor = createPlayer(2, 1).calculateOfflineCultivation().gainPerMinute;

    assert(compareDecimal(afterMinor, before) === 0,
        'Minor breakthrough must not reduce cultivation speed', { before, afterMinor });
    assert(compareDecimal(afterMajor, before) > 0,
        'Major breakthrough must increase cultivation speed', { before, afterMajor });
}

async function auditBreakthroughPenalty() {
    const requiredCultivation = '67737.000000';
    const runtimePlayer = new RuntimePlayerFactory().create({
        playerId: 'policy-player',
        name: 'Policy Player',
        realmId: 2,
        realmStage: 10,
        cultivation: requiredCultivation,
        cultivationArtId: 'CP_NEUTRAL_HOANG',
        spiritualRoot: 'Moc Linh Can',
        baseAtk: 87,
        baseDef: 43,
        baseHp: 459,
        baseSpd: 7,
        inventory: [],
        skillIds: [],
        cultivationArtIds: ['CP_NEUTRAL_HOANG'],
        lastCultivate: new Date(Date.now() + 60_000)
    });
    let saved = null;
    const service = new BreakthroughService({
        random: () => 0.999,
        playerRuntimeRepository: {
            async findById() {
                return runtimePlayer;
            },
            async updateCultivationState(_playerId, payload) {
                saved = payload;
            }
        }
    });
    const result = await service.attemptBreakthrough(runtimePlayer.playerId);

    assert(result.outcome === 'FAILED', 'Expected deterministic breakthrough failure', result);
    assert(result.failureCultivationLossPercent === 25, 'Failure percent is not data-driven', result);
    assert(compareDecimal(result.cultivationLoss, '16934.25') === 0, 'Failure loss must be 25% of required cultivation', result);
    assert(compareDecimal(saved?.cultivation, '50802.75') === 0, 'Failure remaining cultivation is incorrect', saved);
}

async function auditMinorBreakthrough() {
    const runtimePlayer = new RuntimePlayerFactory().create({
        playerId: 'minor-player',
        name: 'Minor Player',
        realmId: 1,
        realmStage: 1,
        cultivation: 100,
        cultivationArtId: 'CP_FIRE_HOANG',
        spiritualRoot: 'Moc Linh Can',
        baseAtk: 40,
        baseDef: 20,
        baseHp: 200,
        baseSpd: 5,
        inventory: [],
        skillIds: [],
        cultivationArtIds: ['CP_FIRE_HOANG'],
        lastCultivate: new Date(Date.now() + 60_000)
    });
    let saved = null;
    const service = new BreakthroughService({
        random: () => 0.999,
        playerRuntimeRepository: {
            async findById() { return runtimePlayer; },
            async updateBreakthroughState(_playerId, payload) { saved = payload; }
        }
    });
    const result = await service.attemptBreakthrough(runtimePlayer.playerId);

    assert(result.outcome === 'SUCCESS' && result.transitionType === 'MINOR', 'Minor breakthrough must be guaranteed', result);
    assert(saved?.realmId === 1 && saved?.realmStage === 2, 'Minor breakthrough must increment only Stage', saved);
    assert(saved?.baseHp === '220' && saved?.baseAtk === '44'
        && saved?.baseDef === '22' && saved?.baseSpd === '5',
    'Minor breakthrough must persist Q-PROGRESSION-010 compounded base stats', saved);
}

async function auditCultivationOverflow() {
    const runtimePlayer = new RuntimePlayerFactory().create({
        playerId: 'overflow-player',
        name: 'Overflow Player',
        realmId: 1,
        realmStage: 1,
        cultivation: 99,
        cultivationArtId: 'CP_FIRE_HOANG',
        spiritualRoot: 'Moc Linh Can',
        baseAtk: 40,
        baseDef: 20,
        baseHp: 200,
        baseSpd: 5,
        inventory: [],
        skillIds: [],
        cultivationArtIds: ['CP_FIRE_HOANG'],
        lastCultivate: new Date('2026-07-16T00:00:00.000Z')
    });
    let saved = null;
    const { default: CultivationService } = await import('../gameplay/player/CultivationService.js');
    const service = new CultivationService({
        timeProvider: { now: () => new Date('2026-07-16T00:10:00.000Z') },
        playerRuntimeRepository: {
            async findById() { return runtimePlayer; },
            async updateCultivationState(_playerId, payload) { saved = payload; }
        }
    });
    const result = await service.collectOfflineCultivation(runtimePlayer.playerId);
    const expectedOverflow = multiplyDecimal(
        subtractDecimal(result.afkData.generatedCultivation, '1'),
        '0.20'
    );

    assert(compareDecimal(result.afkData.fullEfficiencyGain, '1') === 0, 'Only the amount up to threshold may receive 100%', result.afkData);
    assert(compareDecimal(result.afkData.overflowEffectiveGain, expectedOverflow) === 0, 'Overflow gain must receive 20%', result.afkData);
    assert(saved?.lastCultivateAt?.toISOString() === '2026-07-16T00:10:00.000Z', 'Claim checkpoint must move to now', saved);
}

async function auditBreakthroughIdempotencyReplay() {
    const runtimePlayer = new RuntimePlayerFactory().create({
        playerId: 'replay-player',
        name: 'Replay Player',
        realmId: 1,
        realmStage: 1,
        cultivation: 100,
        cultivationArtId: 'CP_FIRE_HOANG',
        spiritualRoot: 'Moc Linh Can',
        baseAtk: 40,
        baseDef: 20,
        baseHp: 200,
        baseSpd: 5,
        inventory: [],
        skillIds: [],
        cultivationArtIds: ['CP_FIRE_HOANG'],
        lastCultivate: new Date(Date.now() + 60_000)
    });
    let mutationCount = 0;
    const service = new BreakthroughService({
        unitOfWork: { execute: (work) => work({}) },
        playerRuntimeRepository: {
            async findById() { return runtimePlayer; },
            async updateBreakthroughState() { mutationCount += 1; }
        },
        idempotencyRepository: {
            async reserve() {
                return {
                    status: 'COMPLETED',
                    response: {
                        outcome: 'SUCCESS',
                        transitionType: 'MINOR',
                        nextRealmStage: 2
                    }
                };
            }
        }
    });
    const result = await service.attemptBreakthrough(runtimePlayer.playerId, {
        operationId: 'discord-interaction-retry'
    });

    assert(result.idempotentReplay === true, 'Completed operation must return cached response', result);
    assert(mutationCount === 0, 'Idempotent replay must not mutate progression', { mutationCount });
}

async function auditProfilePreviewIsReadOnly() {
    const runtimePlayer = new RuntimePlayerFactory().create({
        playerId: 'preview-player',
        name: 'Preview Player',
        realmId: 1,
        realmStage: 1,
        cultivation: 0,
        cultivationArtId: 'CP_NEUTRAL_HOANG',
        spiritualRoot: 'Moc Linh Can',
        spiritRootId: 'MOC_LINH_CAN',
        spiritRootQualityTierId: 'LOWER_GRADE',
        baseAtk: 40,
        baseDef: 20,
        baseHp: 200,
        baseSpd: 5,
        inventory: [],
        skillIds: [],
        cultivationArtIds: ['CP_NEUTRAL_HOANG'],
        lastCultivate: new Date('2026-07-16T00:00:00.000Z')
    });
    const { default: PlayerReadService } = await import('../gameplay/player/PlayerReadService.js');
    const service = new PlayerReadService({
        timeProvider: { now: () => new Date('2026-07-16T00:10:00.000Z') },
        spiritRootEffectResolver: {
            getAttributeEffects() {
                return [{
                    stat: 'cultivation_speed',
                    mode: 'mul_total',
                    value: 1.05,
                    source: 'spirit-root:audit'
                }];
            },
            getQualityTier() {
                return { id: 'LOWER_GRADE', displayName: 'Hạ Phẩm', order: 1 };
            }
        },
        playerRuntimeRepository: {
            async findById() { return runtimePlayer; }
        }
    });
    const result = await service.getManagementProfileView(runtimePlayer.playerId);
    const publicResult = await service.getPublicProfileView(runtimePlayer.playerId);

    assert(result.cultivationPreview.persisted === false, 'Profile cultivation must be preview-only', result.cultivationPreview);
    assert(compareDecimal(result.cultivationPreview.earned, 0) > 0, 'Profile preview must calculate pending cultivation', result.cultivationPreview);
    assert(compareDecimal(result.cultivationPreview.persistedCultivation, 0) === 0,
        'Profile preview must expose the persisted cultivation separately', result.cultivationPreview);
    assert(compareDecimal(result.cultivationPreview.projectedCultivation, result.cultivationPreview.earned) === 0,
        'Projected cultivation must include pending gain without persisting it', result.cultivationPreview);
    assert(compareDecimal(result.cultivationPreview.gainPerMinute, 0) > 0,
        'Profile preview must expose the effective gain per minute', result.cultivationPreview);
    assert(compareDecimal(result.cultivationPreview.gainPerMinute, '72') === 0,
        'Base 60/min with neutral starter art +20% must produce 72/min', result.cultivationPreview);
    assert(compareDecimal(result.cultivationPreview.generatedCultivation, '720') === 0,
        'Ten continuous minutes at 72/min must generate 720 raw cultivation', result.cultivationPreview);
    assert(compareDecimal(result.cultivationPreview.earned, '224') === 0,
        'Cultivation above the 100 threshold must retain the approved 20% overflow efficiency',
        result.cultivationPreview);
    assert(result.attributeBonuses.some((effect) => (
        effect.stat === 'cultivation_speed'
        && effect.mode === 'mul_total'
        && effect.value === 1.05
        && effect.sources.includes('spirit-root:audit')
    )), 'Management profile must include the dedicated spirit-root effect projection', result.attributeBonuses);
    assert(compareDecimal(runtimePlayer.cultivation, 0) === 0, 'Preview must not mutate persisted runtime snapshot', runtimePlayer);
    assert(publicResult.cultivation.previewPersisted === false, 'Public profile cultivation must remain preview-only', publicResult.cultivation);
    assert(!('runtimePlayer' in publicResult) && !('player' in publicResult), 'Public profile must not expose internal aggregate objects', Object.keys(publicResult));
    assert(
        Object.keys(publicResult).sort().join(',') === 'cultivation,cultivationArt,effects,equipment,name,realm,skills,spiritRootQuality,spiritStones,spiritualRoot,stats',
        'Public profile must use the approved top-level field allowlist',
        Object.keys(publicResult)
    );
    assert(
        publicResult.spiritRootQuality
        && Object.keys(publicResult.spiritRootQuality).sort().join(',') === 'id,name,order',
        'Public spirit-root quality must use the approved field allowlist',
        publicResult.spiritRootQuality
    );
}

async function auditNegativeClockSkew() {
    const runtimePlayer = new RuntimePlayerFactory().create({
        playerId: 'clock-skew-player',
        name: 'Clock Skew Player',
        realmId: 1,
        realmStage: 1,
        cultivation: 10,
        cultivationArtId: 'CP_FIRE_HOANG',
        spiritualRoot: 'Moc Linh Can',
        baseAtk: 40,
        baseDef: 20,
        baseHp: 200,
        baseSpd: 5,
        inventory: [],
        skillIds: [],
        cultivationArtIds: ['CP_FIRE_HOANG'],
        lastCultivate: new Date('2026-07-16T00:10:00.000Z')
    });
    let mutationCount = 0;
    const { default: CultivationService } = await import('../gameplay/player/CultivationService.js');
    const service = new CultivationService({
        timeProvider: { now: () => new Date('2026-07-16T00:00:00.000Z') },
        playerRuntimeRepository: {
            async findById() { return runtimePlayer; },
            async updateCultivationState() { mutationCount += 1; }
        }
    });
    const result = await service.collectOfflineCultivation(runtimePlayer.playerId);

    assert(result.afkData.seconds === 0, 'Negative clock skew must clamp elapsed to zero', result.afkData);
    assert(mutationCount === 0, 'Negative clock skew must not move checkpoint backwards', { mutationCount });
}

async function auditSettleBeforeEquipmentChange() {
    const runtimePlayer = new RuntimePlayerFactory().create({
        playerId: 'settle-player',
        name: 'Settle Player',
        realmId: 1,
        realmStage: 1,
        cultivation: 0,
        cultivationArtId: 'CP_FIRE_HOANG',
        spiritualRoot: 'Moc Linh Can',
        baseAtk: 40,
        baseDef: 20,
        baseHp: 200,
        baseSpd: 5,
        inventory: [{
            instanceId: '101',
            itemId: 'EQ_FIRE_WEAPON',
            quantity: 1,
            rarity: 'COMMON',
            equippedSlot: null,
            instanceData: { equipmentType: 'WEAPON' }
        }],
        skillIds: [],
        cultivationArtIds: ['CP_FIRE_HOANG'],
        lastCultivate: new Date('2026-07-16T00:00:00.000Z')
    });
    const order = [];
    let equipPayload = null;
    const service = new EquipmentService({
        unitOfWork: { execute: (work) => work({ transaction: true }) },
        cultivationService: {
            async settleRuntimePlayer() {
                order.push('SETTLE_OLD_LOADOUT');
                return { afkData: { earned: '1.000000', seconds: 60 } };
            }
        },
        playerRuntimeRepository: {
            async findById(_playerId, options) {
                assert(options.forUpdate === true, 'Equipment change must lock player');
                return runtimePlayer;
            },
            async equipItem(_playerId, payload) {
                equipPayload = payload;
                order.push('MUTATE_LOADOUT');
            }
        }
    });
    await service.equipItem(runtimePlayer.playerId, '101');

    assert(order.join(',') === 'SETTLE_OLD_LOADOUT,MUTATE_LOADOUT', 'Equipment must settle before mutation', { order });
    assert(equipPayload?.slot === 'WEAPON', 'Equipment must use canonical equipment type as loadout slot', {
        equipPayload
    });
}

function auditPeriodKeys() {
    const service = new PeriodKeyService({ timeZone: 'Asia/Ho_Chi_Minh' });
    assert(service.getKey('WEEKLY', new Date('2026-07-12T16:59:59.999Z')) === '2026-07-06', 'Weekly key before Monday boundary is incorrect');
    assert(service.getKey('WEEKLY', new Date('2026-07-12T17:00:00.000Z')) === '2026-07-13', 'Weekly key at Monday boundary is incorrect');
    assert(service.getKey('DAILY', new Date('2026-07-12T17:00:00.000Z')) === '2026-07-13', 'Daily timezone key is incorrect');
}

function auditInventoryOverflow() {
    const existingRows = [{ item_id: 'ITEM_A', equipped_slot: null }];
    const rewards = [
        { type: 'ITEM', itemId: 'ITEM_A' },
        { type: 'ITEM', itemId: 'ITEM_B' },
        { type: 'ITEM', itemId: 'ITEM_B' }
    ];
    assert(calculateRequiredInventorySlots(existingRows, rewards) === 1, 'Stacked rewards consumed too many slots');

    let overflow = null;
    try {
        assertInventoryCapacity(existingRows, rewards, 1);
    } catch (error) {
        overflow = error;
    }
    assert(overflow?.message === 'INVENTORY_FULL' && overflow.retryable === true, 'Inventory overflow must be retryable');
}

function auditLargeCurrencySafety() {
    const largeBalance = '900719925474099312345678901234';
    assert(normalizeIntegerAmount(largeBalance) === largeBalance, 'Large currency must remain an exact string');
    assert(compareIntegerAmounts(largeBalance, '900719925474099312345678901233') > 0, 'Large currency comparison lost precision');

    let unsafeNumberRejected = false;
    try {
        normalizeIntegerAmount(Number.MAX_SAFE_INTEGER + 1);
    } catch (error) {
        unsafeNumberRejected = error.message.startsWith('UNSAFE_INTEGER_AMOUNT:');
    }
    assert(unsafeNumberRejected, 'Unsafe JavaScript Number currency must be rejected');

    const runtimePlayer = new RuntimePlayerFactory().create({
        playerId: 'large-currency-player',
        name: 'Large Currency Player',
        realmId: 1,
        realmStage: 1,
        cultivation: 0,
        spiritStones: largeBalance,
        walletBalances: {
            SPIRIT_STONE: largeBalance,
            CUSTOM_CURRENCY: '42'
        },
        inventory: [],
        skillIds: [],
        cultivationArtIds: []
    });
    assert(runtimePlayer.currencies.spiritStones === largeBalance, 'Runtime currency must not pass through Number', runtimePlayer.currencies);
    assert(runtimePlayer.currencies.CUSTOM_CURRENCY === '42', 'Runtime must expose data-driven wallet currency IDs', runtimePlayer.currencies);
}

async function auditWalletMutationPrecision() {
    const balances = new Map([
        ['SPIRIT_STONE', 900719925474099312345678901234n],
        ['CUSTOM_CURRENCY', 0n]
    ]);
    let legacySyncCount = 0;
    const client = {
        async query(sql, params = []) {
            const statement = String(sql).trim();
            if (statement.startsWith('SELECT id FROM players')) {
                return { rows: [{ id: params[0] }], rowCount: 1 };
            }
            if (statement.startsWith('INSERT INTO player_wallets')) {
                if (!balances.has(params[1])) balances.set(params[1], 0n);
                return { rows: [], rowCount: 0 };
            }
            if (statement.startsWith('SELECT amount')) {
                const balance = balances.get(params[1]);
                return balance == null
                    ? { rows: [], rowCount: 0 }
                    : { rows: [{ amount: balance.toString() }], rowCount: 1 };
            }
            if (statement.includes('SET amount = amount -')) {
                const current = balances.get(params[1]) || 0n;
                const amount = BigInt(params[2]);
                if (current < amount) return { rows: [], rowCount: 0 };
                const next = current - amount;
                balances.set(params[1], next);
                return { rows: [{ amount: next.toString() }], rowCount: 1 };
            }
            if (statement.includes('SET amount = amount +')) {
                const next = (balances.get(params[1]) || 0n) + BigInt(params[2]);
                balances.set(params[1], next);
                return { rows: [{ amount: next.toString() }], rowCount: 1 };
            }
            if (statement.startsWith('UPDATE players SET')) {
                legacySyncCount += 1;
                return { rows: [], rowCount: 1 };
            }
            throw new Error(`UNEXPECTED_WALLET_AUDIT_QUERY:${statement}`);
        }
    };
    const repository = new PlayerWalletRepository();
    const afterDebit = await repository.debit(client, {
        playerId: 'wallet-player',
        currencyId: 'SPIRIT_STONE',
        amount: '900719925474099312345678901200'
    });
    assert(afterDebit === '34', 'Wallet debit lost precision', { afterDebit });

    const customBalance = await repository.credit(client, {
        playerId: 'wallet-player',
        currencyId: 'CUSTOM_CURRENCY',
        amount: '9007199254740993'
    });
    assert(customBalance === '9007199254740993', 'Data-driven wallet credit lost precision', { customBalance });
    assert(legacySyncCount === 1, 'Only compatibility currencies should sync legacy columns', { legacySyncCount });

    let insufficient = false;
    try {
        await repository.debit(client, {
            playerId: 'wallet-player',
            currencyId: 'SPIRIT_STONE',
            amount: '35'
        });
    } catch (error) {
        insufficient = error.message === 'INSUFFICIENT_CURRENCY';
    }
    assert(insufficient, 'Wallet debit must guard insufficient balance atomically');
}

async function auditEconomyIdempotencyReplay() {
    const operationId = 'economy-operation-1';
    let savedResponse = null;
    let mutationCount = 0;
    let transactionCount = 0;
    const executor = new IdempotentOperationExecutor({
        unitOfWork: {
            async execute(work) {
                transactionCount += 1;
                return work({ transaction: transactionCount });
            }
        },
        idempotencyRepository: {
            async reserve() {
                return savedResponse
                    ? { status: 'COMPLETED', response: savedResponse }
                    : { status: 'RESERVED' };
            },
            async complete(_client, payload) {
                savedResponse = payload.response;
            }
        }
    });
    const operation = {
        operationId,
        playerId: 'economy-player',
        operationType: 'SHOP_PURCHASE',
        requestHash: createRequestHash({ playerId: 'economy-player', entryId: 'ITEM_A' })
    };
    const mutate = async () => {
        mutationCount += 1;
        return { status: 'PURCHASED', purchaseId: '1' };
    };

    const first = await executor.execute(operation, mutate);
    const replay = await executor.execute(operation, mutate);

    assert(first.status === 'PURCHASED', 'First idempotent economy mutation failed', first);
    assert(replay.status === 'PURCHASED' && replay.idempotentReplay === true, 'Economy replay did not return cached response', replay);
    assert(mutationCount === 1, 'Economy replay executed mutation more than once', { mutationCount });
    assert(transactionCount === 2, 'Each idempotency attempt must use a transaction', { transactionCount });
    assert(
        createRequestHash({ b: 2, a: 1 }) === createRequestHash({ a: 1, b: 2 }),
        'Request hash must be stable across object key order'
    );
}

async function auditRewardPlanReplay() {
    let savedResponse = null;
    let rollCount = 0;
    let mutationCount = 0;
    let claimCount = 0;
    let runCompleteCount = 0;
    let reservedIdempotency = null;
    const activityRunRepository = {
        async reserve() { return { runId: '77', status: 'IN_PROGRESS' }; },
        async complete() {
            runCompleteCount += 1;
            return { id: '77', status: 'COMPLETED' };
        }
    };
    const service = new RewardRuntimeService({
        gameDataManager: {
            getCollection() { return {}; }
        },
        rewardTableService: {
            roll(tableId) {
                rollCount += 1;
                return {
                    tableId,
                    tableName: 'Replay Reward',
                    rewards: [{ type: 'CURRENCY', currencyId: 'SPIRIT_STONE', amount: rollCount }]
                };
            }
        },
        playerRuntimeRepository: {
            async applyRewards(_playerId, rewards) {
                mutationCount += 1;
                return rewards;
            }
        },
        unitOfWork: {
            async execute(work) { return work({ transaction: true }); }
        },
        activityRunRepository,
        rewardClaimRepository: {
            async create() {
                claimCount += 1;
                return { claimId: '88', claimedAt: new Date() };
            }
        },
        idempotencyRepository: {
            async reserve(_client, payload) {
                reservedIdempotency = payload;
                return savedResponse
                    ? { status: 'COMPLETED', response: savedResponse }
                    : { status: 'RESERVED' };
            },
            async complete(_client, payload) { savedResponse = payload.response; }
        }
    });
    const options = {
        operationId: 'reward-operation-1',
        operationType: 'AUDIT_REWARD',
        rewardSource: 'AUDIT_TABLE',
        activityType: 'AUDIT_ACTIVITY',
        contentId: 'AUDIT_CONTENT'
    };

    const first = await service.settle('reward-player', 'AUDIT_TABLE', {}, options);
    const replay = await service.settle('reward-player', 'AUDIT_TABLE', {}, options);

    assert(rollCount === 2, 'Reward audit must exercise reroll before replay lookup', { rollCount });
    assert(mutationCount === 1, 'Reward replay applied mutation more than once', { mutationCount });
    assert(claimCount === 1 && runCompleteCount === 1, 'Reward claim/run completion must execute once', { claimCount, runCompleteCount });
    assert(reservedIdempotency.businessKey === 'AUDIT_REWARD:77', 'Activity run ID must form the permanent reward business key', reservedIdempotency);
    assert(reservedIdempotency.retentionPolicy === 'ONE_TIME_CLAIM', 'Activity reward must use permanent business-key retention', reservedIdempotency);
    assert(first.plan.rewards[0].amount === 1, 'First reward plan is incorrect', first.plan);
    assert(replay.plan.rewards[0].amount === 1, 'Replay exposed a new roll instead of committed plan', replay.plan);
    assert(replay.applied.idempotentReplay === true, 'Reward replay marker is missing', replay.applied);
}

try {
    const gameDataManager = bootstrapGameData();
    setGameDataManager(gameDataManager);
    const cultivationRules = gameDataManager.getCollection('cultivationRules');
    const economyRules = gameDataManager.getCollection('economyRules');
    const rewardRules = gameDataManager.getCollection('rewardRuntimeRules');
    const idempotencyRules = gameDataManager.getCollection('idempotencyRules');

    assert(cultivationRules.storage?.precision === 30 && cultivationRules.storage?.scale === 6, 'Cultivation numeric policy is invalid');
    assert(cultivationRules.offlineTimeLimit === 'NONE', 'Offline cultivation must have no time cap');
    assert(cultivationRules.cultivationOverflow?.efficiencyMultiplier === '0.20', 'Cultivation overflow policy is invalid');
    assert(economyRules.weeklyBoundary?.day === 'MONDAY', 'Economy weekly boundary is invalid');
    assert(rewardRules.overflowPolicy === 'ROLLBACK_RETRYABLE', 'Reward overflow policy is invalid');
    assert(idempotencyRules.operationPolicies?.ONE_TIME_CLAIM?.businessKeyRetention === 'PERMANENT', 'One-time idempotency retention is invalid');

    auditPeriodKeys();
    auditInventoryOverflow();
    auditCultivationSpeedAfterBreakthrough();
    auditLargeCurrencySafety();
    await auditWalletMutationPrecision();
    await auditEconomyIdempotencyReplay();
    await auditRewardPlanReplay();
    await auditBreakthroughPenalty();
    await auditMinorBreakthrough();
    await auditCultivationOverflow();
    await auditBreakthroughIdempotencyReplay();
    await auditProfilePreviewIsReadOnly();
    await auditNegativeClockSkew();
    await auditSettleBeforeEquipmentChange();

    console.log(JSON.stringify({
        status: 'PASS',
        checks: ['numeric-policy', 'large-currency-safety', 'wallet-mutation-precision', 'economy-idempotency', 'reward-plan-replay', 'cultivation-overflow', 'cultivation-preview', 'cultivation-speed-after-breakthrough', 'negative-clock-skew', 'settle-before-change', 'minor-breakthrough', 'breakthrough-penalty', 'breakthrough-idempotency', 'idempotency-retention', 'weekly-boundary', 'inventory-overflow']
    }, null, 2));
} catch (error) {
    console.error(JSON.stringify({ status: 'FAIL', message: error.message, details: error.details || null }, null, 2));
    process.exitCode = 1;
}
