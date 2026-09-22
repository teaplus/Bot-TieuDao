import { MessageFlags } from 'discord.js';
import ComponentSession from '../../application/discord/ComponentSession.js';
import {
    createCultivationLoadoutPayload,
    loadCultivationLoadoutState
} from '../../application/discord/CultivationLoadoutPresentation.js';
import BaseCommand from '../../core/BaseCommand.js';

const SESSION_TIMEOUT_MS = 2 * 60 * 1000;

const ERROR_MESSAGES = Object.freeze({
    ITEM_NOT_FOUND: 'Không tìm thấy bí kíp đã chọn trong Túi Trữ Vật.',
    NOT_SKILL_BOOK: 'Vật phẩm đã chọn không phải bí kíp Kỹ Năng.',
    ALREADY_LEARNED: 'Đạo hữu đã lĩnh ngộ nội dung này.',
    ART_NOT_LEARNED: 'Đạo hữu chưa lĩnh ngộ Công Pháp đã chọn.',
    ART_NOT_FOUND: 'Không tìm thấy dữ liệu Công Pháp đã chọn.',
    SKILL_NOT_LEARNED: 'Loadout chứa Kỹ Năng đạo hữu chưa lĩnh ngộ.',
    SKILL_LOADOUT_DUPLICATE: 'Một Kỹ Năng không thể chiếm nhiều ô.',
    SKILL_LOADOUT_CAPACITY_EXCEEDED: 'Số Kỹ Năng đã vượt giới hạn ô của cảnh giới hiện tại.',
    SKILL_LOADOUT_ACTIVE_LIMIT_EXCEEDED: 'Chỉ được trang bị tối đa 3 Kỹ Năng Chủ động.'
});

export default class CultivationArtCommand extends BaseCommand {
    constructor() {
        super({
            name: 'congphap',
            description: 'Quản lý Công Pháp tu luyện và loadout Kỹ Năng'
        });
    }

    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        let state;
        try {
            state = await loadCultivationLoadoutState(client, interaction.user.id);
        } catch (error) {
            client.logger?.error('Cultivation loadout read failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            return interaction.editReply(
                'Đạo vận hỗn loạn, chưa thể mở bảng Công Pháp lúc này.'
            );
        }
        if (!state) {
            return interaction.editReply('Hãy dùng `/start` để tạo nhân vật trước.');
        }

        const sessionId = interaction.id;
        let notice = null;
        let skillPage = 0;
        const render = (options = {}) => createCultivationLoadoutPayload({
            state,
            sessionId,
            notice,
            skillPage,
            ...options
        });
        const message = await interaction.editReply(render());

        await ComponentSession.forMessage({
            interaction,
            message,
            prefix: `congphap:${sessionId}:`,
            timeoutMs: SESSION_TIMEOUT_MS
        }).run({
            onCollect: async (component) => {
                const action = component.customId.split(':')[2];
                if (action === 'close') {
                    await component.update(render({
                        disabled: true,
                        notice: 'Đã đóng bảng Công Pháp.'
                    }));
                    return false;
                }

                await component.deferUpdate();
                try {
                    const selectedId = component.values?.[0];
                    if (action === 'skill-prev') {
                        skillPage = Math.max(0, skillPage - 1);
                        notice = null;
                    } else if (action === 'skill-next') {
                        skillPage += 1;
                        notice = null;
                    } else if (action === 'equip-art') {
                        const art = await client.cultivationArtService.equipCultivationArt(
                            interaction.user.id,
                            selectedId
                        );
                        notice = `✅ Đang vận hành **${art.name}**.`;
                    } else if (action === 'equip-skills') {
                        const result = await client.skillService.equipSkillLoadout(
                            interaction.user.id,
                            component.values || []
                        );
                        if (!result) throw new Error('PLAYER_NOT_FOUND');
                        notice = `✅ Đã cập nhật **${result.skillIds.length}/${result.capacity}** ô`
                            + ` · Chủ động **${result.activeCount}/${result.maxActiveSkills}**`
                            + ` · Bị động **${result.passiveCount}**.`;
                    } else if (action === 'learn-art') {
                        const art = await client.cultivationArtService.learnCultivationArt(
                            interaction.user.id,
                            selectedId
                        );
                        notice = `📖 Đã lĩnh ngộ và vận hành **${art.name}**.`;
                    } else if (action === 'learn-skill') {
                        const skill = await client.skillService.learnSkill(
                            interaction.user.id,
                            selectedId
                        );
                        notice = `✨ Đã lĩnh ngộ **${skill.name}**. Hãy chọn thanh Kỹ Năng để trang bị.`;
                    }
                    state = await loadCultivationLoadoutState(
                        client,
                        interaction.user.id
                    ) || state;
                } catch (error) {
                    notice = ERROR_MESSAGES[error.message]
                        || 'Không thể thay đổi Công Pháp/Kỹ Năng lúc này.';
                    client.logger?.error('Cultivation loadout action failed', {
                        action,
                        error: error instanceof Error ? error.message : String(error)
                    });
                    state = await loadCultivationLoadoutState(
                        client,
                        interaction.user.id
                    ).catch(() => state) || state;
                }

                await interaction.editReply(render());
                return true;
            },
            onTimeout: async () => {
                await interaction.editReply(render({
                    disabled: true,
                    notice: 'Bảng Công Pháp đã hết hạn. Dùng lại `/congphap` để tiếp tục.'
                }));
            }
        });
        return null;
    }
}
