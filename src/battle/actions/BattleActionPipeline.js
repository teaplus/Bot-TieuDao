import ExecutionContext from '../context/ExecutionContext.js';
import { compareBattleFixed } from '../numeric/BattleFixed.js';
import ChainTargetExpander from '../targeting/ChainTargetExpander.js';
import ActionScopedElementEffectEngine from '../elements/ActionScopedElementEffectEngine.js';
import { BATTLE_TIMINGS } from '../triggers/BattleTimings.js';

export default class BattleActionPipeline {
    constructor(options = {}) {
        this.targetSelector = options.targetSelector;
        this.conditionTargetFilter = options.conditionTargetFilter;
        this.actionExecutor = options.actionExecutor;
        this.triggerDispatcher = options.triggerDispatcher;
        this.passiveSkillEngine = options.passiveSkillEngine || null;
        this.nextExecutionId = 1;
        this.elementEffectEngine = options.elementEffectEngine || new ActionScopedElementEffectEngine(options);
        this.elementEffectEngine.actionPipeline = this;
        const chainTargetExpander = new ChainTargetExpander(options);
        this.targetExpanders = new Map([
            ['CHAIN_DAMAGE', chainTargetExpander.expand.bind(chainTargetExpander)]
        ]);
        for (const [actionType, expander] of Object.entries(options.targetExpanders || {})) {
            this.targetExpanders.set(actionType, expander);
        }
    }

    execute(payload) {
        const strategy = payload.action.target
            || payload.defaultTargetStrategy
            || payload.skill?.target
            || 'ENEMY_SINGLE';
        const candidates = this.targetSelector.select(
            payload.battleContext,
            payload.caster,
            strategy
        );
        return this.executeResolved({ ...payload, candidates });
    }

    executeResolved(payload) {
        payload = {
            ...payload,
            executionId: payload.executionId || `ACTION_EXECUTION:${this.nextExecutionId++}`
        };
        const initialCandidates = (payload.candidates || []).filter((target) => target?.alive);
        const expander = this.targetExpanders.get(payload.action.type);
        const candidates = expander
            ? expander(payload.battleContext, payload.caster, payload.action, initialCandidates)
            : initialCandidates;
        if (candidates.length === 0) {
            this.enqueueSkip(payload, 'NO_TARGET');
            return this.createExecutionContext(payload, [], null, 'NO_TARGET');
        }

        const conditionResult = this.conditionTargetFilter.filter(
            payload.action,
            payload.caster,
            candidates
        );
        if (conditionResult.rejectedTargetIds.length > 0) {
            payload.battleContext.enqueueEvent({
                type: 'ACTION_TARGETS_FILTERED_CONDITION',
                ...this.createEventIdentity(payload),
                conditionId: payload.action.conditionId,
                rejectedTargetIds: conditionResult.rejectedTargetIds
            });
        }
        if (conditionResult.targets.length === 0) {
            this.enqueueSkip(payload, 'CONDITION', {
                conditionId: payload.action.conditionId,
                rejectedTargetIds: conditionResult.rejectedTargetIds
            });
            return this.createExecutionContext(payload, [], null, 'CONDITION');
        }

        this.triggerDispatcher.dispatch(payload.battleContext, BATTLE_TIMINGS.BEFORE_ACTION, {
            ...this.createEventIdentity(payload),
            targetIds: conditionResult.targets.map((target) => target.id)
        });
        let elementScope = null;
        try {
            elementScope = this.elementEffectEngine.activate({
                ...payload,
                targets: conditionResult.targets
            });
            const actionResult = this.actionExecutor.execute(
                payload.battleContext,
                payload.caster,
                payload.action,
                conditionResult.targets,
                {
                    targetContexts: elementScope.targetContexts,
                    spiritRootAffinity: elementScope.spiritRootAffinity,
                    offensiveElement: elementScope.offensiveElement,
                    elementComponents: elementScope.elementComponents || []
                }
            );
            this.dispatchSemanticTriggers(payload, actionResult);
            this.triggerDispatcher.dispatch(payload.battleContext, BATTLE_TIMINGS.AFTER_ACTION, {
                ...this.createEventIdentity(payload),
                targetIds: actionResult.targetIds,
                result: actionResult
            });
            return this.createExecutionContext(
                payload,
                conditionResult.targets,
                actionResult,
                null,
                elementScope
            );
        } finally {
            this.elementEffectEngine.cleanup(elementScope);
        }
    }

    dispatchSemanticTriggers(payload, actionResult) {
        for (const result of actionResult.results || []) {
            const target = payload.battleContext.getAllEntities()
                .find((entity) => entity.id === result.targetId);
            if (!target) {
                continue;
            }

            if (result.type === 'DAMAGE') {
                if (compareBattleFixed(result.applied?.hpDamage || 0, 0) > 0
                    || compareBattleFixed(result.applied?.shieldDamage || 0, 0) > 0) {
                    this.triggerDispatcher.dispatch(payload.battleContext, BATTLE_TIMINGS.ON_HIT, {
                        ...this.createEventIdentity(payload),
                        targetId: target.id,
                        result
                    });
                }
                if (target.alive && compareBattleFixed(result.applied?.hpDamage || 0, 0) > 0) {
                    this.passiveSkillEngine?.afterDamage(payload.battleContext, target, result);
                }
                if (result.applied?.defeated) {
                    this.triggerDispatcher.dispatch(payload.battleContext, BATTLE_TIMINGS.ON_DEATH, {
                        ...this.createEventIdentity(payload),
                        targetId: target.id,
                        result
                    });
                }
                continue;
            }

            if (result.type === 'HEAL' && compareBattleFixed(result.applied?.actualHealing || 0, 0) > 0) {
                this.dispatchResultTiming(payload, BATTLE_TIMINGS.ON_HEAL, target, result);
                continue;
            }
            if (result.type === 'SHIELD' && compareBattleFixed(result.applied?.shield || 0, 0) > 0) {
                this.dispatchResultTiming(payload, BATTLE_TIMINGS.ON_SHIELD, target, result);
                continue;
            }
            if (
                (result.type === 'APPLY_EFFECT' || result.type === 'ADD_EFFECT')
                && result.success
                && result.effect
            ) {
                this.triggerDispatcher.dispatch(payload.battleContext, BATTLE_TIMINGS.ON_EFFECT_APPLIED, {
                    ...this.createEventIdentity(payload),
                    targetId: target.id,
                    effectId: result.effectId,
                    result
                });
            }
        }
    }

    dispatchResultTiming(payload, timing, target, result) {
        this.triggerDispatcher.dispatch(payload.battleContext, timing, {
            ...this.createEventIdentity(payload),
            targetId: target.id,
            result
        });
    }

    enqueueSkip(payload, reason, details = {}) {
        payload.battleContext.enqueueEvent({
            type: reason === 'NO_TARGET' ? 'ACTION_SKIPPED_NO_TARGET' : 'ACTION_SKIPPED_CONDITION',
            ...this.createEventIdentity(payload),
            ...details
        });
    }

    createEventIdentity(payload) {
        return {
            actorId: payload.caster.id,
            skillId: payload.skill?.id || null,
            effectId: payload.effectId || null,
            actionId: payload.action.id || null,
            actionType: payload.action.type,
            actionIndex: Number(payload.actionIndex ?? 0)
        };
    }

    createExecutionContext(payload, targets, actionResult, skipReason, elementScope = null) {
        const formulaResults = (actionResult?.results || [])
            .filter((result) => result.formulaId);
        return new ExecutionContext({
            battleContext: payload.battleContext,
            caster: payload.caster,
            skill: payload.skill || null,
            action: payload.action,
            targets,
            actionIndex: payload.actionIndex,
            currentRound: payload.battleContext.round,
            random: payload.battleContext.random,
            formulaResult: formulaResults.length > 0 ? Object.freeze([...formulaResults]) : null,
            actionResult,
            skipReason,
            executionId: payload.executionId,
            offensiveElement: elementScope?.offensiveElement
                || this.elementEffectEngine.resolveOffensiveElement(payload),
            elementComponents: elementScope?.elementComponents || [],
            spiritRootAffinity: elementScope?.spiritRootAffinity || null,
            elementRelations: elementScope?.snapshots || []
        });
    }
}
