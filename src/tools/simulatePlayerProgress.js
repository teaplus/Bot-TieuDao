import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import PlayerProgressService from '../gameplay/player/PlayerProgressService.js';
import RuntimePlayerFactory from '../runtime/player/RuntimePlayerFactory.js';
import { resolveRequiredCultivation } from '../core/RealmStageValue.js';

function assert(condition, message, details) {
    if (!condition) {
        throw new Error(`${message}: ${JSON.stringify(details)}`);
    }
}

function parseArgs(argv) {
    const args = {};

    for (const arg of argv) {
        const [key, value] = arg.replace(/^--/, '').split('=');
        args[key] = value ?? true;
    }

    return args;
}

function createRuntimePlayer(overrides = {}) {
    return new RuntimePlayerFactory().create({
        playerId: 'sim-player',
        name: 'Progress Tester',
        realmId: Number(overrides.realmId || 2),
        realmStage: Number(overrides.realmStage || 3),
        cultivationArtId: 'CP_FIRE_HOANG',
        spiritualRoot: 'FIRE',
        sectId: overrides.sectId || 'SECT_FIRE',
        spiritStones: Number(overrides.spiritStones ?? 100),
        sectPoints: Number(overrides.sectPoints ?? 300),
        honor: Number(overrides.honor ?? 0),
        eventPoints: Number(overrides.eventPoints ?? 0),
        cultivation: Number(overrides.cultivation ?? 50),
        baseAtk: 50,
        baseDef: 20,
        baseHp: 200,
        baseSpd: 8,
        lastCultivate: new Date(),
        lastTreasureHunt: new Date(),
        inventory: [],
        skillIds: ['SK_FIRE_HOANG'],
        cultivationArtIds: ['CP_FIRE_HOANG']
    });
}

const args = parseArgs(process.argv.slice(2));
const gameDataManager = bootstrapGameData();
setGameDataManager(gameDataManager);

const runtimePlayer = createRuntimePlayer(args);
const playerRuntimeRepository = {
    async findById(playerId) {
        return playerId === runtimePlayer.playerId ? runtimePlayer : null;
    },
    async getProgressSummary(playerId) {
        return {
            exploration: {
                totalRuns: 5,
                victories: 4,
                lastCompletedAt: new Date()
            },
            secretRealm: {
                totalRuns: 2,
                clears: 1,
                lastCompletedAt: new Date()
            },
            gathering: {
                totalRuns: 3,
                lastCompletedAt: new Date()
            },
            shop: {
                totalPurchases: 1,
                lastCompletedAt: new Date()
            },
            craft: {
                totalCrafts: 1,
                lastCompletedAt: new Date()
            },
            exchange: {
                totalExchanges: 1,
                lastCompletedAt: new Date()
            },
            playerId
        };
    }
};
const playerProgressService = new PlayerProgressService({
    playerRuntimeRepository,
    gameDataManager
});

const progress = await playerProgressService.getProgressView(runtimePlayer.playerId);
const realm = gameDataManager.getRecord('realms', runtimePlayer.realmId);
const expectedRequiredCultivation = resolveRequiredCultivation(realm, runtimePlayer.realmStage);

assert(
    progress.realm.stage === runtimePlayer.realmStage,
    'Progress view must expose the persisted realm stage',
    progress.realm
);
assert(
    progress.realm.requiredCultivation === expectedRequiredCultivation,
    'Progress view must use the approved stage growth formula',
    { realm: progress.realm, expectedRequiredCultivation }
);
assert(
    progress.realm.requiredCultivation !== realm.req_cul,
    'Stage-growth fixture must differ from the normalized stage-1 compatibility value',
    { realm: progress.realm, stageOneRequiredCultivation: realm.req_cul }
);

console.log(JSON.stringify({
    audit: 'PASS',
    progress
}, null, 2));
