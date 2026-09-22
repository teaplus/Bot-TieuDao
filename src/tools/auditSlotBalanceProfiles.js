import assert from 'node:assert/strict';
import fs from 'node:fs';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { calculateSlotRtpPartsPerMillion } from '../gameplay/minigames/SlotEngine.js';

const manager = bootstrapGameData();
const slotRules = manager.getCollection('slotRules');
const miniGameRules = manager.getCollection('miniGameRules');
const runtimeSlot = miniGameRules.games.SLOT;

assert.equal(slotRules.activeProfileId, 'FRIENDLY_15_PERCENT');
assert.deepEqual(Object.keys(slotRules.profiles), [
    'CURRENT_6_PERCENT',
    'FRIENDLY_10_PERCENT',
    'FRIENDLY_15_PERCENT',
    'FRIENDLY_20_PERCENT'
]);

const expected = {
    CURRENT_6_PERCENT: { hit: 66430, rtp: 904606 },
    FRIENDLY_10_PERCENT: { hit: 101824, rtp: 918029 },
    FRIENDLY_15_PERCENT: { hit: 148960, rtp: 918383 },
    FRIENDLY_20_PERCENT: { hit: 197332, rtp: 911485 }
};

for (const [profileId, profile] of Object.entries(slotRules.profiles)) {
    assert.equal(profile.symbols.reduce((sum, symbol) => sum + symbol.weight, 0), 100);
    assert.equal(profile.hitRate.partsPerMillion, expected[profileId].hit);
    assert.equal(profile.rtp.partsPerMillion, expected[profileId].rtp);
    assert(profile.rtp.partsPerMillion < 1000000);
    assert.equal(calculateSlotRtpPartsPerMillion({
        reelCount: profile.reelCount,
        symbols: profile.symbols
    }), expected[profileId].rtp);
}

assert.equal(runtimeSlot.balanceSource, 'SLOT_ACTIVE_PROFILE');
assert.equal(runtimeSlot.balanceProfileId, slotRules.activeProfileId);
assert.deepEqual(runtimeSlot.paytable.symbols, slotRules.profiles.FRIENDLY_15_PERCENT.symbols);
assert.equal(runtimeSlot.hitRate.partsPerMillion, 148960);
assert.equal(runtimeSlot.rtp.partsPerMillion, 918383);
assert(miniGameRules.revision.endsWith(':FRIENDLY_15_PERCENT'));

const baseRulesSource = fs.readFileSync(
    new URL('../data/minigames/minigame_rules.json', import.meta.url), 'utf8'
);
assert(baseRulesSource.includes('"balanceSource": "SLOT_ACTIVE_PROFILE"'));
assert(!baseRulesSource.includes('"payoutMultiplierBasisPoints"'));
const revisionMigration = fs.readFileSync(
    new URL('../database/migrations/044_expand_minigame_rules_revision.sql', import.meta.url),
    'utf8'
);
assert(revisionMigration.includes('ALTER TABLE player_minigame_rounds'));
assert(revisionMigration.includes('ALTER COLUMN rules_revision TYPE TEXT'));
assert(miniGameRules.revision.length > 80);

console.log(JSON.stringify({
    status: 'PASS',
    config: 'src/data/minigames/slot_rules.json',
    activeProfileId: slotRules.activeProfileId,
    profiles: Object.values(slotRules.profiles).map((profile) => ({
        id: profile.id,
        hitPercent: profile.hitRate.displayPercent,
        rtpPercent: profile.rtp.displayPercent
    })),
    selectedProfileActive: true
}, null, 2));
