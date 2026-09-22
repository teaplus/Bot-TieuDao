import { MessageFlags } from 'discord.js';
import BaseCommand from '../../core/BaseCommand.js';
import SelectPrompt from '../../core/SelectPrompt.js';
import EquipmentManager from '../../managers/EquipmentManager.js';
import PlayerRepository from '../../repositories/PlayerRepository.js';

export default class UnequipCommand extends BaseCommand {
    constructor() {
        super({ name: 'thaotrangbi', description: 'Chọn trang bị đang mặc để tháo' });
    }

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const record = await PlayerRepository.findById(interaction.user.id);
            if (!record) return interaction.editReply('Hãy dùng `/start` để tạo nhân vật trước.');
            const equipped = record.inventory.filter((item) => item.type === 'EQUIPMENT' && item.isEquipped);
            if (!equipped.length) return interaction.editReply('Đạo hữu chưa mặc trang bị nào.');

            const slot = await SelectPrompt.choose(interaction, {
                customId: `unequip_item:${interaction.id}`,
                placeholder: 'Chọn trang bị muốn tháo',
                prompt: 'Chọn một trang bị đang mặc:',
                options: equipped.map((item) => ({
                    label: `${item.name} [${item.rarityInfo.name}]`,
                    value: item.equippedSlot,
                    description: `${item.equippedSlot} • ${item.getEffectsDisplay().replaceAll('\n', ', ')}`
                }))
            });
            if (!slot) return;
            const template = await EquipmentManager.unequip(interaction.user.id, slot);
            return interaction.editReply({ content: `Đã tháo **${template?.name || 'trang bị'}**.`, components: [] });
        } catch (error) {
            if (error.message === 'SLOT_EMPTY') {
                return interaction.editReply({ content: 'Ô này hiện không có trang bị.', components: [] });
            }
            console.error('Lỗi tại lệnh /thaotrangbi:', error);
            return interaction.editReply({ content: 'Không thể tháo trang bị lúc này.', components: [] });
        }
    }
}
