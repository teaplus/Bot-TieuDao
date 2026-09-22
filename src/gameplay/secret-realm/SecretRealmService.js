import BattleEngine from '../../battle/BattleEngine.js';
import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import BattleEntityFactory from '../../runtime/battle/BattleEntityFactory.js';
import MonsterGeneratorService from '../monsters/MonsterGeneratorService.js';
import MonsterQualityRoller from '../monsters/MonsterQualityRoller.js';
import createSeededRandom from '../../platform/random/createSeededRandom.js';
import SecureSeedProvider from '../../platform/random/SecureSeedProvider.js';
import IdempotentOperationExecutor from '../../platform/idempotency/IdempotentOperationExecutor.js';
import { createRequestHash } from '../../platform/idempotency/createRequestHash.js';
import ActivityRunRepository from '../../repositories/ActivityRunRepository.js';
import RewardApplyService from '../rewards/RewardApplyService.js';
import RewardTableService from '../rewards/RewardTableService.js';
import { createBattleEntitySnapshot } from '../activities/BattleEntitySnapshot.js';

const DEFAULT_TICKET_ITEM_ID = 'SECRET_REALM_TICKET';
const DEFAULT_WAVE_COUNT = 3;
const VALID_ELEMENTS = new Set(['METAL', 'WOOD', 'WATER', 'FIRE', 'EARTH']);

function resolveOutcome(waveResults) {
    if (waveResults.every((wave) => wave.outcome === 'VICTORY')) return 'CLEARED';
    if (waveResults.some((wave) => wave.outcome === 'DRAW')) return 'DRAW';
    return 'FAILED';
}

function resolveBattleOutcome(battleResult) {
    if (battleResult.winnerTeam === 'A') {
        return 'VICTORY';
    }

    if (battleResult.winnerTeam === 'B') {
        return 'DEFEAT';
    }

    return 'DRAW';
}

export default class SecretRealmService {
    constructor(options = {}) {
        this.playerRuntimeRepository = options.playerRuntimeRepository;
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.random = options.random || Math.random;
        this.seedProvider = options.seedProvider || new SecureSeedProvider();
        this.ticketItemId = options.ticketItemId || DEFAULT_TICKET_ITEM_ID;
        this.monsterGeneratorService = options.monsterGeneratorService || new MonsterGeneratorService({
            gameDataManager: this.gameDataManager,
            random: this.random
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
        this.monsterQualityRoller = options.monsterQualityRoller || new MonsterQualityRoller({
            gameDataManager: this.gameDataManager,
            random: this.random
        });
    }

    async enter(playerId, options = {}) {
        if (!this.playerRuntimeRepository) {
            throw new Error('PLAYER_RUNTIME_REPOSITORY_REQUIRED');
        }

        if (!options.operationId) throw new Error('SECRET_REALM_OPERATION_ID_REQUIRED');

        const reservation = await this.reserveSecretRealm(playerId, options);
        const waveResults = this.runReservedWaves(reservation, options);
        return this.completeSecretRealm(playerId, reservation, waveResults, options);
    }

    async reserveSecretRealm(playerId, options) {
        return this.operationExecutor.execute({
            operationId: options.operationId,
            playerId,
            operationType: 'SECRET_REALM_START',
            requestHash: createRequestHash({
                operationType: 'SECRET_REALM_START', playerId,
                waveCount: options.waveCount || DEFAULT_WAVE_COUNT,
                realmCode: options.realmCode || null, element: options.element || null,
                stage: options.stage || null, consumeTicket: options.consumeTicket !== false
            })
        }, async (client) => {
            const runtimePlayer = await this.playerRuntimeRepository.findById(playerId, { client, forUpdate: true });
            if (!runtimePlayer) throw new Error('PLAYER_NOT_FOUND');
            const ticket = this.findTicket(runtimePlayer);
            if (!ticket && options.consumeTicket !== false) throw new Error('SECRET_REALM_TICKET_REQUIRED');

            const waves = this.generateWaves(runtimePlayer, options);
            const playerEntity = this.battleEntityFactory.createFromRuntimePlayer(runtimePlayer, { team: 'A' });
            const battleSeed = this.seedProvider.nextSeed();
            const rewardSeed = this.seedProvider.nextSeed();
            const inputSnapshot = {
                battleSeed,
                rewardSeed,
                battleId: options.battleId || `secret-realm:${playerId}:${options.operationId}`,
                player: createBattleEntitySnapshot(playerEntity),
                waves: waves.map((wave) => ({
                    ...wave,
                    monsterEntity: createBattleEntitySnapshot(
                        this.battleEntityFactory.createFromMonsterPlan(wave.monster, { team: 'B' })
                    )
                })),
                realmId: runtimePlayer.realmId,
                spiritualRoot: runtimePlayer.spiritualRoot,
                luck: Number(playerEntity.battleStat.luck || 0),
                maxRounds: Number(
                    options.maxRounds
                    || this.gameDataManager.getCollection('battleRules')?.roundLimit
                    || 15
                ),
                ticket: ticket ? { itemId: this.ticketItemId, inventoryId: ticket.runtimeId } : null
            };
            const boss = waves[waves.length - 1]?.monster;
            const run = await this.activityRunRepository.reserve(client, {
                playerId,
                activityType: 'SECRET_REALM',
                contentId: `WAVES:${waves.length}`,
                operationId: options.operationId,
                inputSnapshot,
                rewardTableId: boss?.rewardTableId || null
            });
            if (ticket && options.consumeTicket !== false) {
                await this.playerRuntimeRepository.consumeItemByTemplate(
                    playerId,
                    this.ticketItemId,
                    { inventoryId: ticket.runtimeId, quantity: 1 },
                    {
                        client,
                        operationId: options.operationId,
                        referenceType: 'ACTIVITY_RUN',
                        referenceId: run.runId,
                        reason: 'SECRET_REALM_TICKET_COST'
                    }
                );
            }

            return { runId: run.runId, inputSnapshot };
        });
    }

    runReservedWaves(reservation) {
        const snapshot = reservation.inputSnapshot;
        const waveResults = [];
        let carriedHP = String(snapshot.player.currentHP);

        for (const wave of snapshot.waves) {
            const playerEntity = this.battleEntityFactory.createFromSnapshot(snapshot.player, {
                currentHP: carriedHP,
                currentShield: '0'
            });
            const monsterEntity = this.battleEntityFactory.createFromSnapshot(wave.monsterEntity);
            const battleEngine = this.battleEngineFactory({
                maxRounds: snapshot.maxRounds,
                random: createSeededRandom(snapshot.battleSeed + wave.waveNumber)
            });
            const battleResult = battleEngine.run({
                battleId: `${snapshot.battleId}:wave:${wave.waveNumber}`,
                teams: { A: [playerEntity], B: [monsterEntity] }
            });
            const outcome = resolveBattleOutcome(battleResult);
            const finalPlayer = battleResult.entities.find((entity) => entity.id === snapshot.player.id);
            carriedHP = String(finalPlayer?.currentHP || 0);
            waveResults.push({
                waveNumber: wave.waveNumber,
                type: wave.type,
                outcome,
                carriedHP,
                battleResult
            });
            if (outcome !== 'VICTORY') break;
        }

        return waveResults;
    }

    async completeSecretRealm(playerId, reservation, waveResults, options = {}) {
        const completionOperationId = `${options.operationId}:complete`;
        const outcome = resolveOutcome(waveResults);
        return this.operationExecutor.execute({
            operationId: completionOperationId,
            playerId,
            operationType: 'SECRET_REALM_COMPLETE',
            requestHash: createRequestHash({
                operationType: 'SECRET_REALM_COMPLETE', playerId,
                runId: reservation.runId
            }),
            businessKey: `SECRET_REALM_COMPLETE:${reservation.runId}`,
            retentionPolicy: 'ONE_TIME_CLAIM'
        }, async (client) => {
            await this.playerRuntimeRepository.findById(playerId, { client, forUpdate: true });
            const run = await this.activityRunRepository.lockById(client, {
                runId: reservation.runId,
                playerId,
                activityType: 'SECRET_REALM'
            });
            if (run.status !== 'IN_PROGRESS') throw new Error('SECRET_REALM_RUN_NOT_COMPLETABLE');

            const waves = reservation.inputSnapshot.waves;
            const boss = waves[waves.length - 1]?.monster;
            let reward = { status: 'NOT_APPLIED', plan: null, applied: null };
            if (outcome === 'CLEARED' && run.rewardTableId) {
                const rewardPlan = new RewardTableService({
                    gameDataManager: this.gameDataManager,
                    random: createSeededRandom(reservation.inputSnapshot.rewardSeed)
                }).roll(run.rewardTableId, {
                    realmId: reservation.inputSnapshot.realmId,
                    spiritualRoot: reservation.inputSnapshot.spiritualRoot,
                    element: boss?.element,
                    luck: reservation.inputSnapshot.luck
                });
                const applied = await this.rewardApplyService.applyInTransaction(client, playerId, rewardPlan, {
                    operationId: completionOperationId,
                    activityRunId: run.runId,
                    claimType: 'SECRET_REALM_REWARD',
                    sourceRef: run.runId,
                    completeActivityRun: false
                });
                reward = { status: 'APPLIED', plan: applied.rewardPlan, applied };
            }

            const completedAt = options.completedAt || new Date();
            const progress = await this.recordProgress(playerId, waves, waveResults, outcome, {
                ...options,
                activityRunId: run.runId,
                completedAt,
                client
            });
            await this.activityRunRepository.complete(client, {
                runId: run.runId,
                completedAt,
                resultSnapshot: { outcome, waveResults, rewardClaimId: reward.applied?.claimId || null }
            });

            return {
                playerId,
                outcome,
                ticket: reservation.inputSnapshot.ticket ? {
                    ...reservation.inputSnapshot.ticket,
                    consumed: true
                } : null,
                waves: waves.map(({ monsterEntity, ...wave }) => wave),
                waveResults,
                reward,
                progress,
                pending: { reward: reward.status, progress: progress.status },
                activityRunId: run.runId
            };
        });
    }

    findTicket(runtimePlayer) {
        return runtimePlayer.inventory.getAllEntries()
            .find((entry) => entry.templateId === this.ticketItemId && Number(entry.quantity || 0) > 0);
    }

    generateWaves(runtimePlayer, options = {}) {
        const waveCount = Number(options.waveCount || DEFAULT_WAVE_COUNT);
        const realmCode = options.realmCode || this.resolveRealmCode(runtimePlayer.realmId);
        const element = options.element || this.resolveElement(runtimePlayer.spiritualRoot);

        return Array.from({ length: waveCount }, (_, index) => {
            const waveNumber = index + 1;
            const isBoss = waveNumber === waveCount;
            const qualityRoll = isBoss ? null : this.monsterQualityRoller.rollForRealm(realmCode);
            const monsterPlan = isBoss
                ? this.createBossForRealm(realmCode, Number(options.stage || waveNumber), { ...options, element })
                : this.monsterGeneratorService.createEncounter({
                    realmCode,
                    element,
                    count: 1,
                    mode: 'dungeon',
                    stage: Number(options.stage || waveNumber),
                    variantId: 'NORMAL',
                    qualityId: qualityRoll?.quality.id
                })[0];

            return {
                waveNumber,
                type: isBoss ? 'BOSS' : 'MONSTER',
                monster: {
                    ...monsterPlan,
                    qualityPoolId: qualityRoll?.pool.id || null
                }
            };
        });
    }

    createBossForRealm(realmCode, stage, options = {}) {
        const pool = Object.values(this.gameDataManager.getCollection('secretRealmBossPools') || {})
            .find((candidate) => candidate.realmCode === realmCode);
        if (!pool) {
            return this.monsterGeneratorService.createEncounter({
                realmCode,
                element: options.element,
                count: 1,
                mode: 'dungeon',
                stage,
                variantId: 'BOSS'
            })[0];
        }

        let roll = this.random() * pool.entries.reduce((total, entry) => total + entry.weight, 0);
        let selected = pool.entries.at(-1);
        for (const entry of pool.entries) {
            roll -= entry.weight;
            if (roll <= 0) {
                selected = entry;
                break;
            }
        }
        return this.monsterGeneratorService.createMonster(selected.monsterId, {
            variantId: 'BOSS',
            stage
        });
    }

    async recordProgress(playerId, waves, waveResults, outcome, options = {}) {
        if (typeof this.playerRuntimeRepository?.recordSecretRealmResult !== 'function') {
            return {
                status: 'NOT_PERSISTED',
                reason: 'REPOSITORY_METHOD_MISSING'
            };
        }

        return this.playerRuntimeRepository.recordSecretRealmResult(playerId, {
            outcome,
            waveCount: waves.length,
            clearedWaves: waveResults.filter((wave) => wave.outcome === 'VICTORY').length,
            bossMonsterId: waves[waves.length - 1]?.monster?.id || null,
            rewardTableId: waves[waves.length - 1]?.monster?.rewardTableId || null,
            activityRunId: options.activityRunId || null,
            completedAt: options.completedAt || new Date()
        }, { client: options.client });
    }

    resolveRealmCode(realmId) {
        const realm = this.gameDataManager.getRecord('realms', realmId);
        return realm?.code || null;
    }

    resolveElement(spiritualRoot) {
        return VALID_ELEMENTS.has(spiritualRoot) ? spiritualRoot : null;
    }

}
