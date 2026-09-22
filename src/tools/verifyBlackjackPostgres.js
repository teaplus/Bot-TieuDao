import 'dotenv/config';
import assert from 'node:assert/strict';
import pool from '../database/postgres.js';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import BlackjackEngine from '../gameplay/minigames/BlackjackEngine.js';
import MiniGameService from '../gameplay/minigames/MiniGameService.js';
import PlayerMapService from '../gameplay/maps/PlayerMapService.js';
import PlayerAccountRepository from '../repositories/PlayerAccountRepository.js';
import PlayerRuntimeRepository from '../repositories/PlayerRuntimeRepository.js';
import PlayerWalletRepository from '../repositories/PlayerWalletRepository.js';

const client = await pool.connect();
try {
    await client.query('BEGIN');
    const manager = bootstrapGameData();
    const game = manager.getCollection('miniGameRules').games.BLACKJACK;
    assert.equal(game.status, 'ACTIVE');
    assert.equal(game.paytable.naturalPayoutMultiplierBasisPoints, 20000);
    const engine = new BlackjackEngine();
    let activeSeed = null;
    for (let seed = 1; seed < 1000 && activeSeed == null; seed += 1) {
        if (engine.start({ seed, wager: '1000', rules: game.paytable }).status === 'ACTIVE') {
            activeSeed = seed;
        }
    }
    assert(activeSeed != null);

    const suffix = `${process.pid}${Date.now() % 1000000}`;
    const playerId = `bj-${suffix}`;
    await new PlayerAccountRepository().ensureGuest(client, playerId);
    const walletRepository = new PlayerWalletRepository();
    await walletRepository.credit(client, {
        playerId, currencyId: 'SPIRIT_STONE', amount: '10000'
    });
    const playerRuntimeRepository = new PlayerRuntimeRepository();
    const playerMapService = new PlayerMapService({
        playerRuntimeRepository,
        gameDataManager: manager
    });
    const service = new MiniGameService({
        gameDataManager: manager,
        playerRuntimeRepository,
        playerMapService,
        operationExecutor: { async execute(_operation, work) { return work(client); } },
        walletRepository
    });

    const startTime = new Date('2026-08-10T10:00:00.000Z');
    const started = await service.startBlackjack(playerId, '1000', {
        operationId: `bj-start-${suffix}`,
        seed: activeSeed,
        startedAt: startTime
    });
    assert.equal(started.status, 'BLACKJACK_STARTED');
    assert.equal(started.balance, '9000');
    assert.equal(started.dealerHand.length, 2);
    assert.equal(started.playerHands[0].cards.length, 2);

    const stood = await service.actBlackjack(playerId, started.roundId, 'STAND', {
        operationId: `bj-stand-${suffix}`,
        settledAt: new Date('2026-08-10T10:00:10.000Z')
    });
    assert.equal(stood.status, 'BLACKJACK_SETTLED');
    assert(stood.outcome);

    const doubledStart = await service.startBlackjack(playerId, '1000', {
        operationId: `bj-double-start-${suffix}`,
        seed: activeSeed,
        startedAt: new Date('2026-08-10T10:01:00.000Z')
    });
    assert.equal(doubledStart.status, 'BLACKJACK_STARTED');
    const doubled = await service.actBlackjack(playerId, doubledStart.roundId, 'DOUBLE', {
        operationId: `bj-double-${suffix}`,
        settledAt: new Date('2026-08-10T10:01:05.000Z')
    });
    assert.equal(doubled.status, 'BLACKJACK_SETTLED');
    assert.equal(doubled.wager, '2000');
    assert.equal(doubled.playerHands[0].cards.length, 3);

    const expiredStart = await service.startBlackjack(playerId, '1000', {
        operationId: `bj-expire-start-${suffix}`,
        seed: activeSeed,
        startedAt: new Date('2026-08-10T10:02:00.000Z')
    });
    const expired = await service.expireBlackjack(playerId, expiredStart.roundId, {
        operationId: `bj-expire-${suffix}`,
        settledAt: new Date('2026-08-10T10:04:01.000Z')
    });
    assert.equal(expired.status, 'BLACKJACK_EXPIRED_AUTO_STAND');
    assert(expired.outcome);

    const persisted = await client.query(
        `SELECT status, wager, outcome_snapshot->>'status' AS engine_status
         FROM player_minigame_rounds
         WHERE player_id = $1 AND game_id = 'BLACKJACK'
         ORDER BY id`,
        [playerId]
    );
    assert.equal(persisted.rowCount, 3);
    assert(persisted.rows.every((row) => row.status === 'SETTLED'));
    assert(persisted.rows.every((row) => row.engine_status === 'SETTLED'));
    const activeCount = await client.query(
        `SELECT COUNT(*)::int AS count FROM player_minigame_rounds
         WHERE player_id = $1 AND game_id = 'BLACKJACK' AND status = 'ACTIVE'`,
        [playerId]
    );
    assert.equal(activeCount.rows[0].count, 0);

    const allPlayerId = `bj-all-${suffix}`;
    await new PlayerAccountRepository().ensureGuest(client, allPlayerId);
    await walletRepository.credit(client, {
        playerId: allPlayerId, currencyId: 'SPIRIT_STONE', amount: '5000'
    });
    const allStarted = await service.startBlackjack(allPlayerId, 'all', {
        operationId: `bj-all-start-${suffix}`,
        seed: activeSeed,
        startedAt: new Date('2026-08-10T11:00:00.000Z')
    });
    assert.equal(allStarted.status, 'BLACKJACK_STARTED');
    assert.equal(allStarted.wager, '5000');
    assert.equal(allStarted.balance, '0');
    assert.equal(allStarted.canDouble, false);
    await service.actBlackjack(allPlayerId, allStarted.roundId, 'STAND', {
        operationId: `bj-all-stand-${suffix}`,
        settledAt: new Date('2026-08-10T11:00:05.000Z')
    });

    const halfPlayerId = `bj-half-${suffix}`;
    await new PlayerAccountRepository().ensureGuest(client, halfPlayerId);
    await walletRepository.credit(client, {
        playerId: halfPlayerId, currencyId: 'SPIRIT_STONE', amount: '501'
    });
    const halfStarted = await service.startBlackjack(halfPlayerId, 'half', {
        operationId: `bj-half-start-${suffix}`,
        seed: activeSeed,
        startedAt: new Date('2026-08-10T11:10:00.000Z')
    });
    assert.equal(halfStarted.status, 'BLACKJACK_STARTED');
    assert.equal(halfStarted.wager, '250');
    assert.equal(halfStarted.balance, '251');
    assert.equal(halfStarted.canDouble, true);
    await service.actBlackjack(halfPlayerId, halfStarted.roundId, 'STAND', {
        operationId: `bj-half-stand-${suffix}`,
        settledAt: new Date('2026-08-10T11:10:05.000Z')
    });
    const lowHalfPlayerId = `bj-half-low-${suffix}`;
    await new PlayerAccountRepository().ensureGuest(client, lowHalfPlayerId);
    await walletRepository.credit(client, {
        playerId: lowHalfPlayerId, currencyId: 'SPIRIT_STONE', amount: '199'
    });
    await assert.rejects(
        () => service.startBlackjack(lowHalfPlayerId, 'half', {
            operationId: `bj-half-low-start-${suffix}`,
            seed: activeSeed,
            startedAt: new Date('2026-08-10T11:20:00.000Z')
        }),
        /MINIGAME_WAGER_BELOW_MINIMUM/
    );
    assert.equal(
        await walletRepository.getBalance(client, lowHalfPlayerId, 'SPIRIT_STONE'),
        '199'
    );

    console.log(JSON.stringify({
        status: 'PASS',
        activeSeed,
        rounds: persisted.rowCount,
        stand: stood.outcome.result,
        doubleWager: doubled.wager,
        timeout: expired.status,
        allWager: allStarted.wager,
        oddHalfWager: halfStarted.wager,
        belowMinimumRejected: true,
        rollback: true
    }, null, 2));
} catch (error) {
    console.error(JSON.stringify({
        status: 'FAIL',
        errorCode: error?.code || error?.message || 'BLACKJACK_POSTGRES_VERIFY_FAILED',
        message: String(error?.message || '').slice(0, 300)
    }, null, 2));
    process.exitCode = 1;
} finally {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    await pool.end();
}
