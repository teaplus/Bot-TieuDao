import {
    createWordChainFailureText,
    createWordChainInvalidFormatText,
    createWordChainSettledText
} from './WordChainPresentation.js';

function looksLikeTwoPartAttempt(content) {
    return String(content || '').trim().split(/\s+/u).length === 2;
}

export default class WordChainMessageHandler {
    constructor(client) {
        this.client = client;
        this.activeChannelsByGuild = new Map();
    }

    async hydrate() {
        this.activeChannelsByGuild.clear();
        if (!this.client.wordChainService) return { activeSessions: 0 };
        const sessions = await this.client.wordChainService.listActiveSessions();
        for (const session of sessions) this.activate(session.guildId, session.channelId);
        return { activeSessions: this.activeChannelsByGuild.size };
    }

    activate(guildId, channelId) {
        if (guildId && channelId) this.activeChannelsByGuild.set(String(guildId), String(channelId));
    }

    deactivate(guildId, channelId = null) {
        const activeChannelId = this.activeChannelsByGuild.get(String(guildId));
        if (channelId == null || activeChannelId === String(channelId)) {
            this.activeChannelsByGuild.delete(String(guildId));
        }
    }

    isActiveChannel(guildId, channelId) {
        return this.activeChannelsByGuild.get(String(guildId)) === String(channelId);
    }

    async handle(message) {
        if (!message?.guildId || !message.channelId || message.author?.bot || !message.content) {
            return false;
        }
        if (!this.client.wordChainService) return false;
        if (!this.isActiveChannel(message.guildId, message.channelId)) return false;
        try {
            const result = await this.client.wordChainService.submit(
                message.guildId,
                message.channelId,
                message.author.id,
                message.content,
                { operationId: `MESSAGE:${message.id}:WORD_CHAIN_ATTEMPT` }
            );
            if (result.status === 'WORD_CHAIN_IGNORED_NO_SESSION') {
                this.deactivate(message.guildId, message.channelId);
                return false;
            }
            if (result.status === 'WORD_CHAIN_IGNORED_INVALID_INPUT'
                && looksLikeTwoPartAttempt(message.content)) {
                await message.reply({
                    content: createWordChainInvalidFormatText(result),
                    allowedMentions: { repliedUser: false }
                });
                return true;
            }
            if (result.status.startsWith('WORD_CHAIN_IGNORED_')) return false;
            if (result.status === 'WORD_CHAIN_WAIT_OTHER_PLAYER') {
                await message.react('⏳');
                return true;
            }
            if (result.status === 'WORD_CHAIN_VALID_MOVE') {
                await message.react('✅');
                return true;
            }
            if (result.status === 'WORD_CHAIN_QUALIFIED_FAILURE') {
                await message.react('❌');
                await message.reply({
                    content: createWordChainFailureText(result),
                    allowedMentions: { repliedUser: false }
                });
                return true;
            }
            if (result.status === 'WORD_CHAIN_SETTLED') {
                this.deactivate(message.guildId, message.channelId);
                await message.react('❌');
                await message.reply({
                    content: createWordChainSettledText(result),
                    allowedMentions: { repliedUser: false, users: [] }
                });
                return true;
            }
            return false;
        } catch (error) {
            this.client.logger?.error('Word Chain message failed', {
                playerId: message.author?.id,
                guildId: message.guildId,
                channelId: message.channelId,
                error: error instanceof Error ? error.message : String(error)
            });
            await message.reply({
                content: 'Thiên cơ ngôn tự chợt nhiễu loạn, câu nối chưa được ghi nhận.',
                allowedMentions: { repliedUser: false }
            });
            return true;
        }
    }
}
