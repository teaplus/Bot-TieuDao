import BattleStatCalculator from '../../battle/stats/BattleStatCalculator.js';
import ItemFactory from '../../factories/ItemFactory.js';
import SkillFactory from '../../factories/SkillFactory.js';
import BattleEntity from '../../battle/entities/BattleEntity.js';
import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import { BATTLE_STAT_DEFINITIONS } from '../../battle/stats/BattleStatPolicy.js';
import SectEffectResolver from '../../gameplay/sect/SectEffectResolver.js';
import SpiritRootEffectResolver from '../../gameplay/player/SpiritRootEffectResolver.js';
import {
    compareBattleFixed,
    floorBattleFixed,
    maxBattleFixed,
    minBattleFixed,
    normalizeBattleFixed
} from '../../battle/numeric/BattleFixed.js';

function normalizeStatKey(stat) {
    if (Object.hasOwn(BATTLE_STAT_DEFINITIONS, stat)) return stat;
    const elemental = String(stat || '').match(
        /^ELEMENT_(METAL|WOOD|WATER|FIRE|EARTH|ICE|LIGHTNING|WIND|LIGHT|DARK|CHAOS)_(DAMAGE|RESIST)$/
    );
    if (elemental) {
        return `${elemental[1].toLowerCase()}${elemental[2] === 'DAMAGE' ? 'Damage' : 'Resist'}`;
    }
    const map = {
        ATK: 'atk',
        DEF: 'def',
        HP: 'hp',
        SPD: 'spd',
        CRIT: 'critRate',
        CDMG: 'critDamage',
        PEN: 'pen',
        SKD: 'skillDamage',
        LS: 'lifesteal',
        SHD: 'shieldPower',
        REG: 'regen',
        CCR: 'controlRate',
        TEN: 'controlResist',
        REF: 'reflect',
        LUK: 'luck',
        FINAL_DAMAGE: 'finalDamage',
        FINAL_DEFENSE: 'finalDefense',
        HIT_RATE: 'hitRate',
        CONTROL_IMMUNITY: 'controlImmunity'
    };

    return map[stat] || String(stat || '').toLowerCase();
}

export default class BattleEntityFactory {
    constructor(options = {}) {
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.sectEffectResolver = options.sectEffectResolver || new SectEffectResolver({
            gameDataManager: this.gameDataManager
        });
        this.spiritRootEffectResolver = options.spiritRootEffectResolver
            || new SpiritRootEffectResolver({ gameDataManager: this.gameDataManager });
    }

    createFromRuntimePlayer(runtimePlayer, options = {}) {
        const effects = this.collectRuntimePlayerEffects(runtimePlayer);
        const equippedPassiveSkillIds = runtimePlayer.skillIds.filter(
            (skillId) => SkillFactory.create(skillId)?.type === 'PASSIVE'
        );
        const spiritRootActionEffects = (this.spiritRootEffectResolver
            .getActionEffects?.(runtimePlayer) || []).map((effect) => Object.freeze({ ...effect }));
        const battleStat = this.calculateBattleStats(runtimePlayer.baseStats, effects);

        return new BattleEntity({
            id: options.id || `player:${runtimePlayer.playerId}`,
            name: runtimePlayer.name,
            team: options.team || 'A',
            sourceType: 'PLAYER',
            sourceId: runtimePlayer.playerId,
            battleStat,
            effects,
            skills: runtimePlayer.skillIds,
            metadata: {
                realmId: runtimePlayer.realmId,
                cultivationArtId: runtimePlayer.cultivationArtId,
                sectId: runtimePlayer.sectId,
                sectEffectIds: this.sectEffectResolver.getDefinitions(runtimePlayer).map(({ id }) => id),
                spiritRootEffectIds: this.spiritRootEffectResolver
                    .getDefinitions(runtimePlayer).map(({ id }) => id),
                spiritRootQualityTierId: runtimePlayer.spiritRootQualityTierId,
                spiritRootElementIds: this.resolvePlayerElementIds(runtimePlayer),
                spiritRootAffinityPolicy: this.resolvePlayerAffinityPolicy(runtimePlayer),
                spiritRootActionEffects: Object.freeze(spiritRootActionEffects),
                equippedPassiveSkillIds: Object.freeze(equippedPassiveSkillIds),
                defensiveElement: this.resolvePlayerDefensiveElement(runtimePlayer)
            }
        });
    }

    createFromMonsterPlan(monsterPlan, options = {}) {
        return new BattleEntity({
            id: options.id || `monster:${monsterPlan.id}`,
            name: monsterPlan.name,
            team: options.team || 'B',
            sourceType: 'MONSTER',
            sourceId: monsterPlan.id,
            battleStat: this.calculateBattleStats(monsterPlan.stats, []),
            effects: monsterPlan.effects || [],
            skills: monsterPlan.skillIds || [],
            metadata: {
                templateId: monsterPlan.templateId,
                element: monsterPlan.element,
                defensiveElement: monsterPlan.defensiveElement || monsterPlan.element || 'NEUTRAL',
                realmId: monsterPlan.realmId,
                rewardTableId: monsterPlan.rewardTableId,
                variantId: monsterPlan.variantId,
                qualityId: monsterPlan.qualityId,
                qualityName: monsterPlan.qualityName,
                qualityBonusPercent: monsterPlan.qualityBonusPercent
            }
        });
    }

    collectRuntimePlayerEffects(runtimePlayer) {
        const equipmentEffects = runtimePlayer.inventory.runtimeEquipments
            .filter((equipment) => equipment.equippedSlot)
            .flatMap((equipment) => this.getEquipmentEffects(equipment));
        const passiveSkillEffects = runtimePlayer.skillIds
            .map((skillId) => SkillFactory.create(skillId))
            .filter((skill) => skill?.type === 'PASSIVE')
            .flatMap((skill) => skill.getEffects());

        return [
            ...equipmentEffects,
            ...passiveSkillEffects,
            ...this.sectEffectResolver.getBattleEffects(runtimePlayer),
            ...this.spiritRootEffectResolver.getBattleEffects(runtimePlayer),
            ...(runtimePlayer.activeEffects || [])
        ];
    }

    getEquipmentEffects(runtimeEquipment) {
        const item = ItemFactory.createItem(runtimeEquipment.templateId, {
            id: runtimeEquipment.runtimeId,
            rarity: runtimeEquipment.rarity,
            equippedSlot: runtimeEquipment.equippedSlot,
            fixedEffects: runtimeEquipment.fixedEffects,
            grade: runtimeEquipment.grade,
            gradeQuality: runtimeEquipment.gradeQuality,
            instance_data: runtimeEquipment.instanceData
        });

        return item?.getEffects ? item.getEffects() : [];
    }

    calculateBattleStats(baseStats, effects) {
        const normalizedEffects = effects.map((effect) => ({
            ...effect,
            stat: normalizeStatKey(effect.stat)
        }));

        return Object.fromEntries(Object.entries(BATTLE_STAT_DEFINITIONS).map(([statKey, definition]) => {
            const attribute = this.gameDataManager.getRecord('attributes', definition.attributeId) || {};
            const baseValue = normalizeBattleFixed(baseStats?.[statKey] ?? attribute.defaultValue ?? definition.fallback);
            let value = BattleStatCalculator.calculate(baseValue, normalizedEffects, statKey);
            if (attribute.min != null) value = maxBattleFixed(attribute.min, value);
            if (attribute.max != null) value = minBattleFixed(attribute.max, value);
            if (attribute.type === 'INTEGER') value = floorBattleFixed(value);
            if (compareBattleFixed(value, 0) === 0) value = '0';
            return [statKey, value];
        }));
    }

    createFromSnapshot(snapshot, overrides = {}) {
        return new BattleEntity({
            ...snapshot,
            ...overrides,
            battleStat: { ...snapshot.battleStat },
            effects: (overrides.effects || snapshot.effects || []).map((effect) => ({ ...effect })),
            skills: [...(snapshot.skills || [])],
            metadata: { ...snapshot.metadata }
        });
    }

    resolvePlayerDefensiveElement(runtimePlayer) {
        const spiritRoot = runtimePlayer.spiritRootId
            ? this.gameDataManager.getRecord('spiritRoots', runtimePlayer.spiritRootId)
            : null;
        return spiritRoot?.defensiveElementId || 'NEUTRAL';
    }

    resolvePlayerElementIds(runtimePlayer) {
        const spiritRoot = runtimePlayer.spiritRootId
            ? this.gameDataManager.getRecord('spiritRoots', runtimePlayer.spiritRootId)
            : null;
        return Object.freeze([...(spiritRoot?.elementIds || [])]);
    }

    resolvePlayerAffinityPolicy(runtimePlayer) {
        const spiritRoot = runtimePlayer.spiritRootId
            ? this.gameDataManager.getRecord('spiritRoots', runtimePlayer.spiritRootId)
            : null;
        if (!spiritRoot?.affinityPolicy) return null;
        return Object.freeze({ ...spiritRoot.affinityPolicy });
    }
}
