import ActionExecutor from './actions/ActionExecutor.js';
import BattleContext from './context/BattleContext.js';
import EffectEngine from './effects/EffectEngine.js';
import FormulaEngine from './formulas/FormulaEngine.js';
import BattleResult from './results/BattleResult.js';
import SkillManager from './skills/SkillManager.js';
import PassiveSkillEngine from './skills/PassiveSkillEngine.js';
import TargetSelector from './targeting/TargetSelector.js';
import ControlDirectiveResolver, { CONTROL_DIRECTIVES } from './control/ControlDirectiveResolver.js';
import ConditionTargetFilter from './conditions/ConditionTargetFilter.js';
import BattleActionPipeline from './actions/BattleActionPipeline.js';
import BattleTriggerDispatcher from './triggers/BattleTriggerDispatcher.js';
import { BATTLE_TIMINGS } from './triggers/BattleTimings.js';
import TurnManager from './turns/TurnManager.js';

const DEFAULT_ROUND_LIMIT = 15;

export default class BattleEngine {
    constructor(options = {}) {
        this.random = options.random || Math.random;
        this.maxRounds = Number(
            options.maxRounds
            || options.gameDataManager?.getCollection?.('battleRules')?.roundLimit
            || DEFAULT_ROUND_LIMIT
        );
        this.formulaEngine = options.formulaEngine || new FormulaEngine({ ...options, random: this.random });
        this.triggerDispatcher = options.triggerDispatcher || new BattleTriggerDispatcher(options);
        this.targetSelector = options.targetSelector || new TargetSelector({ ...options, random: this.random });
        this.conditionTargetFilter = options.conditionTargetFilter || new ConditionTargetFilter(options);
        this.effectEngine = options.effectEngine || new EffectEngine({
            ...options,
            random: this.random,
            actionExecutor: null,
            targetSelector: this.targetSelector
        });
        this.actionExecutor = options.actionExecutor || new ActionExecutor({
            ...options,
            random: this.random,
            formulaEngine: this.formulaEngine,
            effectEngine: this.effectEngine
        });
        this.effectEngine.actionExecutor = this.actionExecutor;
        this.effectEngine.targetSelector = this.targetSelector;
        this.effectEngine.conditionTargetFilter = this.conditionTargetFilter;
        this.skillManager = options.skillManager || new SkillManager({ ...options, random: this.random });
        this.passiveSkillEngine = options.passiveSkillEngine || new PassiveSkillEngine({
            ...options,
            actionExecutor: this.actionExecutor,
            targetSelector: this.targetSelector,
            conditionTargetFilter: this.conditionTargetFilter
        });
        this.actionPipeline = options.actionPipeline || new BattleActionPipeline({
            ...options,
            random: this.random,
            targetSelector: this.targetSelector,
            conditionTargetFilter: this.conditionTargetFilter,
            actionExecutor: this.actionExecutor,
            triggerDispatcher: this.triggerDispatcher,
            passiveSkillEngine: this.passiveSkillEngine
        });
        this.effectEngine.actionPipeline = this.actionPipeline;
        this.passiveSkillEngine.conditionTargetFilter = this.conditionTargetFilter;
        this.passiveSkillEngine.actionPipeline = this.actionPipeline;
        this.controlDirectiveResolver = options.controlDirectiveResolver || new ControlDirectiveResolver();
        this.triggerDispatcher.actionExecutor = this.actionExecutor;
        this.triggerDispatcher.effectEngine = this.effectEngine;
        this.triggerDispatcher.targetSelector = this.targetSelector;
        this.triggerDispatcher.conditionTargetFilter = this.conditionTargetFilter;
        this.triggerDispatcher.actionPipeline = this.actionPipeline;
        this.triggerDispatcher.random = this.random;
        this.turnManager = options.turnManager || new TurnManager();
    }

    run(payload = {}) {
        const context = payload instanceof BattleContext
            ? payload
            : new BattleContext({
                battleId: payload.battleId,
                teams: payload.teams,
                random: this.random
            });

        context.log('Battle started', {
            teamA: context.teams.A.map((entity) => entity.id),
            teamB: context.teams.B.map((entity) => entity.id),
            entities: context.getAllEntities().map((entity) => ({
                id: entity.id,
                currentHP: entity.currentHP,
                maxHP: entity.battleStat.hp
            }))
        });
        this.triggerDispatcher.dispatch(context, BATTLE_TIMINGS.BATTLE_START, {
            teamA: context.teams.A.map((entity) => entity.id),
            teamB: context.teams.B.map((entity) => entity.id)
        });
        this.turnManager.buildTurnOrder(context);
        this.triggerDispatcher.dispatch(context, BATTLE_TIMINGS.ROUND_START, {
            round: context.round
        });

        let roundLimitReached = false;
        while (!context.isBattleResolved() && context.round <= this.maxRounds) {
            const actor = this.turnManager.getCurrentEntity(context);

            if (!actor) {
                this.triggerDispatcher.dispatch(context, BATTLE_TIMINGS.ROUND_END, {
                    round: context.round
                });
                if (context.round >= this.maxRounds) {
                    roundLimitReached = true;
                    break;
                }
                context.nextRound();
                this.turnManager.buildTurnOrder(context);
                this.triggerDispatcher.dispatch(context, BATTLE_TIMINGS.ROUND_START, {
                    round: context.round
                });
                continue;
            }

            if (!actor.alive) {
                this.turnManager.advance(context);
                continue;
            }

            this.executeTurn(context, actor);
            if (context.isBattleResolved()) {
                break;
            }

            this.turnManager.advance(context);
        }

        roundLimitReached = !context.getWinningTeam()
            && (roundLimitReached || context.round > this.maxRounds);
        if (roundLimitReached) {
            context.enqueueEvent({
                type: 'BATTLE_ROUND_LIMIT_REACHED',
                maxRounds: this.maxRounds
            });
        }

        context.end();
        context.log('Battle ended', {
            winnerTeam: context.getWinningTeam(),
            outcome: roundLimitReached ? 'DRAW' : null,
            drawReason: roundLimitReached ? 'ROUND_LIMIT' : null,
            maxRounds: this.maxRounds
        });
        this.triggerDispatcher.dispatch(context, BATTLE_TIMINGS.BATTLE_END, {
            winnerTeam: context.getWinningTeam(),
            outcome: roundLimitReached ? 'DRAW' : null,
            drawReason: roundLimitReached ? 'ROUND_LIMIT' : null
        });

        return BattleResult.fromContext(context);
    }

    executeTurn(context, actor) {
        let usedSkillId = null;
        context.metrics.recordTurn(actor);
        this.triggerDispatcher.dispatch(context, BATTLE_TIMINGS.TURN_START, {
            actorId: actor.id
        });
        context.enqueueEvent({
            type: 'TURN_START',
            actorId: actor.id
        });
        this.effectEngine.tickEffects(context, actor, 'TURN_START');

        if (actor.alive) {
            const controlDirective = this.controlDirectiveResolver.resolve(actor);
            context.enqueueEvent({
                type: 'CONTROL_DIRECTIVE_RESOLVED',
                actorId: actor.id,
                directive: controlDirective
            });
            if (controlDirective === CONTROL_DIRECTIVES.SKIP_ACTION) {
                context.metrics.recordActionSkipped(actor);
                context.log(`${actor.name} cannot act`, {
                    actorId: actor.id,
                    directive: controlDirective
                });
            } else {
            const skill = controlDirective === CONTROL_DIRECTIVES.BASIC_ATTACK_ONLY
                ? this.skillManager.createBasicAttack()
                : this.skillManager.selectSkill(actor);
            usedSkillId = skill.id;
            const previewTargetStrategy = skill.target || skill.actions[0]?.target || 'ENEMY_SINGLE';
            const previewTargets = this.targetSelector.select(context, actor, previewTargetStrategy);
            const actionResults = [];

            this.triggerDispatcher.dispatch(context, BATTLE_TIMINGS.ON_ATTACK, {
                actorId: actor.id,
                skillId: skill.id,
                targetIds: previewTargets.map((target) => target.id)
            });

            for (const [actionIndex, action] of skill.actions.entries()) {
                if (context.isBattleResolved()) {
                    break;
                }

                const execution = this.actionPipeline.execute({
                    battleContext: context,
                    caster: actor,
                    skill,
                    action,
                    actionIndex,
                    defaultTargetStrategy: previewTargetStrategy
                });
                if (execution.actionResult) {
                    actionResults.push(execution.actionResult);
                }
            }

            if (actionResults.length > 0) {
                context.metrics.recordActionTaken(actor);
            } else {
                context.metrics.recordActionSkipped(actor);
            }

            const cooldownStarted = typeof this.skillManager.startCooldown === 'function'
                ? this.skillManager.startCooldown(actor, skill)
                : null;
            if (cooldownStarted) {
                context.enqueueEvent({
                    type: 'SKILL_COOLDOWN_STARTED',
                    actorId: actor.id,
                    skillId: skill.id,
                    remainingTurns: cooldownStarted.remainingTurns
                });
            }
            const skillName = skill.name || skill.displayName || skill.id;
            const summary = this.summarizeSkillCast(actionResults, skill.actions);
            if (cooldownStarted) summary.cooldown = cooldownStarted;
            context.log(`${actor.name} uses ${skillName}`, {
                actorId: actor.id,
                actorName: actor.name,
                skillId: skill.id,
                skillName,
                targetIds: previewTargets.map((target) => target.id),
                summary
            });
            }
        }

        this.effectEngine.tickEffects(context, actor, 'TURN_END');
        this.effectEngine.expireEffects(context, actor);
        for (const modifier of actor.expireTimedModifiers()) {
            context.enqueueEvent({
                type: 'MODIFIER_EXPIRED', actorId: actor.id,
                modifierId: modifier.id || modifier.modifierId
            });
        }
        this.triggerDispatcher.dispatch(context, BATTLE_TIMINGS.TURN_END, {
            actorId: actor.id
        });
        const cooldownTransitions = typeof this.skillManager.tickCooldowns === 'function'
            ? this.skillManager.tickCooldowns(actor, {
                excludeSkillIds: usedSkillId && usedSkillId !== 'BASIC_ATTACK' ? [usedSkillId] : []
            })
            : [];
        for (const transition of cooldownTransitions) {
            context.enqueueEvent({
                type: 'SKILL_COOLDOWN_TICK', actorId: actor.id,
                skillId: transition.skillId,
                before: transition.before, after: transition.after
            });
            if (transition.ready) {
                context.enqueueEvent({
                    type: 'SKILL_COOLDOWN_READY', actorId: actor.id,
                    skillId: transition.skillId
                });
            }
        }
        context.enqueueEvent({
            type: 'TURN_END',
            actorId: actor.id
        });
    }

    summarizeSkillCast(actionResults = [], skillActions = []) {
        const summary = {
            actionTypes: [...new Set(skillActions.map((action) => action.type))],
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
                        formulaId: result.formulaId || null,
                        variables: result.variables || null
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
                    const effectDefinition = this.effectEngine.getEffectDefinition(result.effectId);
                    summary.effects.push({
                        targetId: result.targetId,
                        effectId: result.effectId,
                        effectName: effectDefinition?.displayName || effectDefinition?.name || result.effectId,
                        controlDirective: effectDefinition?.controlDirective || null,
                        tags: [...(effectDefinition?.tags || [])],
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
}
