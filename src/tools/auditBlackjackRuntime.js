import assert from 'node:assert/strict';
import fs from 'node:fs';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import BlackjackMessageCommand from '../message-commands/minigames/blackjack.js';

const manager = bootstrapGameData();
const rules = manager.getCollection('miniGameRules');
const game = rules.games.BLACKJACK;
assert.equal(game.status, 'ACTIVE');
assert.equal(game.paytable.deckCount, 1);
assert.equal(game.paytable.dealerPolicy, 'STAND_ALL_17');
assert.equal(game.paytable.naturalPayoutMultiplierBasisPoints, 20000);
assert.equal(game.paytable.winPayoutMultiplierBasisPoints, 20000);
assert.equal(game.paytable.pushPayoutMultiplierBasisPoints, 10000);
assert.equal(game.paytable.splitPolicy, 'DISABLED');
assert.equal(game.rtp.model, 'PLAYER_STRATEGY_DEPENDENT');
assert.equal(game.sessionPolicy.ttlSeconds, 120);
assert.equal(game.sessionPolicy.expirySettlement, 'LAZY_AUTO_STAND');

const command = new BlackjackMessageCommand();
assert.equal(command.name, 'blackjack');
assert(command.aliases.includes('bj'));
assert(command.aliases.includes('xidach'));
let ensuredGuest = null;
let replyPayload = null;
const settledFixture = {
    status: 'BLACKJACK_SETTLED',
    roundId: '501',
    wager: '1000',
    payout: '2000',
    netDelta: '1000',
    balance: '11000',
    dealerHand: [
        { id: 'HEARTS:10', suit: 'HEARTS', rank: '10' },
        { id: 'CLUBS:8', suit: 'CLUBS', rank: '8' }
    ],
    playerHands: [{ cards: [
        { id: 'SPADES:A', suit: 'SPADES', rank: 'A' },
        { id: 'DIAMONDS:K', suit: 'DIAMONDS', rank: 'K' }
    ] }],
    playerScore: { total: 21, isSoft: true },
    dealerScore: { total: 18, isSoft: false },
    outcome: { result: 'PLAYER_BLACKJACK', payout: '2000', netDelta: '1000' }
};
await command.execute({
    id: 'message-501',
    author: { id: 'player-501' },
    async reply(payload) {
        replyPayload = payload;
        return { id: 'reply-501' };
    }
}, {
    playerAccountService: { async ensureGuest(playerId) { ensuredGuest = playerId; } },
    miniGameService: {
        async startBlackjack(playerId, wager, options) {
            assert.equal(playerId, 'player-501');
            assert.equal(wager, '1000');
            assert.equal(options.operationId, 'MESSAGE:message-501:BLACKJACK_START');
            return settledFixture;
        }
    }
}, ['1000']);
assert.equal(ensuredGuest, 'player-501');
assert.equal(replyPayload.embeds, undefined);
assert.equal(replyPayload.components.length, 0);
assert(replyPayload.content.includes('BLACKJACK · KẾT QUẢ'));
assert(replyPayload.content.includes('[ ♠️ A ]'));
assert(replyPayload.content.includes('2.000 💎'));
assert(!replyPayload.content.includes('Số dư'));
assert(!replyPayload.content.includes(settledFixture.balance));

const serviceSource = fs.readFileSync(
    new URL('../gameplay/minigames/MiniGameService.js', import.meta.url), 'utf8'
);
for (const fragment of [
    'async startBlackjack(',
    'async actBlackjack(',
    'async expireBlackjack(',
    'MINIGAME_BLACKJACK_DOUBLE_WAGER',
    'BLACKJACK_EXPIRED_AUTO_STAND'
]) assert(serviceSource.includes(fragment), `Blackjack service missing ${fragment}`);

console.log(JSON.stringify({
    status: 'PASS',
    revision: rules.revision,
    syntax: '!blackjack 1000',
    aliases: command.aliases,
    ui: 'PLAIN_TEXT_EDIT_MESSAGE',
    rtp: game.rtp.model
}, null, 2));
