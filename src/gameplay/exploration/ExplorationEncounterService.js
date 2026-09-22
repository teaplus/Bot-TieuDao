import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import createSeededRandom from '../../platform/random/createSeededRandom.js';

export default class ExplorationEncounterService {
    constructor(options = {}) {
        this.gameDataManager = options.gameDataManager || getGameDataManager();
    }

    select(seed) {
        const policy = this.gameDataManager.getCollection('shopRules').explorationEncounter;
        const random = createSeededRandom(seed);
        const total = policy.entries.reduce((sum, entry) => sum + entry.weight, 0);
        let cursor = random() * total;
        const selected = policy.entries.find((entry) => {
            cursor -= entry.weight;
            return cursor < 0;
        }) || policy.entries.at(-1);
        return Object.freeze({
            type: selected.type,
            seed: Number(seed),
            rulesRevision: policy.revision
        });
    }
}
