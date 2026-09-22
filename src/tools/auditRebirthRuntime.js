import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import RuntimePlayerFactory from '../runtime/player/RuntimePlayerFactory.js';
import RebirthService from '../gameplay/player/RebirthService.js';
import { resolveRealmStageValue } from '../core/RealmStageValue.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const gameDataManager = bootstrapGameData();
setGameDataManager(gameDataManager);
const realms = Object.values(gameDataManager.getCollection('realms')).sort((a, b) => a.order - b.order);
const finalRealm = realms.at(-1);
const required = resolveRealmStageValue(finalRealm.cultivation.required, finalRealm.max_stage);
const rebornAt = new Date('2026-07-19T00:00:00.000Z');
const runtimePlayer = new RuntimePlayerFactory().create({
    playerId: 'rebirth-player', name: 'Luân Hồi Giả', realmId: finalRealm.id,
    realmStage: finalRealm.max_stage, cultivation: String(required),
    cultivationArtId: 'CP_FIRE_HOANG', spiritualRoot: 'Loi Linh Can',
    spiritRootId: 'LOI_LINH_CAN', sectId: 'SECT_FIRE', rebirthCount: '3',
    walletBalances: { SPIRIT_STONE: '999', SECT_POINT: '20', HONOR: '5' },
    baseAtk: 1000, baseDef: 900, baseHp: 5000, baseSpd: 100,
    inventory: [], skillIds: [], cultivationArtIds: ['CP_FIRE_HOANG'],
    lastCultivate: rebornAt, createdAt: rebornAt
});
let resetPayload;
let activityGateChecked = false;
const service = new RebirthService({
    gameDataManager,
    timeProvider: { now: () => rebornAt },
    operationExecutor: { execute: (_operation, work) => work({ query() {} }) },
    playerRuntimeRepository: {
        async findById(_playerId, options) {
            if (options) assert(options.forUpdate === true, 'Rebirth must lock Player before eligibility/reset');
            return runtimePlayer;
        },
        async updateCultivationState() {
            throw new Error('Eligible rebirth must not use non-terminal cultivation update');
        }
    },
    rebirthRepository: {
        async assertNoActivityInProgress() { activityGateChecked = true; },
        async applyReset(_client, payload) {
            resetPayload = payload;
            return { historyId: '44', rebornAt };
        }
    }
});

const preview = await service.preview(runtimePlayer.playerId, { previewedAt: rebornAt });
assert(preview.outcome === 'REBIRTH_ELIGIBLE' && preview.nextRebirthCount === '4',
    'Rebirth preview mismatch', preview);
assert(preview.previewIdentity === 'REBIRTH_MVP_V1:2:3:4', 'Preview identity mismatch', preview);
assert(!Object.hasOwn(preview, 'player'), 'Preview must not expose mutable runtime Player');

const result = await service.rebirth(runtimePlayer.playerId, { operationId: 'rebirth-op-1', rebornAt });
assert(activityGateChecked, 'Rebirth activity gate was not checked');
assert(result.outcome === 'REBIRTH_SUCCESS' && result.rebirthCount === '4', 'Rebirth result mismatch', result);
assert(resetPayload.realmId === realms[0].id && resetPayload.realmStage === 1, 'Reset target mismatch', resetPayload);
assert(resetPayload.cultivationArtId === 'CP_NEUTRAL_HOANG', 'Runtime bootstrap art mismatch');
assert(resetPayload.retainedSpiritStone === '999', 'Spirit Stone was not retained');
assert(resetPayload.beforeSnapshot.spiritRootId === 'LOI_LINH_CAN', 'Current Spirit Root must be retained');
assert(JSON.stringify(result.baseStats) === JSON.stringify({ hp: '300', atk: '60', def: '30', spd: '7' }),
    'Rebirth base stat calculation mismatch', result.baseStats);

let blocked = false;
const blockedService = new RebirthService({
    gameDataManager,
    operationExecutor: { execute: (_operation, work) => work({}) },
    playerRuntimeRepository: { findById: async () => runtimePlayer },
    rebirthRepository: {
        async assertNoActivityInProgress() { throw new Error('REBIRTH_ACTIVITY_IN_PROGRESS'); }
    }
});
try {
    await blockedService.rebirth(runtimePlayer.playerId, { operationId: 'rebirth-op-2', rebornAt });
} catch (error) {
    blocked = error.message === 'REBIRTH_ACTIVITY_IN_PROGRESS';
}
assert(blocked, 'In-progress activity did not block rebirth');

let staleResetApplied = false;
const staleService = new RebirthService({
    gameDataManager,
    operationExecutor: { execute: (_operation, work) => work({}) },
    playerRuntimeRepository: { findById: async () => runtimePlayer },
    rebirthRepository: {
        async assertNoActivityInProgress() {},
        async applyReset() { staleResetApplied = true; }
    }
});
const staleResult = await staleService.rebirth(runtimePlayer.playerId, {
    operationId: 'rebirth-op-stale', expectedRebirthCount: '3', rebornAt
});
assert(staleResult.outcome === 'REBIRTH_PREVIEW_STALE' && !staleResetApplied,
    'Stale preview must not reset progression', staleResult);

console.log(JSON.stringify({
    status: 'PASS',
    checks: {
        playerLock: true,
        readOnlyPreview: true,
        stalePreviewGuard: true,
        activityGate: true,
        nextRebirthCount: result.rebirthCount,
        resetRealmId: result.realmId,
        baseStats: result.baseStats,
        retainedSpiritStone: result.retainedSpiritStone,
        spiritRootRetained: true
    }
}, null, 2));
