import GameDataLoader from './GameDataLoader.js';
import GameDataValidator from './GameDataValidator.js';
import GameDataManager from './GameDataManager.js';

export function bootstrapGameData(options = {}) {
    const loader = options.loader || new GameDataLoader(options);
    const validator = options.validator || new GameDataValidator();

    const { gameData, metadata } = loader.loadAll();
    validator.validateAll(gameData);

    return new GameDataManager(gameData, metadata);
}
