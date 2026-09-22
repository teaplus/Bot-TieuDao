export default class ChainTargetExpander {
    constructor(options = {}) {
        this.random = options.random || Math.random;
    }

    expand(context, actor, action, initialTargets = []) {
        const actionArguments = action.arguments || {};
        const maxTargets = Math.max(1, Number(actionArguments.maxTargets || 3));
        const selectedTargets = initialTargets.filter((target) => target.alive).slice(0, 1);
        const candidates = context
            .getAliveEntities(context.getOpposingTeam(actor.team))
            .filter((target) => !selectedTargets.some((selected) => selected.id === target.id));

        while (selectedTargets.length < maxTargets && candidates.length > 0) {
            const index = Math.floor(this.random() * candidates.length);
            selectedTargets.push(candidates.splice(index, 1)[0]);
        }
        return selectedTargets;
    }
}
