import ItemFactory from '../../factories/ItemFactory.js';
import ItemGenerator from '../../factories/ItemGenerator.js';
import { normalizeIntegerAmount } from '../../shared/numeric/IntegerAmount.js';
import IdempotentOperationExecutor from '../../platform/idempotency/IdempotentOperationExecutor.js';
import { createRequestHash } from '../../platform/idempotency/createRequestHash.js';
import RewardClaimRepository from '../../repositories/RewardClaimRepository.js';
import ActivityRunRepository from '../../repositories/ActivityRunRepository.js';

export default class RewardApplyService {
    constructor(options = {}) {
        this.playerRuntimeRepository = options.playerRuntimeRepository;
        this.gameDataManager = options.gameDataManager;
        this.operationExecutor = options.operationExecutor || new IdempotentOperationExecutor(options);
        this.rewardClaimRepository = options.rewardClaimRepository || new RewardClaimRepository();
        this.activityRunRepository = options.activityRunRepository || new ActivityRunRepository();
    }

    async apply(playerId, rewardPlan, options = {}) {
        if (!options.operationId) throw new Error('REWARD_APPLY_OPERATION_ID_REQUIRED');

        return this.operationExecutor.execute({
            operationId: options.operationId,
            playerId,
            operationType: options.operationType || 'REWARD_APPLY',
            requestHash: createRequestHash({
                operationType: options.operationType || 'REWARD_APPLY',
                playerId,
                rewardSource: options.rewardSource || rewardPlan?.tableId || null,
                activityRunId: options.activityRunId || null
            }),
            businessKey: options.businessKey,
            retentionPolicy: options.retentionPolicy || 'DEFAULT'
        }, (client) => this.applyInTransaction(client, playerId, rewardPlan, options));
    }

    async applyInTransaction(client, playerId, rewardPlan, options = {}) {
        if (!client) throw new Error('REWARD_TRANSACTION_CLIENT_REQUIRED');

        const rewards = rewardPlan?.rewards || [];
        const normalizedRewards = rewards.map((reward) => this.normalizeReward(reward));
        const itemRules = this.gameDataManager?.getCollection('itemRules') || {};
        const claim = options.activityRunId ? await this.rewardClaimRepository.create(client, {
                playerId,
                claimType: options.claimType,
                sourceRef: options.sourceRef,
                operationId: options.operationId,
                rewardTableId: rewardPlan?.tableId || null,
                rolledRewardSnapshot: normalizedRewards,
                activityRunId: options.activityRunId
        }) : null;
        const appliedRewards = await this.playerRuntimeRepository.applyRewards(playerId, normalizedRewards, {
            inventoryCapacity: Number(itemRules.inventory?.defaultSlot || 0),
            client,
            claimId: claim?.claimId,
            operationId: options.operationId
        });
        if (options.activityRunId && options.completeActivityRun !== false) {
            await this.activityRunRepository.complete(client, {
                runId: options.activityRunId,
                resultSnapshot: {
                    claimId: claim.claimId,
                    rewards: appliedRewards
                },
                completedAt: options.completedAt
            });
        }

        return {
            tableId: rewardPlan?.tableId || null,
            tableName: rewardPlan?.tableName || null,
            rewardPlan: {
                tableId: rewardPlan?.tableId || null,
                tableName: rewardPlan?.tableName || null,
                rewards
            },
            activityRunId: options.activityRunId || null,
            claimId: claim?.claimId || null,
            rewards: appliedRewards
        };
    }

    normalizeReward(reward) {
        if (reward.type === 'CURRENCY') {
            return {
                type: 'CURRENCY',
                currencyId: reward.currencyId,
                amount: normalizeIntegerAmount(reward.amount || 0)
            };
        }

        if (reward.type === 'ITEM') {
            const template = ItemFactory.getTemplate(reward.itemId);
            if (!template) {
                throw new Error(`MISSING_ITEM_TEMPLATE:${reward.itemId}`);
            }

            return {
                type: 'ITEM',
                itemId: reward.itemId,
                quantity: Number(reward.quantity || 1),
                rarity: template.rarity
            };
        }

        if (reward.type === 'EQUIPMENT') {
            const template = ItemFactory.getTemplate(reward.itemId);
            if (!template) {
                throw new Error(`MISSING_ITEM_TEMPLATE:${reward.itemId}`);
            }

            const generated = ItemGenerator.rollEquipment(template, reward.rarity || template.rarity, {
                grade: reward.grade || 'HOANG',
                gradeQuality: reward.gradeQuality || 'LOW'
            });
            return {
                type: 'EQUIPMENT',
                itemId: reward.itemId,
                quantity: Number(reward.quantity || 1),
                rarity: generated.rarity,
                grade: generated.grade,
                gradeQuality: generated.gradeQuality,
                fixedEffects: generated.fixedEffects,
                affixes: generated.affixes,
                elementIds: generated.elementIds,
                generatedName: generated.generatedName,
                equipmentType: reward.equipmentType || template.equipment_type,
            };
        }

        throw new Error(`UNSUPPORTED_REWARD_TYPE:${reward.type}`);
    }
}
