import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import ActionExecutor from '../actions/ActionExecutor.js';

export default class EffectEngine {
    constructor(options = {}) {
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.actionExecutor = options.actionExecutor || new ActionExecutor(options);
        this.targetSelector = options.targetSelector || null;
        this.conditionTargetFilter = options.conditionTargetFilter || null;
        this.actionPipeline = options.actionPipeline || null;
    }

    applyEffect(context, target, effectId, source = null, options = {}) {
        const definition = this.getEffectDefinition(effectId);
        if (!definition) {
            throw new Error(`EFFECT_NOT_FOUND:${effectId}`);
        }

        if (definition.type === 'INSTANT') {
            return this.executeInstantEffect(context, target, definition, source);
        }

        const existingEffect = target.effects.find((effect) => effect.id === effectId);
        if (existingEffect && definition.stackable) {
            existingEffect.stack = Math.min(
                definition.maxStack || Number.MAX_SAFE_INTEGER,
                Number(existingEffect.stack || 1) + Number(options.stack || 1)
            );
            existingEffect.remainingTurns = options.duration || definition.duration || existingEffect.remainingTurns || null;
            return existingEffect;
        }

        if (existingEffect && !definition.stackable) {
            existingEffect.remainingTurns = options.duration || definition.duration || existingEffect.remainingTurns || null;
            existingEffect.source = source?.id || source || existingEffect.source || null;
            return existingEffect;
        }

        const effect = {
            id: effectId,
            name: definition.displayName || definition.name || effectId,
            category: definition.tags?.[0] || definition.category || 'SPECIAL',
            tags: definition.tags || [],
            source: source?.id || source || null,
            stack: Number(options.stack || 1),
            remainingTurns: options.duration || definition.duration || null,
            controlDirective: definition.controlDirective || null,
            defensiveElement: definition.defensiveElement || null,
            tick: this.getTickTiming(definition),
            events: definition.events || [],
            actions: definition.actions || []
        };

        const appliedEffect = target.addEffect(effect);
        context.enqueueEvent({
            type: 'EFFECT_APPLIED',
            targetId: target.id,
            effect: appliedEffect
        });
        return appliedEffect;
    }

    executeInstantEffect(context, target, definition, source = null) {
        const actor = this.resolveSourceEntity(context, target, source);
        const actionResults = (definition.actions || []).map((action) => {
            const candidates = this.resolveInstantTargets(context, actor, target, action);
            return this.executeConditionedAction(context, actor, action, candidates, definition.id, definition.element);
        }).filter(Boolean);
        const effect = {
            id: definition.id,
            name: definition.displayName || definition.name || definition.id,
            type: definition.type,
            transient: true,
            source: actor.id,
            targetId: target.id,
            actionResults
        };

        context.enqueueEvent({
            type: 'EFFECT_TRIGGERED',
            targetId: target.id,
            effect
        });
        return effect;
    }

    resolveInstantTargets(context, actor, owner, action) {
        const strategy = action.target || action.arguments?.target || 'SELF';
        if (strategy === 'SELF' || strategy === 'OWNER' || strategy === 'TARGET') {
            return owner.alive ? [owner] : [];
        }
        if (strategy === 'CASTER') {
            return actor.alive ? [actor] : [];
        }
        if (!this.targetSelector) {
            throw new Error(`INSTANT_EFFECT_TARGET_SELECTOR_REQUIRED:${strategy}`);
        }
        return this.targetSelector.select(context, actor, strategy);
    }

    resolveSourceEntity(context, target, source) {
        const sourceId = source?.id || source || null;
        return context.getAllEntities().find((entity) => entity.id === sourceId) || target;
    }

    removeEffect(context, target, effectId) {
        const removedCount = target.removeEffect(effectId);
        if (removedCount > 0) {
            context.enqueueEvent({
                type: 'EFFECT_REMOVED',
                targetId: target.id,
                effectId,
                removedCount
            });
        }

        return removedCount;
    }

    tickEffects(context, target, timing) {
        const results = [];

        for (const effect of [...target.effects]) {
            if (effect.tick !== timing) {
                continue;
            }

            const tickResults = [];
            for (const action of effect.actions || []) {
                const actionResult = this.executeTickAction(context, target, effect, action);
                if (!actionResult) {
                    continue;
                }
                tickResults.push(actionResult);
                results.push(actionResult);
            }

            const summary = this.summarizeActionResults(tickResults);
            if (this.hasVisibleSummary(summary)) {
                const actor = this.resolveEffectActor(context, target, effect);
                context.log(`${target.name} suffers ${effect.name}`, {
                    type: 'EFFECT_TICK',
                    effectId: effect.id,
                    effectName: effect.name,
                    actorId: actor.id,
                    actorName: actor.name,
                    targetId: target.id,
                    targetName: target.name,
                    timing,
                    summary
                });
            }
        }

        return results;
    }

    expireEffects(context, target) {
        const expiredEffects = [];

        for (const effect of [...target.effects]) {
            if (effect.remainingTurns == null) {
                continue;
            }

            effect.remainingTurns -= 1;
            if (effect.remainingTurns <= 0) {
                target.removeEffect(effect.id);
                expiredEffects.push(effect);
                context.enqueueEvent({
                    type: 'EFFECT_EXPIRED',
                    targetId: target.id,
                    effectId: effect.id
                });
            }
        }

        return expiredEffects;
    }

    executeTickAction(context, target, effect, action) {
        const tickAction = this.mapTickAction(target, effect, action);
        const actor = this.resolveEffectActor(context, target, effect);
        const definition = this.getEffectDefinition(effect.id) || effect;
        const candidates = this.resolveInstantTargets(context, actor, target, tickAction);
        return this.executeConditionedAction(context, actor, tickAction, candidates, effect.id, definition.element);
    }

    executeConditionedAction(context, actor, action, candidates, effectId, effectElement = null) {
        if (this.actionPipeline) {
            return this.actionPipeline.executeResolved({
                battleContext: context,
                caster: actor,
                action,
                candidates,
                effectId,
                effectElement
            }).actionResult;
        }
        const conditionResult = this.conditionTargetFilter
            ? this.conditionTargetFilter.filter(action, actor, candidates)
            : { targets: candidates, rejectedTargetIds: [] };
        if (conditionResult.targets.length === 0) {
            context.enqueueEvent({
                type: 'ACTION_SKIPPED_CONDITION',
                actorId: actor.id,
                effectId,
                actionType: action.type,
                conditionId: action.conditionId,
                rejectedTargetIds: conditionResult.rejectedTargetIds
            });
            return null;
        }
        return this.actionExecutor.execute(context, actor, action, conditionResult.targets);
    }

    mapTickAction(target, effect, action) {
        return {
            ...action,
            arguments: {
                ...(action.arguments || {}),
                STACK: Number(effect.stack || 1)
            }
        };
    }

    getEffectDefinition(effectId) {
        return this.gameDataManager.getRecord('coreEffects', effectId)
            || this.gameDataManager.getRecord('effects', effectId);
    }

    getTickTiming(effectDefinition) {
        const timedEvent = (effectDefinition.events || [])
            .find((event) => event.event === 'TURN_START' || event.event === 'TURN_END');

        return timedEvent?.event || effectDefinition.tick || null;
    }

    resolveEffectActor(context, target, effect) {
        return this.resolveSourceEntity(context, target, effect.source);
    }

    summarizeActionResults(actionResults = []) {
        const summary = {
            damage: [],
            healing: [],
            shields: [],
            effects: [],
            modifiers: [],
            dispels: [],
            unsupported: []
        };

        for (const actionResult of actionResults) {
            for (const result of actionResult.results || []) {
                if (result.type === 'DAMAGE') {
                    summary.damage.push({
                        targetId: result.targetId,
                        amount: result.amount,
                        critical: Boolean(result.critical),
                        applied: result.applied || null,
                        formulaId: result.formulaId || null
                    });
                    continue;
                }

                if (result.type === 'HEAL') {
                    summary.healing.push({
                        targetId: result.targetId,
                        amount: result.amount,
                        applied: result.applied || null,
                        blocked: Boolean(result.applied?.blocked),
                        blockedByEffectId: result.applied?.blockedByEffectId || null,
                        formulaId: result.formulaId || null
                    });
                    continue;
                }

                if (result.type === 'SHIELD') {
                    summary.shields.push({
                        targetId: result.targetId,
                        amount: result.amount,
                        applied: result.applied || null,
                        formulaId: result.formulaId || null
                    });
                    continue;
                }

                if (result.type === 'ADD_EFFECT' || result.type === 'APPLY_EFFECT') {
                    summary.effects.push({
                        targetId: result.targetId,
                        effectId: result.effectId,
                        success: result.success
                    });
                    continue;
                }

                if (result.type === 'ADD_MODIFIER') {
                    summary.modifiers.push({
                        targetId: result.targetId,
                        modifierId: result.modifierId,
                        success: result.success
                    });
                    continue;
                }

                if (result.type === 'DISPEL') {
                    summary.dispels.push({
                        targetId: result.targetId,
                        success: result.success,
                        removedCount: result.removedCount,
                        removedKind: result.removedKind,
                        removedId: result.removedId
                    });
                    continue;
                }

                if (result.type === 'UNSUPPORTED_ACTION') {
                    summary.unsupported.push(result);
                }
            }
        }

        return summary;
    }

    hasVisibleSummary(summary = {}) {
        return Boolean(
            (summary.damage || []).length
            || (summary.healing || []).length
            || (summary.shields || []).length
            || (summary.effects || []).length
            || (summary.modifiers || []).length
            || (summary.dispels || []).length
            || (summary.unsupported || []).length
        );
    }
}
