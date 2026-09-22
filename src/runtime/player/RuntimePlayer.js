export default class RuntimePlayer {
    constructor(payload) {
        this.playerId = payload.playerId;
        this.name = payload.name;
        this.accountStatus = payload.accountStatus || 'REGISTERED';
        this.realmId = payload.realmId;
        this.realmStage = payload.realmStage;
        this.cultivation = payload.cultivation;
        this.cultivationArtId = payload.cultivationArtId;
        this.spiritualRoot = payload.spiritualRoot;
        this.spiritRootId = payload.spiritRootId;
        this.spiritRootQualityTierId = payload.spiritRootQualityTierId || null;
        this.sectId = payload.sectId || null;
        this.sectRejoinAvailableAt = payload.sectRejoinAvailableAt || null;
        this.sectPolicyRevision = payload.sectPolicyRevision || null;
        this.rebirthCount = payload.rebirthCount;
        this.rebirthPolicyRevision = payload.rebirthPolicyRevision;
        this.currencies = Object.freeze({ ...payload.currencies });
        this.baseStats = Object.freeze({ ...payload.baseStats });
        this.inventory = payload.inventory;
        this.equipmentIds = Object.freeze([...payload.equipmentIds]);
        this.learnedSkillIds = Object.freeze([...(payload.learnedSkillIds || [])]);
        this.equippedSkillIds = Object.freeze([...(payload.equippedSkillIds || [])]);
        this.skillIds = this.equippedSkillIds;
        this.cultivationArtIds = Object.freeze([...payload.cultivationArtIds]);
        this.runtimeSkills = Object.freeze([...(payload.runtimeSkills || [])]);
        this.activeEffects = Object.freeze([...(payload.activeEffects || [])]);
        this.progress = Object.freeze({ ...payload.progress });
        this.timestamps = Object.freeze({ ...payload.timestamps });
    }
}
