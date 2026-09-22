import 'dotenv/config';
import assert from 'node:assert/strict';
import pool from '../database/postgres.js';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import SpiritStoneTransferService from '../gameplay/economy/SpiritStoneTransferService.js';
import PlayerAccountRepository from '../repositories/PlayerAccountRepository.js';
import PlayerWalletRepository from '../repositories/PlayerWalletRepository.js';

const client = await pool.connect();
try {
    await client.query('BEGIN');
    const manager = bootstrapGameData();
    const rules = manager.getCollection('spiritStoneTransferRules');
    assert.equal(rules.revision, 'SPIRIT_STONE_TRANSFER_V2_GUEST_RECIPIENT');
    const suffix = `${process.pid}${Date.now() % 1000000}`;
    const senderId = `give-a-${suffix}`;
    const recipientId = `give-b-${suffix}`;
    const guestId = `give-g-${suffix}`;
    const missingGuestId = `give-new-g-${suffix}`;
    const accountRepository = new PlayerAccountRepository();
    for (const playerId of [senderId, recipientId, guestId]) {
        await accountRepository.ensureGuest(client, playerId);
    }
    await client.query(
        `UPDATE players
         SET account_status = 'REGISTERED', character_registered_at = CURRENT_TIMESTAMP,
             name = CASE id WHEN $1 THEN 'Người Gửi' ELSE 'Người Nhận' END
         WHERE id = ANY($2::varchar[])`,
        [senderId, [senderId, recipientId]]
    );
    const walletRepository = new PlayerWalletRepository();
    await walletRepository.credit(client, {
        playerId: senderId, currencyId: 'SPIRIT_STONE', amount: '1000'
    });
    await walletRepository.credit(client, {
        playerId: recipientId, currencyId: 'SPIRIT_STONE', amount: '100'
    });
    const unitOfWork = { async execute(work) { return work(client); } };
    const service = new SpiritStoneTransferService({
        gameDataManager: manager,
        unitOfWork,
        walletRepository,
        timeProvider: { now: () => new Date('2026-08-10T12:00:00.000Z') }
    });

    const preview = await service.preview(senderId, recipientId, '400');
    assert.equal(preview.amount, '400');
    assert.equal(preview.feeAmount, '0');
    assert.equal(preview.confirmationTtlSeconds, 60);
    const operationId = `give-transfer-${suffix}`;
    const result = await service.transfer(senderId, recipientId, '400', { operationId });
    assert.equal(result.status, 'SPIRIT_STONE_TRANSFER_COMPLETED');
    assert.equal(result.receivedAmount, '400');
    assert.equal(await walletRepository.getBalance(client, senderId, 'SPIRIT_STONE'), '600');
    assert.equal(await walletRepository.getBalance(client, recipientId, 'SPIRIT_STONE'), '500');

    const replay = await service.transfer(senderId, recipientId, '400', { operationId });
    assert.equal(replay.idempotentReplay, true);
    assert.equal(await walletRepository.getBalance(client, senderId, 'SPIRIT_STONE'), '600');
    assert.equal(await walletRepository.getBalance(client, recipientId, 'SPIRIT_STONE'), '500');

    const persisted = await client.query(
        `SELECT gross_amount, fee_amount, received_amount, status
         FROM spirit_stone_transfers WHERE operation_id = $1`,
        [operationId]
    );
    assert.deepEqual(persisted.rows[0], {
        gross_amount: '400', fee_amount: '0', received_amount: '400', status: 'COMPLETED'
    });
    const ledger = await client.query(
        `SELECT player_id, delta, reason, reference_id
         FROM resource_ledger
         WHERE operation_id = $1
         ORDER BY player_id`,
        [operationId]
    );
    assert.equal(ledger.rowCount, 2);
    assert.deepEqual(ledger.rows.map((row) => row.delta).sort(), ['-400', '400']);
    assert(ledger.rows.every((row) => row.reference_id === result.transferId));

    await assert.rejects(
        () => service.preview(senderId, senderId, '1'),
        /SPIRIT_STONE_TRANSFER_SELF_FORBIDDEN/
    );
    const guestPreview = await service.preview(senderId, guestId, '100');
    assert.equal(guestPreview.recipientAccountStatus, 'GUEST');
    assert.equal(guestPreview.recipientWillBeCreated, false);
    const guestTransfer = await service.transfer(senderId, guestId, '100', {
        operationId: `give-existing-guest-${suffix}`
    });
    assert.equal(guestTransfer.recipientAccountStatus, 'GUEST');
    assert.equal(await walletRepository.getBalance(client, guestId, 'SPIRIT_STONE'), '100');

    const missingGuestPreview = await service.preview(senderId, missingGuestId, '50');
    assert.equal(missingGuestPreview.recipientAccountStatus, 'GUEST');
    assert.equal(missingGuestPreview.recipientWillBeCreated, true);
    const beforeConfirm = await client.query('SELECT 1 FROM players WHERE id = $1', [missingGuestId]);
    assert.equal(beforeConfirm.rowCount, 0, 'Preview must not create the Guest Account');
    const missingGuestTransfer = await service.transfer(senderId, missingGuestId, '50', {
        operationId: `give-auto-guest-${suffix}`
    });
    assert.equal(missingGuestTransfer.recipientAccountStatus, 'GUEST');
    const createdGuest = await client.query(
        'SELECT account_status FROM players WHERE id = $1', [missingGuestId]
    );
    assert.equal(createdGuest.rows[0].account_status, 'GUEST');
    assert.equal(await walletRepository.getBalance(client, missingGuestId, 'SPIRIT_STONE'), '50');

    await assert.rejects(
        () => service.preview(guestId, recipientId, '1'),
        /SPIRIT_STONE_TRANSFER_SENDER_NOT_REGISTERED/
    );
    await assert.rejects(
        () => service.transfer(senderId, recipientId, '451', {
            operationId: `give-insufficient-${suffix}`
        }),
        /INSUFFICIENT_CURRENCY/
    );
    assert.equal(await walletRepository.getBalance(client, senderId, 'SPIRIT_STONE'), '450');
    assert.equal(await walletRepository.getBalance(client, recipientId, 'SPIRIT_STONE'), '500');

    console.log(JSON.stringify({
        status: 'PASS',
        transferId: result.transferId,
        amount: result.receivedAmount,
        senderBalance: '450',
        recipientBalance: '500',
        existingGuestBalance: '100',
        autoCreatedGuestBalance: '50',
        previewIsReadOnly: true,
        ledgerEntries: ledger.rowCount,
        idempotentReplay: replay.idempotentReplay,
        senderRegisteredOnly: true,
        recipientGuestAllowed: true,
        rollback: true
    }, null, 2));
} catch (error) {
    console.error(JSON.stringify({
        status: 'FAIL',
        errorCode: error?.code || error?.message || 'TRANSFER_VERIFY_FAILED',
        message: String(error?.message || '').slice(0, 300)
    }, null, 2));
    process.exitCode = 1;
} finally {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    await pool.end();
}
