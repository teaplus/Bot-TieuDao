import { EmbedBuilder } from 'discord.js';

export const DISCORD_COLORS = Object.freeze({
    SUCCESS: '#2ECC71',
    WARNING: '#F1C40F',
    DANGER: '#C0392B',
    INFO: '#3498DB',
    ARCANE: '#8E44AD',
    GOLD: '#D4A017',
    LOCKED: '#7F8C8D'
});

export default class DiscordEmbedFactory {
    static base({ title, color = DISCORD_COLORS.INFO, description, interaction }) {
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setColor(color);

        if (description) {
            embed.setDescription(description);
        }

        if (interaction?.user) {
            embed.setThumbnail(interaction.user.displayAvatarURL());
        }

        return embed;
    }

    static success(options) {
        return DiscordEmbedFactory.base({
            ...options,
            color: options.color || DISCORD_COLORS.SUCCESS
        });
    }

    static danger(options) {
        return DiscordEmbedFactory.base({
            ...options,
            color: options.color || DISCORD_COLORS.DANGER
        });
    }

    static locked({ title, description, interaction, requirements = [] }) {
        const embed = DiscordEmbedFactory.base({
            title,
            description,
            interaction,
            color: DISCORD_COLORS.LOCKED
        });

        if (requirements.length) {
            embed.addFields({
                name: 'Can co',
                value: requirements.join('\n')
            });
        }

        return embed;
    }
}
