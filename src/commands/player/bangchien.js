import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
    StringSelectMenuBuilder
} from 'discord.js';
import BaseCommand from '../../core/BaseCommand.js';

export default class BangChienCommand extends BaseCommand {
    constructor() {
        super({
            name: 'bangchien',
            description: 'Bang hoi chien quy mo lon',
            availability: 'PLANNED'
        });
    }

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const embed = new EmbedBuilder()
            .setTitle('Bang Chien')
            .setColor('#9B59B6')
            .setDescription('Guild-vs-guild runtime chua mo. Command nay dang ky UI khung theo roadmap, chua cho bao danh that.')
            .addFields(
                { name: 'Can co', value: 'Sect runtime, party subgroup, battlefield session, multi-team battle.' },
                { name: 'Trang thai', value: 'Locked cho den Phase multiplayer/combat expansion.' }
            );
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('bangchien:join').setLabel('Bao danh tham chien').setStyle(ButtonStyle.Primary).setDisabled(true),
            new ButtonBuilder().setCustomId('bangchien:plan').setLabel('Chia tieu doi').setStyle(ButtonStyle.Secondary).setDisabled(true)
        );
        const selectRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('bangchien:focus')
                .setPlaceholder('Chon muc tieu tap trung hoa luc')
                .setDisabled(true)
                .addOptions([
                    { label: 'Tien phong dich', value: 'frontline' },
                    { label: 'DPS dich', value: 'dps' },
                    { label: 'Ho tro dich', value: 'support' }
                ])
        );

        return interaction.editReply({ embeds: [embed], components: [row, selectRow] });
    }
}
