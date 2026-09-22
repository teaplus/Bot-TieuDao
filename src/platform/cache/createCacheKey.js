import { assertCacheNamespace } from './CacheNamespaces.js';

function normalizeSegment(value, errorCode) {
    const segment = String(value || '').trim();
    if (!segment || segment.includes(':')) throw new Error(errorCode);
    return segment;
}

export default function createCacheKey({ namespace, identity, version = 'v1' }) {
    return [
        assertCacheNamespace(namespace),
        normalizeSegment(version, 'CACHE_KEY_VERSION_INVALID'),
        normalizeSegment(identity, 'CACHE_KEY_IDENTITY_INVALID')
    ].join(':');
}
