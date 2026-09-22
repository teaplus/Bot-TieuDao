import assert from 'node:assert/strict';
import fs from 'node:fs';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import DeleteCharacterCommand from '../commands/player/xoanhanvat.js';

const manager = bootstrapGameData();
const rules = manager.getCollection('characterResetRules');
assert.equal(rules.revision, 'CHARACTER_RESET_V1_KEEP_SPIRIT_STONE');
assert.deepEqual(rules.retainedCurrencyIds, ['SPIRIT_STONE']);
assert.equal(rules.starterCurrencyGrantOnRecreate, false);
assert(Number.isInteger(rules.cooldownSeconds) && rules.cooldownSeconds >= 0);
assert.equal(rules.confirmationTtlSeconds, 60);
assert.equal(rules.activeStatePolicy, 'BLOCK_ACTIVITY_CRAFT_MINIGAME');

const slash = new DeleteCharacterCommand().getSlashData().toJSON();
assert.equal(slash.name, 'xoanhanvat');
assert.equal(slash.options?.length || 0, 0);

const migration = fs.readFileSync(
    new URL('../database/migrations/043_character_recreate_foundation.sql', import.meta.url), 'utf8'
);
for (const fragment of [
    'character_reset_count',
    'last_character_reset_at',
    'CREATE TABLE IF NOT EXISTS player_character_reset_history',
    'operation_id TEXT NOT NULL UNIQUE',
    'retained_spirit_stone NUMERIC(30, 0) NOT NULL'
]) assert(migration.includes(fragment), `Reset migration missing ${fragment}`);

const runtimeRepository = fs.readFileSync(
    new URL('../repositories/PlayerRuntimeRepository.js', import.meta.url), 'utf8'
);
assert(runtimeRepository.includes('CASE WHEN players.character_reset_count = 0'));

console.log(JSON.stringify({
    status: 'PASS',
    command: '/xoanhanvat',
    policyRevision: rules.revision,
    retainedCurrency: rules.retainedCurrencyIds[0],
    cooldownSeconds: rules.cooldownSeconds,
    confirmationSeconds: rules.confirmationTtlSeconds
}, null, 2));
