import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import ExchangeService from '../gameplay/exchange/ExchangeService.js';
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
        name: 'Exchanger',
        realmId: Number(overrides.realmId || 1),
        cultivationArtId: 'CP_FIRE_HOANG',
        spiritualRoot: 'FIRE',
        spiritStones: Number(overrides.spiritStones ?? 100),
        sectPoints: Number(overrides.sectPoints ?? 300),
        honor: Number(overrides.honor ?? 0),
        eventPoints: Number(overrides.eventPoints ?? 0),
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
const exchangeId = args.exchange || 'SECT_BREAKTHROUGH';
const gameDataManager = bootstrapGameData();
setGameDataManager(gameDataManager);

const runtimePlayer = createRuntimePlayer(args);
const playerRuntimeRepository = {
    async findById(playerId) {
        return playerId === runtimePlayer.playerId ? runtimePlayer : null;
    },
    async exchangeTemplate(playerId, payload) {
        return {
            status: 'EXCHANGED',
            exchangeLogId: 'sim-exchange-1',
            playerId,
            consumed: {
                currencies: payload.costs.filter((cost) => cost.currencyId),
                items: payload.costs.filter((cost) => cost.itemId)
            },
            rewards: payload.rewards,
            ...payload
        };
    }
};
const exchangeService = new ExchangeService({
    playerRuntimeRepository,
    gameDataManager
});

const exchangeView = await exchangeService.listExchanges(runtimePlayer.playerId);
const exchangeResult = await exchangeService.exchange(runtimePlayer.playerId, exchangeId);

console.log(JSON.stringify({
    exchanges: exchangeView,
    exchange: exchangeResult
}, null, 2));
