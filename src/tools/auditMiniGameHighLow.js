import assert from 'node:assert/strict';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import HighLowEngine from '../gameplay/minigames/HighLowEngine.js';
import MiniGameService from '../gameplay/minigames/MiniGameService.js';
import HighLowMessageCommand from '../message-commands/minigames/highlow.js';

const manager = bootstrapGameData();
const game = manager.getCollection('miniGameRules').games.HIGH_LOW;
assert.equal(game.status, 'ACTIVE');
assert.equal(game.paytable.midpointNumber, 51);
assert.equal(game.paytable.correctPayoutMultiplierBasisPoints, 20000);
assert.equal(game.rtp.partsPerMillion, 990099);

const engine = new HighLowEngine();
const seedByOutcome = {};
for (let seed = 1; seed <= 100000 && Object.keys(seedByOutcome).length < 3; seed += 1) {
    const number = engine.deal({ paytable: game.paytable, seed });
    if (number > 51 && seedByOutcome.HIGH == null) seedByOutcome.HIGH = seed;
    if (number < 51 && seedByOutcome.LOW == null) seedByOutcome.LOW = seed;
    if (number === 51 && seedByOutcome.TIE == null) seedByOutcome.TIE = seed;
}
assert.deepEqual(Object.keys(seedByOutcome).sort(), ['HIGH', 'LOW', 'TIE']);
const replayA = engine.settle({ paytable: game.paytable, wager: '1000', seed: seedByOutcome.HIGH, choice: 'HIGH' });
const replayB = engine.settle({ paytable: game.paytable, wager: '1000', seed: seedByOutcome.HIGH, choice: 'HIGH' });
assert.deepEqual(replayA, replayB);
assert.equal(replayA.payout, '2000');
assert.equal(replayA.netDelta, '1000');
const tie = engine.settle({ paytable: game.paytable, wager: '1000', seed: seedByOutcome.TIE, choice: 'HIGH' });
assert.equal(tie.outcome, 'TIE_LOSS');
assert.equal(tie.payout, '0');

const balances = new Map([['player-a', 10000n], ['player-b', 10000n], ['player-c', 10000n]]);
const rounds = new Map();
const ledger = [];
let roundSequence = 0;
const roundRepository = {
    async findActiveRound(_client, playerId, gameId) {
        return [...rounds.values()].find((round) => (
            round.playerId === playerId && round.gameId === gameId && round.status === 'ACTIVE'
        )) || null;
    },
    async findPlayerRound(_client, playerId, roundId) {
        const round = rounds.get(String(roundId));
        return round?.playerId === playerId ? round : null;
    },
    async recordActiveRound(_client, payload) {
        const round = {
            roundId: String(++roundSequence),
            playerId: payload.playerId,
            gameId: payload.gameId,
            rulesRevision: payload.rulesRevision,
            wager: payload.wager,
            payout: '0',
            netDelta: payload.netDelta,
            inputSnapshot: payload.inputSnapshot,
            rngSnapshot: payload.rngSnapshot,
            status: 'ACTIVE',
            startedAt: payload.startedAt,
            expiresAt: payload.expiresAt,
            settledAt: null
        };
        rounds.set(round.roundId, round);
        return round;
    },
    async settleRound(_client, payload) {
        const round = rounds.get(String(payload.roundId));
        assert.equal(round.status, 'ACTIVE');
        Object.assign(round, {
            payout: payload.payout,
            netDelta: payload.netDelta,
            outcomeSnapshot: payload.outcomeSnapshot,
            status: 'SETTLED',
            settledAt: payload.settledAt
        });
        return round;
    },
    async expireRound(_client, payload) {
        const round = rounds.get(String(payload.roundId));
        assert.equal(round.status, 'ACTIVE');
        Object.assign(round, {
            payout: round.wager,
            netDelta: '0',
            outcomeSnapshot: payload.outcomeSnapshot,
            status: 'EXPIRED',
            settledAt: payload.settledAt
        });
        return round;
    }
};
const service = new MiniGameService({
    gameDataManager: manager,
    playerRuntimeRepository: {
        async findById(playerId) {
            return balances.has(playerId)
                ? { playerId, realmId: 1, currencies: { SPIRIT_STONE: balances.get(playerId).toString() } }
                : null;
        }
    },
    playerMapService: {
        async resolveCurrentMap() {
            return { map: manager.getRecord('maps', 'THANH_VAN_SON_MACH') };
        }
    },
    operationExecutor: { async execute(_metadata, work) { return work({ transaction: true }); } },
    walletRepository: {
        async getBalance(_client, playerId) { return balances.get(playerId).toString(); },
        async debit(_client, payload) {
            const next = balances.get(payload.playerId) - BigInt(payload.amount);
            if (next < 0n) throw new Error('INSUFFICIENT_CURRENCY');
            balances.set(payload.playerId, next);
            return next.toString();
        },
        async credit(_client, payload) {
            const next = balances.get(payload.playerId) + BigInt(payload.amount);
            balances.set(payload.playerId, next);
            return next.toString();
        }
    },
    roundRepository,
    resourceLedgerRepository: {
        async record(_client, payload) { ledger.push(payload); return String(ledger.length); }
    }
});

const startTime = new Date('2026-08-05T10:00:00.000Z');
const playerA = await service.startHighLow('player-a', '1000', {
    operationId: 'high-low-start-a', seed: seedByOutcome.HIGH, startedAt: startTime
});
const playerB = await service.startHighLow('player-b', '2000', {
    operationId: 'high-low-start-b', seed: seedByOutcome.LOW, startedAt: startTime
});
assert.equal(balances.get('player-a'), 9000n);
assert.equal(balances.get('player-b'), 8000n);
assert.notEqual(playerA.roundId, playerB.roundId);

const restoredB = await service.startHighLow('player-b', '500', {
    operationId: 'high-low-restore-b', startedAt: new Date('2026-08-05T10:00:30.000Z')
});
assert.equal(restoredB.status, 'HIGH_LOW_ACTIVE_RESTORED');
assert.equal(restoredB.roundId, playerB.roundId);
assert.equal(restoredB.wager, '2000');
assert.equal(balances.get('player-b'), 8000n);

const settledA = await service.chooseHighLow('player-a', playerA.roundId, 'HIGH', {
    operationId: 'high-low-choose-a', settledAt: new Date('2026-08-05T10:00:20.000Z')
});
assert.equal(settledA.status, 'HIGH_LOW_WIN');
assert.equal(settledA.payout, '2000');
assert.equal(balances.get('player-a'), 11000n);
assert.equal(balances.get('player-b'), 8000n, 'Player A settlement changed Player B wallet');
await assert.rejects(
    () => service.chooseHighLow('player-b', playerA.roundId, 'HIGH', {
        operationId: 'foreign-round', settledAt: new Date('2026-08-05T10:00:30.000Z')
    }),
    /MINIGAME_ROUND_NOT_FOUND/
);

const expiredB = await service.expireHighLow('player-b', playerB.roundId, {
    operationId: 'high-low-expire-b', settledAt: new Date('2026-08-05T10:02:01.000Z')
});
assert.equal(expiredB.status, 'HIGH_LOW_EXPIRED_REFUNDED');
assert.equal(balances.get('player-b'), 10000n);
assert.equal(rounds.get(playerB.roundId).status, 'EXPIRED');

const playerC = await service.startHighLow('player-c', '1000', {
    operationId: 'high-low-start-c', seed: seedByOutcome.TIE, startedAt: startTime
});
const settledC = await service.chooseHighLow('player-c', playerC.roundId, 'LOW', {
    operationId: 'high-low-choose-c', settledAt: new Date('2026-08-05T10:00:10.000Z')
});
assert.equal(settledC.status, 'HIGH_LOW_LOSS');
assert.equal(settledC.isTie, true);
assert.equal(balances.get('player-c'), 9000n);

const command = new HighLowMessageCommand();
let commandUpdated = null;
const fakeRound = {
    status: 'HIGH_LOW_STARTED', roundId: '77', wager: '1000', balance: '9000',
    midpointNumber: 51, mapName: 'Thanh Vân Sơn Mạch',
    expiresAt: new Date(Date.now() + 120000)
};
const fakeResult = {
    status: 'HIGH_LOW_WIN', roundId: '77', wager: '1000', payout: '2000',
    netDelta: '1000', balance: '11000', choice: 'HIGH', hiddenNumber: 88,
    midpointNumber: 51, isTie: false
};
const component = {
    id: 'component-77',
    user: { id: 'player-a' },
    customId: 'highlow:77:HIGH',
    async update(payload) { commandUpdated = payload; return payload; }
};
const sentMessage = {
    async awaitMessageComponent(options) {
        assert.equal(options.filter(component), true);
        assert.equal(options.filter({ ...component, user: { id: 'foreign-player' } }), false);
        return component;
    },
    async edit() { throw new Error('Unexpected timeout edit'); }
};
await command.execute({
    id: 'message-77',
    author: { id: 'player-a' },
    async reply(payload) {
        assert.equal(payload.components.length, 1);
        assert(!JSON.stringify(payload).includes('99.0099'));
        assert(!JSON.stringify(payload).includes('Số dư'));
        assert(!JSON.stringify(payload).includes(fakeRound.balance));
        return sentMessage;
    }
}, {
    logger: { error() {} },
    playerAccountService: { async ensureGuest(playerId) { assert.equal(playerId, 'player-a'); } },
    miniGameService: {
        async startHighLow(playerId, wager, options) {
            assert.equal(playerId, 'player-a');
            assert.equal(wager, '1000');
            assert.equal(options.operationId, 'MESSAGE:message-77:HIGH_LOW_START');
            return fakeRound;
        },
        async chooseHighLow(playerId, roundId, choice, options) {
            assert.equal(playerId, 'player-a');
            assert.equal(roundId, '77');
            assert.equal(choice, 'HIGH');
            assert.equal(options.operationId, 'COMPONENT:component-77:HIGH_LOW_CHOOSE');
            return fakeResult;
        }
    }
}, ['1000']);
assert.equal(commandUpdated.components.length, 0);
assert(!JSON.stringify(commandUpdated).includes('Số dư'));
assert(!JSON.stringify(commandUpdated).includes(fakeResult.balance));

console.log(JSON.stringify({
    status: 'PASS',
    syntax: '!highlow 1000',
    rtpPartsPerMillion: game.rtp.partsPerMillion,
    seeds: seedByOutcome,
    privateRounds: rounds.size,
    ledgerEntries: ledger.length,
    isolation: 'PLAYER_SCOPED',
    lazyRefund: expiredB.status
}, null, 2));
