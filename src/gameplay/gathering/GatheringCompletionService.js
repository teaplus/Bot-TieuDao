import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import { createRequestHash } from '../../platform/idempotency/createRequestHash.js';
import IdempotentOperationExecutor from '../../platform/idempotency/IdempotentOperationExecutor.js';
import PeriodKeyService from '../../platform/time/PeriodKeyService.js';
import SystemTimeProvider from '../../platform/time/SystemTimeProvider.js';
import ActivityRunRepository from '../../repositories/ActivityRunRepository.js';
import PeriodCounterRepository from '../../repositories/PeriodCounterRepository.js';
import RewardApplyService from '../rewards/RewardApplyService.js';
import RewardTableService from '../rewards/RewardTableService.js';
import BattleEntityFactory from '../../runtime/battle/BattleEntityFactory.js';

const ACTIVITY_TYPE = 'GATHERING';

export default class GatheringCompletionService {
    constructor(options = {}) {
        this.playerRuntimeRepository = options.playerRuntimeRepository;
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.operationExecutor = options.operationExecutor || new IdempotentOperationExecutor(options);
        this.activityRunRepository = options.activityRunRepository || new ActivityRunRepository();
        this.playerMapService = options.playerMapService || null;
        this.periodCounterRepository = options.periodCounterRepository || new PeriodCounterRepository();
        this.rewardTableService = options.rewardTableService || new RewardTableService({
            gameDataManager: this.gameDataManager,
            random: options.random || Math.random
        });
        this.battleEntityFactory = options.battleEntityFactory || new BattleEntityFactory();
        this.rewardApplyService = options.rewardApplyService || new RewardApplyService({
            ...options,
            gameDataManager: this.gameDataManager,
            playerRuntimeRepository: this.playerRuntimeRepository,
            activityRunRepository: this.activityRunRepository
        });
        this.timeProvider = options.timeProvider || new SystemTimeProvider();
        const economyRules = this.gameDataManager.getCollection('economyRules') || {};
        this.periodKeyService = options.periodKeyService || new PeriodKeyService({
            timeZone: economyRules.timezone
        });
    }

    async start(playerId, gatheringId, options = {}) {
        if (!options.operationId) throw new Error('GATHERING_START_OPERATION_ID_REQUIRED');

        return this.operationExecutor.execute({
            operationId: options.operationId,
            playerId,
            operationType: 'GATHERING_START',
            requestHash: createRequestHash({
                operationType: 'GATHERING_START',
                playerId,
                gatheringId
            })
        }, async (client) => {
            const runtimePlayer = await this.loadRuntimePlayer(playerId, client, true);
            const gathering = this.resolveGathering(gatheringId);
            const resolvedMap = await this.resolveCurrentMap(client, runtimePlayer);
            this.assertAvailable(gathering, runtimePlayer, resolvedMap.map);

            const startedAt = options.startedAt || this.timeProvider.now();
            const readyAt = new Date(startedAt.getTime() + (gathering.duration * 1000));
            const playerEntity = this.battleEntityFactory.createFromRuntimePlayer(
                runtimePlayer,
                { team: 'A' }
            );
            let run;
            try {
                run = await this.activityRunRepository.reserve(client, {
                    playerId,
                    activityType: ACTIVITY_TYPE,
                    contentId: gathering.id,
                    operationId: options.operationId,
                    rewardTableId: gathering.rewardTableId,
                    readyAt,
                    inputSnapshot: {
                        gatheringId: gathering.id,
                        mapId: resolvedMap.map.id,
                        mapName: resolvedMap.map.name,
                        resourceFamily: gathering.resourceFamily,
                        resourceTier: gathering.resourceTier,
                        realmId: runtimePlayer.realmId,
                        spiritualRoot: runtimePlayer.spiritualRoot,
                        luck: Number(playerEntity.battleStat.luck || 0),
                        durationSeconds: gathering.duration,
                        startedAt: startedAt.toISOString(),
                        readyAt: readyAt.toISOString()
                    }
                });
            } catch (error) {
                if (error?.code === '23505' && error?.constraint === 'activity_runs_one_active_gathering_per_player') {
                    throw new Error('GATHERING_ACTIVE_RUN_EXISTS');
                }
                throw error;
            }

            return {
                status: 'IN_PROGRESS',
                runId: run.runId,
                playerId,
                gatheringId: gathering.id,
                mapId: resolvedMap.map.id,
                resourceFamily: gathering.resourceFamily,
                startedAt,
                readyAt,
                durationSeconds: gathering.duration
            };
        });
    }

    async claim(playerId, runId, options = {}) {
        if (!options.operationId) throw new Error('GATHERING_CLAIM_OPERATION_ID_REQUIRED');

        return this.operationExecutor.execute({
            operationId: options.operationId,
            playerId,
            operationType: 'GATHERING_CLAIM',
            requestHash: createRequestHash({
                operationType: 'GATHERING_CLAIM',
                playerId,
                runId: String(runId)
            }),
            businessKey: `GATHERING_CLAIM:${runId}`,
            retentionPolicy: 'ONE_TIME_CLAIM'
        }, async (client) => {
            await this.loadRuntimePlayer(playerId, client, true);
            const run = await this.activityRunRepository.lockById(client, {
                runId,
                playerId,
                activityType: ACTIVITY_TYPE
            });
            if (run.status !== 'IN_PROGRESS') throw new Error('GATHERING_RUN_NOT_CLAIMABLE');

            const claimedAt = options.claimedAt || this.timeProvider.now();
            if (!run.readyAt || claimedAt.getTime() < new Date(run.readyAt).getTime()) {
                throw new Error('GATHERING_NOT_READY');
            }

            const gathering = this.resolveGathering(run.contentId);
            if (gathering.rewardTableId !== run.rewardTableId) {
                throw new Error('GATHERING_REWARD_TABLE_SNAPSHOT_MISMATCH');
            }
            if (gathering.dailyLimit > 0) {
                await this.periodCounterRepository.incrementWithinLimit(client, {
                    playerId,
                    counterType: 'GATHERING_COMPLETION',
                    subjectId: gathering.id,
                    periodType: 'DAILY',
                    periodKey: this.periodKeyService.getKey('DAILY', claimedAt),
                    increment: 1,
                    limit: gathering.dailyLimit,
                    errorCode: 'GATHERING_DAILY_LIMIT_REACHED'
                });
            }

            const rewardPlan = this.rewardTableService.roll(run.rewardTableId, {
                realmId: run.inputSnapshot.realmId,
                spiritualRoot: run.inputSnapshot.spiritualRoot,
                luck: run.inputSnapshot.luck,
                gatheringId: gathering.id
            });
            const applied = await this.rewardApplyService.applyInTransaction(
                client,
                playerId,
                rewardPlan,
                {
                    operationId: options.operationId,
                    activityRunId: run.runId,
                    claimType: 'GATHERING_REWARD',
                    sourceRef: run.runId,
                    completedAt: claimedAt
                }
            );
            const progress = await this.recordLegacyProjection(
                client,
                playerId,
                gathering,
                run.runId,
                claimedAt
            );

            return {
                status: 'COMPLETED',
                runId: run.runId,
                playerId,
                gatheringId: gathering.id,
                claimedAt,
                reward: applied,
                progress
            };
        });
    }

    async loadRuntimePlayer(playerId, client, forUpdate = false) {
        const runtimePlayer = await this.playerRuntimeRepository?.findById(playerId, { client, forUpdate });
        if (!runtimePlayer) throw new Error('PLAYER_NOT_FOUND');
        return runtimePlayer;
    }

    resolveGathering(gatheringId) {
        const gathering = this.gameDataManager.getRecord('gatheringTemplates', gatheringId);
        if (!gathering) throw new Error('GATHERING_NOT_FOUND');
        return gathering;
    }

    async resolveCurrentMap(client, runtimePlayer) {
        if (!this.playerMapService?.resolveCurrentMap) {
            throw new Error('GATHERING_MAP_SERVICE_REQUIRED');
        }
        return this.playerMapService.resolveCurrentMap(client, runtimePlayer);
    }

    assertAvailable(gathering, runtimePlayer, currentMap) {
        if (!this.gameDataManager.hasRecord('rewardTables', gathering.rewardTableId)) {
            throw new Error('REWARD_TABLE_NOT_FOUND');
        }
        if (!gathering.mapId || gathering.mapId !== currentMap?.id) {
            throw new Error('GATHERING_NOT_AVAILABLE_ON_CURRENT_MAP');
        }
        if (gathering.status !== 'ACTIVE'
            || currentMap.status !== 'ACTIVE'
            || !(currentMap.activityTypes || []).includes('GATHERING')) {
            throw new Error('GATHERING_CONTENT_NOT_ACTIVE');
        }
        const realms = Object.values(this.gameDataManager.getCollection('realms') || {});
        const requiredRealm = realms.find((realm) => realm.code === gathering.requiredRealm);
        if (!requiredRealm || Number(runtimePlayer.realmId || 0) < Number(requiredRealm.id || 0)) {
            throw new Error('REALM_LOCKED');
        }
    }

    async recordLegacyProjection(client, playerId, gathering, activityRunId, completedAt) {
        if (typeof this.playerRuntimeRepository?.recordGatheringResult !== 'function') {
            return { status: 'NOT_PERSISTED', reason: 'REPOSITORY_METHOD_MISSING' };
        }
        return this.playerRuntimeRepository.recordGatheringResult(playerId, {
            gatheringId: gathering.id,
            rewardTableId: gathering.rewardTableId,
            activityRunId,
            completedAt
        }, { client });
    }
}
