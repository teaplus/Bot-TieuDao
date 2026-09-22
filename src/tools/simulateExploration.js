import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import ExplorationService from '../gameplay/exploration/ExplorationService.js';
import RuntimePlayerFactory from '../runtime/player/RuntimePlayerFactory.js';
import createSeededRandom from '../platform/random/createSeededRandom.js';

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
        name: 'Explorer',
        realmId: Number(overrides.realmId || 1),
        cultivationArtId: 'CP_FIRE_HOANG',
        spiritualRoot: overrides.element || 'FIRE',
        spiritStones: 0,
        cultivation: 0,
        baseAtk: Number(overrides.baseAtk || 60),
        baseDef: Number(overrides.baseDef || 20),
        baseHp: Number(overrides.baseHp || 220),
        baseSpd: Number(overrides.baseSpd || 8),
        lastCultivate: new Date(),
        inventory: [
            {
                instanceId: 'sim-eq-1',
                itemId: 'EQ_FIRE_WEAPON',
                quantity: 1,
                rarity: 'UNCOMMON',
                equippedSlot: 'weapon',
                instanceData: {
                    affixes: [
                        {
                            stat: 'ATK',
                            mode: 'add_percent_base',
                            value: 0.1
                        }
                    ]
                }
            }
        ],
        skillIds: ['SK_FIRE_HOANG'],
        cultivationArtIds: ['CP_FIRE_HOANG']
    });
}

function summarize(result) {
    return {
        playerId: result.playerId,
        outcome: result.outcome,
        monster: {
            id: result.encounter.monster.id,
            name: result.encounter.monster.name,
            realmCode: result.encounter.monster.realmCode,
            element: result.encounter.monster.element,
            qualityId: result.encounter.monster.qualityId,
            qualityName: result.encounter.monster.qualityName,
            qualityBonusPercent: result.encounter.monster.qualityBonusPercent,
            rewardTableId: result.encounter.rewardTableId,
            mapId: result.encounter.mapId,
            spawnPoolId: result.encounter.spawnPoolId
        },
        battle: {
            battleId: result.battleResult.battleId,
            winnerTeam: result.battleResult.winnerTeam,
            rounds: result.battleResult.rounds,
            turns: result.battleResult.turns,
            entities: result.battleResult.entities,
            combatLogPreview: result.battleResult.combatLog.slice(0, 8)
        },
        reward: result.reward,
        progress: result.progress,
        pending: result.pending
    };
}

const args = parseArgs(process.argv.slice(2));
const seed = Number(args.seed || 1);
const random = createSeededRandom(seed);
const gameDataManager = bootstrapGameData();
setGameDataManager(gameDataManager);

const runtimePlayer = createRuntimePlayer(args);
const transactionClient = { id: 'exploration-transaction-client' };
const operationCache = new Map();
const activityRuns = new Map();
const playerRuntimeRepository = {
    async findById(playerId) {
        return playerId === runtimePlayer.playerId ? runtimePlayer : null;
    },
    async applyRewards(playerId, rewards) {
        return rewards.map((reward, index) => ({
            ...reward,
            inventoryId: reward.type === 'CURRENCY' ? null : `sim-reward-${index + 1}`,
            playerId
        }));
    },
    async recordExplorationResult(playerId, payload) {
        return {
            status: 'RECORDED',
            playerId,
            ...payload
        };
    }
};
const rewardApplyService = {
    async apply(playerId, rewardPlan) {
        return {
            tableId: rewardPlan.tableId,
            tableName: rewardPlan.tableName,
            rewardPlan,
            rewards: await playerRuntimeRepository.applyRewards(playerId, rewardPlan.rewards)
        };
    },
    async applyInTransaction(client, playerId, rewardPlan, options) {
        if (client !== transactionClient) throw new Error('EXPLORATION_REWARD_TRANSACTION_MISMATCH');
        return {
            tableId: rewardPlan.tableId,
            tableName: rewardPlan.tableName,
            rewardPlan,
            rewards: await playerRuntimeRepository.applyRewards(playerId, rewardPlan.rewards),
            activityRunId: options.activityRunId,
            claimId: 'sim-exploration-claim'
        };
    }
};
const operationExecutor = {
    async execute(operation, work) {
        if (operationCache.has(operation.operationId)) {
            return { ...operationCache.get(operation.operationId), idempotentReplay: true };
        }
        const result = await work(transactionClient);
        operationCache.set(operation.operationId, result);
        return result;
    }
};
const activityRunRepository = {
    async reserve(client, payload) {
        if (client !== transactionClient) throw new Error('EXPLORATION_RESERVE_TRANSACTION_MISMATCH');
        const runId = 'sim-exploration-run';
        activityRuns.set(runId, { ...payload, runId, status: 'IN_PROGRESS' });
        return { runId, status: 'IN_PROGRESS' };
    },
    async lockById(client, payload) {
        if (client !== transactionClient) throw new Error('EXPLORATION_COMPLETE_TRANSACTION_MISMATCH');
        return activityRuns.get(String(payload.runId));
    },
    async complete(_client, payload) {
        const run = activityRuns.get(String(payload.runId));
        activityRuns.set(String(payload.runId), { ...run, status: 'COMPLETED', resultSnapshot: payload.resultSnapshot });
        return { id: payload.runId, status: 'COMPLETED' };
    }
};
const simulatedMap = gameDataManager.requireRecord('maps', args.map || 'THANH_VAN_SON_MACH');
const explorationService = new ExplorationService({
    playerRuntimeRepository,
    gameDataManager,
    rewardApplyService,
    operationExecutor,
    activityRunRepository,
    playerMapService: {
        async resolveCurrentMap() {
            return { map: simulatedMap };
        }
    },
    seedProvider: {
        nextSeed: (() => {
            const seeds = [20260717, 20260718];
            return () => seeds.shift();
        })()
    },
    random
});

const result = await explorationService.explore(runtimePlayer.playerId, {
    battleId: `sim-explore:${seed}`,
    element: args.element,
    monsterId: args.monster,
    realmCode: args.realmCode,
    stage: Number(args.stage || 1),
    maxRounds: Number(args.maxRounds || 15),
    operationId: `sim-exploration-operation:${seed}`
});

console.log(JSON.stringify(summarize(result), null, 2));
