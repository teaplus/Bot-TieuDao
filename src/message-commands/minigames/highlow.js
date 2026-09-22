import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} from 'discord.js';
import ComponentSession from '../../application/discord/ComponentSession.js';
import BaseMessageCommand from '../../core/BaseMessageCommand.js';
import { formatIntegerAmount } from '../../shared/numeric/IntegerAmount.js';

function createButtons(roundId, disabled = false) {
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`highlow:${roundId}:HIGH`)
            .setLabel('Cao hơn 51')
            .setEmoji('⬆️')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(`highlow:${roundId}:LOW`)
            .setLabel('Thấp hơn 51')
            .setEmoji('⬇️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled)
    )];
}

function renderRound(result) {
    const restored = result.status === 'HIGH_LOW_ACTIVE_RESTORED';
    return new EmbedBuilder()
        .setColor('#7459A6')
        .setTitle('🃏 Cao Thấp')
        .setDescription([
            restored ? '*Đã khôi phục ván đang chờ.*' : 'Một thiên số từ **1–101** đang được ẩn.',
            'Chọn **Cao** hoặc **Thấp** so với **51**. Đúng 51 tính là thua.'
        ].join('\n'))
        .addFields(
            { name: 'Cược', value: `${formatIntegerAmount(result.wager)} 💎`, inline: true },
            { name: 'Thắng nhận', value: `${formatIntegerAmount(BigInt(result.wager) * 2n)} 💎`, inline: true }
        )
        .setFooter({ text: `Ván #${result.roundId} · Hết hạn sau 2 phút` });
}

function renderResult(result) {
    if (result.status === 'HIGH_LOW_EXPIRED_REFUNDED') {
        return new EmbedBuilder()
            .setColor('#7F8C8D')
            .setTitle('⌛ Ván đã hết hạn')
            .setDescription(`Đã hoàn **${formatIntegerAmount(result.wager)} 💎**.`)
            .setFooter({ text: `Ván #${result.roundId}` });
    }
    const won = result.status === 'HIGH_LOW_WIN';
    const choiceLabel = result.choice === 'HIGH' ? 'Cao' : 'Thấp';
    const outcomeLine = won
        ? `Chọn **${choiceLabel}** · Thắng **${formatIntegerAmount(result.payout)} 💎**`
        : result.isTie
            ? 'Đúng **51** · Bạn thua ván này.'
            : `Chọn **${choiceLabel}** · Chưa may mắn.`;
    return new EmbedBuilder()
        .setColor(won ? '#E6B84A' : '#596275')
        .setTitle(won ? '✨ Bạn thắng' : '🌙 Kết quả')
        .setDescription([`## Số mở: **${result.hiddenNumber}**`, outcomeLine].join('\n'))
        .addFields(
            { name: 'Cược', value: `${formatIntegerAmount(result.wager)} 💎`, inline: true },
            { name: 'Kết quả', value: `${BigInt(result.netDelta) > 0n ? '+' : ''}${formatIntegerAmount(result.netDelta)} 💎`, inline: true }
        )
        .setFooter({ text: `Ván #${result.roundId}` });
}

export default class HighLowMessageCommand extends BaseMessageCommand {
    constructor() {
        super({ name: 'highlow', aliases: ['caothap'], description: 'Tiên Bài Cao Thấp.' });
    }

    errorMessage(error) {
        if (String(error?.message).startsWith('INVALID_INTEGER_AMOUNT')) {
            return 'Số tiền cược phải là số nguyên, ví dụ `!highlow 1000`.';
        }
        return ({
            PLAYER_NOT_FOUND: 'Đạo hữu chưa có nhân vật. Hãy dùng `/start` trước.',
            MINIGAME_WAGER_REQUIRED: 'Hãy nhập số Linh Thạch muốn cược, ví dụ `!highlow 1000`.',
            MINIGAME_WAGER_MUST_BE_POSITIVE: 'Tiền cược phải lớn hơn 0.',
            MINIGAME_WAGER_BELOW_MINIMUM: `Cược tối thiểu tại **${error?.mapName || 'map hiện tại'}** là **${formatIntegerAmount(error?.minimumWager || 0)} Linh Thạch**.`,
            INSUFFICIENT_CURRENCY: 'Bạn không đủ Linh Thạch cho mức cược này.',
            MINIGAME_NUMERIC_LIMIT_EXCEEDED: 'Mức cược quá lớn, hãy giảm xuống.'
        })[error?.message] || 'Ván bài chưa thể tiếp tục. Hãy thử lại sau.';
    }

    async execute(message, client, args) {
        if (args.length !== 1) throw new Error('MINIGAME_WAGER_REQUIRED');
        if (!client.playerAccountService) throw new Error('PLAYER_ACCOUNT_SERVICE_REQUIRED');
        if (!client.miniGameService) throw new Error('MINIGAME_SERVICE_REQUIRED');
        await client.playerAccountService.ensureGuest(message.author.id);
        const round = await client.miniGameService.startHighLow(message.author.id, args[0], {
            operationId: `MESSAGE:${message.id}:HIGH_LOW_START`
        });
        const sentMessage = await message.reply({
            embeds: [renderRound(round)],
            components: createButtons(round.roundId),
            allowedMentions: { repliedUser: false }
        });
        const remainingMs = Math.max(
            1000,
            new Date(round.expiresAt).getTime() - Date.now() + 250
        );
        const session = ComponentSession.forMessage({
            interaction: { user: message.author },
            message: sentMessage,
            prefix: `highlow:${round.roundId}:`,
            timeoutMs: remainingMs
        });

        let component;
        try {
            component = await session.next();
        } catch {
            const expired = await client.miniGameService.expireHighLow(
                message.author.id,
                round.roundId,
                { operationId: `HIGH_LOW:EXPIRE:${round.roundId}` }
            );
            if (expired.status === 'HIGH_LOW_EXPIRED_REFUNDED') {
                await sentMessage.edit({ embeds: [renderResult(expired)], components: [] }).catch(() => null);
            } else if (expired.status === 'HIGH_LOW_ALREADY_CLOSED') {
                await sentMessage.edit({ components: createButtons(round.roundId, true) }).catch(() => null);
            }
            return sentMessage;
        }

        try {
            const choice = component.customId.split(':').at(-1);
            const result = await client.miniGameService.chooseHighLow(
                message.author.id,
                round.roundId,
                choice,
                { operationId: `COMPONENT:${component.id}:HIGH_LOW_CHOOSE` }
            );
            await component.update({ embeds: [renderResult(result)], components: [] });
        } catch (error) {
            client.logger?.error('High Low settlement failed', {
                playerId: message.author.id,
                roundId: round.roundId,
                error: error instanceof Error ? error.message : String(error)
            });
            await component.update({
                content: 'Ván đã được lưu. Dùng lại `!highlow <số tiền>` để tiếp tục.',
                components: createButtons(round.roundId, true)
            }).catch(() => null);
        }
        return sentMessage;
    }
}
