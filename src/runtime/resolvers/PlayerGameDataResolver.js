import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';

export default class PlayerGameDataResolver {
    constructor(options = {}) {
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.realmIds = Object.keys(this.gameDataManager.getCollection('realms') || {})
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id))
            .sort((a, b) => a - b);
    }

    getDefaultRealmId() {
        return this.realmIds[0] || 1;
    }

    getMaxRealmId() {
        return this.realmIds[this.realmIds.length - 1] || this.getDefaultRealmId();
    }

    normalizeRealmId(realmId) {
        const parsedRealmId = Number(realmId);

        if (!Number.isInteger(parsedRealmId)) {
            return this.getDefaultRealmId();
        }

        if (this.gameDataManager.hasRecord('realms', parsedRealmId)) {
            return parsedRealmId;
        }

        if (parsedRealmId > this.getMaxRealmId()) {
            return this.getMaxRealmId();
        }

        return this.getDefaultRealmId();
    }

    getRealmInfo(realmId) {
        return this.gameDataManager.getRecord('realms', realmId);
    }

    getNextRealmInfo(realmId) {
        return this.getRealmInfo(Number(realmId) + 1);
    }

    getBreakthroughRule(realmCode) {
        return this.gameDataManager.getRecord('breakthroughRules', realmCode);
    }

    getCultivationRules() {
        return this.gameDataManager.getCollection('cultivationRules');
    }

    getProgressionRules() {
        return this.gameDataManager.getCollection('progressionRules');
    }

    getRealms() {
        return this.realmIds.map((realmId) => this.getRealmInfo(realmId));
    }

    getSpiritRootQualityTier(tierId) {
        return tierId
            ? this.gameDataManager.getRecord('spiritRootQualityTiers', tierId)
            : null;
    }

    getCultivationArtTemplate(cultivationArtId) {
        const artData = this.gameDataManager.getRecord('cultivationArts', cultivationArtId)
            || this.gameDataManager.getRecord('cultivationArts', 'CP_FIRE_HOANG');

        if (!artData) {
            return null;
        }

        return {
            id: artData.itemId,
            name: artData.name,
            type: 'CULTIVATION_ART',
            rarity: artData.rarity,
            description: artData.description,
            artId: artData.id,
            effects: artData.effects || []
        };
    }

    getEffectDefinition(stat) {
        return this.gameDataManager.getRecord('effects', stat);
    }
}
