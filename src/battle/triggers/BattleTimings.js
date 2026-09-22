export const BATTLE_TIMINGS = Object.freeze({
    BATTLE_START: 'BATTLE_START',
    ROUND_START: 'ROUND_START',
    TURN_START: 'TURN_START',
    BEFORE_ACTION: 'BEFORE_ACTION',
    AFTER_ACTION: 'AFTER_ACTION',
    ON_APPLY: 'ON_APPLY',
    ON_ATTACK: 'ON_ATTACK',
    ON_HIT: 'ON_HIT',
    ON_HEAL: 'ON_HEAL',
    ON_SHIELD: 'ON_SHIELD',
    ON_EFFECT_APPLIED: 'ON_EFFECT_APPLIED',
    ON_DEATH: 'ON_DEATH',
    TURN_END: 'TURN_END',
    ROUND_END: 'ROUND_END',
    BATTLE_END: 'BATTLE_END'
});

export function isBattleTiming(value) {
    return Object.values(BATTLE_TIMINGS).includes(value);
}
