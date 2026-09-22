import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} from 'discord.js';
import EffectFormatter from '../../core/EffectFormatter.js';
import { formatIntegerAmount } from '../../shared/numeric/IntegerAmount.js';
import { resolveEquipmentEmoji } from './EquipmentEmojiResolver.js';
import {
    resolveItemResourceComponentEmoji,
    resolveItemResourceEmoji
} from './ItemResourceEmojiResolver.js';

export const INVENTORY_PAGE_SIZE = 10;

export const INVENTORY_FILTERS = Object.freeze({
    ALL: Object.freeze({ label: 'Tất cả', emoji: '🎒' }),
    EQUIPMENT: Object.freeze({ label: 'Trang bị', emoji: '⚔️' }),
    CONSUMABLE: Object.freeze({ label: 'Tiêu hao', emoji: '🧪' }),
    MATERIAL: Object.freeze({ label: 'Nguyên liệu', emoji: '🌿' }),
    KNOWLEDGE: Object.freeze({ label: 'Bí kíp', emoji: '📜' })
});

const TYPE_ORDER = Object.freeze({
    EQUIPMENT: 0,
    CONSUMABLE: 1,
    MATERIAL: 2,
    SKILL_BOOK: 3,
    CULTIVATION_ART: 4
});

const TYPE_META = Object.freeze({
    EQUIPMENT: Object.freeze({ icon: '⚔️', label: 'Trang bị' }),
    CONSUMABLE: Object.freeze({ icon: '🧪', label: 'Đan dược / Tiêu hao' }),
    MATERIAL: Object.freeze({ icon: '🌿', label: 'Nguyên liệu' }),
    SKILL_BOOK: Object.freeze({ icon: '📘', label: 'Bí tịch kỹ năng' }),
    CULTIVATION_ART: Object.freeze({ icon: '📜', label: 'Công pháp' })
});

const SLOT_LABELS = Object.freeze({
    WEAPON: 'Vũ khí',
    ARMOR: 'Áo giáp',
    NECKLACE: 'Dây chuyền',
    RING: 'Nhẫn'
});

const GRADE_LABELS = Object.freeze({
    HOANG: 'Hoàng',
    HUYEN: 'Huyền',
    DIA: 'Địa',
    THIEN: 'Thiên',
    TIEN: 'Tiên',
    THANH: 'Thánh',
    THAN: 'Thần'
});

const QUALITY_LABELS = Object.freeze({
    LOW: 'Hạ phẩm',
    MIDDLE: 'Trung phẩm',
    MEDIUM: 'Trung phẩm',
    HIGH: 'Thượng phẩm'
});

const RESOURCE_FAMILY_LABELS = Object.freeze({
    HERB: 'Linh Thảo',
    ORE: 'Linh Khoáng'
});

const RESOURCE_ROLE_LABELS = Object.freeze({
    PRIMARY: 'Phổ biến',
    RARE: 'Hiếm'
});

function getFilterForItem(item) {
    if (item.type === 'EQUIPMENT') return 'EQUIPMENT';
    if (item.type === 'CONSUMABLE') return 'CONSUMABLE';
    if (item.type === 'MATERIAL') return 'MATERIAL';
    if (item.type === 'SKILL_BOOK' || item.type === 'CULTIVATION_ART') return 'KNOWLEDGE';
    return 'ALL';
}

function compareItems(left, right) {
    if (Boolean(left.isEquipped) !== Boolean(right.isEquipped)) {
        return left.isEquipped ? -1 : 1;
    }
    const typeDifference = (TYPE_ORDER[left.type] ?? 99) - (TYPE_ORDER[right.type] ?? 99);
    if (typeDifference !== 0) return typeDifference;
    const rarityDifference = Number(right.rarityInfo?.order || 0) - Number(left.rarityInfo?.order || 0);
    if (rarityDifference !== 0) return rarityDifference;
    return String(left.name || left.id).localeCompare(String(right.name || right.id), 'vi');
}

function truncate(text, maxLength) {
    const value = String(text || '').trim();
    if (value.length <= maxLength) return value;
    return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function formatEquipmentMeta(item) {
    const parts = [SLOT_LABELS[item.slot] || SLOT_LABELS[item.equipmentType] || item.slot];
    const grade = GRADE_LABELS[item.grade] || item.grade;
    const quality = QUALITY_LABELS[item.gradeQuality] || item.gradeQuality;
    if (grade || quality) parts.push([grade, quality].filter(Boolean).join(' · '));
    return parts.filter(Boolean).join(' • ');
}

function formatEffects(item) {
    const effects = typeof item.getEffects === 'function' ? item.getEffects() : [];
    if (!effects.length) return null;
    const visible = effects.slice(0, 2).map((effect) => EffectFormatter.format(effect));
    if (effects.length > visible.length) visible.push(`+${effects.length - visible.length} hiệu ứng`);
    return visible.join(' · ');
}

export function formatInventoryItem(item) {
    const meta = TYPE_META[item.type] || { icon: '📦', label: 'Vật phẩm' };
    const icon = item.type === 'EQUIPMENT'
        ? resolveEquipmentEmoji({
            itemId: item.id,
            equipmentType: item.equipmentType,
            slot: item.slot
        })
        : resolveItemResourceEmoji({
            itemId: item.id,
            category: item.category,
            resourceFamily: item.resourceFamily,
            resourceRole: item.resourceRole
        }, meta.icon);
    const rarityName = item.rarityInfo?.name || item.rarity || 'Thường';
    const quantity = Number(item.quantity || 1) > 1
        ? ` ×${formatIntegerAmount(item.quantity)}`
        : '';
    const equipped = item.isEquipped ? ' · ✅ Đang dùng' : '';
    const detailParts = [];

    if (item.type === 'EQUIPMENT') {
        detailParts.push(formatEquipmentMeta(item));
    } else if (item.type === 'MATERIAL' && item.resourceTier) {
        detailParts.push([
            `Cấp tài nguyên ${item.resourceTier}`,
            RESOURCE_FAMILY_LABELS[item.resourceFamily] || item.resourceFamily,
            RESOURCE_ROLE_LABELS[item.resourceRole] || item.resourceRole
        ].filter(Boolean).join(' • '));
    } else if (item.type === 'SKILL_BOOK') {
        detailParts.push(item.skill?.type === 'PASSIVE' ? 'Kỹ năng bị động' : 'Kỹ năng chủ động');
    } else if (item.type === 'CULTIVATION_ART') {
        if (item.element === 'NEUTRAL' && Number(item.baseCultivationBonus || 0) > 0) {
            detailParts.push(`Tốc độ tu luyện ổn định +${Number(item.baseCultivationBonus) * 100}%`);
        } else if (Number(item.affinityCultivationBonus || 0) > 0) {
            detailParts.push(`Tương hợp Linh Căn +${Number(item.affinityCultivationBonus) * 100}%`);
        }
    } else {
        detailParts.push(meta.label);
    }

    const effects = formatEffects(item);
    if (effects) detailParts.push(effects);

    const details = detailParts.filter(Boolean).join(' · ');
    return truncate(
        `${icon} **${item.name || item.id}**${quantity} · ${rarityName}${details ? ` · ${details}` : ''}${equipped}`,
        360
    );
}

export function createInventoryState(inventoryView, options = {}) {
    const filter = INVENTORY_FILTERS[options.filter] ? options.filter : 'ALL';
    const allItems = [...(inventoryView?.items || [])]
        .filter((item) => item.type !== 'CURRENCY')
        .sort(compareItems);
    const filteredItems = filter === 'ALL'
        ? allItems
        : allItems.filter((item) => getFilterForItem(item) === filter);
    const totalPages = Math.max(1, Math.ceil(filteredItems.length / INVENTORY_PAGE_SIZE));
    const pageIndex = Math.min(Math.max(0, Number(options.pageIndex || 0)), totalPages - 1);
    const start = pageIndex * INVENTORY_PAGE_SIZE;

    return Object.freeze({
        filter,
        pageIndex,
        totalPages,
        allItems: Object.freeze(allItems),
        filteredItems: Object.freeze(filteredItems),
        pageItems: Object.freeze(filteredItems.slice(start, start + INVENTORY_PAGE_SIZE))
    });
}

function customId(sessionId, action) {
    return `tuido:${sessionId}:${action}`;
}

function createComponents(state, sessionId, expired) {
    if (expired) return [];
    const counts = Object.fromEntries(Object.keys(INVENTORY_FILTERS).map((filter) => [
        filter,
        filter === 'ALL'
            ? state.allItems.length
            : state.allItems.filter((item) => getFilterForItem(item) === filter).length
    ]));
    const filterRow = new ActionRowBuilder().addComponents(
        ...Object.entries(INVENTORY_FILTERS).map(([filter, meta]) => (
            new ButtonBuilder()
                .setCustomId(customId(sessionId, `filter:${filter}`))
                .setLabel(meta.label)
                .setEmoji(meta.emoji)
                .setStyle(filter === state.filter ? ButtonStyle.Primary : ButtonStyle.Secondary)
                .setDisabled(filter === state.filter || counts[filter] === 0)
        ))
    );
    const rows = [filterRow];
    const usableItems = [...new Map(
        state.pageItems
            .filter((item) => item.type === 'CONSUMABLE' && item.usable === true)
            .map((item) => [item.id, item])
    ).values()].slice(0, 25);
    if (usableItems.length) {
        rows.push(new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(customId(sessionId, 'use'))
                .setPlaceholder('Sử dụng đan dược / vật phẩm')
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(...usableItems.map((item) => (
                    new StringSelectMenuOptionBuilder()
                        .setLabel(truncate(item.name || item.id, 100))
                        .setDescription(truncate(item.description || 'Sử dụng một vật phẩm', 100))
                        .setValue(item.id)
                        .setEmoji(resolveItemResourceComponentEmoji({
                            itemId: item.id,
                            category: item.category,
                            resourceFamily: item.resourceFamily,
                            resourceRole: item.resourceRole
                        }, '🧪'))
                )))
        ));
    }

    if (state.totalPages > 1) {
        rows.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(customId(sessionId, 'page:previous'))
                .setLabel('Trang trước')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(state.pageIndex === 0),
            new ButtonBuilder()
                .setCustomId(customId(sessionId, 'page:next'))
                .setLabel('Trang sau')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(state.pageIndex >= state.totalPages - 1)
        ));
    }

    return rows;
}

export function createInventoryPayload({
    inventoryView,
    interaction,
    sessionId,
    filter = 'ALL',
    pageIndex = 0,
    notice = null,
    expired = false
}) {
    const state = createInventoryState(inventoryView, { filter, pageIndex });
    const spiritStones = inventoryView.runtimePlayer.currencies.spiritStones;
    const slotUsage = Number(inventoryView.slotUsage ?? state.allItems.length);
    const slotCapacity = Number(inventoryView.slotCapacity || 0);
    const equipmentCount = state.allItems.filter((item) => item.type === 'EQUIPMENT').length;
    const stackCount = state.allItems.length - equipmentCount;
    const description = state.pageItems.length
        ? state.pageItems.map(formatInventoryItem).join('\n')
        : '*Ngăn này chưa có vật phẩm nào.*';
    const filterMeta = INVENTORY_FILTERS[state.filter];
    const embed = new EmbedBuilder()
        .setTitle(`🎒 Túi Trữ Vật • ${interaction.user.username}`)
        .setColor('#B88A44')
        .setDescription([
            notice,
            `💠 Linh thạch: **${formatIntegerAmount(spiritStones)}**`,
            `📦 Ô đã dùng: **${slotUsage}${slotCapacity > 0 ? `/${slotCapacity}` : ''}**`
                + `  •  ⚔️ Trang bị: **${equipmentCount}**  •  🧺 Vật phẩm: **${stackCount}**`,
            '───────────────────────────',
            `### ${filterMeta.emoji} ${filterMeta.label}`,
            description
        ].filter(Boolean).join('\n'))
        .setFooter({
            text: expired
                ? `Trang ${state.pageIndex + 1}/${state.totalPages} • Phiên xem đã kết thúc`
                : `Trang ${state.pageIndex + 1}/${state.totalPages} • ${state.filteredItems.length} mục`
        });

    return {
        payload: {
            content: null,
            embeds: [embed],
            components: createComponents(state, sessionId, expired)
        },
        state
    };
}
