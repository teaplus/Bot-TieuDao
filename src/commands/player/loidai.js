import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags
} from 'discord.js';
import BaseCommand from '../../core/BaseCommand.js';

export default class LoiDaiCommand extends BaseCommand {
    constructor() {
        super({
            name: 'loidai',
            description: 'Khieu chien PvP va leo bang xep hang',
            availability: 'PLANNED'
        });
    }

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const embed = new EmbedBuilder()
            .setTitle('Loi Dai')
            .setColor('#E74C3C')
            .setDescription('PvP runtime chua mo. Can player-vs-player battle entity, matchmaking va ranking truoc khi kich hoat.')
            .addFields(
                { name: 'Ghep cap ngau nhien', value: 'Se mo sau khi co matchmaking service.', inline: false },
                { name: 'Giao huu', value: 'Se mo sau khi co challenge session.', inline: false }
            );
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('loidai:matchmaking').setLabel('Ghep cap ngau nhien').setStyle(ButtonStyle.Primary).setDisabled(true),
            new ButtonBuilder().setCustomId('loidai:friendly').setLabel('Giao huu @user').setStyle(ButtonStyle.Secondary).setDisabled(true)
        );

        return interaction.editReply({ embeds: [embed], components: [row] });
    }
}
