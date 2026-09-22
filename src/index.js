import 'dotenv/config';
import ExtendedClient from './core/ExtendedClient.js';
import { bootstrapGameData } from './foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from './foundation/game-data/gameDataContext.js';
import BreakthroughService from './gameplay/player/BreakthroughService.js';
import RebirthService from './gameplay/player/RebirthService.js';
import SpiritRootRerollService from './gameplay/player/SpiritRootRerollService.js';
import CultivationService from './gameplay/player/CultivationService.js';
import CultivationArtService from './gameplay/player/CultivationArtService.js';
import EquipmentService from './gameplay/player/EquipmentService.js';
import ExplorationService from './gameplay/exploration/ExplorationService.js';
import PlayerStartService from './gameplay/player/PlayerStartService.js';
import SecretRealmService from './gameplay/secret-realm/SecretRealmService.js';
import ShopService from './gameplay/shop/ShopService.js';
import SkillService from './gameplay/player/SkillService.js';
import TreasureHuntService from './gameplay/player/TreasureHuntService.js';
import PlayerReadService from './gameplay/player/PlayerReadService.js';
import { loadAppConfig } from './platform/config/loadAppConfig.js';
import Logger from './platform/logger/Logger.js';
import PlayerRuntimeRepository from './repositories/PlayerRuntimeRepository.js';
import AppError from './shared/errors/AppError.js';
import pool, { sanitizedPostgresPoolConfig } from './database/postgres.js';
import PostgresUnitOfWork from './platform/database/PostgresUnitOfWork.js';
import IdempotencyRepository from './repositories/IdempotencyRepository.js';
import GatheringService from './gameplay/gathering/GatheringService.js';
import SectService from './gameplay/sect/SectService.js';
import CacheService from './platform/cache/CacheService.js';
import CultivationLeaderboardRepository from './repositories/CultivationLeaderboardRepository.js';
import CultivationLeaderboardService, { LEADERBOARD_REFRESH_INTERVAL_MS } from './gameplay/leaderboard/CultivationLeaderboardService.js';
import IntervalScheduler from './platform/scheduler/IntervalScheduler.js';
import PlayerMapService from './gameplay/maps/PlayerMapService.js';
import ProfessionService from './gameplay/profession/ProfessionService.js';
import ItemUseService from './gameplay/player/ItemUseService.js';
import MysteryMerchantService from './gameplay/shop/MysteryMerchantService.js';
import EconomyActivityService from './gameplay/economy/EconomyActivityService.js';
import MiniGameService from './gameplay/minigames/MiniGameService.js';
import PlayerAccountService from './gameplay/economy/PlayerAccountService.js';
import WordChainService from './gameplay/minigames/WordChainService.js';
import SpiritStoneTransferService from './gameplay/economy/SpiritStoneTransferService.js';
import CharacterResetService from './gameplay/player/CharacterResetService.js';

const logger = new Logger();
const config = loadAppConfig(process.env);

if (config.missingKeys.length > 0) {
    throw new AppError('Missing required environment variables', {
        code: 'CONFIG_MISSING_ENV',
        details: { missingKeys: config.missingKeys }
    });
}
if (config.invalidKeys.length > 0) {
    throw new AppError('Invalid environment variables', {
        code: 'CONFIG_INVALID_ENV',
        details: { invalidKeys: config.invalidKeys }
    });
}

const gameDataManager = bootstrapGameData();
setGameDataManager(gameDataManager);
logger.info('Game data bootstrap completed', gameDataManager.getSummary());
logger.info('Game data sources loaded', {
    sources: gameDataManager.getLoadedSources().map((source) => source.relativePath)
});
logger.info('PostgreSQL pool configured', sanitizedPostgresPoolConfig);

const playerRuntimeRepository = new PlayerRuntimeRepository();
const unitOfWork = new PostgresUnitOfWork(pool);
const idempotencyRepository = new IdempotencyRepository();
const cacheService = new CacheService();
const playerReadService = new PlayerReadService({ playerRuntimeRepository });
const cultivationService = new CultivationService({ playerRuntimeRepository, unitOfWork });
const breakthroughService = new BreakthroughService({
    playerRuntimeRepository,
    gameDataManager,
    unitOfWork,
    idempotencyRepository
});
const rebirthService = new RebirthService({
    playerRuntimeRepository,
    gameDataManager,
    unitOfWork,
    idempotencyRepository
});
const spiritRootRerollService = new SpiritRootRerollService({
    playerRuntimeRepository,
    gameDataManager,
    unitOfWork,
    idempotencyRepository
});
const cultivationArtService = new CultivationArtService({
    playerRuntimeRepository,
    cultivationService,
    unitOfWork
});
const equipmentService = new EquipmentService({
    playerRuntimeRepository,
    cultivationService,
    gameDataManager,
    unitOfWork
});
const skillService = new SkillService({
    playerRuntimeRepository,
    gameDataManager,
    unitOfWork
});
const idempotentDependencies = { unitOfWork, idempotencyRepository };
const treasureHuntService = new TreasureHuntService({
    playerRuntimeRepository,
    gameDataManager,
    ...idempotentDependencies
});
const playerMapService = new PlayerMapService({
    playerRuntimeRepository,
    gameDataManager,
    ...idempotentDependencies
});
const mysteryMerchantService = new MysteryMerchantService({
    database: pool,
    gameDataManager
});
const shopService = new ShopService({
    playerRuntimeRepository,
    gameDataManager,
    cacheService,
    playerMapService,
    mysteryMerchantService,
    ...idempotentDependencies
});
const explorationService = new ExplorationService({
    playerRuntimeRepository,
    gameDataManager,
    playerMapService,
    mysteryMerchantService,
    ...idempotentDependencies
});
const secretRealmService = new SecretRealmService({
    playerRuntimeRepository,
    gameDataManager,
    ...idempotentDependencies
});
const playerStartService = new PlayerStartService({ playerRuntimeRepository, gameDataManager });
const gatheringService = new GatheringService({
    playerRuntimeRepository,
    gameDataManager,
    playerMapService,
    periodCounterDatabase: pool,
    ...idempotentDependencies
});
const sectService = new SectService({
    playerRuntimeRepository,
    gameDataManager,
    ...idempotentDependencies
});
const professionService = new ProfessionService({
    playerRuntimeRepository,
    gameDataManager,
    ...idempotentDependencies
});
const itemUseService = new ItemUseService({
    playerRuntimeRepository,
    gameDataManager,
    cultivationService,
    ...idempotentDependencies
});
const economyActivityService = new EconomyActivityService({
    playerRuntimeRepository,
    playerMapService,
    gameDataManager,
    ...idempotentDependencies
});
const playerAccountService = new PlayerAccountService({ unitOfWork });
const miniGameService = new MiniGameService({
    playerRuntimeRepository,
    playerMapService,
    gameDataManager,
    ...idempotentDependencies
});
const wordChainService = new WordChainService({
    gameDataManager,
    unitOfWork
});
const spiritStoneTransferService = new SpiritStoneTransferService({
    gameDataManager,
    unitOfWork,
    idempotencyRepository
});
const characterResetService = new CharacterResetService({
    gameDataManager,
    unitOfWork,
    idempotencyRepository
});
const cultivationLeaderboardRepository = new CultivationLeaderboardRepository({ database: pool });
const cultivationLeaderboardService = new CultivationLeaderboardService({
    repository: cultivationLeaderboardRepository,
    unitOfWork,
    gameDataManager
});
const scheduler = new IntervalScheduler({
    onTaskError: ({ taskId, errorCode }) => logger.error('Scheduled task failed', { taskId, errorCode })
});
scheduler.register({
    id: 'cultivation-leaderboard-refresh',
    intervalMs: LEADERBOARD_REFRESH_INTERVAL_MS,
    runOnStart: true,
    task: () => cultivationLeaderboardService.refreshIfDue()
});

const client = new ExtendedClient({
    logger,
    gameDataManager,
    playerRuntimeRepository,
    playerReadService,
    cultivationService,
    breakthroughService,
    rebirthService,
    spiritRootRerollService,
    cultivationArtService,
    equipmentService,
    skillService,
    shopService,
    mysteryMerchantService,
    treasureHuntService,
    playerMapService,
    explorationService,
    secretRealmService,
    gatheringService,
    sectService,
    professionService,
    itemUseService,
    playerStartService,
    cultivationLeaderboardService,
    economyActivityService,
    playerAccountService,
    miniGameService,
    wordChainService,
    spiritStoneTransferService,
    characterResetService,
    messageCommandPrefix: config.messageCommandPrefix,
    slashCommandScope: config.slashCommandScope,
    guildId: config.guildId,
    scheduler
});

client.start(config.discordToken).catch((error) => {
    logger.error('Application bootstrap failed', {
        error: error instanceof Error ? error.message : String(error)
    });
    process.exitCode = 1;
});
