import { PermissionFlagsBits } from 'discord.js';
import BaseMessageCommand from '../../core/BaseMessageCommand.js';
import {
    createWordChainCancelledEmbed,
    createWordChainSessionEmbed
} from '../../application/discord/WordChainPresentation.js';

export default class WordChainMessageCommand extends BaseMessageCommand {
    constructor() {
        super({ name: 'noitu', aliases: ['noichu'], description: 'Mở hoặc quản lý ván Nối Từ.' });
    }

    errorMessage(error) {
        return ({
            WORD_CHAIN_DICTIONARY_EMPTY: 'Từ điển Nối Từ chưa được nạp. Hãy báo quản trị viên.',
            WORD_CHAIN_SESSION_NOT_FOUND: 'Channel này chưa có ván Nối Từ đang diễn ra.',
            WORD_CHAIN_STOP_FORBIDDEN: 'Chỉ người mở ván hoặc người quản lý tin nhắn mới có thể dừng ván.'
        })[error?.message] || 'Đạo vận ngôn từ chưa thể vận hành, xin thử lại sau.';
    }

    async execute(message, client, args) {
        if (!message.guildId || !message.channelId) throw new Error('WORD_CHAIN_GUILD_CHANNEL_REQUIRED');
        if (!client.wordChainService) throw new Error('WORD_CHAIN_SERVICE_REQUIRED');
        const action = String(args[0] || 'start').toLowerCase();
        if (!['start', 'status', 'stop'].includes(action) || args.length > 1) {
            throw new Error('WORD_CHAIN_COMMAND_INVALID');
        }

        if (action === 'status') {
            const status = await client.wordChainService.getStatus(message.guildId, message.channelId);
            if (!status) throw new Error('WORD_CHAIN_SESSION_NOT_FOUND');
            client.wordChainMessageHandler?.activate(status.guildId, status.channelId);
            return message.reply({
                embeds: [createWordChainSessionEmbed(status, { invokedChannelId: message.channelId })],
                allowedMentions: { repliedUser: false }
            });
        }

        if (action === 'stop') {
            const canModerate = Boolean(
                message.member?.permissions?.has?.(PermissionFlagsBits.ManageMessages)
            );
            const result = await client.wordChainService.stop(
                message.guildId,
                message.channelId,
                message.author.id,
                {
                    operationId: `MESSAGE:${message.id}:WORD_CHAIN_STOP`,
                    canModerate
                }
            );
            client.wordChainMessageHandler?.deactivate(result.guildId, result.channelId);
            return message.reply({
                embeds: [createWordChainCancelledEmbed(result)],
                allowedMentions: { repliedUser: false }
            });
        }

        const result = await client.wordChainService.start(
            message.guildId,
            message.channelId,
            message.author.id,
            { operationId: `MESSAGE:${message.id}:WORD_CHAIN_START` }
        );
        client.wordChainMessageHandler?.activate(result.guildId, result.channelId);
        return message.reply({
            embeds: [createWordChainSessionEmbed(result, { invokedChannelId: message.channelId })],
            allowedMentions: { repliedUser: false }
        });
    }
}
