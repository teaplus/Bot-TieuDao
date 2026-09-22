import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import GatheringCompletionService from './GatheringCompletionService.js';
import PeriodCounterRepository from '../../repositories/PeriodCounterRepository.js';
import PeriodKeyService from '../../platform/time/PeriodKeyService.js';
import SystemTimeProvider from '../../platform/time/SystemTimeProvider.js';
import ActivityRunRepository from '../../repositories/ActivityRunRepository.js';

const ACTIVITY_TYPE = 'GATHERING';
const DIRECT_UNIT_OF_WORK = Object.freeze({ execute: (work) => work(null) });

export default class GatheringService {
    constructor(options = {}) {
        this.playerRuntimeRepository = options.playerRuntimeRepository;
        this.playerMapService = options.playerMapService || null;
        this.unitOfWork = options.unitOfWork || DIRECT_UNIT_OF_WORK;
        this.activityRunRepository = options.activityRunRepository || new ActivityRunRepository();
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.completionService = options.completionService || new GatheringCompletionService({
            ...options,
            gameDataManager: this.gameDataManager,
            playerRuntimeRepository: this.playerRuntimeRepository,
            playerMapService: this.playerMapService,
            activityRunRepository: this.activityRunRepository
        });
        this.periodCounterRepository = options.periodCounterRepository || new PeriodCounterRepository();
        this.periodCounterDatabase = options.periodCounterDatabase || null;
        this.timeProvider = options.timeProvider || new SystemTimeProvider();
        const economyRules = this.gameDataManager.getCollection('economyRules') || {};
        this.periodKeyService = options.periodKeyService || new PeriodKeyService({
            timeZone: economyRules.timezone
        });
    }

    async listGatherings(playerId) {
        const dashboard = await this.getDashboard(playerId);
        return { playerId, gatherings: dashboard.gatherings };
    }

    async gather(playerId, gatheringId, options = {}) {
        throw new Error('GATHERING_START_CLAIM_REQUIRED');
    }

    async start(playerId, gatheringId, options = {}) {
        return this.completionService.start(playerId, gatheringId, options);
    }

    async claim(playerId, runId, options = {}) {
        return this.completionService.claim(playerId, runId, options);
    }

    async getDashboard(playerId) {
        return this.unitOfWork.execute(async (client) => {
            const runtimePlayer = await this.loadRuntimePlayer(playerId, client);
            if (!this.playerMapService?.resolveCurrentMap) {
                throw new Error('GATHERING_MAP_SERVICE_REQUIRED');
            }
            const resolvedMap = await this.playerMapService.resolveCurrentMap(client, runtimePlayer);
            const gatherings = Object.values(
                this.gameDataManager.getCollection('gatheringTemplates') || {}
            ).filter((gathering) => gathering.mapId === resolvedMap.map.id);
            const views = [];
            for (const gathering of gatherings) {
                views.push(await this.createGatheringView(gathering, runtimePlayer));
            }
            const activeRun = await this.activityRunRepository.findActive(client, {
                playerId,
                activityType: ACTIVITY_TYPE
            });
            const now = this.timeProvider.now();
            return {
                playerId,
                currentMap: resolvedMap.map,
                resourceTier: Number(resolvedMap.map.navigationOrder),
                gatherings: views,
                activeRun: activeRun ? {
                    ...activeRun,
                    computedStatus: activeRun.readyAt
                        && new Date(now).getTime() >= new Date(activeRun.readyAt).getTime()
                        ? 'READY'
                        : 'IN_PROGRESS',
                    gathering: this.gameDataManager.getRecord(
                        'gatheringTemplates',
                        activeRun.contentId
                    )
                } : null
            };
        });
    }

    async loadRuntimePlayer(playerId, client = null, forUpdate = false) {
        const runtimePlayer = await this.playerRuntimeRepository?.findById(playerId, {
            client,
            forUpdate
        });
        if (!runtimePlayer) {
            throw new Error('PLAYER_NOT_FOUND');
        }

        return runtimePlayer;
    }

    resolveGathering(gatheringId) {
        const gathering = this.gameDataManager.getRecord('gatheringTemplates', gatheringId);
        if (!gathering) {
            throw new Error('GATHERING_NOT_FOUND');
        }

        return gathering;
    }

    async createGatheringView(gathering, runtimePlayer) {
        const validation = await this.validateGathering(gathering, runtimePlayer);
        const rewardTable = this.gameDataManager.getRecord('rewardTables', gathering.rewardTableId);

        return {
            id: gathering.id,
            name: gathering.name,
            requiredRealm: gathering.requiredRealm,
            duration: gathering.duration,
            dailyLimit: gathering.dailyLimit,
            rewardTableId: gathering.rewardTableId,
            rewardTableName: rewardTable?.name || gathering.rewardTableId,
            mapId: gathering.mapId,
            resourceFamily: gathering.resourceFamily,
            resourceTier: gathering.resourceTier,
            resources: (this.gameDataManager.getRecord(
                'mapGatheringPools',
                gathering.rewardTableId
            )?.entries || []).map((entry) => {
                const item = this.gameDataManager.getRecord('itemTemplates', entry.itemId);
                return {
                    ...entry,
                    name: item?.name || entry.itemId,
                    description: item?.description || ''
                };
            }),
            available: validation.available,
            unavailableReason: validation.available ? null : validation.reason,
            todayRuns: validation.todayRuns
        };
    }

    async validateGathering(gathering, runtimePlayer) {
        if (!this.gameDataManager.hasRecord('rewardTables', gathering.rewardTableId)) {
            return {
                available: false,
                reason: 'REWARD_TABLE_NOT_FOUND',
                todayRuns: 0
            };
        }

        if (!this.isRealmUnlocked(gathering.requiredRealm, runtimePlayer.realmId)) {
            return {
                available: false,
                reason: 'REALM_LOCKED',
                todayRuns: 0
            };
        }

        const todayRuns = await this.countTodayRuns(runtimePlayer.playerId, gathering);
        if (gathering.dailyLimit > 0 && todayRuns >= gathering.dailyLimit) {
            return {
                available: false,
                reason: 'DAILY_LIMIT_REACHED',
                todayRuns
            };
        }

        return {
            available: true,
            reason: null,
            todayRuns
        };
    }

    async countTodayRuns(playerId, gathering) {
        if (gathering.dailyLimit <= 0) {
            return 0;
        }
        if (!this.periodCounterDatabase) {
            throw new Error('GATHERING_PERIOD_COUNTER_DATABASE_REQUIRED');
        }

        return Number(await this.periodCounterRepository.getValue(this.periodCounterDatabase, {
            playerId,
            counterType: 'GATHERING_COMPLETION',
            subjectId: gathering.id,
            periodType: 'DAILY',
            periodKey: this.periodKeyService.getKey('DAILY', this.timeProvider.now())
        }));
    }

    isRealmUnlocked(requiredRealmCode, playerRealmId) {
        if (!requiredRealmCode) {
            return true;
        }

        const realms = Object.values(this.gameDataManager.getCollection('realms') || {});
        const requiredRealm = realms.find((realm) => realm.code === requiredRealmCode);
        if (!requiredRealm) {
            return false;
        }

        return Number(playerRealmId || 0) >= Number(requiredRealm.id || 0);
    }
}
