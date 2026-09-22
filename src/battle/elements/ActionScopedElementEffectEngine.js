import BattleStatCalculator from '../stats/BattleStatCalculator.js';
import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import { BATTLE_STAT_DEFINITIONS } from '../stats/BattleStatPolicy.js';
import ElementRelationResolver from './ElementRelationResolver.js';
import {
    addBattleFixed,
    compareBattleFixed,
    floorBattleFixed,
    maxBattleFixed,
    minBattleFixed,
    rollBattleProbability
} from '../numeric/BattleFixed.js';

const NEUTRAL = 'NEUTRAL';

function freezeSnapshot(value) {
    return Object.freeze({
        ...value,
        relationIds: Object.freeze([...(value.relationIds || [])]),
        scopedEffectIds: Object.freeze([...(value.scopedEffectIds || [])])
    });
}

export default class ActionScopedElementEffectEngine {
    constructor(options = {}) {
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.relationResolver = options.relationResolver || new ElementRelationResolver(options);
        this.conditionTargetFilter = options.conditionTargetFilter || null;
        this.targetSelector = options.targetSelector || null;
        this.random = options.random || Math.random;
        this.actionPipeline = options.actionPipeline || null;
        this.maxDepth = Number(options.elementRelationMaxDepth || 16);
        this.activeScopes = new Set();
        this.nextScopeId = 1;
    }

    activate(payload) {
        const weightedElements = this.resolveElementWeights(payload);
        if (weightedElements.length > 0) {
            return this.activateWeightedElements(payload, weightedElements);
        }
        const offensiveElement = this.resolveOffensiveElement(payload);
        const scope = {
            id: `ELEMENT_ACTION_SCOPE:${this.nextScopeId++}`,
            offensiveElement,
            spiritRootAffinity: this.resolveSpiritRootAffinity(payload, offensiveElement),
            targetContexts: new Map(),
            snapshots: [],
            instances: []
        };
        this.activeScopes.add(scope);

        try {
            for (const target of payload.targets || []) {
                this.activateForTarget(scope, payload, target);
            }
            return scope;
        } catch (error) {
            this.cleanup(scope);
            throw error;
        }
    }

    activateWeightedElements(payload, weightedElements) {
        const scope = {
            id: `ELEMENT_ACTION_SCOPE:${this.nextScopeId++}`,
            offensiveElement: 'MULTI',
            spiritRootAffinity: null,
            targetContexts: new Map(),
            snapshots: [],
            instances: [],
            elementComponents: []
        };
        this.activeScopes.add(scope);
        try {
            for (const weightedElement of weightedElements) {
                const component = {
                    id: `${scope.id}:${weightedElement.elementId}`,
                    offensiveElement: weightedElement.elementId,
                    elementId: weightedElement.elementId,
                    weight: weightedElement.weight,
                    spiritRootAffinity: this.resolveSpiritRootAffinity(payload, weightedElement.elementId),
                    targetContexts: new Map(),
                    snapshots: [],
                    instances: scope.instances
                };
                for (const target of payload.targets || []) {
                    this.activateForTarget(component, payload, target);
                }
                scope.elementComponents.push(component);
                scope.snapshots.push(...component.snapshots.map((snapshot) => freezeSnapshot({
                    ...snapshot,
                    elementId: weightedElement.elementId,
                    elementWeight: weightedElement.weight
                })));
            }
            return scope;
        } catch (error) {
            this.cleanup(scope);
            throw error;
        }
    }

    activateForTarget(scope, payload, target) {
        const defensiveElement = this.resolveDefensiveElement(target);
        const relations = offensiveElementIsNeutral(scope.offensiveElement, defensiveElement)
            ? []
            : this.relationResolver.resolve(scope.offensiveElement, defensiveElement);
        const modifiers = { actor: [], target: [] };
        const scopedEffectIds = [];
        const activated = new Set();

        for (const relation of relations) {
            if (!relation.effectId) continue;
            const cardinalityKey = `${target.id}:${relation.id}`;
            if (activated.has(cardinalityKey)) continue;
            activated.add(cardinalityKey);
            this.activateRelationEffect(scope, payload, target, relation, modifiers);
            scopedEffectIds.push(relation.effectId);
        }

        const spiritRootAffinity = this.resolveTargetSpiritRootAffinity(
            scope.spiritRootAffinity,
            relations
        );
        scope.targetContexts.set(target.id, {
            formulaActor: this.createFormulaEntity(payload.caster, modifiers.actor),
            formulaTarget: this.createFormulaEntity(target, modifiers.target),
            spiritRootAffinity
        });
        if (spiritRootAffinity.applied) {
            payload.battleContext.enqueueEvent({
                type: 'SPIRIT_ROOT_AFFINITY_DAMAGE_APPLIED',
                actorId: payload.caster.id,
                targetId: target.id,
                skillId: payload.skill?.id || null,
                actionId: payload.action?.id || null,
                actionType: payload.action?.type || null,
                elementId: scope.offensiveElement,
                elementWeight: scope.weight ?? null,
                qualityTierId: spiritRootAffinity.qualityTierId,
                bonusRate: spiritRootAffinity.bonusRate,
                multiplier: spiritRootAffinity.multiplier,
                counterBonusRate: spiritRootAffinity.appliedCounterBonusRate,
                counterMultiplier: spiritRootAffinity.counterMultiplier,
                counterTriggered: spiritRootAffinity.counterTriggered,
                counterRelationIds: spiritRootAffinity.counterRelationIds,
                effectIds: spiritRootAffinity.effectIds
            });
        }
        scope.snapshots.push(freezeSnapshot({
            targetId: target.id,
            defensiveElement,
            relationIds: relations.map((relation) => relation.id),
            scopedEffectIds
        }));
    }

    activateRelationEffect(scope, payload, target, relation, modifiers) {
        const effect = this.gameDataManager.requireRecord('coreEffects', relation.effectId);
        if (!(effect.scopes || []).includes('ACTION')) {
            throw new Error(`ELEMENT_RELATION_EFFECT_ACTION_SCOPE_REQUIRED:${effect.id}`);
        }
        const stack = [...(payload.elementRelationStack || [])];
        const causalKey = `${relation.id}:${effect.id}`;
        const depth = Number(payload.elementRelationDepth || 0);
        if (depth >= this.maxDepth) {
            throw new Error(`ELEMENT_RELATION_MAX_DEPTH:${this.maxDepth}`);
        }
        if (stack.includes(causalKey)) {
            throw new Error(`ELEMENT_RELATION_CAUSAL_CYCLE:${causalKey}`);
        }

        const instance = Object.freeze({
            id: `${scope.id}:${target.id}:${relation.id}`,
            scope: 'ACTION',
            ownerExecutionId: payload.executionId,
            effectId: effect.id,
            sourceId: payload.caster.id,
            targetId: target.id,
            relation
        });
        scope.instances.push(instance);

        for (const action of effect.actions || []) {
            if (action.type === 'ADD_MODIFIER') {
                this.collectScopedModifier(payload, target, action, modifiers);
                continue;
            }
            this.executeSupplementalAction(payload, target, action, effect, {
                depth: depth + 1,
                stack: [...stack, causalKey]
            });
        }

        payload.battleContext.enqueueEvent({
            type: 'ELEMENT_RELATION_APPLIED',
            actorId: payload.caster.id,
            targetId: target.id,
            relationId: relation.id,
            relationType: relation.relationType,
            effectId: effect.id,
            scope: 'ACTION'
        });
    }

    collectScopedModifier(payload, relationTarget, action, modifiers) {
        const target = ['SELF', 'CASTER'].includes(action.target) ? payload.caster : relationTarget;
        if (!['SELF', 'CASTER', 'TARGET', 'OWNER'].includes(action.target)) {
            throw new Error(`ACTION_SCOPED_MODIFIER_TARGET_UNSUPPORTED:${action.target}`);
        }
        if (this.conditionTargetFilter) {
            const conditionResult = this.conditionTargetFilter.filter(action, payload.caster, [target]);
            if (!conditionResult.targets.length) return;
        }
        const chance = action.chance ?? action.arguments?.chance ?? 100;
        if (compareBattleFixed(chance, 100) < 0 && !rollBattleProbability(chance, this.random)) return;
        const modifierId = action.arguments?.modifierId || action.modifierId;
        const modifier = this.gameDataManager.requireRecord('modifiers', modifierId);
        const bucket = target === payload.caster ? modifiers.actor : modifiers.target;
        bucket.push(modifier);
    }

    executeSupplementalAction(payload, relationTarget, action, effect, causal) {
        if (!this.actionPipeline) {
            throw new Error('ELEMENT_RELATION_ACTION_PIPELINE_REQUIRED');
        }
        const candidates = this.resolveSupplementalTargets(payload, relationTarget, action);
        this.actionPipeline.executeResolved({
            battleContext: payload.battleContext,
            caster: payload.caster,
            action,
            candidates,
            effectId: effect.id,
            effectElement: effect.element || null,
            elementRelationDepth: causal.depth,
            elementRelationStack: causal.stack
        });
    }

    resolveSupplementalTargets(payload, relationTarget, action) {
        const strategy = action.target || 'TARGET';
        if (strategy === 'SELF' || strategy === 'CASTER') return [payload.caster];
        if (strategy === 'TARGET' || strategy === 'OWNER') return [relationTarget];
        if (!this.targetSelector) throw new Error(`ELEMENT_RELATION_TARGET_SELECTOR_REQUIRED:${strategy}`);
        return this.targetSelector.select(payload.battleContext, payload.caster, strategy);
    }

    createFormulaEntity(entity, scopedModifiers) {
        if (!scopedModifiers.length) return entity;
        const current = entity.battleStat;
        const battleStat = {};
        for (const [statKey, definition] of Object.entries(BATTLE_STAT_DEFINITIONS)) {
            const relevant = scopedModifiers.map((modifier) => ({
                ...modifier,
                stat: entity.attributeToStatKey(modifier.attributeId || modifier.attribute || modifier.stat),
                value: modifier.normalizedValue ?? modifier.value ?? '0'
            }));
            let value = BattleStatCalculator.calculate(current[statKey], relevant, statKey);
            const attribute = this.gameDataManager.getRecord('attributes', definition.attributeId) || {};
            if (attribute.min != null) value = maxBattleFixed(attribute.min, value);
            if (attribute.max != null) value = minBattleFixed(attribute.max, value);
            if (attribute.type === 'INTEGER') value = floorBattleFixed(value);
            battleStat[statKey] = value;
        }
        return Object.freeze({ id: entity.id, battleStat: Object.freeze(battleStat) });
    }

    resolveOffensiveElement(payload) {
        if (payload.action?.element) return this.validateElement(payload.action.element);
        const elementMode = payload.action?.elementMode
            || payload.skill?.elementMode
            || 'FIXED';
        if (elementMode === 'INHERIT_CASTER') {
            return this.validateElement(
                payload.caster?.metadata?.element
                || payload.caster?.metadata?.defensiveElement
                || NEUTRAL
            );
        }
        return this.validateElement(payload.effectElement || payload.skill?.element || NEUTRAL);
    }

    resolveElementWeights(payload) {
        const rawWeights = payload.action?.elementWeights;
        if (!rawWeights || typeof rawWeights !== 'object' || Array.isArray(rawWeights)) return [];
        return Object.entries(rawWeights).map(([elementId, weight]) => ({
            elementId: this.validateElement(elementId),
            weight: Number(weight)
        }));
    }

    resolveDefensiveElement(target) {
        const runtimeOverride = [...(target.effects || [])].reverse()
            .find((effect) => effect.defensiveElement)?.defensiveElement;
        return this.validateElement(runtimeOverride || target.metadata?.defensiveElement || NEUTRAL);
    }

    resolveSpiritRootAffinity(payload, offensiveElement = this.resolveOffensiveElement(payload)) {
        const actionType = payload.action?.type;
        const eligible = Boolean(payload.skill)
            && ['DAMAGE', 'CHAIN_DAMAGE'].includes(actionType)
            && offensiveElement !== NEUTRAL;
        const affinityIds = [...new Set(payload.caster?.metadata?.spiritRootElementIds || [])];
        const affinityPolicy = payload.caster?.metadata?.spiritRootAffinityPolicy || null;
        const universal = eligible
            && affinityPolicy?.mode === 'ALL_NON_NEUTRAL_ELEMENTS';
        const matched = eligible && (universal || affinityIds.includes(offensiveElement));
        const actionEffects = payload.caster?.metadata?.spiritRootActionEffects || [];
        const effects = actionEffects.filter((effect) => (
            effect.predicate === 'ACTION_ELEMENT_MATCHES_SOURCE_AFFINITY' && matched
        ));
        const counterEffects = actionEffects.filter((effect) => (
            effect.predicate === 'ACTION_ELEMENT_COUNTERS_TARGET' && universal
        ));
        let bonusRate = '0';
        for (const effect of effects) {
            if (effect.mode !== 'add_percent_base') {
                throw new Error(`SPIRIT_ROOT_AFFINITY_MODIFIER_MODE_UNSUPPORTED:${effect.modifierId}`);
            }
            bonusRate = addBattleFixed(bonusRate, effect.value || 0);
        }
        let counterBonusRate = '0';
        for (const effect of counterEffects) {
            if (effect.mode !== 'add_percent_base') {
                throw new Error(`SPIRIT_ROOT_AFFINITY_MODIFIER_MODE_UNSUPPORTED:${effect.modifierId}`);
            }
            counterBonusRate = addBattleFixed(counterBonusRate, effect.value || 0);
        }
        const applied = matched && compareBattleFixed(bonusRate, 0) > 0;

        return Object.freeze({
            applied,
            elementId: offensiveElement,
            affinityMode: universal ? affinityPolicy.mode : 'MATCHED_ELEMENT',
            qualityTierId: payload.caster?.metadata?.spiritRootQualityTierId || null,
            bonusRate,
            multiplier: applied ? addBattleFixed(1, bonusRate) : '1',
            counterBonusRate,
            counterEffectIds: Object.freeze(counterEffects.map((effect) => effect.effectId)),
            effectIds: Object.freeze(effects.map((effect) => effect.effectId))
        });
    }

    resolveTargetSpiritRootAffinity(affinity, relations = []) {
        if (!affinity) return null;
        const counterRelationIds = relations
            .filter((relation) => relation.relationType === 'COUNTER')
            .map((relation) => relation.id);
        const counterTriggered = counterRelationIds.length > 0
            && compareBattleFixed(affinity.counterBonusRate || 0, 0) > 0;
        const bonusRate = affinity.bonusRate;
        const appliedCounterBonusRate = counterTriggered
            ? affinity.counterBonusRate
            : '0';
        const effectIds = counterTriggered
            ? [...affinity.effectIds, ...(affinity.counterEffectIds || [])]
            : [...affinity.effectIds];
        return Object.freeze({
            ...affinity,
            applied: compareBattleFixed(bonusRate, 0) > 0
                || compareBattleFixed(appliedCounterBonusRate, 0) > 0,
            bonusRate,
            multiplier: compareBattleFixed(bonusRate, 0) > 0
                ? addBattleFixed(1, bonusRate)
                : '1',
            appliedCounterBonusRate,
            counterMultiplier: compareBattleFixed(appliedCounterBonusRate, 0) > 0
                ? addBattleFixed(1, appliedCounterBonusRate)
                : '1',
            counterTriggered,
            counterRelationIds: Object.freeze(counterRelationIds),
            effectIds: Object.freeze(effectIds)
        });
    }

    validateElement(elementId) {
        if (elementId === NEUTRAL) return NEUTRAL;
        this.gameDataManager.requireRecord('elements', elementId);
        return elementId;
    }

    cleanup(scope) {
        if (!scope) return;
        scope.instances.splice(0);
        scope.targetContexts.clear();
        for (const component of scope.elementComponents || []) {
            component.targetContexts.clear();
            component.snapshots.splice(0);
        }
        this.activeScopes.delete(scope);
    }

    get activeScopeCount() {
        return this.activeScopes.size;
    }
}

function offensiveElementIsNeutral(offensiveElement, defensiveElement) {
    return offensiveElement === NEUTRAL || defensiveElement === NEUTRAL;
}
