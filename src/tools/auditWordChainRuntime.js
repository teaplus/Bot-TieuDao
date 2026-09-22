import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Collection } from 'discord.js';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import WordChainNormalizer from '../gameplay/minigames/WordChainNormalizer.js';
import MessageCommandHandler from '../managers/MessageCommandHandler.js';
import WordChainMessageHandler from '../application/discord/WordChainMessageHandler.js';
import { normalizeDictionaryWord } from './importVietnameseWordDictionary.js';

const manager = bootstrapGameData();
const rules = manager.getCollection('wordChainRules');
assert.equal(rules.version, 1);
assert.equal(rules.sessionPolicy.timeoutSeconds, null);
assert.equal(rules.sessionPolicy.maxQualifiedFailures, 10);
assert.equal(rules.sessionPolicy.failureCounterPolicy, 'CUMULATIVE_NO_RESET_ON_SUCCESS');
assert.equal(rules.sessionPolicy.minimumDistinctParticipants, 3);
assert.equal(rules.rewardPolicy.periodLimit, 10);

const normalizer = new WordChainNormalizer({ rules });
assert.deepEqual(normalizer.parse('  Tiên   Giới  '), {
    normalizedWord: 'tiên giới', firstPart: 'tiên', secondPart: 'giới'
});
assert.equal(normalizer.parse('tiên'), null);
assert.equal(normalizer.parse('tiên giới hạn'), null);
assert.equal(normalizer.parse('tiên-giới'), null);
assert.equal(normalizer.parse('tiên, giới'), null);
assert.equal(normalizeDictionaryWord('  Tu   Tiên ', rules).normalizedWord, 'tu tiên');
assert.equal(normalizeDictionaryWord('tàu khu trục', rules), null);

const migration = fs.readFileSync(
    new URL('../database/migrations/039_word_chain_foundation.sql', import.meta.url),
    'utf8'
);
for (const fragment of [
    'CREATE TABLE IF NOT EXISTS words',
    'CREATE TABLE IF NOT EXISTS word_chain_sessions',
    'CREATE TABLE IF NOT EXISTS word_chain_moves',
    'word_chain_sessions_one_active_channel',
    "outcome IN ('VALID', 'QUALIFIED_FAILURE')",
    'word_chain_moves_used_valid_word'
]) assert(migration.includes(fragment), `Migration missing ${fragment}`);

const guildScopeMigration = fs.readFileSync(
    new URL('../database/migrations/041_word_chain_one_active_session_per_guild.sql', import.meta.url),
    'utf8'
);
for (const fragment of [
    'DROP INDEX IF EXISTS word_chain_sessions_one_active_channel',
    'word_chain_sessions_one_active_guild',
    'ON word_chain_sessions (guild_id)',
    "WHERE status = 'ACTIVE'"
]) assert(guildScopeMigration.includes(fragment), `Guild scope migration missing ${fragment}`);

const unknownWordMigration = fs.readFileSync(
    new URL('../database/migrations/045_word_chain_unknown_dictionary_failure.sql', import.meta.url),
    'utf8'
);
for (const fragment of [
    'ALTER COLUMN word_id DROP NOT NULL',
    "failure_reason = 'NOT_IN_DICTIONARY'",
    'word_id IS NULL'
]) assert(unknownWordMigration.includes(fragment), `Unknown-word migration missing ${fragment}`);

const fakeClient = {
    messageCommands: new Collection(),
    messageCommandPrefix: '!',
    logger: { error() {} }
};
const handler = new MessageCommandHandler(fakeClient, { prefix: '!' });
const loaded = await handler.loadCommands();
assert(fakeClient.messageCommands.has('noitu'));
assert(fakeClient.messageCommands.has('noichu'));
assert.equal(loaded.commands, 8);

const messageHandlerSource = fs.readFileSync(
    new URL('../application/discord/WordChainMessageHandler.js', import.meta.url),
    'utf8'
);
assert(messageHandlerSource.includes("message.react('✅')"));
assert(messageHandlerSource.includes("message.react('❌')"));
assert(messageHandlerSource.includes('content: createWordChainFailureText(result)'));
assert(messageHandlerSource.includes('content: createWordChainSettledText(result)'));
assert(messageHandlerSource.includes('content: createWordChainInvalidFormatText(result)'));
assert(messageHandlerSource.includes('activeChannelsByGuild'));
assert(messageHandlerSource.includes('async hydrate()'));
assert(messageHandlerSource.includes('if (!this.isActiveChannel(message.guildId, message.channelId))'));
assert(!messageHandlerSource.includes('WORD_CHAIN_VALID_MOVE\') {\n                await message.reply'));
const presentationSource = fs.readFileSync(
    new URL('../application/discord/WordChainPresentation.js', import.meta.url), 'utf8'
);
assert(!presentationSource.includes('Số dư'));
assert(!presentationSource.includes('result.balance'));
assert(presentationSource.includes('❌ Sai · Hãy nối cụm từ bắt đầu bằng'));
assert(presentationSource.includes('${result.requiredPart} …'));
assert(!presentationSource.includes('không có trong từ điển'));
assert(!presentationSource.includes('phải bắt đầu bằng'));

const runtimeHandler = new WordChainMessageHandler({
    wordChainService: {
        async listActiveSessions() {
            return [
                { guildId: 'guild-a', channelId: 'channel-a' },
                { guildId: 'guild-b', channelId: 'channel-b' }
            ];
        }
    }
});
assert.deepEqual(await runtimeHandler.hydrate(), { activeSessions: 2 });
assert.equal(runtimeHandler.isActiveChannel('guild-a', 'channel-a'), true);
assert.equal(runtimeHandler.isActiveChannel('guild-a', 'channel-b'), false);
runtimeHandler.activate('guild-a', 'channel-c');
assert.equal(runtimeHandler.isActiveChannel('guild-a', 'channel-c'), true);
runtimeHandler.deactivate('guild-a', 'channel-a');
assert.equal(runtimeHandler.isActiveChannel('guild-a', 'channel-c'), true);
runtimeHandler.deactivate('guild-a', 'channel-c');
assert.equal(runtimeHandler.isActiveChannel('guild-a', 'channel-c'), false);

const feedbackReplies = [];
const feedbackHandler = new WordChainMessageHandler({
    wordChainService: {
        async submit() {
            return {
                status: 'WORD_CHAIN_IGNORED_INVALID_INPUT',
                requiredPart: 'tiên'
            };
        }
    },
    logger: { error() {} }
});
feedbackHandler.activate('guild-feedback', 'channel-feedback');
const createFeedbackMessage = (content) => ({
    id: `message-${feedbackReplies.length}`,
    content,
    guildId: 'guild-feedback',
    channelId: 'channel-feedback',
    author: { id: 'player-feedback', bot: false },
    async reply(payload) { feedbackReplies.push(payload); return payload; }
});
assert.equal(await feedbackHandler.handle(createFeedbackMessage('hai-từ lỗi')), true);
assert.equal(
    feedbackReplies[0].content,
    '⚠️ Từ không phù hợp · Hãy nối bằng cụm 2 từ bắt đầu với **“tiên …”**'
);
assert.equal(await feedbackHandler.handle(createFeedbackMessage('trò chuyện bình thường nhiều từ')), false);
assert.equal(feedbackReplies.length, 1);

console.log(JSON.stringify({
    status: 'PASS',
    rulesRevision: rules.revision,
    dictionaryRevision: rules.dictionaryRevision,
    maxQualifiedFailures: rules.sessionPolicy.maxQualifiedFailures,
    dailyRewardLimit: rules.rewardPolicy.periodLimit,
    messageCommands: loaded.commands
}, null, 2));
