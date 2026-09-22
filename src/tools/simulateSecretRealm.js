import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import SecretRealmService from '../gameplay/secret-realm/SecretRealmService.js';
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
        name: 'Secret Realm Runner',
        realmId: Number(overrides.realmId || 1),
        cultivationArtId: 'CP_FIRE_HOANG',
        spiritualRoot: overrides.element || 'FIRE',
        spiritStones: 0,
        cultivation: 0,
        baseAtk: Number(overrides.baseAtk || 120),
        baseDef: Number(overrides.baseDef || 40),
        baseHp: Number(overrides.baseHp || 420),
        baseSpd: Number(overrides.baseSpd || 10),
        lastCultivate: new Date(),
        inventory: [
            {
                instanceId: 'sim-ticket-1',
                itemId: 'SECRET_REALM_TICKET',
                quantity: 1,
                rarity: 'COMMON',
                instanceData: {}
            },
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
                            value: 0.15
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
        ticket: result.ticket,
        waves: result.waveResults.map((wave) => ({
            waveNumber: wave.waveNumber,
            type: wave.type,
            outcome: wave.outcome,
            winnerTeam: wave.battleResult.winnerTeam,
            rounds: wave.battleResult.rounds,
            carriedHP: wave.carriedHP,
            monster: result.waves.find((entry) => entry.waveNumber === wave.waveNumber)?.monster?.name
        })),
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
const transactionClient = { id: 'secret-realm-transaction-client' };
const operationCache = new Map();
const activityRuns = new Map();
let ticketTransactionClient = null;
let progressTransactionClient = null;
const playerRuntimeRepository = {
    async findById(playerId) {
        return playerId === runtimePlayer.playerId ? runtimePlayer : null;
    },
    async consumeItemByTemplate(playerId, itemId, payload, options) {
        ticketTransactionClient = options.client;
        return {
            status: 'CONSUMED',
            playerId,
            itemId,
            inventoryId: payload.inventoryId,
            quantity: payload.quantity
        };
    },
    async applyRewards(playerId, rewards) {
        return rewards.map((reward, index) => ({
            ...reward,
            inventoryId: reward.type === 'CURRENCY' ? null : `sim-secret-reward-${index + 1}`,
            playerId
        }));
    },
    async recordSecretRealmResult(playerId, payload, options) {
        progressTransactionClient = options.client;
        return {
            status: 'RECORDED',
            playerId,
            ...payload
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
        if (client !== transactionClient) throw new Error('SECRET_REALM_RESERVE_TRANSACTION_MISMATCH');
        const runId = 'sim-secret-realm-run';
        activityRuns.set(runId, { ...payload, runId, status: 'IN_PROGRESS' });
        return { runId, status: 'IN_PROGRESS' };
    },
    async lockById(client, payload) {
        if (client !== transactionClient) throw new Error('SECRET_REALM_COMPLETE_TRANSACTION_MISMATCH');
        return activityRuns.get(String(payload.runId));
    },
    async complete(_client, payload) {
        const run = activityRuns.get(String(payload.runId));
        activityRuns.set(String(payload.runId), { ...run, status: 'COMPLETED', resultSnapshot: payload.resultSnapshot });
        return { id: payload.runId, status: 'COMPLETED' };
    }
};
const rewardApplyService = {
    async applyInTransaction(client, playerId, rewardPlan, options) {
        if (client !== transactionClient) throw new Error('SECRET_REALM_REWARD_TRANSACTION_MISMATCH');
        return {
            tableId: rewardPlan.tableId,
            tableName: rewardPlan.tableName,
            rewardPlan,
            rewards: await playerRuntimeRepository.applyRewards(playerId, rewardPlan.rewards),
            activityRunId: options.activityRunId,
            claimId: 'sim-secret-realm-claim'
        };
    }
};
const secretRealmService = new SecretRealmService({
    playerRuntimeRepository,
    gameDataManager,
    operationExecutor,
    activityRunRepository,
    rewardApplyService,
    seedProvider: {
        nextSeed: (() => {
            const seeds = [20260719, 20260720];
            return () => seeds.shift();
        })()
    },
    random
});

const result = await secretRealmService.enter(runtimePlayer.playerId, {
    battleId: `sim-secret-realm:${seed}`,
    element: args.element,
    realmCode: args.realmCode,
    waveCount: Number(args.waveCount || 3),
    maxRounds: Number(args.maxRounds || 15),
    operationId: `sim-secret-realm-operation:${seed}`
});

if (ticketTransactionClient !== transactionClient) throw new Error('TICKET_MUST_SHARE_RESERVE_TRANSACTION');
if (progressTransactionClient !== transactionClient) throw new Error('PROGRESS_MUST_SHARE_COMPLETION_TRANSACTION');

console.log(JSON.stringify(summarize(result), null, 2));
