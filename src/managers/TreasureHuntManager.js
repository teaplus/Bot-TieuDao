import { getGameDataManager } from '../foundation/game-data/gameDataContext.js';
import TreasureHuntService from '../gameplay/player/TreasureHuntService.js';
import PlayerRuntimeRepository from '../repositories/PlayerRuntimeRepository.js';

// LEGACY: kept as a compatibility adapter. New flows should inject TreasureHuntService directly.
export default class TreasureHuntManager {
    static async hunt(playerId) {
        const service = new TreasureHuntService({
            playerRuntimeRepository: new PlayerRuntimeRepository(),
            gameDataManager: getGameDataManager()
        });

        return service.hunt(playerId);
    }
}
