import fs from 'fs';
import {
    createInventoryPayload,
    createInventoryState,
    formatInventoryItem,
    INVENTORY_PAGE_SIZE
} from '../application/discord/InventoryPresentation.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

function item(id, type, overrides = {}) {
    return {
        id,
        uuid: `INTERNAL-${id}`,
        name: `Vật phẩm ${id}`,
        type,
        rarity: 'COMMON',
        rarityInfo: { name: 'Thường', order: 1 },
        quantity: 1,
        description: `Mô tả ${id}`,
        ...overrides
    };
}

const equippedWeapon = item('WEAPON', 'EQUIPMENT', {
    name: 'Thanh Vân Kiếm',
    isEquipped: true,
    slot: 'WEAPON',
    grade: 'HOANG',
    gradeQuality: 'MIDDLE',
    getEffects: () => [{
        stat: 'atk',
        mode: 'add_percent_base',
        value: 0.1
    }]
});
const items = [
    item('HERB-1', 'MATERIAL', {
        quantity: 12345,
        resourceTier: 1,
        resourceFamily: 'HERB',
        resourceRole: 'PRIMARY'
    }),
    item('PILL-1', 'CONSUMABLE', { usable: true }),
    item('BOOK-1', 'SKILL_BOOK', { skill: { type: 'ACTIVE' } }),
    equippedWeapon,
    item('HERB-2', 'MATERIAL'),
    item('PILL-2', 'CONSUMABLE'),
    item('ART-1', 'CULTIVATION_ART', { cultivationBonus: 0.2 }),
    item('PILL-3', 'CONSUMABLE'),
    item('PILL-4', 'CONSUMABLE'),
    item('PILL-5', 'CONSUMABLE'),
    item('PILL-6', 'CONSUMABLE')
];
const inventoryView = {
    runtimePlayer: {
        currencies: { spiritStones: '987654321' }
    },
    items,
    slotUsage: 7,
    slotCapacity: 200
};
const interaction = {
    user: {
        username: 'Đạo Hữu'
    }
};

const first = createInventoryPayload({
    inventoryView,
    interaction,
    sessionId: 'audit',
    filter: 'ALL',
    pageIndex: 0
});
const firstJson = first.payload.embeds[0].toJSON();
assert(INVENTORY_PAGE_SIZE === 10
    && first.state.pageItems.length === 10
    && first.state.totalPages === 2,
'Inventory pagination contract is invalid', first.state);
assert(first.state.pageItems[0] === equippedWeapon,
    'Equipped item must sort before unequipped items');
assert(firstJson.description.includes('987.654.321')
    && firstJson.description.includes('7/200'),
'Inventory summary is missing wallet or slot usage', firstJson);
assert(firstJson.description.includes('Công Kích: +10%')
    || firstJson.description.includes('atk: +10%'),
'Equipment percentage effect is not formatted for players', firstJson);
assert(firstJson.description.includes('🗡️ **Thanh Vân Kiếm**')
    && !firstJson.description.includes('\n└'),
'Inventory equipment must use a compact one-line row with a slot icon', firstJson);
assert(!firstJson.description.includes('INTERNAL-'),
    'Inventory UI must not expose runtime inventory IDs', firstJson);
assert(first.payload.components.length === 3,
    'Filter, item use and pagination controls must use separate rows');
assert(first.payload.components[1].components[0].data.custom_id === 'tuido:audit:use',
    'Usable consumables must expose an item-use select');

const materialState = createInventoryState(inventoryView, {
    filter: 'MATERIAL',
    pageIndex: 0
});
assert(materialState.filteredItems.length === 2
    && materialState.filteredItems.every((entry) => entry.type === 'MATERIAL'),
'Material filter returned unrelated items', materialState.filteredItems);
assert(formatInventoryItem(items[0]).includes('×12.345'),
'Stack quantity is not localized', formatInventoryItem(items[0]));
assert(formatInventoryItem(items[0]).includes('Cấp tài nguyên 1 • Linh Thảo • Phổ biến'),
'Gathering resource tier/family metadata is missing', formatInventoryItem(items[0]));

const expired = createInventoryPayload({
    inventoryView,
    interaction,
    sessionId: 'audit',
    expired: true
});
assert(expired.payload.components.length === 0
    && expired.payload.embeds[0].toJSON().footer.text.includes('đã kết thúc'),
'Expired inventory session must remove controls');

const commandSource = fs.readFileSync(new URL('../commands/player/profile.js', import.meta.url), 'utf8');
assert(commandSource.includes('ComponentSession.forMessage')
    && commandSource.includes('prefix: `tuido:${sessionId}:`'),
'Inventory command is missing owner-scoped component pagination');
assert(commandSource.includes('client.itemUseService.use')
    && commandSource.includes('formatItemUseNotice'),
'Inventory command is not connected to the transactional item-use service');

console.log(JSON.stringify({
    status: 'PASS',
    pageSize: INVENTORY_PAGE_SIZE,
    totalItems: items.length,
    totalPages: first.state.totalPages,
    filters: ['ALL', 'EQUIPMENT', 'CONSUMABLE', 'MATERIAL', 'KNOWLEDGE'],
    checks: [
        'equipped-first',
        'wallet-and-capacity-summary',
        'percentage-effect-format',
        'runtime-id-hidden',
        'localized-stack-quantity',
        'gathering-resource-metadata',
        'category-filter',
        'usable-item-select',
        'pagination',
        'expired-session-cleanup'
    ]
}, null, 2));
