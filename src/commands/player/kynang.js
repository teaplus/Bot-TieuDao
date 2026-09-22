import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import BaseCommand from '../../core/BaseCommand.js';
import EffectFormatter from '../../core/EffectFormatter.js';
import SkillManager from '../../managers/SkillManager.js';
import PlayerRepository from '../../repositories/PlayerRepository.js';
import SelectPrompt from '../../core/SelectPrompt.js';

export default class SkillCommand extends BaseCommand {
    constructor() {
        super({ name: 'kynang', description: 'Xem hoặc học kỹ năng tu tiên' });
    }

    getSlashData() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addSubcommand((sub) => sub.setName('xem').setDescription('Xem các kỹ năng đã học'))
            .addSubcommand((sub) => sub.setName('hoc').setDescription('Chọn và học kỹ năng trong túi'));
    }

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            if (interaction.options.getSubcommand() === 'hoc') {
                const record = await PlayerRepository.findById(interaction.user.id);
                if (!record) return interaction.editReply('Hãy dùng `/start` để tạo nhân vật trước.');
                const learnedIds = new Set(record.skills.map((skill) => skill.id));
                const books = record.inventory.filter((item) => item.type === 'SKILL_BOOK'
                    && !learnedIds.has(item.skillId));
                if (!books.length) return interaction.editReply('Trong túi không có bí kíp kỹ năng để lĩnh ngộ.');
                const inventoryId = await SelectPrompt.choose(interaction, {
                    customId: `learn_skill:${interaction.id}`,
                    placeholder: 'Chọn kỹ năng muốn lĩnh ngộ',
                    prompt: 'Chọn một bí kíp kỹ năng trong túi:',
                    options: books.map((item) => ({
                        label: `${item.name} [${item.rarityInfo.name}]`,
                        value: item.uuid,
                        description: `${item.skill?.type === 'PASSIVE' ? 'Bị động' : 'Chủ động'} • ${item.description}`
                    }))
                });
                if (!inventoryId) return;
                const skill = await SkillManager.learn(interaction.user.id, inventoryId);
                return interaction.editReply({
                    content: `Đã lĩnh ngộ **${skill.name}** (${skill.type === 'PASSIVE' ? 'bị động' : 'chủ động'}).`,
                    components: []
                });
            }

            const skills = await SkillManager.list(interaction.user.id);
            const embed = new EmbedBuilder().setTitle('Kỹ năng đã lĩnh ngộ').setColor('#C0392B');
            if (!skills.length) embed.setDescription('Chưa lĩnh ngộ kỹ năng nào.');
            for (const skill of skills) {
                const effects = skill.getEffects().map((effect) => EffectFormatter.format(effect)).join(', ');
                embed.addFields({
                    name: `${skill.name} [${skill.type === 'PASSIVE' ? 'Bị động' : 'Chủ động'}]`,
                    value: `${skill.description}${effects ? `\n${effects}` : `\nTiêu hao: ${skill.spiritCost} linh lực`}`
                });
            }
            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            const messages = {
                ITEM_NOT_FOUND: 'Không tìm thấy bí kíp này trong túi.',
                NOT_SKILL_BOOK: 'Vật phẩm đã chọn không phải bí kíp kỹ năng.',
                ALREADY_LEARNED: 'Đạo hữu đã lĩnh ngộ kỹ năng này.'
            };
            if (messages[error.message]) return interaction.editReply({ content: messages[error.message], components: [] });
            console.error('Lỗi tại lệnh /kynang:', error);
            return interaction.editReply({ content: 'Không thể lĩnh ngộ kỹ năng lúc này.', components: [] });
        }
    }
}
