import { MessageFlags } from 'discord.js';
import BaseCommand from '../../core/BaseCommand.js';
import SelectPrompt from '../../core/SelectPrompt.js';

function getEquipmentType(item) {
    return String(item.equipmentType || item.slot || item.equippedSlot || '').toUpperCase();
}

function getTypeName(client, equipmentType) {
    return client.gameDataManager?.getRecord('equipmentTypes', equipmentType)?.name || equipmentType;
}

export default class UnequipCommand extends BaseCommand {
    constructor() {
        super({ name: 'thaotrangbi', description: 'Chọn trang bị đang mặc để tháo' });
    }

    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const equipped = await client.equipmentService.listEquippedItems(interaction.user.id);
            if (!equipped) return interaction.editReply('Hãy dùng `/start` để tạo nhân vật trước.');
            if (!equipped.equippedItems.length) return interaction.editReply('Đạo hữu chưa mặc trang bị nào.');

            const equipmentTypes = [...new Set(equipped.equippedItems.map(getEquipmentType))].filter(Boolean);
            const equipmentType = await SelectPrompt.choose(interaction, {
                customId: `unequip_type:${interaction.id}`,
                placeholder: 'Chọn loại trang bị',
                prompt: 'Chọn loại trang bị muốn tháo:',
                options: equipmentTypes.map((type) => {
                    const item = equipped.equippedItems.find((entry) => getEquipmentType(entry) === type);
                    return {
                        label: getTypeName(client, type),
                        value: type,
                        description: item ? item.name : type
                    };
                })
            });
            if (!equipmentType) return;

            const selectedItems = equipped.equippedItems.filter(
                (item) => getEquipmentType(item) === equipmentType
            );
            const selectedInventoryId = await SelectPrompt.choose(interaction, {
                customId: `unequip_item:${interaction.id}`,
                placeholder: 'Chọn trang bị muốn tháo',
                prompt: `Trang bị đang mặc thuộc loại **${getTypeName(client, equipmentType)}**:`,
                options: selectedItems.map((item) => ({
                    label: `${item.name} [${item.rarityInfo.name}]`,
                    value: item.uuid,
                    description: item.getEffectsDisplay().replaceAll('\n', ', ')
                }))
            });
            if (!selectedInventoryId) return;

            const result = await client.equipmentService.unequipItem(interaction.user.id, equipmentType);
            return interaction.editReply({ content: `Đã tháo **${result.name}**.`, components: [] });
        } catch (error) {
            if (error.message === 'SLOT_EMPTY') {
                return interaction.editReply({ content: 'Loại này hiện không có trang bị.', components: [] });
            }

            client.logger?.error('Thaotrangbi command failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            return interaction.editReply({ content: 'Không thể tháo trang bị lúc này.', components: [] });
        }
    }
}
