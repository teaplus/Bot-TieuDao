export default class SpiritRootRoller {
    constructor(options = {}) {
        if (!options.gameDataManager) throw new Error('SPIRIT_ROOT_GAME_DATA_REQUIRED');
        this.gameDataManager = options.gameDataManager;
        this.random = options.random || Math.random;
    }

    roll(options = {}) {
        const weightedRoots = this.getWeightedRoots(options);
        const totalWeight = weightedRoots.reduce(
            (total, entry) => total + entry.weight,
            0
        );
        if (weightedRoots.length === 0 || !Number.isFinite(totalWeight) || totalWeight <= 0) {
            throw new Error('SPIRIT_ROOT_DATA_UNAVAILABLE');
        }

        const randomValue = Number(this.random());
        if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
            throw new Error('SPIRIT_ROOT_RANDOM_INVALID');
        }
        let roll = randomValue * totalWeight;
        for (const entry of weightedRoots) {
            roll -= entry.weight;
            if (roll < 0) return entry.spiritRoot;
        }

        return weightedRoots.at(-1).spiritRoot;
    }

    getWeightedRoots(options = {}) {
        const spiritRoots = this.gameDataManager.getCollection('spiritRoots') || {};
        const bracket = options.poolId == null
            ? null
            : this.resolveTemplateBracket(options.poolId, options.rebirthCount);
        const entries = bracket?.entries || Object.values(spiritRoots).map((spiritRoot) => ({
            spiritRootId: spiritRoot.id,
            weight: spiritRoot.rollWeight
        }));
        return entries
            .filter((entry) => entry.weight > 0)
            .map((entry) => Object.freeze({
                spiritRoot: this.gameDataManager.requireRecord(
                    'spiritRoots',
                    entry.spiritRootId
                ),
                weight: entry.weight
            }));
    }

    resolveTemplateBracket(poolId, rebirthCount) {
        const pool = this.gameDataManager.requireRecord('spiritRootRerollPools', poolId);
        if (pool.templateWeightSource !== 'REBIRTH_BRACKETS') return null;
        const count = BigInt(rebirthCount ?? 0);
        return [...(pool.templateWeightBrackets || [])]
            .sort((left, right) => (
                BigInt(left.minRebirthCount) < BigInt(right.minRebirthCount) ? -1 : 1
            ))
            .find((bracket) => (
                count >= BigInt(bracket.minRebirthCount)
                && (bracket.maxRebirthCount == null
                    || count <= BigInt(bracket.maxRebirthCount))
            )) || null;
    }
}
