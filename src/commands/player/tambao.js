import { EmbedBuilder, MessageFlags } from 'discord.js';
import BaseCommand from '../../core/BaseCommand.js';
import { formatIntegerAmount } from '../../shared/numeric/IntegerAmount.js';

function formatTime(seconds) {
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) return `${minutes} phut`;
    return `${Math.floor(minutes / 60)} gio ${minutes % 60} phut`;
}

function formatReward(reward) {
    if (reward.type === 'CURRENCY') {
        return `**${formatIntegerAmount(reward.amount || 0)} ${reward.currencyId}**`;
    }

    if (reward.type === 'ITEM') {
        return `**${reward.itemId}** x${reward.quantity || 1}`;
    }

    if (reward.type === 'EQUIPMENT') {
        return `**${reward.itemId}** (${reward.rarity || 'COMMON'})`;
    }

    return `**${reward.type || 'UNKNOWN'}**`;
}

export default class TreasureHuntCommand extends BaseCommand {
    constructor() {
        super({
            name: 'tambao',
            description: 'Tham dò bí cảnh để tìm linh thạch và bảo vật',
            cooldown: 300
        });
    }

    async execute(interaction, client) {
        await interaction.deferReply();
        try {
            const result = await client.treasureHuntService.hunt(interaction.user.id, {
                operationId: interaction.id
            });
            const rewards = result.reward?.applied?.rewards || [];
            const embed = new EmbedBuilder()
                .setTitle('Tam bao tro ve')
                .setColor('#D4A017')
                .setDescription('Dao huu vuot qua hiem dia va tim duoc mot co duyen.')
                .addFields({
                    name: 'Thu hoach',
                    value: rewards.length
                        ? rewards.map(formatReward).join('\n')
                        : 'Khong tim thay co duyen nao.'
                });

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            if (error.message === 'PLAYER_NOT_FOUND') {
                return interaction.editReply({ content: 'Hay dung `/start` de tao nhan vat truoc.', flags: MessageFlags.Ephemeral });
            }
            if (error.message === 'COOLDOWN') {
                return interaction.editReply({
                    content: `Linh khi bi canh chua khoi phuc. Co the tam bao lai sau **${formatTime(error.remainingSeconds)}**.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            client.logger?.error('Tambao command failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            return interaction.editReply('Bi canh bien dong, chua the tam bao luc nay.');
        }
    }
}
