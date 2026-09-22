import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import ShopService from '../gameplay/shop/ShopService.js';
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
        name: 'Shopper',
        realmId: Number(overrides.realmId || 1),
        cultivationArtId: 'CP_FIRE_HOANG',
        spiritualRoot: 'FIRE',
        spiritStones: Number(overrides.spiritStones || 1000),
        cultivation: 0,
        baseAtk: 50,
        baseDef: 20,
        baseHp: 200,
        baseSpd: 8,
        lastCultivate: new Date(),
        inventory: [],
        skillIds: ['SK_FIRE_HOANG'],
        cultivationArtIds: ['CP_FIRE_HOANG']
    });
}

const args = parseArgs(process.argv.slice(2));
const shopId = args.shop || 'GENERAL';
const entryId = args.entry || 'SECRET_REALM_TICKET';
const gameDataManager = bootstrapGameData();
setGameDataManager(gameDataManager);

const runtimePlayer = createRuntimePlayer(args);
const playerRuntimeRepository = {
    async findById(playerId) {
        return playerId === runtimePlayer.playerId ? runtimePlayer : null;
    },
    async purchaseShopEntry(playerId, payload) {
        return {
            status: 'PURCHASED',
            purchaseId: 'sim-shop-purchase-1',
            playerId,
            inventoryId: 'sim-inventory-1',
            ...payload
        };
    }
};
const shopService = new ShopService({
    playerRuntimeRepository,
    gameDataManager
});

const shopView = await shopService.listShop(runtimePlayer.playerId, shopId);
const purchaseResult = await shopService.purchase(runtimePlayer.playerId, shopId, entryId);

console.log(JSON.stringify({
    shop: shopView,
    purchase: purchaseResult
}, null, 2));
