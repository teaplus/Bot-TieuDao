import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import BaseCommand from '../../core/BaseCommand.js';

export default class ToDoiCommand extends BaseCommand {
    constructor() {
        super({
            name: 'todoi',
            description: 'He thong to doi va formation',
            availability: 'PLANNED'
        });
    }

    getSlashData() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addSubcommand((subcommand) => subcommand.setName('tao').setDescription('Tao to doi moi'))
            .addSubcommand((subcommand) => subcommand
                .setName('moi')
                .setDescription('Moi mot dao huu vao to doi')
                .addUserOption((option) => option.setName('dao_huu').setDescription('Nguoi muon moi').setRequired(true)))
            .addSubcommand((subcommand) => subcommand.setName('danhsach').setDescription('Xem to doi hien tai'));
    }

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const action = interaction.options.getSubcommand();
        const embed = new EmbedBuilder()
            .setTitle('To Doi')
            .setColor('#16A085')
            .setDescription('Party runtime chua mo. Command da duoc dang ky de giu dung kien truc slash command.')
            .addFields(
                { name: 'Lenh vua goi', value: `/${this.name} ${action}`, inline: true },
                { name: 'Trang thai roadmap', value: 'Can Session model + Party runtime + multi-entity battle truoc khi cho chay that.' }
            );

        return interaction.editReply({ embeds: [embed] });
    }
}
