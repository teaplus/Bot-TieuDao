import BattleSkillFactory from '../factory/BattleSkillFactory.js';
import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import { compareBattleFixed, divideBattleFixed, multiplyBattleFixed, normalizeBattleFixed } from '../numeric/BattleFixed.js';

export default class PassiveSkillEngine {
    constructor(options = {}) {
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.skillFactory = options.skillFactory || new BattleSkillFactory({
            gameDataManager: this.gameDataManager
        });
        this.actionExecutor = options.actionExecutor || null;
        this.targetSelector = options.targetSelector || null;
        this.conditionTargetFilter = options.conditionTargetFilter || null;
        this.actionPipeline = options.actionPipeline || null;
    }

    afterDamage(context, target) {
        if (!target.alive || !this.actionExecutor || !this.targetSelector) {
            return [];
        }

        const triggered = [];
        for (const skillId of target.skills || []) {
            const skill = this.skillFactory.create(skillId);
            if (!this.canTrigger(context, target, skill)) {
                continue;
            }

            context.markSkillTriggered(target.id, skill.id);
            const actionResults = [];
            for (const action of skill.actions) {
                const targets = this.targetSelector.select(
                    context,
                    target,
                    action.target || skill.target || 'SELF'
                );
                if (this.actionPipeline) {
                    const execution = this.actionPipeline.executeResolved({
                        battleContext: context,
                        caster: target,
                        skill,
                        action,
                        actionIndex: actionResults.length,
                        candidates: targets
                    });
                    if (execution.actionResult) {
                        actionResults.push(execution.actionResult);
                    }
                    continue;
                }
                const conditionResult = this.conditionTargetFilter
                    ? this.conditionTargetFilter.filter(action, target, targets)
                    : { targets };
                if (conditionResult.targets.length > 0) {
                    actionResults.push(this.actionExecutor.execute(context, target, action, conditionResult.targets));
                } else if (targets.length > 0) {
                    context.enqueueEvent({
                        type: 'ACTION_SKIPPED_CONDITION',
                        actorId: target.id,
                        skillId: skill.id,
                        actionType: action.type,
                        conditionId: action.conditionId
                    });
                }
            }

            const result = {
                entityId: target.id,
                skillId: skill.id,
                trigger: skill.trigger,
                hpPercent: this.getHpPercent(target),
                actionResults
            };
            context.enqueueEvent({ type: 'PASSIVE_SKILL_TRIGGERED', ...result });
            context.log(`${target.name} triggers ${skill.name}`, result);
            triggered.push(result);
        }

        return triggered;
    }

    canTrigger(context, target, skill) {
        if (!skill || skill.type !== 'PASSIVE' || skill.trigger !== 'HP_BELOW_PERCENT') {
            return false;
        }
        if (context.hasSkillTriggered(target.id, skill.id)) {
            return false;
        }

        const threshold = normalizeBattleFixed(skill.condition?.hpPercent ?? 0);
        return compareBattleFixed(this.getHpPercent(target), threshold) <= 0;
    }

    getHpPercent(entity) {
        return compareBattleFixed(entity.battleStat.hp, 0) > 0
            ? multiplyBattleFixed(divideBattleFixed(entity.currentHP, entity.battleStat.hp), 100)
            : '0';
    }
}
