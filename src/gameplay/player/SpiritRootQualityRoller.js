import { normalizeIntegerAmount } from '../../shared/numeric/IntegerAmount.js';

export default class SpiritRootQualityRoller {
    constructor(options = {}) {
        if (!options.gameDataManager) throw new Error('SPIRIT_ROOT_GAME_DATA_REQUIRED');
        this.gameDataManager = options.gameDataManager;
        this.random = options.random || Math.random;
    }

    resolveBracket(pool, rebirthCount) {
        const count = BigInt(normalizeIntegerAmount(rebirthCount));
        const brackets = [...(pool?.qualityBrackets || [])]
            .sort((left, right) => (
                BigInt(left.minRebirthCount) < BigInt(right.minRebirthCount) ? -1 : 1
            ));
        return brackets.find((bracket) => (
            count >= BigInt(bracket.minRebirthCount)
            && (bracket.maxRebirthCount == null || count <= BigInt(bracket.maxRebirthCount))
        )) || null;
    }

    roll(poolId, rebirthCount) {
        const pool = this.gameDataManager.requireRecord('spiritRootRerollPools', poolId);
        const bracket = this.resolveBracket(pool, rebirthCount);
        if (!bracket) throw new Error('SPIRIT_ROOT_QUALITY_BRACKET_NOT_FOUND');
        const entries = bracket.entries.filter((entry) => entry.weight > 0);
        const totalWeight = entries.reduce((total, entry) => total + entry.weight, 0);
        if (!entries.length || totalWeight <= 0) throw new Error('SPIRIT_ROOT_QUALITY_POOL_EMPTY');

        const randomValue = Number(this.random());
        if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
            throw new Error('SPIRIT_ROOT_RANDOM_INVALID');
        }
        let cursor = randomValue * totalWeight;
        const selected = entries.find((entry) => {
            cursor -= entry.weight;
            return cursor < 0;
        }) || entries.at(-1);
        const qualityTier = this.gameDataManager.requireRecord(
            'spiritRootQualityTiers',
            selected.qualityTierId
        );
        return Object.freeze({ pool, bracket, entry: selected, qualityTier });
    }
}
