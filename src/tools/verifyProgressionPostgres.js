import 'dotenv/config';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { runMigrations } from '../platform/database/runMigrations.js';
import PostgresUnitOfWork from '../platform/database/PostgresUnitOfWork.js';
import IdempotentOperationExecutor from '../platform/idempotency/IdempotentOperationExecutor.js';
import IdempotencyRepository from '../repositories/IdempotencyRepository.js';
import PlayerRuntimeRepository from '../repositories/PlayerRuntimeRepository.js';
import SpiritRootRerollRepository from '../repositories/SpiritRootRerollRepository.js';
import RebirthService from '../gameplay/player/RebirthService.js';
import SpiritRootRerollService from '../gameplay/player/SpiritRootRerollService.js';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import { resolveRealmStageValue } from '../core/RealmStageValue.js';
import ProfessionService from '../gameplay/profession/ProfessionService.js';
import ProfessionRepository from '../repositories/ProfessionRepository.js';
import SkillService from '../gameplay/player/SkillService.js';
import ItemUseService from '../gameplay/player/ItemUseService.js';
import CultivationService from '../gameplay/player/CultivationService.js';
import {
    multiplyDecimal,
    normalizeDecimal,
    subtractDecimal
} from '../shared/numeric/FixedDecimal.js';

const { Pool } = pg;
const TEST_SCHEMA_PREFIX = 'progression_verify_';
const FIXED_NOW = new Date('2026-07-20T00:00:00.000Z');
const CUTOVER_PATH = fileURLToPath(new URL(
    '../database/migrations/019_spirit_root_quality_cutover.sql',
    import.meta.url
));

function assert(condition, code, details = null) {
    if (!condition) {
        const error = new Error(code);
        error.code = code;
        error.details = details;
        throw error;
    }
}

function sanitizeFailureMessage(error) {
    return String(error?.message || 'Unknown progression verification failure')
        .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[REDACTED_DATABASE_URL]')
        .slice(0, 500);
}

class SchemaScopedPool {
    constructor(pool, schemaName) {
        this.pool = pool;
        this.schemaName = schemaName;
    }

    async connect() {
        const client = await this.pool.connect();
        try {
            await client.query(`SET search_path TO "${this.schemaName}", public`);
            return client;
        } catch (error) {
            client.release();
            throw error;
        }
    }

    async query(text, values) {
        const client = await this.connect();
        try {
            return await client.query(text, values);
        } finally {
            client.release();
        }
    }
}

function databaseIdentity(value) {
    const parsed = new URL(value);
    return [
        parsed.protocol,
        parsed.hostname,
        parsed.port || '5432',
        parsed.pathname
    ].join('|');
}

function loadTestDatabaseUrl(environment) {
    const testUrl = String(environment.PROGRESSION_TEST_DATABASE_URL || '').trim();
    if (!testUrl) return null;
    assert(/^postgres(?:ql)?:\/\//i.test(testUrl), 'PROGRESSION_TEST_DATABASE_URL_INVALID');
    const primaryUrl = String(environment.DATABASE_URL || '').trim();
    assert(!primaryUrl || databaseIdentity(testUrl) !== databaseIdentity(primaryUrl),
        'PROGRESSION_TEST_DATABASE_MUST_DIFFER_FROM_PRIMARY');
    return testUrl;
}

function getGameDataContext() {
    const gameDataManager = bootstrapGameData();
    setGameDataManager(gameDataManager);
    const realms = Object.values(gameDataManager.getCollection('realms'))
        .sort((left, right) => Number(left.order) - Number(right.order));
    const firstRealm = realms[0];
    const lastRealm = realms.at(-1);
    const spiritRoot = Object.values(gameDataManager.getCollection('spiritRoots'))[0];
    assert(firstRealm && lastRealm && spiritRoot, 'PROGRESSION_GAME_DATA_UNAVAILABLE');
    return { gameDataManager, firstRealm, lastRealm, spiritRoot };
}

async function seedPlayer(database, context, input) {
    const realm = input.finalRealm ? context.lastRealm : context.firstRealm;
    const realmStage = input.finalRealm ? context.lastRealm.max_stage : 1;
    const cultivation = input.finalRealm
        ? resolveRealmStageValue(context.lastRealm.cultivation.required, context.lastRealm.max_stage)
        : '0';
    await database.query(
        `INSERT INTO players (
            id, name, realm_id, realm_stage, spiritual_root, spirit_root_id,
            spirit_root_quality_tier_id, cultivation_art_id, cultivation,
            base_atk, base_def, base_hp, base_spd, spirit_stones, honor_points,
            rebirth_count, last_cultivate
         ) VALUES ($1, $2, $3, $4, $5, $6, 'LOWER_GRADE', 'CP_FIRE_HOANG', $7,
                   40, 20, 200, 5, 999, 77, $8, $9)`,
        [input.playerId, input.name, realm.id, realmStage,
            context.spiritRoot.legacyValue, context.spiritRoot.id,
            cultivation, input.rebirthCount || '0', FIXED_NOW]
    );
    await database.query(
        `INSERT INTO player_cultivation_arts (player_id, art_id)
         VALUES ($1, 'CP_FIRE_HOANG')`,
        [input.playerId]
    );
    await database.query(
        `INSERT INTO idle_accumulators (player_id, source_id, checkpoint_at, rules_revision)
         VALUES ($1, 'CULTIVATION', $2, 'cultivation-rules-v1')`,
        [input.playerId, FIXED_NOW]
    );

    if (input.withResetData) {
        await database.query(
            `INSERT INTO inventory_stacks (player_id, item_id, quantity)
             VALUES ($1, 'VERIFY_STACK', 3)`,
            [input.playerId]
        );
        await database.query(
            `INSERT INTO equipment_instances (player_id, template_id, equipped_slot)
             VALUES ($1, 'VERIFY_EQUIPMENT', 'WEAPON')`,
            [input.playerId]
        );
        await database.query(
            `INSERT INTO player_items (player_id, item_id, quantity)
             VALUES ($1, 'VERIFY_LEGACY_ITEM', 1)`,
            [input.playerId]
        );
        await database.query(
            `INSERT INTO player_skills (player_id, skill_id)
             VALUES ($1, 'SK_FIRE_HOANG')`,
            [input.playerId]
        );
        await database.query(
            `INSERT INTO player_cultivation_arts (player_id, art_id)
             VALUES ($1, 'CP_WOOD_HOANG')`,
            [input.playerId]
        );
    }
}

function createServices(database, gameDataManager) {
    const unitOfWork = new PostgresUnitOfWork(database);
    const idempotencyRepository = new IdempotencyRepository();
    const operationExecutor = new IdempotentOperationExecutor({
        unitOfWork,
        idempotencyRepository
    });
    const playerRuntimeRepository = new PlayerRuntimeRepository();
    const cultivationService = new CultivationService({
        playerRuntimeRepository,
        unitOfWork,
        timeProvider: { now: () => FIXED_NOW }
    });
    return {
        rebirth: new RebirthService({
            gameDataManager,
            playerRuntimeRepository,
            operationExecutor,
            timeProvider: { now: () => FIXED_NOW }
        }),
        reroll: new SpiritRootRerollService({
            gameDataManager,
            playerRuntimeRepository,
            operationExecutor,
            repository: new SpiritRootRerollRepository({ database }),
            timeProvider: { now: () => FIXED_NOW }
        }),
        profession: new ProfessionService({
            gameDataManager,
            playerRuntimeRepository,
            operationExecutor,
            repository: new ProfessionRepository({ database }),
            timeProvider: { now: () => FIXED_NOW }
        }),
        skill: new SkillService({
            gameDataManager,
            playerRuntimeRepository,
            unitOfWork
        }),
        itemUse: new ItemUseService({
            gameDataManager,
            playerRuntimeRepository,
            cultivationService,
            operationExecutor
        })
    };
}

async function verifyItemUse(database, context, service) {
    const playerId = 'progression-item-use';
    await seedPlayer(database, context, { playerId, name: 'Item Use Player' });
    await database.query(
        `INSERT INTO player_items (player_id, item_id, quantity, rarity, instance_data)
         VALUES ($1, 'SPIRIT_GATHERING_PILL', 2, 'COMMON', '{}'::jsonb)`,
        [playerId]
    );
    const required = normalizeDecimal(
        resolveRealmStageValue(context.firstRealm.cultivation.required, 1)
    );
    const expectedGain = multiplyDecimal(required, '0.10');
    const first = await service.use(playerId, 'SPIRIT_GATHERING_PILL', {
        operationId: 'item-use-postgres',
        usedAt: FIXED_NOW
    });
    assert(first.outcome === 'CULTIVATION_PILL_USED'
        && first.appliedGain === expectedGain,
    'ITEM_USE_PERCENT_GAIN_INVALID', first);
    const replay = await service.use(playerId, 'SPIRIT_GATHERING_PILL', {
        operationId: 'item-use-postgres',
        usedAt: FIXED_NOW
    });
    assert(replay.idempotentReplay === true, 'ITEM_USE_REPLAY_INVALID', replay);

    const persisted = await database.query(
        `SELECT cultivation,
                (SELECT COALESCE(SUM(quantity), 0)
                 FROM player_items
                 WHERE player_id = $1 AND item_id = 'SPIRIT_GATHERING_PILL') AS pill_quantity
         FROM players WHERE id = $1`,
        [playerId]
    );
    assert(normalizeDecimal(persisted.rows[0].cultivation) === expectedGain
        && String(persisted.rows[0].pill_quantity) === '1',
    'ITEM_USE_NOT_ATOMIC_OR_REPLAY_CONSUMED_TWICE', persisted.rows[0]);

    const capPlayerId = 'progression-item-use-cap';
    await seedPlayer(database, context, { playerId: capPlayerId, name: 'Item Cap Player' });
    await database.query(
        'UPDATE players SET cultivation = $2 WHERE id = $1',
        [capPlayerId, subtractDecimal(required, '5')]
    );
    await database.query(
        `INSERT INTO player_items (player_id, item_id, quantity, rarity, instance_data)
         VALUES ($1, 'SPIRIT_GATHERING_PILL', 1, 'COMMON', '{}'::jsonb)`,
        [capPlayerId]
    );
    const capped = await service.use(capPlayerId, 'SPIRIT_GATHERING_PILL', {
        operationId: 'item-use-cap-postgres',
        usedAt: FIXED_NOW
    });
    assert(capped.appliedGain === normalizeDecimal('5')
        && capped.cultivation === required,
    'ITEM_USE_THRESHOLD_CAP_INVALID', capped);

    const higherRealm = Object.values(context.gameDataManager.getCollection('realms'))
        .sort((left, right) => Number(left.order) - Number(right.order))[1];
    await database.query(
        `UPDATE players SET realm_id = $2, realm_stage = 1, cultivation = 0 WHERE id = $1`,
        [playerId, higherRealm.id]
    );
    const mismatch = await service.use(playerId, 'SPIRIT_GATHERING_PILL', {
        operationId: 'item-use-realm-mismatch-postgres',
        usedAt: FIXED_NOW
    });
    assert(mismatch.outcome === 'ITEM_REALM_MISMATCH',
        'ITEM_USE_EXACT_REALM_NOT_ENFORCED', mismatch);
    const quantityAfterMismatch = await database.query(
        `SELECT COALESCE(SUM(quantity), 0) AS quantity
         FROM player_items WHERE player_id = $1 AND item_id = 'SPIRIT_GATHERING_PILL'`,
        [playerId]
    );
    assert(String(quantityAfterMismatch.rows[0].quantity) === '1',
        'ITEM_USE_REALM_MISMATCH_CONSUMED_ITEM');

    return {
        percentGain: true,
        thresholdCap: true,
        exactRealm: true,
        idempotentReplay: true
    };
}

async function verifySkillLoadout(database, context, service) {
    const playerId = 'progression-skill-loadout';
    await seedPlayer(database, context, { playerId, name: 'Skill Loadout Player' });
    await database.query(
        `INSERT INTO player_skills (player_id, skill_id)
         VALUES
            ($1, 'SK_FIRE_HOANG'),
            ($1, 'SK_WOOD_HOANG'),
            ($1, 'DEF_FIRE_HOANG')`,
        [playerId]
    );

    const first = await service.equipSkillLoadout(
        playerId,
        ['SK_FIRE_HOANG', 'DEF_FIRE_HOANG']
    );
    assert(first.capacity === 2 && first.activeCount === 1 && first.passiveCount === 1,
        'SKILL_LOADOUT_INITIAL_MIX_INVALID');

    let capacityRejected = false;
    try {
        await service.equipSkillLoadout(
            playerId,
            ['SK_FIRE_HOANG', 'SK_WOOD_HOANG', 'DEF_FIRE_HOANG']
        );
    } catch (error) {
        capacityRejected = error.message === 'SKILL_LOADOUT_CAPACITY_EXCEEDED';
    }
    assert(capacityRejected, 'SKILL_LOADOUT_CAPACITY_NOT_ENFORCED');

    await Promise.all([
        service.equipSkillLoadout(playerId, ['SK_FIRE_HOANG', 'DEF_FIRE_HOANG']),
        service.equipSkillLoadout(playerId, ['SK_WOOD_HOANG', 'DEF_FIRE_HOANG'])
    ]);
    const persisted = await database.query(
        `SELECT skill_id, equipped_slot
         FROM player_skills
         WHERE player_id = $1
           AND equipped_slot IS NOT NULL
         ORDER BY equipped_slot`,
        [playerId]
    );
    const finalIds = persisted.rows.map((row) => row.skill_id);
    assert(persisted.rows.length === 2
        && Number(persisted.rows[0].equipped_slot) === 1
        && Number(persisted.rows[1].equipped_slot) === 2
        && finalIds.includes('DEF_FIRE_HOANG')
        && (finalIds.includes('SK_FIRE_HOANG') || finalIds.includes('SK_WOOD_HOANG')),
    'SKILL_LOADOUT_CONCURRENT_REPLACEMENT_TORN');

    const latePlayerId = 'progression-skill-active-cap';
    await seedPlayer(database, context, {
        playerId: latePlayerId,
        name: 'Skill Active Cap Player',
        finalRealm: true
    });
    await database.query(
        `INSERT INTO player_skills (player_id, skill_id)
         VALUES
            ($1, 'SK_FIRE_HOANG'),
            ($1, 'SK_WOOD_HOANG'),
            ($1, 'SK_EARTH_HOANG'),
            ($1, 'SK_WATER_HOANG')`,
        [latePlayerId]
    );
    let activeCapRejected = false;
    try {
        await service.equipSkillLoadout(latePlayerId, [
            'SK_FIRE_HOANG',
            'SK_WOOD_HOANG',
            'SK_EARTH_HOANG',
            'SK_WATER_HOANG'
        ]);
    } catch (error) {
        activeCapRejected = error.message === 'SKILL_LOADOUT_ACTIVE_LIMIT_EXCEEDED';
    }
    assert(activeCapRejected, 'SKILL_LOADOUT_ACTIVE_CAP_NOT_ENFORCED');

    return {
        mixedActivePassive: true,
        capacityRejected: true,
        activeCapRejected: true,
        concurrentReplacementAtomic: true
    };
}

async function seedProfessionPlayer(database, context, playerId) {
    await seedPlayer(database, context, { playerId, name: 'Profession Player' });
    await database.query(
        `INSERT INTO player_learned_recipes (player_id, recipe_id, source_ref)
         VALUES ($1, 'CRAFT_BREAKTHROUGH_PILL', 'PROGRESSION_VERIFICATION')`,
        [playerId]
    );
    await database.query(
        `INSERT INTO player_items (player_id, item_id, quantity, rarity, instance_data)
         VALUES
            ($1, 'HERB_TU_LINH_THAO', 20, 'COMMON', '{}'::jsonb),
            ($1, 'HERB_THANH_TAM_THAO', 20, 'COMMON', '{}'::jsonb)`,
        [playerId]
    );
}

async function verifyProfession(database, context, service) {
    const playerId = 'progression-profession';
    await seedProfessionPlayer(database, context, playerId);
    const started = await service.start(playerId, 'CRAFT_BREAKTHROUGH_PILL', 2, {
        operationId: 'profession-start-postgres', startedAt: FIXED_NOW
    });
    assert(started.job.outputSnapshot.quantity === '2', 'PROFESSION_BATCH_OUTPUT_INVALID');
    assert(new Date(started.job.readyAt).getTime() - FIXED_NOW.getTime() === 120_000,
        'PROFESSION_READY_AT_INVALID');
    const replay = await service.start(playerId, 'CRAFT_BREAKTHROUGH_PILL', 2, {
        operationId: 'profession-start-postgres', startedAt: FIXED_NOW
    });
    assert(replay.idempotentReplay === true, 'PROFESSION_START_REPLAY_INVALID');

    let earlyClaimRejected = false;
    try {
        await service.claim(playerId, started.job.jobId, {
            operationId: 'profession-claim-early-postgres',
            claimedAt: new Date(FIXED_NOW.getTime() + 60_000)
        });
    } catch (error) {
        earlyClaimRejected = error.message === 'PROFESSION_CRAFT_JOB_NOT_READY';
    }
    assert(earlyClaimRejected, 'PROFESSION_EARLY_CLAIM_NOT_REJECTED');

    const claimedAt = new Date(FIXED_NOW.getTime() + 180_000);
    const claims = await Promise.all([
        service.claim(playerId, started.job.jobId, {
            operationId: 'profession-claim-a-postgres', claimedAt
        }),
        service.claim(playerId, started.job.jobId, {
            operationId: 'profession-claim-b-postgres', claimedAt
        })
    ]);
    assert(claims.filter((entry) => entry.idempotentReplay).length === 1,
        'PROFESSION_CONCURRENT_CLAIM_REPLAY_INVALID', claims);
    const state = await database.query(
        `SELECT job.status, profession.experience, profession.grade,
                (SELECT COALESCE(SUM(quantity), 0) FROM player_items
                 WHERE player_id = $1 AND item_id = 'BREAKTHROUGH_PILL') AS result_quantity,
                (SELECT COALESCE(SUM(quantity), 0) FROM player_items
                 WHERE player_id = $1 AND item_id = 'HERB_TU_LINH_THAO') AS tu_linh_quantity,
                (SELECT COALESCE(SUM(quantity), 0) FROM player_items
                 WHERE player_id = $1 AND item_id = 'HERB_THANH_TAM_THAO') AS thanh_tam_quantity
         FROM profession_craft_jobs job
         JOIN player_professions profession
           ON profession.player_id = job.player_id AND profession.profession_id = job.profession_id
         WHERE job.id = $2`,
        [playerId, started.job.jobId]
    );
    const row = state.rows[0];
    assert(row.status === 'CLAIMED' && String(row.result_quantity) === '2',
        'PROFESSION_OUTPUT_DOUBLE_CLAIMED', row);
    assert(String(row.tu_linh_quantity) === '12'
        && String(row.thanh_tam_quantity) === '18'
        && String(row.experience) === '20',
        'PROFESSION_INPUT_OR_EXPERIENCE_INVALID', row);

    const racePlayerId = 'progression-profession-race';
    await seedProfessionPlayer(database, context, racePlayerId);
    const starts = await Promise.allSettled([
        service.start(racePlayerId, 'CRAFT_BREAKTHROUGH_PILL', 1, {
            operationId: 'profession-race-start-a', startedAt: FIXED_NOW
        }),
        service.start(racePlayerId, 'CRAFT_BREAKTHROUGH_PILL', 1, {
            operationId: 'profession-race-start-b', startedAt: FIXED_NOW
        })
    ]);
    assert(starts.filter((entry) => entry.status === 'fulfilled').length === 1
        && starts.filter((entry) => entry.status === 'rejected').length === 1,
    'PROFESSION_ACTIVE_SLOT_RACE_INVALID');
    const raceState = await database.query(
        `SELECT
            (SELECT COUNT(*) FROM profession_craft_jobs
             WHERE player_id = $1 AND status = 'IN_PROGRESS') AS active_jobs,
            (SELECT COALESCE(SUM(quantity), 0) FROM player_items
             WHERE player_id = $1 AND item_id = 'HERB_TU_LINH_THAO') AS tu_linh_quantity,
            (SELECT COALESCE(SUM(quantity), 0) FROM player_items
             WHERE player_id = $1 AND item_id = 'HERB_THANH_TAM_THAO') AS thanh_tam_quantity`,
        [racePlayerId]
    );
    assert(String(raceState.rows[0].active_jobs) === '1'
        && String(raceState.rows[0].tu_linh_quantity) === '16'
        && String(raceState.rows[0].thanh_tam_quantity) === '19',
    'PROFESSION_ACTIVE_SLOT_RACE_MUTATED_TWICE', raceState.rows[0]);

    return {
        sameStartReplay: true,
        concurrentClaimSingleReward: true,
        activeSlotRaceSingleConsume: true,
        lazyReadyAt: true
    };
}

async function verifyCutover(database) {
    await database.query('ALTER TABLE players ALTER COLUMN spirit_root_quality_tier_id DROP NOT NULL');
    await database.query(
        `INSERT INTO players (
            id, name, spirit_root_id, spirit_root_quality_tier_id, rebirth_count
         ) VALUES ('progression-cutover', 'Cutover Player', 'TAP_CAN', NULL, 3)`
    );
    const cutoverSql = fs.readFileSync(CUTOVER_PATH, 'utf8');
    await database.query(cutoverSql);
    await database.query(cutoverSql);

    const result = await database.query(
        `SELECT player.spirit_root_quality_tier_id,
                COUNT(entitlement.id) AS entitlement_count,
                MIN(entitlement.rebirth_number) AS entitlement_rebirth_number
         FROM players player
         LEFT JOIN player_spirit_root_reroll_entitlements entitlement
           ON entitlement.player_id = player.id
         WHERE player.id = 'progression-cutover'
         GROUP BY player.id`
    );
    assert(result.rows[0]?.spirit_root_quality_tier_id === 'LOWER_GRADE',
        'SPIRIT_ROOT_QUALITY_BACKFILL_INVALID');
    assert(String(result.rows[0]?.entitlement_count) === '1'
        && String(result.rows[0]?.entitlement_rebirth_number) === '3',
    'SPIRIT_ROOT_RETRO_ENTITLEMENT_NOT_IDEMPOTENT');

    let nullRejected = false;
    try {
        await database.query(
            `UPDATE players SET spirit_root_quality_tier_id = NULL
             WHERE id = 'progression-cutover'`
        );
    } catch (error) {
        nullRejected = error.code === '23502';
    }
    assert(nullRejected, 'SPIRIT_ROOT_QUALITY_NOT_NULL_NOT_ENFORCED');
    return { qualityBackfill: true, retroEntitlementCount: 1, rerunSafe: true };
}

async function verifyRebirth(database, context, service) {
    await seedPlayer(database, context, {
        playerId: 'rebirth-replay', name: 'Rebirth Replay', finalRealm: true, withResetData: true
    });
    const replayOperation = 'verify-rebirth-replay';
    let replayResults;
    try {
        replayResults = await Promise.all([
            service.rebirth('rebirth-replay', {
                operationId: replayOperation,
                expectedRebirthCount: '1', expectedPolicyRevision: 1, rebornAt: FIXED_NOW
            }),
            service.rebirth('rebirth-replay', {
                operationId: replayOperation,
                expectedRebirthCount: '1', expectedPolicyRevision: 1, rebornAt: FIXED_NOW
            })
        ]);
    } catch (error) {
        error.details = {
            verification: 'REBIRTH_SAME_OPERATION_REPLAY',
            postgresDetail: String(error.detail || '').slice(0, 500)
        };
        throw error;
    }
    assert(replayResults.every((result) => result.outcome === 'REBIRTH_SUCCESS'),
        'REBIRTH_IDEMPOTENT_REPLAY_OUTCOME_INVALID');
    assert(replayResults.filter((result) => result.idempotentReplay === true).length === 1,
        'REBIRTH_IDEMPOTENT_REPLAY_COUNT_INVALID');

    const reset = await database.query(
        `SELECT player.realm_id, player.realm_stage, player.rebirth_count,
                (SELECT amount FROM player_wallets
                 WHERE player_id = player.id AND currency_id = 'SPIRIT_STONE') AS spirit_stone,
                (SELECT amount FROM player_wallets
                 WHERE player_id = player.id AND currency_id = 'HONOR') AS honor,
                (SELECT COUNT(*) FROM inventory_stacks WHERE player_id = player.id) AS stacks,
                (SELECT COUNT(*) FROM equipment_instances WHERE player_id = player.id) AS equipment,
                (SELECT COUNT(*) FROM player_items WHERE player_id = player.id) AS legacy_items,
                (SELECT COUNT(*) FROM player_skills WHERE player_id = player.id) AS skills,
                (SELECT COUNT(*) FROM player_cultivation_arts WHERE player_id = player.id) AS arts,
                (SELECT COUNT(*) FROM player_rebirth_history WHERE player_id = player.id) AS history,
                (SELECT COUNT(*) FROM player_spirit_root_reroll_entitlements
                 WHERE player_id = player.id AND status = 'AVAILABLE') AS entitlements,
                (SELECT COUNT(*) FROM resource_ledger
                 WHERE player_id = player.id AND reason = 'REBIRTH_RESET') AS ledger_entries,
                (SELECT COALESCE(SUM(delta), 0) FROM resource_ledger
                 WHERE player_id = player.id AND reason = 'REBIRTH_RESET') AS ledger_delta
         FROM players player WHERE player.id = 'rebirth-replay'`
    );
    const row = reset.rows[0];
    assert(String(row.realm_id) === String(context.firstRealm.id)
        && Number(row.realm_stage) === 1 && String(row.rebirth_count) === '1',
    'REBIRTH_RESET_PROGRESSION_INVALID');
    assert(String(row.spirit_stone) === '999' && String(row.honor) === '0',
        'REBIRTH_WALLET_RETENTION_INVALID');
    assert(['stacks', 'equipment', 'legacy_items', 'skills'].every((key) => String(row[key]) === '0')
        && String(row.arts) === '1', 'REBIRTH_DOMAIN_RESET_INVALID');
    assert(String(row.history) === '1' && String(row.entitlements) === '1'
        && String(row.ledger_entries) === '1' && String(row.ledger_delta) === '-77',
    'REBIRTH_AUDIT_ATOMICITY_INVALID', row);

    await seedPlayer(database, context, {
        playerId: 'rebirth-race', name: 'Rebirth Race', finalRealm: true
    });
    let raceResults;
    try {
        raceResults = await Promise.all([
            service.rebirth('rebirth-race', {
                operationId: 'verify-rebirth-race-a',
                expectedRebirthCount: '1', expectedPolicyRevision: 1, rebornAt: FIXED_NOW
            }),
            service.rebirth('rebirth-race', {
                operationId: 'verify-rebirth-race-b',
                expectedRebirthCount: '1', expectedPolicyRevision: 1, rebornAt: FIXED_NOW
            })
        ]);
    } catch (error) {
        error.details = {
            verification: 'REBIRTH_DIFFERENT_OPERATION_RACE',
            postgresDetail: String(error.detail || '').slice(0, 500)
        };
        throw error;
    }
    assert(raceResults.filter((result) => result.outcome === 'REBIRTH_SUCCESS').length === 1
        && raceResults.filter((result) => result.outcome === 'REBIRTH_NOT_AT_FINAL_STAGE').length === 1,
    'REBIRTH_DIFFERENT_OPERATION_RACE_INVALID');
    const raceHistory = await database.query(
        `SELECT COUNT(*) AS count FROM player_rebirth_history
         WHERE player_id = 'rebirth-race'`
    );
    assert(String(raceHistory.rows[0].count) === '1', 'REBIRTH_RACE_CREATED_DUPLICATE_HISTORY');
    return { sameOperationReplay: true, differentOperationSerialized: true, atomicReset: true };
}

async function seedEntitlements(database, playerId, rebirthNumbers) {
    for (const rebirthNumber of rebirthNumbers) {
        await database.query(
            `INSERT INTO player_spirit_root_reroll_entitlements (
                player_id, rebirth_number, status, granted_at
             ) VALUES ($1, $2, 'AVAILABLE', $3)`,
            [playerId, rebirthNumber, FIXED_NOW]
        );
    }
}

async function oldestEntitlement(database, playerId) {
    const result = await database.query(
        `SELECT id FROM player_spirit_root_reroll_entitlements
         WHERE player_id = $1 AND status = 'AVAILABLE'
         ORDER BY rebirth_number ASC, id ASC LIMIT 1`,
        [playerId]
    );
    return String(result.rows[0].id);
}

async function verifyReroll(database, context, service) {
    await seedPlayer(database, context, {
        playerId: 'reroll-replay', name: 'Reroll Replay', rebirthCount: '1'
    });
    await seedEntitlements(database, 'reroll-replay', ['1']);
    const replayEntitlementId = await oldestEntitlement(database, 'reroll-replay');
    const replayResults = await Promise.all([
        service.reroll('reroll-replay', {
            operationId: 'verify-reroll-replay', expectedEntitlementId: replayEntitlementId,
            seed: 20260720, rolledAt: FIXED_NOW
        }),
        service.reroll('reroll-replay', {
            operationId: 'verify-reroll-replay', expectedEntitlementId: replayEntitlementId,
            seed: 20260720, rolledAt: FIXED_NOW
        })
    ]);
    assert(replayResults.every((result) => result.outcome === 'SPIRIT_ROOT_REROLL_SUCCESS'),
        'SPIRIT_ROOT_REROLL_REPLAY_OUTCOME_INVALID');
    assert(replayResults.filter((result) => result.idempotentReplay === true).length === 1,
        'SPIRIT_ROOT_REROLL_REPLAY_COUNT_INVALID');

    await seedPlayer(database, context, {
        playerId: 'reroll-race', name: 'Reroll Race', rebirthCount: '2'
    });
    await seedEntitlements(database, 'reroll-race', ['1', '2']);
    const expectedEntitlementId = await oldestEntitlement(database, 'reroll-race');
    const raceResults = await Promise.all([
        service.reroll('reroll-race', {
            operationId: 'verify-reroll-race-a', expectedEntitlementId,
            seed: 20260721, rolledAt: FIXED_NOW
        }),
        service.reroll('reroll-race', {
            operationId: 'verify-reroll-race-b', expectedEntitlementId,
            seed: 20260722, rolledAt: FIXED_NOW
        })
    ]);
    assert(raceResults.filter((result) => result.outcome === 'SPIRIT_ROOT_REROLL_SUCCESS').length === 1
        && raceResults.filter((result) => result.outcome === 'SPIRIT_ROOT_REROLL_PREVIEW_STALE').length === 1,
    'SPIRIT_ROOT_REROLL_STALE_RACE_INVALID');

    const persisted = await database.query(
        `SELECT
            COUNT(*) FILTER (WHERE status = 'CONSUMED') AS consumed,
            COUNT(*) FILTER (WHERE status = 'AVAILABLE') AS available,
            (SELECT COUNT(*) FROM player_spirit_root_roll_history
             WHERE player_id = 'reroll-race') AS history
         FROM player_spirit_root_reroll_entitlements
         WHERE player_id = 'reroll-race'`
    );
    assert(String(persisted.rows[0].consumed) === '1'
        && String(persisted.rows[0].available) === '1'
        && String(persisted.rows[0].history) === '1',
    'SPIRIT_ROOT_REROLL_STALE_CONSUMED_NEXT_ENTITLEMENT');
    return { sameOperationReplay: true, stalePreviewGuard: true, nextEntitlementPreserved: true };
}

let testDatabaseUrl = null;
let configurationFailed = false;
try {
    testDatabaseUrl = loadTestDatabaseUrl(process.env);
} catch (error) {
    configurationFailed = true;
    console.error(JSON.stringify({
        status: 'FAIL',
        errorCode: error.code || 'PROGRESSION_TEST_DATABASE_CONFIGURATION_INVALID',
        connectionAttempted: false
    }, null, 2));
    process.exitCode = 1;
}

if (!configurationFailed && !testDatabaseUrl) {
    console.log(JSON.stringify({
        status: 'SKIP',
        reason: 'PROGRESSION_TEST_DATABASE_URL_REQUIRED',
        primaryDatabaseUsed: false
    }, null, 2));
} else if (!configurationFailed) {
    const schemaName = `${TEST_SCHEMA_PREFIX}${process.pid}_${Date.now()}`;
    assert(new RegExp(`^${TEST_SCHEMA_PREFIX}[0-9_]+$`).test(schemaName),
        'PROGRESSION_TEST_SCHEMA_INVALID');
    const rawPool = new Pool({ connectionString: testDatabaseUrl, max: 8 });
    const database = new SchemaScopedPool(rawPool, schemaName);
    let schemaCreated = false;
    let failureStage = 'CREATE_SCHEMA';
    try {
        await rawPool.query(`CREATE SCHEMA "${schemaName}"`);
        schemaCreated = true;
        failureStage = 'RUN_MIGRATIONS';
        const migrations = await runMigrations({ pool: database });
        for (const requiredMigration of [
            '016_rebirth_foundation.sql',
            '017_rebirth_leaderboard_projection.sql',
            '018_spirit_root_progression_foundation.sql',
            '019_spirit_root_quality_cutover.sql'
            , '025_profession_foundation.sql'
            , '030_starter_spirit_gathering_recipe.sql'
        ]) {
            assert(migrations.applied.includes(requiredMigration),
                'PROGRESSION_REQUIRED_MIGRATION_NOT_APPLIED');
        }
        failureStage = 'BOOTSTRAP_GAME_DATA';
        const context = getGameDataContext();
        const services = createServices(database, context.gameDataManager);
        failureStage = 'VERIFY_CUTOVER';
        const cutover = await verifyCutover(database);
        failureStage = 'VERIFY_REBIRTH';
        const rebirth = await verifyRebirth(database, context, services.rebirth);
        failureStage = 'VERIFY_REROLL';
        const reroll = await verifyReroll(database, context, services.reroll);
        failureStage = 'VERIFY_PROFESSION';
        const profession = await verifyProfession(database, context, services.profession);
        failureStage = 'VERIFY_SKILL_LOADOUT';
        const skillLoadout = await verifySkillLoadout(database, context, services.skill);
        failureStage = 'VERIFY_ITEM_USE';
        const itemUse = await verifyItemUse(database, context, services.itemUse);
        console.log(JSON.stringify({
            status: 'PASS',
            isolatedSchema: true,
            appliedMigrationCount: migrations.applied.length,
            cutover,
            rebirth,
            reroll,
            profession,
            skillLoadout,
            itemUse
        }, null, 2));
    } catch (error) {
        console.error(JSON.stringify({
            status: 'FAIL',
            errorCode: error.code || 'PROGRESSION_POSTGRES_VERIFICATION_FAILED',
            failureStage,
            message: sanitizeFailureMessage(error),
            details: error.details || null,
            isolatedSchema: schemaCreated
        }, null, 2));
        process.exitCode = 1;
    } finally {
        try {
            if (schemaCreated) {
                assert(schemaName.startsWith(TEST_SCHEMA_PREFIX),
                    'PROGRESSION_TEST_SCHEMA_CLEANUP_REJECTED');
                await rawPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
            }
        } catch (error) {
            console.error(JSON.stringify({
                status: 'FAIL',
                errorCode: error.code || 'PROGRESSION_TEST_SCHEMA_CLEANUP_FAILED',
                cleanupFailed: true
            }, null, 2));
            process.exitCode = 1;
        } finally {
            await rawPool.end().catch(() => {
                process.exitCode = 1;
            });
        }
    }
}
