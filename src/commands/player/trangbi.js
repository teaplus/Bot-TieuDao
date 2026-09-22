import { MessageFlags } from 'discord.js';
import BaseCommand from '../../core/BaseCommand.js';
import SelectPrompt from '../../core/SelectPrompt.js';
import EquipmentManager from '../../managers/EquipmentManager.js';
import PlayerRepository from '../../repositories/PlayerRepository.js';

export default class EquipCommand extends BaseCommand {
    constructor() {
        super({ name: 'trangbi', description: 'Mặc một trang bị trong túi đồ' });
    }

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const record = await PlayerRepository.findById(interaction.user.id);
            if (!record) return interaction.editReply('Hãy dùng `/start` để tạo nhân vật trước.');
            const equipments = record.inventory.filter((item) => item.type === 'EQUIPMENT' && !item.isEquipped);
            if (!equipments.length) return interaction.editReply('Không có trang bị nào đang để trống trong túi.');
            const inventoryId = await SelectPrompt.choose(interaction, {
                customId: `equip_item:${interaction.id}`,
                placeholder: 'Chọn trang bị muốn mặc',
                prompt: 'Chọn một trang bị trong túi:',
                options: equipments.map((item) => ({
                    label: `${item.name} [${item.rarityInfo.name}]`,
                    value: item.uuid,
                    description: `${item.slot} • ${item.getEffectsDisplay().replaceAll('\n', ', ')}`
                }))
            });
            if (!inventoryId) return;
            const result = await EquipmentManager.equip(
                interaction.user.id,
                inventoryId
            );
            return interaction.editReply({
                content: `Đã trang bị **${result.name}** vào ô **${result.slot}**. Hồ sơ và hiệu ứng đã được cập nhật.`,
                components: []
            });
        } catch (error) {
            if (error.message === 'ITEM_NOT_FOUND') return interaction.editReply({ content: 'Không tìm thấy vật phẩm này trong túi của đạo hữu.', components: [] });
            if (error.message === 'NOT_EQUIPMENT') return interaction.editReply({ content: 'Vật phẩm này không phải trang bị.', components: [] });
            console.error('Lỗi tại lệnh /trangbi:', error);
            return interaction.editReply({ content: 'Không thể trang bị vật phẩm lúc này.', components: [] });
        }
    }
}
