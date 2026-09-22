import assert from 'node:assert/strict';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import ShopPriceService from '../gameplay/shop/ShopPriceService.js';

const gameDataManager = bootstrapGameData();
const rules = gameDataManager.getCollection('shopRules');
const maps = Object.values(gameDataManager.getCollection('maps'))
    .filter((map) => map.status === 'ACTIVE')
    .sort((left, right) => left.navigationOrder - right.navigationOrder);
const priceService = new ShopPriceService({ gameDataManager });

assert.equal(rules.version, 2);
assert.equal(rules.pricePolicy.mapBasePrices.length, 15);
assert.deepEqual(
    rules.pricePolicy.mapBasePrices.map((entry) => entry.mapId),
    maps.map((map) => map.id)
);
assert.deepEqual(
    rules.explorationEncounter.entries.map((entry) => [entry.type, entry.weight]),
    [['MONSTER', 90], ['MYSTERY_MERCHANT', 5], ['FORTUNE_REWARD', 5]]
);
assert.equal(rules.mysteryMerchant.slotCount, 4);
assert.equal(rules.mysteryMerchant.ttlSeconds, 900);
assert.equal(rules.specialShop.slotCount, 6);
assert.equal(rules.specialShop.refreshPeriod, 'WEEKLY');
assert.deepEqual(rules.specialShop.slotPattern, [
    'CULTIVATION_ART_BOOK', 'SKILL_BOOK', 'EQUIPMENT',
    'CULTIVATION_ART_BOOK', 'SKILL_BOOK', 'EQUIPMENT'
]);

const item = gameDataManager.getRecord('itemTemplates', 'BREAKTHROUGH_PILL');
const equipment = gameDataManager.getRecord('itemTemplates', 'EQ_FIRE_WEAPON');
assert.equal(priceService.calculate(maps[0].id, 'MAP', { kind: 'ITEM' }, item), '200');
assert.equal(
    priceService.calculate(maps[14].id, 'MYSTERY', { kind: 'EQUIPMENT' }, equipment),
    '1350000000'
);

console.log(JSON.stringify({
    status: 'PASS',
    mapPriceTiers: rules.pricePolicy.mapBasePrices.length,
    encounterWeights: Object.fromEntries(
        rules.explorationEncounter.entries.map((entry) => [entry.type, entry.weight])
    ),
    specialSlots: rules.specialShop.slotCount,
    merchant: {
        slots: rules.mysteryMerchant.slotCount,
        stockPerSlot: rules.mysteryMerchant.stockPerSlot,
        ttlSeconds: rules.mysteryMerchant.ttlSeconds
    },
    priceSamples: {
        mapOneConsumable: '200',
        mapFifteenMysteryEquipment: '1350000000'
    }
}, null, 2));
