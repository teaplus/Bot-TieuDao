import { EmbedBuilder, MessageFlags } from 'discord.js';
import BaseCommand from '../../core/BaseCommand.js';
import PlayerRepository from '../../repositories/PlayerRepository.js';

export default class InventoryCommand extends BaseCommand {
    constructor() {
        super({ name: 'tuido', description: 'Kiểm tra túi đồ và pháp bảo của bạn' });
    }

    async execute(interaction) {
        await interaction.deferReply();
        const record = await PlayerRepository.findById(interaction.user.id);
        if (!record) {
            return interaction.editReply({ content: 'Hãy dùng `/start` để tạo nhân vật trước.', flags: MessageFlags.Ephemeral });
        }

        const items = record.inventory.filter((item) => item.type !== 'CURRENCY');
        const embed = new EmbedBuilder()
            .setTitle(`Túi trữ vật của ${interaction.user.username}`)
            .setColor('#B88A44')
            .setDescription(`Linh thạch: **${Number(record.data.spirit_stones).toLocaleString('vi-VN')}**`);

        if (!items.length) {
            embed.addFields({ name: 'Vật phẩm', value: 'Túi trữ vật đang trống.' });
        } else {
            for (const item of items.slice(0, 10)) {
                const quantity = item.quantity > 1 ? ` x${item.quantity}` : '';
                const inventoryId = item.uuid ? ` • ID: ${item.uuid}` : '';
                embed.addFields({ name: `${item.name}${quantity}${inventoryId}`, value: item.getDisplayString() });
            }
        }

        return interaction.editReply({ embeds: [embed] });
    }
}
