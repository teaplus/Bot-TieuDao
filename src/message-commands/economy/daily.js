import { EmbedBuilder } from 'discord.js';
import BaseMessageCommand from '../../core/BaseMessageCommand.js';
import { formatIntegerAmount } from '../../shared/numeric/IntegerAmount.js';

export default class DailyMessageCommand extends BaseMessageCommand {
    constructor() {
        super({ name: 'daily', aliases: ['hangngay'], description: 'Nhận bổng lộc hằng ngày.' });
    }

    errorMessage(error) {
        return ({
            PLAYER_NOT_FOUND: 'Đạo hữu chưa có nhân vật. Hãy dùng `/start` trước.',
            DAILY_ALREADY_CLAIMED: 'Hôm nay đạo hữu đã nhận bổng lộc. Sau 00:00 giờ Việt Nam hãy quay lại.'
        })[error?.message] || 'Bổng lộc hôm nay chưa thể phát, xin đạo hữu thử lại sau.';
    }

    async execute(message, client) {
        if (!client.playerAccountService) throw new Error('PLAYER_ACCOUNT_SERVICE_REQUIRED');
        if (!client.economyActivityService) throw new Error('ECONOMY_ACTIVITY_SERVICE_REQUIRED');
        await client.playerAccountService.ensureGuest(message.author.id);
        const result = await client.economyActivityService.claimDaily(message.author.id, {
            operationId: `MESSAGE:${message.id}:DAILY`
        });
        const embed = new EmbedBuilder()
            .setColor('#E6B84A')
            .setTitle('🧧 Bổng Lộc Hằng Ngày')
            .setDescription([
                `Chấp sự tại **${result.mapName}** đã trao phần bổng lộc hôm nay.`,
                `💎 Nhận được: **${formatIntegerAmount(result.rewardAmount)} Linh Thạch**`,
                `💰 Số dư mới: **${formatIntegerAmount(result.balance)} Linh Thạch**`
            ].join('\n'))
            .setFooter({ text: `Kỳ nhận: ${result.periodKey} · Làm mới lúc 00:00 giờ Việt Nam` });
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
}
