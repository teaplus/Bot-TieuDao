import { MessageFlags } from 'discord.js';

export default class DiscordResponse {
    static ephemeral(payload) {
        return this.withFlags(payload, MessageFlags.Ephemeral);
    }

    static error(content = 'Thien dia linh khi hon loan, khong the thuc thi phap thuat luc nay!') {
        return this.ephemeral({ content });
    }

    static withFlags(payload, flags) {
        if (typeof payload === 'string') {
            return {
                content: payload,
                flags
            };
        }

        return {
            ...payload,
            flags: payload.flags ?? flags
        };
    }

    static async safeReply(interaction, payload) {
        if (interaction.replied || interaction.deferred) {
            return interaction.followUp(payload);
        }

        return interaction.reply(payload);
    }
}
