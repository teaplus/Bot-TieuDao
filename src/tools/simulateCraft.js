import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import CraftService from '../gameplay/craft/CraftService.js';
import RuntimePlayerFactory from '../runtime/player/RuntimePlayerFactory.js';

function parseArgs(argv) {
    const args = {};

    for (const arg of argv) {
        const [key, value] = arg.replace(/^--/, '').split('=');
        args[key] = value ?? true;
    }

    return args;
}

function createRuntimePlayer(overrides = {}) {
    return new RuntimePlayerFactory().create({
        playerId: 'sim-player',
        name: 'Crafter',
        realmId: Number(overrides.realmId || 1),
        cultivationArtId: 'CP_FIRE_HOANG',
        spiritualRoot: 'FIRE',
        spiritStones: Number(overrides.spiritStones ?? 100),
        cultivation: 0,
        baseAtk: 50,
        baseDef: 20,
        baseHp: 200,
        baseSpd: 8,
        lastCultivate: new Date(),
        inventory: [
            {
                instanceId: 'sim-spirit-herb-1',
                itemId: 'SPIRIT_HERB',
                quantity: Number(overrides.herbs ?? 10),
                rarity: 'COMMON',
                instanceData: {}
            }
        ],
        skillIds: ['SK_FIRE_HOANG'],
        cultivationArtIds: ['CP_FIRE_HOANG']
    });
}

const args = parseArgs(process.argv.slice(2));
const recipeId = args.recipe || 'CRAFT_BREAKTHROUGH_PILL';
const gameDataManager = bootstrapGameData();
setGameDataManager(gameDataManager);

const runtimePlayer = createRuntimePlayer(args);
const playerRuntimeRepository = {
    async findById(playerId) {
        return playerId === runtimePlayer.playerId ? runtimePlayer : null;
    },
    async craftRecipe(playerId, payload) {
        return {
            status: 'CRAFTED',
            craftId: 'sim-craft-1',
            playerId,
            inventoryId: 'sim-result-item-1',
            consumedMaterials: payload.materials,
            currencyId: payload.costCurrency.currencyId,
            currencyCost: payload.costCurrency.amount,
            ...payload
        };
    }
};
const craftService = new CraftService({
    playerRuntimeRepository,
    gameDataManager
});

const recipeView = await craftService.listRecipes(runtimePlayer.playerId);
let immediateCraftError = null;
try {
    await craftService.craft(runtimePlayer.playerId, recipeId);
} catch (error) {
    immediateCraftError = error.message;
}

console.log(JSON.stringify({
    recipes: recipeView,
    runtimeContract: 'LAZY_START_CLAIM',
    immediateCraftError
}, null, 2));
