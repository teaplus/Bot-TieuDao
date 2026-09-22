import { EmbedBuilder, MessageFlags } from 'discord.js';
import BaseCommand from '../../core/BaseCommand.js';
import pool from '../../database/postgres.js';
import ItemFactory from '../../managers/ItemFactory.js';
import ItemGenerator from '../../managers/ItemGenerator.js';

export default class StartCommand extends BaseCommand {
    constructor() {
        super({ name: 'start', description: 'Bước vào con đường tu tiên và thức tỉnh linh căn' });
    }

    rollSpiritualRoot() {
        const roll = Math.random() * 100;
        if (roll <= 1) return 'Thiên Linh Căn';
        if (roll <= 10) return `${['Băng', 'Lôi', 'Phong'][Math.floor(Math.random() * 3)]} Linh Căn`;
        if (roll <= 50) return `${['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'][Math.floor(Math.random() * 5)]} Linh Căn`;
        return 'Tạp Căn';
    }

    async execute(interaction) {
        await interaction.deferReply();
        const client = await pool.connect();
        const root = this.rollSpiritualRoot();

        try {
            await client.query('BEGIN');
            await client.query(
                `INSERT INTO players (id, name, spiritual_root, cultivation_art_id, spirit_stones)
                 VALUES ($1, $2, $3, 'cp_001', 100)`,
                [interaction.user.id, interaction.user.username, root]
            );

            const starterTemplate = ItemFactory.getTemplate('3001');
            const starterData = ItemGenerator.rollEquipment(starterTemplate, 'MORTAL');
            await client.query(
                `INSERT INTO player_items (player_id, item_id, rarity, instance_data, equipped_slot)
                 VALUES ($1, '3001', $2, $3::jsonb, 'weapon')`,
                [interaction.user.id, starterData.rarity, JSON.stringify({ affixes: starterData.affixes })]
            );
            await client.query(
                `INSERT INTO player_items (player_id, item_id, rarity, instance_data)
                 VALUES ($1, '4001', 'MORTAL', '{}'::jsonb)`,
                [interaction.user.id]
            );
            await client.query(
                `INSERT INTO player_cultivation_arts (player_id, art_id) VALUES ($1, 'cp_001')`,
                [interaction.user.id]
            );
            await client.query('COMMIT');

            const equipment = ItemFactory.createItem('3001', {
                rarity: starterData.rarity,
                affixes: starterData.affixes,
                equippedSlot: 'weapon'
            });
            const embed = new EmbedBuilder()
                .setTitle(`${interaction.user.username} đã bước vào tiên đồ`)
                .setColor('#C89B3C')
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields(
                    { name: 'Linh căn', value: `**${root}**`, inline: true },
                    { name: 'Tài sản khai môn', value: '**100 Linh thạch**', inline: true },
                    { name: 'Công pháp', value: '**Nạp Khí Quyết** [Phàm phẩm]' },
                    { name: 'Pháp khí ban đầu', value: equipment.getDisplayString() }
                );
            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await client.query('ROLLBACK');
            if (error.code === '23505') {
                return interaction.editReply({ content: 'Đạo hữu đã có nhân vật.', flags: MessageFlags.Ephemeral });
            }
            console.error('Lỗi khi tạo nhân vật:', error);
            return interaction.editReply({ content: 'Chưa thể tạo nhân vật lúc này.', flags: MessageFlags.Ephemeral });
        } finally {
            client.release();
        }
    }
}
