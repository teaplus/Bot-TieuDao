import FormulaEngine from '../formulas/FormulaEngine.js';
import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import {
    addBattleFixed,
    compareBattleFixed,
    divideBattleFixed,
    minBattleFixed,
    multiplyBattleFixed,
    normalizeBattleFixed,
    rollBattleProbability,
    serializeBattleInteger,
    subtractBattleFixed
} from '../numeric/BattleFixed.js';
import {
    getElementDamageStatKey,
    getElementResistStatKey
} from '../stats/BattleStatPolicy.js';

export const EXECUTABLE_BATTLE_ACTION_TYPES = Object.freeze([
    'DAMAGE',
    'HEAL',
    'ADD_SHIELD',
    'SHIELD',
    'APPLY_EFFECT',
    'ADD_EFFECT',
    'ADD_MODIFIER',
    'REMOVE_MODIFIER',
    'REMOVE_EFFECT',
    'PURIFY',
    'REMOVE_DEBUFF',
    'DISPEL',
    'CHAIN_DAMAGE'
]);

const EXECUTABLE_ACTION_TYPE_SET = new Set(EXECUTABLE_BATTLE_ACTION_TYPES);

export default class ActionExecutor {
    static supports(actionType) {
        return EXECUTABLE_ACTION_TYPE_SET.has(actionType);
    }

    constructor(options = {}) {
        this.formulaEngine = options.formulaEngine || new FormulaEngine(options);
        this.effectEngine = options.effectEngine || null;
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.random = options.random || Math.random;
        this.actionExecutors = new Map();
        this.registerBuiltInExecutors();
        for (const [actionType, executor] of Object.entries(options.actionExecutors || {})) {
            this.register(actionType, executor);
        }
    }

    execute(context, actor, action, targets, executionOptions = {}) {
        const actionTargets = Array.isArray(targets) ? targets : [targets].filter(Boolean);
        const executor = this.actionExecutors.get(action.type)
            || this.createPerTargetExecutor('executeUnsupported');
        return executor(context, actor, action, actionTargets, executionOptions);
    }

    registerBuiltInExecutors() {
        this.registerMany(['DAMAGE'], this.createPerTargetExecutor('executeDamage'));
        this.registerMany(['HEAL'], this.createPerTargetExecutor('executeHeal'));
        this.registerMany(['ADD_SHIELD', 'SHIELD'], this.createPerTargetExecutor('executeShield'));
        this.registerMany(['APPLY_EFFECT', 'ADD_EFFECT'], this.createPerTargetExecutor('executeApplyEffect'));
        this.registerMany(['ADD_MODIFIER'], this.createPerTargetExecutor('executeAddModifier'));
        this.registerMany(['REMOVE_MODIFIER'], this.createPerTargetExecutor('executeRemoveModifier'));
        this.registerMany(['REMOVE_EFFECT'], this.createPerTargetExecutor('executeRemoveEffect'));
        this.registerMany(['PURIFY', 'REMOVE_DEBUFF'], this.createPerTargetExecutor('executePurify'));
        this.registerMany(['DISPEL'], this.createPerTargetExecutor('executeDispel'));
        this.register('CHAIN_DAMAGE', this.executeChainDamage.bind(this));
    }

    registerMany(actionTypes, executor) {
        for (const actionType of actionTypes) {
            this.register(actionType, executor);
        }
    }

    register(actionType, executor) {
        if (!actionType || typeof executor !== 'function') {
            throw new Error('ACTION_EXECUTOR_REGISTRATION_INVALID');
        }
        this.actionExecutors.set(actionType, executor);
        return this;
    }

    supports(actionType) {
        return this.actionExecutors.has(actionType);
    }

    createPerTargetExecutor(methodName) {
        return (context, actor, action, targets, executionOptions = {}) => {
            const executor = this[methodName].bind(this);
            const results = targets.map((target) => executor(context, actor, action, target, executionOptions));
            return {
                actionId: action.id || null,
                actionType: action.type,
                actorId: actor.id,
                targetIds: targets.map((target) => target.id),
                results
            };
        };
    }

    executeDamage(context, actor, action, target, executionOptions = {}) {
        const actionArguments = this.getActionArguments(action);
        const damageResult = executionOptions.elementComponents?.length > 0
            ? this.calculateMultiElementDamage(actor, action, target, actionArguments, executionOptions)
            : this.calculateSingleElementDamage(actor, action, target, actionArguments, executionOptions);
        const applied = target.receiveDamage(damageResult.amount);
        const shieldBreakPolicy = this.getSectPolicy(target, 'SHIELD_BREAK_REFLECT');
        if (shieldBreakPolicy && compareBattleFixed(applied.shieldDamage, 0) > 0
            && compareBattleFixed(applied.remainingShield, 0) === 0) {
            const triggerKey = `${target.id}:${context.round}:${context.turn}:SHIELD_BREAK_REFLECT`;
            context.sectPassiveTriggers ||= new Set();
            if (!context.sectPassiveTriggers.has(triggerKey)) {
                context.sectPassiveTriggers.add(triggerKey);
                const reflectedAmount = serializeBattleInteger(
                    multiplyBattleFixed(applied.shieldDamage, shieldBreakPolicy.shieldDamageRatio), 0
                );
                if (compareBattleFixed(reflectedAmount, 0) > 0) {
                    const reflected = actor.receiveDamage(reflectedAmount);
                    context.metrics.recordDamage(target, actor, reflected, { critical: false });
                    context.enqueueEvent({
                        type: 'SECT_SHIELD_BREAK_REFLECT', sourceId: target.id,
                        targetId: actor.id, amount: reflectedAmount, applied: reflected
                    });
                }
            }
        }
        const result = {
            ...damageResult,
            applied
        };
        context.metrics.recordDamage(actor, target, applied, {
            critical: Boolean(damageResult.critical)
        });

        context.enqueueEvent({
            type: 'DAMAGE',
            actorId: actor.id,
            targetId: target.id,
            result
        });
        return result;
    }

    calculateSingleElementDamage(actor, action, target, actionArguments, executionOptions) {
        const { formulaActor, formulaTarget } = this.resolveFormulaEntities(actor, target, executionOptions);
        let damageResult = this.calculateRawDamage(
            formulaActor,
            formulaTarget,
            action,
            actionArguments
        );
        const targetContext = executionOptions.targetContexts?.get(target.id) || {};
        const spiritRootAffinity = targetContext.spiritRootAffinity
            || executionOptions.spiritRootAffinity;
        damageResult = this.applySpiritRootAffinityDamage(damageResult, {
            spiritRootAffinity
        });
        damageResult = this.applyElementalEquipmentDamage(
            damageResult,
            formulaActor,
            formulaTarget,
            executionOptions.offensiveElement
        );
        return this.applySpiritRootCounterBonusDamage(damageResult, spiritRootAffinity);
    }

    calculateMultiElementDamage(actor, action, target, actionArguments, executionOptions) {
        let sharedRandomVariables = null;
        let sharedVariance = null;
        let sharedCritical = null;
        let totalAmount = normalizeBattleFixed(0);
        const components = [];
        let firstResult = null;

        for (const component of executionOptions.elementComponents) {
            const { formulaActor, formulaTarget } = this.resolveFormulaEntities(actor, target, {
                targetContexts: component.targetContexts
            });
            let componentResult = this.calculateRawDamage(
                formulaActor,
                formulaTarget,
                action,
                actionArguments,
                {
                    variableOverrides: sharedRandomVariables,
                    variance: sharedVariance,
                    critical: sharedCritical
                }
            );
            if (!firstResult) {
                firstResult = componentResult;
                sharedRandomVariables = this.extractRandomVariables(
                    actionArguments.formulaId,
                    componentResult.variables
                );
                sharedVariance = componentResult.variance ?? null;
                sharedCritical = componentResult.critical ?? null;
            }
            const spiritRootAffinity = component.targetContexts
                ?.get(target.id)?.spiritRootAffinity || component.spiritRootAffinity;
            componentResult = this.applySpiritRootAffinityDamage(componentResult, {
                spiritRootAffinity
            });
            componentResult = this.applyElementalEquipmentDamage(
                componentResult,
                formulaActor,
                formulaTarget,
                component.elementId
            );
            componentResult = this.applySpiritRootCounterBonusDamage(
                componentResult,
                spiritRootAffinity
            );
            const weightedAmount = multiplyBattleFixed(
                componentResult.amount,
                divideBattleFixed(component.weight, 100)
            );
            totalAmount = addBattleFixed(totalAmount, weightedAmount);
            components.push(Object.freeze({
                elementId: component.elementId,
                weight: normalizeBattleFixed(component.weight),
                beforeWeightAmount: normalizeBattleFixed(componentResult.amount),
                weightedAmount: serializeBattleInteger(weightedAmount, 1),
                spiritRootAffinity: componentResult.spiritRootAffinity || null,
                elementalEquipment: componentResult.elementalEquipment || null
            }));
        }

        return {
            ...(firstResult || { type: 'DAMAGE' }),
            amount: serializeBattleInteger(totalAmount, 1),
            elementalComponents: Object.freeze(components)
        };
    }

    calculateRawDamage(actor, target, action, actionArguments, shared = {}) {
        return actionArguments.formulaId
            ? this.formulaEngine.evaluateFormula(actionArguments.formulaId, actor, target, {
                resultType: 'DAMAGE',
                params: actionArguments,
                variableOverrides: shared.variableOverrides
            })
            : this.formulaEngine.calculateDamage(actor, target, {
                multiplier: action.multiplier,
                penetration: action.penetration,
                critical: shared.critical ?? action.critical,
                variance: shared.variance ?? action.variance
            });
    }

    extractRandomVariables(formulaId, variables = {}) {
        if (!formulaId) return null;
        const formula = this.gameDataManager.getRecord('formulas', formulaId);
        const randomVariables = {};
        for (const [name, source] of Object.entries(formula?.variables || {})) {
            if (String(source).startsWith('RANDOM(') && variables?.[name] != null) {
                randomVariables[name] = variables[name];
            }
        }
        return Object.keys(randomVariables).length > 0 ? randomVariables : null;
    }

    applySpiritRootAffinityDamage(damageResult, executionOptions = {}) {
        const affinity = executionOptions.spiritRootAffinity;
        if (!affinity?.applied) return damageResult;
        const beforeAffinityAmount = normalizeBattleFixed(damageResult.amount || 0);
        const amount = serializeBattleInteger(
            multiplyBattleFixed(beforeAffinityAmount, affinity.multiplier),
            1
        );
        return {
            ...damageResult,
            amount,
            spiritRootAffinity: Object.freeze({
                ...affinity,
                effectIds: Object.freeze([...(affinity.effectIds || [])]),
                beforeAffinityAmount
            })
        };
    }

    applySpiritRootCounterBonusDamage(damageResult, affinity) {
        if (!affinity?.counterTriggered
            || compareBattleFixed(affinity.appliedCounterBonusRate || 0, 0) <= 0) {
            return damageResult;
        }
        const beforeCounterBonusAmount = normalizeBattleFixed(damageResult.amount || 0);
        const amount = serializeBattleInteger(
            multiplyBattleFixed(beforeCounterBonusAmount, affinity.counterMultiplier),
            1
        );
        return {
            ...damageResult,
            amount,
            spiritRootAffinity: Object.freeze({
                ...(damageResult.spiritRootAffinity || affinity),
                counterTriggered: true,
                appliedCounterBonusRate: affinity.appliedCounterBonusRate,
                counterMultiplier: affinity.counterMultiplier,
                beforeCounterBonusAmount
            })
        };
    }

    applyElementalEquipmentDamage(damageResult, actor, target, offensiveElement) {
        if (!offensiveElement || offensiveElement === 'NEUTRAL') return damageResult;
        const damageStatKey = getElementDamageStatKey(offensiveElement);
        const resistStatKey = getElementResistStatKey(offensiveElement);
        const damageBonus = normalizeBattleFixed(
            actor?.battleStat?.[damageStatKey] || 0
        );
        const resistance = minBattleFixed(
            80,
            normalizeBattleFixed(target?.battleStat?.[resistStatKey] || 0)
        );
        if (compareBattleFixed(damageBonus, 0) <= 0
            && compareBattleFixed(resistance, 0) <= 0) {
            return damageResult;
        }
        const beforeElementalEquipment = normalizeBattleFixed(damageResult.amount || 0);
        const damageMultiplier = addBattleFixed(1, divideBattleFixed(damageBonus, 100));
        const resistanceMultiplier = subtractBattleFixed(
            1,
            divideBattleFixed(resistance, 100)
        );
        const amount = serializeBattleInteger(
            multiplyBattleFixed(
                multiplyBattleFixed(beforeElementalEquipment, damageMultiplier),
                resistanceMultiplier
            ),
            1
        );
        return {
            ...damageResult,
            amount,
            elementalEquipment: Object.freeze({
                elementId: offensiveElement,
                damageBonus,
                resistance,
                damageMultiplier,
                resistanceMultiplier,
                beforeElementalEquipment
            })
        };
    }

    executeChainDamage(context, actor, action, initialTargets, executionOptions = {}) {
        const actionArguments = this.getActionArguments(action);
        const jumpMultipliers = actionArguments.jumpMultipliers || [1, 0.7, 0.4];
        const selectedTargets = initialTargets.filter((target) => target.alive);
        const results = selectedTargets.map((target, index) => this.executeDamage(
            context, actor, {
                ...action,
                type: 'DAMAGE',
                arguments: {
                    ...actionArguments,
                    CHAIN_MULTIPLIER: normalizeBattleFixed(jumpMultipliers[index] ?? 0)
                }
            }, target, executionOptions
        ));

        context.enqueueEvent({
            type: 'CHAIN_DAMAGE',
            actorId: actor.id,
            targetIds: selectedTargets.map((target) => target.id),
            jumpMultipliers: selectedTargets.map((_, index) => normalizeBattleFixed(jumpMultipliers[index] ?? 0))
        });

        return {
            actionId: action.id || null,
            actionType: action.type,
            actorId: actor.id,
            targetIds: selectedTargets.map((target) => target.id),
            results
        };
    }

    executeHeal(context, actor, action, target, executionOptions = {}) {
        const { formulaActor, formulaTarget } = this.resolveFormulaEntities(actor, target, executionOptions);
        const actionArguments = this.getActionArguments(action);
        const healResult = actionArguments.formulaId
            ? this.formulaEngine.evaluateFormula(actionArguments.formulaId, formulaActor, formulaTarget, {
                resultType: 'HEAL',
                params: actionArguments
            })
            : this.formulaEngine.calculateHeal(formulaActor, formulaTarget, {
                base: action.base,
                multiplier: action.multiplier
            });
        const blockingEffect = target.effects.find(
            (effect) => effect.tags?.includes('HEAL_BLOCK')
        );
        const applied = blockingEffect
            ? {
                healing: '0',
                actualHealing: '0',
                remainingHP: target.currentHP,
                blocked: true,
                blockedByEffectId: blockingEffect.id
            }
            : target.heal(healResult.amount);
        const result = {
            ...healResult,
            applied
        };
        context.metrics.recordHealing(actor, target, applied);

        context.enqueueEvent({
            type: blockingEffect ? 'HEAL_BLOCKED' : 'HEAL',
            actorId: actor.id,
            targetId: target.id,
            result
        });
        return result;
    }

    executeShield(context, actor, action, target, executionOptions = {}) {
        const { formulaActor, formulaTarget } = this.resolveFormulaEntities(actor, target, executionOptions);
        const actionArguments = this.getActionArguments(action);
        const shieldResult = actionArguments.formulaId
            ? this.formulaEngine.evaluateFormula(actionArguments.formulaId, formulaActor, formulaTarget, {
                resultType: 'SHIELD',
                params: actionArguments
            })
            : this.formulaEngine.calculateShield(formulaActor, formulaTarget, {
                base: action.base,
                multiplier: action.multiplier
            });
        const applied = target.addShield(shieldResult.amount);
        const result = {
            ...shieldResult,
            applied
        };
        context.metrics.recordShieldGranted(actor, applied);

        context.enqueueEvent({
            type: 'SHIELD',
            actorId: actor.id,
            targetId: target.id,
            result
        });
        return result;
    }

    executeApplyEffect(context, actor, action, target) {
        const actionArguments = this.getActionArguments(action);
        const success = rollBattleProbability(
            this.resolveActionChance(action, actor, actionArguments),
            this.random
        );
        const effect = success
            ? this.applyEffect(context, actor, action, target, actionArguments)
            : null;
        const result = {
            type: action.type,
            effectId: actionArguments.effectId,
            success,
            actorId: actor.id,
            targetId: target.id,
            effect
        };
        if (success && effect && !effect.transient) {
            context.metrics.recordEffectApplied(actor);
            const definition = this.effectEngine?.getEffectDefinition(actionArguments.effectId);
            const slowPolicy = this.getSectPolicy(actor, 'SLOW_AFTER_CONTROL');
            if (slowPolicy && definition?.tags?.includes('CONTROL')) {
                const modifier = this.gameDataManager.requireRecord('modifiers', slowPolicy.modifierId);
                target.addModifier({
                    ...modifier,
                    source: actor.id,
                    remainingTurns: Number(slowPolicy.durationTurns)
                });
                context.enqueueEvent({
                    type: 'SECT_SLOW_AFTER_CONTROL', actorId: actor.id,
                    targetId: target.id, modifierId: modifier.id,
                    durationTurns: Number(slowPolicy.durationTurns)
                });
            }
        }

        context.enqueueEvent({
            type: 'APPLY_EFFECT',
            actorId: actor.id,
            targetId: target.id,
            result
        });
        return result;
    }

    applyEffect(context, actor, action, target, actionArguments = {}) {
        let duration = action.duration || actionArguments.duration;
        const definition = this.effectEngine?.getEffectDefinition(actionArguments.effectId);
        const burnPolicy = this.getSectPolicy(actor, 'BURN_DURATION');
        if (burnPolicy && (definition?.id === 'BURN' || definition?.tags?.includes('BURN'))) {
            duration = Number(duration ?? definition.duration ?? 0) + Number(burnPolicy.durationBonusTurns);
        }
        if (this.effectEngine) {
            return this.effectEngine.applyEffect(context, target, actionArguments.effectId, actor, {
                duration
            });
        }

        return target.addEffect({
            id: actionArguments.effectId,
            source: actor.id,
            remainingTurns: duration || null
        });
    }

    getSectPolicy(entity, kind) {
        return (entity?.effects || []).find((effect) => effect.sectPolicy?.kind === kind)?.sectPolicy || null;
    }

    executeAddModifier(context, actor, action, target) {
        const actionArguments = this.getActionArguments(action);
        const modifierId = actionArguments.modifierId;
        const modifier = this.gameDataManager.getRecord('modifiers', modifierId);
        const appliedModifier = modifier
            ? target.addModifier({
                ...modifier,
                source: actor.id,
                remainingTurns: actionArguments.duration == null
                    ? null
                    : Number(actionArguments.duration)
            })
            : null;
        const result = {
            type: 'ADD_MODIFIER',
            modifierId,
            success: Boolean(appliedModifier),
            actorId: actor.id,
            targetId: target.id,
            modifier: appliedModifier
        };

        context.enqueueEvent({
            type: 'ADD_MODIFIER',
            actorId: actor.id,
            targetId: target.id,
            result
        });

        return result;
    }

    executeRemoveModifier(context, actor, action, target) {
        const actionArguments = this.getActionArguments(action);
        const modifierId = actionArguments.modifierId;
        const removedCount = target.removeModifier(modifierId);
        const result = {
            type: 'REMOVE_MODIFIER',
            modifierId,
            removedCount,
            actorId: actor.id,
            targetId: target.id
        };

        context.enqueueEvent({
            type: 'REMOVE_MODIFIER',
            actorId: actor.id,
            targetId: target.id,
            result
        });

        return result;
    }

    executeRemoveEffect(context, actor, action, target) {
        const actionArguments = this.getActionArguments(action);
        const effectId = actionArguments.effectId;
        const removedCount = this.effectEngine
            ? this.effectEngine.removeEffect(context, target, effectId)
            : target.removeEffect(effectId);

        return {
            type: 'REMOVE_EFFECT',
            effectId,
            removedCount,
            actorId: actor.id,
            targetId: target.id
        };
    }

    executePurify(context, actor, action, target) {
        const actionArguments = this.getActionArguments(action);
        const count = Number(actionArguments.count || 1);
        const removableEffects = target.effects
            .filter((effect) => effect.tags?.includes('DEBUFF') || effect.category === 'DEBUFF')
            .slice(0, count);

        for (const effect of removableEffects) {
            target.removeEffect(effect.id);
        }

        const result = {
            type: 'PURIFY',
            removedEffectIds: removableEffects.map((effect) => effect.id),
            actorId: actor.id,
            targetId: target.id
        };

        context.enqueueEvent({
            type: 'PURIFY',
            actorId: actor.id,
            targetId: target.id,
            result
        });

        return result;
    }

    executeDispel(context, actor, action, target) {
        const actionArguments = this.getActionArguments(action);
        const success = rollBattleProbability(
            this.resolveActionChance(action, actor, actionArguments),
            this.random
        );
        const candidates = success ? [
            ...target.effects
                .filter((effect) => (
                    effect.remainingTurns != null
                    && effect.tags?.includes('BUFF')
                ))
                .map((effect) => ({
                    kind: 'EFFECT',
                    id: effect.id,
                    runtimeId: null,
                    runtimeSequence: Number(effect.runtimeSequence || 0)
                })),
            ...target.modifiers
                .filter((modifier) => (
                    modifier.remainingTurns != null
                    && compareBattleFixed(
                        modifier.normalizedValue ?? modifier.value ?? 0,
                        0
                    ) > 0
                ))
                .map((modifier) => ({
                    kind: 'MODIFIER',
                    id: modifier.id || modifier.modifierId,
                    runtimeId: modifier.runtimeId,
                    runtimeSequence: Number(modifier.runtimeSequence || 0)
                }))
        ].sort((left, right) => right.runtimeSequence - left.runtimeSequence) : [];
        const selected = candidates[0] || null;
        let removedCount = 0;
        if (selected?.kind === 'EFFECT') {
            removedCount = this.effectEngine
                ? this.effectEngine.removeEffect(context, target, selected.id)
                : target.removeEffect(selected.id);
        } else if (selected?.kind === 'MODIFIER') {
            removedCount = target.removeModifierInstance(selected.runtimeId);
        }
        const result = {
            type: 'DISPEL',
            success,
            removedCount,
            removedKind: removedCount > 0 ? selected.kind : null,
            removedId: removedCount > 0 ? selected.id : null,
            actorId: actor.id,
            targetId: target.id
        };
        context.enqueueEvent({
            type: 'DISPEL_BUFF',
            actorId: actor.id,
            targetId: target.id,
            result
        });
        return result;
    }

    resolveActionChance(action, actor, actionArguments = {}) {
        const variantId = actor?.metadata?.variantId || 'DEFAULT';
        return action.chanceByVariant?.[variantId]
            ?? action.chanceByVariant?.DEFAULT
            ?? action.chance
            ?? actionArguments.chance
            ?? 100;
    }

    executeUnsupported(context, actor, action, target) {
        const result = {
            type: 'UNSUPPORTED_ACTION',
            actionType: action.type,
            actorId: actor.id,
            targetId: target.id
        };

        context.enqueueEvent({
            type: 'UNSUPPORTED_ACTION',
            actorId: actor.id,
            targetId: target.id,
            result
        });

        return result;
    }

    getActionArguments(action) {
        return {
            ...(action.arguments || {}),
            ...(action.formulaId ? { formulaId: action.formulaId } : {}),
            ...(action.effectId ? { effectId: action.effectId } : {}),
            ...(action.modifierId ? { modifierId: action.modifierId } : {})
        };
    }

    resolveFormulaEntities(actor, target, executionOptions = {}) {
        const targetContext = executionOptions.targetContexts?.get(target.id) || {};
        return {
            formulaActor: targetContext.formulaActor || actor,
            formulaTarget: targetContext.formulaTarget || target
        };
    }
}
