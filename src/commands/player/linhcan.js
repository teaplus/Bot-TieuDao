import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder
} from 'discord.js';
import ComponentSession from '../../application/discord/ComponentSession.js';
import BaseCommand from '../../core/BaseCommand.js';
import EffectFormatter from '../../core/EffectFormatter.js';
import { formatIntegerAmount } from '../../shared/numeric/IntegerAmount.js';

export const SPIRIT_ROOT_CONFIRM_TIMEOUT_MS = 2 * 60 * 1000;

function formatRoot(root) {
    return `**${root.spiritRootName} — ${root.qualityName}**`;
}

const EFFECT_SCOPE_LABELS = Object.freeze({
    ACTION: 'Kỹ năng cùng hệ',
    CULTIVATION: 'Tu luyện',
    ENTITY: 'Chiến đấu',
    BREAKTHROUGH: 'Đột phá'
});

function formatRootEffects(root) {
    if (!root.effects?.length) return 'Chưa có hiệu ứng thụ động.';
    return root.effects
        .map((effect) => `• **${EFFECT_SCOPE_LABELS[effect.scope] || effect.scope}:** ${EffectFormatter.format(effect)}`)
        .join('\n');
}

function buttonId(interactionId, action) {
    return `linhcan:${interactionId}:${action}`;
}

export function createSpiritRootStatusPayload(preview) {
    const embed = new EmbedBuilder()
        .setTitle('LINH CĂN')
        .setColor('#8e44ad')
        .setDescription(formatRoot(preview.current))
        .addFields(
            {
                name: 'Hệ tương hợp',
                value: preview.current.elementIds.length
                    ? preview.current.elementIds.join(', ')
                    : 'Vô hệ / Trung tính',
                inline: true
            },
            {
                name: 'Lượt tái tạo',
                value: formatIntegerAmount(preview.availableCount || 0),
                inline: true
            },
            { name: 'Hiệu ứng hiện tại', value: formatRootEffects(preview.current) }
        );
    return { embeds: [embed], components: [] };
}

export function createSpiritRootRerollPreviewPayload(preview, interactionId, notice = null) {
    const weights = preview.pool.qualityWeights
        .map((entry) => `${entry.qualityName}: **${entry.weight}%**`)
        .join('\n');
    const embed = new EmbedBuilder()
        .setTitle('XÁC NHẬN TÁI TẠO LINH CĂN')
        .setColor('#e67e22')
        .setDescription([
            `Hiện tại: ${formatRoot(preview.current)}`,
            `Sử dụng lượt được cấp ở đời **${formatIntegerAmount(preview.entitlement.rebirthNumber)}**.`,
            '',
            '**Kết quả sẽ thay thế vĩnh viễn Linh Căn hiện tại. Phẩm cấp có thể thấp hơn.**',
            'Nếu roll trùng chính xác cả Linh Căn và phẩm cấp, hệ thống tự roll tiếp; mọi draw bị loại đều được lưu audit.'
        ].join('\n'))
        .addFields(
            { name: `Tỷ lệ phẩm — ${preview.pool.bracketId}`, value: weights },
            { name: 'Hiệu ứng đang có', value: formatRootEffects(preview.current) },
            { name: 'Lượt còn lại', value: formatIntegerAmount(preview.availableCount), inline: true }
        )
        .setFooter({ text: 'Owner-only · hết hạn sau 2 phút · không thể hoàn tác sau khi xác nhận' });
    return {
        content: notice,
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(buttonId(interactionId, 'confirm'))
                .setLabel('Tái tạo Linh Căn')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(buttonId(interactionId, 'cancel'))
                .setLabel('Hủy')
                .setStyle(ButtonStyle.Secondary)
        )]
    };
}

function createSuccessPayload(result) {
    const direction = result.current.qualityOrder > result.previous.qualityOrder
        ? 'Phẩm cấp tăng'
        : (result.current.qualityOrder < result.previous.qualityOrder
            ? 'Phẩm cấp giảm'
            : 'Phẩm cấp không đổi');
    const embed = new EmbedBuilder()
        .setTitle('TÁI TẠO LINH CĂN THÀNH CÔNG')
        .setColor('#9b59b6')
        .setDescription(`${formatRoot(result.previous)}\n→ ${formatRoot(result.current)}`)
        .addFields(
            { name: 'Biến động', value: direction, inline: true },
            {
                name: 'Draw trùng đã loại',
                value: formatIntegerAmount(result.rejectedExactDuplicates),
                inline: true
            },
            { name: 'Hiệu ứng Linh Căn mới', value: formatRootEffects(result.current) }
        )
        .setFooter({ text: `Spirit Root Roll #${result.historyId}` });
    return { content: null, embeds: [embed], components: [] };
}

export default class SpiritRootCommand extends BaseCommand {
    constructor() {
        super({ name: 'linhcan', description: 'Xem hoặc tái tạo Linh Căn sau Luân hồi' });
    }

    getSlashData() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addSubcommand((subcommand) => subcommand
                .setName('xem')
                .setDescription('Xem Linh Căn, phẩm cấp và số lượt tái tạo'))
            .addSubcommand((subcommand) => subcommand
                .setName('reroll')
                .setDescription('Dùng một lượt Luân hồi để tái tạo Linh Căn'));
    }

    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const subcommand = interaction.options.getSubcommand();
        let preview;
        try {
            preview = await client.spiritRootRerollService.preview(interaction.user.id);
        } catch (error) {
            return this.handleFailure(interaction, client, error);
        }
        if (preview.outcome === 'PLAYER_NOT_FOUND') {
            return interaction.editReply('Hãy dùng `/start` để tạo nhân vật trước.');
        }
        if (subcommand === 'xem') {
            return interaction.editReply(createSpiritRootStatusPayload(preview));
        }
        if (preview.outcome === 'SPIRIT_ROOT_NO_REROLL_AVAILABLE') {
            return interaction.editReply({
                content: 'Đạo hữu chưa có lượt tái tạo Linh Căn. Mỗi lần Luân hồi thành công cấp một lượt.',
                components: []
            });
        }

        const message = await interaction.editReply(
            createSpiritRootRerollPreviewPayload(preview, interaction.id)
        );
        await ComponentSession.forMessage({
            interaction,
            message,
            prefix: `linhcan:${interaction.id}:`,
            timeoutMs: SPIRIT_ROOT_CONFIRM_TIMEOUT_MS
        }).run({
            onCollect: async (component) => {
                await component.deferUpdate();
                if (component.customId.endsWith(':cancel')) {
                    await interaction.editReply({
                        content: 'Đã hủy tái tạo. Linh Căn và entitlement không thay đổi.',
                        embeds: [],
                        components: []
                    });
                    return false;
                }
                try {
                    const result = await client.spiritRootRerollService.reroll(
                        interaction.user.id,
                        {
                            operationId: component.id,
                            expectedEntitlementId: preview.entitlement.id
                        }
                    );
                    if (result.outcome === 'SPIRIT_ROOT_REROLL_SUCCESS') {
                        await interaction.editReply(createSuccessPayload(result));
                        return false;
                    }
                    if (result.outcome === 'SPIRIT_ROOT_REROLL_PREVIEW_STALE') {
                        preview = await client.spiritRootRerollService.preview(interaction.user.id);
                        if (preview.outcome === 'SPIRIT_ROOT_REROLL_AVAILABLE') {
                            await interaction.editReply(createSpiritRootRerollPreviewPayload(
                                preview,
                                interaction.id,
                                'Entitlement đã thay đổi; preview vừa được tải lại. Hãy kiểm tra trước khi xác nhận.'
                            ));
                            return true;
                        }
                    }
                    await interaction.editReply({
                        content: 'Không còn lượt tái tạo khả dụng.',
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
                        content: 'Xác nhận đã hết hạn. Entitlement chưa bị sử dụng.',
                        components: []
                    });
                } catch {
                    // Message may have been removed; timeout cleanup is best-effort.
                }
            }
        });
        return message;
    }

    async handleFailure(interaction, client, error) {
        client.logger?.error('Spirit Root reroll command failed', {
            error: error instanceof Error ? error.message : String(error)
        });
        return interaction.editReply({
            content: 'Tái tạo Linh Căn thất bại; Linh Căn và entitlement đã được hoàn tác an toàn.',
            embeds: [],
            components: []
        });
    }
}
