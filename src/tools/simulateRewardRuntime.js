import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import RewardRuntimeService from '../gameplay/rewards/RewardRuntimeService.js';

function parseArgs(argv) {
    const args = {};

    for (const arg of argv) {
        const [key, value] = arg.replace(/^--/, '').split('=');
        args[key] = value ?? true;
    }

    return args;
}

const args = parseArgs(process.argv.slice(2));
const tableId = args.table || 'GATHER_THANH_VAN_SON_MACH_HERB';
const gameDataManager = bootstrapGameData();
setGameDataManager(gameDataManager);

const rewardApplyService = {
    async apply(playerId, rewardPlan) {
        return {
            tableId: rewardPlan.tableId,
            tableName: rewardPlan.tableName,
            rewards: rewardPlan.rewards.map((reward, index) => ({
                ...reward,
                inventoryId: reward.type === 'ITEM' ? `sim-reward-${index + 1}` : null
            })),
            playerId
        };
    }
};
const rewardRuntimeService = new RewardRuntimeService({
    gameDataManager,
    rewardApplyService,
    random: () => 0.01
});

const planned = rewardRuntimeService.plan(tableId, {
    realmId: Number(args.realmId || 1),
    spiritualRoot: args.spiritualRoot || 'FIRE'
});
const settled = await rewardRuntimeService.settle('sim-player', tableId, {
    realmId: Number(args.realmId || 1),
    spiritualRoot: args.spiritualRoot || 'FIRE'
}, {
    applyRewards: args.applyRewards !== 'false'
});

console.log(JSON.stringify({
    planned,
    settled
}, null, 2));
