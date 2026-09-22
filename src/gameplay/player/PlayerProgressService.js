import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import { normalizeRealmStage, resolveRequiredCultivation } from '../../core/RealmStageValue.js';

export default class PlayerProgressService {
    constructor(options = {}) {
        this.playerRuntimeRepository = options.playerRuntimeRepository;
        this.gameDataManager = options.gameDataManager || getGameDataManager();
    }

    async getProgressView(playerId) {
        const runtimePlayer = await this.playerRuntimeRepository?.findById(playerId);
        if (!runtimePlayer) {
            throw new Error('PLAYER_NOT_FOUND');
        }

        const summary = await this.loadProgressSummary(playerId);
        const realm = this.gameDataManager.getRecord('realms', runtimePlayer.realmId);
        const realmStage = normalizeRealmStage(
            runtimePlayer.realmStage,
            realm?.max_stage || realm?.maxStage
        );
        const nextRealm = this.resolveNextRealm(runtimePlayer.realmId);
        const sect = runtimePlayer.sectId
            ? this.gameDataManager.getRecord('sectTemplates', runtimePlayer.sectId)
            : null;

        return {
            playerId: runtimePlayer.playerId,
            name: runtimePlayer.name,
            realm: {
                id: runtimePlayer.realmId,
                code: realm?.code || null,
                name: realm?.name || `Realm ${runtimePlayer.realmId}`,
                stage: realmStage,
                cultivation: runtimePlayer.cultivation,
                requiredCultivation: resolveRequiredCultivation(realm, realmStage),
                nextRealm: nextRealm ? {
                    id: nextRealm.id,
                    code: nextRealm.code,
                    name: nextRealm.name,
                    requiredCultivation: resolveRequiredCultivation(nextRealm, 1)
                } : null
            },
            sect: sect ? {
                id: sect.id,
                name: sect.name,
                element: sect.element
            } : null,
            currencies: runtimePlayer.currencies,
            unlocks: this.createUnlockView(runtimePlayer),
            gameplay: summary,
            timestamps: {
                lastCultivateAt: runtimePlayer.progress.lastCultivateAt,
                lastTreasureHuntAt: runtimePlayer.progress.lastTreasureHuntAt
            }
        };
    }

    async loadProgressSummary(playerId) {
        if (typeof this.playerRuntimeRepository?.getProgressSummary !== 'function') {
            return {
                status: 'NOT_PERSISTED',
                reason: 'REPOSITORY_METHOD_MISSING'
            };
        }

        return this.playerRuntimeRepository.getProgressSummary(playerId);
    }

    resolveNextRealm(realmId) {
        const realms = Object.values(this.gameDataManager.getCollection('realms') || {})
            .sort((a, b) => Number(a.id || 0) - Number(b.id || 0));

        return realms.find((realm) => Number(realm.id || 0) > Number(realmId || 0)) || null;
    }

    createUnlockView(runtimePlayer) {
        return {
            exploration: true,
            secretRealm: this.isRealmUnlocked('LUYEN_KHI', runtimePlayer.realmId),
            shop: true,
            craft: this.hasCollectionRecords('craftTemplates'),
            exchange: this.hasCollectionRecords('exchangeTemplates'),
            gathering: this.hasCollectionRecords('gatheringTemplates'),
            sect: this.hasCollectionRecords('sectTemplates')
        };
    }

    hasCollectionRecords(collectionName) {
        return Object.keys(this.gameDataManager.getCollection(collectionName) || {}).length > 0;
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
