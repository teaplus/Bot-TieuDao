import fs from 'fs';
import EffectFormatter from './EffectFormatter.js';

const rarities = JSON.parse(fs.readFileSync('./src/data/rarities.json', 'utf-8'));

export default class BaseItem {
    constructor(template) {
        this.id = template.id;
        this.name = template.name;
        this.type = template.type;
        this.rarity = template.rarity;
        this.rarityInfo = rarities[this.rarity] || { name: this.rarity, color: '#9CA3AF' };
        this.description = template.description;
        this.templateEffects = template.effects || [];
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
