import ItemGameDataResolver from '../runtime/resolvers/ItemGameDataResolver.js';

function getItemGameDataResolver() {
    return new ItemGameDataResolver();
}

const QUALITY_ALIAS = Object.freeze({
    MEDIUM: 'MIDDLE'
});

const BASE_PERCENT_FIELD = Object.freeze({
    WEAPON: {
        ATK_PERCENT: 'weaponAtkPercent'
    },
    ARMOR: {
        DEF_PERCENT: 'armorDefPercent'
    }
});

const BASE_MODIFIER_ATTRIBUTE = Object.freeze({
    ATK_PERCENT: 'ATK',
    DEF_PERCENT: 'DEF',
    HP_PERCENT: 'HP'
});

const BASE_MODIFIER_STAT = Object.freeze({
    ATK_PERCENT: 'atk',
    DEF_PERCENT: 'def',
    HP_PERCENT: 'hp'
});

const ELEMENTS = Object.freeze(['METAL', 'WOOD', 'WATER', 'FIRE', 'EARTH', 'ICE', 'LIGHTNING', 'WIND']);
const OFFENSIVE_TYPES = new Set(['WEAPON', 'RING']);
const ACCESSORY_TYPES = new Set(['NECKLACE', 'RING']);
const PRIMARY_STATS = Object.freeze(['HP', 'ATK', 'DEF', 'SPD', 'LUCK']);
const SECOND_ELEMENT_CHANCE = Object.freeze({ LOW: 0, MIDDLE: 25, HIGH: 50 });

export default class ItemGenerator {
    static rollEquipment(template, rarity = template.rarity, options = {}) {
        if (template.type !== 'EQUIPMENT') {
            throw new Error(`Item ${template.id} khong phai trang bi.`);
        }

        const itemGameDataResolver = getItemGameDataResolver();
        const rarityData = itemGameDataResolver.getRarityInfo(rarity);
        if (!rarityData?.affix_count) {
            throw new Error(`Pham cap khong hop le: ${rarity}`);
        }

        const random = options.random || Math.random;
        const grade = options.grade || template.grade || 'HOANG';
        const gradeQuality = this.normalizeQuality(options.gradeQuality || 'LOW');
        const gradeData = itemGameDataResolver.getEquipmentGradeQuality(grade, gradeQuality);
        if (!gradeData) throw new Error(`EQUIPMENT_GRADE_QUALITY_NOT_FOUND:${grade}:${gradeQuality}`);

        const equipmentType = String(template.equipment_type || template.equipmentType || template.slot || '').toUpperCase();
        const primaryEffect = ACCESSORY_TYPES.has(equipmentType)
            ? this.createAccessoryPrimaryEffect(equipmentType, gradeData, itemGameDataResolver, random)
            : null;
        const elementIds = this.rollElements(template.element, gradeQuality, random);
        const fixedEffects = [
            ...this.createBaseEffects(template, grade, gradeQuality, itemGameDataResolver),
            ...(primaryEffect ? [primaryEffect] : []),
            ...this.createElementEffects(equipmentType, elementIds, gradeData, grade, gradeQuality)
        ];

        const affixCount = Number(gradeData.randomAffixes || 0);
        const pool = [...itemGameDataResolver.getEquipmentAffixes(template.slot)];
        const affixes = [];
        const usedModifierIds = new Set(fixedEffects.map((effect) => effect.modifierId));

        while (affixes.length < affixCount && pool.length > 0) {
            const eligiblePool = pool.filter((entry) => !usedModifierIds.has(entry.modifierId));
            if (eligiblePool.length === 0) break;
            const index = this.weightedIndex(eligiblePool, random);
            const selected = eligiblePool[index];
            const poolIndex = pool.indexOf(selected);
            const [affix] = pool.splice(poolIndex, 1);
            affixes.push({
                modifierId: affix.modifierId,
                attributeId: affix.attributeId,
                stat: affix.stat,
                mode: affix.mode,
                operation: affix.operation,
                value: this.randomValue(affix, rarityData.affix_scale || 1, random)
            });
            usedModifierIds.add(affix.modifierId);
        }

        const generatedName = `${elementIds.map((elementId) => {
            const element = itemGameDataResolver.getElement(elementId);
            const label = element?.displayName || element?.name || elementId;
            return `[${element?.icon ? `${element.icon} ` : ''}${label}]`;
        }).join('')} ${template.name || template.displayName || template.id}`.trim();

        return {
            rarity,
            grade,
            gradeQuality,
            fixedEffects,
            affixes,
            elementIds,
            generatedName
        };
    }

    static normalizeQuality(quality) {
        return QUALITY_ALIAS[quality] || quality;
    }

    static createBaseEffects(template, grade, gradeQuality, itemGameDataResolver) {
        const type = itemGameDataResolver.getEquipmentType(template.equipment_type || template.equipmentType || template.type);
        const gradeData = itemGameDataResolver.getEquipmentGradeQuality(grade, gradeQuality);
        const fieldMap = BASE_PERCENT_FIELD[template.equipment_type || template.equipmentType || template.type] || {};

        return (type?.baseModifiers || [])
            .map((modifier) => {
                const fieldName = fieldMap[modifier.modifierId];
                const percentValue = fieldName ? Number(gradeData?.[fieldName] || 0) : Number(modifier.value || 0);

                return {
                    modifierId: modifier.modifierId,
                    attributeId: BASE_MODIFIER_ATTRIBUTE[modifier.modifierId] || modifier.modifierId,
                    stat: BASE_MODIFIER_STAT[modifier.modifierId] || String(modifier.modifierId || '').toLowerCase(),
                    operation: 'ADD_PERCENT',
                    mode: 'add_percent_base',
                    value: percentValue / 100,
                    grade,
                    gradeQuality
                };
            })
            .filter((effect) => effect.value !== 0);
    }

    static createAccessoryPrimaryEffect(equipmentType, gradeData, itemGameDataResolver, random) {
        const primary = PRIMARY_STATS[this.randomInteger(0, PRIMARY_STATS.length - 1, random)];
        if (primary === 'LUCK') {
            const luckAffix = itemGameDataResolver.getEquipmentAffixes(equipmentType)
                .find((affix) => affix.modifierId === 'LUCK_UP');
            return {
                modifierId: 'LUCK_UP',
                attributeId: 'LUK',
                stat: 'luck',
                operation: 'ADD',
                mode: 'add_flat',
                value: this.randomValue(luckAffix || { min: 1, max: 5, decimals: 0, mode: 'add_flat' }, 1, random),
                primary: true
            };
        }

        const percentValue = equipmentType === 'RING'
            ? Number(gradeData.ringHpPercent || 0)
            : Number(gradeData.necklaceDefPercent || 0);
        return {
            modifierId: `${primary}_PERCENT`,
            attributeId: primary,
            stat: primary.toLowerCase(),
            operation: 'ADD_PERCENT',
            mode: 'add_percent_base',
            value: percentValue / 100,
            primary: true
        };
    }

    static rollElements(templateElement, gradeQuality, random) {
        const primaryElement = String(templateElement || '').toUpperCase();
        if (!ELEMENTS.includes(primaryElement)) {
            throw new Error(`EQUIPMENT_ELEMENT_INVALID:${templateElement}`);
        }
        const elements = [primaryElement];
        if ((random() * 100) < Number(SECOND_ELEMENT_CHANCE[gradeQuality] || 0)) {
            const candidates = ELEMENTS.filter((elementId) => elementId !== primaryElement);
            elements.push(candidates[this.randomInteger(0, candidates.length - 1, random)]);
        }
        return elements;
    }

    static createElementEffects(equipmentType, elementIds, gradeData, grade, gradeQuality) {
        const effectKind = OFFENSIVE_TYPES.has(equipmentType) ? 'DAMAGE' : 'RESIST';
        const value = Number(gradeData.elementPercent || 0);
        return elementIds.map((elementId) => ({
            modifierId: `ELEMENT_${elementId}_${effectKind}_PERCENT`,
            attributeId: `ELEMENT_${elementId}_${effectKind}`,
            stat: `${elementId.toLowerCase()}${effectKind === 'DAMAGE' ? 'Damage' : 'Resist'}`,
            operation: 'ADD',
            mode: 'add_flat',
            value,
            elementId,
            grade,
            gradeQuality,
            guaranteed: true
        }));
    }

    static weightedIndex(entries, random = Math.random) {
        let roll = random() * entries.reduce((sum, item) => sum + (item.weight || 1), 0);
        for (let index = 0; index < entries.length; index += 1) {
            roll -= entries[index].weight || 1;
            if (roll <= 0) return index;
        }
        return entries.length - 1;
    }

    static randomValue(affix, scale = 1, random = Math.random) {
        const factor = 10 ** (affix.decimals || 0);
        const scalesAsPercent = affix.mode === 'add_percent_base';
        const effectiveScale = scalesAsPercent ? Math.sqrt(scale) : scale;
        return this.randomInteger(
            Math.ceil(affix.min * effectiveScale * factor),
            Math.floor(affix.max * effectiveScale * factor),
            random
        ) / factor;
    }

    static randomInteger(min, max, random = Math.random) {
        return Math.floor(random() * (max - min + 1)) + min;
    }
}
