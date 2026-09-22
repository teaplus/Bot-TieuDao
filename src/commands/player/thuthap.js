import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags
} from 'discord.js';
import ComponentSession from '../../application/discord/ComponentSession.js';
import { createMapArtAttachment } from '../../application/discord/UiAssetResolver.js';
import BaseCommand from '../../core/BaseCommand.js';
import { formatIntegerAmount } from '../../shared/numeric/IntegerAmount.js';

const FAMILY_UI = Object.freeze({
    HERB: { icon: '🌿', label: 'Hái Linh Thảo' },
    ORE: { icon: '⛏️', label: 'Khai Linh Khoáng' }
});

function errorMessage(error) {
    const messages = {
        PLAYER_NOT_FOUND: 'Hãy dùng `/start` để tạo nhân vật trước.',
        GATHERING_ACTIVE_RUN_EXISTS: 'Đạo hữu đang có một chuyến thu thập chưa hoàn tất.',
        GATHERING_NOT_READY: 'Thiên địa linh vật chưa hội tụ đủ, vẫn chưa thể thu hoạch.',
        GATHERING_RUN_NOT_CLAIMABLE: 'Chuyến thu thập này không còn có thể nhận.',
        GATHERING_NOT_AVAILABLE_ON_CURRENT_MAP: 'Loại tài nguyên này không tồn tại tại map hiện tại.',
        GATHERING_CONTENT_NOT_ACTIVE: 'Khu vực này chưa mở hoạt động thu thập.',
        REALM_LOCKED: 'Cảnh giới hiện tại chưa đủ để thu thập tại khu vực này.',
        INVENTORY_FULL: 'Túi Trữ Vật đã đầy; hãy dọn chỗ rồi nhận lại.'
    };
    return messages[error?.message] || 'Thiên cơ nhiễu loạn, chưa thể thực hiện thu thập lúc này.';
}

function formatResource(resource) {
    const chance = `${resource.weight}%`;
    const quantity = resource.quantity.min === resource.quantity.max
        ? `${resource.quantity.min}`
        : `${resource.quantity.min}–${resource.quantity.max}`;
    return `• **${resource.name}** · ${chance} · ×${quantity}`;
}

function formatReward(result, gameDataManager) {
    const rewards = result?.reward?.rewards || [];
    if (!rewards.length) return 'Không thu được tài nguyên nào.';
    return rewards.map((reward) => {
        if (reward.type === 'ITEM') {
            const item = gameDataManager.getRecord('itemTemplates', reward.itemId);
            return `• ${item?.name || reward.itemId} ×**${formatIntegerAmount(reward.quantity || 0)}**`;
        }
        if (reward.type === 'CURRENCY') {
            return `• ${reward.currencyId} ×**${formatIntegerAmount(reward.amount || 0)}**`;
        }
        return `• ${reward.itemId || reward.type}`;
    }).join('\n');
}

function buildComponents({ dashboard, sessionId, disabled = false }) {
    const active = dashboard.activeRun;
    const gatheringByFamily = new Map(
        dashboard.gatherings.map((gathering) => [gathering.resourceFamily, gathering])
    );
    const activityRow = new ActionRowBuilder().addComponents(
        ...['HERB', 'ORE'].map((family) => {
            const gathering = gatheringByFamily.get(family);
            const ui = FAMILY_UI[family];
            return new ButtonBuilder()
                .setCustomId(`thuthap:${sessionId}:start:${family}`)
                .setLabel(ui.label)
                .setEmoji(ui.icon)
                .setStyle(family === 'HERB' ? ButtonStyle.Success : ButtonStyle.Primary)
                .setDisabled(disabled || Boolean(active) || !gathering?.available);
        })
    );
    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`thuthap:${sessionId}:claim`)
            .setLabel('Thu hoạch')
            .setEmoji('🎁')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled || active?.computedStatus !== 'READY'),
        new ButtonBuilder()
            .setCustomId(`thuthap:${sessionId}:refresh`)
            .setLabel('Làm mới')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(`thuthap:${sessionId}:close`)
            .setLabel('Đóng')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled)
    );
    return [activityRow, actionRow];
}

function render({ interaction, dashboard, sessionId, notice = null, disabled = false }) {
    const mapAttachment = createMapArtAttachment(dashboard.currentMap.id);
    const embed = new EmbedBuilder()
        .setColor('#3E8E5B')
        .setTitle(`🌿 Thu thập · ${dashboard.currentMap.name}`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setDescription([
            notice,
            `**Cấp tài nguyên:** ${dashboard.resourceTier}`,
            'Chọn một nhóm tài nguyên. Phần thưởng được xác định theo map hiện tại và chỉ roll khi thu hoạch.'
        ].filter(Boolean).join('\n'));
    if (mapAttachment) embed.setImage(mapAttachment.asset.imageUrl);

    for (const gathering of dashboard.gatherings) {
        const ui = FAMILY_UI[gathering.resourceFamily] || { icon: '📦', label: gathering.name };
        embed.addFields({
            name: `${ui.icon} ${ui.label} · ${gathering.duration} giây`,
            value: gathering.resources.map(formatResource).join('\n').slice(0, 1024)
                || 'Khu vực này chưa có tài nguyên.'
        });
    }

    if (dashboard.activeRun) {
        const run = dashboard.activeRun;
        const family = run.inputSnapshot?.resourceFamily;
        const ui = FAMILY_UI[family] || { icon: '🧭', label: run.gathering?.name || run.contentId };
        const readyUnix = Math.floor(new Date(run.readyAt).getTime() / 1000);
        embed.addFields({
            name: run.computedStatus === 'READY'
                ? '✅ Linh vật đã hội tụ'
                : '⏳ Đang thu thập',
            value: [
                `${ui.icon} **${ui.label}**`,
                `Khởi hành từ: **${run.inputSnapshot?.mapName || run.inputSnapshot?.mapId || 'Không rõ'}**`,
                `Hoàn thành: <t:${readyUnix}:R>`,
                run.computedStatus === 'READY'
                    ? 'Có thể bấm **Thu hoạch** để nhận tài nguyên.'
                    : 'Mở lại `/thuthap` hoặc bấm **Làm mới** khi đủ thời gian.'
            ].join('\n')
        });
    } else {
        embed.addFields({
            name: '🧺 Trạng thái',
            value: 'Không có chuyến thu thập đang hoạt động.'
        });
    }

    return {
        embeds: [embed],
        components: buildComponents({ dashboard, sessionId, disabled }),
        attachments: [],
        files: mapAttachment ? [mapAttachment.file] : []
    };
}

export default class GatheringCommand extends BaseCommand {
    constructor() {
        super({
            name: 'thuthap',
            description: 'Thu thập Linh Thảo và Linh Khoáng tại map hiện tại'
        });
    }

    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        if (!client.gatheringService) {
            return interaction.editReply('Hệ thống thu thập chưa sẵn sàng.');
        }

        try {
            let dashboard = await client.gatheringService.getDashboard(interaction.user.id);
            let notice = null;
            const sessionId = interaction.id;
            const message = await interaction.editReply(render({
                interaction, dashboard, sessionId, notice
            }));

            await ComponentSession.forMessage({
                interaction,
                message,
                prefix: `thuthap:${sessionId}:`,
                timeoutMs: 120_000
            }).run({
                onCollect: async (component) => {
                    const [, , action, argument] = component.customId.split(':');
                    if (action === 'close') {
                        await component.update(render({
                            interaction,
                            dashboard,
                            sessionId,
                            notice: 'Đã khép lại hành trình thu thập.',
                            disabled: true
                        }));
                        return false;
                    }

                    await component.deferUpdate();
                    try {
                        if (action === 'start') {
                            const gathering = dashboard.gatherings.find(
                                (entry) => entry.resourceFamily === argument
                            );
                            if (!gathering) throw new Error('GATHERING_NOT_AVAILABLE_ON_CURRENT_MAP');
                            const result = await client.gatheringService.start(
                                interaction.user.id,
                                gathering.id,
                                { operationId: component.id }
                            );
                            notice = `🧭 Đã bắt đầu **${gathering.name}**; hoàn thành <t:${
                                Math.floor(new Date(result.readyAt).getTime() / 1000)
                            }:R>.`;
                        } else if (action === 'claim') {
                            if (!dashboard.activeRun) throw new Error('GATHERING_RUN_NOT_CLAIMABLE');
                            const result = await client.gatheringService.claim(
                                interaction.user.id,
                                dashboard.activeRun.runId,
                                { operationId: component.id }
                            );
                            notice = `🎁 **Thu hoạch thành công**\n${formatReward(
                                result,
                                client.gameDataManager
                            )}`;
                        } else if (action === 'refresh') {
                            notice = '🔄 Đã quan sát lại linh khí trong khu vực.';
                        }
                        dashboard = await client.gatheringService.getDashboard(interaction.user.id);
                    } catch (error) {
                        client.logger?.error('Gathering panel action failed', {
                            error: error instanceof Error ? error.message : String(error)
                        });
                        notice = `⚠️ ${errorMessage(error)}`;
                        dashboard = await client.gatheringService.getDashboard(
                            interaction.user.id
                        );
                    }
                    await interaction.editReply(render({
                        interaction, dashboard, sessionId, notice
                    }));
                    return true;
                },
                onTimeout: async () => interaction.editReply(render({
                    interaction,
                    dashboard,
                    sessionId,
                    notice: 'Phiên quan sát đã hết hạn. Dùng lại `/thuthap` để tiếp tục hoặc nhận tài nguyên.',
                    disabled: true
                }))
            });
            return null;
        } catch (error) {
            client.logger?.error('Gathering command failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            return interaction.editReply({
                content: errorMessage(error),
                embeds: [],
                components: []
            });
        }
    }
}
