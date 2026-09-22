import crypto from 'node:crypto';

function sortValue(value) {
    if (Array.isArray(value)) {
        return value.map(sortValue);
    }

    if (value && typeof value === 'object') {
        return Object.keys(value)
            .sort()
            .reduce((result, key) => {
                result[key] = sortValue(value[key]);
                return result;
            }, {});
    }

    return value;
}

export function createRequestHash(payload) {
    const canonicalPayload = JSON.stringify(sortValue(payload));
    return crypto.createHash('sha256').update(canonicalPayload).digest('hex');
}
