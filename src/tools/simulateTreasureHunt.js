import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import TreasureHuntService from '../gameplay/player/TreasureHuntService.js';
import RuntimePlayerFactory from '../runtime/player/RuntimePlayerFactory.js';
import RewardTableService from '../gameplay/rewards/RewardTableService.js';

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
        name: 'Treasure Hunter',
        realmId: Number(overrides.realmId || 1),
        cultivationArtId: 'CP_FIRE_HOANG',
        spiritualRoot: 'FIRE',
        sectId: overrides.sectId || null,
        spiritStones: Number(overrides.spiritStones ?? 100),
        sectPoints: Number(overrides.sectPoints ?? 0),
        honor: Number(overrides.honor ?? 0),
        eventPoints: Number(overrides.eventPoints ?? 0),
        cultivation: 0,
        baseAtk: 50,
        baseDef: 20,
        baseHp: 200,
        baseSpd: 8,
        lastCultivate: new Date(),
        lastTreasureHunt: null,
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
    async recordTreasureHuntCompletion(playerId, payload) {
        return {
            status: 'RECORDED',
            playerId,
            completedAt: payload.completedAt,
            cooldownSeconds: payload.cooldownSeconds
        };
    },
    async applyRewards(playerId, rewards) {
        return rewards.map((reward, index) => ({
            ...reward,
            playerId,
            inventoryId: reward.type === 'ITEM' || reward.type === 'EQUIPMENT'
                ? `sim-treasure-${index + 1}`
                : null
        }));
    }
};
let rewardContext = null;
const rewardTableService = new RewardTableService({
    gameDataManager,
    random: () => 0.01
});
const treasureHuntService = new TreasureHuntService({
    playerRuntimeRepository,
    gameDataManager,
    random: () => 0.01,
    rewardRuntimeService: {
        async settle(_playerId, tableId, context) {
            rewardContext = { ...context };
            return {
                status: 'PLANNED',
                plan: rewardTableService.roll(tableId, context),
                applied: null
            };
        }
    }
});

const result = await treasureHuntService.hunt(runtimePlayer.playerId, {
    operationId: 'simulate-treasure-hunt'
});
if (rewardContext?.luck !== 0) {
    throw new Error(`TREASURE_HUNT_LUCK_SNAPSHOT_MISMATCH:${rewardContext?.luck}`);
}

console.log(JSON.stringify({
    treasureHunt: gameDataManager.getCollection('treasureHunt'),
    rewardContext,
    result
}, null, 2));
