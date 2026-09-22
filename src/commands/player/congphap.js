import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import BaseCommand from '../../core/BaseCommand.js';
import CultivationArtManager from '../../managers/CultivationArtManager.js';
import PlayerRepository from '../../repositories/PlayerRepository.js';
import SelectPrompt from '../../core/SelectPrompt.js';

export default class CultivationArtCommand extends BaseCommand {
    constructor() {
        super({ name: 'congphap', description: 'Xem, học hoặc đổi công pháp tu luyện' });
    }

    getSlashData() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addSubcommand((sub) => sub.setName('xem').setDescription('Xem các công pháp đã học'))
            .addSubcommand((sub) => sub.setName('hoc').setDescription('Chọn và học công pháp trong túi'))
            .addSubcommand((sub) => sub.setName('dung').setDescription('Chọn công pháp đã lĩnh ngộ để tu luyện'));
    }

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const action = interaction.options.getSubcommand();

        try {
            if (action === 'hoc') {
                const record = await PlayerRepository.findById(interaction.user.id);
                if (!record) return interaction.editReply('Hãy dùng `/start` để tạo nhân vật trước.');
                const learned = await CultivationArtManager.list(interaction.user.id);
                const learnedIds = new Set(learned.map((art) => art.id));
                const books = record.inventory.filter((item) => item.type === 'CULTIVATION_ART'
                    && !learnedIds.has(item.cultivationArtId));
                if (!books.length) return interaction.editReply('Trong túi không có bí kíp công pháp để lĩnh ngộ.');
                const inventoryId = await SelectPrompt.choose(interaction, {
                    customId: `learn_art:${interaction.id}`,
                    placeholder: 'Chọn công pháp muốn lĩnh ngộ',
                    prompt: 'Chọn một bí kíp công pháp trong túi:',
                    options: books.map((item) => ({
                        label: `${item.name} [${item.rarityInfo.name}]`,
                        value: item.uuid,
                        description: item.description
                    }))
                });
                if (!inventoryId) return;
                const art = await CultivationArtManager.learn(interaction.user.id, inventoryId);
                return interaction.editReply({ content: `Đã lĩnh ngộ và vận hành **${art.name}**.`, components: [] });
            }
            if (action === 'dung') {
                const learnedArts = await CultivationArtManager.list(interaction.user.id);
                const selectableArts = learnedArts.filter((art) => !art.active);
                if (!selectableArts.length) return interaction.editReply('Không có công pháp khác để chuyển đổi.');
                const artId = await SelectPrompt.choose(interaction, {
                    customId: `equip_art:${interaction.id}`,
                    placeholder: 'Chọn công pháp muốn vận hành',
                    prompt: 'Chọn một công pháp đã lĩnh ngộ:',
                    options: selectableArts.map((art) => ({
                        label: `${art.name} [${art.rarity}]`,
                        value: art.id,
                        description: art.description
                    }))
                });
                if (!artId) return;
                const art = await CultivationArtManager.equip(interaction.user.id, artId);
                return interaction.editReply({ content: `Đã chuyển sang tu luyện **${art.name}**.`, components: [] });
            }

            const arts = await CultivationArtManager.list(interaction.user.id);
            const embed = new EmbedBuilder().setTitle('Công pháp đã lĩnh ngộ').setColor('#2E8B57');
            embed.setDescription(arts.length
                ? arts.map((art) => `${art.active ? '◆' : '◇'} **${art.name}** (${art.id}) [${art.rarity}]`).join('\n')
                : 'Chưa lĩnh ngộ công pháp nào.');
            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            const messages = {
                ITEM_NOT_FOUND: 'Không tìm thấy bí kíp này trong túi.',
                NOT_ART: 'Vật phẩm đã chọn không phải công pháp.',
                ALREADY_LEARNED: 'Đạo hữu đã lĩnh ngộ công pháp này.',
                ART_NOT_LEARNED: 'Đạo hữu chưa lĩnh ngộ công pháp có mã này.'
            };
            if (messages[error.message]) return interaction.editReply({ content: messages[error.message], components: [] });
            console.error('Lỗi tại lệnh /congphap:', error);
            return interaction.editReply({ content: 'Không thể vận hành công pháp lúc này.', components: [] });
        }
    }
}
