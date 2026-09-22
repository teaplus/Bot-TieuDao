export const BATTLE_FIXED_SCALE = 1_000_000n;
export const BATTLE_FIXED_SCALE_DIGITS = 6;

function expandNumber(value) {
    if (typeof value !== 'number') return String(value ?? 0).trim();
    if (!Number.isFinite(value)) throw new Error(`BATTLE_FIXED_NON_FINITE:${value}`);
    return value.toFixed(BATTLE_FIXED_SCALE_DIGITS);
}

export function parseBattleFixed(value = 0) {
    if (typeof value === 'bigint') return value * BATTLE_FIXED_SCALE;
    const source = expandNumber(value);
    const match = source.match(/^([+-]?)(\d+)(?:\.(\d+))?$/);
    if (!match) throw new Error(`BATTLE_FIXED_INVALID:${value}`);
    const sign = match[1] === '-' ? -1n : 1n;
    const fraction = (match[3] || '').padEnd(BATTLE_FIXED_SCALE_DIGITS, '0')
        .slice(0, BATTLE_FIXED_SCALE_DIGITS);
    return sign * ((BigInt(match[2]) * BATTLE_FIXED_SCALE) + BigInt(fraction || 0));
}

export function formatBattleFixed(rawValue) {
    const value = BigInt(rawValue);
    const sign = value < 0n ? '-' : '';
    const absolute = value < 0n ? -value : value;
    const integer = absolute / BATTLE_FIXED_SCALE;
    const fraction = (absolute % BATTLE_FIXED_SCALE).toString()
        .padStart(BATTLE_FIXED_SCALE_DIGITS, '0').replace(/0+$/, '');
    return `${sign}${integer}${fraction ? `.${fraction}` : ''}`;
}

export function normalizeBattleFixed(value = 0) {
    return formatBattleFixed(parseBattleFixed(value));
}

export function addBattleFixed(left, right) {
    return formatBattleFixed(parseBattleFixed(left) + parseBattleFixed(right));
}

export function subtractBattleFixed(left, right) {
    return formatBattleFixed(parseBattleFixed(left) - parseBattleFixed(right));
}

export function multiplyBattleFixed(left, right) {
    return formatBattleFixed((parseBattleFixed(left) * parseBattleFixed(right)) / BATTLE_FIXED_SCALE);
}

export function divideBattleFixed(left, right) {
    const divisor = parseBattleFixed(right);
    if (divisor === 0n) throw new Error('BATTLE_FIXED_DIVIDE_BY_ZERO');
    return formatBattleFixed((parseBattleFixed(left) * BATTLE_FIXED_SCALE) / divisor);
}

export function compareBattleFixed(left, right) {
    const difference = parseBattleFixed(left) - parseBattleFixed(right);
    return difference === 0n ? 0 : difference > 0n ? 1 : -1;
}

export function minBattleFixed(left, right) {
    return compareBattleFixed(left, right) <= 0 ? normalizeBattleFixed(left) : normalizeBattleFixed(right);
}

export function maxBattleFixed(left, right) {
    return compareBattleFixed(left, right) >= 0 ? normalizeBattleFixed(left) : normalizeBattleFixed(right);
}

export function floorBattleFixed(value) {
    const raw = parseBattleFixed(value);
    if (raw >= 0n) return (raw / BATTLE_FIXED_SCALE).toString();
    return (-((-raw + BATTLE_FIXED_SCALE - 1n) / BATTLE_FIXED_SCALE)).toString();
}

export function truncateBattleFixed(value) {
    return (parseBattleFixed(value) / BATTLE_FIXED_SCALE).toString();
}

export function quantizeBattleRandom(random = Math.random) {
    const sample = Number(random());
    if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
        throw new Error(`BATTLE_RANDOM_OUT_OF_RANGE:${sample}`);
    }
    return BigInt(Math.floor(sample * Number(BATTLE_FIXED_SCALE)));
}

export function randomBattleFixed(min, max, random = Math.random) {
    const minimum = parseBattleFixed(min);
    const maximum = parseBattleFixed(max);
    if (maximum < minimum) throw new Error('BATTLE_RANDOM_RANGE_INVALID');
    const unit = quantizeBattleRandom(random);
    return formatBattleFixed(minimum + ((maximum - minimum) * unit / BATTLE_FIXED_SCALE));
}

export function rollBattleProbability(percentagePoints, random = Math.random) {
    const zero = 0n;
    const hundred = parseBattleFixed(100);
    let chance = parseBattleFixed(percentagePoints);
    if (chance < zero) chance = zero;
    if (chance > hundred) chance = hundred;
    const threshold = chance * BATTLE_FIXED_SCALE / hundred;
    return quantizeBattleRandom(random) < threshold;
}

export function serializeBattleInteger(value, minimum = null) {
    let integer = floorBattleFixed(value);
    if (minimum != null && BigInt(integer) < BigInt(minimum)) integer = String(minimum);
    return integer;
}

export function ratioToBasisPoints(numerator, denominator) {
    const divisor = parseBattleFixed(denominator);
    if (divisor <= 0n) return 0;
    const value = parseBattleFixed(numerator);
    const basisPoints = value * 10_000n / divisor;
    return Number(basisPoints < 0n ? 0n : basisPoints > 10_000n ? 10_000n : basisPoints);
}
