import deepCloneFreeze from '../../shared/object/deepCloneFreeze.js';

/**
 * BattleActionFactory
 *
 * Chuẩn hóa Action từ GameData thành BattleAction dùng trong Battle.
 *
 * Factory này KHÔNG chứa gameplay.
 * Chỉ normalize dữ liệu và gán giá trị mặc định.
 */
export default class BattleActionFactory {

    /**
     * @param {Object} action
     * @param {Object} options
     * @returns {Object}
     */
    create(action = {}, options = {}) {

        if (!action.type) {
            throw new Error("BattleActionFactory: action.type is required.");
        }

        if (typeof action.id !== 'string' || !action.id.trim()) {
            throw new Error('BATTLE_ACTION_ID_REQUIRED');
        }

        if (!Number.isSafeInteger(action.order) || action.order < 1) {
            throw new Error(`BATTLE_ACTION_ORDER_INVALID:${action.id}`);
        }

        const defaultTarget = options.defaultTarget ?? {
            team: "ENEMY",
            scope: "SINGLE"
        };

        const defaultArguments = {
            DAMAGE_RATE: 1,
            HEAL_RATE: 1,
            SHIELD_RATE: 1,
            ...(options.defaultArguments ?? {})
        };

        return deepCloneFreeze({
            id: action.id,

            order: action.order,

            type: action.type,

            target: action.target ?? defaultTarget,

            element: action.element ?? null,

            elementMode: action.elementMode ?? null,

            elementWeights: action.elementWeights ?? null,

            chance: action.chance ?? 100,

            chanceByVariant: action.chanceByVariant
                ? { ...action.chanceByVariant }
                : null,

            conditionId: action.conditionId ?? null,

            formulaId: action.formulaId ?? null,

            effectId: action.effectId ?? null,

            modifierId: action.modifierId ?? null,

            arguments: {
                ...defaultArguments,
                ...(action.arguments ?? {})
            }
        });
    }

    /**
     * @param {Array<Object>} actions
     * @param {Object} options
     * @returns {Array<Object>}
     */
    createMany(actions = [], options = {}) {

        if (!Array.isArray(actions)) {
            return [];
        }

        return Object.freeze(actions.map(action => this.create(action, options)));

    }

}
