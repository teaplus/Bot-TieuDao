import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags
} from 'discord.js';
import ComponentSession from '../../application/discord/ComponentSession.js';
import BaseCommand from '../../core/BaseCommand.js';
import EffectFormatter from '../../core/EffectFormatter.js';
import { compareDecimal, displayDecimal } from '../../shared/numeric/FixedDecimal.js';

function formatTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const result = [];

    if (h > 0) result.push(`${h} gio`);
    if (m > 0) result.push(`${m} phut`);
    if (s > 0) result.push(`${s} giay`);

    return result.length > 0 ? result.join(' ') : '0 giay';
}

function progressBar(percent) {
    const safePercent = Math.max(0, Math.min(100, Number(percent || 0)));
    const filled = Math.round(safePercent / 10);
    return `${'#'.repeat(filled)}${'-'.repeat(10 - filled)} ${safePercent}%`;
}

function createActionRows(sessionId, player, disabled = false) {
    const canBreakthrough = Number(player.getCultivationProgress()) >= 100;

    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`tuvi:${sessionId}:cultivate`)
                .setLabel('Be Quan')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId(`tuvi:${sessionId}:breakthrough`)
                .setLabel('Dot Pha')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(disabled || !canBreakthrough)
        )
    ];
}

export function renderCultivationEmbed(interaction, cultivationView, description) {
    const { player, afkData } = cultivationView;
    const isBottleneck = Number(player.getCultivationProgress()) >= 100;

    let currentDescription = description;
    if (!currentDescription) {
        if (compareDecimal(afkData.earned, 0) > 0) {
            currentDescription = `Bế quan trong **${formatTime(afkData.seconds)}**, hấp thu **+${displayDecimal(afkData.earned)} Tu vi**.`;
            if (isBottleneck) {
                currentDescription += '\n⚠️ **Bạn đang trong trạng thái Bình Cảnh!**\nTu vi đã vượt mức yêu cầu đột phá, tốc độ hấp thu Linh khí bị giảm mạnh xuống còn 20%. Hãy Đột phá để tiếp tục!';
            }
        } else {
            currentDescription = 'Linh khí xung quanh chưa kịp tụ lại. Hãy bế quan thêm một lúc.';
        }
    }

    const successRate = player.isAtMaxStage()
        ? player.realmInfo?.success_rate ?? 0
        : 100;

    const absorptionRateText = isBottleneck
        ? `~~${displayDecimal(afkData.gainPerMinute)}~~ **${displayDecimal(Number(afkData.gainPerMinute) * 0.2)}** Tu vi / phút (Bình Cảnh)`
        : `${displayDecimal(afkData.gainPerMinute)} Tu vi / phút`;

    return new EmbedBuilder()
        .setTitle(`Động Phủ Của ${player.name}`)
        .setColor(isBottleneck ? '#E74C3C' : '#2ECC71')
        .setThumbnail(interaction.user.displayAvatarURL())
        .setDescription(currentDescription)
        .addFields(
            { name: 'Cảnh Giới', value: `**${player.realmInfo.name} - Tầng ${player.realmStage}**`, inline: true },
            { name: 'Linh Căn', value: player.spiritualRoot, inline: true },
            { name: 'Công Pháp', value: player.cultivationArt.name, inline: true },
            {
                name: 'Tiến Độ Tu Luyện',
                value: `${displayDecimal(player.cultivation)} / ${player.realmInfo.req_cul.toLocaleString('vi-VN')}\n${progressBar(player.getCultivationProgress())}`
            },
            { name: 'Tỷ Lệ Đột Phá', value: `${successRate}%`, inline: true },
            { name: 'Tâm Ma', value: 'Chưa kích hoạt', inline: true },
            {
                name: 'Tốc Độ Hấp Thu',
                value: absorptionRateText,
                inline: false
            },
            {
                name: 'Hiệu Ứng Đang Có',
                value: player.effects
                    .filter((effect) => effect.stat === 'cultivation_speed')
                    .map((effect) => EffectFormatter.format(effect))
                    .join('\n') || 'Không có',
                inline: false
            }
        );
}

function renderBreakthroughEmbed(interaction, result) {
    const embed = new EmbedBuilder()
        .setTitle('Dot Pha Canh Gioi')
        .setThumbnail(interaction.user.displayAvatarURL());

    if (result.outcome === 'SUCCESS') {
        return embed
            .setColor('#F1C40F')
            .setDescription(`Thien dia bien sac, **${result.player.name}** da dot pha thanh cong!`)
            .addFields(
                { name: 'Canh Gioi Moi', value: `**${result.nextRealmInfo.name} — Tang ${result.nextRealmStage}**`, inline: true },
                { name: 'Tu Vi Con Lai', value: `${displayDecimal(result.remainingCultivation)}`, inline: true },
                {
                    name: 'The Chat Thang Tien',
                    value: `HP: ${result.player.baseHp} -> **${result.newStats.hp}**\nATK: ${result.player.baseAtk} -> **${result.newStats.atk}**\nDEF: ${result.player.baseDef} -> **${result.newStats.def}**\nSPD: ${result.player.baseSpd} -> **${result.newStats.spd}**`
                }
            );
    }

    const messages = {
        INVALID_REALM: 'Canh gioi hien tai khong hop le.',
        MAX_REALM: 'Dao huu da dung tren dinh canh gioi hien tai.',
        INSUFFICIENT_CULTIVATION: `Chua du tu vi, can them **${result.missingCultivation?.toLocaleString?.('vi-VN') || result.missingCultivation}**.`,
        NEXT_REALM_NOT_FOUND: 'Thien dao chua mo ra canh gioi tiep theo.',
        FAILED: 'Dot pha that bai, linh khi phan phe dan den hao ton tu vi.'
    };

    return embed
        .setColor('#C0392B')
        .setDescription(messages[result.outcome] || 'Dot pha that bai.');
}

export default class TuViCommand extends BaseCommand {
    constructor() {
        super({
            name: 'tuvi',
            description: 'Tro ve dong phu, be quan tu luyen va dot pha canh gioi'
        });
    }

    async execute(interaction, client) {
        await interaction.deferReply();
        const userId = interaction.user.id;
        const sessionId = interaction.id;

        try {
            let cultivationView = await client.cultivationService.collectOfflineCultivation(userId);

            if (!cultivationView) {
                return interaction.editReply({
                    content: 'Dao huu chua buoc chan vao tien do. Hay go `/start` de thuc tinh linh can truoc!',
                    flags: MessageFlags.Ephemeral
                });
            }

            let activePlayer = cultivationView.player;
            const message = await interaction.editReply({
                embeds: [renderCultivationEmbed(interaction, cultivationView)],
                components: createActionRows(sessionId, activePlayer)
            });

            await ComponentSession.forMessage({
                interaction,
                message,
                prefix: `tuvi:${sessionId}:`
            }).run({
                onCollect: async (selected) => {
                    const action = selected.customId.split(':')[2];

                    if (action === 'cultivate') {
                        cultivationView = await client.cultivationService.collectOfflineCultivation(userId);
                        activePlayer = cultivationView.player;
                        await selected.update({
                            embeds: [renderCultivationEmbed(interaction, cultivationView)],
                            components: createActionRows(sessionId, activePlayer)
                        });
                        return true;
                    }

                    const breakthroughResult = await client.breakthroughService.attemptBreakthrough(userId, {
                        operationId: selected.id
                    });
                    await selected.update({
                        embeds: [renderBreakthroughEmbed(interaction, breakthroughResult)],
                        components: []
                    });
                    return false;
                },
                onTimeout: async () => {
                    await interaction.editReply({
                        embeds: [renderCultivationEmbed(interaction, cultivationView, 'Dong phu da tam dong. Hay dung lai `/tuvi` de tiep tuc.')],
                        components: createActionRows(sessionId, activePlayer, true)
                    });
                }
            });
        } catch (error) {
            client.logger?.error('Tuvi command failed', {
                error: error instanceof Error ? error.message : String(error)
            });

            return interaction.editReply({
                content: 'Tam phap nhieu loan, khong the van cong luc nay!',
                flags: MessageFlags.Ephemeral
            });
        }
    }
}
