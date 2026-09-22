import { getGameDataManager } from '../foundation/game-data/gameDataContext.js';

export default class PassiveEffectBindingResolver {
    constructor(options = {}) {
        this.gameDataManager = options.gameDataManager || getGameDataManager();
    }

    resolve(effectIds, scope, source) {
        return [...new Set(effectIds || [])].flatMap((effectId) => {
            const effect = this.gameDataManager.requireRecord('coreEffects', effectId);
            return (effect.passiveBindings || [])
                .filter((binding) => binding.scope === scope)
                .map((binding) => {
                    const modifier = this.gameDataManager.requireRecord('modifiers', binding.modifierId);
                    return Object.freeze({
                        id: `${effect.id}:${binding.scope}:${modifier.id}`,
                        effectId: effect.id,
                        modifierId: modifier.id,
                        stat: modifier.stat,
                        mode: modifier.mode,
                        value: binding.value ?? modifier.normalizedValue,
                        predicate: binding.predicate || null,
                        source
                    });
                });
        });
    }
}
