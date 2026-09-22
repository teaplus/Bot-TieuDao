import { addBattleFixed, divideBattleFixed, maxBattleFixed, minBattleFixed } from '../numeric/BattleFixed.js';

export const ELEMENTAL_BATTLE_ELEMENT_IDS = Object.freeze([
    'METAL', 'WOOD', 'WATER', 'FIRE', 'EARTH', 'ICE', 'LIGHTNING', 'WIND',
    'LIGHT', 'DARK', 'CHAOS'
]);

function elementStatKey(elementId, suffix) {
    return `${String(elementId || '').toLowerCase()}${suffix}`;
}

const ELEMENTAL_BATTLE_STAT_DEFINITIONS = Object.freeze(Object.fromEntries(
    ELEMENTAL_BATTLE_ELEMENT_IDS.flatMap((elementId) => [
        [
            elementStatKey(elementId, 'Damage'),
            Object.freeze({ attributeId: `ELEMENT_${elementId}_DAMAGE`, fallback: 0 })
        ],
        [
            elementStatKey(elementId, 'Resist'),
            Object.freeze({ attributeId: `ELEMENT_${elementId}_RESIST`, fallback: 0 })
        ]
    ])
));

export const BATTLE_STAT_DEFINITIONS = Object.freeze({
    hp: Object.freeze({ attributeId: 'HP', fallback: 100 }),
    atk: Object.freeze({ attributeId: 'ATK', fallback: 10 }),
    def: Object.freeze({ attributeId: 'DEF', fallback: 0 }),
    spd: Object.freeze({ attributeId: 'SPD', fallback: 100 }),
    critRate: Object.freeze({ attributeId: 'CRIT', fallback: 5 }),
    critDamage: Object.freeze({ attributeId: 'CDMG', fallback: 50 }),
    pen: Object.freeze({ attributeId: 'PEN', fallback: 0 }),
    skillDamage: Object.freeze({ attributeId: 'SKD', fallback: 0 }),
    lifesteal: Object.freeze({ attributeId: 'LS', fallback: 0 }),
    shieldPower: Object.freeze({ attributeId: 'SHD', fallback: 0 }),
    regen: Object.freeze({ attributeId: 'REG', fallback: 0 }),
    controlRate: Object.freeze({ attributeId: 'CCR', fallback: 0 }),
    controlResist: Object.freeze({ attributeId: 'TEN', fallback: 0 }),
    reflect: Object.freeze({ attributeId: 'REF', fallback: 0 }),
    luck: Object.freeze({ attributeId: 'LUK', fallback: 0 }),
    finalDamage: Object.freeze({ attributeId: 'FINAL_DAMAGE', fallback: 0 }),
    finalDefense: Object.freeze({ attributeId: 'FINAL_DEFENSE', fallback: 0 }),
    hitRate: Object.freeze({ attributeId: 'HIT_RATE', fallback: 100 }),
    controlImmunity: Object.freeze({ attributeId: 'CONTROL_IMMUNITY', fallback: 0 }),
    ...ELEMENTAL_BATTLE_STAT_DEFINITIONS
});

export function getElementDamageStatKey(elementId) {
    return elementStatKey(elementId, 'Damage');
}

export function getElementResistStatKey(elementId) {
    return elementStatKey(elementId, 'Resist');
}

export function percentagePointsToRate(value) {
    return divideBattleFixed(maxBattleFixed(0, value || 0), 100);
}

export function percentagePointsToProbability(value) {
    return minBattleFixed(1, percentagePointsToRate(value));
}

export function criticalDamageBonusToMultiplier(value) {
    return addBattleFixed(1, percentagePointsToRate(value));
}
