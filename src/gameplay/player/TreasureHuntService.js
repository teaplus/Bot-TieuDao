import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import RewardRuntimeService from '../rewards/RewardRuntimeService.js';
import BattleEntityFactory from '../../runtime/battle/BattleEntityFactory.js';

export default class TreasureHuntService {
    constructor(options = {}) {
        this.playerRuntimeRepository = options.playerRuntimeRepository;
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.battleEntityFactory = options.battleEntityFactory || new BattleEntityFactory();
        this.rewardRuntimeService = options.rewardRuntimeService || new RewardRuntimeService({
            gameDataManager: this.gameDataManager,
            playerRuntimeRepository: this.playerRuntimeRepository,
            rewardTableService: options.rewardTableService,
            rewardApplyService: options.rewardApplyService,
            unitOfWork: options.unitOfWork,
            idempotencyRepository: options.idempotencyRepository,
            operationExecutor: options.operationExecutor,
            activityRunRepository: options.activityRunRepository,
            rewardClaimRepository: options.rewardClaimRepository,
            random: options.random || Math.random
        });
    }

    async hunt(playerId, options = {}) {
        const runtimePlayer = await this.playerRuntimeRepository.findById(playerId);
        if (!runtimePlayer) {
            throw new Error('PLAYER_NOT_FOUND');
        }

        const config = this.gameDataManager.getCollection('treasureHunt');
        const playerEntity = this.battleEntityFactory.createFromRuntimePlayer(
            runtimePlayer,
            { team: 'A' }
        );
        const progress = await this.playerRuntimeRepository.recordTreasureHuntCompletion(playerId, {
            cooldownSeconds: config.cooldown_seconds,
            completedAt: new Date()
        });
        const reward = await this.rewardRuntimeService.settle(playerId, config.rewardTableId, {
            realmId: runtimePlayer.realmId,
            spiritualRoot: runtimePlayer.spiritualRoot,
            luck: Number(playerEntity.battleStat.luck || 0)
        }, {
            operationId: options.operationId,
            operationType: 'TREASURE_HUNT_REWARD',
            rewardSource: config.rewardTableId,
            activityType: 'TREASURE_HUNT',
            contentId: 'TREASURE_HUNT'
        });

        return {
            status: 'COMPLETED',
            playerId,
            rewardTableId: config.rewardTableId,
            reward,
            progress
        };
    }
}
