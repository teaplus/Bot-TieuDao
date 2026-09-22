import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import { compareIntegerAmounts } from '../../shared/numeric/IntegerAmount.js';

export default class CraftService {
    constructor(options = {}) {
        this.playerRuntimeRepository = options.playerRuntimeRepository;
        this.gameDataManager = options.gameDataManager || getGameDataManager();
    }

    async listRecipes(playerId) {
        const runtimePlayer = await this.loadRuntimePlayer(playerId);
        const recipes = Object.values(this.gameDataManager.getCollection('craftTemplates') || {});

        return {
            playerId,
            recipes: recipes.map((recipe) => this.createRecipeView(recipe, runtimePlayer))
        };
    }

    async craft(playerId, recipeId, options = {}) {
        throw new Error('CRAFT_START_CLAIM_REQUIRED');
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

    resolveRecipe(recipeId) {
        const recipe = this.gameDataManager.getRecord('craftTemplates', recipeId);
        if (!recipe) {
            throw new Error('CRAFT_RECIPE_NOT_FOUND');
        }

        return recipe;
    }

    createRecipeView(recipe, runtimePlayer) {
        const resultItem = this.gameDataManager.getRecord('itemTemplates', recipe.resultItemId);
        const validation = this.validateRecipe(recipe, runtimePlayer);

        return {
            id: recipe.id,
            name: recipe.name,
            resultItemId: recipe.resultItemId,
            resultItemName: resultItem?.name || recipe.resultItemId,
            resultQuantity: recipe.resultQuantity,
            requiredRealm: recipe.requiredRealm,
            costCurrency: recipe.costCurrency,
            materials: recipe.materials.map((material) => {
                const item = this.gameDataManager.getRecord('itemTemplates', material.itemId);

                return {
                    itemId: material.itemId,
                    itemName: item?.name || material.itemId,
                    quantity: material.quantity,
                    owned: this.countInventoryItem(runtimePlayer, material.itemId)
                };
            }),
            available: validation.available,
            unavailableReason: validation.available ? null : validation.reason
        };
    }

    validateRecipe(recipe, runtimePlayer) {
        if (!this.gameDataManager.hasRecord('itemTemplates', recipe.resultItemId)) {
            return {
                available: false,
                reason: 'ITEM_TEMPLATE_NOT_FOUND'
            };
        }

        if (!this.isRealmUnlocked(recipe.requiredRealm, runtimePlayer.realmId)) {
            return {
                available: false,
                reason: 'REALM_LOCKED'
            };
        }

        if (!this.gameDataManager.hasRecord('currencies', recipe.costCurrency.currencyId)) {
            return {
                available: false,
                reason: 'UNSUPPORTED_CURRENCY'
            };
        }

        const balance = runtimePlayer.currencies?.[recipe.costCurrency.currencyId]
            ?? (recipe.costCurrency.currencyId === 'SPIRIT_STONE' ? runtimePlayer.currencies?.spiritStones : 0)
            ?? 0;
        if (compareIntegerAmounts(balance, recipe.costCurrency.amount) < 0) {
            return {
                available: false,
                reason: 'INSUFFICIENT_CURRENCY'
            };
        }

        for (const material of recipe.materials) {
            if (!this.gameDataManager.hasRecord('itemTemplates', material.itemId)) {
                return {
                    available: false,
                    reason: 'MATERIAL_TEMPLATE_NOT_FOUND'
                };
            }

            if (this.countInventoryItem(runtimePlayer, material.itemId) < material.quantity) {
                return {
                    available: false,
                    reason: 'INSUFFICIENT_MATERIAL'
                };
            }
        }

        return {
            available: true,
            reason: null
        };
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
