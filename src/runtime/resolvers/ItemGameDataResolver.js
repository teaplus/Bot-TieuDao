import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';

const DEFAULT_RARITY_INFO = Object.freeze({
    name: 'Unknown',
    color: '#9CA3AF'
});

export default class ItemGameDataResolver {
    constructor(options = {}) {
        this.gameDataManager = options.gameDataManager || getGameDataManager();
    }

    getItemTemplate(itemId) {
        return this.gameDataManager.getRecord('itemTemplates', itemId);
    }

    getSkillData(skillId) {
        return this.gameDataManager.getRecord('skills', skillId);
    }

    getCultivationArtData(artId) {
        return this.gameDataManager.getRecord('cultivationArts', artId);
    }

    getRarityInfo(rarityId) {
        return this.gameDataManager.getRecord('rarities', rarityId) || DEFAULT_RARITY_INFO;
    }

    getEquipmentAffixes(slot) {
        const affixPools = this.gameDataManager.getCollection('equipmentAffixes') || {};
        return affixPools[String(slot || '').toLowerCase()] || [];
    }

    getEquipmentType(typeId) {
        return this.gameDataManager.getRecord('equipmentTypes', typeId);
    }

    getElement(elementId) {
        return this.gameDataManager.getRecord('elements', elementId);
    }

    getEquipmentGradeQuality(grade, quality) {
        const grades = this.gameDataManager.getCollection('equipmentGrades') || {};
        const gradeData = grades[grade];

        return gradeData?.qualities?.find((entry) => entry.quality === quality) || null;
    }
}
