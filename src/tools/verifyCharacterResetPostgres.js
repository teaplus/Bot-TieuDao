import 'dotenv/config';
import assert from 'node:assert/strict';
import pool from '../database/postgres.js';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import CharacterResetService from '../gameplay/player/CharacterResetService.js';
import IdempotentOperationExecutor from '../platform/idempotency/IdempotentOperationExecutor.js';
import IdempotencyRepository from '../repositories/IdempotencyRepository.js';
import PlayerAccountRepository from '../repositories/PlayerAccountRepository.js';
import PlayerRuntimeRepository from '../repositories/PlayerRuntimeRepository.js';
import PlayerWalletRepository from '../repositories/PlayerWalletRepository.js';

const client = await pool.connect();
try {
    await client.query('BEGIN');
    const manager = bootstrapGameData();
    const rules = manager.getCollection('characterResetRules');
    assert.equal(rules.cooldownSeconds, 0);
    assert.equal(rules.starterCurrencyGrantOnRecreate, false);
    const suffix = `${process.pid}${Date.now() % 1000000}`;
    const playerId = `reset-${suffix}`;
    await new PlayerAccountRepository().ensureGuest(client, playerId);
    await client.query(
        `UPDATE players SET
            name = 'Cựu Đạo Hữu', account_status = 'REGISTERED',
            character_registered_at = CURRENT_TIMESTAMP,
            realm_id = 5, realm_stage = 7, cultivation = 12345,
            rebirth_count = 2, spirit_root_id = 'FIRE_ROOT'
         WHERE id = $1`,
        [playerId]
    );
    const wallet = new PlayerWalletRepository();
    await wallet.credit(client, { playerId, currencyId: 'SPIRIT_STONE', amount: '1000' });
    await wallet.credit(client, { playerId, currencyId: 'SECT_POINT', amount: '50' });
    await client.query(
        `INSERT INTO player_items (player_id, item_id, quantity)
         VALUES ($1, 'RESET_TEST_ITEM', 2)`,
        [playerId]
    );
    await client.query(
        `INSERT INTO player_cultivation_arts (player_id, art_id)
         VALUES ($1, 'RESET_TEST_ART')`,
        [playerId]
    );
    await client.query(
        `INSERT INTO player_skills (player_id, skill_id)
         VALUES ($1, 'RESET_TEST_SKILL')`,
        [playerId]
    );
    await client.query(
        `INSERT INTO player_professions (player_id, profession_id)
         VALUES ($1, 'ALCHEMIST')`,
        [playerId]
    );
    await client.query(
        `INSERT INTO player_learned_recipes (player_id, recipe_id)
         VALUES ($1, 'RESET_TEST_RECIPE')`,
        [playerId]
    );
    await client.query(
        `INSERT INTO idle_accumulators (player_id, source_id, checkpoint_at, rules_revision)
         VALUES ($1, 'CULTIVATION', CURRENT_TIMESTAMP, 'test')`,
        [playerId]
    );
    await client.query(
        `INSERT INTO player_map_states (player_id, current_map_id, movement_version, moved_at)
         VALUES ($1, 'THANH_VAN_SON_MACH', 1, CURRENT_TIMESTAMP)`,
        [playerId]
    );
    await client.query(
        `INSERT INTO player_map_movements (
             player_id, operation_id, from_map_id, to_map_id, direction, moved_at
         ) VALUES ($1, $2, NULL, 'THANH_VAN_SON_MACH', 'INITIALIZE', CURRENT_TIMESTAMP)`,
        [playerId, `MAP_INIT:${playerId}`]
    );
    await client.query(
        `INSERT INTO player_minigame_rounds (
            player_id, game_id, rules_revision, operation_id, wager, payout,
            net_delta, input_snapshot, outcome_snapshot, rng_snapshot,
            status, started_at, expires_at
         ) VALUES ($1, 'BLACKJACK', 'test', $2, 100, 0, -100,
                   '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
                   'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '2 minutes')`,
        [playerId, `reset-active-${suffix}`]
    );

    const sameTransactionUnitOfWork = { async execute(work) { return work(client); } };
    const idempotencyRepository = new IdempotencyRepository();
    const service = new CharacterResetService({
        gameDataManager: manager,
        unitOfWork: sameTransactionUnitOfWork,
        operationExecutor: new IdempotentOperationExecutor({
            unitOfWork: sameTransactionUnitOfWork,
            idempotencyRepository
        }),
        walletRepository: wallet,
        timeProvider: { now: () => new Date('2026-08-10T13:00:00.000Z') }
    });
    await assert.rejects(
        () => service.preview(playerId),
        /CHARACTER_RESET_MINIGAME_ACTIVE/
    );
    await client.query(
        `UPDATE player_minigame_rounds
         SET status = 'SETTLED', settled_at = CURRENT_TIMESTAMP,
             outcome_snapshot = '{"result":"LOSS"}'::jsonb
         WHERE player_id = $1 AND status = 'ACTIVE'`,
        [playerId]
    );
    const preview = await service.preview(playerId);
    assert.equal(preview.retainedSpiritStone, '1000');
    assert.equal(preview.cooldownSeconds, 0);
    const operationId = `character-reset-${suffix}`;
    const reset = await service.reset(playerId, { operationId });
    assert.equal(reset.status, 'CHARACTER_RESET_COMPLETED');
    assert.equal(reset.retainedSpiritStone, '1000');
    assert.equal(reset.resetNumber, 1);
    assert.equal(await wallet.getBalance(client, playerId, 'SPIRIT_STONE'), '1000');
    assert.equal(await wallet.getBalance(client, playerId, 'SECT_POINT'), '0');

    const guest = await client.query(
        `SELECT account_status, character_registered_at, character_reset_count,
                realm_id, realm_stage, rebirth_count
         FROM players WHERE id = $1`,
        [playerId]
    );
    assert.deepEqual(guest.rows[0], {
        account_status: 'GUEST',
        character_registered_at: null,
        character_reset_count: 1,
        realm_id: 1,
        realm_stage: 1,
        rebirth_count: '0'
    });
    for (const table of [
        'player_items', 'player_cultivation_arts', 'player_skills',
        'player_professions', 'player_learned_recipes', 'idle_accumulators',
        'player_map_states', 'player_map_movements'
    ]) {
        const count = await client.query(`SELECT COUNT(*)::int AS count FROM ${table} WHERE player_id = $1`, [playerId]);
        assert.equal(count.rows[0].count, 0, `${table} was not reset`);
    }
    const history = await client.query(
        `SELECT retained_spirit_stone, reset_number
         FROM player_character_reset_history WHERE operation_id = $1`,
        [operationId]
    );
    assert.deepEqual(history.rows[0], { retained_spirit_stone: '1000', reset_number: 1 });
    const resetLedger = await client.query(
        `SELECT delta, balance_after FROM resource_ledger
         WHERE operation_id = $1 AND reason = 'CHARACTER_RESET'`,
        [operationId]
    );
    assert.deepEqual(resetLedger.rows[0], { delta: '-50', balance_after: '0' });

    const replay = await service.reset(playerId, { operationId });
    assert.equal(replay.idempotentReplay, true);
    assert.equal(replay.resetNumber, 1);

    const runtimeRepository = new PlayerRuntimeRepository();
    const recreated = await runtimeRepository.createPlayer(playerId, {
        name: 'Tân Đạo Hữu',
        realmId: 1,
        realmStage: 1,
        baseStats: { atk: '40', def: '20', hp: '200', spd: '5' },
        spiritRootId: 'FIRE_ROOT',
        spiritRootQualityTierId: 'LOWER_GRADE',
        spiritualRoot: 'Hỏa Linh Căn',
        cultivationArtId: 'CP_NEUTRAL_HOANG',
        spiritStones: '100',
        creationRerollsUsed: 0,
        creationRuleRevision: 1,
        starterRecipeIds: [],
        currentMapId: 'THANH_VAN_SON_MACH',
        starterCultivationArtItem: null,
        starterEquipment: {
            itemId: 'EQ_FIRE_WEAPON', rarity: 'COMMON', grade: 'HOANG', gradeQuality: 'LOW',
            fixedEffects: [], affixes: [], elementIds: ['FIRE'], generatedName: 'Tân Thủ Kiếm',
            equipmentType: 'WEAPON', equippedSlot: 'WEAPON'
        }
    }, { client });
    assert.equal(recreated.spiritStones, '1000');
    assert.equal(await wallet.getBalance(client, playerId, 'SPIRIT_STONE'), '1000');
    const registered = await runtimeRepository.findById(playerId, { client });
    assert.equal(registered.accountStatus, 'REGISTERED');
    assert.equal(registered.name, 'Tân Đạo Hữu');

    console.log(JSON.stringify({
        status: 'PASS',
        resetNumber: reset.resetNumber,
        retainedSpiritStone: reset.retainedSpiritStone,
        resetOtherCurrency: true,
        activeMiniGameBlocked: true,
        starterGrantRepeated: false,
        recreated: registered.name,
        idempotentReplay: replay.idempotentReplay,
        rollback: true
    }, null, 2));
} catch (error) {
    console.error(JSON.stringify({
        status: 'FAIL',
        errorCode: error?.code || error?.message || 'CHARACTER_RESET_VERIFY_FAILED',
        message: String(error?.message || '').slice(0, 400)
    }, null, 2));
    process.exitCode = 1;
} finally {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    await pool.end();
}
