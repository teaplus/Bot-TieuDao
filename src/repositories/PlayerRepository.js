import PlayerRuntimeRepository from './PlayerRuntimeRepository.js';
import { createLegacyPlayerSnapshot } from '../gameplay/player/createLegacyPlayerSnapshot.js';

// LEGACY compatibility facade. Persistence routing remains owned by PlayerRuntimeRepository.
export default class PlayerRepository {
    static async findById(playerId) {
        const runtimePlayer = await new PlayerRuntimeRepository().findById(playerId);
        if (!runtimePlayer) return null;

        const snapshot = createLegacyPlayerSnapshot(runtimePlayer);
        return {
            data: snapshot.playerData,
            inventory: snapshot.inventoryItems,
            skills: snapshot.skills
        };
    }
}
