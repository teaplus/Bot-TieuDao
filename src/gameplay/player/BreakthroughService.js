import Player from '../../core/Player.js';
import SystemTimeProvider from '../../platform/time/SystemTimeProvider.js';
import {
    maxDecimal,
    minDecimal,
    multiplyDecimal,
    normalizeDecimal,
    subtractDecimal
} from '../../shared/numeric/FixedDecimal.js';
import { createLegacyPlayerSnapshot } from './createLegacyPlayerSnapshot.js';
import SectEffectResolver from '../sect/SectEffectResolver.js';
import RebirthStatCalculator from './RebirthStatCalculator.js';
import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';

const DIRECT_UNIT_OF_WORK = Object.freeze({
    execute: (work) => work(null)
});

export default class BreakthroughService {
    constructor(options = {}) {
        this.playerRuntimeRepository = options.playerRuntimeRepository;
        this.idempotencyRepository = options.idempotencyRepository || null;
        this.unitOfWork = options.unitOfWork || DIRECT_UNIT_OF_WORK;
        this.timeProvider = options.timeProvider || new SystemTimeProvider();
        this.random = options.random || Math.random;
        this.sectEffectResolver = options.sectEffectResolver || new SectEffectResolver(options);
        this.gameDataManager = options.gameDataManager || getGameDataManager();
    }

    async attemptBreakthrough(playerId, options = {}) {
        return this.unitOfWork.execute(async (client) => {
            const runtimePlayer = await this.playerRuntimeRepository.findById(playerId, {
                client,
                forUpdate: Boolean(client)
            });
            if (!runtimePlayer) {
                return null;
            }

            const reservation = await this.reserveOperation(client, playerId, options.operationId);
            if (reservation?.status === 'COMPLETED') {
                return {
                    ...reservation.response,
                    idempotentReplay: true
                };
            }

            const snapshot = createLegacyPlayerSnapshot(runtimePlayer);
            const player = new Player(snapshot.playerData);
            player.calculateOfflineCultivation(this.timeProvider.now());

            if (!player.realmInfo) {
                return this.completeOperation(client, options.operationId, { outcome: 'INVALID_REALM', player });
            }

            if (!player.hasNextTransition()) {
                await this.persistCultivation(client, playerId, player);
                return this.completeOperation(client, options.operationId, { outcome: 'MAX_REALM', player });
            }

            const requiredCultivation = normalizeDecimal(player.realmInfo.req_cul);
            if (!player.hasRequiredCultivation()) {
                await this.persistCultivation(client, playerId, player);
                return this.completeOperation(client, options.operationId, {
                    outcome: 'INSUFFICIENT_CULTIVATION',
                    player,
                    missingCultivation: subtractDecimal(requiredCultivation, player.cultivation)
                });
            }

            if (!player.isAtMaxStage()) {
                const result = await this.completeTransition(client, playerId, player, {
                    transitionType: 'MINOR',
                    targetRealmInfo: player.realmInfo,
                    targetRealmId: player.realmId,
                    targetRealmStage: player.realmStage + 1,
                    requiredCultivation
                });
                return this.completeOperation(client, options.operationId, result);
            }

            const successRate = Math.max(0, Math.min(100,
                Number(player.realmInfo.success_rate || 0)
                + this.sectEffectResolver.getBreakthroughChanceDelta(runtimePlayer)
            ));
            const roll = this.random() * 100;
            if (roll <= successRate) {
                const nextRealmInfo = player.getNextRealmInfo();
                if (!nextRealmInfo) {
                    await this.persistCultivation(client, playerId, player);
                    return this.completeOperation(client, options.operationId, {
                        outcome: 'NEXT_REALM_NOT_FOUND',
                        player
                    });
                }

                const result = await this.completeTransition(client, playerId, player, {
                    transitionType: 'MAJOR',
                    targetRealmInfo: nextRealmInfo,
                    targetRealmId: nextRealmInfo.id,
                    targetRealmStage: 1,
                    requiredCultivation
                });
                return this.completeOperation(client, options.operationId, result);
            }

            const result = await this.completeFailure(client, playerId, player, requiredCultivation);
            return this.completeOperation(client, options.operationId, result);
        });
    }

    async reserveOperation(client, playerId, operationId) {
        if (!operationId || !client || !this.idempotencyRepository) {
            return null;
        }

        const reservation = await this.idempotencyRepository.reserve(client, {
            operationId,
            playerId,
            operationType: 'BREAKTHROUGH',
            requestHash: `BREAKTHROUGH:${playerId}`,
            retentionPolicy: 'DEFAULT'
        });

        if (reservation.status === 'IN_PROGRESS') {
            throw new Error('IDEMPOTENCY_OPERATION_IN_PROGRESS');
        }

        return reservation;
    }

    async completeOperation(client, operationId, result) {
        if (!operationId || !client || !this.idempotencyRepository) {
            return result;
        }

        const response = this.createReplayResponse(result);
        await this.idempotencyRepository.complete(client, {
            operationId,
            response,
            responseRetentionDays: 30
        });
        return result;
    }

    createReplayResponse(result) {
        return {
            outcome: result.outcome,
            transitionType: result.transitionType,
            nextRealmStage: result.nextRealmStage,
            remainingCultivation: result.remainingCultivation,
            missingCultivation: result.missingCultivation,
            cultivationLoss: result.cultivationLoss,
            failureCultivationLossPercent: result.failureCultivationLossPercent,
            nextRealmInfo: result.nextRealmInfo ? {
                id: result.nextRealmInfo.id,
                name: result.nextRealmInfo.name
            } : undefined,
            newStats: result.newStats,
            player: result.player ? {
                name: result.player.name,
                baseAtk: result.player.baseAtk,
                baseDef: result.player.baseDef,
                baseHp: result.player.baseHp,
                baseSpd: result.player.baseSpd
            } : undefined
        };
    }

    async completeTransition(client, playerId, player, transition) {
        const remainingCultivation = subtractDecimal(player.cultivation, transition.requiredCultivation);
        const realmStageStats = player.getStageStats(transition.targetRealmInfo, transition.targetRealmStage);
        const rebirthRules = this.gameDataManager.getCollection('rebirthRules');
        const newStats = new RebirthStatCalculator(rebirthRules.baseStatBonus)
            .calculateStats(realmStageStats, player.rebirthCount);

        await this.playerRuntimeRepository.updateBreakthroughState(playerId, {
            realmId: transition.targetRealmId,
            realmStage: transition.targetRealmStage,
            cultivation: remainingCultivation,
            baseAtk: newStats.atk,
            baseHp: newStats.hp,
            baseDef: newStats.def,
            baseSpd: newStats.spd,
            lastCultivateAt: player.lastCultivate
        }, { client });

        return {
            outcome: 'SUCCESS',
            transitionType: transition.transitionType,
            player,
            nextRealmInfo: transition.targetRealmInfo,
            nextRealmStage: transition.targetRealmStage,
            remainingCultivation,
            newStats
        };
    }

    async completeFailure(client, playerId, player, requiredCultivation) {
        const breakthroughRule = player.getBreakthroughRule();
        const lossPercent = Number(breakthroughRule?.failureCultivationLossPercent);
        if (!Number.isFinite(lossPercent)) {
            throw new Error('INVALID_BREAKTHROUGH_RULE');
        }

        const calculatedLoss = multiplyDecimal(requiredCultivation, String(lossPercent / 100));
        const cultivationLoss = minDecimal(player.cultivation, calculatedLoss);
        const remainingCultivation = maxDecimal(subtractDecimal(player.cultivation, cultivationLoss), 0);

        await this.playerRuntimeRepository.updateCultivationState(playerId, {
            cultivation: remainingCultivation,
            lastCultivateAt: player.lastCultivate
        }, { client });

        return {
            outcome: 'FAILED',
            player,
            cultivationLoss,
            remainingCultivation,
            failureCultivationLossPercent: lossPercent
        };
    }

    async persistCultivation(client, playerId, player) {
        await this.playerRuntimeRepository.updateCultivationState(playerId, {
            cultivation: player.cultivation,
            lastCultivateAt: player.lastCultivate
        }, { client });
    }
}
