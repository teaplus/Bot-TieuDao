import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Collection } from 'discord.js';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import EconomyActivityService from '../gameplay/economy/EconomyActivityService.js';
import MessageCommandHandler from '../managers/MessageCommandHandler.js';
import { loadAppConfig } from '../platform/config/loadAppConfig.js';

const manager = bootstrapGameData();
const activities = manager.getCollection('earningActivities');
const miniGames = manager.getCollection('miniGameRules');
assert.equal(Object.keys(activities).length, 2);
assert.equal(activities.DAILY_SPIRIT_STONE.rewardMultiplierBasisPoints, 50000);
assert.equal(activities.WORK_SPIRIT_STONE.cooldownSeconds, 3600);
assert.equal(activities.WORK_SPIRIT_STONE.periodLimit, 8);
assert.equal(miniGames.betPolicy.maximumSource, 'WALLET_BALANCE');
assert.equal(miniGames.betPolicy.dailyRoundLimit, null);
assert.equal(miniGames.games.SLOT.status, 'ACTIVE');
assert.equal(miniGames.games.SLOT.hitRate.partsPerMillion, 148960);
assert.equal(miniGames.games.SLOT.rtp.partsPerMillion, 918383);
assert.equal(miniGames.games.HIGH_LOW.status, 'ACTIVE');
assert.equal(miniGames.games.HIGH_LOW.sessionPolicy.ttlSeconds, 120);
assert.equal(miniGames.games.HIGH_LOW.sessionPolicy.expirySettlement, 'LAZY_REFUND_WAGER');
assert.equal(miniGames.games.HIGH_LOW.paytable.correctPayoutMultiplierBasisPoints, 20000);
assert.equal(miniGames.games.HIGH_LOW.paytable.tieSettlement, 'LOSE_WAGER');
assert.equal(miniGames.games.HIGH_LOW.paytable.midpointNumber, 51);
const privateMidpointRtp = (100n * 1000000n) / 101n;
assert.equal(privateMidpointRtp, 990099n);
assert.equal(miniGames.games.HIGH_LOW.rtp.partsPerMillion, Number(privateMidpointRtp));

let balance = 1000n;
const claims = new Map();
const counts = new Map();
const runs = [];
const ledger = [];
const runtimePlayer = {
    playerId: 'economy-player',
    realmId: 1,
    currencies: { SPIRIT_STONE: balance.toString() }
};
const service = new EconomyActivityService({
    gameDataManager: manager,
    playerRuntimeRepository: {
        async findById() {
            runtimePlayer.currencies.SPIRIT_STONE = balance.toString();
            return runtimePlayer;
        }
    },
    playerMapService: {
        async resolveCurrentMap() {
            return { map: manager.getRecord('maps', 'THANH_VAN_SON_MACH') };
        }
    },
    unitOfWork: { async execute(work) { return work({ transaction: true }); } },
    operationExecutor: { async execute(_metadata, work) { return work({ transaction: true }); } },
    walletRepository: {
        async credit(_client, payload) {
            balance += BigInt(payload.amount);
            return balance.toString();
        }
    },
    rewardClaimRepository: {
        async findByBusinessKey(_client, payload) {
            return claims.get(`${payload.playerId}:${payload.claimType}:${payload.sourceRef}`) || null;
        },
        async create(_client, payload) {
            const key = `${payload.playerId}:${payload.claimType}:${payload.sourceRef}`;
            assert(!claims.has(key), 'Daily business key must be unique');
            const claim = { claimId: String(claims.size + 1), claimedAt: payload.claimedAt };
            claims.set(key, claim);
            return claim;
        }
    },
    periodCounterRepository: {
        async getValue(_client, payload) {
            return String(counts.get(`${payload.subjectId}:${payload.periodKey}`) || 0);
        },
        async incrementWithinLimit(_client, payload) {
            const key = `${payload.subjectId}:${payload.periodKey}`;
            const next = (counts.get(key) || 0) + 1;
            if (next > payload.limit) throw new Error(payload.errorCode);
            counts.set(key, next);
            return String(next);
        }
    },
    activityRepository: {
        async findLatestRun() { return runs.at(-1) || null; },
        async recordRun(_client, payload) {
            const run = { id: String(runs.length + 1), completedAt: payload.completedAt, ...payload };
            runs.push(run);
            return { runId: run.id, completedAt: run.completedAt };
        }
    },
    resourceLedgerRepository: {
        async record(_client, payload) { ledger.push(payload); return String(ledger.length); }
    },
    seedProvider: { nextSeed: () => 12345 },
    timeProvider: { now: () => new Date('2026-08-05T01:00:00.000Z') }
});

const daily = await service.claimDaily(runtimePlayer.playerId, {
    operationId: 'daily-op-1',
    completedAt: new Date('2026-08-05T01:00:00.000Z')
});
assert.equal(daily.rewardAmount, '500');
assert.equal(daily.balance, '1500');
await assert.rejects(
    () => service.claimDaily(runtimePlayer.playerId, {
        operationId: 'daily-op-2', completedAt: new Date('2026-08-05T02:00:00.000Z')
    }),
    /DAILY_ALREADY_CLAIMED/
);

const work = await service.work(runtimePlayer.playerId, {
    operationId: 'work-op-1',
    completedAt: new Date('2026-08-05T03:00:00.000Z'),
    rollSeed: 12345
});
assert(BigInt(work.rewardAmount) >= 80n && BigInt(work.rewardAmount) <= 120n);
assert.equal(work.remainingToday, 7);
assert.equal(ledger.length, 2);
await assert.rejects(
    () => service.work(runtimePlayer.playerId, {
        operationId: 'work-op-2', completedAt: new Date('2026-08-05T03:30:00.000Z')
    }),
    /WORK_COOLDOWN_ACTIVE/
);

const replies = [];
const fakeClient = {
    messageCommands: new Collection(),
    messageCommandPrefix: '!',
    playerAccountService: {
        async ensureGuest(playerId) { assert.equal(playerId, runtimePlayer.playerId); },
        async getSpiritStoneBalance(playerId) {
            assert.equal(playerId, runtimePlayer.playerId);
            return { playerId, accountStatus: 'GUEST', balance: '1234' };
        }
    },
    economyActivityService: {
        async claimDaily(_playerId, options) {
            assert.equal(options.operationId, 'MESSAGE:message-1:DAILY');
            return {
                mapName: 'Thanh Vân Sơn Mạch', periodKey: '2026-08-05',
                rewardAmount: '500', balance: '2000'
            };
        }
    },
    logger: { error() {} }
};
const handler = new MessageCommandHandler(fakeClient, { prefix: '!' });
const loaded = await handler.loadCommands();
assert.equal(loaded.commands, 8);
assert(fakeClient.messageCommands.has('balance'));
assert(fakeClient.messageCommands.has('blackjack'));
assert(fakeClient.messageCommands.has('bj'));
assert(fakeClient.messageCommands.has('xidach'));
assert(fakeClient.messageCommands.has('daily') && fakeClient.messageCommands.has('hangngay'));
const handled = await handler.handle({
    id: 'message-1',
    content: '!daily',
    author: { id: runtimePlayer.playerId, bot: false },
    async reply(payload) { replies.push(payload); return payload; }
});
assert.equal(handled, true);
assert.equal(replies.length, 1);
await handler.handle({
    id: 'message-2',
    content: '!balance',
    author: { id: runtimePlayer.playerId, bot: false },
    async reply(payload) { replies.push(payload); return payload; }
});
assert.equal(replies.length, 2);
assert.match(replies[1].content, /1\.234 Linh Thạch/u);
assert.equal(replies[1].embeds, undefined);
assert.equal(await handler.handle({ content: '!unknown', author: { bot: false } }), false);
assert.equal(await handler.handle({ content: '!daily', author: { bot: true } }), false);

const migration = fs.readFileSync(
    new URL('../database/migrations/037_economy_activities_minigame_foundation.sql', import.meta.url),
    'utf8'
);
assert(migration.includes('CREATE TABLE IF NOT EXISTS player_economy_activity_runs'));
assert(migration.includes('CREATE TABLE IF NOT EXISTS player_minigame_rounds'));
assert(migration.includes("WHERE status = 'ACTIVE'"));
assert.equal(loadAppConfig({ DISCORD_TOKEN: 'test' }).messageCommandPrefix, '!');
assert.equal(loadAppConfig({ DISCORD_TOKEN: 'test', MESSAGE_COMMAND_PREFIX: 't!' }).messageCommandPrefix, 't!');

console.log(JSON.stringify({
    status: 'PASS',
    activities: Object.keys(activities).length,
    dailyRewardAtMapOne: daily.rewardAmount,
    workRewardAtMapOne: work.rewardAmount,
    messageCommands: loaded.commands,
    aliases: loaded.aliases,
    ledgerEntries: ledger.length,
    miniGames: Object.keys(miniGames.games),
    miniGameStatus: 'SLOT_ACTIVE:HIGH_LOW_ACTIVE:BLACKJACK_ACTIVE'
}, null, 2));
