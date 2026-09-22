import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder
} from 'discord.js';
import ComponentSession from '../../application/discord/ComponentSession.js';
import BaseCommand from '../../core/BaseCommand.js';
import { formatIntegerAmount } from '../../shared/numeric/IntegerAmount.js';

function confirmationButtons(sessionId, disabled = false) {
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`give:${sessionId}:confirm`)
            .setLabel('Xác nhận gửi')
            .setEmoji('💎')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(`give:${sessionId}:cancel`)
            .setLabel('Hủy')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled)
    )];
}

function errorText(error) {
    if (String(error?.message).startsWith('INVALID_INTEGER_AMOUNT')) {
        return 'Số Linh Thạch phải là số nguyên dương.';
    }
    return ({
        SPIRIT_STONE_TRANSFER_SELF_FORBIDDEN: 'Không thể tự gửi Linh Thạch cho chính mình.',
        SPIRIT_STONE_TRANSFER_AMOUNT_BELOW_MINIMUM: 'Số Linh Thạch gửi phải từ 1 trở lên.',
        SPIRIT_STONE_TRANSFER_SENDER_NOT_REGISTERED: 'Bạn cần dùng `/start` để tạo nhân vật trước.',
        SPIRIT_STONE_TRANSFER_RECIPIENT_NOT_REGISTERED: 'Người nhận chưa tạo nhân vật bằng `/start`.',
        INSUFFICIENT_CURRENCY: 'Bạn không có đủ Linh Thạch để hoàn tất giao dịch.'
    })[error?.message] || 'Giao dịch chưa thể hoàn tất, xin thử lại sau.';
}

export default class GiveCommand extends BaseCommand {
    constructor() {
        super({ name: 'give', description: 'Gửi Linh Thạch cho một đạo hữu khác' });
    }

    getSlashData() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addUserOption((option) => option
                .setName('nguoinhan')
                .setDescription('Đạo hữu sẽ nhận Linh Thạch')
                .setRequired(true))
            .addStringOption((option) => option
                .setName('soluong')
                .setDescription('Số Linh Thạch nguyên dương muốn gửi')
                .setRequired(true));
    }

    async execute(interaction, client) {
        if (!client.spiritStoneTransferService) throw new Error('TRANSFER_SERVICE_REQUIRED');
        const recipient = interaction.options.getUser('nguoinhan', true);
        const amountInput = interaction.options.getString('soluong', true);
        if (recipient.bot) {
            return interaction.reply({ content: 'Không thể gửi Linh Thạch cho bot.', ephemeral: true });
        }
        await interaction.deferReply();
        let preview;
        try {
            preview = await client.spiritStoneTransferService.preview(
                interaction.user.id, recipient.id, amountInput
            );
        } catch (error) {
            return interaction.editReply({ content: errorText(error), components: [] });
        }
        const content = [
            '💎 **XÁC NHẬN CHUYỂN LINH THẠCH**',
            '',
            `Người gửi: <@${interaction.user.id}>`,
            `Người nhận: <@${recipient.id}>`,
            `Số lượng: **${formatIntegerAmount(preview.amount)} Linh Thạch**`,
            'Phí: **0**',
            ...(preview.recipientAccountStatus === 'GUEST'
                ? ['', '*Người nhận chưa tạo nhân vật; Linh Thạch sẽ được giữ trong ví Lữ Khách.*']
                : []),
            '',
            '*Giao dịch chỉ thực hiện sau khi bạn xác nhận.*'
        ].join('\n');
        const message = await interaction.editReply({
            content,
            components: confirmationButtons(interaction.id),
            allowedMentions: { users: [interaction.user.id, recipient.id] }
        });
        await ComponentSession.forMessage({
            interaction,
            message,
            prefix: `give:${interaction.id}:`,
            timeoutMs: preview.confirmationTtlSeconds * 1000
        }).run({
            onCollect: async (component) => {
                const action = component.customId.split(':').at(-1);
                if (action === 'cancel') {
                    await component.update({
                        content: '🌫️ Giao dịch đã được hủy. Không có Linh Thạch nào bị trừ.',
                        components: []
                    });
                    return false;
                }
                await component.deferUpdate();
                try {
                    const result = await client.spiritStoneTransferService.transfer(
                        interaction.user.id,
                        recipient.id,
                        preview.amount,
                        { operationId: `COMPONENT:${component.id}:SPIRIT_STONE_TRANSFER` }
                    );
                    await interaction.editReply({
                        content: [
                            '✅ **CHUYỂN LINH THẠCH THÀNH CÔNG**',
                            '',
                            `<@${interaction.user.id}> đã gửi **${formatIntegerAmount(result.receivedAmount)} Linh Thạch** cho <@${recipient.id}>.`,
                            `Mã giao dịch: **#${result.transferId}**`
                        ].join('\n'),
                        components: [],
                        allowedMentions: { users: [interaction.user.id, recipient.id] }
                    });
                } catch (error) {
                    await interaction.editReply({ content: errorText(error), components: [] });
                }
                return false;
            },
            onTimeout: async () => {
                await interaction.editReply({
                    content: '⌛ Xác nhận đã hết hạn. Không có Linh Thạch nào bị trừ.',
                    components: []
                }).catch(() => null);
            }
        });
        return message;
    }
}
