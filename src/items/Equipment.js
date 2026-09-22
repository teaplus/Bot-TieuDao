import BaseItem from '../core/BaseItem.js';

export default class Equipment extends BaseItem {
    constructor(template, instanceData = {}) {
        super({ ...template, rarity: instanceData.rarity || template.rarity });
        this.uuid = instanceData.id;
        this.equipmentType = String(template.equipment_type || template.slot || 'ARTIFACT').toUpperCase();
        this.slot = this.equipmentType;
        this.equippedSlot = instanceData.equipped_slot || instanceData.equippedSlot || null;
        this.isEquipped = Boolean(this.equippedSlot || instanceData.isEquipped);
        this.grade = instanceData.instance_data?.grade || instanceData.grade || null;
        this.gradeQuality = instanceData.instance_data?.gradeQuality || instanceData.gradeQuality || null;
        this.fixedEffects = instanceData.instance_data?.fixedEffects || instanceData.fixedEffects || template.fixed_effects || [];
        this.affixes = instanceData.instance_data?.affixes || instanceData.affixes || [];
        this.elementIds = instanceData.instance_data?.elementIds || instanceData.elementIds || [];
        this.generatedName = instanceData.instance_data?.generatedName || instanceData.generatedName || null;
        if (this.generatedName) this.name = this.generatedName;
    }

    getDisplayString() {
        let result = super.getDisplayString();
        result += `\n${this.getEffectsDisplay()}`;
        if (this.isEquipped) result += `\n[Đang trang bị: ${this.equippedSlot || this.slot}]`;
        return result;
    }

    getEffects() {
        return [...this.fixedEffects, ...this.affixes].map((effect) => ({
            ...effect,
            source: effect.source || `equipment:${this.uuid || this.id}`
        }));
    }
}
