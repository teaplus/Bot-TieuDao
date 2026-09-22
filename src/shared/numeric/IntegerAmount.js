function parseIntegerAmount(value) {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') {
        if (!Number.isSafeInteger(value)) {
            throw new Error(`UNSAFE_INTEGER_AMOUNT:${value}`);
        }
        return BigInt(value);
    }

    const source = String(value ?? 0).trim();
    if (!/^[+-]?\d+$/.test(source)) {
        throw new Error(`INVALID_INTEGER_AMOUNT:${value}`);
    }
    return BigInt(source);
}

export function normalizeIntegerAmount(value = 0) {
    return parseIntegerAmount(value).toString();
}

export function compareIntegerAmounts(left, right) {
    const difference = parseIntegerAmount(left) - parseIntegerAmount(right);
    return difference === 0n ? 0 : difference > 0n ? 1 : -1;
}

export function isPositiveIntegerAmount(value) {
    return compareIntegerAmounts(value, 0) > 0;
}

export function formatIntegerAmount(value, locale = 'vi-VN') {
    return parseIntegerAmount(value).toLocaleString(locale);
}
