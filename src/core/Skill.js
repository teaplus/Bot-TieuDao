export default class Skill {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.label = data.label || data.name;
        this.type = data.type;
        this.typeLabel = data.typeLabel || data.type;
        this.rarity = data.rarity;
        this.gradeLabel = data.gradeLabel || data.rarity;
        this.element = data.combat?.element || data.element || null;
        this.elementLabel = data.elementLabel || this.element;
        this.description = data.description;
        this.spiritCost = data.spirit_cost || 0;
        this.combat = data.combat || null;
        this.effects = data.effects || [];
    }

    getEffects() {
        if (this.type !== 'PASSIVE') return [];
        return this.effects.map((effect) => ({ ...effect, source: `skill:${this.id}` }));
    }
}
