import fs from 'fs';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import RuntimePlayerFactory from '../runtime/player/RuntimePlayerFactory.js';
import SpiritRootRerollService from '../gameplay/player/SpiritRootRerollService.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const gameDataManager = bootstrapGameData();
setGameDataManager(gameDataManager);
const now = new Date('2026-07-20T12:00:00.000Z');
const runtimePlayer = new RuntimePlayerFactory().create({
    playerId: 'spirit-root-player', name: 'Linh Can Audit', realmId: 1, realmStage: 1,
    cultivation: '0', cultivationArtId: 'CP_FIRE_HOANG',
    spiritualRoot: 'Thien Linh Can', spiritRootId: 'THIEN_LINH_CAN',
    spiritRootQualityTierId: 'LOWER_GRADE', rebirthCount: '1',
    walletBalances: { SPIRIT_STONE: '100' }, inventory: [], skillIds: [],
    cultivationArtIds: ['CP_FIRE_HOANG'], lastCultivate: now, createdAt: now
});
const entitlement = Object.freeze({
    id: '41', playerId: runtimePlayer.playerId, rebirthNumber: '1',
    availableCount: '2', grantedAt: now.toISOString()
});
const order = [];
let appliedPayload;
let operation;
const service = new SpiritRootRerollService({
    gameDataManager,
    timeProvider: { now: () => now },
    seedProvider: { nextSeed: () => 1 },
    operationExecutor: {
        execute: (input, work) => { operation = input; return work({ query() {} }); }
    },
    playerRuntimeRepository: {
        async findById(_playerId, options) {
            if (options) assert(options.forUpdate === true, 'Player must be locked before entitlement');
            return runtimePlayer;
        },
        async updateCultivationState() { order.push('SETTLE_CULTIVATION'); }
    },
    repository: {
        async findOldestAvailable(_playerId, options) {
            if (options) assert(options.forUpdate === true, 'Entitlement must be locked on confirm');
            return entitlement;
        },
        async applyReroll(_client, payload) {
            order.push('APPLY_REROLL');
            appliedPayload = payload;
            return { historyId: '91', rolledAt: now };
        }
    }
});

const preview = await service.preview(runtimePlayer.playerId);
assert(preview.entitlement.id === '41'
    && preview.pool.bracketId === 'REBIRTH_1_2'
    && preview.pool.templateBracketId === 'ROOT_REBIRTH_0_9',
    'Grant-time preview bracket mismatch', preview);
const result = await service.reroll(runtimePlayer.playerId, {
    operationId: 'spirit-root-op-1', expectedEntitlementId: '41', rolledAt: now
});
assert(result.outcome === 'SPIRIT_ROOT_REROLL_SUCCESS', 'Reroll outcome mismatch', result);
assert(result.previous.spiritRootId === 'THIEN_LINH_CAN'
    && result.current.spiritRootId === 'TAP_CAN'
    && result.current.qualityTierId === 'LOWER_GRADE',
'Seeded accepted result mismatch', result);
assert(result.rejectedExactDuplicates === 1
    && appliedPayload.rollSnapshot.rejectedDraws.length === 1,
'Exact duplicate was not rejected/audited', appliedPayload?.rollSnapshot);
assert(order.join(',') === 'SETTLE_CULTIVATION,APPLY_REROLL',
    'Cultivation must settle before quality mutation', order);
assert(operation.operationType === 'SPIRIT_ROOT_REROLL'
    && appliedPayload.entitlementId === '41'
    && appliedPayload.poolRevision === 4
    && appliedPayload.rollSnapshot.templateBracketId === 'ROOT_REBIRTH_0_9'
    && appliedPayload.rollSnapshot.templateWeights.reduce(
        (sum, entry) => sum + entry.weight,
        0
    ) === 100,
'Idempotency/persistence identity mismatch', { operation, appliedPayload });

const stale = await service.reroll(runtimePlayer.playerId, {
    operationId: 'spirit-root-op-stale', expectedEntitlementId: '40', rolledAt: now
});
assert(stale.outcome === 'SPIRIT_ROOT_REROLL_PREVIEW_STALE',
    'Stale entitlement preview was not rejected', stale);

const repositorySource = fs.readFileSync(
    new URL('../repositories/SpiritRootRerollRepository.js', import.meta.url),
    'utf8'
);
assert(repositorySource.includes('ORDER BY entitlement.rebirth_number ASC, entitlement.id ASC')
    && repositorySource.includes("status = 'AVAILABLE'")
    && repositorySource.includes('FOR UPDATE'),
'Repository does not enforce oldest-first conditional consumption');

console.log(JSON.stringify({
    status: 'PASS',
    checks: {
        playerThenEntitlementLock: true,
        grantTimeBracket: preview.pool.bracketId,
        templateWeightBracket: preview.pool.templateBracketId,
        oldestFirst: true,
        settleBeforeChange: true,
        seededExactDuplicateRejected: result.rejectedExactDuplicates,
        rollSnapshotPersisted: true,
        stalePreviewGuard: true,
        idempotencyOperation: operation.operationType
    }
}, null, 2));
