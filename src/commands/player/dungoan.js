import { MessageFlags } from 'discord.js';
import DiscordEmbedFactory, { DISCORD_COLORS } from '../../application/discord/DiscordEmbedFactory.js';
import RewardTextFormatter from '../../application/discord/RewardTextFormatter.js';
import BattleLogAnimator from '../../application/discord/BattleLogAnimator.js';
import {
    createMapArtAttachment,
    createMonsterPortraitAttachment
} from '../../application/discord/UiAssetResolver.js';
import { formatBattleOutcome } from '../../application/discord/BattleOutcomeText.js';
import BaseCommand from '../../core/BaseCommand.js';

export default class DuNgoanCommand extends BaseCommand {
    constructor() {
        super({
            name: 'dungoan',
            description: 'Du ngoạn hoang địa, kích hoạt một lần khám phá',
            cooldown: 120
        });
    }

    async execute(interaction, client) {
        await interaction.deferReply();

        try {
            const result = await client.explorationService.explore(interaction.user.id, {
                operationId: interaction.id
            });
            const monster = result.encounter.monster;
            const monsterLabel = monster.qualityName
                ? `[${monster.qualityName}] ${monster.name}`
                : monster.name;
            const mapName = result.encounter.mapName || result.encounter.mapId || 'map hiện tại';
            const mapAttachment = createMapArtAttachment(result.encounter.mapId);
            const monsterPortrait = createMonsterPortraitAttachment(monster);
            const rewardText = RewardTextFormatter.format(
                result.reward,
                client.gameDataManager,
                'Không thu thập được vật phẩm nào.'
            ).slice(0, 1024);
            await BattleLogAnimator.play(interaction, result.battleResult, {
                title: 'Du Ngoạn Đang Giao Chiến',
                description: `Đạo hữu đối đầu ${monsterLabel} tại ${mapName}.`,
                interaction,
                thumbnailUrl: monsterPortrait?.asset.imageUrl,
                files: monsterPortrait ? [monsterPortrait.file] : []
            });
            const embed = DiscordEmbedFactory.base({
                title: result.outcome === 'VICTORY'
                    ? 'Du Ngoạn Có Duyên'
                    : result.outcome === 'DRAW' ? 'Du Ngoạn Bất Phân Thắng Bại' : 'Du Ngoạn Gặp Nạn',
                color: result.outcome === 'VICTORY'
                    ? DISCORD_COLORS.SUCCESS
                    : result.outcome === 'DRAW' ? DISCORD_COLORS.WARNING : DISCORD_COLORS.DANGER,
                description: `Đạo hữu gặp **${monsterLabel}** (${monster.realmName}) tại **${mapName}**.`,
                interaction
            })
                .addFields(
                    { name: 'Kết quả', value: `**${formatBattleOutcome(result.outcome)}** sau ${result.battleResult.rounds} vòng.` }
                );
            const battleLogEmbed = BattleLogAnimator.renderFinalEmbed(result.battleResult, {
                title: 'Diễn Biến Du Ngoạn',
                description: `${monsterLabel} (${monster.realmName}) tại ${mapName}.`,
                status: formatBattleOutcome(result.outcome),
                interaction,
                thumbnailUrl: monsterPortrait?.asset.imageUrl
            });
            if (result.outcome === 'VICTORY') {
                battleLogEmbed.addFields({
                    name: '🎁 Thu thập được',
                    value: rewardText,
                    inline: false
                });
            }
            if (mapAttachment) battleLogEmbed.setImage(mapAttachment.asset.imageUrl);

            return interaction.editReply({
                content: null,
                embeds: [battleLogEmbed, embed],
                components: [],
                attachments: [],
                files: [monsterPortrait?.file, mapAttachment?.file].filter(Boolean)
            });
        } catch (error) {
            if (error.message === 'PLAYER_NOT_FOUND') {
                return interaction.editReply({
                    content: 'Hãy dùng `/start` để tạo nhân vật trước.',
                    flags: MessageFlags.Ephemeral
                });
            }
            if (error.message.startsWith('MAP_LOCKED:')) {
                return interaction.editReply({ content: 'Cảnh giới chưa đủ để du ngoạn khu vực này.', flags: MessageFlags.Ephemeral });
            }
            if (error.message.startsWith('MAP_NOT_ACTIVE:') || error.message.startsWith('MAP_ACTIVITY_NOT_SUPPORTED:')) {
                return interaction.editReply({ content: 'Khu vực này hiện chưa mở cho Du Ngoạn.', flags: MessageFlags.Ephemeral });
            }

            client.logger?.error('Dungoan command failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            return interaction.editReply({
                content: 'Du ngoạn gặp biến cố, hãy thử lại sau.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
}
