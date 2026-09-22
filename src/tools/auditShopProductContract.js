import assert from 'node:assert/strict';
import fs from 'node:fs';
import ShopService from '../gameplay/shop/ShopService.js';

const entries = [
    {
        id: 'ART',
        product: { kind: 'CULTIVATION_ART_BOOK', templateId: 'CP_TEST', quantity: 1, snapshot: { artId: 'CP_TEST' } },
        costs: [{ currencyId: 'SPIRIT_STONE', amount: '2500' }],
        currencyId: 'SPIRIT_STONE', price: '2500', quantity: 1, dailyLimit: 0, requiredRealm: null
    },
    {
        id: 'SKILL',
        product: { kind: 'SKILL_BOOK', templateId: 'BOOK_SK_TEST', quantity: 1, snapshot: { skillId: 'SK_TEST' } },
        costs: [{ currencyId: 'SPIRIT_STONE', amount: '2000' }],
        currencyId: 'SPIRIT_STONE', price: '2000', quantity: 1, dailyLimit: 0, requiredRealm: null
    },
    {
        id: 'EQUIPMENT',
        product: {
            kind: 'EQUIPMENT', templateId: 'EQ_TEST', quantity: 1,
            snapshot: { revision: 1, rarity: 'LEGENDARY', grade: 'HOANG', gradeQuality: 'HIGH', fixedEffects: [], affixes: [] }
        },
        costs: [{ currencyId: 'SPIRIT_STONE', amount: '3000' }],
        currencyId: 'SPIRIT_STONE', price: '3000', quantity: 1, dailyLimit: 0, requiredRealm: null
    }
];

const records = {
    shopTemplates: { TEST: { id: 'TEST', name: 'Test Shop', entries } },
    itemTemplates: {
        CP_TEST: { id: 'CP_TEST', name: 'Test Art', type: 'CULTIVATION_ART', artId: 'CP_TEST', rarity: 'HOANG' },
        BOOK_SK_TEST: { id: 'BOOK_SK_TEST', name: 'Test Skill', type: 'SKILL_BOOK', skillId: 'SK_TEST', rarity: 'HOANG' },
        EQ_TEST: { id: 'EQ_TEST', name: 'Test Equipment', type: 'EQUIPMENT', rarity: 'LEGENDARY' }
    },
    currencies: { SPIRIT_STONE: { id: 'SPIRIT_STONE' } }
};
const gameDataManager = {
    getCollection(name) {
        if (name === 'economyRules') return { timezone: 'Asia/Ho_Chi_Minh' };
        if (name === 'itemRules') return { inventory: { defaultSlot: 200 } };
        if (name === 'realms') return {};
        return records[name] || {};
    },
    getRecord(name, id) { return records[name]?.[id] || null; },
    hasRecord(name, id) { return Boolean(records[name]?.[id]); }
};
const runtimePlayer = {
    playerId: 'player', realmId: 1,
    currencies: { SPIRIT_STONE: '999999', spiritStones: '999999' },
    cultivationArtIds: [], learnedSkillIds: [],
    inventory: { getAllEntries: () => [] }
};
let purchasePayload = null;
const service = new ShopService({
    gameDataManager,
    playerRuntimeRepository: {
        findById: async () => runtimePlayer,
        purchaseShopEntry: async (_playerId, payload) => {
            purchasePayload = payload;
            return { status: 'PURCHASED', productKind: payload.product.kind };
        }
    },
    operationExecutor: { execute: async (_meta, work) => work({}) }
});

const view = await service.listShop('player', 'TEST');
assert.deepEqual(view.entries.map((entry) => entry.productKind), [
    'CULTIVATION_ART_BOOK', 'SKILL_BOOK', 'EQUIPMENT'
]);
assert(view.entries.every((entry) => entry.available));

const bought = await service.purchase('player', 'TEST', 'EQUIPMENT', { operationId: 'operation' });
assert.equal(bought.purchase.productKind, 'EQUIPMENT');
assert.equal(purchasePayload.product.snapshot.gradeQuality, 'HIGH');
assert.equal(purchasePayload.inventoryCapacity, 200);

runtimePlayer.cultivationArtIds.push('CP_TEST');
runtimePlayer.learnedSkillIds.push('SK_TEST');
const ownedView = await service.listShop('player', 'TEST');
assert.equal(ownedView.entries[0].unavailableReason, 'SHOP_PRODUCT_ALREADY_OWNED');
assert.equal(ownedView.entries[1].unavailableReason, 'SHOP_PRODUCT_ALREADY_OWNED');
assert.equal(ownedView.entries[2].available, true);

const migration = fs.readFileSync(
    new URL('../database/migrations/033_shop_product_contract.sql', import.meta.url),
    'utf8'
);
const repository = fs.readFileSync(
    new URL('../repositories/PlayerRuntimeRepository.js', import.meta.url),
    'utf8'
);
assert(migration.includes('product_kind') && migration.includes('product_snapshot'));
assert(repository.includes("throw new Error('SHOP_PRODUCT_ALREADY_OWNED')"));
assert(repository.includes("productKind === 'EQUIPMENT'"));

console.log(JSON.stringify({
    status: 'PASS',
    productKinds: view.entries.map((entry) => entry.productKind),
    duplicateBookPolicy: 'LOCK_IF_LEARNED_OR_OWNED',
    equipmentPolicy: 'IMMUTABLE_PREVIEW_SNAPSHOT',
    inventoryCapacity: purchasePayload.inventoryCapacity
}, null, 2));
