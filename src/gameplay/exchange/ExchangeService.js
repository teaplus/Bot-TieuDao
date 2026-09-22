import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import { compareIntegerAmounts, normalizeIntegerAmount } from '../../shared/numeric/IntegerAmount.js';
import IdempotentOperationExecutor from '../../platform/idempotency/IdempotentOperationExecutor.js';
import { createRequestHash } from '../../platform/idempotency/createRequestHash.js';
import PeriodKeyService from '../../platform/time/PeriodKeyService.js';

const CURRENCY_RUNTIME_KEYS = Object.freeze({
    SPIRIT_STONE: 'spiritStones',
    SECT_POINT: 'sectPoints',
    HONOR: 'honor',
    EVENT_POINT: 'eventPoints'
});

function getCurrencyRuntimeKey(currencyId) {
    return CURRENCY_RUNTIME_KEYS[currencyId] || null;
}

export default class ExchangeService {
    constructor(options = {}) {
        this.playerRuntimeRepository = options.playerRuntimeRepository;
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.operationExecutor = options.operationExecutor || new IdempotentOperationExecutor(options);
        const economyRules = this.gameDataManager.getCollection('economyRules') || {};
        this.periodKeyService = options.periodKeyService || new PeriodKeyService({
            timeZone: economyRules.timezone
        });
    }

    async listExchanges(playerId) {
        const runtimePlayer = await this.loadRuntimePlayer(playerId);
        const exchanges = Object.values(this.gameDataManager.getCollection('exchangeTemplates') || {});

        return {
            playerId,
            exchanges: exchanges.map((exchange) => this.createExchangeView(exchange, runtimePlayer))
        };
    }

    async exchange(playerId, exchangeId, options = {}) {
        const runtimePlayer = await this.loadRuntimePlayer(playerId);
        const exchangedAt = options.exchangedAt || new Date();
        return this.operationExecutor.execute({
            operationId: options.operationId,
            playerId,
            operationType: 'EXCHANGE',
            requestHash: createRequestHash({ operationType: 'EXCHANGE', playerId, exchangeId })
        }, async (client) => {
            const exchange = this.resolveExchange(exchangeId);
            const validation = this.validateExchange(exchange, runtimePlayer);

            if (!validation.available) {
                throw new Error(validation.reason);
            }

            if (!this.playerRuntimeRepository || typeof this.playerRuntimeRepository.exchangeTemplate !== 'function') {
                throw new Error('EXCHANGE_REPOSITORY_REQUIRED');
            }

            const exchanged = await this.playerRuntimeRepository.exchangeTemplate(playerId, {
                exchangeId: exchange.id,
                costs: exchange.costs,
                rewards: exchange.rewards,
                periodLimits: (exchange.limit || []).map((limit) => ({
                    counterType: 'EXCHANGE',
                    subjectId: exchange.id,
                    periodType: limit.periodType,
                    periodKey: limit.periodType === 'LIFETIME'
                        ? 'LIFETIME'
                        : this.periodKeyService.getKey(limit.periodType, exchangedAt),
                    increment: 1,
                    limit: limit.value
                })),
                exchangedAt
            }, { client, operationId: options.operationId });

            return {
                exchange: this.createExchangeView(exchange, runtimePlayer),
                result: exchanged
            };
        });
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

    resolveExchange(exchangeId) {
        const exchange = this.gameDataManager.getRecord('exchangeTemplates', exchangeId);
        if (!exchange) {
            throw new Error('EXCHANGE_NOT_FOUND');
        }

        return exchange;
    }

    createExchangeView(exchange, runtimePlayer) {
        const validation = this.validateExchange(exchange, runtimePlayer);

        return {
            id: exchange.id,
            name: exchange.name,
            description: exchange.description,
            requiredRealm: exchange.requiredRealm,
            limit: exchange.limit,
            costs: exchange.costs.map((cost) => this.createCostView(cost, runtimePlayer)),
            rewards: exchange.rewards.map((reward) => this.createRewardView(reward)),
            available: validation.available,
            unavailableReason: validation.available ? null : validation.reason
        };
    }

    createCostView(cost, runtimePlayer) {
        if (cost.currencyId) {
            const currency = this.gameDataManager.getRecord('currencies', cost.currencyId);

            return {
                type: 'CURRENCY',
                currencyId: cost.currencyId,
                currencyName: currency?.name || cost.currencyId,
                amount: cost.amount,
                owned: this.countCurrency(runtimePlayer, cost.currencyId)
            };
        }

        const item = this.gameDataManager.getRecord('itemTemplates', cost.itemId);

        return {
            type: 'ITEM',
            itemId: cost.itemId,
            itemName: item?.name || cost.itemId,
            quantity: cost.quantity,
            owned: this.countInventoryItem(runtimePlayer, cost.itemId)
        };
    }

    createRewardView(reward) {
        if (reward.currencyId) {
            const currency = this.gameDataManager.getRecord('currencies', reward.currencyId);

            return {
                type: 'CURRENCY',
                currencyId: reward.currencyId,
                currencyName: currency?.name || reward.currencyId,
                amount: reward.amount
            };
        }

        const item = this.gameDataManager.getRecord('itemTemplates', reward.itemId);

        return {
            type: 'ITEM',
            itemId: reward.itemId,
            itemName: item?.name || reward.itemId,
            quantity: reward.quantity
        };
    }

    validateExchange(exchange, runtimePlayer) {
        if (!this.isRealmUnlocked(exchange.requiredRealm, runtimePlayer.realmId)) {
            return {
                available: false,
                reason: 'REALM_LOCKED'
            };
        }

        for (const cost of exchange.costs) {
            const costValidation = this.validateCost(cost, runtimePlayer);
            if (!costValidation.available) {
                return costValidation;
            }
        }

        for (const reward of exchange.rewards) {
            const rewardValidation = this.validateReward(reward);
            if (!rewardValidation.available) {
                return rewardValidation;
            }
        }

        return {
            available: true,
            reason: null
        };
    }

    validateCost(cost, runtimePlayer) {
        if (cost.currencyId) {
            if (!this.gameDataManager.hasRecord('currencies', cost.currencyId)) {
                return {
                    available: false,
                    reason: 'UNSUPPORTED_CURRENCY'
                };
            }

            if (compareIntegerAmounts(this.countCurrency(runtimePlayer, cost.currencyId), cost.amount) < 0) {
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

        if (!this.gameDataManager.hasRecord('itemTemplates', cost.itemId)) {
            return {
                available: false,
                reason: 'ITEM_TEMPLATE_NOT_FOUND'
            };
        }

        if (this.countInventoryItem(runtimePlayer, cost.itemId) < cost.quantity) {
            return {
                available: false,
                reason: 'INSUFFICIENT_ITEM_COST'
            };
        }

        return {
            available: true,
            reason: null
        };
    }

    validateReward(reward) {
        if (reward.currencyId) {
            return {
                available: this.gameDataManager.hasRecord('currencies', reward.currencyId),
                reason: 'UNSUPPORTED_REWARD_CURRENCY'
            };
        }

        return {
            available: this.gameDataManager.hasRecord('itemTemplates', reward.itemId),
            reason: 'REWARD_ITEM_TEMPLATE_NOT_FOUND'
        };
    }

    countCurrency(runtimePlayer, currencyId) {
        const key = getCurrencyRuntimeKey(currencyId);
        return normalizeIntegerAmount(
            runtimePlayer.currencies?.[currencyId]
            ?? runtimePlayer.currencies?.[key]
            ?? 0
        );
    }

    countInventoryItem(runtimePlayer, itemId) {
        return runtimePlayer.inventory.runtimeItems
            .filter((entry) => entry.templateId === itemId)
            .reduce((total, entry) => total + Number(entry.quantity || 0), 0);
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
