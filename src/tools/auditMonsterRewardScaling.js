import fs from 'node:fs';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import {
    buildMonsterRewardContent
} from '../foundation/game-data/GameDataNormalizer.js';

function assert(condition, message, details = null) {
    if (!condition) {
        throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
    }
}

const gameDataManager = bootstrapGameData();
const config = gameDataManager.getCollection('monsterRewardScaling');
const alias = gameDataManager.getCollection('monsterRules')
    .rewardResolution.aliases[config.aliasId];
const expectedCurrency = new Map([
    [1, [10, 20]],
    [2, [20, 40]],
    [3, [40, 80]],
    [4, [80, 160]]
]);
assert(config.tiers.length === 4, 'Only four approved Monster Reward tiers must be active');
for (const tier of config.tiers) {
    const table = gameDataManager.requireRecord('rewardTables', tier.tableId);
    const currency = table.rewards.find((reward) => reward.rewardType === 'CURRENCY');
    const expected = expectedCurrency.get(tier.realmOrder);
    assert(alias.realmOrderTableIds[String(tier.realmOrder)] === tier.tableId,
        'Generated alias mapping is missing', tier);
    assert(currency.quantity.min === expected[0] && currency.quantity.max === expected[1],
        'Generated currency formula changed an approved tier', { tier, currency });
    assert(table.rollCount === tier.rollCount,
        'Generated table lost configured rollCount', { tier, table });
}

const projected = buildMonsterRewardContent({
    version: 1,
    id: 'AUDIT',
    aliasId: 'AUDIT_ALIAS',
    coveragePolicy: 'CONFIGURED_TIERS_ONLY',
    currency: {
        currencyId: 'SPIRIT_STONE',
        baseRealmOrder: 1,
        baseMin: 10,
        baseMax: 20,
        growthFactor: 2,
        roundingMode: 'FLOOR'
    },
    tiers: [{
        realmOrder: 5,
        tableId: 'MONSTER_AUDIT_ORDER_5',
        rollCount: 1,
        equipment: null,
        items: []
    }]
}, {
    5: { id: 5, code: 'HOA_THAN', name: 'Hóa Thần', order: 5 }
});
const projectedCurrency = projected.rewardTables.MONSTER_AUDIT_ORDER_5.rewards[0];
assert(projectedCurrency.quantity.min === 160
    && projectedCurrency.quantity.max === 320,
'Generator does not derive currency from Realm order', projectedCurrency);

const rawRewardTables = JSON.parse(fs.readFileSync(
    new URL('../data/reward_tables.json', import.meta.url),
    'utf8'
)).rewardTables;
assert(rawRewardTables.every((table) => !table.id.startsWith('MONSTER_')),
    'Legacy Monster tables remain in reward_tables.json');

console.log(JSON.stringify({
    status: 'PASS',
    configuredRealmOrders: config.tiers.map((tier) => tier.realmOrder),
    generatedAlias: alias.realmOrderTableIds,
    projectedOrderFiveCurrency: projectedCurrency.quantity,
    checks: [
        'scaling-config-canonical',
        'realm-order-currency-formula',
        'explicit-tier-chances',
        'generated-reward-tables',
        'generated-alias-mapping',
        'legacy-monster-tables-removed'
    ]
}, null, 2));
