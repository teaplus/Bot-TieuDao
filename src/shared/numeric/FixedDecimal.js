const DEFAULT_SCALE = 6;

function pow10(scale) {
    return 10n ** BigInt(scale);
}

function expandScientificNotation(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        throw new Error(`INVALID_DECIMAL:${value}`);
    }

    return numeric.toFixed(12).replace(/0+$/, '').replace(/\.$/, '');
}

export function toScaledInteger(value, scale = DEFAULT_SCALE) {
    let source = String(value ?? 0).trim();
    if (/e/i.test(source)) {
        source = expandScientificNotation(source);
    }

    const match = source.match(/^([+-]?)(\d+)(?:\.(\d+))?$/);
    if (!match) {
        throw new Error(`INVALID_DECIMAL:${value}`);
    }

    const sign = match[1] === '-' ? -1n : 1n;
    const integerPart = BigInt(match[2]);
    const fraction = match[3] || '';
    const keptFraction = fraction.slice(0, scale).padEnd(scale, '0');
    let result = integerPart * pow10(scale) + BigInt(keptFraction || 0);

    const discarded = fraction.slice(scale);
    if (discarded[0] >= '5') {
        result += 1n;
    }

    return result * sign;
}

export function fromScaledInteger(value, scale = DEFAULT_SCALE) {
    const sign = value < 0n ? '-' : '';
    const absolute = value < 0n ? -value : value;
    const factor = pow10(scale);
    const integerPart = absolute / factor;
    const fractionPart = String(absolute % factor).padStart(scale, '0');
    return `${sign}${integerPart}.${fractionPart}`;
}

export function normalizeDecimal(value, scale = DEFAULT_SCALE) {
    return fromScaledInteger(toScaledInteger(value, scale), scale);
}

export function addDecimal(left, right, scale = DEFAULT_SCALE) {
    return fromScaledInteger(toScaledInteger(left, scale) + toScaledInteger(right, scale), scale);
}

export function subtractDecimal(left, right, scale = DEFAULT_SCALE) {
    return fromScaledInteger(toScaledInteger(left, scale) - toScaledInteger(right, scale), scale);
}

export function compareDecimal(left, right, scale = DEFAULT_SCALE) {
    const difference = toScaledInteger(left, scale) - toScaledInteger(right, scale);
    return difference === 0n ? 0 : difference > 0n ? 1 : -1;
}

export function minDecimal(left, right, scale = DEFAULT_SCALE) {
    return compareDecimal(left, right, scale) <= 0
        ? normalizeDecimal(left, scale)
        : normalizeDecimal(right, scale);
}

export function maxDecimal(left, right, scale = DEFAULT_SCALE) {
    return compareDecimal(left, right, scale) >= 0
        ? normalizeDecimal(left, scale)
        : normalizeDecimal(right, scale);
}

export function multiplyDecimal(left, right, scale = DEFAULT_SCALE) {
    const factor = pow10(scale);
    const product = toScaledInteger(left, scale) * toScaledInteger(right, scale);
    const sign = product < 0n ? -1n : 1n;
    const absolute = product < 0n ? -product : product;
    const rounded = (absolute + factor / 2n) / factor;
    return fromScaledInteger(rounded * sign, scale);
}

export function divideDecimalByInteger(value, divisor, scale = DEFAULT_SCALE) {
    const integerDivisor = BigInt(divisor);
    if (integerDivisor === 0n) {
        throw new Error('DIVISION_BY_ZERO');
    }

    const scaled = toScaledInteger(value, scale);
    const sign = (scaled < 0n) !== (integerDivisor < 0n) ? -1n : 1n;
    const absoluteValue = scaled < 0n ? -scaled : scaled;
    const absoluteDivisor = integerDivisor < 0n ? -integerDivisor : integerDivisor;
    const rounded = (absoluteValue + absoluteDivisor / 2n) / absoluteDivisor;
    return fromScaledInteger(rounded * sign, scale);
}

export function decimalPercent(value, total, scale = DEFAULT_SCALE) {
    const denominator = toScaledInteger(total, scale);
    if (denominator <= 0n) return '0.0';

    const numerator = toScaledInteger(value, scale);
    const tenths = (numerator * 1000n) / denominator;
    const capped = tenths > 1000n ? 1000n : tenths < 0n ? 0n : tenths;
    return `${capped / 10n}.${capped % 10n}`;
}

export function displayDecimal(value, scale = DEFAULT_SCALE) {
    const normalized = normalizeDecimal(value, scale);
    return normalized.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}
