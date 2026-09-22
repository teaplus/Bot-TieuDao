import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import IdempotentOperationExecutor from '../../platform/idempotency/IdempotentOperationExecutor.js';
import { createRequestHash } from '../../platform/idempotency/createRequestHash.js';
import SecureSeedProvider from '../../platform/random/SecureSeedProvider.js';
import createSeededRandom from '../../platform/random/createSeededRandom.js';
import PeriodKeyService from '../../platform/time/PeriodKeyService.js';
import SystemTimeProvider from '../../platform/time/SystemTimeProvider.js';
import EconomyActivityRepository from '../../repositories/EconomyActivityRepository.js';
import PeriodCounterRepository from '../../repositories/PeriodCounterRepository.js';
import PlayerWalletRepository from '../../repositories/PlayerWalletRepository.js';
import ResourceLedgerRepository from '../../repositories/ResourceLedgerRepository.js';
import RewardClaimRepository from '../../repositories/RewardClaimRepository.js';
import { normalizeIntegerAmount } from '../../shared/numeric/IntegerAmount.js';

const BASIS_POINTS = 10000n;

function multiplyBasisPoints(amount, basisPoints) {
    return ((BigInt(normalizeIntegerAmount(amount)) * BigInt(basisPoints)) / BASIS_POINTS).toString();
}

function rollIntegerAmount(minimum, maximum, random) {
    const min = BigInt(normalizeIntegerAmount(minimum));
    const max = BigInt(normalizeIntegerAmount(maximum));
    const span = max - min + 1n;
    if (span <= 0n || span > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error('ECONOMY_REWARD_RANGE_UNSUPPORTED');
    }
    return (min + BigInt(Math.floor(random() * Number(span)))).toString();
}

export default class EconomyActivityService {
    constructor(options = {}) {
        this.playerRuntimeRepository = options.playerRuntimeRepository;
        this.playerMapService = options.playerMapService;
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.unitOfWork = options.unitOfWork;
        this.operationExecutor = options.operationExecutor || new IdempotentOperationExecutor(options);
        this.walletRepository = options.walletRepository || new PlayerWalletRepository();
        this.periodCounterRepository = options.periodCounterRepository || new PeriodCounterRepository();
        this.rewardClaimRepository = options.rewardClaimRepository || new RewardClaimRepository();
        this.resourceLedgerRepository = options.resourceLedgerRepository || new ResourceLedgerRepository();
        this.activityRepository = options.activityRepository || new EconomyActivityRepository();
        this.periodKeyService = options.periodKeyService || new PeriodKeyService({
            timeZone: this.gameDataManager.getCollection('economyRules')?.timezone
        });
        this.timeProvider = options.timeProvider || new SystemTimeProvider();
        this.seedProvider = options.seedProvider || new SecureSeedProvider();
    }

    requireActivity(activityId, expectedType) {
        const activity = this.gameDataManager.getRecord('earningActivities', activityId);
        if (!activity || (expectedType && activity.type !== expectedType)) {
            throw new Error('ECONOMY_ACTIVITY_NOT_FOUND');
        }
        return activity;
    }

    resolveMapBasePrice(mapId) {
        const entry = this.gameDataManager.getCollection('shopRules')
            ?.pricePolicy?.mapBasePrices?.find((candidate) => candidate.mapId === mapId);
        if (!entry) throw new Error('ECONOMY_MAP_BASE_PRICE_NOT_FOUND');
        return normalizeIntegerAmount(entry.amount);
    }

    async loadContext(client, playerId) {
        const runtimePlayer = await this.playerRuntimeRepository?.findById(playerId, {
            client,
            forUpdate: true,
            includeGuest: true
        });
        if (!runtimePlayer) throw new Error('PLAYER_NOT_FOUND');
        if (!this.playerMapService) throw new Error('PLAYER_MAP_SERVICE_REQUIRED');
        const location = await this.playerMapService.resolveCurrentMap(client, runtimePlayer);
        return {
            runtimePlayer,
            map: location.map,
            mapBasePrice: this.resolveMapBasePrice(location.map.id)
        };
    }

    async getOverview(playerId, options = {}) {
        if (!this.unitOfWork) throw new Error('UNIT_OF_WORK_REQUIRED');
        const now = options.now || this.timeProvider.now();
        return this.unitOfWork.execute(async (client) => {
            const context = await this.loadContext(client, playerId);
            const periodKey = this.periodKeyService.getKey('DAILY', now);
            const daily = this.requireActivity('DAILY_SPIRIT_STONE', 'DAILY');
            const work = this.requireActivity('WORK_SPIRIT_STONE', 'WORK');
            const dailySourceRef = `${daily.id}:${periodKey}`;
            const [dailyClaim, workCount, latestWork] = await Promise.all([
                this.rewardClaimRepository.findByBusinessKey(client, {
                    playerId, claimType: 'DAILY_ECONOMY', sourceRef: dailySourceRef
                }),
                this.periodCounterRepository.getValue(client, {
                    playerId,
                    counterType: 'ECONOMY_ACTIVITY',
                    subjectId: work.id,
                    periodType: 'DAILY',
                    periodKey
                }),
                this.activityRepository.findLatestRun(client, playerId, work.id)
            ]);
            const nextWorkAt = latestWork
                ? new Date(new Date(latestWork.completedAt).getTime() + work.cooldownSeconds * 1000)
                : null;
            return {
                playerId,
                mapId: context.map.id,
                mapName: context.map.name,
                mapBasePrice: context.mapBasePrice,
                balance: context.runtimePlayer.currencies?.SPIRIT_STONE || '0',
                periodKey,
                daily: {
                    activity: daily,
                    rewardAmount: multiplyBasisPoints(
                        context.mapBasePrice,
                        daily.rewardMultiplierBasisPoints
                    ),
                    available: !dailyClaim,
                    claimedAt: dailyClaim?.claimedAt || null
                },
                work: {
                    activity: work,
                    rewardMin: multiplyBasisPoints(
                        context.mapBasePrice,
                        work.rewardMinMultiplierBasisPoints
                    ),
                    rewardMax: multiplyBasisPoints(
                        context.mapBasePrice,
                        work.rewardMaxMultiplierBasisPoints
                    ),
                    completedToday: workCount,
                    remainingToday: Math.max(0, work.periodLimit - Number(workCount)),
                    nextAvailableAt: nextWorkAt,
                    available: Number(workCount) < work.periodLimit
                        && (!nextWorkAt || nextWorkAt.getTime() <= now.getTime())
                }
            };
        });
    }

    async claimDaily(playerId, options = {}) {
        if (!options.operationId) throw new Error('DAILY_OPERATION_ID_REQUIRED');
        const completedAt = options.completedAt || this.timeProvider.now();
        const periodKey = this.periodKeyService.getKey('DAILY', completedAt);
        const activity = this.requireActivity('DAILY_SPIRIT_STONE', 'DAILY');
        return this.operationExecutor.execute({
            operationId: options.operationId,
            playerId,
            operationType: 'DAILY_ECONOMY_CLAIM',
            requestHash: createRequestHash({
                operationType: 'DAILY_ECONOMY_CLAIM', playerId, periodKey, activityId: activity.id
            })
        }, async (client) => {
            const context = await this.loadContext(client, playerId);
            const sourceRef = `${activity.id}:${periodKey}`;
            if (await this.rewardClaimRepository.findByBusinessKey(client, {
                playerId, claimType: 'DAILY_ECONOMY', sourceRef
            })) {
                throw new Error('DAILY_ALREADY_CLAIMED');
            }
            const rewardAmount = multiplyBasisPoints(
                context.mapBasePrice,
                activity.rewardMultiplierBasisPoints
            );
            const rewardSnapshot = [{
                type: 'CURRENCY', currencyId: 'SPIRIT_STONE', amount: rewardAmount
            }];
            const claim = await this.rewardClaimRepository.create(client, {
                playerId,
                claimType: 'DAILY_ECONOMY',
                sourceRef,
                operationId: options.operationId,
                rolledRewardSnapshot: rewardSnapshot,
                claimedAt: completedAt
            });
            const balance = await this.walletRepository.credit(client, {
                playerId, currencyId: 'SPIRIT_STONE', amount: rewardAmount
            });
            await this.resourceLedgerRepository.record(client, {
                playerId,
                resourceType: 'CURRENCY',
                resourceId: 'SPIRIT_STONE',
                delta: rewardAmount,
                balanceAfter: balance,
                reason: 'DAILY_ECONOMY_REWARD',
                referenceType: 'REWARD_CLAIM',
                referenceId: claim.claimId,
                operationId: options.operationId,
                createdAt: completedAt
            });
            return {
                status: 'DAILY_CLAIMED',
                activityId: activity.id,
                activityName: activity.name,
                mapId: context.map.id,
                mapName: context.map.name,
                periodKey,
                rewardAmount,
                balance,
                claimedAt: claim.claimedAt
            };
        });
    }

    async work(playerId, options = {}) {
        if (!options.operationId) throw new Error('WORK_OPERATION_ID_REQUIRED');
        const completedAt = options.completedAt || this.timeProvider.now();
        const periodKey = this.periodKeyService.getKey('DAILY', completedAt);
        const activity = this.requireActivity('WORK_SPIRIT_STONE', 'WORK');
        return this.operationExecutor.execute({
            operationId: options.operationId,
            playerId,
            operationType: 'ECONOMY_WORK',
            requestHash: createRequestHash({
                operationType: 'ECONOMY_WORK', playerId, periodKey, activityId: activity.id
            })
        }, async (client) => {
            const context = await this.loadContext(client, playerId);
            const latest = await this.activityRepository.findLatestRun(
                client, playerId, activity.id, { forUpdate: true }
            );
            if (latest) {
                const nextAvailableAt = new Date(
                    new Date(latest.completedAt).getTime() + activity.cooldownSeconds * 1000
                );
                if (nextAvailableAt.getTime() > completedAt.getTime()) {
                    const error = new Error('WORK_COOLDOWN_ACTIVE');
                    error.nextAvailableAt = nextAvailableAt;
                    throw error;
                }
            }
            const completedToday = await this.periodCounterRepository.incrementWithinLimit(client, {
                playerId,
                counterType: 'ECONOMY_ACTIVITY',
                subjectId: activity.id,
                periodType: 'DAILY',
                periodKey,
                increment: 1,
                limit: activity.periodLimit,
                errorCode: 'WORK_DAILY_LIMIT_REACHED'
            });
            const rollSeed = options.rollSeed ?? this.seedProvider.nextSeed();
            const random = createSeededRandom(rollSeed);
            const rewardMin = multiplyBasisPoints(
                context.mapBasePrice,
                activity.rewardMinMultiplierBasisPoints
            );
            const rewardMax = multiplyBasisPoints(
                context.mapBasePrice,
                activity.rewardMaxMultiplierBasisPoints
            );
            const rewardAmount = rollIntegerAmount(rewardMin, rewardMax, random);
            const flavorIndex = Math.floor(random() * activity.flavors.length);
            const workName = activity.flavors[flavorIndex] || activity.flavors[0];
            const run = await this.activityRepository.recordRun(client, {
                playerId,
                activityId: activity.id,
                operationId: options.operationId,
                rulesRevision: this.gameDataManager.getCollection('earningActivityPolicy').revision,
                periodKey,
                mapId: context.map.id,
                rewardAmount,
                rollSeed,
                outcomeSnapshot: { workName, rewardMin, rewardMax },
                completedAt
            });
            const balance = await this.walletRepository.credit(client, {
                playerId, currencyId: 'SPIRIT_STONE', amount: rewardAmount
            });
            await this.resourceLedgerRepository.record(client, {
                playerId,
                resourceType: 'CURRENCY',
                resourceId: 'SPIRIT_STONE',
                delta: rewardAmount,
                balanceAfter: balance,
                reason: 'ECONOMY_WORK_REWARD',
                referenceType: 'ECONOMY_ACTIVITY_RUN',
                referenceId: run.runId,
                operationId: options.operationId,
                createdAt: completedAt
            });
            return {
                status: 'WORK_COMPLETED',
                activityId: activity.id,
                workName,
                mapId: context.map.id,
                mapName: context.map.name,
                periodKey,
                rewardAmount,
                rewardRange: { min: rewardMin, max: rewardMax },
                completedToday,
                remainingToday: Math.max(0, activity.periodLimit - Number(completedToday)),
                nextAvailableAt: new Date(completedAt.getTime() + activity.cooldownSeconds * 1000),
                balance,
                rollSeed
            };
        });
    }
}
