export default class ExecutionContext {
    constructor(payload = {}) {
        this.battleContext = payload.battleContext;
        this.caster = payload.caster;
        this.skill = payload.skill || null;
        this.action = payload.action;
        this.actionId = payload.action?.id || null;
        this.executionId = payload.executionId || null;
        this.targets = Object.freeze([...(payload.targets || [])]);
        this.actionIndex = Number(payload.actionIndex ?? 0);
        this.currentRound = Number(payload.currentRound ?? payload.battleContext?.round ?? 0);
        this.random = payload.random || payload.battleContext?.random || Math.random;
        this.formulaResult = payload.formulaResult || null;
        this.actionResult = payload.actionResult || null;
        this.skipReason = payload.skipReason || null;
        this.offensiveElement = payload.offensiveElement || 'NEUTRAL';
        this.elementComponents = Object.freeze((payload.elementComponents || []).map((component) => Object.freeze({
            elementId: component.elementId,
            weight: component.weight
        })));
        this.spiritRootAffinity = payload.spiritRootAffinity
            ? Object.freeze({
                ...payload.spiritRootAffinity,
                effectIds: Object.freeze([...(payload.spiritRootAffinity.effectIds || [])])
            })
            : null;
        this.elementRelations = Object.freeze((payload.elementRelations || []).map((entry) => Object.freeze({
            ...entry,
            relationIds: Object.freeze([...(entry.relationIds || [])]),
            scopedEffectIds: Object.freeze([...(entry.scopedEffectIds || [])])
        })));
        Object.freeze(this);
    }
}
