import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import MonsterGeneratorService from '../gameplay/monsters/MonsterGeneratorService.js';
import SecretRealmService from '../gameplay/secret-realm/SecretRealmService.js';
import RewardTableService from '../gameplay/rewards/RewardTableService.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const gameDataManager = bootstrapGameData();
setGameDataManager(gameDataManager);
const qualityRules = gameDataManager.getCollection('monsterQualityRules');
const qualityTiers = Object.values(gameDataManager.getCollection('monsterQualityTiers'))
    .sort((left, right) => left.order - right.order);
const qualityPools = Object.values(gameDataManager.getCollection('monsterQualityPools'));
const generator = new MonsterGeneratorService({ gameDataManager, random: () => 0 });

assert(qualityTiers.length === 10, 'Monster quality ladder must contain 10 tiers');
assert(qualityRules.stepPercent === 15, 'Monster quality step must be controlled by JSON', qualityRules);
assert(qualityRules.rewardChancePolicy?.formula === 'RELATIVE_MULTIPLIER_CAP_100'
    && qualityRules.rewardChancePolicy?.capPercent === 100,
'Monster quality reward policy must use approved relative multiplier and cap', qualityRules.rewardChancePolicy);
assert(qualityTiers[0].id === 'FAN_THU' && qualityTiers[9].id === 'HONG_HOANG_DI_THU',
    'Monster quality ladder boundaries are invalid', qualityTiers);
assert(qualityTiers.map((tier) => tier.rewardChanceBonusPercent).join(',') === '0,5,10,15,20,30,40,55,75,100',
    'Monster quality reward bonus ladder mismatch', qualityTiers);
assert(qualityPools.length === 15
    && qualityPools.every((pool) => (
        pool.entries.reduce((sum, entry) => sum + entry.weight, 0) === 100
    )), 'Every Realm must have one valid Monster Quality Pool', qualityPools);
for (const realmCode of ['KIM_TIEN', 'THAI_AT', 'DAI_LA', 'DAO_TO']) {
    const pool = qualityPools.find((entry) => entry.realmCode === realmCode);
    const primordialWeight = pool?.entries.find(
        (entry) => entry.qualityId === 'HONG_HOANG_DI_THU'
    )?.weight || 0;
    assert(primordialWeight === 20,
        'Approved first-release Hồng Hoang cap must be 20%', { realmCode, pool });
}

const mortal = generator.createMonster('TPL_MON_FIRE_001', {
    variantId: 'NORMAL', qualityId: 'FAN_THU'
});
const spirit = generator.createMonster('TPL_MON_FIRE_001', {
    variantId: 'NORMAL', qualityId: 'LINH_THU'
});
const primordial = generator.createMonster('TPL_MON_FIRE_001', {
    variantId: 'NORMAL', qualityId: 'HONG_HOANG_DI_THU'
});

assert(mortal.qualityBonusPercent === 0 && mortal.stats.hp === 200,
    'Mortal quality must preserve original base stats', mortal);
assert(spirit.qualityBonusPercent === 15 && spirit.stats.hp === 230
    && spirit.stats.atk === 46 && spirit.stats.def === 23
    && spirit.qualityRewardChanceBonusPercent === 5,
'Each quality order must add one JSON-controlled step from original base', spirit);
assert(primordial.qualityBonusPercent === 135 && primordial.qualityMultiplier === 2.35
    && primordial.stats.hp === 470 && primordial.qualityRewardChanceBonusPercent === 100,
'Highest quality additive scaling is invalid', primordial);

const bossBaseline = generator.createMonster('TPL_MON_METAL_003', {
    variantId: 'BOSS', stage: 3
});
const bossWithRequestedQuality = generator.createMonster('TPL_MON_METAL_003', {
    variantId: 'BOSS', stage: 3, qualityId: 'HONG_HOANG_DI_THU'
});
assert(bossWithRequestedQuality.qualityId === null
    && bossWithRequestedQuality.qualityMultiplier === 1
    && JSON.stringify(bossWithRequestedQuality.stats) === JSON.stringify(bossBaseline.stats),
'Boss must ignore quality and retain legacy scaling formula', { bossBaseline, bossWithRequestedQuality });

const rewardService = new RewardTableService({ gameDataManager, random: () => 0 });
assert(rewardService.resolveEffectiveChance(
    { rewardType: 'EQUIPMENT', chance: 8 },
    { qualityRewardChanceBonusPercent: primordial.qualityRewardChanceBonusPercent }
) === 16, 'Quality reward bonus must multiply eligible reward chance relatively');
assert(rewardService.resolveEffectiveChance(
    { rewardType: 'ITEM', chance: 80 },
    { qualityRewardChanceBonusPercent: 100 }
) === 100, 'Quality reward chance must cap at 100 percent');
assert(rewardService.resolveEffectiveChance(
    { rewardType: 'CURRENCY', chance: 25 },
    { qualityRewardChanceBonusPercent: 100 }
) === 25, 'Quality reward bonus must not affect currency chance');

const secretRealm = new SecretRealmService({
    playerRuntimeRepository: {},
    gameDataManager,
    monsterGeneratorService: generator,
    random: () => 0
});
const waves = secretRealm.generateWaves({ realmId: 1, spiritualRoot: 'FIRE' }, {
    waveCount: 3,
    realmCode: 'LUYEN_KHI',
    element: 'FIRE',
    stage: 3
});
assert(waves.slice(0, -1).every((wave) => wave.monster.qualityId === 'FAN_THU'),
    'Secret Realm normal waves must use configured default quality', waves);
assert(waves.at(-1).type === 'BOSS' && waves.at(-1).monster.qualityId === null,
    'Secret Realm boss must not have quality', waves.at(-1));

console.log(JSON.stringify({
    status: 'PASS',
    qualityTiers: qualityTiers.length,
    qualityPools: qualityPools.length,
    lateGamePrimordialCapPercent: 20,
    stepPercent: qualityRules.stepPercent,
    highestBonusPercent: primordial.qualityBonusPercent,
    normalWaveDefault: 'FAN_THU',
    secretRealmBossQuality: null,
    bossLegacyStatsPreserved: true,
    rewardChancePolicy: qualityRules.rewardChancePolicy.formula,
    rewardChanceBonuses: qualityTiers.map((tier) => tier.rewardChanceBonusPercent)
}, null, 2));
