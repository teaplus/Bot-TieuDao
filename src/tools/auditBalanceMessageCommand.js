import assert from 'node:assert/strict';
import { Collection } from 'discord.js';
import PlayerAccountService from '../gameplay/economy/PlayerAccountService.js';
import MessageCommandHandler from '../managers/MessageCommandHandler.js';

const calls = [];
const service = new PlayerAccountService({
    unitOfWork: {
        async execute(work) {
            calls.push('transaction');
            return work({ transaction: true });
        }
    },
    repository: {
        async ensureGuest(_database, playerId) {
            calls.push(`account:${playerId}`);
            return { playerId, accountStatus: 'GUEST', created: true };
        }
    },
    walletRepository: {
        async getBalance(_database, playerId, currencyId) {
            calls.push(`wallet:${playerId}:${currencyId}`);
            return '1234567';
        }
    }
});

const result = await service.getSpiritStoneBalance('balance-player');
assert.deepEqual(result, {
    playerId: 'balance-player',
    accountStatus: 'GUEST',
    balance: '1234567'
});
assert.deepEqual(calls, [
    'transaction',
    'account:balance-player',
    'wallet:balance-player:SPIRIT_STONE'
]);

const replies = [];
const client = {
    messageCommands: new Collection(),
    messageCommandPrefix: '!',
    playerAccountService: service,
    logger: { error() {} }
};
const handler = new MessageCommandHandler(client, { prefix: '!' });
const loaded = await handler.loadCommands();
assert.equal(loaded.commands, 8);
assert(client.messageCommands.has('balance'));

await handler.handle({
    id: 'balance-message',
    content: '!balance',
    author: { id: 'balance-player', bot: false },
    async reply(payload) {
        replies.push(payload);
        return payload;
    }
});
assert.equal(replies.length, 1);
assert.equal(replies[0].content, '💎 Bạn đang có **1.234.567 Linh Thạch**.');
assert.deepEqual(replies[0].allowedMentions, { repliedUser: false });
assert.equal(replies[0].embeds, undefined);

console.log(JSON.stringify({
    status: 'PASS',
    command: '!balance',
    guestSupported: true,
    formattedBalance: '1.234.567',
    messageCommands: loaded.commands
}, null, 2));
