import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import ItemUseService from '../gameplay/player/ItemUseService.js';
import RewardTableService from '../gameplay/rewards/RewardTableService.js';
import { normalizeDecimal } from '../shared/numeric/FixedDecimal.js';
import { formatItemUseNotice } from '../commands/player/profile.js';

function assert(condition, message, details = null) {
    if (!condition) {
        throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
    }
}

const gameDataManager = bootstrapGameData();
setGameDataManager(gameDataManager);
const item = gameDataManager.requireRecord('itemTemplates', 'SPIRIT_GATHERING_PILL');
const recipe = gameDataManager.requireRecord(
    'craftTemplates',
    'CRAFT_SPIRIT_GATHERING_PILL'
);
const creationRules = gameDataManager.getCollection('characterCreationRules');
assert(item.realmPolicy === 'EXACT_REALM'
    && item.actions[0].type === 'GRANT_CULTIVATION_PERCENT'
    && item.actions[0].parameters.requiredCultivationPercent === 10
    && item.actions[0].parameters.capAtBreakthroughThreshold === true,
'Tụ Linh Đan item policy does not match the approved contract', item);
assert(recipe.unlockMode === 'LEARNED'
    && recipe.output.itemId === item.id
    && recipe.materials.length === 1
    && recipe.materials[0].itemId === 'HERB_TU_LINH_THAO'
    && recipe.materials[0].quantity === 3
    && recipe.durationMinutes === 1,
'Tụ Linh Đan recipe does not match the approved contract', recipe);
assert(creationRules.starterRecipeIds.includes(recipe.id),
'Tụ Linh Đan recipe is missing from character creation');

function createService({ realmId = 1, cultivation = '850', required = '1000' } = {}) {
    const mutations = { consumed: 0, persisted: null };
    const runtimePlayer = { playerId: 'alchemy-audit', realmId };
    const service = new ItemUseService({
        gameDataManager,
        playerRuntimeRepository: {
            async findById() {
                return runtimePlayer;
            },
            async consumeItemByTemplate() {
                mutations.consumed += 1;
            },
            async updateCultivationState(_playerId, payload) {
                mutations.persisted = payload;
            }
        },
        cultivationService: {
            async settleRuntimePlayer() {
                return {
                    player: {
                        realmInfo: { req_cul: required },
                        cultivation: normalizeDecimal(cultivation),
                        lastCultivate: new Date('2026-07-28T00:00:00.000Z')
                    },
                    afkData: { earned: normalizeDecimal(0) }
                };
            }
        },
        operationExecutor: {
            async execute(_operation, work) {
                return work({});
            }
        }
    });
    return { service, mutations };
}

const regular = createService();
const used = await regular.service.use('alchemy-audit', item.id, {
    operationId: 'alchemy-use-regular'
});
assert(used.outcome === 'CULTIVATION_PILL_USED'
    && used.appliedGain === normalizeDecimal('100')
    && used.cultivation === normalizeDecimal('950')
    && regular.mutations.consumed === 1,
'Tụ Linh Đan did not grant exactly 10% cultivation', used);

const cappedState = createService({ cultivation: '970' });
const capped = await cappedState.service.use('alchemy-audit', item.id, {
    operationId: 'alchemy-use-capped'
});
assert(capped.appliedGain === normalizeDecimal('30')
    && capped.cultivation === normalizeDecimal('1000')
    && cappedState.mutations.consumed === 1,
'Tụ Linh Đan did not cap at breakthrough threshold', capped);

const mismatchState = createService({ realmId: 2 });
const mismatch = await mismatchState.service.use('alchemy-audit', item.id, {
    operationId: 'alchemy-use-mismatch'
});
assert(mismatch.outcome === 'ITEM_REALM_MISMATCH'
    && mismatchState.mutations.consumed === 0,
'Lower-realm pill was consumed by a higher-realm player', mismatch);
assert(formatItemUseNotice(mismatch).includes('chỉ dùng tại cảnh giới'),
'Inventory UI does not explain the exact-Realm restriction');

const monsterReward = gameDataManager.requireRecord('rewardTables', 'MONSTER_LUYEN_KHI');
const tuLinhDrop = monsterReward.rewards.find(
    (entry) => entry.itemId === 'HERB_TU_LINH_THAO'
);
const thanhTamDrop = monsterReward.rewards.find(
    (entry) => entry.itemId === 'HERB_THANH_TAM_THAO'
);
assert(monsterReward.rollCount === 3
    && tuLinhDrop.chance === 5
    && thanhTamDrop.chance === 1
    && tuLinhDrop.quantity.min === 1
    && tuLinhDrop.quantity.max === 1
    && thanhTamDrop.quantity.min === 1
    && thanhTamDrop.quantity.max === 1,
'Luyện Khí herb drop entries do not match approved per-roll chances', {
    rollCount: monsterReward.rollCount,
    tuLinhDrop,
    thanhTamDrop
});
const rewardService = new RewardTableService({ gameDataManager, random: () => 0.99 });
assert(rewardService.resolveEffectiveChance(tuLinhDrop, {
    qualityRewardChanceBonusPercent: 100
}) === 10,
'Monster quality bonus must apply to herb Item chance');

console.log(JSON.stringify({
    status: 'PASS',
    checks: [
        'starter-recipe-ownership',
        'exact-realm-policy',
        'ten-percent-stage-requirement',
        'breakthrough-threshold-cap',
        'transaction-use-contract',
        'three-roll-herb-chances',
        'monster-quality-drop-bonus',
        'inventory-realm-error-copy'
    ]
}, null, 2));
