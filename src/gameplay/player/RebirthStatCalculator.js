import { normalizeIntegerAmount } from '../../shared/numeric/IntegerAmount.js';

function toNonNegativeBigInt(value, errorCode) {
    const normalized = BigInt(normalizeIntegerAmount(value));
    if (normalized < 0n) throw new Error(errorCode);
    return normalized;
}

function integerSquareRoot(value) {
    if (value < 0n) throw new Error('REBIRTH_SQRT_NEGATIVE');
    if (value < 2n) return value;

    let current = 1n << (BigInt(value.toString(2).length) + 1n) / 2n;
    let next = (current + value / current) / 2n;
    while (next < current) {
        current = next;
        next = (current + value / current) / 2n;
    }
    return current;
}

export default class RebirthStatCalculator {
    constructor(rules = {}) {
        this.rules = rules;
        if (rules.formula !== 'REALM_STAGE_BASE_SQRT_REBIRTH'
            || rules.coefficientNumerator !== '1'
            || rules.coefficientDenominator !== '4'
            || rules.rounding !== 'FLOOR') {
            throw new Error('UNSUPPORTED_REBIRTH_STAT_POLICY');
        }
    }

    calculate(baseValue, rebirthCount) {
        const base = toNonNegativeBigInt(baseValue, 'NEGATIVE_REALM_STAGE_BASE_STAT');
        const count = toNonNegativeBigInt(rebirthCount, 'NEGATIVE_REBIRTH_COUNT');
        const scaledRoot = integerSquareRoot(base * base * count);
        return (base + scaledRoot / 4n).toString();
    }

    calculateStats(baseStats, rebirthCount) {
        return Object.fromEntries(Object.entries(baseStats).map(([stat, value]) => [
            stat,
            this.calculate(value, rebirthCount)
        ]));
    }
}
