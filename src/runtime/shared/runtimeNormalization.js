export function normalizeNumber(value, fallback = 0) {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : fallback;
}

export function normalizeDate(value) {
    if (!value) {
        return null;
    }

    const normalized = new Date(value);
    return Number.isNaN(normalized.getTime()) ? null : normalized;
}

