import NoOpCacheAdapter from './NoOpCacheAdapter.js';
import createCacheKey from './createCacheKey.js';
import { assertCacheNamespace } from './CacheNamespaces.js';

export default class CacheService {
    constructor(options = {}) {
        this.adapter = options.adapter || new NoOpCacheAdapter();
        this.onAdapterError = options.onAdapterError || (() => {});
    }

    async getOrLoad(keyDefinition, loader, options = {}) {
        if (typeof loader !== 'function') throw new Error('CACHE_LOADER_REQUIRED');
        const key = createCacheKey(keyDefinition);
        const cached = await this.tryAdapter('get', key);
        if (cached.ok && cached.value !== null && cached.value !== undefined) {
            return { value: cached.value, source: 'CACHE', key };
        }

        const value = await loader();
        if (value !== null && value !== undefined) {
            await this.tryAdapter('set', key, value, {
                ttlSeconds: options.ttlSeconds,
                version: keyDefinition.version || 'v1'
            });
        }
        return { value, source: 'SOURCE_OF_TRUTH', key };
    }

    async delete(keyDefinition) {
        return (await this.tryAdapter('delete', createCacheKey(keyDefinition))).value || false;
    }

    async invalidateNamespace(namespace) {
        return (await this.tryAdapter('invalidateNamespace', assertCacheNamespace(namespace))).value || 0;
    }

    async tryAdapter(method, ...args) {
        try {
            if (typeof this.adapter?.[method] !== 'function') {
                throw new Error(`CACHE_ADAPTER_METHOD_REQUIRED:${method}`);
            }
            return { ok: true, value: await this.adapter[method](...args) };
        } catch (error) {
            this.onAdapterError({ method, error });
            return { ok: false, value: null };
        }
    }
}
