import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import BattleActionFactory from './BattleActionFactory.js';
import deepCloneFreeze from '../../shared/object/deepCloneFreeze.js';

function normalizeTargetStrategy(target) {
    if (typeof target === 'string') return target;
    if (!target) return 'ENEMY_SINGLE';

    const team = String(target.team || 'ENEMY').toUpperCase();
    const scope = String(target.scope || 'SINGLE').toUpperCase();
    if (team === 'SELF') return 'SELF';
    if (team === 'ALLY') return `ALLY_${scope}`;
    return `ENEMY_${scope}`;
}

export default class BattleSkillFactory {
    constructor(options = {}) {
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.actionFactory = options.actionFactory || new BattleActionFactory();
    }

    create(skillId) {
        const template = this.gameDataManager.getRecord('skills', skillId);
        if (!template) return null;

        const defaultTarget = normalizeTargetStrategy(template.combat?.target);
        const actions = this.actionFactory.createMany(template.combat?.actions || [], {
            defaultTarget
        })
            .map((action) => ({
                ...action,
                target: normalizeTargetStrategy(action.target),
                arguments: { ...action.arguments }
            }))
            .sort((left, right) => left.order - right.order);

        return deepCloneFreeze({
            id: template.id,
            name: template.name || template.id,
            displayName: template.name || template.id,
            type: template.type || 'ACTIVE',
            cooldownTurns: Number(template.cooldownTurns || 0),
            trigger: template.trigger || 'TURN_ACTION',
            condition: template.condition || null,
            element: template.combat?.element || template.element || null,
            elementMode: template.combat?.elementMode || template.elementMode || 'FIXED',
            target: defaultTarget,
            tags: [...(template.tags || [])],
            actions
        });
    }
}
