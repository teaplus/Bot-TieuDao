import BaseCommand from '../../core/BaseCommand.js';
import { EmbedBuilder, MessageFlags } from 'discord.js';
import pool from '../../database/postgres.js';
import Player from '../../core/Player.js';
import PlayerRepository from '../../repositories/PlayerRepository.js';

export default class DotPhaCommand extends BaseCommand {
    constructor() {
        super({
            name: 'dotpha',
            description: 'Trùng kích bình cảnh, đột phá cảnh giới cao hơn!'
        });
    }

    async execute(interaction, client) {
        await interaction.deferReply();
        const userId = interaction.user.id;

        try {
            // 1. Lấy dữ liệu người chơi từ DB
            const record = await PlayerRepository.findById(userId);
            if (!record) {
                return interaction.editReply({ 
                    content: 'Đạo hữu chưa bước chân vào tiên đồ. Gõ `/start` để bắt đầu!', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            const player = new Player(record.data);

            if (!player.realmInfo) {
                return interaction.editReply({
                    content: 'Cảnh giới hiện tại của đạo hữu không hợp lệ. Hãy liên hệ quản trị để kiểm tra dữ liệu nhân vật.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            // 2. Ép tính toán Tu vi AFK trước khi đột phá (Phòng hờ người chơi chưa gõ /tuvi mà gõ thẳng /dotpha)
            player.calculateOfflineCultivation();

            if (player.isAtMaxRealm()) {
                await pool.query(
                    'UPDATE players SET cultivation = $1, last_cultivate = CURRENT_TIMESTAMP WHERE id = $2',
                    [player.cultivation, userId]
                );

                return interaction.editReply('Đạo hữu đã đứng trên đỉnh của hệ thống cảnh giới hiện tại, chưa thể đột phá thêm nữa.');
            }

            // 3. Kiểm tra điều kiện Tu vi
            if (player.cultivation < player.realmInfo.req_cul) {
                // Dù không đủ để đột phá, ta vẫn lưu lại số Tu vi AFK họ vừa nhận được (nếu có)
                await pool.query(
                    'UPDATE players SET cultivation = $1, last_cultivate = CURRENT_TIMESTAMP WHERE id = $2', 
                    [player.cultivation, userId]
                );
                
                const thieu = player.realmInfo.req_cul - player.cultivation;
                return interaction.editReply(`Đạo hữu chưa đủ hỏa hầu! Cần tu luyện thêm **${thieu} Tu vi** nữa mới có thể trùng kích bình cảnh.`);
            }

            // 4. Tiến hành đổ xúc xắc (RNG) để xem Đột phá thành công không
            const successRate = player.realmInfo.success_rate;
            const roll = Math.random() * 100; // Quay từ 0 đến 100

            if (roll <= successRate) {
              // ==================== ĐỘT PHÁ THÀNH CÔNG ====================
                const newRealmId = player.realmId + 1;
                const nextRealmInfo = player.getNextRealmInfo();
                const remainingCul = player.cultivation - player.realmInfo.req_cul; // Tiêu hao Tu vi

                if (!nextRealmInfo) {
                    await pool.query(
                        'UPDATE players SET cultivation = $1, last_cultivate = CURRENT_TIMESTAMP WHERE id = $2',
                        [player.cultivation, userId]
                    );

                    return interaction.editReply('Thiên đạo hiện chưa mở ra cảnh giới tiếp theo. Đạo hữu hãy chờ bản cập nhật sau.');
                }
                
                // 1. Tính toán TẤT CẢ chỉ số mới (Nhân với hệ số stat_multiplier)
                const multiplier = player.realmInfo.stat_multiplier;
                const newAtk = Math.floor(player.baseAtk * multiplier);
                const newHp = Math.floor(player.baseHp * multiplier);
                const newDef = Math.floor(player.baseDef * multiplier);
                const newSpd = Math.floor(player.baseSpd * multiplier);

                // 2. CẬP NHẬT DATABASE (Thêm base_def và base_spd)
                const updateQuery = `
                    UPDATE players 
                    SET realm_id = $1, 
                        cultivation = $2, 
                        base_atk = $3, 
                        base_hp = $4,
                        base_def = $5,
                        base_spd = $6,
                        last_cultivate = CURRENT_TIMESTAMP
                    WHERE id = $7
                `;
                // Đừng quên truyền đủ 7 biến vào mảng này nhé
                await pool.query(updateQuery, [newRealmId, remainingCul, newAtk, newHp, newDef, newSpd, userId]);

                // 3. Hiển thị thông báo với đủ 4 chỉ số
                const embed = new EmbedBuilder()
                    .setTitle('⚡ ĐỘT PHÁ THÀNH CÔNG ⚡')
                    .setColor('#f1c40f') 
                    .setDescription(`Thiên địa biến sắc, chúc mừng **${player.name}** đã phá vỡ bình cảnh!`)
                    .addFields(
                        { name: 'Cảnh Giới Mới', value: `**${nextRealmInfo.name}**`, inline: true },
                        { name: 'Tu Vi Còn Lại', value: `${remainingCul} Điểm`, inline: true },
                        { 
                            name: 'Thể Chất Thăng Tiến', 
                            value: `❤️ HP: ${player.baseHp} ➔ **${newHp}**\n⚔️ ATK: ${player.baseAtk} ➔ **${newAtk}**\n🛡️ DEF: ${player.baseDef} ➔ **${newDef}**\n💨 SPD: ${player.baseSpd} ➔ **${newSpd}**`, 
                            inline: false 
                        }
                    )
                    .setThumbnail(interaction.user.displayAvatarURL());

                return interaction.editReply({ embeds: [embed] });

            } else {
                // ==================== ĐỘT PHÁ THẤT BẠI ====================
                // Hình phạt: Mất số Tu vi yêu cầu đột phá nhưng không được lên cấp
                const penaltyCul = player.cultivation - player.realmInfo.req_cul;
                
                await pool.query(
                    'UPDATE players SET cultivation = $1, last_cultivate = CURRENT_TIMESTAMP WHERE id = $2', 
                    [penaltyCul, userId]
                );

                return interaction.editReply('💥 **ĐỘT PHÁ THẤT BẠI!**\nĐạo hữu không thể khống chế được linh khí, dẫn đến tẩu hỏa nhập ma. Ngươi đã tiêu hao hết số Tu vi tích lũy mà không thu được thành quả gì. Hãy tu luyện lại!');
            }

        } catch (error) {
            console.error('Lỗi tại lệnh /dotpha:', error);
            return interaction.editReply({ content: 'Lôi kiếp quá mạnh, không thể đột phá lúc này!', flags: MessageFlags.Ephemeral });
        }
    }
}
