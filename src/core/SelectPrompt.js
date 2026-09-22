import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';

export default class SelectPrompt {
    static async choose(interaction, { customId, placeholder, prompt, options }) {
        if (!options.length) return null;

        const menu = new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(placeholder)
            .addOptions(options.slice(0, 25).map((option) => ({
                label: option.label.slice(0, 100),
                value: String(option.value).slice(0, 100),
                description: option.description?.slice(0, 100)
            })));
        const message = await interaction.editReply({
            content: prompt,
            embeds: [],
            components: [new ActionRowBuilder().addComponents(menu)]
        });

        try {
            const selected = await message.awaitMessageComponent({
                filter: (component) => component.user.id === interaction.user.id
                    && component.customId === customId,
                time: 60_000
            });
            await selected.deferUpdate();
            return selected.values[0];
        } catch (error) {
            await interaction.editReply({ content: 'Lựa chọn đã hết hạn. Hãy dùng lại lệnh.', components: [] });
            return null;
        }
    }
}
