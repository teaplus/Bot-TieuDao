import { EmbedBuilder } from 'discord.js';
import BaseMessageCommand from '../../core/BaseMessageCommand.js';
import { formatIntegerAmount } from '../../shared/numeric/IntegerAmount.js';

export default class WorkMessageCommand extends BaseMessageCommand {
    constructor() {
        super({ name: 'work', aliases: ['lamviec'], description: 'Làm việc kiếm Linh Thạch.' });
    }

    errorMessage(error) {
        if (error?.message === 'WORK_COOLDOWN_ACTIVE' && error.nextAvailableAt) {
            return `Khí lực chưa hồi phục. Có thể làm việc lại <t:${Math.floor(
                new Date(error.nextAvailableAt).getTime() / 1000
            )}:R>.`;
        }
        return ({
            PLAYER_NOT_FOUND: 'Đạo hữu chưa có nhân vật. Hãy dùng `/start` trước.',
            WORK_DAILY_LIMIT_REACHED: 'Hôm nay đạo hữu đã hoàn thành đủ tám việc. Hãy dưỡng sức đến ngày mai.'
        })[error?.message] || 'Công việc gặp biến cố, đạo hữu chưa thể nhận thù lao lúc này.';
    }

    async execute(message, client) {
        if (!client.playerAccountService) throw new Error('PLAYER_ACCOUNT_SERVICE_REQUIRED');
        if (!client.economyActivityService) throw new Error('ECONOMY_ACTIVITY_SERVICE_REQUIRED');
        await client.playerAccountService.ensureGuest(message.author.id);
        const result = await client.economyActivityService.work(message.author.id, {
            operationId: `MESSAGE:${message.id}:WORK`
        });
        const embed = new EmbedBuilder()
            .setColor('#4E9F6E')
            .setTitle('🧹 Việc Làm Tu Tiên')
            .setDescription([
                `Đạo hữu đã hoàn thành **${result.workName}** tại **${result.mapName}**.`,
                `💎 Thù lao: **${formatIntegerAmount(result.rewardAmount)} Linh Thạch**`,
                `💰 Số dư mới: **${formatIntegerAmount(result.balance)} Linh Thạch**`,
                `📜 Lượt còn lại hôm nay: **${result.remainingToday}/8**`,
                `⏳ Có thể làm tiếp <t:${Math.floor(result.nextAvailableAt.getTime() / 1000)}:R>.`
            ].join('\n'));
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
}
