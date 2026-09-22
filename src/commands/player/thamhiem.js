import { EmbedBuilder, MessageFlags } from 'discord.js';
import RewardTextFormatter from '../../application/discord/RewardTextFormatter.js';
import BattleLogAnimator from '../../application/discord/BattleLogAnimator.js';
import {
    createMapArtAttachment,
    createMonsterPortraitAttachment
} from '../../application/discord/UiAssetResolver.js';
import {
    EXPLORATION_DRAW_MESSAGE,
    formatBattleOutcome
} from '../../application/discord/BattleOutcomeText.js';
import BaseCommand from '../../core/BaseCommand.js';

export default class ThamHiemCommand extends BaseCommand {
    constructor() {
        super({
            name: 'thamhiem',
            description: 'Thám hiểm tại map hiện tại, chiến đấu và nhận chiến lợi phẩm'
        });
    }

    async execute(interaction, client) {
        await interaction.deferReply();

        try {
            const result = await client.explorationService.explore(interaction.user.id, {
                operationId: interaction.id
            });
            if (result.encounterType === 'MYSTERY_MERCHANT') {
                const expiresAt = Math.floor(
                    new Date(result.merchantSession.expiresAt).getTime() / 1000
                );
                const embed = new EmbedBuilder()
                    .setColor('#8E44AD')
                    .setTitle('🧙 Kỳ Ngộ · Thương Nhân Thần Bí')
                    .setDescription([
                        `Tại **${result.event.mapName}**, không gian chợt gợn sóng. Một thương nhân áo đen hiện thân giữa màn sương.`,
                        '',
                        `Ông ta bày ra **${result.merchantSession.entries.length}** món kỳ trân, nhưng mỗi món chỉ có một.` ,
                        `Phiên giao dịch kết thúc <t:${expiresAt}:R>.`,
                        '',
                        'Dùng `/shop`, chọn **Thương Nhân Kỳ Ngộ** để xem và mua hàng.'
                    ].join('\n'));
                return interaction.editReply({ embeds: [embed], components: [] });
            }
            if (result.encounterType === 'FORTUNE_REWARD') {
                const rewardText = RewardTextFormatter.format(
                    result.reward,
                    client.gameDataManager,
                    'Cơ duyên thoáng qua, không để lại vật hữu hình.'
                );
                const embed = new EmbedBuilder()
                    .setColor('#D4AF37')
                    .setTitle('✨ Kỳ Ngộ · Linh Quang Dẫn Lộ')
                    .setDescription(`Tại **${result.event.mapName}**, đạo hữu bắt gặp một luồng linh quang ẩn trong thiên địa.`)
                    .addFields({ name: '🎁 Cơ duyên thu được', value: rewardText.slice(0, 1024) });
                return interaction.editReply({ embeds: [embed], components: [] });
            }
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
                title: 'Thám Hiểm Đang Giao Chiến',
                description: `Đạo hữu đối đầu ${monsterLabel} tại ${mapName}.`,
                drawMessage: EXPLORATION_DRAW_MESSAGE,
                interaction,
                thumbnailUrl: monsterPortrait?.asset.imageUrl,
                files: monsterPortrait ? [monsterPortrait.file] : []
            });
            const battleLogEmbed = BattleLogAnimator.renderFinalEmbed(result.battleResult, {
                title: 'Diễn Biến Thám Hiểm',
                description: `${monsterLabel} (${monster.realmName}) tại ${mapName}.`,
                status: formatBattleOutcome(result.outcome, {
                    drawMessage: EXPLORATION_DRAW_MESSAGE
                }),
                drawMessage: EXPLORATION_DRAW_MESSAGE,
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
                embeds: [battleLogEmbed],
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
                return interaction.editReply({ content: 'Cảnh giới chưa đủ để thám hiểm map này.', flags: MessageFlags.Ephemeral });
            }
            if (error.message.startsWith('MAP_NOT_ACTIVE:') || error.message.startsWith('MAP_ACTIVITY_NOT_SUPPORTED:')) {
                return interaction.editReply({ content: 'Map hiện tại chưa mở nội dung Thám Hiểm.', flags: MessageFlags.Ephemeral });
            }

            client.logger?.error('Thamhiem command failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            return interaction.editReply({
                content: 'Hoang địa biến động, chưa thể thám hiểm lúc này.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
}
