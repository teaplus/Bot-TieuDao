import { MessageFlags } from 'discord.js';
import { createCommandHelpPayload } from '../../application/discord/CommandHelpPresentation.js';
import BaseCommand from '../../core/BaseCommand.js';

export default class TroGiupCommand extends BaseCommand {
    constructor() {
        super({
            name: 'trogiup',
            description: 'Xem cẩm nang slash command của Tiểu Đạo'
        });
    }

    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        return interaction.editReply(createCommandHelpPayload(client.commands));
    }
}
