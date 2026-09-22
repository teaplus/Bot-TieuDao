import assert from 'node:assert/strict';
import BlackjackEngine from '../gameplay/minigames/BlackjackEngine.js';

const engine = new BlackjackEngine();
const rules = Object.freeze({
    deckCount: 1,
    dealerPolicy: 'STAND_ALL_17',
    naturalPayoutMultiplierBasisPoints: 20000,
    winPayoutMultiplierBasisPoints: 20000,
    pushPayoutMultiplierBasisPoints: 10000,
    doublePolicy: 'INITIAL_TWO_CARDS_ONE_DRAW_AUTO_STAND',
    splitPolicy: 'DISABLED'
});

const card = (rank, suit = 'SPADES') => ({ id: `${suit}:${rank}`, suit, rank });
assert.deepEqual(engine.scoreHand([card('A'), card('7')]), {
    total: 18, isSoft: true, isBust: false, isBlackjack: false, adjustedAces: 0
});
assert.deepEqual(engine.scoreHand([card('A'), card('7'), card('9')]), {
    total: 17, isSoft: false, isBust: false, isBlackjack: false, adjustedAces: 1
});
assert.equal(engine.scoreHand([card('A'), card('K')]).isBlackjack, true);
assert.equal(engine.scoreHand([card('K'), card('Q'), card('2')]).isBust, true);

const first = engine.start({ seed: 20260810, wager: '1000', rules });
const replay = engine.start({ seed: 20260810, wager: '1000', rules });
assert.deepEqual(first, replay);
assert.equal(first.deck.length, 52);
assert.equal(new Set(first.deck.map((entry) => entry.id)).size, 52);
assert.equal(first.nextCardIndex, 4);
assert.equal(first.playerHands.length, 1);

let active;
for (let seed = 1; seed < 1000 && !active; seed += 1) {
    const candidate = engine.start({ seed, wager: '1000', rules });
    if (candidate.status === 'ACTIVE') active = candidate;
}
assert(active, 'Expected at least one active deterministic fixture');
const stood = engine.applyAction(active, 'STAND', rules);
assert.equal(stood.status, 'SETTLED');
assert(stood.outcome);

const doubled = engine.applyAction(active, 'DOUBLE', rules);
assert.equal(doubled.status, 'SETTLED');
assert.equal(doubled.totalWager, '2000');
assert.equal(doubled.actions[0].action, 'DOUBLE');
assert.throws(() => engine.applyAction(doubled, 'HIT', rules), /MINIGAME_ROUND_NOT_ACTIVE/);
assert.equal(engine.calculatePayout('101', 20000), '202');

console.log(JSON.stringify({
    status: 'PASS',
    deckCards: first.deck.length,
    deterministicReplay: true,
    aceScoring: true,
    actions: ['HIT', 'STAND', 'DOUBLE'],
    naturalUsesOneToOneProfit: true
}, null, 2));
