import Player from '../../core/Player.js';
import SystemTimeProvider from '../../platform/time/SystemTimeProvider.js';
import { compareDecimal } from '../../shared/numeric/FixedDecimal.js';
import { createLegacyPlayerSnapshot } from './createLegacyPlayerSnapshot.js';

const DIRECT_UNIT_OF_WORK = Object.freeze({
    execute: (work) => work(null)
});

export default class CultivationService {
    constructor(options = {}) {
        this.playerRuntimeRepository = options.playerRuntimeRepository;
        this.unitOfWork = options.unitOfWork || DIRECT_UNIT_OF_WORK;
        this.timeProvider = options.timeProvider || new SystemTimeProvider();
    }

    async collectOfflineCultivation(playerId) {
        return this.unitOfWork.execute(async (client) => {
            const runtimePlayer = await this.playerRuntimeRepository.findById(playerId, {
                client,
                forUpdate: Boolean(client)
            });
            if (!runtimePlayer) {
                return null;
            }

            const { player, afkData } = await this.settleRuntimePlayer(
                playerId,
                runtimePlayer,
                { client }
            );

            return {
                runtimePlayer,
                player,
                afkData,
                earnedCultivation: compareDecimal(afkData.earned, 0) > 0
            };
        });
    }

    async settleRuntimePlayer(playerId, runtimePlayer, options = {}) {
        const snapshot = createLegacyPlayerSnapshot(runtimePlayer);
        const player = new Player(snapshot.playerData);
        const now = options.now || this.timeProvider.now();
        const afkData = player.calculateOfflineCultivation(now);

        if (afkData.seconds > 0) {
            await this.playerRuntimeRepository.updateCultivationState(playerId, {
                cultivation: player.cultivation,
                lastCultivateAt: player.lastCultivate
            }, { client: options.client });
        }

        return { player, afkData };
    }
}
