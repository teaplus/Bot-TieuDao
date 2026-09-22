import BaseItem from '../core/BaseItem.js';

export default class Equipment extends BaseItem {
    constructor(template, instanceData = {}) {
        super({ ...template, rarity: instanceData.rarity || template.rarity });
        this.uuid = instanceData.id;
        this.slot = template.slot;
        this.equippedSlot = instanceData.equipped_slot || instanceData.equippedSlot || null;
        this.isEquipped = Boolean(this.equippedSlot || instanceData.isEquipped);
        this.fixedEffects = template.fixed_effects || [];
        this.affixes = instanceData.instance_data?.affixes || instanceData.affixes || [];
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
