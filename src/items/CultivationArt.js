import fs from 'fs';
import BaseItem from '../core/BaseItem.js';

const cultivationArts = JSON.parse(fs.readFileSync('./src/data/cultivationArts.json', 'utf-8'));
const rarities = JSON.parse(fs.readFileSync('./src/data/rarities.json', 'utf-8'));

export default class CultivationArt extends BaseItem {
    constructor(template, instanceData = {}) {
        super(template);
        const artId = instanceData.cultivationArtId || template.artId || null;
        const artData = cultivationArts[artId];

        this.uuid = instanceData.id;
        this.quantity = instanceData.quantity || 1;
        this.cultivationArtId = artId;
        this.rarity = artData?.rarity || template.rarity;
        this.rarityInfo = rarities[this.rarity] || this.rarityInfo;
        this.cultivationBonus = rarities[this.rarity]?.cultivation_bonus || 0;
        this.speedMultiplier = 1 + this.cultivationBonus;
        this.name = artData?.name || template.name;
        this.description = artData?.description || template.description;
        this.effects = artData?.effects || template.effects || [];
    }

    getDisplayString() {
        return `${super.getDisplayString()}\nHiệu suất tu luyện: +${this.cultivationBonus * 100}%`;
    }

    getEffects() {
        const cultivationEffect = this.cultivationBonus > 0
            ? [{ stat: 'cultivation_speed', mode: 'add_percent_base', value: this.cultivationBonus }]
            : [];

        return [...cultivationEffect, ...this.effects].map((effect) => ({
            ...effect,
            source: effect.source || `cultivation_art:${this.cultivationArtId}`
        }));
    }
}
