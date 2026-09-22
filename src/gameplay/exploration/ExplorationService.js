import BattleEngine from '../../battle/BattleEngine.js';
import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import MonsterGeneratorService from '../monsters/MonsterGeneratorService.js';
import BattleEntityFactory from '../../runtime/battle/BattleEntityFactory.js';
import MapEncounterService from '../maps/MapEncounterService.js';
import PlayerMapService from '../maps/PlayerMapService.js';
import createSeededRandom from '../../platform/random/createSeededRandom.js';
import SecureSeedProvider from '../../platform/random/SecureSeedProvider.js';
import IdempotentOperationExecutor from '../../platform/idempotency/IdempotentOperationExecutor.js';
import { createRequestHash } from '../../platform/idempotency/createRequestHash.js';
import ActivityRunRepository from '../../repositories/ActivityRunRepository.js';
import RewardApplyService from '../rewards/RewardApplyService.js';
import RewardTableService from '../rewards/RewardTableService.js';
import { createBattleEntitySnapshot } from '../activities/BattleEntitySnapshot.js';
import ExplorationEncounterService from './ExplorationEncounterService.js';

const VALID_ELEMENTS = new Set(['METAL', 'WOOD', 'WATER', 'FIRE', 'EARTH']);

function resolveOutcome(battleResult) {
    if (battleResult.winnerTeam === 'A') {
        return 'VICTORY';
    }

    if (battleResult.winnerTeam === 'B') {
        return 'DEFEAT';
    }

    return 'DRAW';
}

export default class ExplorationService {
    constructor(options = {}) {
        this.playerRuntimeRepository = options.playerRuntimeRepository;
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.random = options.random || Math.random;
        this.seedProvider = options.seedProvider || new SecureSeedProvider();
        this.monsterGeneratorService = options.monsterGeneratorService || new MonsterGeneratorService({
            gameDataManager: this.gameDataManager,
            random: this.random
        });
        this.mapEncounterService = options.mapEncounterService || new MapEncounterService({
            gameDataManager: this.gameDataManager,
            random: this.random
        });
        this.playerMapService = options.playerMapService || new PlayerMapService({
            ...options,
            gameDataManager: this.gameDataManager,
            playerRuntimeRepository: this.playerRuntimeRepository
        });
        this.battleEntityFactory = options.battleEntityFactory || new BattleEntityFactory();
        this.battleEngineFactory = options.battleEngineFactory || ((battleOptions) => new BattleEngine({
            random: this.random,
            ...battleOptions
        }));
        this.operationExecutor = options.operationExecutor || new IdempotentOperationExecutor(options);
        this.activityRunRepository = options.activityRunRepository || new ActivityRunRepository();
        this.rewardApplyService = options.rewardApplyService || new RewardApplyService({
            ...options,
            gameDataManager: this.gameDataManager,
            playerRuntimeRepository: this.playerRuntimeRepository,
            activityRunRepository: this.activityRunRepository
        });
        this.encounterService = options.encounterService || new ExplorationEncounterService({
            gameDataManager: this.gameDataManager
        });
        this.mysteryMerchantService = options.mysteryMerchantService || null;
    }

    async explore(playerId, options = {}) {
        if (!this.playerRuntimeRepository) {
            throw new Error('PLAYER_RUNTIME_REPOSITORY_REQUIRED');
        }

        if (!options.operationId) throw new Error('EXPLORATION_OPERATION_ID_REQUIRED');

        const reservation = await this.reserveExploration(playerId, options);
        if (reservation.inputSnapshot.encounter.type !== 'MONSTER') {
            return this.completeEventExploration(playerId, reservation, options);
        }
        const battleResult = this.runReservedBattle(reservation, options);
        return this.completeExploration(playerId, reservation, battleResult, options);
    }

    async reserveExploration(playerId, options) {
        return this.operationExecutor.execute({
            operationId: options.operationId,
            playerId,
            operationType: 'EXPLORATION_START',
            requestHash: createRequestHash({
                operationType: 'EXPLORATION_START', playerId,
                mapSource: 'PLAYER_CURRENT_MAP', monsterId: options.monsterId || null,
                realmCode: options.realmCode || null, element: options.element || null,
                stage: options.stage || null, variantId: options.variantId || null
            })
        }, async (client) => {
            const runtimePlayer = await this.playerRuntimeRepository.findById(playerId, { client, forUpdate: true });
            if (!runtimePlayer) throw new Error('PLAYER_NOT_FOUND');

            const location = await this.playerMapService.resolveCurrentMap(client, runtimePlayer);
            const encounterSeed = this.seedProvider.nextSeed();
            const encounter = this.encounterService.select(encounterSeed);
            const monsterPlan = encounter.type === 'MYSTERY_MERCHANT' ? null : this.createMonsterPlan(
                runtimePlayer, { ...options, mapId: location.map.id }
            );
            const playerEntity = this.battleEntityFactory.createFromRuntimePlayer(runtimePlayer, { team: 'A' });
            const monsterEntity = monsterPlan && encounter.type === 'MONSTER'
                ? this.battleEntityFactory.createFromMonsterPlan(monsterPlan, { team: 'B' })
                : null;
            const battleSeed = this.seedProvider.nextSeed();
            const rewardSeed = this.seedProvider.nextSeed();
            const battleId = options.battleId || `explore:${playerId}:${options.operationId}`;
            const inputSnapshot = {
                battleId,
                battleSeed,
                rewardSeed,
                encounter,
                mapId: location.map.id,
                mapName: location.map.name,
                player: createBattleEntitySnapshot(playerEntity),
                monster: monsterEntity ? createBattleEntitySnapshot(monsterEntity) : null,
                monsterPlan,
                realmId: runtimePlayer.realmId,
                spiritualRoot: runtimePlayer.spiritualRoot,
                luck: Number(playerEntity.battleStat.luck || 0),
                maxRounds: Number(
                    options.maxRounds
                    || this.gameDataManager.getCollection('battleRules')?.roundLimit
                    || 15
                )
            };
            const contentId = `MAP:${location.map.id}:${encounter.type}`;
            const run = await this.activityRunRepository.reserve(client, {
                playerId,
                activityType: 'EXPLORATION',
                contentId,
                operationId: options.operationId,
                inputSnapshot,
                rewardTableId: encounter.type === 'FORTUNE_REWARD'
                    ? monsterPlan?.rewardTableId || null
                    : encounter.type === 'MONSTER' ? monsterPlan?.rewardTableId || null : null
            });

            return { runId: run.runId, inputSnapshot };
        });
    }

    runReservedBattle(reservation, options = {}) {
        const snapshot = reservation.inputSnapshot;
        const battleEngine = this.battleEngineFactory({
            maxRounds: snapshot.maxRounds,
            random: createSeededRandom(snapshot.battleSeed)
        });
        return battleEngine.run({
            battleId: snapshot.battleId,
            teams: {
                A: [this.battleEntityFactory.createFromSnapshot(snapshot.player)],
                B: [this.battleEntityFactory.createFromSnapshot(snapshot.monster)]
            }
        });
    }

    async completeExploration(playerId, reservation, battleResult, options = {}) {
        const completionOperationId = `${options.operationId}:complete`;
        const outcome = resolveOutcome(battleResult);
        return this.operationExecutor.execute({
            operationId: completionOperationId,
            playerId,
            operationType: 'EXPLORATION_COMPLETE',
            requestHash: createRequestHash({
                operationType: 'EXPLORATION_COMPLETE', playerId,
                runId: reservation.runId, battleId: battleResult.battleId
            }),
            businessKey: `EXPLORATION_COMPLETE:${reservation.runId}`,
            retentionPolicy: 'ONE_TIME_CLAIM'
        }, async (client) => {
            await this.playerRuntimeRepository.findById(playerId, { client, forUpdate: true });
            const run = await this.activityRunRepository.lockById(client, {
                runId: reservation.runId,
                playerId,
                activityType: 'EXPLORATION'
            });
            if (run.status !== 'IN_PROGRESS') throw new Error('EXPLORATION_RUN_NOT_COMPLETABLE');

            const monsterPlan = reservation.inputSnapshot.monsterPlan;
            let reward = { status: 'NOT_APPLIED', plan: null, applied: null };
            if (outcome === 'VICTORY' && run.rewardTableId) {
                const rewardPlan = new RewardTableService({
                    gameDataManager: this.gameDataManager,
                    random: createSeededRandom(reservation.inputSnapshot.rewardSeed)
                }).roll(run.rewardTableId, {
                    realmId: reservation.inputSnapshot.realmId,
                    spiritualRoot: reservation.inputSnapshot.spiritualRoot,
                    element: monsterPlan.element,
                    mapId: monsterPlan.mapId || null,
                    monsterQualityId: monsterPlan.qualityId || null,
                    qualityRewardChanceBonusPercent: monsterPlan.qualityRewardChanceBonusPercent || 0,
                    luck: reservation.inputSnapshot.luck
                });
                const applied = await this.rewardApplyService.applyInTransaction(client, playerId, rewardPlan, {
                    operationId: completionOperationId,
                    activityRunId: run.runId,
                    claimType: 'EXPLORATION_REWARD',
                    sourceRef: run.runId,
                    completeActivityRun: false
                });
                reward = { status: 'APPLIED', plan: applied.rewardPlan, applied };
            }

            const completedAt = options.completedAt || new Date();
            const progress = await this.recordProgress(playerId, monsterPlan, outcome, {
                ...options,
                activityRunId: run.runId,
                completedAt,
                client
            });
            await this.activityRunRepository.complete(client, {
                runId: run.runId,
                completedAt,
                resultSnapshot: { outcome, battleResult, rewardClaimId: reward.applied?.claimId || null }
            });

            return {
                playerId,
                encounterType: 'MONSTER',
                outcome,
                battleResult,
                encounter: {
                    monster: monsterPlan,
                    rewardTableId: monsterPlan.rewardTableId || null,
                    mapId: monsterPlan.mapId || null,
                    mapName: monsterPlan.mapName || null,
                    spawnPoolId: monsterPlan.spawnPoolId || null
                },
                reward,
                progress,
                pending: { reward: reward.status, progress: progress.status },
                activityRunId: run.runId
            };
        });
    }

    async completeEventExploration(playerId, reservation, options = {}) {
        const snapshot = reservation.inputSnapshot;
        const encounterType = snapshot.encounter.type;
        const completionOperationId = `${options.operationId}:complete`;
        return this.operationExecutor.execute({
            operationId: completionOperationId,
            playerId,
            operationType: 'EXPLORATION_COMPLETE',
            requestHash: createRequestHash({
                operationType: 'EXPLORATION_COMPLETE', playerId,
                runId: reservation.runId, encounterType
            }),
            businessKey: `EXPLORATION_COMPLETE:${reservation.runId}`,
            retentionPolicy: 'ONE_TIME_CLAIM'
        }, async (client) => {
            await this.playerRuntimeRepository.findById(playerId, { client, forUpdate: true });
            const run = await this.activityRunRepository.lockById(client, {
                runId: reservation.runId, playerId, activityType: 'EXPLORATION'
            });
            if (run.status !== 'IN_PROGRESS') throw new Error('EXPLORATION_RUN_NOT_COMPLETABLE');
            let reward = { status: 'NOT_APPLIED', plan: null, applied: null };
            let merchantSession = null;
            if (encounterType === 'FORTUNE_REWARD' && run.rewardTableId) {
                const rewardPlan = new RewardTableService({
                    gameDataManager: this.gameDataManager,
                    random: createSeededRandom(snapshot.rewardSeed)
                }).roll(run.rewardTableId, {
                    realmId: snapshot.realmId,
                    spiritualRoot: snapshot.spiritualRoot,
                    mapId: snapshot.mapId,
                    luck: snapshot.luck
                });
                const applied = await this.rewardApplyService.applyInTransaction(client, playerId, rewardPlan, {
                    operationId: completionOperationId,
                    activityRunId: run.runId,
                    claimType: 'EXPLORATION_FORTUNE_REWARD',
                    sourceRef: run.runId,
                    completeActivityRun: false
                });
                reward = { status: 'APPLIED', plan: applied.rewardPlan, applied };
            }
            if (encounterType === 'MYSTERY_MERCHANT') {
                if (!this.mysteryMerchantService) throw new Error('MYSTERY_MERCHANT_SERVICE_REQUIRED');
                merchantSession = await this.mysteryMerchantService.createInTransaction(client, {
                    playerId,
                    activityRunId: run.runId,
                    mapId: snapshot.mapId,
                    seed: snapshot.rewardSeed,
                    createdAt: options.completedAt || new Date()
                });
            }
            const completedAt = options.completedAt || new Date();
            const progress = await this.playerRuntimeRepository.recordExplorationResult(playerId, {
                outcome: 'EVENT', encounterType,
                eventId: encounterType,
                monsterId: snapshot.monsterPlan?.id || null,
                monsterTemplateId: snapshot.monsterPlan?.templateId || null,
                rewardTableId: run.rewardTableId || null,
                activityRunId: run.runId,
                completedAt
            }, { client });
            await this.activityRunRepository.complete(client, {
                runId: run.runId,
                completedAt,
                resultSnapshot: {
                    encounterType,
                    rewardClaimId: reward.applied?.claimId || null,
                    merchantSessionId: merchantSession?.sessionId || null
                }
            });
            return {
                playerId,
                encounterType,
                outcome: 'EVENT',
                battleResult: null,
                event: {
                    type: encounterType,
                    mapId: snapshot.mapId,
                    mapName: snapshot.mapName
                },
                reward,
                merchantSession,
                progress,
                activityRunId: run.runId
            };
        });
    }

    async recordProgress(playerId, monsterPlan, outcome, options = {}) {
        if (typeof this.playerRuntimeRepository?.recordExplorationResult !== 'function') {
            return {
                status: 'NOT_PERSISTED',
                reason: 'REPOSITORY_METHOD_MISSING'
            };
        }

        return this.playerRuntimeRepository.recordExplorationResult(playerId, {
            outcome,
            encounterType: 'MONSTER',
            eventId: null,
            monsterId: monsterPlan.id,
            monsterTemplateId: monsterPlan.templateId,
            rewardTableId: monsterPlan.rewardTableId || null,
            mapId: monsterPlan.mapId || null,
            spawnPoolId: monsterPlan.spawnPoolId || null,
            activityRunId: options.activityRunId || null,
            completedAt: options.completedAt || new Date()
        }, { client: options.client });
    }

    createMonsterPlan(runtimePlayer, options = {}) {
        if (options.mapId) {
            const selection = this.mapEncounterService.select(options.mapId, runtimePlayer.realmId);
            const monsterPlan = this.monsterGeneratorService.createMonster(selection.monsterId, {
                variantId: options.variantId || selection.variantId,
                stage: options.stage,
                qualityId: selection.qualityId || selection.entry.qualityId
            });
            return {
                ...monsterPlan,
                mapId: selection.map.id,
                mapName: selection.map.displayName,
                qualityPoolId: selection.qualityPoolId,
                spawnPoolId: selection.pool.id,
                spawnType: selection.entry.spawnType,
                rewardModifier: selection.map.rewardModifier || null
            };
        }

        if (options.monsterId) {
            return this.monsterGeneratorService.createMonster(options.monsterId, {
                stage: options.stage,
                variantId: options.variantId
            });
        }

        const [monsterPlan] = this.monsterGeneratorService.createEncounter({
            realmCode: options.realmCode || this.resolveRealmCode(runtimePlayer.realmId),
            element: options.element || this.resolveElement(runtimePlayer.spiritualRoot),
            count: 1,
            mode: options.mode || 'exploration',
            stage: options.stage,
            variantId: options.variantId
        });

        return monsterPlan;
    }

    resolveRealmCode(realmId) {
        const realm = this.gameDataManager.getRecord('realms', realmId);
        return realm?.code || null;
    }

    resolveElement(spiritualRoot) {
        return VALID_ELEMENTS.has(spiritualRoot) ? spiritualRoot : null;
    }

}
