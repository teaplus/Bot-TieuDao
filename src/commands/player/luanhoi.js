import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags
} from 'discord.js';
import ComponentSession from '../../application/discord/ComponentSession.js';
import BaseCommand from '../../core/BaseCommand.js';
import { formatIntegerAmount } from '../../shared/numeric/IntegerAmount.js';

export const REBIRTH_CONFIRM_TIMEOUT_MS = 2 * 60 * 1000;

function buttonId(interactionId, action) {
    return `luanhoi:${interactionId}:${action}`;
}

function outcomeMessage(outcome) {
    if (outcome === 'PLAYER_NOT_FOUND') {
        return 'Đạo hữu chưa bắt đầu hành trình. Hãy dùng `/start` trước.';
    }
    if (outcome === 'REBIRTH_NOT_AT_FINAL_STAGE') {
        return 'Chỉ có thể Luân hồi khi đã đạt tầng cuối của cảnh giới cuối cùng.';
    }
    if (outcome === 'REBIRTH_INSUFFICIENT_CULTIVATION') {
        return 'Đạo hữu đã tới cực cảnh nhưng tu vi vẫn chưa viên mãn để Luân hồi.';
    }
    return 'Thiên cơ Luân hồi chưa thể vận chuyển lúc này.';
}

export function createRebirthPreviewPayload(preview, interactionId, notice = null) {
    const stats = preview.baseStats;
    const embed = new EmbedBuilder()
        .setTitle(`XÁC NHẬN LUÂN HỒI — ĐỜI ${formatIntegerAmount(preview.nextRebirthCount)}`)
        .setColor('#e67e22')
        .setDescription([
            '**Thao tác này không thể hoàn tác.**',
            'Sẽ xóa: vật phẩm, trang bị, kỹ năng, công pháp đã học, tông môn và mọi tiền tệ ngoài Linh Thạch.',
            'Giữ lại: danh tính, Linh Căn, Linh Thạch, thành tựu và ngoại trang.'
        ].join('\n'))
        .addFields(
            {
                name: 'Khởi điểm đời mới',
                value: `**${preview.resetRealmName} — Tầng ${preview.resetRealmStage}**`,
                inline: true
            },
            {
                name: 'Linh Thạch giữ lại',
                value: formatIntegerAmount(preview.retainedSpiritStone),
                inline: true
            },
            {
                name: 'Căn cơ sau Luân hồi',
                value: `HP ${stats.hp} · ATK ${stats.atk} · DEF ${stats.def} · SPD ${stats.spd}`
            }
        )
        .setFooter({ text: 'Xác nhận chỉ có hiệu lực trong 2 phút và chỉ dành cho người gọi lệnh.' });

    return {
        content: notice,
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(buttonId(interactionId, 'confirm'))
                .setLabel('Xác nhận Luân hồi')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(buttonId(interactionId, 'cancel'))
                .setLabel('Hủy')
                .setStyle(ButtonStyle.Secondary)
        )]
    };
}

export function createRebirthSuccessPayload(result) {
    const stats = result.baseStats;
    const embed = new EmbedBuilder()
        .setTitle('LUÂN HỒI THÀNH CÔNG')
        .setColor('#9b59b6')
        .setDescription(`Đạo hữu đã bước vào đời thứ **${formatIntegerAmount(result.rebirthCount)}**.`)
        .addFields(
            { name: 'Khởi điểm mới', value: `**${result.realmName} — Tầng ${result.realmStage}**`, inline: true },
            { name: 'Linh Thạch giữ lại', value: formatIntegerAmount(result.retainedSpiritStone), inline: true },
            { name: 'Căn cơ Luân hồi', value: `HP ${stats.hp} · ATK ${stats.atk} · DEF ${stats.def} · SPD ${stats.spd}` }
        )
        .setFooter({ text: `Rebirth #${result.historyId}` });
    return { content: null, embeds: [embed], components: [] };
}

export default class LuanHoiCommand extends BaseCommand {
    constructor() {
        super({
            name: 'luanhoi',
            description: 'Luân hồi sau khi viên mãn cảnh giới cuối cùng.',
            cooldown: 60
        });
    }

    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        let preview;
        try {
            preview = await client.rebirthService.preview(interaction.user.id);
        } catch (error) {
            return this.handleFailure(interaction, client, error);
        }
        if (preview.outcome !== 'REBIRTH_ELIGIBLE') {
            return interaction.editReply({ content: outcomeMessage(preview.outcome), components: [] });
        }

        const message = await interaction.editReply(createRebirthPreviewPayload(preview, interaction.id));
        const session = ComponentSession.forMessage({
            interaction,
            message,
            prefix: `luanhoi:${interaction.id}:`,
            timeoutMs: REBIRTH_CONFIRM_TIMEOUT_MS
        });

        await session.run({
            onCollect: async (component) => {
                await component.deferUpdate();
                if (component.customId.endsWith(':cancel')) {
                    await interaction.editReply({
                        content: 'Đã hủy Luân hồi. Không có dữ liệu nào bị thay đổi.',
                        embeds: [],
                        components: []
                    });
                    return false;
                }

                try {
                    const result = await client.rebirthService.rebirth(interaction.user.id, {
                        operationId: component.id,
                        expectedRebirthCount: preview.nextRebirthCount,
                        expectedPolicyRevision: preview.policyRevision
                    });
                    if (result.outcome === 'REBIRTH_SUCCESS') {
                        await interaction.editReply(createRebirthSuccessPayload(result));
                        return false;
                    }
                    if (result.outcome === 'REBIRTH_PREVIEW_STALE') {
                        preview = await client.rebirthService.preview(interaction.user.id);
                        if (preview.outcome === 'REBIRTH_ELIGIBLE') {
                            await interaction.editReply(createRebirthPreviewPayload(
                                preview,
                                interaction.id,
                                'Trạng thái đã thay đổi; preview vừa được tải lại. Hãy kiểm tra rồi xác nhận lần nữa.'
                            ));
                            return true;
                        }
                    }
                    await interaction.editReply({
                        content: outcomeMessage(result.outcome),
                        embeds: [],
                        components: []
                    });
                    return false;
                } catch (error) {
                    await this.handleFailure(interaction, client, error);
                    return false;
                }
            },
            onTimeout: async () => {
                try {
                    await interaction.editReply({
                        content: 'Xác nhận Luân hồi đã hết hạn. Hãy dùng `/luanhoi` để tạo preview mới.',
                        components: []
                    });
                } catch {
                    // Interaction/message may have been deleted; cleanup is best-effort.
                }
            }
        });
        return message;
    }

    async handleFailure(interaction, client, error) {
        if (error?.message === 'REBIRTH_ACTIVITY_IN_PROGRESS') {
            return interaction.editReply({
                content: 'Hãy hoàn tất hoạt động đang dở trước khi Luân hồi.',
                embeds: [],
                components: []
            });
        }
        client.logger?.error('Rebirth command failed', {
            error: error instanceof Error ? error.message : String(error)
        });
        return interaction.editReply({
            content: 'Luân hồi thất bại; toàn bộ trạng thái đã được hoàn tác an toàn.',
            embeds: [],
            components: []
        });
    }
}
