import ConditionEvaluator from './ConditionEvaluator.js';

export default class ConditionTargetFilter {
    constructor(options = {}) {
        this.conditionEvaluator = options.conditionEvaluator || new ConditionEvaluator(options);
    }

    filter(action, self, targets = []) {
        const candidates = (targets || []).filter(Boolean);
        if (!action.conditionId) {
            return {
                targets: candidates,
                rejectedTargetIds: []
            };
        }

        const accepted = [];
        const rejectedTargetIds = [];
        for (const target of candidates) {
            if (this.conditionEvaluator.evaluate(action.conditionId, { self, target })) {
                accepted.push(target);
            } else {
                rejectedTargetIds.push(target.id);
            }
        }

        return { targets: accepted, rejectedTargetIds };
    }

    evaluateEvent(eventDefinition, self, target = null) {
        if (!eventDefinition.conditionId) {
            return true;
        }
        return this.conditionEvaluator.evaluate(eventDefinition.conditionId, { self, target });
    }
}
