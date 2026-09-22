import RewardApplyService from './RewardApplyService.js';
import RewardTableService from './RewardTableService.js';
import ActivityRunRepository from '../../repositories/ActivityRunRepository.js';

export default class RewardRuntimeService {
    constructor(options = {}) {
        this.rewardTableService = options.rewardTableService || new RewardTableService({
            gameDataManager: options.gameDataManager,
            random: options.random || Math.random
        });
        this.rewardApplyService = options.rewardApplyService || new RewardApplyService({
            playerRuntimeRepository: options.playerRuntimeRepository,
            gameDataManager: options.gameDataManager,
            unitOfWork: options.unitOfWork,
            idempotencyRepository: options.idempotencyRepository,
            operationExecutor: options.operationExecutor,
            rewardClaimRepository: options.rewardClaimRepository,
            activityRunRepository: options.activityRunRepository
        });
        this.unitOfWork = options.unitOfWork || null;
        this.activityRunRepository = options.activityRunRepository || new ActivityRunRepository();
    }

    plan(tableId, context = {}) {
        if (!tableId) {
            return {
                status: 'NO_REWARD_TABLE',
                plan: null
            };
        }

        return {
            status: 'PLANNED',
            plan: this.rewardTableService.roll(tableId, context)
        };
    }

    async apply(playerId, rewardPlan, options = {}) {
        if (!rewardPlan) {
            return {
                status: 'NO_REWARD_PLAN',
                applied: null
            };
        }

        return {
            status: 'APPLIED',
            applied: await this.rewardApplyService.apply(playerId, rewardPlan, options)
        };
    }

    async settle(playerId, tableId, context = {}, options = {}) {
        const activityRun = await this.reserveActivityRun(playerId, tableId, context, options);
        const applyOptions = activityRun ? {
            ...options,
            activityRunId: activityRun.runId,
            claimType: options.claimType || options.operationType || options.activityType,
            sourceRef: activityRun.runId,
            businessKey: `${options.claimType || options.operationType || options.activityType}:${activityRun.runId}`,
            retentionPolicy: 'ONE_TIME_CLAIM'
        } : options;
        const plannedReward = this.plan(tableId, context);
        if (!plannedReward.plan) {
            return {
                status: plannedReward.status,
                plan: null,
                applied: null
            };
        }

        if (options.applyRewards === false) {
            return {
                status: plannedReward.status,
                plan: plannedReward.plan,
                applied: null
            };
        }

        const appliedReward = await this.apply(playerId, plannedReward.plan, applyOptions);

        return {
            status: appliedReward.status,
            plan: appliedReward.applied?.rewardPlan || plannedReward.plan,
            applied: appliedReward.applied
        };
    }

    async reserveActivityRun(playerId, tableId, context, options) {
        if (options.applyRewards === false || !tableId) return null;
        if (!options.operationId || !options.activityType) return null;
        if (!options.contentId) throw new Error('ACTIVITY_CONTENT_ID_REQUIRED');
        if (!this.unitOfWork) throw new Error('ACTIVITY_RUN_UNIT_OF_WORK_REQUIRED');

        return this.unitOfWork.execute((client) => this.activityRunRepository.reserve(client, {
            playerId,
            activityType: options.activityType,
            contentId: options.contentId,
            operationId: options.operationId,
            inputSnapshot: context,
            rewardTableId: tableId
        }));
    }
}
