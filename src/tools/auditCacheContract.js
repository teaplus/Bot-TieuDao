import assert from 'node:assert/strict';
import CacheService from '../platform/cache/CacheService.js';
import NoOpCacheAdapter from '../platform/cache/NoOpCacheAdapter.js';
import { CACHE_NAMESPACES } from '../platform/cache/CacheNamespaces.js';
import createCacheKey from '../platform/cache/createCacheKey.js';

const noOp = new NoOpCacheAdapter();
assert.equal(noOp.available, false);
assert.equal(await noOp.get('PLAYER:v1:p1'), null);

let sourceLoads = 0;
const service = new CacheService({ adapter: noOp });
const load = () => ({ revision: ++sourceLoads });
const first = await service.getOrLoad({ namespace: CACHE_NAMESPACES.PLAYER, identity: 'p1' }, load);
const second = await service.getOrLoad({ namespace: CACHE_NAMESPACES.PLAYER, identity: 'p1' }, load);
assert.equal(first.source, 'SOURCE_OF_TRUTH');
assert.equal(second.source, 'SOURCE_OF_TRUTH');
assert.equal(sourceLoads, 2, 'No-op cache must never alter source-of-truth reads');

const adapterErrors = [];
const unavailableService = new CacheService({
    adapter: {
        async get() { throw new Error('CACHE_UNAVAILABLE'); },
        async set() { throw new Error('CACHE_UNAVAILABLE'); }
    },
    onAdapterError: (event) => adapterErrors.push(event)
});
const fallback = await unavailableService.getOrLoad(
    { namespace: CACHE_NAMESPACES.INVENTORY, identity: 'p1', version: 'inventory-v2' },
    async () => ({ slots: 20 })
);
assert.deepEqual(fallback.value, { slots: 20 });
assert.equal(fallback.source, 'SOURCE_OF_TRUTH');
assert.equal(adapterErrors.length, 2, 'Read and write adapter failures must both be observable');

const memory = new Map();
const memoryService = new CacheService({
    adapter: {
        async get(key) { return memory.get(key) ?? null; },
        async set(key, value) { memory.set(key, value); return true; },
        async delete(key) { return memory.delete(key); },
        async invalidateNamespace(namespace) {
            let deleted = 0;
            for (const key of [...memory.keys()]) {
                if (key.startsWith(`${namespace}:`)) {
                    memory.delete(key);
                    deleted += 1;
                }
            }
            return deleted;
        }
    }
});
let memoryLoads = 0;
const memoryKey = { namespace: CACHE_NAMESPACES.GAME_DATA, identity: 'registry', version: 'rev-1' };
await memoryService.getOrLoad(memoryKey, async () => ({ load: ++memoryLoads }), { ttlSeconds: 60 });
const hit = await memoryService.getOrLoad(memoryKey, async () => ({ load: ++memoryLoads }), { ttlSeconds: 60 });
assert.equal(hit.source, 'CACHE');
assert.equal(memoryLoads, 1);
assert.equal(await memoryService.invalidateNamespace(CACHE_NAMESPACES.GAME_DATA), 1);

assert.equal(createCacheKey(memoryKey), 'GAME_DATA:rev-1:registry');
assert.throws(
    () => createCacheKey({ namespace: 'UNKNOWN', identity: 'x' }),
    /CACHE_NAMESPACE_UNSUPPORTED/
);
assert.throws(
    () => createCacheKey({ namespace: CACHE_NAMESPACES.PLAYER, identity: 'bad:key' }),
    /CACHE_KEY_IDENTITY_INVALID/
);

console.log(JSON.stringify({
    status: 'PASS',
    checks: {
        noOpSourceOfTruthReads: sourceLoads,
        adapterFailureFallback: true,
        cacheHit: true,
        namespaceInvalidation: true,
        versionedKey: createCacheKey(memoryKey)
    }
}, null, 2));
