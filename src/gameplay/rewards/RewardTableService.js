import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';

const DEFAULT_EQUIPMENT_RARITY = 'COMMON';

function weightedEntriesFromObject(weights = {}) {
    return Object.entries(weights)
        .map(([id, weight]) => ({ id, weight: Number(weight) || 0 }))
        .filter((entry) => entry.weight > 0);
}

export default class RewardTableService {
    constructor(options = {}) {
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.random = options.random || Math.random;
    }

    roll(tableId, context = {}) {
        const table = this.gameDataManager.requireRecord('rewardTables', tableId);
        const rewards = [];

        for (let rollIndex = 0; rollIndex < table.rollCount; rollIndex += 1) {
            if (table.selectionMode === 'WEIGHTED_ONE') {
                const selected = this.pickWeightedEntry(
                    table.rewards
                        .map((reward) => ({ ...reward, weight: Number(reward.weight || 0) }))
                        .filter((reward) => reward.weight > 0)
                );
                if (!selected) throw new Error(`REWARD_WEIGHT_POOL_EMPTY:${table.id}`);
                rewards.push(this.createRewardPlan(selected, context));
                continue;
            }
            for (const reward of table.rewards) {
                if (!this.rollChance(this.resolveEffectiveChance(reward, context))) {
                    continue;
                }

                rewards.push(this.createRewardPlan(reward, context));
            }
        }

        return {
            tableId: table.id,
            tableName: table.name,
            rewards
        };
    }

    createRewardPlan(reward, context) {
        switch (reward.rewardType) {
            case 'CURRENCY':
                return this.createCurrencyReward(reward);
            case 'ITEM':
                return this.createItemReward(reward);
            case 'EQUIPMENT':
                return this.createEquipmentReward(reward, context);
            default:
                throw new Error(`UNSUPPORTED_REWARD_TYPE:${reward.rewardType}`);
        }
    }

    createCurrencyReward(reward) {
        return {
            type: 'CURRENCY',
            currencyId: reward.currencyId,
            amount: this.rollQuantity(reward.quantity)
        };
    }

    createItemReward(reward) {
        return {
            type: 'ITEM',
            itemId: reward.itemId,
            quantity: this.rollQuantity(reward.quantity)
        };
    }

    createEquipmentReward(reward, context) {
        const equipmentType = this.pickAvailableEquipmentType(reward.typeChances);
        const template = this.pickEquipmentTemplate(equipmentType, context);

        return {
            type: 'EQUIPMENT',
            itemId: template.id,
            quantity: this.rollQuantity(reward.quantity),
            equipmentType: template.equipment_type,
            grade: this.pickEquipmentGrade(reward.gradePoolId),
            gradeQuality: this.pickWeightedObject(reward.gradeChances) || 'LOW',
            rarity: DEFAULT_EQUIPMENT_RARITY
        };
    }

    resolveEffectiveChance(reward, context = {}) {
        const baseChance = Number(reward?.chance || 0);
        const qualityPolicy = this.gameDataManager
            .getCollection('monsterQualityRules')?.rewardChancePolicy || {};
        const luckPolicy = this.gameDataManager
            .getCollection('rewardRuntimeRules')?.luckChancePolicy || {};
        let effectiveChance = baseChance;

        const qualityEligible = new Set(qualityPolicy.eligibleRewardTypes || []);
        const qualityExcluded = new Set(qualityPolicy.excludedRewardTypes || []);
        const qualityBonusPercent = Math.max(
            0,
            Number(context.qualityRewardChanceBonusPercent || 0)
        );
        if (qualityBonusPercent > 0
            && qualityEligible.has(reward.rewardType)
            && !qualityExcluded.has(reward.rewardType)) {
            effectiveChance *= 1 + qualityBonusPercent / 100;
        }

        const luckEligible = new Set(luckPolicy.eligibleRewardTypes || []);
        const luckExcluded = new Set(luckPolicy.excludedRewardTypes || []);
        const luck = Math.max(0, Number(context.luck || 0));
        if (luck > 0
            && luckEligible.has(reward.rewardType)
            && !luckExcluded.has(reward.rewardType)) {
            const cappedLuck = Math.min(luck, Number(luckPolicy.luckCap || 0));
            const luckBonusPercent = cappedLuck * Number(luckPolicy.percentPerLuck || 0);
            effectiveChance *= 1 + luckBonusPercent / 100;
        }

        const cap = Math.min(
            Number(qualityPolicy.capPercent ?? 100),
            Number(luckPolicy.chanceCapPercent ?? 100)
        );
        return Math.min(cap, effectiveChance);
    }

    pickEquipmentGrade(gradePoolId) {
        if (!gradePoolId) return null;
        const pool = this.gameDataManager.requireRecord('equipmentGradePools', gradePoolId);
        return this.pickWeightedObject(pool.grades);
    }

    pickAvailableEquipmentType(typeChances = {}) {
        const equipmentTemplates = this.getEquipmentTemplates();
        const availableTypes = new Set(equipmentTemplates.map((template) => template.equipment_type));
        const availableWeightedTypes = weightedEntriesFromObject(typeChances)
            .filter((entry) => availableTypes.has(entry.id));

        if (availableWeightedTypes.length > 0) {
            return this.pickWeightedEntry(availableWeightedTypes).id;
        }

        return equipmentTemplates[0]?.equipment_type || null;
    }

    pickEquipmentTemplate(equipmentType, context) {
        const equipmentTemplates = this.getEquipmentTemplates();
        const preferredElement = context.element || context.spiritualRoot || null;
        let candidates = equipmentTemplates.filter((template) => template.equipment_type === equipmentType);

        if (preferredElement) {
            const sameElementCandidates = candidates.filter((template) => template.element === preferredElement);
            if (sameElementCandidates.length > 0) {
                candidates = sameElementCandidates;
            }
        }

        if (candidates.length === 0) {
            candidates = equipmentTemplates;
        }

        if (candidates.length === 0) {
            throw new Error('NO_EQUIPMENT_TEMPLATE_AVAILABLE');
        }

        return candidates[this.randomInteger(0, candidates.length - 1)];
    }

    getEquipmentTemplates() {
        return Object.values(this.gameDataManager.getCollection('itemTemplates') || {})
            .filter((template) => template.type === 'EQUIPMENT');
    }

    pickWeightedObject(weights = {}) {
        const entries = weightedEntriesFromObject(weights);
        return entries.length ? this.pickWeightedEntry(entries).id : null;
    }

    pickWeightedEntry(entries) {
        let roll = this.random() * entries.reduce((sum, entry) => sum + entry.weight, 0);

        for (const entry of entries) {
            roll -= entry.weight;
            if (roll <= 0) {
                return entry;
            }
        }

        return entries[entries.length - 1];
    }

    rollChance(chance) {
        return this.random() * 100 < Number(chance || 0);
    }

    rollQuantity(quantity) {
        return this.randomInteger(quantity.min, quantity.max);
    }

    randomInteger(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }
}
