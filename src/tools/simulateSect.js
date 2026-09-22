import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import assert from 'node:assert/strict';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import SectService from '../gameplay/sect/SectService.js';
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
        name: 'Sect Disciple',
        realmId: Number(overrides.realmId || 1),
        cultivationArtId: 'CP_FIRE_HOANG',
        spiritualRoot: 'FIRE',
        sectId: overrides.sectId || null,
        sectRejoinAvailableAt: overrides.sectRejoinAvailableAt || null,
        sectPolicyRevision: overrides.sectPolicyRevision || null,
        spiritStones: Number(overrides.spiritStones ?? 100),
        sectPoints: Number(overrides.sectPoints ?? 300),
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
const sectId = args.sect || 'SECT_FIRE';
const ruleId = args.rule || 'ATTACK_HOANG';
const gameDataManager = bootstrapGameData();
setGameDataManager(gameDataManager);

let runtimePlayer = createRuntimePlayer(args);
const transactionClient = { id: 'sect-transaction-client' };
const observedClients = [];
const operationExecutor = {
    async execute(_operation, work) {
        return work(transactionClient);
    }
};
const playerRuntimeRepository = {
    async findById(playerId, options = {}) {
        observedClients.push({ operation: 'findById', client: options.client });
        return playerId === runtimePlayer.playerId ? runtimePlayer : null;
    },
    async joinSect(playerId, payload, options = {}) {
        observedClients.push({ operation: 'joinSect', client: options.client });
        runtimePlayer = createRuntimePlayer({
            ...args,
            sectId: payload.sectId
        });

        return {
            status: 'JOINED_SECT',
            playerId,
            sectId: payload.sectId
        };
    },
    async exchangeTemplate(playerId, payload, options = {}) {
        observedClients.push({ operation: 'exchangeTemplate', client: options.client });
        return {
            status: 'EXCHANGED',
            exchangeLogId: 'sim-sect-exchange-1',
            playerId,
            consumed: {
                currencies: payload.costs.filter((cost) => cost.currencyId),
                items: payload.costs.filter((cost) => cost.itemId)
            },
            rewards: payload.rewards,
            ...payload
        };
    },
    async leaveSect(playerId, payload, options = {}) {
        observedClients.push({ operation: 'leaveSect', client: options.client });
        runtimePlayer = createRuntimePlayer({
            ...args,
            sectId: null,
            sectRejoinAvailableAt: payload.rejoinAvailableAt,
            sectPolicyRevision: payload.policyRevision
        });
        return { status: 'LEFT_SECT', playerId, ...payload };
    }
};
const sectService = new SectService({
    playerRuntimeRepository,
    gameDataManager,
    operationExecutor,
    seedProvider: { nextSeed: () => 12345 }
});

await assert.rejects(
    () => sectService.joinSect(runtimePlayer.playerId, sectId),
    /SECT_JOIN_OPERATION_ID_REQUIRED/
);
await assert.rejects(
    () => sectService.exchangeReward(runtimePlayer.playerId, ruleId),
    /SECT_EXCHANGE_OPERATION_ID_REQUIRED/
);

const sects = await sectService.listSects(runtimePlayer.playerId);
const joined = await sectService.joinSect(runtimePlayer.playerId, sectId, {
    operationId: 'sim-sect-join'
});
const rules = await sectService.listExchangeRules(runtimePlayer.playerId);
const exchange = await sectService.exchangeReward(runtimePlayer.playerId, ruleId, {
    operationId: 'sim-sect-exchange',
    rollSeed: 12345
});
assert.equal(exchange.reward.rollSeed, 12345);
assert.equal(exchange.result.rewards[0].poolId, `${sectId}:${ruleId}`);
assert.equal(
    sectService.rollRewardItem(
        sectService.resolveExchangeRule('ATTACK_HOANG'),
        sectService.resolveSect('SECT_YINYANG'),
        98765
    ).item.id,
    sectService.rollRewardItem(
        sectService.resolveExchangeRule('ATTACK_HOANG'),
        sectService.resolveSect('SECT_YINYANG'),
        98765
    ).item.id,
    'Same Sect pool seed did not produce the same reward'
);
const leftAt = new Date('2026-07-17T00:00:00.000Z');
const left = await sectService.leaveSect(runtimePlayer.playerId, {
    operationId: 'sim-sect-leave', leftAt
});
assert.equal(left.rejoinAvailableAt.toISOString(), '2026-07-24T00:00:00.000Z');
await assert.rejects(
    () => sectService.joinSect(runtimePlayer.playerId, sectId, {
        operationId: 'sim-sect-rejoin-too-early',
        joinedAt: new Date('2026-07-23T23:59:59.000Z')
    }),
    /SECT_REJOIN_COOLDOWN/
);

for (const operation of ['joinSect', 'exchangeTemplate', 'leaveSect']) {
    const observation = observedClients.find((entry) => entry.operation === operation);
    assert.equal(observation?.client, transactionClient, `${operation} did not use the idempotent transaction client`);
}
assert.equal(
    observedClients.filter((entry) => entry.operation === 'findById' && entry.client === transactionClient).length,
    4,
    'Sect join/exchange/leave/rejoin decisions were not loaded inside the idempotent transaction'
);

console.log(JSON.stringify({
    sects,
    joined,
    rules,
    exchange,
    left
}, null, 2));
