import BaseCommand from '../../core/BaseCommand.js';
import { EmbedBuilder, MessageFlags } from 'discord.js';
import { displayDecimal } from '../../shared/numeric/FixedDecimal.js';

export default class DotPhaCommand extends BaseCommand {
    constructor() {
        super({
            name: 'dotpha',
            description: 'Trung kich binh canh, dot pha canh gioi cao hon!'
        });
    }

    async execute(interaction, client) {
        await interaction.deferReply();
        const userId = interaction.user.id;

        try {
            const result = await client.breakthroughService.attemptBreakthrough(userId, {
                operationId: interaction.id
            });

            if (!result) {
                return interaction.editReply({
                    content: 'Dao huu chua buoc chan vao tien do. Go `/start` de bat dau!',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (result.outcome === 'INVALID_REALM') {
                return interaction.editReply({
                    content: 'Canh gioi hien tai cua dao huu khong hop le. Hay lien he quan tri de kiem tra du lieu nhan vat.',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (result.outcome === 'MAX_REALM') {
                return interaction.editReply('Đạo hữu đã tới cảnh giới cuối. Khi tu vi viên mãn, hãy dùng `/luanhoi`.');
            }

            if (result.outcome === 'INSUFFICIENT_CULTIVATION') {
                return interaction.editReply(`Dao huu chua du hoa hau! Can tu luyen them **${displayDecimal(result.missingCultivation)} Tu vi** nua moi co the trung kich binh canh.`);
            }

            if (result.outcome === 'NEXT_REALM_NOT_FOUND') {
                return interaction.editReply('Thien dao hien chua mo ra canh gioi tiep theo. Dao huu hay cho ban cap nhat sau.');
            }

            if (result.outcome === 'SUCCESS') {
                const embed = new EmbedBuilder()
                    .setTitle('DOT PHA THANH CONG')
                    .setColor('#f1c40f')
                    .setDescription(`Thien dia bien sac, chuc mung **${result.player.name}** da pha vo binh canh!`)
                    .addFields(
                        { name: 'Canh Gioi Moi', value: `**${result.nextRealmInfo.name} — Tang ${result.nextRealmStage}**`, inline: true },
                        { name: 'Tu Vi Con Lai', value: `${displayDecimal(result.remainingCultivation)} Diem`, inline: true },
                        {
                            name: 'The Chat Thang Tien',
                            value: `HP: ${result.player.baseHp} -> **${result.newStats.hp}**\nATK: ${result.player.baseAtk} -> **${result.newStats.atk}**\nDEF: ${result.player.baseDef} -> **${result.newStats.def}**\nSPD: ${result.player.baseSpd} -> **${result.newStats.spd}**`,
                            inline: false
                        }
                    )
                    .setThumbnail(interaction.user.displayAvatarURL());

                return interaction.editReply({ embeds: [embed] });
            }

            return interaction.editReply(`DOT PHA THAT BAI!\nDao huu khong the khong che linh khi và hao ton ${result.failureCultivationLossPercent || 25}% lượng Tu vi yêu cầu. Tu vi còn lại: **${displayDecimal(result.remainingCultivation || 0)}**.`);
        } catch (error) {
            client.logger?.error('Dotpha command failed', {
                error: error instanceof Error ? error.message : String(error)
            });

            return interaction.editReply({
                content: 'Loi kiep qua manh, khong the dot pha luc nay!',
                flags: MessageFlags.Ephemeral
            });
        }
    }
}

