import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import GatheringService from '../gameplay/gathering/GatheringService.js';
import GatheringCompletionService from '../gameplay/gathering/GatheringCompletionService.js';
import RuntimePlayerFactory from '../runtime/player/RuntimePlayerFactory.js';

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
        name: 'Gatherer',
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
        inventory: [],
        skillIds: ['SK_FIRE_HOANG'],
        cultivationArtIds: ['CP_FIRE_HOANG']
    });
}

const args = parseArgs(process.argv.slice(2));
const gatheringId = args.gathering || 'GATHER_THANH_VAN_SON_MACH_HERB';
const gameDataManager = bootstrapGameData();
setGameDataManager(gameDataManager);

const runtimePlayer = createRuntimePlayer(args);
const transactionClient = { id: 'simulated-transaction-client' };
let activeRun = null;
let rewardRollCount = 0;
let projectionClient = null;
const playerRuntimeRepository = {
    async findById(playerId) {
        return playerId === runtimePlayer.playerId ? runtimePlayer : null;
    },
    async countGatheringRunsToday() {
        return Number(args.todayRuns || 0);
    },
    async recordGatheringResult(playerId, payload, options) {
        projectionClient = options.client;
        return {
            status: 'RECORDED',
            runId: 'sim-gathering-run-1',
            playerId,
            ...payload
        };
    }
};
const rewardApplyService = {
    async applyInTransaction(client, playerId, rewardPlan, options) {
        if (client !== transactionClient) throw new Error('REWARD_TRANSACTION_CLIENT_MISMATCH');
        return {
            tableId: rewardPlan.tableId,
            tableName: rewardPlan.tableName,
            rewards: rewardPlan.rewards.map((reward, index) => ({
                ...reward,
                inventoryId: reward.type === 'ITEM' ? `sim-item-${index + 1}` : null
            })),
            playerId,
            activityRunId: options.activityRunId,
            claimId: 'sim-claim-1'
        };
    }
};
const activityRunRepository = {
    async reserve(client, payload) {
        if (client !== transactionClient) throw new Error('START_TRANSACTION_CLIENT_MISMATCH');
        activeRun = { ...payload, runId: 'sim-activity-run-1', status: 'IN_PROGRESS' };
        return { runId: activeRun.runId, status: activeRun.status };
    },
    async lockById(client, payload) {
        if (client !== transactionClient) throw new Error('CLAIM_TRANSACTION_CLIENT_MISMATCH');
        return {
            ...activeRun,
            runId: payload.runId,
            inputSnapshot: activeRun.inputSnapshot
        };
    },
    async findActive() {
        return activeRun;
    }
};
const operationExecutor = {
    async execute(_operation, work) {
        return work(transactionClient);
    }
};
const rewardTableService = {
    roll(tableId) {
        rewardRollCount += 1;
        return {
            tableId,
            tableName: tableId,
            rewards: [{ type: 'ITEM', itemId: 'HERB_TU_LINH_THAO', quantity: 1 }]
        };
    }
};
const playerMapService = {
    async resolveCurrentMap() {
        return {
            state: { currentMapId: 'THANH_VAN_SON_MACH' },
            map: gameDataManager.getRecord('maps', 'THANH_VAN_SON_MACH')
        };
    }
};
const completionService = new GatheringCompletionService({
    playerRuntimeRepository,
    gameDataManager,
    rewardApplyService,
    rewardTableService,
    activityRunRepository,
    playerMapService,
    operationExecutor,
    timeProvider: { now: () => new Date('2026-07-17T00:00:00.000Z') }
});
const gatheringService = new GatheringService({
    playerRuntimeRepository,
    gameDataManager,
    completionService,
    playerMapService,
    activityRunRepository,
    unitOfWork: { execute: (work) => work(transactionClient) }
});

const gatherings = await gatheringService.listGatherings(runtimePlayer.playerId);
const started = await gatheringService.start(runtimePlayer.playerId, gatheringId, {
    operationId: 'sim-gathering-start'
});
let earlyClaimError = null;
try {
    await gatheringService.claim(runtimePlayer.playerId, started.runId, {
        operationId: 'sim-gathering-claim-early'
    });
} catch (error) {
    earlyClaimError = error.message;
}
const result = await gatheringService.claim(runtimePlayer.playerId, started.runId, {
    operationId: 'sim-gathering-claim',
    claimedAt: new Date(started.readyAt)
});

if (earlyClaimError !== 'GATHERING_NOT_READY') throw new Error('EARLY_CLAIM_WAS_NOT_REJECTED');
if (rewardRollCount !== 1) throw new Error('REWARD_MUST_ROLL_EXACTLY_ON_SUCCESSFUL_CLAIM');
if (projectionClient !== transactionClient) throw new Error('PROGRESS_MUST_USE_CLAIM_TRANSACTION');

console.log(JSON.stringify({
    gatherings,
    started,
    earlyClaimError,
    rewardRollCount,
    result
}, null, 2));
