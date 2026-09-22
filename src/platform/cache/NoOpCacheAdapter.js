export default class NoOpCacheAdapter {
    get available() {
        return false;
    }

    async get() {
        return null;
    }

    async set() {
        return false;
    }

    async delete() {
        return false;
    }

    async invalidateNamespace() {
        return 0;
    }
}
