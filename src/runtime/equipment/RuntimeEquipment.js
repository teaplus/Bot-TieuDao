import { normalizeDate, normalizeNumber } from '../shared/runtimeNormalization.js';

export default class RuntimeEquipment {
    constructor(payload) {
        this.runtimeId = String(payload.runtimeId);
        this.templateId = String(payload.templateId);
        this.level = normalizeNumber(payload.level, 1);
        this.fixedEffects = Object.freeze([...(payload.fixedEffects || [])]);
        this.affixes = Object.freeze([...(payload.affixes || [])]);
        this.grade = payload.grade || null;
        this.gradeQuality = payload.gradeQuality || null;
        this.enhanceLevel = normalizeNumber(payload.enhanceLevel, 0);
        this.lockState = Boolean(payload.lockState);
        this.createTime = normalizeDate(payload.createTime);
        this.equippedSlot = payload.equippedSlot || null;
        this.rarity = payload.rarity || null;
        this.instanceData = Object.freeze({ ...(payload.instanceData || {}) });
    }
}
