import { normalizeIntegerAmount } from '../../shared/numeric/IntegerAmount.js';

const DEFAULT_TREASURE_HUNT_COOLDOWN_SECONDS = 3600;
const DEFAULT_TREASURE_HUNT_REWARD_TABLE_ID = 'TREASURE_HUNT';

const RARITY_AFFIX_RULES = Object.freeze({
    COMMON: { order: 1, affix_count: [0, 0], affix_scale: 1 },
    UNCOMMON: { order: 2, affix_count: [1, 1], affix_scale: 1.1 },
    RARE: { order: 3, affix_count: [1, 2], affix_scale: 1.25 },
    EPIC: { order: 4, affix_count: [2, 2], affix_scale: 1.5 },
    LEGENDARY: { order: 5, affix_count: [2, 3], affix_scale: 2 }
});

const GRADE_RARITY_RULES = Object.freeze({
    HOANG: { name: 'Hoàng', order: 10, color: '#D1D5DB' },
    HUYEN: { name: 'Huyền', order: 20, color: '#60A5FA' },
    DIA: { name: 'Địa', order: 30, color: '#A78BFA' },
    THIEN: { name: 'Thiên', order: 40, color: '#F59E0B' },
    THANH: { name: 'Thánh', order: 50, color: '#F97316' },
    THAN: { name: 'Thần', order: 60, color: '#EF4444' }
});

const ATTRIBUTE_STAT_MAP = Object.freeze({
    ATK: 'atk',
    DEF: 'def',
    HP: 'hp',
    SPD: 'spd',
    CRIT: 'critRate',
    CDMG: 'critDamage',
    PEN: 'pen',
    LS: 'lifesteal',
    SKD: 'skillDamage',
    SHD: 'shieldPower',
    REG: 'regen',
    REF: 'reflect',
    CCR: 'controlRate',
    TEN: 'controlResist',
    CUL: 'cultivation_speed',
    LUK: 'luck',
    FINAL_DAMAGE: 'finalDamage',
    FINAL_DEFENSE: 'finalDefense',
    HIT_RATE: 'hitRate',
    CONTROL_IMMUNITY: 'controlImmunity',
    SHIELD: 'shieldPower',
    REGEN: 'regen',
    WOUND_RATE: 'woundRate',
    SLOW_RATE: 'slowRate',
    WEAK_RATE: 'weakRate'
});

const MODIFIER_PREFIX_RULES = Object.freeze({
    ATK_PERCENT: { attribute: 'ATK', operation: 'ADD_PERCENT' },
    DEF_PERCENT: { attribute: 'DEF', operation: 'ADD_PERCENT' },
    HP_PERCENT: { attribute: 'HP', operation: 'ADD_PERCENT' },
    SKILL_DAMAGE_UP: { attribute: 'SKD', operation: 'ADD_PERCENT' },
    LIFESTEAL_UP: { attribute: 'LS', operation: 'ADD' },
    SHIELD_UP: { attribute: 'SHIELD', operation: 'ADD_PERCENT' },
    REGEN_UP: { attribute: 'REGEN', operation: 'ADD_PERCENT' },
    CRIT_DAMAGE_UP: { attribute: 'CDMG', operation: 'ADD_PERCENT' },
    PEN_UP: { attribute: 'PEN', operation: 'ADD' },
    CONTROL_RATE_UP: { attribute: 'CCR', operation: 'ADD' },
    WOUND_RATE_UP: { attribute: 'WOUND_RATE', operation: 'ADD' },
    SLOW_RATE_UP: { attribute: 'SLOW_RATE', operation: 'ADD' },
    WEAK_RATE_UP: { attribute: 'WEAK_RATE', operation: 'ADD' },
    CRIT_RATE_UP: { attribute: 'CRIT', operation: 'ADD' },
    LUCK_UP: { attribute: 'LUK', operation: 'ADD' }
});

function objectFromArray(entries, mapper = (entry) => entry) {
    return Object.fromEntries((entries || []).map((entry) => [String(entry.id), mapper(entry)]));
}

function objectFromMappedArray(entries, mapper) {
    return Object.fromEntries((entries || []).map((entry, index) => {
        const mappedEntry = mapper(entry, index);
        return [String(mappedEntry.id), mappedEntry];
    }));
}

function toPercentValue(value) {
    return Number(value || 0) / 100;
}

function normalizeAttributeKey(attribute) {
    const elemental = String(attribute || '').match(
        /^ELEMENT_(METAL|WOOD|WATER|FIRE|EARTH|ICE|LIGHTNING|WIND)_(DAMAGE|RESIST)$/
    );
    if (elemental) {
        const [, elementId, kind] = elemental;
        return `${elementId.toLowerCase()}${kind === 'DAMAGE' ? 'Damage' : 'Resist'}`;
    }
    return ATTRIBUTE_STAT_MAP[attribute] || String(attribute || '').toLowerCase();
}

function calculateSlotProfileMetrics(profile) {
    const symbols = profile?.symbols || [];
    const totalWeight = symbols.reduce((total, symbol) => total + BigInt(symbol.weight || 0), 0n);
    const reelCount = BigInt(profile?.reelCount || 0);
    if (totalWeight <= 0n || reelCount <= 0n) {
        return { hitRatePartsPerMillion: 0, rtpPartsPerMillion: 0 };
    }
    const denominator = totalWeight ** reelCount;
    const hitNumerator = symbols.reduce(
        (total, symbol) => total + (BigInt(symbol.weight || 0) ** reelCount), 0n
    );
    const rtpNumerator = symbols.reduce((total, symbol) => (
        total
        + (BigInt(symbol.weight || 0) ** reelCount)
        * BigInt(symbol.payoutMultiplierBasisPoints || 0)
    ), 0n);
    return {
        hitRatePartsPerMillion: Number((hitNumerator * 1000000n) / denominator),
        rtpPartsPerMillion: Number((rtpNumerator * 1000000n) / (denominator * 10000n))
    };
}

function normalizeSlotRuleProfiles(rawRules) {
    const profiles = objectFromArray(rawRules?.profiles || [], (profile) => {
        const metrics = calculateSlotProfileMetrics(profile);
        return {
            ...profile,
            symbols: [...(profile.symbols || [])].map((symbol) => ({ ...symbol })),
            hitRate: {
                partsPerMillion: metrics.hitRatePartsPerMillion,
                displayPercent: (metrics.hitRatePartsPerMillion / 10000).toFixed(4)
            },
            rtp: {
                partsPerMillion: metrics.rtpPartsPerMillion,
                displayPercent: (metrics.rtpPartsPerMillion / 10000).toFixed(4)
            }
        };
    });
    return {
        version: Number(rawRules?.version || 0),
        revision: rawRules?.revision || null,
        activeProfileId: rawRules?.activeProfileId || null,
        changeGuide: { ...(rawRules?.changeGuide || {}) },
        profiles
    };
}

function operationToMode(operation) {
    if (operation === 'ADD_PERCENT' || operation === 'MULTIPLY') {
        return 'add_percent_base';
    }

    if (operation === 'ADD') {
        return 'add_flat_base';
    }

    if (operation === 'SET') {
        return 'set';
    }

    return 'add_flat_base';
}

function resolveModifierDefinition(modifierId, modifiers = {}) {
    return modifiers[modifierId] || MODIFIER_PREFIX_RULES[modifierId] || {};
}

function normalizeModifierValue(value, operation) {
    return operation === 'ADD_PERCENT' || operation === 'MULTIPLY' ? toPercentValue(value) : Number(value || 0);
}

function normalizeRealm(realm) {
    const requiredCultivation = realm.cultivation?.required?.initial || 0;
    const gain = realm.cultivation?.gain?.initial || 1;

    return {
        ...realm,
        id: realm.id,
        code: realm.code,
        name: realm.displayName || realm.name || realm.code,
        major_realm: realm.code,
        breakthrough_type: 'MAJOR',
        req_cul: requiredCultivation,
        cultivation_gain: gain,
        success_rate: realm.breakthrough?.successRate ?? 100,
        stat_multiplier: 1.5,
        max_stage: realm.maxStage || 10
    };
}

function normalizeRarity(rarity, index) {
    const rules = RARITY_AFFIX_RULES[rarity.id] || {
        order: index + 1,
        affix_count: [0, 0],
        affix_scale: 1
    };

    return {
        ...rarity,
        name: rarity.displayName || rarity.name || rarity.id,
        order: rules.order,
        color: rarity.color || '#FFFFFF',
        affix_count: rules.affix_count,
        affix_scale: rules.affix_scale,
        cultivation_bonus: 0
    };
}

function normalizeGradeRarity(grade, gradeRules) {
    const middleRule = (gradeRules || []).find((rule) => rule.grade === grade && rule.quality === 'MIDDLE')
        || (gradeRules || []).find((rule) => rule.grade === grade)
        || {};
    const bonusMatch = String(middleRule.modifierId || '').match(/(\d+)/);
    const gradeRule = GRADE_RARITY_RULES[grade] || {
        name: grade,
        order: 100,
        color: '#FFFFFF'
    };

    return {
        id: grade,
        name: gradeRule.name,
        displayName: gradeRule.name,
        order: gradeRule.order,
        color: gradeRule.color,
        affix_count: [0, 0],
        affix_scale: 1,
        cultivation_bonus: bonusMatch ? Number(bonusMatch[1]) / 100 : 0
    };
}

function normalizeItemTemplate(item) {
    const category = item.category || 'MATERIAL';
    const type = category === 'PILL' || item.usable ? 'CONSUMABLE' : category;

    return {
        ...item,
        id: item.id,
        name: item.displayName || item.name || item.id,
        type,
        rarity: item.rarity || 'COMMON',
        description: item.description || '',
        max_stack: item.maxStack || 1,
        required_realm: item.requiredRealm || null
    };
}

function normalizeEquipmentTemplate(template, equipmentTypes = {}) {
    const equipmentTypeId = String(template.type || 'ARTIFACT').toUpperCase();
    const equipmentType = equipmentTypes[template.type] || {};

    return {
        ...template,
        id: template.id,
        name: template.displayName || template.name || template.id,
        type: 'EQUIPMENT',
        category: 'EQUIPMENT',
        rarity: template.rarity || 'COMMON',
        description: template.description || `${template.element || 'Neutral'} ${template.type || 'equipment'}`,
        slot: equipmentTypeId,
        equipment_type: equipmentTypeId,
        element: template.element,
        baseModifiers: equipmentType.baseModifiers || [],
        fixed_effects: []
    };
}

function contentDisplayLabels(displayLabels, type, element, grade) {
    return {
        typeLabel: displayLabels?.contentTypes?.[type] || type,
        elementLabel: displayLabels?.elements?.[element] || element || null,
        gradeLabel: displayLabels?.grades?.[grade] || grade || null
    };
}

function normalizeSkill(skill, type, displayLabels = {}) {
    const target = skill.target || (type === 'PASSIVE' ? 'SELF' : null);
    const elementMode = skill.elementMode || 'FIXED';
    return {
        ...skill,
        id: skill.id,
        name: skill.displayName || skill.name || skill.id,
        label: skill.label || skill.displayName || skill.name || skill.id,
        ...contentDisplayLabels(displayLabels, type, skill.element, skill.grade),
        type,
        cooldownTurns: Number(skill.cooldownTurns || 0),
        rarity: skill.grade || skill.rarity || 'COMMON',
        description: skill.description || '',
        combat: {
            element: skill.element,
            elementMode,
            target,
            actions: skill.actions || []
        },
        effects: []
    };
}

function normalizeCultivationArt(art, gradeRules, affinityPolicy = {}, displayLabels = {}) {
    const gradeRule = (gradeRules || []).find((rule) => rule.grade === art.grade && rule.quality === 'MIDDLE')
        || (gradeRules || []).find((rule) => rule.grade === art.grade)
        || {};
    const isNeutralStarter = art.id === affinityPolicy.neutralArt?.artId;
    const baseCultivationBonus = isNeutralStarter
        ? Number(affinityPolicy.neutralArt?.baseBonus || 0)
        : 0;
    const affinityCultivationBonus = isNeutralStarter
        ? 0
        : Number(affinityPolicy.gradeBonuses?.[art.grade] || affinityPolicy.mismatchBonus || 0);
    const cultivationBonus = baseCultivationBonus + affinityCultivationBonus;

        return {
            ...art,
            id: art.id,
            itemId: art.id,
            name: art.displayName || art.name || art.id,
            label: art.label || art.displayName || art.name || art.id,
            ...contentDisplayLabels(displayLabels, 'CULTIVATION_ART', art.element, art.grade),
        type: 'CULTIVATION_ART',
            rarity: art.grade || 'COMMON',
            description: art.description || '',
            requiredRealm: gradeRule.requiredRealm || null,
            baseCultivationBonus,
            affinityCultivationBonus,
            cultivation_bonus: cultivationBonus,
            effects: [...(art.effects || [])]
    };
}

function normalizeCultivationArtItem(art) {
    return {
        id: art.id,
        name: art.name,
        type: 'CULTIVATION_ART',
        rarity: art.rarity,
        description: art.description,
        label: art.label,
        element: art.element,
        elementLabel: art.elementLabel,
        gradeLabel: art.gradeLabel,
        artId: art.id,
        cultivationBonus: art.cultivation_bonus,
        effects: art.effects || []
    };
}

function normalizeSkillBook(skill) {
    return {
        id: `BOOK_${skill.id}`,
        name: `Bí Kíp ${skill.name}`,
        type: 'SKILL_BOOK',
        rarity: skill.rarity,
        description: skill.description || `Learn ${skill.name}.`,
        label: skill.label,
        element: skill.element,
        elementLabel: skill.elementLabel,
        gradeLabel: skill.gradeLabel,
        skillId: skill.id,
        cooldownTurns: skill.cooldownTurns,
        trigger: skill.trigger || null,
        condition: skill.condition || null
    };
}

function normalizeEffect(effect) {
    return {
        ...effect,
        id: effect.id,
        name: effect.displayName || effect.name || effect.id,
        format: effect.format || 'number',
        base_value: effect.base_value || 0
    };
}

function normalizeModifier(modifier) {
    const stat = String(modifier.attribute || modifier.id || '').toLowerCase();
    const isPercent = String(modifier.operation || '').includes('PERCENT') || modifier.valueType === 'PERCENT';

    return {
        ...modifier,
        id: modifier.id,
        name: modifier.displayName || modifier.name || modifier.id,
        attributeId: modifier.attribute || modifier.id,
        stat: normalizeAttributeKey(modifier.attribute || modifier.id),
        mode: operationToMode(modifier.operation),
        format: isPercent ? 'percent' : 'number',
        normalizedValue: normalizeModifierValue(modifier.value, modifier.operation),
        base_value: 0
    };
}

function normalizeEquipmentType(type) {
    const equipmentTypeId = String(type.id || '').toUpperCase();
    return {
        ...type,
        id: equipmentTypeId,
        name: type.displayName || type.name || type.id,
        slot: equipmentTypeId,
        baseModifiers: (type.baseModifiers || []).map((modifier) => ({
            modifierId: modifier.modifierId,
            value: Number(modifier.value || 0)
        }))
    };
}

function normalizeEquipmentGrade(grade) {
    return {
        ...grade,
        id: grade.grade,
        name: grade.displayName || grade.name || grade.grade,
        qualities: (grade.qualities || []).map((quality) => ({
            ...quality,
            id: `${grade.grade}_${quality.quality}`,
            name: quality.displayName || quality.name || quality.quality
        }))
    };
}

function normalizeAffix(affix, modifiers = {}) {
    const definition = resolveModifierDefinition(affix.modifierId, modifiers);
    const attributeId = definition.attribute || affix.attributeId || affix.id;
    const operation = definition.operation || (affix.unit === 'PERCENT' ? 'ADD_PERCENT' : 'ADD');

    return {
        id: affix.id,
        name: affix.displayName || affix.name || affix.id,
        modifierId: affix.modifierId || affix.id,
        attributeId,
        operation,
        stat: normalizeAttributeKey(attributeId),
        mode: operationToMode(operation),
        min: normalizeModifierValue(affix.min, operation),
        max: normalizeModifierValue(affix.max, operation),
        weight: affix.weight || 1,
        decimals: operation === 'ADD_PERCENT' ? 4 : 0
    };
}

function normalizeEquipmentAffixes(rawAffixes, modifiers = {}) {
    const affixes = (rawAffixes || []).map((affix) => normalizeAffix(affix, modifiers));
    return {
        weapon: affixes,
        armor: affixes,
        necklace: affixes,
        artifact: affixes,
        ring: affixes,
        boots: affixes,
        necklace: affixes
    };
}

function createTreasureHuntConfig() {
    return {
        cooldown_seconds: DEFAULT_TREASURE_HUNT_COOLDOWN_SECONDS,
        rewardTableId: DEFAULT_TREASURE_HUNT_REWARD_TABLE_ID
    };
}

function normalizeRewardEntry(entry) {
    const rewardType = entry.rewardType || entry.type;

    return {
        ...entry,
        rewardType,
        chance: Number(entry.chance ?? 100),
        weight: Number(entry.weight ?? 0),
        quantity: {
            min: Number(entry.quantity?.min ?? 1),
            max: Number(entry.quantity?.max ?? entry.quantity?.min ?? 1)
        },
        gradeChances: entry.gradeChances || entry.gradechances || {},
        typeChances: entry.typeChances || entry.typechances || {}
    };
}

function normalizeRewardTable(table) {
    return {
        ...table,
        id: table.id,
        name: table.displayName || table.name || table.id,
        rollCount: Number(table.rollCount || 1),
        selectionMode: table.selectionMode || 'INDEPENDENT_CHANCE',
        rewards: (table.rewards || []).map(normalizeRewardEntry)
    };
}

export function buildMonsterRewardContent(rawConfig = {}, realms = {}) {
    const currency = {
        ...(rawConfig.currency || {}),
        baseRealmOrder: Number(rawConfig.currency?.baseRealmOrder || 0),
        baseMin: Number(rawConfig.currency?.baseMin || 0),
        baseMax: Number(rawConfig.currency?.baseMax || 0),
        growthFactor: Number(rawConfig.currency?.growthFactor || 0)
    };
    const rewardTables = {};
    const realmOrderTableIds = {};
    const tiers = (rawConfig.tiers || []).map((tier) => {
        const realmOrder = Number(tier.realmOrder || 0);
        const exponent = realmOrder - currency.baseRealmOrder;
        const multiplier = currency.growthFactor ** exponent;
        const rounding = currency.roundingMode === 'FLOOR' ? Math.floor : Math.round;
        const realm = Object.values(realms).find(
            (candidate) => Number(candidate.order) === realmOrder
        );
        const normalizedTier = {
            ...tier,
            realmOrder,
            rollCount: Number(tier.rollCount || 0),
            realmCode: realm?.code || null,
            currency: {
                min: rounding(currency.baseMin * multiplier),
                max: rounding(currency.baseMax * multiplier)
            }
        };
        const rewards = [{
            type: 'CURRENCY',
            currencyId: currency.currencyId,
            chance: 100,
            quantity: { ...normalizedTier.currency }
        }];
        if (tier.equipment) {
            rewards.push({
                type: 'EQUIPMENT',
                ...tier.equipment
            });
        }
        rewards.push(...(tier.items || []).map((item) => ({
            type: 'ITEM',
            ...item
        })));

        rewardTables[tier.tableId] = normalizeRewardTable({
            id: tier.tableId,
            displayName: tier.displayName || `Quái ${realm?.name || realmOrder}`,
            rollCount: normalizedTier.rollCount,
            rewards
        });
        realmOrderTableIds[String(realmOrder)] = tier.tableId;
        return normalizedTier;
    });

    return {
        config: {
            ...rawConfig,
            version: Number(rawConfig.version || 0),
            currency,
            tiers
        },
        rewardTables,
        realmOrderTableIds
    };
}

function normalizeMonsterTemplate(monster) {
    return {
        ...monster,
        id: monster.id,
        name: monster.displayName || monster.name || monster.id,
        element: monster.element,
        realmCode: monster.realm || monster.scalingRule?.minRealm,
        attackSkillPool: monster.attackSkillPool || monster.combat?.attackSkillPool || monster.element,
        defenseSkillPool: monster.defenseSkillPool || monster.combat?.defenseSkillPool || monster.element,
        skillIds: [...(monster.skillIds || monster.combat?.skillIds || [])],
        aiProfileId: monster.ai || monster.combat?.aiProfile || 'NORMAL',
        rewardTableId: monster.rewardTableId || monster.baseRewardId || null
    };
}

function normalizeMonsterVariant(variant) {
    return {
        ...variant,
        id: variant.id,
        name: variant.displayName || variant.name || variant.id,
        hpMultiplier: Number(variant.hpMultiplier || 1),
        atkMultiplier: Number(variant.atkMultiplier || 1),
        defMultiplier: Number(variant.defMultiplier || 1),
        currencyMultiplier: Number(variant.currencyMultiplier || 1),
        dropRateMultiplier: Number(variant.dropRateMultiplier || 1)
    };
}

function normalizeMonsterAiProfile(profile) {
    return {
        ...profile,
        id: profile.id,
        attackWeight: Number(profile.attackWeight || 0),
        defenseWeight: Number(profile.defenseWeight || 0)
    };
}

function normalizeShopEntry(entry) {
    const legacyProduct = {
        kind: 'ITEM',
        templateId: entry.itemId,
        quantity: Number(entry.quantity || 1)
    };
    const product = entry.product ? {
        ...entry.product,
        kind: String(entry.product.kind || 'ITEM').toUpperCase(),
        templateId: entry.product.templateId || entry.product.itemId,
        quantity: Number(entry.product.quantity || 1),
        snapshot: entry.product.snapshot ? { ...entry.product.snapshot } : null
    } : legacyProduct;
    const primaryCost = entry.costs?.[0] || {
        currencyId: entry.currencyId || 'SPIRIT_STONE',
        amount: entry.price || 0
    };
    const costs = (entry.costs || [primaryCost]).map((cost) => ({
        currencyId: cost.currencyId || 'SPIRIT_STONE',
        amount: normalizeIntegerAmount(cost.amount || 0)
    }));
    return {
        ...entry,
        id: entry.id,
        product,
        costs,
        itemId: product.templateId,
        currencyId: costs[0].currencyId,
        price: costs[0].amount,
        quantity: product.quantity,
        dailyLimit: Number(entry.dailyLimit || 0),
        purchaseLimit: entry.purchaseLimit ? {
            periodType: entry.purchaseLimit.periodType,
            value: Number(entry.purchaseLimit.value || 0)
        } : (Number(entry.dailyLimit || 0) > 0 ? {
            periodType: 'DAILY', value: Number(entry.dailyLimit)
        } : null),
        requiredRealm: entry.requiredRealm || null
    };
}

function normalizeShopTemplate(shop) {
    return {
        ...shop,
        id: shop.id,
        name: shop.displayName || shop.name || shop.id,
        description: shop.description || '',
        entries: (shop.entries || []).map(normalizeShopEntry)
    };
}

function normalizeCurrency(currency) {
    return {
        ...currency,
        id: currency.id,
        name: currency.displayName || currency.name || currency.id,
        description: currency.description || '',
        stackable: currency.stackable ?? true
    };
}

function normalizeAttribute(attribute) {
    return {
        ...attribute,
        id: attribute.id,
        displayName: attribute.displayName || attribute.name || attribute.id,
        type: attribute.type || 'INTEGER',
        min: attribute.min ?? null,
        max: attribute.max ?? null,
        category: attribute.category || null,
        format: attribute.format || 'NUMBER',
        defaultValue: attribute.defaultValue ?? null,
        modifiable: attribute.modifiable ?? true,
        description: attribute.description || ''
    };
}

function normalizeElement(element) {
    return {
        ...element,
        id: element.id,
        displayName: element.displayName || element.name || element.id,
        icon: element.icon || null,
        description: element.description || '',
        effectId: element.effectId || null,
        mutation: Boolean(element.mutation),
        parentElement: element.parentElement || null,
        tags: [...(element.tags || [])]
    };
}

function normalizeElementRelations(rawRelations = {}) {
    const relationGroups = [
        ['GENERATE', rawRelations.generate],
        ['COUNTER', rawRelations.counter]
    ];
    const entries = relationGroups.flatMap(([relationType, relations]) => (
        (relations || []).map((relation) => ({
            id: `${relationType}_${relation.from}_${relation.to}`,
            relationType,
            from: relation.from,
            to: relation.to,
            effectId: relation.effectId || null
        }))
    ));
    return objectFromArray(entries);
}

function normalizeSpiritRoot(spiritRoot) {
    return {
        ...spiritRoot,
        id: spiritRoot.id,
        displayName: spiritRoot.displayName || spiritRoot.name || spiritRoot.id,
        legacyValue: spiritRoot.legacyValue || spiritRoot.id,
        archetype: spiritRoot.archetype || 'UNSPECIFIED',
        elementIds: [...(spiritRoot.elementIds || [])],
        defensiveElementId: spiritRoot.defensiveElementId || null,
        rollWeight: Number(spiritRoot.rollWeight || 0),
        affinityPolicy: spiritRoot.affinityPolicy
            ? { ...spiritRoot.affinityPolicy }
            : null,
        effectIds: [...(spiritRoot.effectIds || [])],
        tags: [...(spiritRoot.tags || [])]
    };
}

function normalizeSpiritRootQualityTier(tier) {
    return {
        ...tier,
        id: tier.id,
        displayName: tier.displayName || tier.name || tier.id,
        order: Number(tier.order),
        effectIds: [...(tier.effectIds || [])]
    };
}

function normalizeSpiritRootRerollPool(pool) {
    return {
        ...pool,
        id: pool.id,
        revision: Number(pool.revision),
        templateWeightBrackets: (pool.templateWeightBrackets || []).map((bracket) => ({
            ...bracket,
            minRebirthCount: normalizeIntegerAmount(bracket.minRebirthCount),
            maxRebirthCount: bracket.maxRebirthCount == null
                ? null
                : normalizeIntegerAmount(bracket.maxRebirthCount),
            entries: (bracket.entries || []).map((entry) => ({
                spiritRootId: entry.spiritRootId,
                weight: Number(entry.weight)
            }))
        })),
        qualityBrackets: (pool.qualityBrackets || []).map((bracket) => ({
            ...bracket,
            minRebirthCount: normalizeIntegerAmount(bracket.minRebirthCount),
            maxRebirthCount: bracket.maxRebirthCount == null
                ? null
                : normalizeIntegerAmount(bracket.maxRebirthCount),
            entries: (bracket.entries || []).map((entry) => ({
                qualityTierId: entry.qualityTierId,
                weight: Number(entry.weight)
            }))
        }))
    };
}

function normalizeIdleSource(source) {
    return {
        ...source,
        id: source.id,
        evaluationMode: source.evaluationMode || 'LAZY',
        claimPolicy: { ...(source.claimPolicy || {}) },
        tags: [...(source.tags || [])]
    };
}

function normalizeBreakthroughRule(rule) {
    return {
        ...rule,
        id: rule.realm,
        failureCultivationLossPercent: Number(rule.failureCultivationLossPercent)
    };
}

function normalizeTarget(target) {
    return {
        ...target,
        id: target.id,
        displayName: target.displayName || target.name || target.id
    };
}

function normalizeActionType(actionType) {
    return {
        ...actionType,
        id: actionType.id,
        displayName: actionType.displayName || actionType.name || actionType.id,
        description: actionType.description || '',
        category: actionType.category || 'GENERAL'
    };
}

function normalizeFormula(formula) {
    return {
        ...formula,
        id: formula.id,
        displayName: formula.displayName || formula.name || formula.id,
        description: formula.description || '',
        expression: formula.expression || '0',
        variables: { ...(formula.variables || {}) }
    };
}

function normalizeCondition(condition) {
    return {
        ...condition,
        id: condition.id,
        displayName: condition.displayName || condition.name || condition.id,
        description: condition.description || '',
        root: structuredClone(condition.root)
    };
}

function createBridgeActionType(actionTypeId) {
    return {
        id: actionTypeId,
        displayName: actionTypeId,
        description: `Bridge action type generated for legacy action ${actionTypeId}.`,
        category: 'LEGACY_BRIDGE'
    };
}

function createBridgeFormula(formulaId) {
    if (formulaId === 'DEFENSE_SKILL_SHIELD') {
        return {
            id: formulaId,
            displayName: 'Defense Skill Shield',
            description: 'Bridge formula generated for defense skill shield.',
            expression: 'ATK * 1.2',
            variables: {
                ATK: 'SELF.ATK'
            }
        };
    }

    if (formulaId === 'WOOD_HEAL') {
        return {
            id: formulaId,
            displayName: 'Wood Heal',
            description: 'Bridge formula generated for wood element healing.',
            expression: 'ATK * 0.5',
            variables: {
                ATK: 'SELF.ATK'
            }
        };
    }

    if (formulaId === 'LIGHTNING_CHAIN') {
        return {
            id: formulaId,
            displayName: 'Lightning Chain',
            description: 'Bridge formula generated for lightning chain damage.',
            expression: '(ATK - DEF * (1 - PEN / 100)) * 0.8 * RANDOM',
            variables: {
                ATK: 'SELF.ATK',
                DEF: 'TARGET.DEF',
                PEN: 'SELF.PEN',
                RANDOM: 'RANDOM(0.8,1.0)'
            }
        };
    }

    return {
        id: formulaId,
        displayName: formulaId,
        description: `Bridge formula generated for legacy formula ${formulaId}.`,
        expression: '0',
        variables: {}
    };
}

function createBridgeCoreEffect(effectId) {
    if (effectId.startsWith('DEFENSE_')) {
        return {
            id: effectId,
            displayName: effectId,
            description: `Defense passive marker generated for ${effectId}.`,
            type: 'STATUS',
            tags: ['BUFF', 'MARKER', 'DEFENSE_PASSIVE'],
            duration: 2,
            stackable: false,
            maxStack: null,
            events: [],
            actions: []
        };
    }

    return {
        id: effectId,
        displayName: effectId,
        description: `Bridge core effect generated for legacy effect ${effectId}.`,
        type: 'STATUS',
        tags: ['LEGACY_BRIDGE'],
        duration: 1,
        stackable: false,
        maxStack: null,
        events: [{ event: 'TURN_START', chance: null }],
        actions: [
            {
                type: 'TRIGGER_ACTION',
                target: 'SELF',
                conditionId: null,
                arguments: {}
            }
        ]
    };
}

function normalizeCoreTargetId(target) {
    if (target === 'TARGET') {
        return 'TARGET';
    }

    return target || 'SELF';
}

function normalizeCoreEffectAction(action) {
    const actionArguments = { ...(action.arguments || {}) };
    const target = normalizeCoreTargetId(action.target || actionArguments.target);
    delete actionArguments.target;

    return {
        type: action.type,
        target,
        element: action.element || null,
        chance: action.chance ?? actionArguments.chance ?? null,
        conditionId: action.conditionId || null,
        arguments: actionArguments
    };
}

function normalizeCoreEffect(effect, legacyEffects = {}) {
    const legacyEffect = legacyEffects[effect.id] || {};
    const rawEvents = effect.events || [];
    const rawActions = effect.actions || legacyEffect.actions || [];
    const inferredEvent = effect.type === 'INSTANT'
        ? 'ON_APPLY'
        : (legacyEffect.tick || legacyEffect.trigger || 'TURN_START');
    const events = rawEvents.length > 0
        ? rawEvents.map((event) => ({
            event: event.event,
            chance: event.chance ?? null,
            conditionId: event.conditionId || null
        }))
        : [{ event: inferredEvent, chance: null, conditionId: null }];

    return {
        ...effect,
        id: effect.id,
        displayName: effect.displayName || effect.name || effect.id,
        description: effect.description || legacyEffect.description || '',
        type: effect.type || legacyEffect.type || 'STATUS',
        tags: [...(effect.tags || [])],
        scopes: [...(effect.scopes || [])],
        element: effect.element || null,
        duration: effect.duration ?? legacyEffect.duration ?? null,
        stackable: effect.stackable ?? legacyEffect.stackable ?? false,
        maxStack: effect.maxStack ?? legacyEffect.maxStack ?? null,
        passiveBindings: (effect.passiveBindings || []).map((binding) => ({
            scope: binding.scope,
            modifierId: binding.modifierId,
            value: binding.value ?? null,
            predicate: binding.predicate || null
        })),
        events,
        actions: rawActions.map(normalizeCoreEffectAction)
    };
}

function normalizeSkillDefinitionEffectIds(skill) {
    if (Array.isArray(skill.effects) && skill.effects.length > 0) {
        return skill.effects;
    }

    return (skill.actions || [])
        .map((action) => action.effectId)
        .filter(Boolean);
}

function normalizeLegacySkillTarget(target) {
    if (!target) {
        return 'SELF';
    }

    const team = target.team || 'SELF';
    const scope = target.scope || 'SINGLE';

    if (team === 'SELF') {
        return 'SELF';
    }

    if (team === 'ALLY') {
        if (scope === 'AOE') {
            return 'ALLY_ALL';
        }

        if (scope === 'RANDOM') {
            return 'ALLY_RANDOM';
        }

        return 'ALLY_SINGLE';
    }

    if (scope === 'AOE') {
        return 'ENEMY_ALL';
    }

    if (scope === 'RANDOM') {
        return 'ENEMY_RANDOM';
    }

    return 'ENEMY_SINGLE';
}

function normalizeLegacySkillAction(action, defaultTarget) {
    const actionTypeMap = Object.freeze({
        APPLY_EFFECT: 'ADD_EFFECT'
    });
    const type = actionTypeMap[action.type] || action.type;
    const argumentsPayload = {};

    if (action.formulaId) {
        argumentsPayload.formulaId = action.formulaId;
    }

    if (action.effectId) {
        argumentsPayload.effectId = action.effectId;
    }

    if (action.modifierId) {
        argumentsPayload.modifierId = action.modifierId;
    }

    if (action.count != null) {
        argumentsPayload.count = action.count;
    }

    if (action.chance != null) {
        argumentsPayload.chance = action.chance;
    }

    return {
        id: action.id,
        order: action.order,
        type,
        target: normalizeCoreTargetId(action.target || defaultTarget),
        element: action.element || null,
        elementMode: action.elementMode || null,
        elementWeights: action.elementWeights ? { ...action.elementWeights } : null,
        conditionId: action.conditionId || null,
        arguments: argumentsPayload
    };
}

function buildSkillBridgeEffect(skill, type) {
    const defaultTarget = normalizeLegacySkillTarget(skill.target);
    const bridgeEffectId = `${skill.id}_BRIDGE`;
    const triggerEvent = skill.trigger || (type === 'ACTIVE' ? 'TURN_ACTION' : 'TURN_START');

    return {
        id: bridgeEffectId,
        displayName: `${skill.displayName || skill.name || skill.id} Bridge`,
        description: skill.description || '',
        type: type === 'ACTIVE' ? 'INSTANT' : 'TRIGGER',
        tags: ['SKILL', type, ...(skill.tags || [])],
        duration: null,
        stackable: false,
        maxStack: null,
            events: [{ event: triggerEvent, chance: null, conditionId: null }],
        actions: (skill.actions || []).map((action) => normalizeLegacySkillAction(action, defaultTarget))
    };
}

function normalizeSkillDefinition(skill, type, bridgeEffectId, displayLabels = {}) {
    return {
        id: skill.id,
        displayName: skill.displayName || skill.name || skill.id,
        description: skill.description || '',
        label: skill.label || skill.displayName || skill.name || skill.id,
        ...contentDisplayLabels(displayLabels, type, skill.element, skill.grade),
        element: skill.element || null,
        rarity: skill.grade || skill.rarity || 'COMMON',
        effects: bridgeEffectId ? [bridgeEffectId] : normalizeSkillDefinitionEffectIds(skill),
        tags: [...(skill.tags || [])],
        metadata: {
            type,
            elementMode: skill.elementMode || 'FIXED',
            cooldownTurns: Number(skill.cooldownTurns || 0),
            trigger: skill.trigger || 'TURN_ACTION',
            target: skill.target || null,
            condition: skill.condition || null
        }
    };
}

function normalizeCraftMaterial(material) {
    return {
        itemId: material.itemId,
        quantity: Number(material.quantity || 1)
    };
}

function normalizeCraftTemplate(recipe) {
    const output = recipe.output || {
        type: 'ITEM',
        itemId: recipe.resultItemId,
        quantity: recipe.resultQuantity || 1
    };

    return {
        ...recipe,
        id: recipe.id,
        name: recipe.displayName || recipe.name || recipe.id,
        professionId: recipe.professionId || null,
        professionGrade: Number(recipe.professionGrade || 1),
        unlockMode: recipe.unlockMode || 'AUTO_BY_GRADE',
        output: {
            ...output,
            quantity: Number(output.quantity || 1)
        },
        resultItemId: recipe.resultItemId,
        resultQuantity: Number(recipe.resultQuantity || 1),
        requiredRealm: recipe.requiredRealm || null,
        costCurrency: {
            currencyId: recipe.costCurrency?.currencyId || 'SPIRIT_STONE',
            amount: normalizeIntegerAmount(recipe.costCurrency?.amount || 0)
        },
        materials: (recipe.materials || []).map(normalizeCraftMaterial)
    };
}

function normalizeExchangeCost(cost) {
    return {
        ...cost,
        currencyId: cost.currencyId || null,
        itemId: cost.itemId || null,
        amount: cost.currencyId ? normalizeIntegerAmount(cost.amount || 0) : 0,
        quantity: Number(cost.quantity || cost.amount || 1)
    };
}

function ensureActionTypeCoverage(actionTypes, coreEffects) {
    const normalizedActionTypes = { ...actionTypes };

    for (const effect of Object.values(coreEffects || {})) {
        for (const action of effect.actions || []) {
            if (!normalizedActionTypes[action.type]) {
                normalizedActionTypes[action.type] = createBridgeActionType(action.type);
            }
        }
    }

    return normalizedActionTypes;
}

function ensureFormulaCoverage(formulas, coreEffects) {
    const normalizedFormulas = { ...formulas };

    for (const effect of Object.values(coreEffects || {})) {
        for (const action of effect.actions || []) {
            const formulaId = action.arguments?.formulaId;

            if (formulaId && !normalizedFormulas[formulaId]) {
                normalizedFormulas[formulaId] = createBridgeFormula(formulaId);
            }
        }
    }

    return normalizedFormulas;
}

function ensureCoreEffectReferenceCoverage(coreEffects) {
    const normalizedCoreEffects = { ...coreEffects };

    for (const effect of Object.values(coreEffects || {})) {
        for (const action of effect.actions || []) {
            const referencedEffectId = action.arguments?.effectId;

            if (referencedEffectId && !normalizedCoreEffects[referencedEffectId]) {
                normalizedCoreEffects[referencedEffectId] = createBridgeCoreEffect(referencedEffectId);
            }
        }
    }

    return normalizedCoreEffects;
}

function normalizeExchangeReward(reward) {
    return {
        ...reward,
        currencyId: reward.currencyId || null,
        itemId: reward.itemId || null,
        amount: reward.currencyId ? normalizeIntegerAmount(reward.amount || 0) : 0,
        quantity: Number(reward.quantity || reward.amount || 1)
    };
}

function normalizeExchangeTemplate(exchange) {
    return {
        ...exchange,
        id: exchange.id,
        name: exchange.displayName || exchange.name || exchange.id,
        description: exchange.description || '',
        requiredRealm: exchange.requiredRealm || null,
        limit: exchange.limit == null
            ? null
            : Array.isArray(exchange.limit)
                ? exchange.limit.map((limit) => ({
                    periodType: String(limit.periodType || '').toUpperCase(),
                    value: normalizeIntegerAmount(limit.value)
                }))
                : exchange.limit,
        costs: (exchange.costs || exchange.cost || []).map(normalizeExchangeCost),
        rewards: (exchange.rewards || exchange.reward || []).map(normalizeExchangeReward)
    };
}

function normalizeSectTemplate(sect) {
    return {
        ...sect,
        id: sect.id,
        name: sect.displayName || sect.name || sect.id,
        element: sect.element || null,
        effects: sect.effects || []
    };
}

function normalizeSectExchangeRule(rule, index) {
    return {
        ...rule,
        id: `${rule.category}_${rule.grade}`,
        order: index + 1,
        category: rule.category,
        grade: rule.grade,
        requiredRealm: rule.requiredRealm || null,
        cost: {
            currencyId: rule.cost?.currencyId || 'SECT_POINT',
            amount: Number(rule.cost?.amount || 0)
        }
    };
}

function normalizeGatheringTemplate(gathering) {
    return {
        ...gathering,
        id: gathering.id,
        name: gathering.displayName || gathering.name || gathering.id,
        requiredRealm: gathering.requiredRealm || null,
        duration: Number(gathering.duration || 0),
        staminaCost: Number(gathering.staminaCost || 0),
        dailyLimit: Number(gathering.dailyLimit || 0),
        rewardTableId: gathering.rewardTableId || null
    };
}

function normalizeGatheringRules(rawRules = {}) {
    return {
        ...rawRules,
        selectionMode: rawRules.selectionMode || 'WEIGHTED_ONE',
        activeRunLimit: Number(rawRules.activeRunLimit || 1),
        resourceTierPolicy: rawRules.resourceTierPolicy || 'MAP_NAVIGATION_ORDER',
        families: objectFromArray(rawRules.families || [], (family) => ({
            ...family,
            id: family.id,
            name: family.displayName || family.name || family.id,
            activityName: family.activityName || family.displayName || family.id,
            durationSeconds: Number(family.durationSeconds || 0)
        })),
        roles: Object.fromEntries(Object.entries(rawRules.roles || {}).map(([roleId, role]) => [
            roleId,
            {
                ...role,
                id: roleId,
                weight: Number(role.weight || 0),
                quantity: {
                    min: Number(role.quantity?.min || 0),
                    max: Number(role.quantity?.max || 0)
                },
                rarity: role.rarity || 'COMMON'
            }
        ]))
    };
}

function normalizeGatheringResource(resource, gatheringRules) {
    const role = gatheringRules.roles?.[resource.role] || {};
    return {
        ...resource,
        id: resource.id,
        name: resource.displayName || resource.name || resource.id,
        description: resource.description || '',
        category: 'MATERIAL',
        type: 'MATERIAL',
        rarity: resource.rarity || role.rarity || 'COMMON',
        required_realm: null,
        max_stack: Number(resource.maxStack || 9999),
        maxStack: Number(resource.maxStack || 9999),
        tradable: resource.tradable !== false,
        sellable: resource.sellable !== false,
        droppable: true,
        usable: false,
        sources: Array.isArray(resource.sources) && resource.sources.length
            ? [...new Set(resource.sources)]
            : ['GATHERING'],
        actions: [],
        mapId: resource.mapId,
        resourceTier: Number(resource.resourceTier),
        family: resource.family,
        role: resource.role,
        weight: Number(resource.weight ?? role.weight ?? 0),
        quantity: {
            min: Number(resource.quantity?.min ?? role.quantity?.min ?? 0),
            max: Number(resource.quantity?.max ?? role.quantity?.max ?? 0)
        }
    };
}

function buildMapGatheringContent(resources, gatheringRules, maps) {
    const pools = {};
    const rewardTables = {};
    const gatheringTemplates = {};

    for (const map of Object.values(maps)) {
        for (const family of Object.values(gatheringRules.families || {})) {
            const entries = Object.values(resources)
                .filter((resource) => resource.mapId === map.id && resource.family === family.id)
                .map((resource) => ({
                    itemId: resource.id,
                    weight: resource.weight,
                    quantity: { ...resource.quantity },
                    role: resource.role
                }));
            if (!entries.length) continue;

            const poolId = `GATHER_${map.id}_${family.id}`;
            pools[poolId] = {
                id: poolId,
                mapId: map.id,
                resourceTier: Number(map.navigationOrder),
                resourceFamily: family.id,
                selectionMode: gatheringRules.selectionMode,
                entries
            };
            rewardTables[poolId] = normalizeRewardTable({
                id: poolId,
                displayName: `${family.activityName} · ${map.name}`,
                rollCount: 1,
                selectionMode: gatheringRules.selectionMode,
                rewards: entries.map((entry) => ({
                    type: 'ITEM',
                    itemId: entry.itemId,
                    weight: entry.weight,
                    chance: 100,
                    quantity: entry.quantity
                }))
            });
            gatheringTemplates[poolId] = normalizeGatheringTemplate({
                id: poolId,
                displayName: family.activityName,
                mapId: map.id,
                resourceTier: Number(map.navigationOrder),
                resourceFamily: family.id,
                requiredRealm: map.realmCode,
                duration: family.durationSeconds,
                staminaCost: 0,
                dailyLimit: 0,
                rewardTableId: poolId,
                status: map.status === 'ACTIVE' ? 'ACTIVE' : 'CONTENT_PENDING'
            });
        }
    }

    return { pools, rewardTables, gatheringTemplates };
}

export default class GameDataNormalizer {
    normalize(rawData) {
        const realmEntries = rawData.realms?.realms || [];
        const itemEntries = rawData.itemTemplates?.items || [];
        const equipmentEntries = rawData.equipmentTemplates?.templates || [];
        const sectInheritance = rawData.sectInheritanceTemplates || {};
        const slotRules = normalizeSlotRuleProfiles(rawData.slotRuleProfiles || {});
        const activeSlotProfile = slotRules.profiles[slotRules.activeProfileId] || null;
        const attackSkills = [
            ...(rawData.attackSkillTemplates?.attackSkills || []),
            ...(sectInheritance.attackSkills || []),
            ...(rawData.monsterAttackSkillTemplates?.attackSkills || [])
        ];
        const defenseSkills = [
            ...(rawData.defenseSkillTemplates?.defenseSkills || []),
            ...(sectInheritance.defenseSkills || [])
        ];
        const cultivationArtGradeRules = rawData.cultivationArtGrades?.levels || [];
        const cultivationArtAffinityPolicy = rawData.cultivationArtGrades?.affinityPolicy || {};
        const cultivationArtEntries = [
            ...(rawData.cultivationArts?.cultivationArts || []),
            ...(sectInheritance.cultivationArts || [])
        ];
        const legacyEffects = objectFromArray(rawData.legacyEffects?.effects || []);
        const modifiers = objectFromArray(rawData.modifiers?.modifiers || [], normalizeModifier);
        const equipmentTypes = objectFromArray(rawData.equipmentTypes?.types || [], normalizeEquipmentType);
        const equipmentGrades = objectFromMappedArray(rawData.equipmentGrades?.grades || [], normalizeEquipmentGrade);
        const gatheringRules = normalizeGatheringRules(rawData.gatheringRules);
        const gatheringResources = objectFromArray(
            rawData.gatheringResourceCatalog?.resources || [],
            (resource) => normalizeGatheringResource(resource, gatheringRules)
        );
        const rawCoreEffects = objectFromArray(
            [
                ...(rawData.effects?.effects || []),
                ...(rawData.sectEffects?.effects || []),
                ...(rawData.spiritRootEffects?.effects || [])
            ],
            (effect) => normalizeCoreEffect(effect, legacyEffects)
        );
        const skillBridgeEffects = {
            ...objectFromMappedArray(attackSkills, (skill) => buildSkillBridgeEffect(skill, 'ACTIVE')),
            ...objectFromMappedArray(defenseSkills, (skill) => buildSkillBridgeEffect(skill, 'PASSIVE'))
        };
        const coreEffects = ensureCoreEffectReferenceCoverage({
            ...rawCoreEffects,
            ...skillBridgeEffects
        });
        const actionTypes = ensureActionTypeCoverage(
            objectFromArray(rawData.actionTypes?.actionTypes || [], normalizeActionType),
            coreEffects
        );
        const formulas = ensureFormulaCoverage(
            objectFromArray(rawData.formulas?.formulas || [], normalizeFormula),
            coreEffects
        );
        const grades = [...new Set([
            ...cultivationArtEntries.map((art) => art.grade),
            ...attackSkills.map((skill) => skill.grade),
            ...defenseSkills.map((skill) => skill.grade)
        ].filter(Boolean))];

        const realms = objectFromArray(realmEntries, normalizeRealm);
        const rarities = {
            ...objectFromArray(rawData.itemRarities?.rarities || [], normalizeRarity),
            ...Object.fromEntries(grades.map((grade) => [
                grade,
                normalizeGradeRarity(grade, cultivationArtGradeRules)
            ]))
        };
        const skillDisplayLabels = rawData.skillRules?.displayLabels || {};
        const skills = {
            ...objectFromArray(attackSkills, (skill) => normalizeSkill(skill, 'ACTIVE', skillDisplayLabels)),
            ...objectFromArray(defenseSkills, (skill) => normalizeSkill(skill, 'PASSIVE', skillDisplayLabels))
        };
        const skillDefinitions = {
            ...objectFromArray(attackSkills, (skill) => normalizeSkillDefinition(skill, 'ACTIVE', `${skill.id}_BRIDGE`, skillDisplayLabels)),
            ...objectFromArray(defenseSkills, (skill) => normalizeSkillDefinition(skill, 'PASSIVE', `${skill.id}_BRIDGE`, skillDisplayLabels))
        };
        const cultivationArts = objectFromArray(cultivationArtEntries, (art) => (
            normalizeCultivationArt(
                art,
                cultivationArtGradeRules,
                cultivationArtAffinityPolicy,
                skillDisplayLabels
            )
        ));
        const itemTemplates = {
            ...objectFromArray(itemEntries, normalizeItemTemplate),
            ...gatheringResources,
            ...objectFromArray(equipmentEntries, (template) => normalizeEquipmentTemplate(template, equipmentTypes)),
            ...objectFromArray(Object.values(cultivationArts), normalizeCultivationArtItem),
            ...objectFromMappedArray(
                Object.values(skills).filter((skill) => !(skill.tags || []).includes('MONSTER_ONLY')),
                normalizeSkillBook
            )
        };
        const effects = {
            ...objectFromArray(rawData.legacyEffects?.effects || [], normalizeEffect),
            ...modifiers,
            cultivation_speed: {
                id: 'cultivation_speed',
                name: 'Tốc độ tu luyện',
                format: 'percent',
                base_value: 1
            }
        };

        const maps = objectFromArray(rawData.maps?.maps || [], (map) => ({
            ...map,
            id: map.id,
            name: map.displayName || map.name || map.id,
            status: map.status || 'ACTIVE',
            activityTypes: [...(map.activityTypes || [])]
        }));
        const mapGatheringContent = buildMapGatheringContent(
            gatheringResources,
            gatheringRules,
            maps
        );
        const monsterRewardContent = buildMonsterRewardContent(
            rawData.monsterRewardScaling,
            realms
        );
        const rawMonsterRules = rawData.monsterRules || {};
        const rewardAliasId = monsterRewardContent.config.aliasId;
        const monsterRules = {
            ...rawMonsterRules,
            rewardResolution: {
                ...(rawMonsterRules.rewardResolution || {}),
                aliases: {
                    ...(rawMonsterRules.rewardResolution?.aliases || {}),
                    [rewardAliasId]: {
                        ...(rawMonsterRules.rewardResolution?.aliases?.[rewardAliasId] || {}),
                        source: monsterRewardContent.config.id,
                        realmOrderTableIds: monsterRewardContent.realmOrderTableIds
                    }
                }
            }
        };

        return {
            raw: rawData,
            attributes: objectFromArray(rawData.attributes?.attributes || [], normalizeAttribute),
            elements: objectFromArray(rawData.elements?.elements || [], normalizeElement),
            spiritRoots: objectFromArray(rawData.spiritRoots?.spiritRoots || [], normalizeSpiritRoot),
            spiritRootQualityTiers: objectFromArray(
                rawData.spiritRootQualityTiers?.qualityTiers || [],
                normalizeSpiritRootQualityTier
            ),
            spiritRootRerollPools: objectFromArray(
                rawData.spiritRootRerollPools?.pools || [],
                normalizeSpiritRootRerollPool
            ),
            idleSources: objectFromArray(rawData.idleSources?.sources || [], normalizeIdleSource),
            elementRelations: normalizeElementRelations(rawData.elementRelations),
            targets: objectFromArray(rawData.targets?.targets || [], normalizeTarget),
            conditions: objectFromArray(rawData.conditions?.conditions || [], normalizeCondition),
            actionTypes,
            formulas,
            coreEffects,
            skillDefinitions,
            battleRules: { ...(rawData.battleRules || {}) },
            realms,
            cultivationRules: { ...(rawData.cultivationRules?.cultivation || {}) },
            progressionRules: { ...(rawData.progressionRules?.progression || {}) },
            rebirthRules: { ...(rawData.rebirthRules?.rebirth || {}) },
            economyRules: { ...(rawData.economyRules || {}) },
            spiritStoneTransferRules: { ...(rawData.spiritStoneTransferRules || {}) },
            earningActivities: objectFromArray(
                rawData.earningActivityTemplates?.activities || [],
                (activity) => ({
                    ...activity,
                    name: activity.displayName || activity.name || activity.id,
                    aliases: [...(activity.aliases || [])],
                    periodLimit: Number(activity.periodLimit || 0),
                    cooldownSeconds: Number(activity.cooldownSeconds || 0),
                    flavors: [...(activity.flavors || [])]
                })
            ),
            earningActivityPolicy: {
                version: Number(rawData.earningActivityTemplates?.version || 0),
                revision: rawData.earningActivityTemplates?.revision || null,
                currencyId: rawData.earningActivityTemplates?.currencyId || null,
                scalingSource: rawData.earningActivityTemplates?.scalingSource || null
            },
            slotRules,
            miniGameRules: {
                ...(rawData.miniGameRuleTemplates || {}),
                revision: [
                    rawData.miniGameRuleTemplates?.revision,
                    slotRules.revision,
                    slotRules.activeProfileId
                ].filter(Boolean).join(':'),
                games: objectFromArray(rawData.miniGameRuleTemplates?.games || [], (game) => {
                    const normalized = {
                        ...game,
                        name: game.displayName || game.name || game.id,
                        aliases: [...(game.aliases || [])]
                    };
                    if (game.id === 'SLOT' && activeSlotProfile) {
                        normalized.balanceProfileId = activeSlotProfile.id;
                        normalized.paytable = {
                            reelCount: activeSlotProfile.reelCount,
                            requiredMatchCount: activeSlotProfile.requiredMatchCount,
                            symbols: activeSlotProfile.symbols.map((symbol) => ({ ...symbol }))
                        };
                        normalized.hitRate = { ...activeSlotProfile.hitRate };
                        normalized.rtp = { ...activeSlotProfile.rtp };
                    }
                    return normalized;
                })
            },
            wordChainRules: {
                ...(rawData.wordChainRuleTemplates || {}),
                aliases: [...(rawData.wordChainRuleTemplates?.aliases || [])],
                inputPolicy: {
                    ...(rawData.wordChainRuleTemplates?.inputPolicy || {}),
                    denylist: [...(rawData.wordChainRuleTemplates?.inputPolicy?.denylist || [])]
                },
                sessionPolicy: { ...(rawData.wordChainRuleTemplates?.sessionPolicy || {}) },
                rewardPolicy: { ...(rawData.wordChainRuleTemplates?.rewardPolicy || {}) }
            },
            rewardRuntimeRules: { ...(rawData.rewardRuntimeRules || {}) },
            idempotencyRules: { ...(rawData.idempotencyRules || {}) },
            characterCreationRules: {
                ...(rawData.characterCreationRules || {}),
                revision: Number(rawData.characterCreationRules?.revision || 0),
                sessionTtlSeconds: Number(
                    rawData.characterCreationRules?.sessionTtlSeconds || 0
                ),
                maxRerolls: Number(rawData.characterCreationRules?.maxRerolls || 0),
                starterRecipeIds: [
                    ...(rawData.characterCreationRules?.starterRecipeIds || [])
                ],
                daoName: {
                    ...(rawData.characterCreationRules?.daoName || {}),
                    minLength: Number(rawData.characterCreationRules?.daoName?.minLength || 0),
                    maxLength: Number(rawData.characterCreationRules?.daoName?.maxLength || 0)
                }
            },
            characterResetRules: {
                ...(rawData.characterResetRules || {}),
                retainedCurrencyIds: [...(rawData.characterResetRules?.retainedCurrencyIds || [])]
            },
            breakthroughRules: objectFromMappedArray(
                rawData.breakthroughRules?.breakthroughs || [],
                normalizeBreakthroughRule
            ),
            currencies: objectFromArray(rawData.currencies?.currencies || [], normalizeCurrency),
            itemTemplates,
            itemRules: { ...(rawData.itemRules || {}) },
            skillRules: {
                ...(rawData.skillRules || {}),
                playerLoadout: {
                    ...(rawData.skillRules?.playerLoadout || {}),
                    revision: Number(rawData.skillRules?.playerLoadout?.revision || 0),
                    maxActiveSkills: Number(
                        rawData.skillRules?.playerLoadout?.maxActiveSkills || 0
                    ),
                    capacityMilestones: (
                        rawData.skillRules?.playerLoadout?.capacityMilestones || []
                    ).map((entry) => ({
                        realmCode: entry.realmCode,
                        capacity: Number(entry.capacity)
                    }))
                }
            },
            skills,
            effects,
            cultivationArts,
            cultivationArtAffinityPolicy: {
                ...cultivationArtAffinityPolicy,
                gradeBonuses: { ...(cultivationArtAffinityPolicy.gradeBonuses || {}) },
                neutralArt: { ...(cultivationArtAffinityPolicy.neutralArt || {}) }
            },
            rarities,
            modifiers,
            rewardTables: {
                ...objectFromArray(rawData.rewardTables?.rewardTables || [], normalizeRewardTable),
                ...monsterRewardContent.rewardTables,
                ...mapGatheringContent.rewardTables
            },
            monsterTemplates: objectFromArray(
                rawData.monsterTemplates?.monsterTemplates || rawData.monsterTemplates?.monsters || [],
                normalizeMonsterTemplate
            ),
            monsterVariants: objectFromArray(rawData.monsterVariants?.variants || [], normalizeMonsterVariant),
            monsterQualityTiers: objectFromArray(
                rawData.monsterQualities?.qualityTiers || [],
                (quality) => ({
                    ...quality,
                    id: quality.id,
                    name: quality.displayName || quality.name || quality.id,
                    order: Number(quality.order)
                })
            ),
            monsterQualityRules: {
                ...(rawData.monsterQualities?.scalingPolicy || {}),
                stepPercent: Number(rawData.monsterQualities?.scalingPolicy?.stepPercent ?? 0),
                affectedStats: [...(rawData.monsterQualities?.scalingPolicy?.affectedStats || [])],
                rewardChancePolicy: {
                    ...(rawData.monsterQualities?.scalingPolicy?.rewardChancePolicy || {}),
                    eligibleRewardTypes: [
                        ...(rawData.monsterQualities?.scalingPolicy?.rewardChancePolicy?.eligibleRewardTypes || [])
                    ],
                    excludedRewardTypes: [
                        ...(rawData.monsterQualities?.scalingPolicy?.rewardChancePolicy?.excludedRewardTypes || [])
                    ],
                    capPercent: Number(
                        rawData.monsterQualities?.scalingPolicy?.rewardChancePolicy?.capPercent ?? 100
                    )
                }
            },
            monsterQualityPools: objectFromArray(
                rawData.monsterQualityPools?.pools || [],
                (pool) => ({
                    ...pool,
                    id: pool.id,
                    entries: (pool.entries || []).map((entry) => ({
                        qualityId: entry.qualityId,
                        weight: Number(entry.weight)
                    }))
                })
            ),
            monsterSkillCatalog: objectFromArray(
                rawData.monsterSkillCatalog?.races || [],
                (race) => ({
                    ...race,
                    id: race.id,
                    name: race.displayName || race.name || race.id,
                    skills: (race.skills || []).map((skill) => ({
                        ...skill,
                        name: skill.displayName || skill.name || skill.id
                    })),
                    bossSkills: (race.bossSkills || []).map((skill) => ({
                        ...skill,
                        name: skill.displayName || skill.name || skill.id
                    }))
                })
            ),
            monsterSkillElementSemantics: Object.freeze(
                [...(rawData.monsterSkillCatalog?.elementSemantics || [])]
            ),
            secretRealmBossPools: objectFromArray(
                rawData.secretRealmBossPools?.pools || [],
                (pool) => ({
                    ...pool,
                    id: pool.id,
                    entries: (pool.entries || []).map((entry) => ({
                        monsterId: entry.monsterId,
                        weight: Number(entry.weight)
                    }))
                })
            ),
            monsterAiProfiles: objectFromArray(rawData.monsterAi?.aiProfiles || [], normalizeMonsterAiProfile),
            monsterRules,
            monsterRewardScaling: monsterRewardContent.config,
            maps,
            monsterSpawnPools: objectFromArray(rawData.monsterSpawnPools?.spawnPools || [], (pool) => ({
                ...pool,
                id: pool.id,
                entries: (pool.entries || []).map((entry) => ({
                    ...entry,
                    weight: Number(entry.weight || 0),
                    minPlayerRealmOrder: Number(entry.minPlayerRealmOrder || 1),
                    maxPlayerRealmOrder: entry.maxPlayerRealmOrder == null ? null : Number(entry.maxPlayerRealmOrder)
                }))
            })),
            shopTemplates: objectFromArray(rawData.shopTemplates?.shops || [], normalizeShopTemplate),
            shopRules: Object.freeze({
                ...(rawData.shopRules || {}),
                pricePolicy: Object.freeze({
                    ...(rawData.shopRules?.pricePolicy || {}),
                    mapBasePrices: Object.freeze([...(rawData.shopRules?.pricePolicy?.mapBasePrices || [])]),
                    productMultipliers: Object.freeze({ ...(rawData.shopRules?.pricePolicy?.productMultipliers || {}) }),
                    shopMultipliers: Object.freeze({ ...(rawData.shopRules?.pricePolicy?.shopMultipliers || {}) })
                }),
                specialShop: Object.freeze({
                    ...(rawData.shopRules?.specialShop || {}),
                    slotPattern: Object.freeze([...(rawData.shopRules?.specialShop?.slotPattern || [])])
                }),
                explorationEncounter: Object.freeze({
                    ...(rawData.shopRules?.explorationEncounter || {}),
                    entries: Object.freeze((rawData.shopRules?.explorationEncounter?.entries || []).map((entry) => Object.freeze({
                        type: entry.type,
                        weight: Number(entry.weight || 0)
                    })))
                }),
                mysteryMerchant: Object.freeze({ ...(rawData.shopRules?.mysteryMerchant || {}) })
            }),
            craftTemplates: objectFromArray(rawData.craftTemplates?.recipes || [], normalizeCraftTemplate),
            professions: objectFromArray(rawData.professions?.professions || [], (profession) => ({
                ...profession,
                id: profession.id,
                name: profession.displayName || profession.name || profession.id,
                status: profession.status || 'ACTIVE',
                outputTypes: [...(profession.outputTypes || [])]
            })),
            professionGrades: objectFromMappedArray(rawData.professionGrades?.grades || [], (grade) => ({
                ...grade,
                id: String(grade.grade),
                grade: Number(grade.grade),
                name: grade.displayName || grade.name || String(grade.grade),
                cumulativeExperience: normalizeIntegerAmount(grade.cumulativeExperience || 0),
                recipeExperience: normalizeIntegerAmount(grade.recipeExperience || 0),
                baseDurationMinutes: Number(grade.baseDurationMinutes || 0)
            })),
            professionRules: {
                ...(rawData.professionRules || {})
            },
            exchangeTemplates: objectFromArray(rawData.exchangeTemplates?.exchanges || [], normalizeExchangeTemplate),
            sectTemplates: objectFromArray(rawData.sectTemplates?.sects || [], normalizeSectTemplate),
            sectPolicy: {
                ...(rawData.sectPolicy?.membershipPolicy || {})
            },
            sectRewardPools: objectFromArray(rawData.sectRewardPools?.pools || [], (pool) => ({
                ...pool,
                entries: (pool.entries || []).map((entry) => ({
                    itemId: entry.itemId,
                    weight: Number(entry.weight || 0)
                }))
            })),
            sectExchangeRules: objectFromMappedArray(
                rawData.sectExchangeTemplates?.exchangeRules || [],
                normalizeSectExchangeRule
            ),
            gatheringRules,
            gatheringResources,
            mapGatheringPools: mapGatheringContent.pools,
            gatheringTemplates: {
                ...objectFromArray(rawData.gatheringTemplates?.gatherings || [], normalizeGatheringTemplate),
                ...mapGatheringContent.gatheringTemplates
            },
            equipmentTypes,
            equipmentGrades,
            equipmentGradePools: objectFromArray(rawData.equipmentGradePools?.pools || [], (pool) => ({
                ...pool,
                id: pool.id,
                grades: { ...(pool.grades || {}) }
            })),
            equipmentAffixes: normalizeEquipmentAffixes(rawData.equipmentAffixes?.affixes, modifiers),
            treasureHunt: createTreasureHuntConfig()
        };
    }
}
