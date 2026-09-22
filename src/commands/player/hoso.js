import { EmbedBuilder, MessageFlags } from 'discord.js';
import BaseCommand from '../../core/BaseCommand.js';
import EffectFormatter from '../../core/EffectFormatter.js';
import Player from '../../core/Player.js';
import PlayerRepository from '../../repositories/PlayerRepository.js';

export default class ProfileCommand extends BaseCommand {
    constructor() {
        super({ name: 'hoso', description: 'Xem hồ sơ, chỉ số và hiệu ứng nhân vật' });
    }

    async execute(interaction) {
        await interaction.deferReply();
        const record = await PlayerRepository.findById(interaction.user.id);
        if (!record) {
            return interaction.editReply({ content: 'Hãy dùng `/start` để tạo nhân vật trước.', flags: MessageFlags.Ephemeral });
        }

        const player = new Player(record.data);
        const equipped = player.equipments.filter((item) => item.isEquipped);
        const effects = player.effects
            .filter((effect) => effect.stat !== 'cultivation_speed' || effect.value !== 1)
            .map((effect) => `• ${EffectFormatter.format(effect)}`)
            .join('\n') || 'Không có hiệu ứng cộng thêm';
        const equipmentText = equipped.length
            ? equipped.map((item) => `• ${item.equippedSlot}: **${item.name}** [${item.rarityInfo.name}]`).join('\n')
            : 'Chưa trang bị pháp bảo';
        const skillText = record.skills.length
            ? record.skills.map((skill) => `• **${skill.name}** (${skill.type === 'PASSIVE' ? 'Bị động' : 'Chủ động'})`).join('\n')
            : 'Chưa lĩnh ngộ kỹ năng';

        const embed = new EmbedBuilder()
            .setTitle(`Hồ sơ tu tiên: ${player.name}`)
            .setColor('#C89B3C')
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                { name: 'Đạo cơ', value: `Cảnh giới: **${player.realmInfo.name}**\nLinh căn: **${player.spiritualRoot}**\nCông pháp: **${player.cultivationArt.name}** [${player.cultivationArt.rarityInfo.name}]` },
                { name: 'Tài sản', value: `Linh thạch: **${player.spiritStones.toLocaleString('vi-VN')}**`, inline: true },
                { name: 'Tu luyện', value: `Tu vi: **${player.cultivation.toLocaleString('vi-VN')}**\nTốc độ: **${player.cultivationSpeed}/giây**`, inline: true },
                { name: 'Chỉ số', value: `HP **${player.getFinalStat('hp')}** | ATK **${player.getFinalStat('atk')}** | DEF **${player.getFinalStat('def')}** | SPD **${player.getFinalStat('spd')}**` },
                { name: 'Trang bị', value: equipmentText },
                { name: 'Kỹ năng', value: skillText },
                { name: 'Tổng hiệu ứng', value: effects.slice(0, 1024) }
            );

        return interaction.editReply({ embeds: [embed] });
    }
}
