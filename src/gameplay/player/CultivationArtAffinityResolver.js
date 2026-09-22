import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';

const NEUTRAL_ELEMENT = 'NEUTRAL';

function normalize(value) {
    return String(value || '').trim().toUpperCase();
}

export default class CultivationArtAffinityResolver {
    constructor(options = {}) {
        this.gameDataManager = options.gameDataManager || getGameDataManager();
    }

    getArt(artId) {
        return artId ? this.gameDataManager.getRecord('cultivationArts', artId) : null;
    }

    getSpiritRoot(runtimePlayer) {
        return runtimePlayer?.spiritRootId
            ? this.gameDataManager.getRecord('spiritRoots', runtimePlayer.spiritRootId)
            : null;
    }

    isMatching(runtimePlayer, art) {
        const artElement = normalize(art?.element);
        if (!artElement || artElement === NEUTRAL_ELEMENT) return false;
        const spiritRoot = this.getSpiritRoot(runtimePlayer);
        if (!spiritRoot) return false;

        const policy = spiritRoot.affinityPolicy || {};
        if (policy.mode === 'ALL_NON_NEUTRAL_ELEMENTS') return true;
        if (policy.mode === 'ALLOWED_ELEMENTS') {
            return (policy.elementIds || []).map(normalize).includes(artElement);
        }
        return (spiritRoot.elementIds || []).map(normalize).includes(artElement);
    }

    getProjection(runtimePlayer, artId = runtimePlayer?.cultivationArtId) {
        const art = this.getArt(artId);
        if (!art) {
            return Object.freeze({
                artId: artId || null,
                matched: false,
                baseBonus: 0,
                affinityBonus: 0,
                totalBonus: 0,
                effects: Object.freeze([])
            });
        }

        const matched = this.isMatching(runtimePlayer, art);
        const baseBonus = Number(art.baseCultivationBonus || 0);
        const affinityBonus = matched ? Number(art.affinityCultivationBonus || 0) : 0;
        const effects = [];
        if (baseBonus > 0) {
            effects.push(Object.freeze({
                stat: 'cultivation_speed',
                mode: 'add_percent_base',
                value: baseBonus,
                source: `cultivation-art-base:${art.id}`
            }));
        }
        if (affinityBonus > 0) {
            effects.push(Object.freeze({
                stat: 'cultivation_speed',
                mode: 'add_percent_base',
                value: affinityBonus,
                source: `cultivation-art-affinity:${art.id}:${runtimePlayer.spiritRootId}`
            }));
        }

        return Object.freeze({
            artId: art.id,
            artElement: art.element || null,
            spiritRootId: runtimePlayer?.spiritRootId || null,
            matched,
            baseBonus,
            affinityBonus,
            totalBonus: baseBonus + affinityBonus,
            effects: Object.freeze(effects)
        });
    }

    getEffects(runtimePlayer, artId = runtimePlayer?.cultivationArtId) {
        return this.getProjection(runtimePlayer, artId).effects;
    }
}
