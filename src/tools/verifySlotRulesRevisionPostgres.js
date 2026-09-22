import 'dotenv/config';
import assert from 'node:assert/strict';
import pool from '../database/postgres.js';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import MiniGameRoundRepository from '../repositories/MiniGameRoundRepository.js';
import PlayerAccountRepository from '../repositories/PlayerAccountRepository.js';

const client = await pool.connect();
try {
    await client.query('BEGIN');
    const manager = bootstrapGameData();
    const rulesRevision = manager.getCollection('miniGameRules').revision;
    assert(rulesRevision.length > 80, 'Fixture must cover the former VARCHAR(80) failure');

    const suffix = `${process.pid}${Date.now() % 1000000}`;
    const playerId = `slot-revision-${suffix}`;
    await new PlayerAccountRepository().ensureGuest(client, playerId);

    const repository = new MiniGameRoundRepository();
    const round = await repository.recordSettledRound(client, {
        playerId,
        gameId: 'SLOT',
        rulesRevision,
        operationId: `slot-revision-operation-${suffix}`,
        wager: '100',
        payout: '0',
        netDelta: '-100',
        inputSnapshot: { wager: '100' },
        outcomeSnapshot: { isWin: false },
        rngSnapshot: { seed: 1 },
        settledAt: new Date('2026-08-11T12:00:00.000Z')
    });
    assert.equal(round.rulesRevision, rulesRevision);

    const column = await client.query(
        `SELECT data_type, character_maximum_length
         FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND table_name = 'player_minigame_rounds'
           AND column_name = 'rules_revision'`
    );
    assert.equal(column.rows[0].data_type, 'text');
    assert.equal(column.rows[0].character_maximum_length, null);

    console.log(JSON.stringify({
        status: 'PASS',
        revisionLength: rulesRevision.length,
        persistedRevision: round.rulesRevision,
        columnType: column.rows[0].data_type,
        rollback: true
    }, null, 2));
} catch (error) {
    console.error(JSON.stringify({
        status: 'FAIL',
        errorCode: error?.code || error?.message || 'SLOT_REVISION_VERIFY_FAILED',
        message: String(error?.message || '').slice(0, 300)
    }, null, 2));
    process.exitCode = 1;
} finally {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    await pool.end();
}
