import { isBattleTiming } from './BattleTimings.js';
import { rollBattleProbability } from '../numeric/BattleFixed.js';

export default class BattleTriggerDispatcher {
    constructor(options = {}) {
        this.actionExecutor = options.actionExecutor || null;
        this.effectEngine = options.effectEngine || null;
        this.targetSelector = options.targetSelector || null;
        this.random = options.random || Math.random;
        this.conditionTargetFilter = options.conditionTargetFilter || null;
        this.actionPipeline = options.actionPipeline || null;
    }

    dispatch(context, timing, payload = {}) {
        if (!isBattleTiming(timing)) {
            throw new Error(`INVALID_BATTLE_TIMING:${timing}`);
        }

        const event = context.enqueueEvent({
            type: 'BATTLE_TRIGGER',
            timing,
            ...payload
        });

        this.executeHooks(context, timing, payload);
        return event;
    }

    executeHooks(context, timing, payload = {}) {
        if (!this.actionExecutor || !this.effectEngine) {
            return [];
        }

        if (timing === 'TURN_START' || timing === 'TURN_END') {
            return [];
        }

        const results = [];

        for (const owner of context.getAllEntities()) {
            for (const effect of [...(owner.effects || [])]) {
                const effectDefinition = this.effectEngine.getEffectDefinition(effect.id) || effect;
                const matchingEvents = (effectDefinition.events || effect.events || [])
                    .filter((event) => event.event === timing);

                if (!matchingEvents.length) {
                    continue;
                }

                const actor = this.resolveEffectActor(context, owner, effect);
                const effectActions = effect.actions || effectDefinition.actions || [];

                for (const eventDefinition of matchingEvents) {
                    const payloadTarget = this.resolvePayloadTarget(context, payload);
                    if (
                        this.conditionTargetFilter
                        && !this.conditionTargetFilter.evaluateEvent(eventDefinition, owner, payloadTarget)
                    ) {
                        continue;
                    }
                    if (!this.shouldTrigger(eventDefinition)) {
                        continue;
                    }

                    for (const action of effectActions) {
                        const candidates = this.resolveActionTargets(context, owner, payload, action);
                        if (this.actionPipeline) {
                            const execution = this.actionPipeline.executeResolved({
                                battleContext: context,
                                caster: actor,
                                action,
                                candidates,
                                effectId: effect.id,
                                effectElement: effectDefinition.element || null
                            });
                            if (execution.actionResult) {
                                results.push(execution.actionResult);
                            }
                            continue;
                        }
                        const conditionResult = this.conditionTargetFilter
                            ? this.conditionTargetFilter.filter(action, actor, candidates)
                            : { targets: candidates, rejectedTargetIds: [] };
                        if (!conditionResult.targets.length) {
                            if (candidates.length > 0) {
                                context.enqueueEvent({
                                    type: 'ACTION_SKIPPED_CONDITION',
                                    actorId: actor.id,
                                    effectId: effect.id,
                                    actionType: action.type,
                                    conditionId: action.conditionId,
                                    rejectedTargetIds: conditionResult.rejectedTargetIds
                                });
                            }
                            continue;
                        }

                        results.push(this.actionExecutor.execute(context, actor, action, conditionResult.targets));
                    }
                }
            }
        }

        return results;
    }

    shouldTrigger(eventDefinition = {}) {
        return rollBattleProbability(eventDefinition.chance ?? 100, this.random);
    }

    resolveEffectActor(context, owner, effect) {
        return context.getAllEntities().find((entity) => entity.id === effect.source) || owner;
    }

    resolveActionTargets(context, owner, payload, action) {
        const strategy = action.target || action.arguments?.target || 'SELF';

        if (strategy === 'SELF' || strategy === 'OWNER' || strategy === 'CASTER') {
            return [owner];
        }

        if (strategy === 'TARGET') {
            const payloadTarget = this.resolvePayloadTarget(context, payload);
            return payloadTarget ? [payloadTarget] : [owner];
        }

        if (!this.targetSelector) {
            return [];
        }

        return this.targetSelector.select(context, owner, strategy);
    }

    resolvePayloadTarget(context, payload = {}) {
        const targetId = payload.targetId
            || payload.result?.targetId
            || payload.result?.target?.id
            || null;

        return context.getAllEntities().find((entity) => entity.id === targetId) || null;
    }
}
