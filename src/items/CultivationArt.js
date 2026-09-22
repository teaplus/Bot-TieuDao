import BaseItem from '../core/BaseItem.js';
import ItemGameDataResolver from '../runtime/resolvers/ItemGameDataResolver.js';

function getItemGameDataResolver() {
    return new ItemGameDataResolver();
}

export default class CultivationArt extends BaseItem {
    constructor(template, instanceData = {}) {
        super(template);
        const artId = instanceData.cultivationArtId || template.artId || null;
        const artData = getItemGameDataResolver().getCultivationArtData(artId);

        this.uuid = instanceData.id;
        this.quantity = instanceData.quantity || 1;
        this.cultivationArtId = artId;
        this.rarity = artData?.rarity || template.rarity;
        this.rarityInfo = getItemGameDataResolver().getRarityInfo(this.rarity);
        this.baseCultivationBonus = artData?.baseCultivationBonus || 0;
        this.affinityCultivationBonus = artData?.affinityCultivationBonus || 0;
        this.cultivationBonus = this.baseCultivationBonus + this.affinityCultivationBonus;
        this.speedMultiplier = 1 + this.cultivationBonus;
        this.name = artData?.name || template.name;
        this.label = artData?.label || this.name;
        this.typeLabel = artData?.typeLabel || template.typeLabel || 'Công pháp tu luyện';
        this.gradeLabel = artData?.gradeLabel || template.gradeLabel || this.rarityInfo.name;
        this.element = artData?.element || template.element || null;
        this.elementLabel = artData?.elementLabel || template.elementLabel || this.element;
        this.description = artData?.description || template.description;
        this.effects = artData?.effects || template.effects || [];
    }

    getDisplayString() {
        return `${super.getDisplayString()}\nHiệu suất tu luyện: +${this.cultivationBonus * 100}%`;
    }

    getEffects() {
        return this.effects.map((effect) => ({
            ...effect,
            source: effect.source || `cultivation_art:${this.cultivationArtId}`
        }));
    }
}
