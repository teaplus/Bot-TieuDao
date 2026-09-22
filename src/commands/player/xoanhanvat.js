import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder
} from 'discord.js';
import ComponentSession from '../../application/discord/ComponentSession.js';
import BaseCommand from '../../core/BaseCommand.js';
import { formatIntegerAmount } from '../../shared/numeric/IntegerAmount.js';

function buttons(sessionId) {
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`xoanhanvat:${sessionId}:confirm`)
            .setLabel('Xóa và tạo lại')
            .setEmoji('⚠️')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`xoanhanvat:${sessionId}:cancel`)
            .setLabel('Hủy')
            .setStyle(ButtonStyle.Secondary)
    )];
}

function errorText(error) {
    return ({
        CHARACTER_RESET_PLAYER_NOT_REGISTERED: 'Bạn chưa có nhân vật để xóa.',
        CHARACTER_RESET_ACTIVITY_IN_PROGRESS: 'Hãy hoàn tất hoạt động đang diễn ra trước khi xóa nhân vật.',
        CHARACTER_RESET_CRAFT_IN_PROGRESS: 'Hãy nhận hoặc hoàn tất mẻ chế tạo đang chạy trước.',
        CHARACTER_RESET_MINIGAME_ACTIVE: 'Hãy kết thúc ván Mini Game đang chơi trước.',
        CHARACTER_RESET_COOLDOWN: `Chưa thể tạo lại nhân vật. Có thể thực hiện sau <t:${Math.floor(new Date(error?.availableAt || 0).getTime() / 1000)}:R>.`
    })[error?.message] || 'Không thể xóa nhân vật lúc này.';
}

export default class DeleteCharacterCommand extends BaseCommand {
    constructor() {
        super({ name: 'xoanhanvat', description: 'Xóa tiến trình nhân vật để tạo lại, giữ Linh Thạch' });
    }

    getSlashData() {
        return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
    }

    async execute(interaction, client) {
        if (!client.characterResetService) throw new Error('CHARACTER_RESET_SERVICE_REQUIRED');
        await interaction.deferReply({ ephemeral: true });
        let preview;
        try {
            preview = await client.characterResetService.preview(interaction.user.id);
        } catch (error) {
            return interaction.editReply({ content: errorText(error), components: [] });
        }
        const message = await interaction.editReply({
            content: [
                '⚠️ **XÓA VÀ TẠO LẠI NHÂN VẬT**',
                '',
                `Đạo hiệu hiện tại: **${preview.daoName}**`,
                `Linh Thạch được giữ: **${formatIntegerAmount(preview.retainedSpiritStone)}**`,
                '',
                '**Sẽ mất:** cảnh giới, tu vi, Linh Căn, Luân hồi, trang bị, vật phẩm,',
                'Công Pháp, Kỹ Năng, nghề nghiệp, map và Tông Môn.',
                '',
                'Lịch sử economy/transfer vẫn được giữ để bảo vệ giao dịch.',
                '*Thao tác này không thể hoàn tác.*'
            ].join('\n'),
            components: buttons(interaction.id)
        });
        await ComponentSession.forMessage({
            interaction,
            message,
            prefix: `xoanhanvat:${interaction.id}:`,
            timeoutMs: preview.confirmationTtlSeconds * 1000
        }).run({
            onCollect: async (component) => {
                const action = component.customId.split(':').at(-1);
                if (action === 'cancel') {
                    await component.update({
                        content: 'Đã hủy. Nhân vật của bạn không thay đổi.',
                        components: []
                    });
                    return false;
                }
                await component.deferUpdate();
                try {
                    const result = await client.characterResetService.reset(interaction.user.id, {
                        operationId: `COMPONENT:${component.id}:CHARACTER_RESET`
                    });
                    await interaction.editReply({
                        content: [
                            '✅ Nhân vật cũ đã được xóa an toàn.',
                            `Đã giữ lại **${formatIntegerAmount(result.retainedSpiritStone)} Linh Thạch**.`,
                            'Hãy dùng `/start` để tạo nhân vật mới.'
                        ].join('\n'),
                        components: []
                    });
                } catch (error) {
                    await interaction.editReply({ content: errorText(error), components: [] });
                }
                return false;
            },
            onTimeout: async () => {
                await interaction.editReply({
                    content: 'Xác nhận đã hết hạn. Nhân vật của bạn không thay đổi.',
                    components: []
                }).catch(() => null);
            }
        });
        return message;
    }
}
