import { MessageFlags } from 'discord.js';
import ComponentSession from '../../application/discord/ComponentSession.js';
import { createSectPayload } from '../../application/discord/SectPresentation.js';
import BaseCommand from '../../core/BaseCommand.js';

const SESSION_TIMEOUT_MS = 2 * 60 * 1000;

function errorMessage(error) {
    const messages = {
        PLAYER_NOT_FOUND: 'Hãy dùng `/start` để tạo nhân vật trước.',
        SECT_NOT_FOUND: 'Không tìm thấy Tông Môn đã chọn.',
        SECT_NOT_JOINED: 'Đạo hữu hiện chưa thuộc Tông Môn nào.',
        ALREADY_JOINED_SECT: 'Đạo hữu phải rời Tông Môn hiện tại trước khi chọn truyền thừa mới.',
        SECT_EXCHANGE_RULE_NOT_FOUND: 'Không tìm thấy danh mục đổi thưởng đã chọn.',
        REALM_LOCKED: 'Cảnh giới hiện tại chưa đủ để đổi bí tịch này.',
        UNSUPPORTED_SECT_CURRENCY: 'Loại tiền tệ của giao dịch chưa được hỗ trợ.',
        SECT_REWARD_POOL_EMPTY: 'Tông Môn chưa có bí tịch phù hợp trong kho truyền thừa này.',
        SECT_REWARD_NOT_FOUND: 'Bí tịch được chọn không còn tồn tại trong GameData.',
        INSUFFICIENT_SECT_POINT: 'Điểm Tông Môn không đủ để đổi bí tịch.',
        SECT_REWARD_ALREADY_OWNED: 'Đạo hữu đã học hoặc đang sở hữu bí kíp truyền thừa này.',
        INVENTORY_FULL: 'Túi Trữ Vật đã đầy; hãy dọn chỗ rồi thử lại.'
    };
    if (error?.message === 'SECT_REJOIN_COOLDOWN' && error.rejoinAvailableAt) {
        return `Đạo tâm chưa tĩnh. Có thể gia nhập lại <t:${Math.floor(
            new Date(error.rejoinAvailableAt).getTime() / 1000
        )}:R>.`;
    }
    return messages[error?.message]
        || 'Tông Môn đại trận dao động, chưa thể thực hiện thao tác lúc này.';
}

export async function loadSectPanelState(client, playerId) {
    const overview = await client.sectService.listSects(playerId);
    const exchange = overview.currentSectId
        ? await client.sectService.listExchangeRules(playerId)
        : null;
    return {
        overview,
        exchange,
        gameDataManager: client.gameDataManager
    };
}

function membershipCooldownLabel(state) {
    const seconds = Number(state.overview.membershipPolicy.leaveCooldownSeconds || 0);
    const days = seconds / 86400;
    if (Number.isInteger(days) && days > 0) return `${days} ngày`;
    const hours = seconds / 3600;
    if (Number.isInteger(hours) && hours > 0) return `${hours} giờ`;
    return `${seconds} giây`;
}

export default class SectCommand extends BaseCommand {
    constructor() {
        super({
            name: 'tongmon',
            description: 'Xem, gia nhập và đổi truyền thừa Tông Môn'
        });
    }

    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        if (!client.sectService) {
            return interaction.editReply('Hệ thống Tông Môn chưa sẵn sàng.');
        }

        let state;
        try {
            state = await loadSectPanelState(client, interaction.user.id);
        } catch (error) {
            client.logger?.error('Sect dashboard read failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            return interaction.editReply(errorMessage(error));
        }

        let selectedSectId = state.overview.currentSectId
            || state.overview.sects[0]?.id
            || null;
        let selectedRuleId = state.exchange?.rules[0]?.id || null;
        let pendingAction = null;
        let notice = null;
        const sessionId = interaction.id;
        const render = (options = {}) => createSectPayload({
            interaction,
            state,
            selectedSectId,
            selectedRuleId,
            sessionId,
            pendingAction,
            notice,
            ...options
        });
        const message = await interaction.editReply(render());

        await ComponentSession.forMessage({
            interaction,
            message,
            prefix: `tongmon:${sessionId}:`,
            timeoutMs: SESSION_TIMEOUT_MS
        }).run({
            onCollect: async (component) => {
                const action = component.customId.split(':')[2];
                if (action === 'close') {
                    await component.update(render({
                        disabled: true,
                        notice: 'Đã đóng Tông Môn lệnh.'
                    }));
                    return false;
                }

                await component.deferUpdate();
                try {
                    if (action === 'sect') {
                        selectedSectId = component.values[0];
                        pendingAction = null;
                        notice = null;
                    } else if (action === 'rule') {
                        selectedRuleId = component.values[0];
                        pendingAction = null;
                        notice = null;
                    } else if (action === 'join') {
                        if (pendingAction?.type === 'JOIN'
                            && pendingAction.sectId === selectedSectId) {
                            const result = await client.sectService.joinSect(
                                interaction.user.id,
                                selectedSectId,
                                { operationId: component.id }
                            );
                            notice = `✅ Đã bái nhập **${result.sect.name}**. Truyền thừa Tông Môn đã có hiệu lực.`;
                            pendingAction = null;
                            state = await loadSectPanelState(client, interaction.user.id);
                            selectedSectId = state.overview.currentSectId;
                            selectedRuleId = state.exchange?.rules[0]?.id || null;
                        } else {
                            pendingAction = { type: 'JOIN', sectId: selectedSectId };
                            const sect = state.overview.sects.find(
                                (entry) => entry.id === selectedSectId
                            );
                            notice = `⚠️ Xác nhận bái nhập **${sect?.name || selectedSectId}**. Muốn đổi Tông phải rời và chờ ${membershipCooldownLabel(state)}.`;
                        }
                    } else if (action === 'exchange') {
                        const result = await client.sectService.exchangeReward(
                            interaction.user.id,
                            selectedRuleId,
                            { operationId: component.id }
                        );
                        notice = `🎁 Đã dùng Điểm Tông Môn đổi được **${result.reward.itemName} ×${result.reward.quantity}**.`;
                        pendingAction = null;
                        state = await loadSectPanelState(client, interaction.user.id);
                    } else if (action === 'leave') {
                        if (pendingAction?.type === 'LEAVE') {
                            const result = await client.sectService.leaveSect(
                                interaction.user.id,
                                { operationId: component.id }
                            );
                            notice = `🚪 Đã rời **${result.sect.name}**. Có thể gia nhập lại <t:${Math.floor(
                                new Date(result.rejoinAvailableAt).getTime() / 1000
                            )}:R>; Điểm Tông Môn được bảo lưu.`;
                            pendingAction = null;
                            state = await loadSectPanelState(client, interaction.user.id);
                            selectedRuleId = null;
                        } else {
                            pendingAction = { type: 'LEAVE' };
                            notice = `⚠️ Rời Tông sẽ mất toàn bộ nội tại trong ${membershipCooldownLabel(state)}. Nhấn **Xác nhận rời** để tiếp tục; Điểm Tông Môn vẫn được giữ.`;
                        }
                    } else if (action === 'refresh') {
                        pendingAction = null;
                        state = await loadSectPanelState(client, interaction.user.id);
                        selectedRuleId = state.exchange?.rules.find(
                            (rule) => rule.id === selectedRuleId
                        )?.id || state.exchange?.rules[0]?.id || null;
                        notice = '🔄 Đã cập nhật trạng thái Tông Môn.';
                    }
                } catch (error) {
                    client.logger?.error('Sect panel action failed', {
                        action,
                        error: error instanceof Error ? error.message : String(error)
                    });
                    pendingAction = null;
                    notice = `⚠️ ${errorMessage(error)}`;
                    state = await loadSectPanelState(
                        client,
                        interaction.user.id
                    ).catch(() => state);
                }

                await interaction.editReply(render());
                return true;
            },
            onTimeout: async () => interaction.editReply(render({
                disabled: true,
                notice: 'Phiên Tông Môn đã hết hạn. Dùng lại `/tongmon` để tiếp tục.'
            }))
        });
        return null;
    }
}
