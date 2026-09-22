import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import PassiveEffectBindingResolver from '../../core/PassiveEffectBindingResolver.js';

export default class SpiritRootEffectResolver {
    constructor(options = {}) {
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.passiveBindingResolver = options.passiveBindingResolver
            || new PassiveEffectBindingResolver({ gameDataManager: this.gameDataManager });
    }

    getDefinition(runtimePlayer) {
        return runtimePlayer?.spiritRootId
            ? this.gameDataManager.getRecord('spiritRoots', runtimePlayer.spiritRootId)
            : null;
    }

    getQualityTier(runtimePlayer) {
        return runtimePlayer?.spiritRootQualityTierId
            ? this.gameDataManager.getRecord(
                'spiritRootQualityTiers',
                runtimePlayer.spiritRootQualityTierId
            )
            : null;
    }

    getEffectIds(runtimePlayer) {
        const definition = this.getDefinition(runtimePlayer);
        const qualityTier = this.getQualityTier(runtimePlayer);
        return Object.freeze([...new Set([
            ...(definition?.effectIds || []),
            ...(qualityTier?.effectIds || [])
        ])]);
    }

    getDefinitions(runtimePlayer) {
        return Object.freeze(this.getEffectIds(runtimePlayer)
            .map((effectId) => this.gameDataManager.requireRecord('coreEffects', effectId)));
    }

    getEffects(runtimePlayer, scope) {
        return this.passiveBindingResolver.resolve(
            this.getEffectIds(runtimePlayer),
            scope,
            `spirit-root:${runtimePlayer.spiritRootId}:${runtimePlayer.spiritRootQualityTierId || 'UNASSIGNED'}`
        );
    }

    getCultivationEffects(runtimePlayer) {
        return this.getEffects(runtimePlayer, 'CULTIVATION');
    }

    getBattleEffects(runtimePlayer) {
        return this.getEffects(runtimePlayer, 'ENTITY');
    }

    getActionEffects(runtimePlayer) {
        return this.getEffects(runtimePlayer, 'ACTION');
    }

    getBreakthroughEffects(runtimePlayer) {
        return this.getEffects(runtimePlayer, 'BREAKTHROUGH');
    }

    getAttributeEffects(runtimePlayer) {
        return Object.freeze([
            ...this.getCultivationEffects(runtimePlayer),
            ...this.getBattleEffects(runtimePlayer)
        ]);
    }

    getEffectProjection(runtimePlayer) {
        const scopes = [...new Set(this.getDefinitions(runtimePlayer)
            .flatMap((definition) => definition.passiveBindings || [])
            .map((binding) => binding.scope))];

        return Object.freeze(scopes.flatMap((scope) => (
            this.getEffects(runtimePlayer, scope).map((effect) => Object.freeze({
                scope,
                effectId: effect.effectId,
                modifierId: effect.modifierId,
                stat: effect.stat,
                mode: effect.mode,
                value: effect.value,
                predicate: effect.predicate || null,
                source: effect.source
            }))
        )));
    }
}
