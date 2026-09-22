import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import { compareBattleFixed, divideBattleFixed, multiplyBattleFixed } from '../numeric/BattleFixed.js';

const NUMERIC_OPERATORS = Object.freeze({
    LT: (result) => result < 0,
    LTE: (result) => result <= 0,
    GT: (result) => result > 0,
    GTE: (result) => result >= 0,
    EQ: (result) => result === 0
});

export default class ConditionEvaluator {
    constructor(options = {}) {
        this.gameDataManager = options.gameDataManager || getGameDataManager();
    }

    evaluate(conditionId, execution = {}) {
        const condition = this.gameDataManager.getRecord('conditions', conditionId);
        if (!condition) {
            throw new Error(`CONDITION_NOT_FOUND:${conditionId}`);
        }
        return this.evaluateNode(condition.root, execution);
    }

    evaluateNode(node, execution) {
        if (node.type === 'GROUP') {
            const results = node.children.map((child) => this.evaluateNode(child, execution));
            return node.operator === 'ALL'
                ? results.every(Boolean)
                : results.some(Boolean);
        }

        const subject = this.resolveSubject(node.subject, execution);
        switch (node.predicate) {
            case 'HP_PERCENT':
                return this.compareNumber(this.getHpPercent(subject), node.operator, node.value);
            case 'HAS_EFFECT':
                return this.compareBoolean(
                    subject.effects.some((effect) => effect.id === node.arguments.effectId),
                    node.operator,
                    node.value
                );
            case 'IS_ALIVE':
                return this.compareBoolean(subject.alive, node.operator, node.value);
            default:
                throw new Error(`CONDITION_PREDICATE_UNSUPPORTED:${node.predicate}`);
        }
    }

    resolveSubject(subject, execution) {
        const entity = subject === 'SELF' ? execution.self : execution.target;
        if (!entity) {
            throw new Error(`CONDITION_SUBJECT_UNAVAILABLE:${subject}`);
        }
        return entity;
    }

    getHpPercent(entity) {
        return compareBattleFixed(entity.battleStat.hp, 0) > 0
            ? multiplyBattleFixed(divideBattleFixed(entity.currentHP, entity.battleStat.hp), 100)
            : '0';
    }

    compareNumber(left, operator, right) {
        const comparator = NUMERIC_OPERATORS[operator];
        if (!comparator) {
            throw new Error(`CONDITION_OPERATOR_UNSUPPORTED:${operator}`);
        }
        return comparator(compareBattleFixed(left, right));
    }

    compareBoolean(left, operator, right) {
        if (operator !== 'IS') {
            throw new Error(`CONDITION_OPERATOR_UNSUPPORTED:${operator}`);
        }
        return Boolean(left) === Boolean(right);
    }
}
