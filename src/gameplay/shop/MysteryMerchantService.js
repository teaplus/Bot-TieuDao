import pool from '../../database/postgres.js';
import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import ShopSessionRepository from '../../repositories/ShopSessionRepository.js';
import ShopCatalogService from './ShopCatalogService.js';

export default class MysteryMerchantService {
    constructor(options = {}) {
        this.database = options.database || pool;
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.repository = options.repository || new ShopSessionRepository();
        this.catalogService = options.catalogService || new ShopCatalogService({
            gameDataManager: this.gameDataManager
        });
        this.rules = this.gameDataManager.getCollection('shopRules');
    }

    async createInTransaction(client, payload) {
        const map = this.gameDataManager.requireRecord('maps', payload.mapId);
        const catalog = this.catalogService.createMysteryCatalog(map, payload.seed);
        const createdAt = payload.createdAt || new Date();
        const expiresAt = new Date(
            createdAt.getTime() + this.rules.mysteryMerchant.ttlSeconds * 1000
        );
        return this.repository.create(client, {
            sessionId: `merchant:${payload.activityRunId}`,
            playerId: payload.playerId,
            sourceType: 'EXPLORATION',
            sourceRef: payload.activityRunId,
            mapId: map.id,
            rulesRevision: this.rules.version,
            seed: payload.seed,
            createdAt,
            expiresAt,
            entries: catalog.entries
        });
    }

    async getActive(playerId, now = new Date()) {
        return this.repository.findActive(this.database, playerId, now);
    }

    async getActiveCatalog(playerId, now = new Date()) {
        const session = await this.getActive(playerId, now);
        if (!session) throw new Error('SHOP_SESSION_NOT_FOUND');
        const map = this.gameDataManager.requireRecord('maps', session.mapId);
        return {
            id: `MYSTERY:${session.sessionId}`,
            type: 'MYSTERY',
            name: 'Thương Nhân Thần Bí',
            sessionId: session.sessionId,
            mapId: map.id,
            mapName: map.name,
            expiresAt: session.expiresAt,
            entries: session.entries.map((entry) => ({
                id: entry.entryId,
                product: entry.product,
                costs: entry.costs,
                itemId: entry.product.templateId,
                currencyId: entry.costs[0].currencyId,
                price: entry.costs[0].amount,
                quantity: Number(entry.product.quantity || 1),
                dailyLimit: 0,
                purchaseLimit: null,
                requiredRealm: map.realmCode,
                stockRemaining: entry.stockRemaining
            }))
        };
    }
}
