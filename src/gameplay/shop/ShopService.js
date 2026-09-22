import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import { compareIntegerAmounts } from '../../shared/numeric/IntegerAmount.js';
import IdempotentOperationExecutor from '../../platform/idempotency/IdempotentOperationExecutor.js';
import { createRequestHash } from '../../platform/idempotency/createRequestHash.js';
import PeriodKeyService from '../../platform/time/PeriodKeyService.js';
import ShopCatalogService from './ShopCatalogService.js';

export default class ShopService {
    constructor(options = {}) {
        this.playerRuntimeRepository = options.playerRuntimeRepository;
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.operationExecutor = options.operationExecutor || new IdempotentOperationExecutor(options);
        const economyRules = this.gameDataManager.getCollection('economyRules') || {};
        this.periodKeyService = options.periodKeyService || new PeriodKeyService({
            timeZone: economyRules.timezone
        });
        const itemRules = this.gameDataManager.getCollection('itemRules') || {};
        this.inventoryCapacity = Number(itemRules.inventory?.defaultSlot || 0);
        this.playerMapService = options.playerMapService || null;
        this.mysteryMerchantService = options.mysteryMerchantService || null;
        this.catalogService = options.catalogService || new ShopCatalogService({
            gameDataManager: this.gameDataManager,
            periodKeyService: this.periodKeyService
        });
    }

    async listShop(playerId, shopId = 'GENERAL') {
        const runtimePlayer = await this.loadRuntimePlayer(playerId);
        const shop = this.resolveShop(shopId);

        return {
            shopId: shop.id,
            shopName: shop.name,
            entries: shop.entries.map((entry) => this.createEntryView(entry, runtimePlayer))
        };
    }

    async purchase(playerId, shopId, entryId, options = {}) {
        const runtimePlayer = await this.loadRuntimePlayer(playerId);
        const purchasedAt = options.purchasedAt || new Date();
        return this.operationExecutor.execute({
            operationId: options.operationId,
            playerId,
            operationType: 'SHOP_PURCHASE',
            requestHash: createRequestHash({ operationType: 'SHOP_PURCHASE', playerId, shopId, entryId })
        }, async (client) => {
            const shop = this.resolveShop(shopId);
            const entry = this.resolveEntry(shop, entryId);
            return this.purchaseResolved(client, playerId, runtimePlayer, shop, entry, {
                ...options, purchasedAt
            });
        });
    }

    async listArea(playerId, area = 'MAP', options = {}) {
        const runtimePlayer = await this.loadRuntimePlayer(playerId);
        const shop = await this.resolveAreaCatalog(playerId, area, options);
        const entries = await Promise.all(shop.entries.map(
            (entry) => this.createEntryViewWithLimit(playerId, shop, entry, runtimePlayer, options.now)
        ));
        return {
            shopId: shop.id,
            shopName: shop.name,
            shopType: shop.type,
            mapId: shop.mapId,
            mapName: shop.mapName,
            periodKey: shop.periodKey || null,
            expiresAt: shop.expiresAt || null,
            balance: runtimePlayer.currencies?.SPIRIT_STONE
                ?? runtimePlayer.currencies?.spiritStones
                ?? '0',
            entries
        };
    }

    async createEntryViewWithLimit(playerId, shop, entry, runtimePlayer, now = new Date()) {
        const view = this.createEntryView(entry, runtimePlayer);
        const limit = entry.purchaseLimit;
        if (!limit || typeof this.playerRuntimeRepository?.getShopPurchaseCounter !== 'function') return view;
        const periodKey = this.periodKeyService.getKey(limit.periodType, now || new Date());
        const used = await this.playerRuntimeRepository.getShopPurchaseCounter(playerId, {
            counterType: 'SHOP_PURCHASE',
            subjectId: `${shop.id}:${entry.id}`,
            periodType: limit.periodType,
            periodKey
        });
        const reached = BigInt(used) + BigInt(entry.quantity) > BigInt(limit.value);
        return {
            ...view,
            purchaseLimit: { ...limit, used, remaining: String(BigInt(limit.value) - BigInt(used)) },
            available: view.available && !reached,
            unavailableReason: reached ? 'SHOP_PURCHASE_LIMIT_REACHED' : view.unavailableReason
        };
    }

    async purchaseArea(playerId, area, entryId, options = {}) {
        const runtimePlayer = await this.loadRuntimePlayer(playerId);
        const purchasedAt = options.purchasedAt || new Date();
        const shop = await this.resolveAreaCatalog(playerId, area, { ...options, now: purchasedAt });
        return this.operationExecutor.execute({
            operationId: options.operationId,
            playerId,
            operationType: 'SHOP_PURCHASE',
            requestHash: createRequestHash({
                operationType: 'SHOP_PURCHASE', playerId, area,
                shopId: shop.id, entryId
            })
        }, async (client) => {
            const entry = this.resolveEntry(shop, entryId);
            return this.purchaseResolved(client, playerId, runtimePlayer, shop, entry, {
                ...options, purchasedAt
            });
        });
    }

    async purchaseResolved(client, playerId, runtimePlayer, shop, entry, options) {
            const validation = this.validateEntry(entry, runtimePlayer);

            if (!validation.available) {
                throw new Error(validation.reason);
            }

            if (!this.playerRuntimeRepository || typeof this.playerRuntimeRepository.purchaseShopEntry !== 'function') {
                throw new Error('SHOP_PURCHASE_REPOSITORY_REQUIRED');
            }

            const limit = entry.purchaseLimit || (entry.dailyLimit > 0
                ? { periodType: 'DAILY', value: entry.dailyLimit }
                : null);
            const purchased = await this.playerRuntimeRepository.purchaseShopEntry(playerId, {
                shopId: shop.id,
                entryId: entry.id,
                itemId: entry.itemId,
                quantity: entry.quantity,
                currencyId: entry.currencyId,
                price: entry.price,
                product: entry.product,
                inventoryCapacity: this.inventoryCapacity,
                sessionId: shop.sessionId || null,
                dailyLimit: entry.dailyLimit,
                periodLimit: limit ? {
                    counterType: 'SHOP_PURCHASE',
                    subjectId: `${shop.id}:${entry.id}`,
                    periodType: limit.periodType,
                    periodKey: this.periodKeyService.getKey(limit.periodType, options.purchasedAt),
                    increment: entry.quantity,
                    limit: limit.value
                } : null,
                purchasedAt: options.purchasedAt
            }, { client, operationId: options.operationId });

            return {
                shopId: shop.id,
                shopName: shop.name,
                entry: this.createEntryView(entry, runtimePlayer),
                purchase: purchased
            };
    }

    async resolveAreaCatalog(playerId, area, options = {}) {
        const normalized = String(area || 'MAP').toUpperCase();
        if (normalized === 'MYSTERY') {
            if (!this.mysteryMerchantService) throw new Error('MYSTERY_MERCHANT_SERVICE_REQUIRED');
            return this.mysteryMerchantService.getActiveCatalog(playerId, options.now || new Date());
        }
        if (!this.playerMapService) throw new Error('PLAYER_MAP_SERVICE_REQUIRED');
        const location = await this.playerMapService.getCurrentLocation(playerId);
        if (normalized === 'MAP') return this.catalogService.createMapCatalog(location.current);
        if (normalized === 'SPECIAL') {
            return this.catalogService.createSpecialCatalog(location.current, options.now || new Date());
        }
        throw new Error(`SHOP_AREA_UNSUPPORTED:${normalized}`);
    }

    async loadRuntimePlayer(playerId, client = null) {
        const runtimePlayer = await this.playerRuntimeRepository?.findById(playerId, {
            client: client || undefined
        });
        if (!runtimePlayer) {
            throw new Error('PLAYER_NOT_FOUND');
        }

        return runtimePlayer;
    }

    resolveShop(shopId) {
        const shop = this.gameDataManager.getRecord('shopTemplates', shopId);
        if (!shop) {
            throw new Error('SHOP_NOT_FOUND');
        }

        return shop;
    }

    resolveEntry(shop, entryId) {
        const entry = shop.entries.find((shopEntry) => shopEntry.id === entryId);
        if (!entry) {
            throw new Error('SHOP_ENTRY_NOT_FOUND');
        }

        return entry;
    }

    createEntryView(entry, runtimePlayer) {
        const item = this.gameDataManager.getRecord('itemTemplates', entry.product.templateId);
        const validation = this.validateEntry(entry, runtimePlayer);

        return {
            id: entry.id,
            product: Object.freeze({
                ...entry.product,
                snapshot: entry.product.snapshot
                    ? Object.freeze({ ...entry.product.snapshot })
                    : null
            }),
            productKind: entry.product.kind,
            itemId: entry.product.templateId,
            itemName: entry.product.snapshot?.generatedName || item?.name || entry.product.templateId,
            itemRarity: item?.rarity || null,
            itemType: item?.type || null,
            itemDescription: item?.description || '',
            currencyId: entry.currencyId,
            price: entry.price,
            quantity: entry.quantity,
            dailyLimit: entry.dailyLimit,
            purchaseLimit: entry.purchaseLimit || null,
            stockRemaining: entry.stockRemaining ?? null,
            requiredRealm: entry.requiredRealm,
            available: validation.available,
            unavailableReason: validation.available ? null : validation.reason
        };
    }

    validateEntry(entry, runtimePlayer) {
        const product = entry.product;
        const item = this.gameDataManager.getRecord('itemTemplates', product.templateId);
        if (!item) {
            return {
                available: false,
                reason: 'ITEM_TEMPLATE_NOT_FOUND'
            };
        }
        if (entry.stockRemaining != null && Number(entry.stockRemaining) <= 0) {
            return { available: false, reason: 'SHOP_ENTRY_SOLD_OUT' };
        }

        if (!['ITEM', 'CULTIVATION_ART_BOOK', 'SKILL_BOOK', 'EQUIPMENT'].includes(product.kind)) {
            return { available: false, reason: 'SHOP_PRODUCT_KIND_UNSUPPORTED' };
        }

        if (product.kind === 'EQUIPMENT' && item.type !== 'EQUIPMENT') {
            return { available: false, reason: 'SHOP_PRODUCT_TEMPLATE_MISMATCH' };
        }

        if (product.kind === 'CULTIVATION_ART_BOOK'
            && (item.type !== 'CULTIVATION_ART' || this.isProductOwned(product, item, runtimePlayer))) {
            return {
                available: false,
                reason: item.type !== 'CULTIVATION_ART'
                    ? 'SHOP_PRODUCT_TEMPLATE_MISMATCH'
                    : 'SHOP_PRODUCT_ALREADY_OWNED'
            };
        }

        if (product.kind === 'SKILL_BOOK'
            && (item.type !== 'SKILL_BOOK' || this.isProductOwned(product, item, runtimePlayer))) {
            return {
                available: false,
                reason: item.type !== 'SKILL_BOOK'
                    ? 'SHOP_PRODUCT_TEMPLATE_MISMATCH'
                    : 'SHOP_PRODUCT_ALREADY_OWNED'
            };
        }

        if (!this.isRealmUnlocked(entry.requiredRealm, runtimePlayer.realmId)) {
            return {
                available: false,
                reason: 'REALM_LOCKED'
            };
        }

        if (!this.gameDataManager.hasRecord('currencies', entry.currencyId)) {
            return {
                available: false,
                reason: 'UNSUPPORTED_CURRENCY'
            };
        }

        const balance = runtimePlayer.currencies?.[entry.currencyId]
            ?? (entry.currencyId === 'SPIRIT_STONE' ? runtimePlayer.currencies?.spiritStones : 0)
            ?? 0;
        if (compareIntegerAmounts(balance, entry.price) < 0) {
            return {
                available: false,
                reason: 'INSUFFICIENT_CURRENCY'
            };
        }

        return {
            available: true,
            reason: null
        };
    }

    isProductOwned(product, item, runtimePlayer) {
        const inventoryOwned = runtimePlayer.inventory?.getAllEntries?.().some(
            (entry) => entry.templateId === product.templateId
        );
        if (inventoryOwned) return true;
        if (product.kind === 'CULTIVATION_ART_BOOK') {
            return runtimePlayer.cultivationArtIds.includes(item.artId || product.templateId);
        }
        if (product.kind === 'SKILL_BOOK') {
            return runtimePlayer.learnedSkillIds.includes(item.skillId);
        }
        return false;
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
