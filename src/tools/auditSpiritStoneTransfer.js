import assert from 'node:assert/strict';
import fs from 'node:fs';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import GiveCommand from '../commands/player/give.js';

const manager = bootstrapGameData();
const rules = manager.getCollection('spiritStoneTransferRules');
assert.equal(rules.senderEligibility, 'REGISTERED_ONLY');
assert.equal(rules.recipientEligibility, 'REGISTERED_OR_GUEST_AUTO_CREATE');
assert.equal(rules.feeBasisPoints, 0);
assert.equal(rules.dailyTransferLimit, null);
assert.equal(rules.confirmation.ttlSeconds, 60);
assert.equal(rules.receiptVisibility, 'PUBLIC_WITHOUT_BALANCES');

const command = new GiveCommand();
const slash = command.getSlashData().toJSON();
assert.equal(slash.name, 'give');
assert.deepEqual(slash.options.map((option) => option.name), ['nguoinhan', 'soluong']);
assert(slash.options.every((option) => option.required));

const migration = fs.readFileSync(
    new URL('../database/migrations/042_spirit_stone_transfer_foundation.sql', import.meta.url),
    'utf8'
);
for (const fragment of [
    'CREATE TABLE IF NOT EXISTS spirit_stone_transfers',
    'operation_id TEXT NOT NULL UNIQUE',
    'sender_player_id <> recipient_player_id',
    'received_amount = gross_amount - fee_amount',
    'spirit_stone_transfers_sender_history',
    'spirit_stone_transfers_recipient_history'
]) assert(migration.includes(fragment), `Transfer migration missing ${fragment}`);

const repository = fs.readFileSync(
    new URL('../repositories/SpiritStoneTransferRepository.js', import.meta.url), 'utf8'
);
assert(repository.includes('ORDER BY id${options.forUpdate'));
assert(repository.includes("options.forUpdate ? ' FOR UPDATE'"));
assert(repository.includes('async findPlayers('));

console.log(JSON.stringify({
    status: 'PASS',
    command: '/give',
    policyRevision: rules.revision,
    recipientEligibility: rules.recipientEligibility,
    confirmationSeconds: rules.confirmation.ttlSeconds,
    feeBasisPoints: rules.feeBasisPoints,
    lockOrder: 'PLAYER_ID_ASCENDING'
}, null, 2));
