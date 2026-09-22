import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import RewardTableService from '../gameplay/rewards/RewardTableService.js';

function assert(condition, message, details = null) {
    if (!condition) {
        const error = new Error(message);
        error.details = details;
        throw error;
    }
}

const gameDataManager = bootstrapGameData();
const rules = gameDataManager.getCollection('rewardRuntimeRules');
const policy = rules.luckChancePolicy;
const service = new RewardTableService({ gameDataManager, random: () => 0 });

const itemReward = { rewardType: 'ITEM', chance: 10 };
const currencyReward = { rewardType: 'CURRENCY', chance: 10 };
const combined = service.resolveEffectiveChance(itemReward, {
    qualityRewardChanceBonusPercent: 50,
    luck: 50
});
const luckCapped = service.resolveEffectiveChance(itemReward, { luck: 200 });
const chanceCapped = service.resolveEffectiveChance(
    { rewardType: 'EQUIPMENT', chance: 80 },
    { qualityRewardChanceBonusPercent: 100, luck: 100 }
);
const currencyExcluded = service.resolveEffectiveChance(currencyReward, {
    qualityRewardChanceBonusPercent: 100,
    luck: 100
});
const negativeLuck = service.resolveEffectiveChance(itemReward, { luck: -50 });

assert(policy.formula === 'RELATIVE_MULTIPLIER_CAP_100'
    && policy.percentPerLuck === 1
    && policy.luckCap === 100
    && policy.snapshotTiming === 'ACTIVITY_START',
'LUCK reward policy does not match the approved configuration', policy);
assert(combined === 22.5,
    'Monster quality and LUCK multipliers were not combined multiplicatively', combined);
assert(luckCapped === 20,
    'LUCK contribution was not capped at 100 points', luckCapped);
assert(chanceCapped === 100,
    'Effective reward chance was not capped at 100%', chanceCapped);
assert(currencyExcluded === 10,
    'Currency chance must not receive quality or LUCK bonus', currencyExcluded);
assert(negativeLuck === 10,
    'Negative LUCK must not reduce the authored base chance', negativeLuck);

console.log(JSON.stringify({
    status: 'PASS',
    formula: policy.formula,
    snapshotTiming: policy.snapshotTiming,
    combinedChance: combined,
    luckCappedChance: luckCapped,
    chanceCap: chanceCapped,
    currencyChance: currencyExcluded,
    checks: [
        'relative-luck-multiplier',
        'multiplicative-quality-composition',
        'luck-contribution-cap',
        'effective-chance-cap',
        'currency-exclusion',
        'negative-luck-floor'
    ]
}, null, 2));
