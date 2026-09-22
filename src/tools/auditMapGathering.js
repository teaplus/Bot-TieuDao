import GatheringCommand from '../commands/player/thuthap.js';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import GatheringCompletionService from '../gameplay/gathering/GatheringCompletionService.js';
import GatheringService from '../gameplay/gathering/GatheringService.js';
import RewardTableService from '../gameplay/rewards/RewardTableService.js';

function assert(condition, message, details = null) {
    if (!condition) {
        const error = new Error(message);
        error.details = details;
        throw error;
    }
}

const gameDataManager = bootstrapGameData();
setGameDataManager(gameDataManager);
const map = gameDataManager.getRecord('maps', 'THANH_VAN_SON_MACH');
const player = { playerId: 'map-gathering-audit', realmId: 1, spiritualRoot: 'FIRE' };
const transactionClient = {
    async query(statement) {
        if (statement.includes("status = 'IN_PROGRESS'")) {
            return { rows: [], rowCount: 0 };
        }
        throw new Error(`UNEXPECTED_QUERY:${statement}`);
    }
};
const playerRuntimeRepository = {
    async findById(playerId) {
        return playerId === player.playerId ? player : null;
    }
};
const playerMapService = {
    async resolveCurrentMap() {
        return { state: { currentMapId: map.id }, map };
    }
};

async function auditCatalogAndDashboard() {
    const resources = gameDataManager.getCollection('gatheringResources');
    const pools = gameDataManager.getCollection('mapGatheringPools');
    assert(Object.keys(resources).length === 60, 'Resource catalog must contain 60 items');
    assert(Object.keys(pools).length === 30, 'Gathering pools must contain 30 map-family pools');
    assert(resources.HERB_TU_LINH_THAO.name === 'Tụ Linh Thảo'
        && resources.HERB_TU_LINH_THAO.resourceTier === 1,
    'Approved Thanh Van herb was not normalized', resources.HERB_TU_LINH_THAO);
    assert(gameDataManager.getRecord('itemTemplates', 'ORE_HONG_MONG_DAO_KIM')?.type === 'MATERIAL',
        'Gathering resource was not merged into canonical item templates');

    const service = new GatheringService({
        playerRuntimeRepository,
        playerMapService,
        gameDataManager,
        unitOfWork: { execute: (work) => work(transactionClient) },
        timeProvider: { now: () => new Date('2026-07-27T00:00:00.000Z') }
    });
    const dashboard = await service.getDashboard(player.playerId);
    assert(dashboard.currentMap.id === map.id && dashboard.resourceTier === 1,
        'Dashboard did not resolve current map and tier', dashboard);
    assert(dashboard.gatherings.length === 2
        && dashboard.gatherings.every((entry) => entry.mapId === map.id),
    'Dashboard exposed gathering content outside current map', dashboard.gatherings);
    assert(dashboard.gatherings.find((entry) => entry.resourceFamily === 'HERB')
        ?.resources.map((entry) => entry.name).join(',') === 'Tụ Linh Thảo,Thanh Tâm Thảo',
    'Dashboard herb pool does not match approved Thanh Van content', dashboard.gatherings);
    const recoveryService = new GatheringService({
        playerRuntimeRepository,
        playerMapService,
        gameDataManager,
        unitOfWork: { execute: (work) => work(transactionClient) },
        activityRunRepository: {
            async findActive() {
                return {
                    runId: '900',
                    contentId: 'GATHER_THANH_VAN_SON_MACH_HERB',
                    inputSnapshot: {
                        mapId: map.id,
                        mapName: map.name,
                        resourceFamily: 'HERB'
                    },
                    readyAt: new Date('2026-07-26T23:59:00.000Z')
                };
            }
        },
        timeProvider: { now: () => new Date('2026-07-27T00:00:00.000Z') }
    });
    const recovered = await recoveryService.getDashboard(player.playerId);
    assert(recovered.activeRun?.runId === '900'
        && recovered.activeRun.computedStatus === 'READY',
    'Dashboard did not recover a ready gathering run', recovered.activeRun);
    return dashboard;
}

function auditWeightedReward() {
    const primaryRoll = new RewardTableService({
        gameDataManager,
        random: () => 0
    }).roll('GATHER_THANH_VAN_SON_MACH_HERB');
    assert(primaryRoll.rewards.length === 1
        && primaryRoll.rewards[0].itemId === 'HERB_TU_LINH_THAO'
        && primaryRoll.rewards[0].quantity === 1,
    'Weighted primary gathering reward is invalid', primaryRoll);

    const sequence = [0.99, 0];
    const rareRoll = new RewardTableService({
        gameDataManager,
        random: () => sequence.shift() ?? 0
    }).roll('GATHER_THANH_VAN_SON_MACH_HERB');
    assert(rareRoll.rewards.length === 1
        && rareRoll.rewards[0].itemId === 'HERB_THANH_TAM_THAO'
        && rareRoll.rewards[0].quantity === 1,
    'Weighted rare gathering reward is invalid', rareRoll);
}

async function auditStartSnapshotAndMapGuard() {
    let reservation = null;
    const completion = new GatheringCompletionService({
        playerRuntimeRepository,
        playerMapService,
        gameDataManager,
        battleEntityFactory: {
            createFromRuntimePlayer() {
                return { battleStat: { luck: 0 } };
            }
        },
        operationExecutor: { execute: (_operation, work) => work(transactionClient) },
        activityRunRepository: {
            async reserve(_client, payload) {
                reservation = payload;
                return { runId: '501', status: 'IN_PROGRESS' };
            }
        },
        timeProvider: { now: () => new Date('2026-07-27T00:00:00.000Z') }
    });
    const started = await completion.start(
        player.playerId,
        'GATHER_THANH_VAN_SON_MACH_HERB',
        { operationId: 'gathering-map-start-audit' }
    );
    assert(started.mapId === map.id
        && reservation.inputSnapshot.mapId === map.id
        && reservation.inputSnapshot.resourceFamily === 'HERB'
        && reservation.inputSnapshot.resourceTier === 1
        && reservation.inputSnapshot.luck === 0,
    'Gathering start did not snapshot current map content', { started, reservation });

    let mismatch = null;
    try {
        await completion.start(
            player.playerId,
            'GATHER_HUYEN_MOC_QUOC_HERB',
            { operationId: 'gathering-map-mismatch-audit' }
        );
    } catch (error) {
        mismatch = error.message;
    }
    assert(mismatch === 'GATHERING_NOT_AVAILABLE_ON_CURRENT_MAP',
        'Gathering start accepted a resource pool from another map', { mismatch });
}

async function auditDiscordDashboard(dashboard) {
    const payloads = [];
    let closedPayload = null;
    const user = {
        id: player.playerId,
        displayAvatarURL: () => 'https://example.com/avatar.png'
    };
    const component = {
        id: 'close-component',
        user,
        customId: 'thuthap:map-gathering-command-audit:close',
        async update(payload) { closedPayload = payload; }
    };
    const message = {
        async awaitMessageComponent(options) {
            assert(options.filter(component), 'Gathering ComponentSession rejected owner component');
            return component;
        }
    };
    const interaction = {
        id: 'map-gathering-command-audit',
        user,
        async deferReply() {},
        async editReply(payload) {
            payloads.push(payload);
            return message;
        }
    };
    await new GatheringCommand().execute(interaction, {
        gatheringService: { async getDashboard() { return dashboard; } },
        gameDataManager,
        logger: { error() {} }
    });
    const initial = payloads[0];
    const serialized = JSON.stringify({
        embeds: initial.embeds.map((embed) => embed.toJSON()),
        components: initial.components.map((row) => row.toJSON())
    });
    assert(serialized.includes('Tụ Linh Thảo')
        && serialized.includes('Thanh Tâm Thảo')
        && serialized.includes('Hái Linh Thảo')
        && serialized.includes('Khai Linh Khoáng'),
    'Gathering dashboard is missing map resources or family actions', serialized);
    assert(closedPayload.components.every(
        (row) => row.toJSON().components.every((entry) => entry.disabled)
    ), 'Closing gathering dashboard did not disable components');
}

try {
    const dashboard = await auditCatalogAndDashboard();
    auditWeightedReward();
    await auditStartSnapshotAndMapGuard();
    await auditDiscordDashboard(dashboard);
    console.log(JSON.stringify({
        status: 'PASS',
        resources: 60,
        mapPools: 30,
        currentMapOnly: true,
        weightedOne: true,
        lazyRecoveryDashboard: true
    }, null, 2));
} catch (error) {
    console.error(JSON.stringify({
        status: 'FAIL',
        message: error instanceof Error ? error.message : String(error),
        details: error?.details || null
    }, null, 2));
    process.exitCode = 1;
}
