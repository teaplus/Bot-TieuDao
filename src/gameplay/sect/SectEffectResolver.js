import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';

export default class SectEffectResolver {
    constructor(options = {}) {
        this.gameDataManager = options.gameDataManager || getGameDataManager();
    }

    getDefinitions(runtimePlayer) {
        if (!runtimePlayer?.sectId) return [];
        const sect = this.gameDataManager.getRecord('sectTemplates', runtimePlayer.sectId);
        return (sect?.effects || []).map((effectId) => (
            this.gameDataManager.requireRecord('coreEffects', effectId)
        ));
    }

    getBattleEffects(runtimePlayer) {
        return this.getDefinitions(runtimePlayer)
            .filter((definition) => definition.scopes?.includes('ENTITY'))
            .flatMap((definition) => {
                const policy = definition.sectPolicy || {};
                const runtimeEffect = {
                    id: definition.id,
                    name: definition.displayName,
                    tags: definition.tags || [],
                    source: `sect:${runtimePlayer.sectId}`,
                    remainingTurns: definition.duration ?? null,
                    tick: (definition.events || []).find((event) => (
                        event.event === 'TURN_START' || event.event === 'TURN_END'
                    ))?.event || null,
                    events: definition.events || [],
                    actions: definition.actions || [],
                    sectPolicy: policy
                };
                if (policy.kind !== 'BATTLE_MODIFIER') return [runtimeEffect];
                const modifier = this.gameDataManager.requireRecord('modifiers', policy.modifierId);
                return [runtimeEffect, {
                    id: `${definition.id}:MODIFIER`,
                    modifierId: modifier.id,
                    stat: modifier.stat,
                    mode: modifier.mode,
                    value: modifier.normalizedValue,
                    source: `sect:${runtimePlayer.sectId}`,
                    passiveStatOnly: true
                }];
            });
    }

    getCultivationEffects(runtimePlayer) {
        return this.getDefinitions(runtimePlayer)
            .filter((definition) => definition.sectPolicy?.kind === 'CULTIVATION_MULTIPLIER')
            .map((definition) => ({
                id: definition.id,
                stat: 'cultivation_speed',
                mode: 'add_percent_base',
                value: Number(definition.sectPolicy.value),
                source: `sect:${runtimePlayer.sectId}`
            }));
    }

    getBreakthroughChanceDelta(runtimePlayer) {
        return this.getDefinitions(runtimePlayer)
            .filter((definition) => definition.sectPolicy?.kind === 'BREAKTHROUGH_CHANCE')
            .reduce((sum, definition) => sum + Number(definition.sectPolicy.percentagePoints || 0), 0);
    }
}
