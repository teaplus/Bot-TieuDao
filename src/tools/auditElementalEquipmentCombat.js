import ActionExecutor from '../battle/actions/ActionExecutor.js';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';

function assert(condition, message, details = null) {
    if (!condition) {
        const error = new Error(message);
        error.details = details;
        throw error;
    }
}

const gameDataManager = bootstrapGameData();
setGameDataManager(gameDataManager);
const executor = new ActionExecutor({ gameDataManager, random: () => 0 });
const actor = {
    battleStat: {
        fireDamage: '50',
        waterDamage: '0'
    }
};
const target = {
    battleStat: {
        fireResist: '20',
        waterResist: '200'
    }
};

const fire = executor.applyElementalEquipmentDamage(
    { type: 'DAMAGE', amount: '100' },
    actor,
    target,
    'FIRE'
);
const water = executor.applyElementalEquipmentDamage(
    { type: 'DAMAGE', amount: '100' },
    actor,
    target,
    'WATER'
);
const neutral = executor.applyElementalEquipmentDamage(
    { type: 'DAMAGE', amount: '100' },
    actor,
    target,
    'NEUTRAL'
);

assert(fire.amount === '120'
    && fire.elementalEquipment.damageBonus === '50'
    && fire.elementalEquipment.resistance === '20',
'Matching elemental damage/resistance formula is invalid', fire);
assert(water.amount === '20'
    && water.elementalEquipment.resistance === '80',
'Element resistance cap must preserve at least 20% damage', water);
assert(neutral.amount === '100' && !neutral.elementalEquipment,
'NEUTRAL damage must ignore elemental equipment stats', neutral);

console.log(JSON.stringify({
    status: 'PASS',
    fireDamage: fire.amount,
    cappedWaterDamage: water.amount,
    neutralDamage: neutral.amount,
    checks: [
        'matching-action-element',
        'damage-relative-multiplier',
        'resistance-relative-multiplier',
        'resistance-cap-80',
        'neutral-exclusion'
    ]
}, null, 2));
