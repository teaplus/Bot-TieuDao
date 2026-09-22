import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
    StringSelectMenuBuilder
} from 'discord.js';
import ComponentSession from '../../application/discord/ComponentSession.js';
import { resolveEquipmentEmoji } from '../../application/discord/EquipmentEmojiResolver.js';
import { resolveItemResourceEmoji } from '../../application/discord/ItemResourceEmojiResolver.js';
import {
    createShopAreaIconAttachment,
    resolveShopAreaComponentEmoji,
    resolveShopAreaDefinition,
    resolveShopAreaEmoji
} from '../../application/discord/ShopAreaIconResolver.js';
import BaseCommand from '../../core/BaseCommand.js';
import EffectFormatter from '../../core/EffectFormatter.js';
import { formatIntegerAmount } from '../../shared/numeric/IntegerAmount.js';

const SESSION_TIMEOUT_MS = 2 * 60 * 1000;
const AREA_LABELS = Object.freeze({
    MAP: 'Phường Thị', SPECIAL: 'Trân Các',
    SECT: 'Tông Môn', MYSTERY: 'Thương Nhân Kỳ Ngộ'
});
const AREA_DESCRIPTIONS = Object.freeze({
    MAP: 'Hàng hóa bản địa theo nơi đạo hữu đang dừng chân.',
    SPECIAL: 'Kỳ trân và bí kíp thượng phẩm được luân chuyển mỗi tuần.',
    SECT: 'Dùng Điểm Tông Môn đổi truyền thừa trong bảo khố.',
    MYSTERY: 'Cơ duyên hiếm gặp — hàng hóa biến mất khi thương nhân rời đi.'
});
const KIND_LABELS = Object.freeze({
    ITEM: 'Vật phẩm', CULTIVATION_ART_BOOK: 'Công Pháp',
    SKILL_BOOK: 'Kỹ Năng', EQUIPMENT: 'Trang bị'
});
const REASON_LABELS = Object.freeze({
    INSUFFICIENT_CURRENCY: 'Không đủ Linh Thạch', REALM_LOCKED: 'Chưa đủ cảnh giới',
    SHOP_PRODUCT_ALREADY_OWNED: 'Đã học hoặc đã sở hữu bí kíp',
    SHOP_ENTRY_SOLD_OUT: 'Đã bán hết', SHOP_PURCHASE_LIMIT_REACHED: 'Đã đạt giới hạn mua',
    INSUFFICIENT_SECT_POINT: 'Không đủ Điểm Tông Môn',
    SECT_REWARD_POOL_EMPTY: 'Kho truyền thừa đang trống',
    SECT_REWARD_ALREADY_OWNED: 'Đã học hoặc đang sở hữu bí kíp'
});
const SECT_CATEGORY_LABELS = Object.freeze({
    CULTIVATION_ART: 'Công Pháp', ATTACK: 'Kỹ Năng Công', DEFENSE: 'Kỹ Năng Thủ'
});

function equipmentEffectLines(snapshot) {
    if (!snapshot) return [];
    return [...(snapshot.fixedEffects || []), ...(snapshot.affixes || [])]
        .slice(0, 6)
        .map((effect) => `• ${EffectFormatter.format(effect)}`);
}

function errorMessage(error) {
    const messages = {
        PLAYER_NOT_FOUND: 'Hãy dùng `/start` để tạo nhân vật trước.',
        SHOP_ENTRY_NOT_FOUND: 'Mặt hàng không còn trong phiên hiện tại.',
        SHOP_SESSION_NOT_FOUND: 'Đạo hữu chưa gặp Thương Nhân Kỳ Ngộ hoặc phiên đã kết thúc.',
        SHOP_SESSION_EXPIRED: 'Thương nhân đã ẩn vào hư không, cơ duyên lần này đã hết.',
        SHOP_ENTRY_SOLD_OUT: 'Kỳ trân này đã được mua mất.',
        SHOP_PURCHASE_LIMIT_REACHED: 'Đạo hữu đã mua đủ giới hạn của mặt hàng này.',
        SHOP_PRODUCT_ALREADY_OWNED: 'Bí kíp này đã được học hoặc đang nằm trong túi.',
        INSUFFICIENT_CURRENCY: 'Linh Thạch không đủ.',
        INVENTORY_FULL: 'Túi Trữ Vật đã đầy.',
        SECT_NOT_JOINED: 'Đạo hữu chưa gia nhập Tông Môn.',
        INSUFFICIENT_SECT_POINT: 'Điểm Tông Môn không đủ.',
        SECT_REWARD_ALREADY_OWNED: 'Đạo hữu đã học hoặc đang sở hữu bí kíp truyền thừa này.'
    };
    return messages[error?.message] || 'Thiên cơ trong thương hội dao động, chưa thể giao dịch lúc này.';
}

function itemIcon(entry, manager) {
    const template = manager.getRecord('itemTemplates', entry.itemId);
    if (entry.productKind === 'EQUIPMENT') {
        return resolveEquipmentEmoji({
            itemId: entry.itemId,
            equipmentType: entry.product.snapshot?.equipmentType || template?.equipment_type
        });
    }
    if (entry.productKind === 'CULTIVATION_ART_BOOK' || entry.productKind === 'SKILL_BOOK') return '📜';
    return resolveItemResourceEmoji({
        itemId: entry.itemId,
        category: template?.category,
        resourceFamily: template?.resourceFamily,
        resourceRole: template?.resourceRole
    });
}

async function loadArea(client, playerId, area) {
    if (area === 'SECT') {
        let view;
        try {
            view = await client.sectService.listExchangeRules(playerId);
        } catch (error) {
            if (error.message !== 'SECT_NOT_JOINED') throw error;
            return {
                shopId: 'SECT:NONE', shopName: 'Kho Truyền Thừa Tông Môn',
                shopType: 'SECT', balance: '0', entries: []
            };
        }
        return {
            shopId: `SECT:${view.sect.id}`,
            shopName: `Kho Truyền Thừa · ${view.sect.name}`,
            shopType: 'SECT',
            balance: view.sectPoints,
            entries: view.rules.map((rule) => ({
                id: rule.id,
                itemId: rule.rewardItem?.id || rule.id,
                itemName: rule.rewardItem?.name
                    || `${SECT_CATEGORY_LABELS[rule.category] || rule.category} · ${rule.grade}`,
                itemDescription: [
                    rule.rewardItem?.description,
                    rule.rewardItem?.elementLabel ? `Hệ: ${rule.rewardItem.elementLabel}` : null,
                    rule.rewardItem?.gradeLabel ? `Phẩm: ${rule.rewardItem.gradeLabel}` : null,
                    rule.rewardItem?.cultivationBonus != null
                        ? `Tốc độ tu luyện khi tương hợp: +${Number(rule.rewardItem.cultivationBonus) * 100}%`
                        : null,
                    Number(rule.rewardItem?.cooldownTurns) > 0
                        ? `Hồi chiêu: ${rule.rewardItem.cooldownTurns} lượt` : null,
                    `Yêu cầu cảnh giới: ${rule.requiredRealm}`
                ].filter(Boolean).join('\n'),
                productKind: rule.rewardItem?.type === 'CULTIVATION_ART'
                    ? 'CULTIVATION_ART_BOOK' : 'SKILL_BOOK',
                price: rule.cost.amount,
                currencyId: rule.cost.currencyId,
                quantity: 1,
                purchaseLimit: null,
                available: rule.available,
                unavailableReason: rule.unavailableReason,
                rewardPoolSize: rule.rewardPoolSize
            }))
        };
    }
    return client.shopService.listArea(playerId, area);
}

async function availableAreas(client, playerId) {
    const areas = ['MAP', 'SPECIAL', 'SECT'];
    const active = await client.mysteryMerchantService?.getActive(playerId).catch(() => null);
    if (active) areas.push('MYSTERY');
    return areas;
}

function render({ interaction, client, view, areas, area, selectedId, sessionId, notice, disabled = false }) {
    const selected = view.entries.find((entry) => entry.id === selectedId) || view.entries[0] || null;
    const areaIcon = resolveShopAreaEmoji(area);
    const areaAsset = createShopAreaIconAttachment(area);
    const spiritStoneIcon = resolveItemResourceEmoji('SPIRIT_STONE', '💎');
    const embed = new EmbedBuilder()
        .setColor(area === 'MYSTERY' ? '#8E44AD' : area === 'SECT' ? '#C8902F' : '#D4A017')
        .setTitle(`${areaIcon} ${view.shopName}`)
        .setDescription([
            notice,
            `*${AREA_DESCRIPTIONS[area]}*`,
            view.mapName ? `📍 **${view.mapName}**` : null,
            view.periodKey ? `🔄 Rotation tuần: **${view.periodKey}**` : null,
            `💰 **Số dư:** ${formatIntegerAmount(view.balance || 0)} ${area === 'SECT' ? 'Điểm Tông Môn' : `${spiritStoneIcon} Linh Thạch`}`,
            area === 'MYSTERY' && view.expiresAt
                ? `⏳ Biến mất <t:${Math.floor(new Date(view.expiresAt).getTime() / 1000)}:R>`
                : null
        ].filter(Boolean).join('\n') || 'Chọn một mặt hàng để xem chi tiết.');
    if (areaAsset) embed.setThumbnail(areaAsset.imageUrl);

    const directory = view.entries.map((entry) => {
        const icon = area === 'SECT' ? '📜' : itemIcon(entry, client.gameDataManager);
        const state = entry.available ? '✅' : '🔒';
        const stock = entry.stockRemaining == null ? '' : ` · còn ${entry.stockRemaining}`;
        return `${state} ${icon} **${entry.itemName}** — ${formatIntegerAmount(entry.price)}${stock}`;
    }).join('\n');
    embed.addFields({ name: 'Danh sách hàng', value: directory.slice(0, 1024) || 'Không có hàng.' });
    if (selected) {
        const equipmentEffects = equipmentEffectLines(selected.product?.snapshot);
        const lines = [
            `**Loại:** ${KIND_LABELS[selected.productKind] || 'Truyền thừa Tông Môn'}`,
            `**Giá:** ${formatIntegerAmount(selected.price)} ${selected.currencyId === 'SECT_POINT' ? 'Điểm Tông Môn' : 'Linh Thạch'}`,
            selected.itemDescription || null,
            selected.product?.snapshot?.generatedName
                ? `**Thần binh:** ${selected.product.snapshot.generatedName}` : null,
            selected.product?.snapshot?.grade
                ? `**Phẩm:** ${selected.product.snapshot.grade} · ${selected.product.snapshot.gradeQuality}` : null,
            equipmentEffects.length ? `**Chỉ số:**\n${equipmentEffects.join('\n')}` : null,
            selected.available ? '✅ Có thể mua' : `🔒 ${REASON_LABELS[selected.unavailableReason] || selected.unavailableReason}`
        ].filter(Boolean);
        embed.addFields({ name: 'Mặt hàng đang chọn', value: lines.join('\n').slice(0, 1024) });
    }
    embed.setFooter({
        text: selected ? [
            `Mặt hàng ${Math.max(1, view.entries.findIndex((entry) => entry.id === selected.id) + 1)}/${view.entries.length}`,
            area === 'MYSTERY' ? 'Theo tồn kho kỳ ngộ'
                : area === 'SECT' ? 'Theo quy tắc bảo khố'
                    : 'Không giới hạn lượt mua'
        ].join(' · ') : 'Không có mặt hàng phù hợp'
    });
    const areaSelect = new StringSelectMenuBuilder()
        .setCustomId(`shop:${sessionId}:area`)
        .setPlaceholder('Chọn khu vực cửa hàng')
        .setDisabled(disabled)
        .addOptions(areas.map((id) => ({
            label: resolveShopAreaDefinition(id)?.displayName || AREA_LABELS[id],
            emoji: resolveShopAreaComponentEmoji(id),
            value: id,
            default: id === area
        })));
    const entryOptions = view.entries.slice(0, 25).map((entry) => ({
        label: `${entry.available ? '✓' : '🔒'} ${entry.itemName}`.slice(0, 100),
        value: entry.id,
        description: `${formatIntegerAmount(entry.price)} · ${KIND_LABELS[entry.productKind] || 'Tông Môn'}`.slice(0, 100),
        default: entry.id === selected?.id
    }));
    const entrySelect = new StringSelectMenuBuilder()
        .setCustomId(`shop:${sessionId}:entry`)
        .setPlaceholder('Chọn mặt hàng')
        .setDisabled(disabled || !entryOptions.length)
        .addOptions(entryOptions.length ? entryOptions : [{ label: 'Không có hàng', value: 'NONE' }]);
    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`shop:${sessionId}:buy`).setLabel(area === 'SECT' ? 'Đổi' : 'Mua')
            .setStyle(ButtonStyle.Success).setDisabled(disabled || !selected?.available),
        new ButtonBuilder().setCustomId(`shop:${sessionId}:refresh`).setLabel('Làm mới')
            .setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId(`shop:${sessionId}:close`).setLabel('Đóng')
            .setStyle(ButtonStyle.Secondary).setDisabled(disabled)
    );
    return {
        embeds: [embed],
        attachments: [],
        files: areaAsset ? [areaAsset.file] : [],
        components: [
            new ActionRowBuilder().addComponents(areaSelect),
            new ActionRowBuilder().addComponents(entrySelect),
            buttons
        ]
    };
}

export default class ShopCommand extends BaseCommand {
    constructor() {
        super({ name: 'shop', description: 'Mở Phường Thị, Trân Các, shop Tông Môn và Kỳ Ngộ' });
    }

    getSlashData() {
        return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
    }

    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        let area = 'MAP';
        let areas;
        let view;
        let selectedId = null;
        let notice = null;
        try {
            areas = await availableAreas(client, interaction.user.id);
            view = await loadArea(client, interaction.user.id, area);
            selectedId = view.entries[0]?.id || null;
        } catch (error) {
            return interaction.editReply(errorMessage(error));
        }
        const sessionId = interaction.id;
        const payload = (extra = {}) => render({
            interaction, client, view, areas, area, selectedId, sessionId, notice, ...extra
        });
        const message = await interaction.editReply(payload());
        await ComponentSession.forMessage({
            interaction, message, prefix: `shop:${sessionId}:`, timeoutMs: SESSION_TIMEOUT_MS
        }).run({
            onCollect: async (component) => {
                const action = component.customId.split(':')[2];
                if (action === 'close') {
                    await component.update(payload({ disabled: true, notice: 'Đã đóng thương hội.' }));
                    return false;
                }
                await component.deferUpdate();
                try {
                    if (action === 'area') {
                        const nextArea = component.values[0];
                        const nextView = await loadArea(client, interaction.user.id, nextArea);
                        area = nextArea;
                        view = nextView;
                        selectedId = view.entries[0]?.id || null;
                        notice = null;
                    } else if (action === 'entry') {
                        selectedId = component.values[0];
                        notice = null;
                    } else if (action === 'buy') {
                        const selected = view.entries.find((entry) => entry.id === selectedId);
                        if (!selected) throw new Error('SHOP_ENTRY_NOT_FOUND');
                        const result = area === 'SECT'
                            ? await client.sectService.exchangeReward(
                                interaction.user.id, selected.id, { operationId: component.id }
                            )
                            : await client.shopService.purchaseArea(
                                interaction.user.id, area, selected.id, { operationId: component.id }
                            );
                        notice = area === 'SECT'
                            ? `🎁 Đã đổi được **${result.reward.itemName} ×${result.reward.quantity}**.`
                            : `✅ Đã mua **${result.entry.itemName} ×${result.entry.quantity}**.`;
                        areas = await availableAreas(client, interaction.user.id);
                        if (!areas.includes(area)) area = 'MAP';
                        view = await loadArea(client, interaction.user.id, area);
                        selectedId = view.entries.find((entry) => entry.id === selectedId)?.id
                            || view.entries[0]?.id || null;
                    } else if (action === 'refresh') {
                        areas = await availableAreas(client, interaction.user.id);
                        if (!areas.includes(area)) area = 'MAP';
                        view = await loadArea(client, interaction.user.id, area);
                        notice = '🔄 Đã cập nhật giá, số dư và tồn kho.';
                    }
                } catch (error) {
                    client.logger?.error('Shop panel action failed', {
                        action, error: error instanceof Error ? error.message : String(error)
                    });
                    notice = `⚠️ ${errorMessage(error)}`;
                    areas = await availableAreas(client, interaction.user.id).catch(() => areas);
                    if (!areas.includes(area)) area = 'MAP';
                    view = await loadArea(client, interaction.user.id, area).catch(() => view);
                }
                await interaction.editReply(payload());
                return true;
            },
            onTimeout: async () => interaction.editReply(payload({
                disabled: true,
                notice: 'Phiên thương hội đã hết hạn. Dùng lại `/shop` để tiếp tục.'
            }))
        });
        return null;
    }
}

export { availableAreas, loadArea, render as renderShopPanel };
