import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import MonsterQualityRoller from '../monsters/MonsterQualityRoller.js';

const SPAWN_VARIANTS = Object.freeze({
    NORMAL: 'NORMAL',
    ELITE: 'ELITE',
    BOSS: 'BOSS'
});

export default class MapEncounterService {
    constructor(options = {}) {
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.random = options.random || Math.random;
        this.qualityRoller = options.qualityRoller || new MonsterQualityRoller({
            gameDataManager: this.gameDataManager,
            random: this.random
        });
    }

    select(mapId, playerRealmId) {
        const map = this.gameDataManager.requireRecord('maps', mapId);
        if (map.status !== 'ACTIVE') throw new Error(`MAP_NOT_ACTIVE:${mapId}:${map.status}`);
        if (!map.activityTypes.includes('EXPLORATION')) throw new Error(`MAP_ACTIVITY_NOT_SUPPORTED:${mapId}:EXPLORATION`);

        const playerRealm = this.gameDataManager.requireRecord('realms', playerRealmId);
        const playerRealmOrder = Number(playerRealm.order);
        if (map.unlockCondition?.type === 'MIN_REALM_ORDER'
            && playerRealmOrder < Number(map.unlockCondition.realmOrder)) {
            throw new Error(`MAP_LOCKED:${mapId}`);
        }

        const pool = this.gameDataManager.requireRecord('monsterSpawnPools', map.monsterSpawnPoolId);
        const eligibleEntries = pool.entries.filter((entry) => (
            playerRealmOrder >= entry.minPlayerRealmOrder
            && (entry.maxPlayerRealmOrder == null || playerRealmOrder <= entry.maxPlayerRealmOrder)
        ));
        if (eligibleEntries.length === 0) throw new Error(`MAP_SPAWN_POOL_EMPTY:${mapId}:${playerRealmOrder}`);

        const entry = this.pickWeighted(eligibleEntries);
        const qualityRoll = entry.spawnType === 'BOSS' || !map.monsterQualityPoolId
            ? null
            : this.qualityRoller.roll(map.monsterQualityPoolId);
        return {
            map,
            pool,
            entry,
            monsterId: entry.monsterId,
            variantId: SPAWN_VARIANTS[entry.spawnType],
            qualityId: qualityRoll?.quality.id || null,
            qualityPoolId: qualityRoll?.pool.id || null
        };
    }

    pickWeighted(entries) {
        let roll = this.random() * entries.reduce((total, entry) => total + entry.weight, 0);
        for (const entry of entries) {
            roll -= entry.weight;
            if (roll <= 0) return entry;
        }
        return entries[entries.length - 1];
    }
}
