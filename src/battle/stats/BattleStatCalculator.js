import {
    addBattleFixed,
    compareBattleFixed,
    multiplyBattleFixed,
    normalizeBattleFixed,
    subtractBattleFixed
} from '../numeric/BattleFixed.js';

function normalizePercentRate(value) {
    const normalized = normalizeBattleFixed(value);
    if (compareBattleFixed(normalized, 1) > 0 || compareBattleFixed(normalized, -1) < 0) {
        return multiplyBattleFixed(normalized, '0.01');
    }
    return normalized;
}

export default class BattleStatCalculator {
    static calculate(baseValue, effects = [], stat) {
        const relevant = effects.filter((effect) => effect.stat === stat);
        let flatBase = '0';
        let percentBase = '0';
        let flatFinal = '0';
        let totalMultiplier = '1';
        let setValue = null;

        for (const effect of relevant) {
            const value = normalizeBattleFixed(effect.normalizedValue ?? effect.value ?? 0);
            if (effect.mode === 'add_flat_base') flatBase = addBattleFixed(flatBase, value);
            if (effect.mode === 'add_percent_base') percentBase = addBattleFixed(percentBase, normalizePercentRate(value));
            if (effect.mode === 'add_flat_final') flatFinal = addBattleFixed(flatFinal, value);
            if (effect.mode === 'mul_total') totalMultiplier = multiplyBattleFixed(totalMultiplier, value);
            if (effect.mode === 'set') setValue = value;
        }

        if (setValue != null) return setValue;
        const base = normalizeBattleFixed(baseValue);
        const baseStage = addBattleFixed(addBattleFixed(base, flatBase), multiplyBattleFixed(base, percentBase));
        return addBattleFixed(multiplyBattleFixed(baseStage, totalMultiplier), flatFinal);
    }

    static applyRuntimeModifier(currentValue, modifier) {
        const value = normalizeBattleFixed(modifier.normalizedValue ?? modifier.value ?? 0);
        if (modifier.operation === 'SET' || modifier.mode === 'set') return value;
        if (modifier.operation === 'MULTIPLY' || modifier.mode === 'add_percent_base') {
            return addBattleFixed(currentValue, multiplyBattleFixed(currentValue, normalizePercentRate(value)));
        }
        if (modifier.operation === 'SUBTRACT') return subtractBattleFixed(currentValue, value);
        return addBattleFixed(currentValue, value);
    }
}
