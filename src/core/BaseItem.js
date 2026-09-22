import EffectFormatter from './EffectFormatter.js';
import ItemGameDataResolver from '../runtime/resolvers/ItemGameDataResolver.js';

function getItemGameDataResolver() {
    return new ItemGameDataResolver();
}

export default class BaseItem {
    constructor(template) {
        this.id = template.id;
        this.name = template.name;
        this.label = template.label || template.name;
        this.type = template.type;
        this.typeLabel = template.typeLabel || template.type;
        this.rarity = template.rarity;
        this.gradeLabel = template.gradeLabel || null;
        this.element = template.element || null;
        this.elementLabel = template.elementLabel || this.element;
        this.rarityInfo = getItemGameDataResolver().getRarityInfo(this.rarity);
        this.description = template.description;
        this.templateEffects = template.effects || [];
        this.usable = template.usable === true;
        this.actions = Object.freeze([...(template.actions || [])]);
        this.requiredRealm = template.requiredRealm || template.required_realm || null;
        this.realmPolicy = template.realmPolicy || null;
    }

    getDisplayString() {
        return `**[${this.rarityInfo.name}] ${this.name}**\n*${this.description}*`;
    }

    getEffects() {
        return this.templateEffects;
    }

    getEffectsDisplay() {
        const effects = this.getEffects();
        return effects.length
            ? effects.map((effect) => `• ${EffectFormatter.format(effect)}`).join('\n')
            : 'Không có hiệu ứng';
    }
}
