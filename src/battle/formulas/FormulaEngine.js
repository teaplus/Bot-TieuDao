import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import { evaluateBattleExpression } from '../numeric/BattleExpressionEvaluator.js';
import {
    addBattleFixed,
    compareBattleFixed,
    divideBattleFixed,
    maxBattleFixed,
    minBattleFixed,
    multiplyBattleFixed,
    normalizeBattleFixed,
    randomBattleFixed,
    rollBattleProbability,
    serializeBattleInteger,
    subtractBattleFixed
} from '../numeric/BattleFixed.js';

const ATTRIBUTE_STAT_MAP = Object.freeze({
    HP: 'hp', ATK: 'atk', DEF: 'def', SPD: 'spd', CRIT: 'critRate', CDMG: 'critDamage',
    PEN: 'pen', SKD: 'skillDamage', LS: 'lifesteal', SHD: 'shieldPower', CCR: 'controlRate',
    TEN: 'controlResist', FINAL_DAMAGE: 'finalDamage', FINAL_DEFENSE: 'finalDefense',
    HIT_RATE: 'hitRate', CONTROL_IMMUNITY: 'controlImmunity', LUK: 'luck', REF: 'reflect'
});

export default class FormulaEngine {
    constructor(options = {}) {
        this.random = options.random || Math.random;
        this.gameDataManager = options.gameDataManager || getGameDataManager();
    }

    evaluateFormula(formulaId, actor, target, options = {}) {
        const formula = this.gameDataManager.getRecord('formulas', formulaId);
        if (!formula) {
            return { type: options.resultType || 'FORMULA', formulaId, amount: '0', value: '0',
                missing: true, actorId: actor.id, targetId: target.id };
        }
        const params = { DAMAGE_RATE: '1', HEAL_RATE: '1', SHIELD_RATE: '1', ...(options.params || {}) };
        const values = {};
        for (const [name, source] of Object.entries(formula.variables || {})) {
            values[name] = options.variableOverrides?.[name] != null
                ? normalizeBattleFixed(options.variableOverrides[name])
                : this.resolveVariable(source, actor, target, { params, input: options.input || {} });
        }
        const value = evaluateBattleExpression(formula.expression, values);
        return {
            type: options.resultType || 'FORMULA', formulaId,
            amount: this.normalizeFormulaAmount(value, options.resultType), value, variables: values,
            statScope: 'CURRENT_BATTLE_STAT', actorId: actor.id, targetId: target.id
        };
    }

    resolveVariable(sourcePath, actor, target, options = {}) {
        const source = String(sourcePath || '');
        const randomMatch = source.match(/^RANDOM\(([-\d.]+),\s*([-\d.]+)\)$/);
        if (randomMatch) return randomBattleFixed(randomMatch[1], randomMatch[2], this.random);
        const [scope, key] = source.split('.');
        if (scope === 'SELF') return this.getEntityStat(actor, key);
        if (scope === 'TARGET') return this.getEntityStat(target, key);
        if (scope === 'PARAM') return normalizeBattleFixed(options.params?.[key] ?? 0);
        if (scope === 'INPUT') return normalizeBattleFixed(options.input?.[key] ?? 0);
        return normalizeBattleFixed(sourcePath || 0);
    }

    getEntityStat(entity, attribute) {
        const key = ATTRIBUTE_STAT_MAP[attribute] || String(attribute || '').toLowerCase();
        return normalizeBattleFixed(entity.battleStat?.[key] ?? 0);
    }

    evaluateExpression(expression, values) {
        return evaluateBattleExpression(expression, values);
    }

    normalizeFormulaAmount(value, resultType = 'FORMULA') {
        return serializeBattleInteger(value, resultType === 'DAMAGE' ? 1 : 0);
    }

    calculateDamage(attacker, target, options = {}) {
        const multiplier = normalizeBattleFixed(options.multiplier ?? 1);
        const variance = options.variance === false
            ? '1'
            : options.variance != null
                ? normalizeBattleFixed(options.variance)
                : randomBattleFixed('0.8', '1', this.random);
        const defense = maxBattleFixed(0, target.battleStat.def);
        const penetration = maxBattleFixed(0, options.penetration ?? attacker.battleStat.pen ?? 0);
        const cappedPenetration = minBattleFixed(100, penetration);
        const defenseRate = subtractBattleFixed(1, divideBattleFixed(cappedPenetration, 100));
        const effectiveDefense = multiplyBattleFixed(defense, defenseRate);
        const baseDamage = maxBattleFixed(1, multiplyBattleFixed(
            subtractBattleFixed(attacker.battleStat.atk, effectiveDefense), multiplier
        ));
        const critical = this.rollCritical(attacker, options);
        const criticalMultiplier = critical
            ? addBattleFixed(1, divideBattleFixed(attacker.battleStat.critDamage, 100))
            : '1';
        const amount = serializeBattleInteger(
            multiplyBattleFixed(multiplyBattleFixed(baseDamage, variance), criticalMultiplier), 1
        );
        return { type: 'DAMAGE', amount, baseDamage, variance, critical, criticalMultiplier,
            penetration, attackerId: attacker.id, targetId: target.id };
    }

    calculateHeal(source, target, options = {}) {
        const base = normalizeBattleFixed(options.base ?? multiplyBattleFixed(source.battleStat.atk, '0.5'));
        const amount = serializeBattleInteger(multiplyBattleFixed(base, options.multiplier ?? 1), 0);
        return { type: 'HEAL', amount, sourceId: source.id, targetId: target.id };
    }

    calculateShield(source, target, options = {}) {
        const base = normalizeBattleFixed(options.base ?? source.battleStat.def);
        const amount = serializeBattleInteger(multiplyBattleFixed(base, options.multiplier ?? 1), 0);
        return { type: 'SHIELD', amount, sourceId: source.id, targetId: target.id };
    }

    calculateLifesteal(damageResult, options = {}) {
        const rate = divideBattleFixed(maxBattleFixed(0, options.rate ?? 0), 100);
        const amount = serializeBattleInteger(multiplyBattleFixed(damageResult.amount || 0, rate), 0);
        return { type: 'LIFESTEAL', amount, sourceDamage: normalizeBattleFixed(damageResult.amount || 0), rate };
    }

    rollCritical(attacker, options = {}) {
        if (options.critical === true) return true;
        if (options.critical === false) return false;
        return rollBattleProbability(attacker.battleStat.critRate, this.random);
    }

    randomFloat(min, max) {
        return randomBattleFixed(min, max, this.random);
    }
}
