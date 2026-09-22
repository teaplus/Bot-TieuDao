export const CONTROL_DIRECTIVES = Object.freeze({
    NORMAL_ACTION: 'NORMAL_ACTION',
    BASIC_ATTACK_ONLY: 'BASIC_ATTACK_ONLY',
    SKIP_ACTION: 'SKIP_ACTION'
});

const DIRECTIVE_PRIORITY = Object.freeze({
    [CONTROL_DIRECTIVES.NORMAL_ACTION]: 0,
    [CONTROL_DIRECTIVES.BASIC_ATTACK_ONLY]: 1,
    [CONTROL_DIRECTIVES.SKIP_ACTION]: 2
});

export default class ControlDirectiveResolver {
    resolve(entity) {
        return (entity.effects || []).reduce((resolved, effect) => {
            const directive = effect.controlDirective || CONTROL_DIRECTIVES.NORMAL_ACTION;
            return (DIRECTIVE_PRIORITY[directive] || 0) > (DIRECTIVE_PRIORITY[resolved] || 0)
                ? directive
                : resolved;
        }, CONTROL_DIRECTIVES.NORMAL_ACTION);
    }
}
