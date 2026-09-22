import {
    ActionRowBuilder,
    EmbedBuilder,
    MessageFlags,
    StringSelectMenuBuilder
} from 'discord.js';
import DiscordEmbedFactory, { DISCORD_COLORS } from '../../application/discord/DiscordEmbedFactory.js';
import RewardTextFormatter from '../../application/discord/RewardTextFormatter.js';
import ComponentSession from '../../application/discord/ComponentSession.js';
import BattleLogAnimator from '../../application/discord/BattleLogAnimator.js';
import {
    createMapArtAttachment,
    createMonsterPortraitAttachment
} from '../../application/discord/UiAssetResolver.js';
import { formatBattleOutcome } from '../../application/discord/BattleOutcomeText.js';
import BaseCommand from '../../core/BaseCommand.js';

const DIFFICULTIES = Object.freeze({
    NORMAL: {
        label: 'Thường',
        waveCount: 3,
        maxRounds: 15
    },
    HARD: {
        label: 'Khó',
        waveCount: 4,
        maxRounds: 15
    },
    NIGHTMARE: {
        label: 'Ác Mộng',
        waveCount: 5,
        maxRounds: 15
    }
});

function formatWaveLine(result, waves) {
    const wave = waves.find((entry) => entry.waveNumber === result.waveNumber);
    const monster = wave?.monster;
    const outcome = result.outcome === 'DRAW'
        ? 'Bất phân thắng bại'
        : result.outcome === 'VICTORY' ? 'Thành công' : 'Thất bại';
    const waveType = result.type === 'BOSS' ? 'Boss' : 'Thường';

    return [
        `Đợt ${result.waveNumber} (${waveType}) - ${outcome}`,
        `Quái: ${monster?.qualityName ? `[${monster.qualityName}] ` : ''}${monster?.name || 'Không rõ'}`,
        `Số vòng: ${result.battleResult.rounds}`
    ].join(' | ');
}

function formatBossOutcome(outcome) {
    return formatBattleOutcome(outcome);
}

export default class BiCanhCommand extends BaseCommand {
    constructor() {
        super({
            name: 'biccanh',
            description: 'Dùng Vé Bí Cảnh để vượt nhiều đợt yêu thú và săn boss'
        });
    }

    async execute(interaction, client) {
        await interaction.deferReply();

        try {
            const difficulty = await this.chooseDifficulty(interaction);
            if (!difficulty) {
                return null;
            }

            const result = await client.secretRealmService.enter(interaction.user.id, {
                waveCount: difficulty.waveCount,
                maxRounds: difficulty.maxRounds,
                operationId: interaction.id
            });
            const location = client.playerMapService
                ? await client.playerMapService.getCurrentLocation(interaction.user.id).catch(() => null)
                : null;
            const mapAttachment = createMapArtAttachment(location?.current?.id);
            for (const waveResult of result.waveResults) {
                if (!waveResult.battleResult) continue;

                const wave = result.waves.find((entry) => entry.waveNumber === waveResult.waveNumber);
                const isBoss = waveResult.type === 'BOSS';
                const wavePortrait = createMonsterPortraitAttachment(wave?.monster);
                await BattleLogAnimator.play(interaction, waveResult.battleResult, {
                    title: isBoss
                        ? `Boss Bí Cảnh — Đợt ${waveResult.waveNumber}`
                        : `Bí Cảnh — Đợt ${waveResult.waveNumber}`,
                    description: `Đạo hữu đối đầu ${wave?.monster?.name || (isBoss ? 'Boss Bí Cảnh' : 'yêu thú')}.`,
                    interaction,
                    thumbnailUrl: wavePortrait?.asset.imageUrl,
                    files: wavePortrait ? [wavePortrait.file] : []
                });
            }
            const lastWaveResult = result.waveResults.at(-1);
            const lastWave = lastWaveResult
                ? result.waves.find((wave) => wave.waveNumber === lastWaveResult.waveNumber)
                : null;
            const clearedWaves = result.waveResults.filter((wave) => wave.outcome === 'VICTORY').length;
            const rewardText = RewardTextFormatter.format(
                result.reward,
                client.gameDataManager,
                'Không thu thập được vật phẩm nào.'
            ).slice(0, 1024);
            const embed = DiscordEmbedFactory.base({
                title: result.outcome === 'CLEARED'
                    ? 'Bí Cảnh Thành Công'
                    : result.outcome === 'DRAW' ? 'Bí Cảnh Bất Phân Thắng Bại' : 'Bí Cảnh Thất Bại',
                color: result.outcome === 'CLEARED'
                    ? DISCORD_COLORS.WARNING
                    : result.outcome === 'DRAW' ? DISCORD_COLORS.INFO : DISCORD_COLORS.ARCANE,
                description: `Độ khó: **${difficulty.label}**\nĐạo hữu đã tiến vào bí cảnh và vượt qua **${clearedWaves}/${result.waves.length}** đợt.`,
                interaction
            })
                .addFields(
                    {
                        name: 'Tiến trình',
                        value: result.waveResults
                            .map((waveResult) => formatWaveLine(waveResult, result.waves))
                            .join('\n')
                            .slice(0, 1024),
                        inline: false
                    },
                    {
                        name: 'Vé Bí Cảnh',
                        value: result.ticket?.consumed ? 'Đã tiêu hao 1 Vé Bí Cảnh.' : 'Không tiêu hao vé.',
                        inline: false
                    }
                );

            let finalBattleEmbed = null;
            const finalPortrait = createMonsterPortraitAttachment(lastWave?.monster);
            if (lastWaveResult?.battleResult) {
                finalBattleEmbed = BattleLogAnimator.renderFinalEmbed(lastWaveResult.battleResult, {
                    title: lastWaveResult.type === 'BOSS'
                        ? 'Diễn Biến Boss Bí Cảnh'
                        : `Diễn Biến Bí Cảnh — Đợt ${lastWaveResult.waveNumber}`,
                    description: lastWave?.monster?.name || 'Yêu thú Bí Cảnh',
                    status: formatBossOutcome(lastWaveResult.outcome),
                    interaction,
                    thumbnailUrl: finalPortrait?.asset.imageUrl
                });
                if (result.outcome === 'CLEARED') {
                    finalBattleEmbed.addFields({
                        name: '🎁 Thu thập được',
                        value: rewardText,
                        inline: false
                    });
                }
            }
            const embeds = finalBattleEmbed ? [finalBattleEmbed, embed] : [embed];
            if (mapAttachment) embeds[0].setImage(mapAttachment.asset.imageUrl);

            return interaction.editReply({
                content: null,
                embeds,
                components: [],
                attachments: [],
                files: [finalPortrait?.file, mapAttachment?.file].filter(Boolean)
            });
        } catch (error) {
            if (error.message === 'PLAYER_NOT_FOUND') {
                return interaction.editReply({
                    content: 'Hãy dùng `/start` để tạo nhân vật trước.',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (error.message === 'SECRET_REALM_TICKET_REQUIRED') {
                return interaction.editReply({
                    content: 'Đạo hữu cần **Vé Bí Cảnh** để tiến vào nơi này.',
                    flags: MessageFlags.Ephemeral
                });
            }

            client.logger?.error('Biccanh command failed', {
                error: error instanceof Error ? error.message : String(error)
            });

            return interaction.editReply({
                content: 'Bí cảnh dao động bất thường, chưa thể tiến vào lúc này.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    async chooseDifficulty(interaction) {
        const menu = new StringSelectMenuBuilder()
            .setCustomId(`biccanh:difficulty:${interaction.id}`)
            .setPlaceholder('Chọn độ khó bí cảnh')
            .addOptions(Object.entries(DIFFICULTIES).map(([value, config]) => ({
                label: config.label,
                value,
                description: `${config.waveCount} đợt, tối đa ${config.maxRounds} vòng mỗi đợt`
            })));
        const message = await interaction.editReply({
            content: 'Chọn độ khó để tiến vào Bí Cảnh:',
            embeds: [],
            components: [new ActionRowBuilder().addComponents(menu)]
        });

        try {
            const selected = await ComponentSession.forMessage({
                interaction,
                message,
                customId: `biccanh:difficulty:${interaction.id}`
            }).next();
            const difficulty = DIFFICULTIES[selected.values[0]];

            await selected.deferUpdate();
            await interaction.editReply({
                content: `Đang mở Bí Cảnh độ khó **${difficulty.label}**...`,
                components: []
            });
            return difficulty;
        } catch {
            await interaction.editReply({
                content: 'Lựa chọn độ khó đã hết hạn. Hãy dùng lại `/biccanh`.',
                embeds: [],
                components: []
            });
            return null;
        }
    }
}
