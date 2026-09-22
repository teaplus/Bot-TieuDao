import BaseCommand from '../../core/BaseCommand.js';
import { EmbedBuilder, MessageFlags } from 'discord.js';
import pool from '../../database/postgres.js';
import Player from '../../core/Player.js';
import PlayerRepository from '../../repositories/PlayerRepository.js';
import EffectFormatter from '../../core/EffectFormatter.js';

export default class TuViCommand extends BaseCommand {
    constructor() {
        super({
            name: 'tuvi',
            description: 'Trở về động phủ, kiểm tra tiến độ tu luyện và nhận Tu vi.'
        });
    }

    // Hàm tiện ích: Biến số giây thành dạng Text đẹp (VD: 1 giờ 5 phút 20 giây)
    formatTime(totalSeconds) {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        
        let result = [];
        if (h > 0) result.push(`${h} giờ`);
        if (m > 0) result.push(`${m} phút`);
        if (s > 0) result.push(`${s} giây`);
        
        return result.length > 0 ? result.join(' ') : '0 giây';
    }

    async execute(interaction, client) {
        await interaction.deferReply();
        const userId = interaction.user.id;

        try {
            const record = await PlayerRepository.findById(userId);
            
            if (!record) {
                return interaction.editReply({ 
                    content: 'Đạo hữu chưa bước chân vào tiên đồ. Hãy gõ `/start` để thức tỉnh linh căn trước!',
                    flags: MessageFlags.Ephemeral
                });
            }

            const player = new Player(record.data);
            const afkData = player.calculateOfflineCultivation();

            if (afkData.earned > 0) {
                const updateQuery = `
                    UPDATE players 
                    SET cultivation = $1, last_cultivate = CURRENT_TIMESTAMP 
                    WHERE id = $2
                `;
                await pool.query(updateQuery, [player.cultivation, userId]);
            }

            const embed = new EmbedBuilder()
                .setTitle(`⛩️ Động Phủ Của ${player.name}`)
                .setColor('#2ecc71')
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields(
                    { name: 'Cảnh Giới', value: `**${player.realmInfo.name}**`, inline: true },
                    { name: 'Linh Căn', value: player.spiritualRoot, inline: true },
                    { name: 'Công Pháp', value: player.cultivationArt.name, inline: true },
                    { 
                        name: 'Tiến Độ Tu Luyện', 
                        value: `${player.cultivation} / ${player.realmInfo.req_cul} Điểm (${player.getCultivationProgress()}%)`, 
                        inline: false 
                    },
                    { 
                        name: 'Tốc Độ Hấp Thụ', 
                        value: `${player.cultivationSpeed} Tu vi / Giây`, 
                        inline: false 
                    },
                    {
                        name: 'Hiệu Ứng Đang Có',
                        value: player.effects
                            .filter((effect) => effect.stat === 'cultivation_speed')
                            .map((effect) => EffectFormatter.format(effect))
                            .join('\n') || 'Không có',
                        inline: false
                    }
                );

            if (afkData.earned > 0) {
                embed.setDescription(`🧘 Bế quan tu luyện trong **${this.formatTime(afkData.seconds)}**...\nĐạo hữu hấp thụ được thiên địa linh khí, tăng thêm **+${afkData.earned} Tu vi**!`);
            } else {
                embed.setDescription('🧘 Đạo hữu vừa mới vận công xong, linh khí xung quanh chưa kịp tụ lại. Hãy kiên nhẫn bế quan thêm!');
            }

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Lỗi tại lệnh /tuvi:', error);
            return interaction.editReply({ 
                content: 'Tâm pháp nhiễu loạn, không thể vận công lúc này!',
                flags: MessageFlags.Ephemeral
            });
        }
    }
}
