import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';

function assert(condition, message, details = {}) {
    if (!condition) {
        const error = new Error(message);
        error.details = details;
        throw error;
    }
}

const gameDataManager = bootstrapGameData();
const scaling = gameDataManager.getCollection('monsterRewardScaling');
const itemTemplates = gameDataManager.getCollection('itemTemplates');
const expectedPools = {
    5: 'MAP_HOA_THAN',
    6: 'MAP_LUYEN_HU',
    7: 'MAP_HOP_THE',
    8: 'MAP_DAI_THUA',
    9: 'MAP_DO_KIEP',
    10: 'MAP_CHAN_TIEN',
    11: 'MAP_HUYEN_TIEN',
    12: 'MAP_KIM_TIEN',
    13: 'MAP_THAI_AT',
    14: 'MAP_DAI_LA',
    15: 'MAP_DAO_TO'
};
const canonicalTypes = ['ARMOR', 'NECKLACE', 'RING', 'WEAPON'];

assert(scaling.tiers.length === 15, 'Monster Reward must cover all 15 realm tiers', scaling.tiers);
for (const realmOrder of Object.keys(expectedPools).map(Number)) {
    const tier = scaling.tiers.find((entry) => entry.realmOrder === realmOrder);
    const table = gameDataManager.requireRecord('rewardTables', tier.tableId);
    const equipment = table.rewards.find((reward) => reward.rewardType === 'EQUIPMENT');
    const items = table.rewards.filter((reward) => reward.rewardType === 'ITEM');
    const resources = items.filter((reward) => reward.itemId !== 'SECRET_REALM_TICKET');
    const ticket = items.find((reward) => reward.itemId === 'SECRET_REALM_TICKET');

    assert(table.rollCount === 1, `Tier ${realmOrder} must use one reward roll`, table);
    assert(equipment?.chance === 8 && equipment?.gradePoolId === expectedPools[realmOrder],
        `Tier ${realmOrder} equipment policy mismatch`, equipment);
    assert(JSON.stringify(Object.keys(equipment.typeChances).sort()) === JSON.stringify(canonicalTypes),
        `Tier ${realmOrder} must use four canonical equipment types`, equipment.typeChances);
    assert(resources.length === 4 && resources.every((reward) => {
        const resource = itemTemplates[reward.itemId];
        return resource?.resourceTier === realmOrder && [1, 3].includes(reward.chance);
    }), `Tier ${realmOrder} resources do not match its map tier`, resources);
    assert(ticket?.chance === 1, `Tier ${realmOrder} Secret Realm Ticket chance must be 1%`, ticket);
    assert(!items.some((reward) => reward.itemId === 'BREAKTHROUGH_PILL'),
        `Tier ${realmOrder} must not drop BREAKTHROUGH_PILL`, items);
}

console.log(JSON.stringify({
    status: 'PASS',
    configuredRealmOrders: scaling.tiers.map((tier) => tier.realmOrder),
    lateGameTierCount: Object.keys(expectedPools).length,
    policy: {
        rollCount: 1,
        equipmentChance: 8,
        ticketChance: 1,
        resourcesPerTier: 4
    }
}, null, 2));
