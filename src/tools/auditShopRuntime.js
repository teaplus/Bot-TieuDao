import assert from 'node:assert/strict';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import ShopCatalogService from '../gameplay/shop/ShopCatalogService.js';

const manager = bootstrapGameData();
setGameDataManager(manager);
const service = new ShopCatalogService({ gameDataManager: manager });
const maps = Object.values(manager.getCollection('maps'))
    .filter((map) => map.status === 'ACTIVE')
    .sort((left, right) => left.navigationOrder - right.navigationOrder);
const fixedNow = new Date('2026-08-04T00:00:00.000Z');

assert.equal(maps.length, 15);
for (const map of maps) {
    const mapCatalog = service.createMapCatalog(map);
    assert.equal(mapCatalog.entries.filter((entry) => entry.id.includes(`MAP:${map.id}:`)).length,
        mapCatalog.entries.length);
    assert.ok(mapCatalog.entries.length >= 4);

    const first = service.createSpecialCatalog(map, fixedNow);
    const replay = service.createSpecialCatalog(map, fixedNow);
    assert.deepEqual(replay, first);
    assert.equal(first.entries.length, 6);
    assert.equal(new Set(first.entries.map((entry) => entry.product.templateId)).size, 6);
    assert.ok(mapCatalog.entries.every((entry) => entry.purchaseLimit === null));
    assert.ok(first.entries.every((entry) => entry.purchaseLimit === null));
}

for (const seed of [7, 500016, 1400043, 20260804]) {
    const merchant = service.createMysteryCatalog(maps[0], seed);
    assert.equal(merchant.entries.length, 4);
    assert.equal(new Set(merchant.entries.map((entry) => entry.product.templateId)).size, 4);
    assert.ok(merchant.entries.every((entry) => entry.stock === 1));
    assert.ok(merchant.entries.every((entry) => /^\d+$/.test(entry.price)));
}

console.log(JSON.stringify({
    status: 'PASS',
    activeMaps: maps.length,
    deterministicSpecialRotation: true,
    specialSlotsPerMap: 6,
    purchaseLimitsRemoved: true,
    mysterySamples: 4,
    uniqueMerchantTemplates: true
}, null, 2));
