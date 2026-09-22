import fs from 'fs';

const rarities = JSON.parse(fs.readFileSync('./src/data/rarities.json', 'utf-8'));
const affixPools = JSON.parse(fs.readFileSync('./src/data/equipmentAffixes.json', 'utf-8'));

export default class ItemGenerator {
    static rollEquipment(template, rarity = template.rarity) {
        if (template.type !== 'EQUIPMENT') throw new Error(`Item ${template.id} không phải trang bị.`);
        const rarityData = rarities[rarity];
        if (!rarityData) throw new Error(`Phẩm cấp không hợp lệ: ${rarity}`);

        const [min, max] = rarityData.affix_count;
        const affixCount = this.randomInteger(min, max);
        const pool = [...(affixPools[template.slot] || [])];
        const affixes = [];

        while (affixes.length < affixCount && pool.length > 0) {
            const index = this.weightedIndex(pool);
            const [affix] = pool.splice(index, 1);
            affixes.push({
                stat: affix.stat,
                mode: affix.mode,
                value: this.randomValue(affix, rarityData.affix_scale || 1)
            });
        }

        return { rarity, affixes };
    }

    static weightedIndex(entries) {
        let roll = Math.random() * entries.reduce((sum, item) => sum + (item.weight || 1), 0);
        for (let index = 0; index < entries.length; index += 1) {
            roll -= entries[index].weight || 1;
            if (roll <= 0) return index;
        }
        return entries.length - 1;
    }

    static randomValue(affix, scale = 1) {
        const factor = 10 ** (affix.decimals || 0);
        const scalesAsPercent = affix.mode === 'add_percent_base';
        const effectiveScale = scalesAsPercent ? Math.sqrt(scale) : scale;
        return this.randomInteger(
            Math.ceil(affix.min * effectiveScale * factor),
            Math.floor(affix.max * effectiveScale * factor)
        ) / factor;
    }

    static randomInteger(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}
