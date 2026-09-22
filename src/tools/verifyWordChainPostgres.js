import 'dotenv/config';
import assert from 'node:assert/strict';
import pool from '../database/postgres.js';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import WordChainService from '../gameplay/minigames/WordChainService.js';

const client = await pool.connect();
try {
    await client.query('BEGIN');
    const tables = await client.query(`
        SELECT to_regclass('public.words') AS words,
               to_regclass('public.word_chain_sessions') AS sessions,
               to_regclass('public.word_chain_moves') AS moves
    `);
    assert(tables.rows[0].words && tables.rows[0].sessions && tables.rows[0].moves);
    const dictionary = await client.query(
        `SELECT COUNT(*)::int AS count FROM words
         WHERE lang_code = 'vi' AND dictionary_revision = 'VI_TWO_PART_WORDS_V1'`
    );
    assert(Number(dictionary.rows[0].count) > 0, 'Vietnamese dictionary has not been imported');

    const gameDataManager = bootstrapGameData();
    const transactionalUnitOfWork = { async execute(work) { return work(client); } };
    const service = new WordChainService({
        gameDataManager,
        unitOfWork: transactionalUnitOfWork,
        seedProvider: { nextSeed: () => 7 },
        timeProvider: { now: () => new Date('2026-08-06T10:00:00.000Z') }
    });
    const suffix = `${process.pid}${Date.now() % 1000000}`;
    const guildId = `wa-g-${suffix}`;
    const channelId = `wa-c-${suffix}`;
    const competingChannelId = `wa-c2-${suffix}`;
    const players = [0, 1, 2].map((index) => `wa-p${index}-${suffix}`);
    const started = await service.start(guildId, channelId, players[0], {
        operationId: `word-audit-start-${suffix}`,
        seed: 7
    });
    assert.equal(started.status, 'WORD_CHAIN_STARTED');

    const competingStart = await service.start(guildId, competingChannelId, players[1], {
        operationId: `word-audit-competing-start-${suffix}`,
        seed: 8
    });
    assert.equal(competingStart.status, 'WORD_CHAIN_ALREADY_ACTIVE');
    assert.equal(competingStart.sessionId, started.sessionId);
    assert.equal(competingStart.channelId, channelId);

    let requiredPart = started.requiredPart;
    for (const [index, playerId] of players.slice(1).entries()) {
        const candidate = await client.query(
            `SELECT word FROM words
             WHERE lang_code = 'vi'
               AND dictionary_revision = 'VI_TWO_PART_WORDS_V1'
               AND first_part = $1
               AND normalized_word <> $2
             ORDER BY id LIMIT 1`,
            [requiredPart, started.currentWord.toLocaleLowerCase('vi')]
        );
        assert(candidate.rowCount, `No continuation for ${requiredPart}`);
        const result = await service.submit(guildId, channelId, playerId, candidate.rows[0].word, {
            operationId: `word-audit-valid-${index}-${suffix}`
        });
        assert.equal(result.status, 'WORD_CHAIN_VALID_MOVE');
        requiredPart = result.requiredPart;
    }

    const wrong = await client.query(
        `SELECT word FROM words
         WHERE lang_code = 'vi'
           AND dictionary_revision = 'VI_TWO_PART_WORDS_V1'
           AND first_part <> $1
         ORDER BY id LIMIT 1`,
        [requiredPart]
    );
    assert(wrong.rowCount);
    const invalid = await service.submit(guildId, channelId, players[0], 'không-hợp lệ input', {
        operationId: `word-audit-invalid-${suffix}`
    });
    assert.equal(invalid.status, 'WORD_CHAIN_IGNORED_INVALID_INPUT');
    assert.equal(invalid.requiredPart, requiredPart);
    const invalidMove = await client.query(
        'SELECT COUNT(*)::int AS count FROM word_chain_moves WHERE operation_id = $1',
        [`word-audit-invalid-${suffix}`]
    );
    assert.equal(invalidMove.rows[0].count, 0);

    const unknown = await service.submit(guildId, channelId, players[0], 'zzzzzz qqqqqq', {
        operationId: `word-audit-unknown-${suffix}`
    });
    assert.equal(unknown.status, 'WORD_CHAIN_QUALIFIED_FAILURE');
    assert.equal(unknown.failureReason, 'NOT_IN_DICTIONARY');
    assert.equal(unknown.failureCount, 1);

    let settled;
    for (let index = 2; index <= 10; index += 1) {
        settled = await service.submit(guildId, channelId, players[0], wrong.rows[0].word, {
            operationId: `word-audit-failure-${index}-${suffix}`
        });
        assert.equal(
            settled.status,
            index === 10 ? 'WORD_CHAIN_SETTLED' : 'WORD_CHAIN_QUALIFIED_FAILURE'
        );
    }
    assert.equal(settled.failureCount, 10);
    assert.equal(settled.validMoveCount, 2);
    assert.equal(settled.participantCount, 3);
    assert.equal(settled.winnerPlayerId, players[2]);
    assert.equal(settled.rewardAmount, '100');

    const state = await client.query(
        `SELECT status, failure_count, valid_move_count, reward_amount
         FROM word_chain_sessions WHERE id = $1`,
        [settled.sessionId]
    );
    assert.deepEqual(state.rows[0], {
        status: 'SETTLED', failure_count: 10, valid_move_count: 2, reward_amount: '100'
    });
    const wallet = await client.query(
        `SELECT amount FROM player_wallets
         WHERE player_id = $1 AND currency_id = 'SPIRIT_STONE'`,
        [players[2]]
    );
    assert.equal(wallet.rows[0].amount, '100');
    const ledger = await client.query(
        `SELECT COUNT(*)::int AS count FROM resource_ledger
         WHERE player_id = $1 AND reason = 'WORD_CHAIN_WIN_REWARD'`,
        [players[2]]
    );
    assert.equal(ledger.rows[0].count, 1);
    const unknownMove = await client.query(
        `SELECT word_id, outcome, failure_reason, normalized_word
         FROM word_chain_moves
         WHERE operation_id = $1`,
        [`word-audit-unknown-${suffix}`]
    );
    assert.deepEqual(unknownMove.rows[0], {
        word_id: null,
        outcome: 'QUALIFIED_FAILURE',
        failure_reason: 'NOT_IN_DICTIONARY',
        normalized_word: 'zzzzzz qqqqqq'
    });

    console.log(JSON.stringify({
        status: 'PASS',
        dictionaryRows: Number(dictionary.rows[0].count),
        validMoves: settled.validMoveCount,
        qualifiedFailures: settled.failureCount,
        unknownDictionaryCountsAsFailure: true,
        invalidFormatReturnsRequiredPart: true,
        participants: settled.participantCount,
        rewardAmount: settled.rewardAmount,
        rollback: true
    }, null, 2));
} catch (error) {
    console.error(JSON.stringify({
        status: 'FAIL',
        errorCode: error?.code || error?.message || 'WORD_CHAIN_POSTGRES_VERIFY_FAILED',
        message: String(error?.message || '').slice(0, 200)
    }, null, 2));
    process.exitCode = 1;
} finally {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    await pool.end();
}
