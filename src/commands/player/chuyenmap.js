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

function accessLabel(entry) {
    if (!entry.map) return 'Không còn map';
    if (entry.access.canEnter) return 'Có thể di chuyển';
    if (entry.access.reason.startsWith('MAP_LOCKED:')) return 'Chưa đủ cảnh giới';
    if (entry.access.reason.startsWith('MAP_NOT_ACTIVE:')) return 'Nội dung chưa mở';
    return 'Chưa thể di chuyển';
}

function buildView(location, prefix, notice = null) {
    const current = location.current;
    const mapAttachment = createMapArtAttachment(current.id);
    const embed = new EmbedBuilder()
        .setTitle(`Vị trí hiện tại: ${current.displayName}`)
        .setColor('#3498DB')
        .setDescription(notice || current.description)
        .addFields(
            { name: 'Cảnh giới khu vực', value: location.currentRealmName, inline: true },
            { name: 'Thứ tự tuyến', value: `${current.navigationOrder}/15`, inline: true },
            {
                name: 'Map thấp hơn',
                value: location.lower.map
                    ? `**${location.lower.map.displayName}**\n${accessLabel(location.lower)}`
                    : 'Đã ở đầu tuyến',
                inline: true
            },
            {
                name: 'Map cao hơn',
                value: location.higher.map
                    ? `**${location.higher.map.displayName}**\n${accessLabel(location.higher)}`
                    : 'Đã ở cuối tuyến',
                inline: true
            }
        );
    if (mapAttachment) embed.setImage(mapAttachment.asset.imageUrl);

    const lower = new ButtonBuilder()
        .setCustomId(`${prefix}:LOWER`)
        .setLabel('Map thấp hơn')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!location.lower.access.canEnter);
    const higher = new ButtonBuilder()
        .setCustomId(`${prefix}:HIGHER`)
        .setLabel('Map cao hơn')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!location.higher.access.canEnter);
    const close = new ButtonBuilder()
        .setCustomId(`${prefix}:CLOSE`)
        .setLabel('Đóng')
        .setStyle(ButtonStyle.Danger);

    return {
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(lower, higher, close)],
        attachments: [],
        files: mapAttachment ? [mapAttachment.file] : []
    };
}

export default class ChuyenMapCommand extends BaseCommand {
    constructor() {
        super({
            name: 'chuyenmap',
            description: 'Xem vị trí và di chuyển tới map liền kề',
            cooldown: 15
        });
    }

    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            let location = await client.playerMapService.getCurrentLocation(interaction.user.id);
            const prefix = `chuyenmap:${interaction.id}`;
            const message = await interaction.editReply(buildView(location, prefix));
            const session = ComponentSession.forMessage({ interaction, message, prefix });

            await session.run({
                onCollect: async (component) => {
                    await component.deferUpdate();
                    const action = component.customId.slice(prefix.length + 1);
                    if (action === 'CLOSE') {
                        await interaction.editReply({ ...buildView(location, prefix), components: [] });
                        return false;
                    }

                    try {
                        location = await client.playerMapService.move(interaction.user.id, action, {
                            operationId: component.id
                        });
                        await interaction.editReply(buildView(
                            location,
                            prefix,
                            `Đã di chuyển tới **${location.current.displayName}**.`
                        ));
                    } catch (error) {
                        const reason = error.message.startsWith('MAP_LOCKED:')
                            ? 'Cảnh giới của đạo hữu chưa đủ.'
                            : error.message.startsWith('MAP_NOT_ACTIVE:')
                                ? 'Map này chưa mở nội dung.'
                                : 'Không thể di chuyển theo hướng này.';
                        location = await client.playerMapService.getCurrentLocation(interaction.user.id);
                        await interaction.editReply(buildView(location, prefix, reason));
                    }
                    return true;
                },
                onTimeout: () => interaction.editReply({
                    ...buildView(location, prefix, 'Phiên di chuyển đã hết hạn.'),
                    components: []
                })
            });
            return null;
        } catch (error) {
            if (error.message === 'PLAYER_NOT_FOUND') {
                return interaction.editReply({ content: 'Hãy dùng `/start` để tạo nhân vật trước.', components: [] });
            }
            client.logger?.error('Chuyenmap command failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            return interaction.editReply({ content: 'Chưa thể xác định vị trí lúc này.', components: [] });
        }
    }
}
