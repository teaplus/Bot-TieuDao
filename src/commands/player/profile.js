import { MessageFlags } from 'discord.js';
import ComponentSession from '../../application/discord/ComponentSession.js';
import {
    createInventoryPayload,
    INVENTORY_FILTERS
} from '../../application/discord/InventoryPresentation.js';
import BaseCommand from '../../core/BaseCommand.js';

const SESSION_TIMEOUT_MS = 2 * 60 * 1000;

export function formatItemUseNotice(result) {
    switch (result?.outcome) {
        case 'CULTIVATION_PILL_USED':
            return `✅ Đã dùng **${result.itemName}**, nhận **${result.appliedGain} tu vi**. `
                + `Hiện tại: **${result.cultivation}/${result.requiredCultivation}**.`;
        case 'ITEM_REALM_MISMATCH':
            return `⚠️ Đan dược này chỉ dùng tại cảnh giới **${result.requiredRealmCode}**; `
                + `cảnh giới hiện tại là **${result.currentRealmCode || 'không xác định'}**.`;
        case 'CULTIVATION_ALREADY_FULL':
            return '⚠️ Tu vi tầng hiện tại đã viên mãn. Hãy đột phá trước khi dùng thêm.';
        case 'ITEM_NOT_USABLE':
        case 'ITEM_ACTION_NOT_SUPPORTED':
            return '⚠️ Vật phẩm này chưa có cách sử dụng trực tiếp.';
        case 'PLAYER_NOT_FOUND':
            return '⚠️ Không tìm thấy nhân vật.';
        default:
            return '⚠️ Không thể sử dụng vật phẩm lúc này.';
    }
}

export default class InventoryCommand extends BaseCommand {
    constructor() {
        super({
            name: 'tuido',
            description: 'Xem và phân loại vật phẩm trong túi trữ vật'
        });
    }

    async execute(interaction, client) {
        await interaction.deferReply();
        let inventoryView = await client.playerReadService.getInventoryView(interaction.user.id);
        if (!inventoryView) {
            return interaction.editReply({
                content: 'Hãy dùng `/start` để tạo nhân vật trước.',
                flags: MessageFlags.Ephemeral
            });
        }

        const sessionId = interaction.id;
        let filter = 'ALL';
        let pageIndex = 0;
        let notice = null;
        const render = (options = {}) => createInventoryPayload({
            inventoryView,
            interaction,
            sessionId,
            filter,
            pageIndex,
            notice,
            ...options
        });
        let rendered = render();
        const message = await interaction.editReply(rendered.payload);

        await ComponentSession.forMessage({
            interaction,
            message,
            prefix: `tuido:${sessionId}:`,
            timeoutMs: SESSION_TIMEOUT_MS
        }).run({
            onCollect: async (component) => {
                const [, , action, value] = component.customId.split(':');
                if (action === 'filter' && INVENTORY_FILTERS[value]) {
                    filter = value;
                    pageIndex = 0;
                    notice = null;
                } else if (action === 'page') {
                    pageIndex += value === 'next' ? 1 : -1;
                    notice = null;
                } else if (action === 'use') {
                    try {
                        const result = await client.itemUseService.use(
                            interaction.user.id,
                            component.values?.[0],
                            { operationId: component.id }
                        );
                        notice = formatItemUseNotice(result);
                    } catch (error) {
                        notice = error?.message === 'ITEM_NOT_FOUND'
                            ? '⚠️ Vật phẩm không còn trong túi hoặc đã được sử dụng.'
                            : '⚠️ Thiên cơ nhiễu loạn, chưa thể sử dụng vật phẩm lúc này.';
                    }
                    inventoryView = await client.playerReadService.getInventoryView(
                        interaction.user.id
                    );
                } else {
                    return false;
                }

                rendered = render();
                pageIndex = rendered.state.pageIndex;
                await component.update(rendered.payload);
                return true;
            },
            onTimeout: async () => {
                try {
                    await interaction.editReply(render({ expired: true }).payload);
                } catch {
                    // Message may have been deleted; session cleanup remains best-effort.
                }
            }
        });
        return message;
    }
}

export { SESSION_TIMEOUT_MS };
