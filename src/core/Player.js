import CultivationArt from '../items/CultivationArt.js';
import Equipment from '../items/Equipment.js';
import ItemFactory from '../factories/ItemFactory.js';
import PlayerGameDataResolver from '../runtime/resolvers/PlayerGameDataResolver.js';
import EffectResolver from './EffectResolver.js';
import StatCalculator from './StatCalculator.js';
import { normalizeRealmStage, resolveRealmStageValue } from './RealmStageValue.js';
import RealmStatProgressionCalculator from './RealmStatProgressionCalculator.js';
import {
    addDecimal,
    compareDecimal,
    decimalPercent,
    divideDecimalByInteger,
    maxDecimal,
    minDecimal,
    multiplyDecimal,
    normalizeDecimal,
    subtractDecimal
} from '../shared/numeric/FixedDecimal.js';
import { normalizeIntegerAmount } from '../shared/numeric/IntegerAmount.js';
import BattleStatCalculator from '../battle/stats/BattleStatCalculator.js';
import { BATTLE_STAT_DEFINITIONS } from '../battle/stats/BattleStatPolicy.js';

function getPlayerGameDataResolver() {
    return new PlayerGameDataResolver();
}

export default class Player {
    constructor(dbData) {
        this.id = dbData.id;
        this.name = dbData.name;
        this.spiritualRoot = dbData.spiritual_root;
        this.spiritRootId = dbData.spirit_root_id || null;
        this.spiritRootQualityTierId = dbData.spirit_root_quality_tier_id || 'LOWER_GRADE';
        this.spiritRootQualityInfo = getPlayerGameDataResolver()
            .getSpiritRootQualityTier(this.spiritRootQualityTierId);

        this.realmId = getPlayerGameDataResolver().normalizeRealmId(dbData.realm_id);
        this.realmStage = normalizeRealmStage(dbData.realm_stage);
        this.cultivationArtId = dbData.cultivation_art_id || 'CP_NEUTRAL_HOANG';
        this.cultivation = normalizeDecimal(dbData.cultivation || 0);
        this.spiritStones = normalizeIntegerAmount(dbData.spirit_stones || 0);
        this.rebirthCount = normalizeIntegerAmount(dbData.rebirth_count || 0);

        this.baseAtk = dbData.base_atk || 10;
        this.baseDef = dbData.base_def || 10;
        this.baseHp = dbData.base_hp || 100;
        this.baseSpd = dbData.base_spd || 10;

        this.lastCultivate = new Date(dbData.last_cultivate);

        const realmTemplate = getPlayerGameDataResolver().getRealmInfo(this.realmId);
        this.realmStage = normalizeRealmStage(this.realmStage, realmTemplate?.max_stage);
        this.realmInfo = realmTemplate ? {
            ...realmTemplate,
            req_cul: this.getStageValue(realmTemplate.cultivation?.required, this.realmStage)
        } : null;
        this.cultivationArt = this.createCultivationArt();
        this.equipments = this.createEquipments(dbData.equipments);
        this.passiveSkills = dbData.passive_skills || [];
        this.activeBuffs = dbData.active_buffs || [];
        this.effects = EffectResolver.getAllEffects(this);
        this.cultivationSpeed = this.calculateCultivationSpeed();
    }

    getMaxRealmId() {
        return getPlayerGameDataResolver().getMaxRealmId();
    }

    isAtMaxRealm() {
        return this.realmId >= this.getMaxRealmId();
    }

    isAtMaxStage() {
        return this.realmStage >= (this.realmInfo?.max_stage || 1);
    }

    hasNextTransition() {
        return !this.isAtMaxStage() || !this.isAtMaxRealm();
    }

    getNextRealmInfo() {
        if (this.isAtMaxRealm()) {
            return null;
        }

        return getPlayerGameDataResolver().getNextRealmInfo(this.realmId) || null;
    }

    getBreakthroughRule() {
        return getPlayerGameDataResolver().getBreakthroughRule(this.realmInfo?.code);
    }

    getStageValue(definition, stage = this.realmStage) {
        return resolveRealmStageValue(definition, stage);
    }

    getStageStats(realmInfo = this.realmInfo, stage = this.realmStage) {
        const resolver = getPlayerGameDataResolver();
        return new RealmStatProgressionCalculator(
            resolver.getRealms(), resolver.getProgressionRules()
        ).calculate(realmInfo?.id, stage);
    }

    createCultivationArt() {
        const itemTemplate = getPlayerGameDataResolver().getCultivationArtTemplate(this.cultivationArtId);
        return new CultivationArt(itemTemplate, { cultivationArtId: this.cultivationArtId });
    }

    createEquipments(equipmentData = []) {
        if (!Array.isArray(equipmentData)) {
            return [];
        }

        return equipmentData.map((equipment) => {
            if (equipment instanceof Equipment) return equipment;

            return ItemFactory.createItem(equipment.item_id || equipment.itemId, equipment);
        }).filter(Boolean);
    }

    calculateRealmCultivationMultiplier() {
        let multiplier = 1;

        for (let realmIndex = 2; realmIndex <= this.realmId; realmIndex += 1) {
            const realm = getPlayerGameDataResolver().getRealmInfo(realmIndex);
            if (!realm) continue;

            if (realm.breakthrough_type === 'MAJOR') {
                multiplier *= 1.5;
                continue;
            }

            if (realm.breakthrough_type === 'MINOR') {
                multiplier *= 1.1;
            }
        }

        return multiplier;
    }

    calculateCultivationSpeed() {
        const baseSpeed = 1;
        return StatCalculator.calculate(baseSpeed, this.effects, 'cultivation_speed');
    }

    getFinalStat(stat) {
        const baseStats = {
            atk: this.baseAtk,
            def: this.baseDef,
            hp: this.baseHp,
            spd: this.baseSpd,
            crit_rate: 0,
            crit_damage: 1.5,
            cultivation_speed: 1
        };

        const effectDefinition = getPlayerGameDataResolver().getEffectDefinition(stat);
        const baseValue = baseStats[stat] ?? effectDefinition?.base_value ?? 0;
        if (Object.hasOwn(BATTLE_STAT_DEFINITIONS, stat)) {
            return BattleStatCalculator.calculate(baseValue, this.effects, stat);
        }
        return StatCalculator.calculate(baseValue, this.effects, stat);
    }

    calculateOfflineCultivation(now = new Date(), rules = getPlayerGameDataResolver().getCultivationRules()) {
        const diffMs = now - this.lastCultivate;
        const diffSeconds = Math.floor(diffMs / 1000);
        const basePerMinute = normalizeDecimal(rules?.baseGainPerMinute || 0);
        const gainPerMinute = multiplyDecimal(basePerMinute, this.cultivationSpeed);

        if (diffSeconds > 0) {
            const generatedCultivation = divideDecimalByInteger(
                multiplyDecimal(gainPerMinute, diffSeconds),
                60
            );
            const overflowRule = rules?.cultivationOverflow || {};
            const overflowMultiplier = overflowRule.enabled
                ? overflowRule.efficiencyMultiplier
                : '1';
            const requiredCultivation = normalizeDecimal(this.realmInfo?.req_cul || 0);
            const remainingToThreshold = this.hasNextTransition()
                ? maxDecimal(subtractDecimal(requiredCultivation, this.cultivation), 0)
                : normalizeDecimal(0);
            const fullEfficiencyGain = minDecimal(generatedCultivation, remainingToThreshold);
            const overflowRawGain = maxDecimal(
                subtractDecimal(generatedCultivation, fullEfficiencyGain),
                0
            );
            const overflowEffectiveGain = multiplyDecimal(overflowRawGain, overflowMultiplier);
            const earnedCul = addDecimal(fullEfficiencyGain, overflowEffectiveGain);

            this.cultivation = addDecimal(this.cultivation, earnedCul);
            this.lastCultivate = now;

            return {
                earned: earnedCul,
                seconds: diffSeconds,
                gainPerMinute,
                generatedCultivation,
                fullEfficiencyGain,
                overflowRawGain,
                overflowEffectiveGain
            };
        }

        return {
            earned: normalizeDecimal(0),
            seconds: 0,
            gainPerMinute,
            generatedCultivation: normalizeDecimal(0),
            fullEfficiencyGain: normalizeDecimal(0),
            overflowRawGain: normalizeDecimal(0),
            overflowEffectiveGain: normalizeDecimal(0)
        };
    }

    getCultivationProgress() {
        return decimalPercent(this.cultivation, this.realmInfo?.req_cul || 0);
    }

    hasRequiredCultivation() {
        return compareDecimal(this.cultivation, this.realmInfo?.req_cul || 0) >= 0;
    }
}
