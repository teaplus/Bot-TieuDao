import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';

export default class MonsterQualityRoller {
    constructor(options = {}) {
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.random = options.random || Math.random;
    }

    roll(poolId) {
        const pool = this.gameDataManager.requireRecord('monsterQualityPools', poolId);
        let roll = this.random() * pool.entries.reduce((total, entry) => total + entry.weight, 0);
        for (const entry of pool.entries) {
            roll -= entry.weight;
            if (roll <= 0) return this.describe(pool, entry);
        }
        return this.describe(pool, pool.entries.at(-1));
    }

    rollForRealm(realmCode) {
        const pool = Object.values(this.gameDataManager.getCollection('monsterQualityPools') || {})
            .find((candidate) => candidate.realmCode === realmCode);
        return pool ? this.roll(pool.id) : null;
    }

    describe(pool, entry) {
        return {
            pool,
            entry,
            quality: this.gameDataManager.requireRecord('monsterQualityTiers', entry.qualityId)
        };
    }
}
