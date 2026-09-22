export const CACHE_NAMESPACES = Object.freeze({
    GAME_DATA: 'GAME_DATA',
    PLAYER: 'PLAYER',
    INVENTORY: 'INVENTORY',
    GUILD: 'GUILD',
    SESSION: 'SESSION'
});

const SUPPORTED_NAMESPACES = new Set(Object.values(CACHE_NAMESPACES));

export function assertCacheNamespace(namespace) {
    if (!SUPPORTED_NAMESPACES.has(namespace)) {
        throw new Error(`CACHE_NAMESPACE_UNSUPPORTED:${namespace}`);
    }
    return namespace;
}
