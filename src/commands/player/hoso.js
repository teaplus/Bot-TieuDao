import { EmbedBuilder, MessageFlags } from 'discord.js';
import BaseCommand from '../../core/BaseCommand.js';
import EffectFormatter from '../../core/EffectFormatter.js';
import { compareDecimal, displayDecimal } from '../../shared/numeric/FixedDecimal.js';
import { formatIntegerAmount } from '../../shared/numeric/IntegerAmount.js';

export default class ProfileCommand extends BaseCommand {
    constructor() {
        super({ name: 'hoso', description: 'Xem ho so, chi so va hieu ung nhan vat' });
    }

    async execute(interaction, client) {
        await interaction.deferReply();
        const profileView = await client.playerReadService.getPublicProfileView(interaction.user.id);
        if (!profileView) {
            return interaction.editReply({ content: 'Hay dung `/start` de tao nhan vat truoc.', flags: MessageFlags.Ephemeral });
        }

        const effects = profileView.effects
            .filter((effect) => effect.stat !== 'cultivation_speed' || effect.value !== 1)
            .map((effect) => `• ${EffectFormatter.format(effect)}`)
            .join('\n') || 'Khong co hieu ung cong them';
        const equipmentText = profileView.equipment.length
            ? profileView.equipment.map((item) => `• ${item.slot}: **${item.name}** [${item.rarityName}]`).join('\n')
            : 'Chua trang bi phap bao';
        const skillText = profileView.skills.length
            ? profileView.skills.map((skill) => `• **${skill.name}** (${skill.type === 'PASSIVE' ? 'Bi dong' : 'Chu dong'})`).join('\n')
            : 'Chua linh ngo ky nang';

        const embed = new EmbedBuilder()
            .setTitle(`Ho so tu tien: ${profileView.name}`)
            .setColor('#C89B3C')
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                { name: 'Dao co', value: `Canh gioi: **${profileView.realm.name} — Tang ${profileView.realm.stage}**\nLinh can: **${profileView.spiritualRoot}${profileView.spiritRootQuality ? ` — ${profileView.spiritRootQuality.name}` : ''}**\nCong phap: **${profileView.cultivationArt.name}** [${profileView.cultivationArt.rarityName}]` },
                { name: 'Tai san', value: `Linh thach: **${formatIntegerAmount(profileView.spiritStones)}**`, inline: true },
                {
                    name: 'Tu luyen (du tinh)',
                    value: `Tu vi: **${displayDecimal(profileView.cultivation.current)}**\nToc do: **${profileView.cultivation.speedPerMinute}/phut**\nChua nhan: **${compareDecimal(profileView.cultivation.pending, 0) > 0 ? displayDecimal(profileView.cultivation.pending) : '0'}**`,
                    inline: true
                },
                { name: 'Chi so', value: `HP **${profileView.stats.hp}** | ATK **${profileView.stats.atk}** | DEF **${profileView.stats.def}** | SPD **${profileView.stats.spd}**` },
                { name: 'Trang bi', value: equipmentText },
                { name: 'Ky nang', value: skillText },
                { name: 'Tong hieu ung', value: effects.slice(0, 1024) }
            );

        return interaction.editReply({ embeds: [embed] });
    }
}

