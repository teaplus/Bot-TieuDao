import { EmbedBuilder, MessageFlags } from 'discord.js';
import BaseCommand from '../../core/BaseCommand.js';
import TreasureHuntManager from '../../managers/TreasureHuntManager.js';

function formatTime(seconds) {
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) return `${minutes} phút`;
    return `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút`;
}

export default class TreasureHuntCommand extends BaseCommand {
    constructor() {
        super({ name: 'tambao', description: 'Thăm dò bí cảnh để tìm linh thạch và bảo vật' });
    }

    async execute(interaction) {
        await interaction.deferReply();
        try {
            const reward = await TreasureHuntManager.hunt(interaction.user.id);
            const embed = new EmbedBuilder()
                .setTitle('Tầm bảo trở về')
                .setColor('#D4A017')
                .setDescription('Đạo hữu vượt qua hiểm địa và tìm được một cơ duyên.');

            if (reward.type === 'SPIRIT_STONES') {
                embed.addFields({ name: 'Thu hoạch', value: `**${reward.amount} Linh thạch**` });
            } else {
                embed.addFields({
                    name: `Thu hoạch • ID ${reward.item.uuid}`,
                    value: reward.item.getDisplayString()
                });
            }
            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            if (error.message === 'PLAYER_NOT_FOUND') {
                return interaction.editReply({ content: 'Hãy dùng `/start` để tạo nhân vật trước.', flags: MessageFlags.Ephemeral });
            }
            if (error.message === 'COOLDOWN') {
                return interaction.editReply({
                    content: `Linh khí bí cảnh chưa khôi phục. Có thể tầm bảo lại sau **${formatTime(error.remainingSeconds)}**.`,
                    flags: MessageFlags.Ephemeral
                });
            }
            console.error('Lỗi tại lệnh /tambao:', error);
            return interaction.editReply('Bí cảnh biến động, chưa thể tầm bảo lúc này.');
        }
    }
}
