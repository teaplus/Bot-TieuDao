import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} from 'discord.js';
import ComponentSession from '../../application/discord/ComponentSession.js';
import BaseCommand from '../../core/BaseCommand.js';

const PAGE_SIZE = 20;
const SESSION_TIMEOUT_MS = 10 * 60 * 1000;

function buttonId(interactionId, direction) {
    return `bangxephang:${interactionId}:${direction}`;
}

export function createLeaderboardPayload(page, interactionId, notice = null) {
    const description = page.items.length
        ? page.items.map((entry) => (
            `**#${entry.rank}** ${entry.displayName} — Luân hồi ${entry.rebirthCount}, ${entry.realmName}, Tầng ${entry.stage}`
        )).join('\n')
        : 'Bảng xếp hạng chưa có dữ liệu. Hãy chờ lần cập nhật kế tiếp.';
    const embed = new EmbedBuilder()
        .setTitle('Bảng Xếp Hạng Tu Vi')
        .setColor('#C89B3C')
        .setDescription(description.slice(0, 4096));
    if (page.refreshedAt) {
        embed.setFooter({ text: `Cập nhật: ${new Date(page.refreshedAt).toLocaleString('vi-VN')}` });
    }

    const components = [];
    if (page.previousCursor || page.nextCursor) {
        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(buttonId(interactionId, 'previous'))
                .setLabel('Trước')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!page.previousCursor),
            new ButtonBuilder()
                .setCustomId(buttonId(interactionId, 'next'))
                .setLabel('Sau')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!page.nextCursor)
        ));
    }

    return { content: notice, embeds: [embed], components };
}

export default class CultivationLeaderboardCommand extends BaseCommand {
    constructor() {
        super({
            name: 'bangxephang',
            description: 'Xem bảng xếp hạng tu vi toàn cõi'
        });
    }

    async execute(interaction, client) {
        await interaction.deferReply();
        let page;
        try {
            page = await client.cultivationLeaderboardService.list({ limit: PAGE_SIZE });
        } catch (error) {
            client.logger?.error('Leaderboard command failed', { errorCode: error?.code || 'LEADERBOARD_READ_FAILED' });
            return interaction.editReply('Bảng xếp hạng tạm thời chưa thể mở, hãy thử lại sau.');
        }

        const message = await interaction.editReply(createLeaderboardPayload(page, interaction.id));
        if (!page.previousCursor && !page.nextCursor) return message;

        const session = ComponentSession.forMessage({
            interaction,
            message,
            prefix: `bangxephang:${interaction.id}:`,
            timeoutMs: SESSION_TIMEOUT_MS
        });
        await session.run({
            onCollect: async (component) => {
                const direction = component.customId.endsWith(':previous') ? 'previous' : 'next';
                const cursor = direction === 'previous' ? page.previousCursor : page.nextCursor;
                if (!cursor) {
                    await component.deferUpdate();
                    return true;
                }

                await component.deferUpdate();
                let notice = null;
                try {
                    page = await client.cultivationLeaderboardService.list({ limit: PAGE_SIZE, cursor });
                } catch (error) {
                    if (error?.code !== 'LEADERBOARD_CURSOR_STALE') {
                        client.logger?.error('Leaderboard pagination failed', {
                            errorCode: error?.code || 'LEADERBOARD_PAGE_FAILED'
                        });
                        await interaction.editReply({
                            content: 'Không thể chuyển trang lúc này.',
                            components: []
                        });
                        return false;
                    }
                    page = await client.cultivationLeaderboardService.list({ limit: PAGE_SIZE });
                    notice = 'Bảng xếp hạng vừa được cập nhật, đã quay lại trang đầu.';
                }
                await interaction.editReply(createLeaderboardPayload(page, interaction.id, notice));
                return true;
            },
            onTimeout: async () => {
                try {
                    await interaction.editReply({ components: [] });
                } catch {
                    // Interaction/message may have been deleted; session cleanup stays best-effort.
                }
            }
        });
        return message;
    }
}

export { PAGE_SIZE, SESSION_TIMEOUT_MS };
