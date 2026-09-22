import assert from 'node:assert/strict';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import MiniGameService from '../gameplay/minigames/MiniGameService.js';
import SlotEngine, { calculateSlotRtpPartsPerMillion } from '../gameplay/minigames/SlotEngine.js';
import SlotMessageCommand from '../message-commands/minigames/slot.js';

const manager = bootstrapGameData();
const rules = manager.getCollection('miniGameRules');
const slot = rules.games.SLOT;
assert.equal(slot.status, 'ACTIVE');
assert.equal(calculateSlotRtpPartsPerMillion(slot.paytable), 918383);
assert.equal(slot.hitRate.partsPerMillion, 148960);
assert.equal(slot.rtp.partsPerMillion, 918383);

const engine = new SlotEngine();
const deterministicA = engine.play({ paytable: slot.paytable, wager: '1000', seed: 12345 });
const deterministicB = engine.play({ paytable: slot.paytable, wager: '1000', seed: 12345 });
assert.deepEqual(deterministicA, deterministicB);
assert.equal(deterministicA.reels.length, 3);

let winningReplay = null;
for (let seed = 1; seed <= 10000 && !winningReplay; seed += 1) {
    const outcome = engine.play({ paytable: slot.paytable, wager: '1000', seed });
    if (outcome.isWin) winningReplay = { seed, outcome };
}
assert(winningReplay, 'At least one deterministic winning seed must exist');
assert(BigInt(winningReplay.outcome.payout) > 1000n);

let balance = 10000n;
const rounds = [];
const ledger = [];
const service = new MiniGameService({
    gameDataManager: manager,
    playerRuntimeRepository: {
        async findById() {
            return { playerId: 'slot-player', realmId: 1, currencies: { SPIRIT_STONE: balance.toString() } };
        }
    },
    playerMapService: {
        async resolveCurrentMap() {
            return { map: manager.getRecord('maps', 'THANH_VAN_SON_MACH') };
        }
    },
    operationExecutor: { async execute(_metadata, work) { return work({ transaction: true }); } },
    walletRepository: {
        async getBalance() { return balance.toString(); },
        async debit(_client, payload) {
            const amount = BigInt(payload.amount);
            if (balance < amount) throw new Error('INSUFFICIENT_CURRENCY');
            balance -= amount;
            return balance.toString();
        },
        async credit(_client, payload) {
            balance += BigInt(payload.amount);
            return balance.toString();
        }
    },
    roundRepository: {
        async recordSettledRound(_client, payload) {
            rounds.push(payload);
            return { roundId: String(rounds.length), settledAt: payload.settledAt };
        }
    },
    resourceLedgerRepository: {
        async record(_client, payload) { ledger.push(payload); return String(ledger.length); }
    },
    seedProvider: { nextSeed: () => winningReplay.seed },
    timeProvider: { now: () => new Date('2026-08-05T06:00:00.000Z') }
});

const balanceBefore = balance;
const result = await service.playSlot('slot-player', '1000', {
    operationId: 'MESSAGE:slot-message-1:SLOT'
});
assert.equal(result.status, 'SLOT_WIN');
assert.equal(result.wager, '1000');
assert.equal(balance, balanceBefore + BigInt(result.netDelta));
assert.equal(rounds.length, 1);
assert.equal(rounds[0].rulesRevision, manager.getCollection('miniGameRules').revision);
assert.equal(rounds[0].rngSnapshot.seed, winningReplay.seed);
assert.equal(ledger.length, 2);
assert.equal(ledger[0].delta, '-1000');
assert.equal(ledger[1].delta, result.payout);

await assert.rejects(
    () => service.playSlot('slot-player', '99', { operationId: 'below-minimum' }),
    /MINIGAME_WAGER_BELOW_MINIMUM/
);
await assert.rejects(
    () => service.playSlot('slot-player', '999999999', { operationId: 'above-wallet' }),
    /INSUFFICIENT_CURRENCY/
);

const command = new SlotMessageCommand();
const replies = [];
await command.execute({
    id: 'slot-command-message',
    author: { id: 'slot-player' },
    async reply(payload) { replies.push(payload); return payload; }
}, {
    playerAccountService: { async ensureGuest(playerId) { assert.equal(playerId, 'slot-player'); } },
    miniGameService: {
        async playSlot(playerId, wager, options) {
            assert.equal(playerId, 'slot-player');
            assert.equal(wager, '1000');
            assert.equal(options.operationId, 'MESSAGE:slot-command-message:SLOT');
            return result;
        }
    }
}, ['1000']);
assert.equal(replies.length, 1);
assert.equal(replies[0].embeds.length, 1);
const slotPresentation = JSON.stringify(replies[0]);
assert(!slotPresentation.includes('Số dư'));
assert(!slotPresentation.includes(String(result.balance)));
await assert.rejects(
    () => command.execute({ author: { id: 'slot-player' } }, { miniGameService: service }, []),
    /MINIGAME_WAGER_REQUIRED/
);

console.log(JSON.stringify({
    status: 'PASS',
    syntax: '!slot 1000',
    rtpPartsPerMillion: slot.rtp.partsPerMillion,
    winningReplaySeed: winningReplay.seed,
    roundRows: rounds.length,
    ledgerEntries: ledger.length,
    result: result.status
}, null, 2));
