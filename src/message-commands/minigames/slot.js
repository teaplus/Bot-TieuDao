import { EmbedBuilder } from 'discord.js';
import BaseMessageCommand from '../../core/BaseMessageCommand.js';
import { formatIntegerAmount } from '../../shared/numeric/IntegerAmount.js';

function signedAmount(value) {
    return BigInt(value) > 0n ? `+${formatIntegerAmount(value)}` : formatIntegerAmount(value);
}

export default class SlotMessageCommand extends BaseMessageCommand {
    constructor() {
        super({ name: 'slot', aliases: ['xeng'], description: 'Linh Thạch Luân Bàn.' });
    }

    errorMessage(error) {
        if (String(error?.message).startsWith('INVALID_INTEGER_AMOUNT')) {
            return 'Số tiền cược phải là số nguyên, ví dụ `!slot 1000`.';
        }
        return ({
            PLAYER_NOT_FOUND: 'Đạo hữu chưa có nhân vật. Hãy dùng `/start` trước.',
            MINIGAME_WAGER_REQUIRED: 'Hãy nhập số Linh Thạch muốn cược, ví dụ `!slot 1000`.',
            MINIGAME_WAGER_MUST_BE_POSITIVE: 'Tiền cược phải lớn hơn 0, ví dụ `!slot 1000`.',
            MINIGAME_WAGER_BELOW_MINIMUM: `Cược tối thiểu tại **${error?.mapName || 'map hiện tại'}** là **${formatIntegerAmount(error?.minimumWager || 0)} Linh Thạch**.`,
            INSUFFICIENT_CURRENCY: 'Bạn không đủ Linh Thạch cho mức cược này.',
            MINIGAME_NUMERIC_LIMIT_EXCEEDED: 'Mức cược quá lớn, hãy giảm xuống.'
        })[error?.message] || 'Luân bàn chưa thể vận hành. Hãy thử lại sau.';
    }

    async execute(message, client, args) {
        if (args.length !== 1) throw new Error('MINIGAME_WAGER_REQUIRED');
        if (!client.playerAccountService) throw new Error('PLAYER_ACCOUNT_SERVICE_REQUIRED');
        if (!client.miniGameService) throw new Error('MINIGAME_SERVICE_REQUIRED');
        await client.playerAccountService.ensureGuest(message.author.id);
        const result = await client.miniGameService.playSlot(message.author.id, args[0], {
            operationId: `MESSAGE:${message.id}:SLOT`
        });
        const reels = result.reels.map((symbol) => symbol.icon).join('  │  ');
        const resultText = result.status === 'SLOT_WIN'
            ? `✨ Thắng **${formatIntegerAmount(result.payout)} 💎**`
            : 'Chưa gặp cơ duyên lần này.';
        const embed = new EmbedBuilder()
            .setColor(result.status === 'SLOT_WIN' ? '#E6B84A' : '#596275')
            .setTitle('🎰 Linh Thạch Luân Bàn')
            .setDescription(`## ${reels}\n${resultText}`)
            .addFields(
                { name: 'Cược', value: `${formatIntegerAmount(result.wager)} 💎`, inline: true },
                { name: 'Kết quả', value: `${signedAmount(result.netDelta)} 💎`, inline: true }
            )
            .setFooter({ text: `${result.mapName} · Ván #${result.roundId}` });
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
}
