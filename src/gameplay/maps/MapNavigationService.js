export default class MapNavigationService {
    constructor(options = {}) {
        this.gameDataManager = options.gameDataManager;
    }

    getRoute() {
        return Object.values(this.gameDataManager.getCollection('maps') || {})
            .sort((left, right) => Number(left.navigationOrder) - Number(right.navigationOrder));
    }

    getStartingMap() {
        const map = this.getRoute().find((entry) => entry.isStartingMap === true);
        if (!map) throw new Error('MAP_STARTING_LOCATION_MISSING');
        return map;
    }

    getAdjacent(mapId, direction) {
        const route = this.getRoute();
        const currentIndex = route.findIndex((map) => map.id === mapId);
        if (currentIndex < 0) throw new Error(`MAP_NOT_FOUND:${mapId}`);
        const offset = direction === 'HIGHER' ? 1 : direction === 'LOWER' ? -1 : 0;
        if (!offset) throw new Error(`MAP_DIRECTION_INVALID:${direction}`);
        return route[currentIndex + offset] || null;
    }

    getAccess(map, playerRealmId) {
        if (!map) return { canEnter: false, reason: 'ROUTE_BOUNDARY' };
        if (map.status !== 'ACTIVE') {
            return { canEnter: false, reason: `MAP_NOT_ACTIVE:${map.id}:${map.status}` };
        }
        if (!map.activityTypes.includes('EXPLORATION')) {
            return { canEnter: false, reason: `MAP_ACTIVITY_NOT_SUPPORTED:${map.id}:EXPLORATION` };
        }
        const realm = this.gameDataManager.requireRecord('realms', playerRealmId);
        if (Number(realm.order) < Number(map.unlockCondition?.realmOrder)) {
            return { canEnter: false, reason: `MAP_LOCKED:${map.id}` };
        }
        return { canEnter: true, reason: null };
    }

    requireAccessible(map, playerRealmId) {
        const access = this.getAccess(map, playerRealmId);
        if (!access.canEnter) throw new Error(access.reason);
        return map;
    }
}
