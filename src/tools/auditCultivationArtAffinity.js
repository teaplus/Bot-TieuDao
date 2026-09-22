import fs from 'fs';
import assert from 'node:assert/strict';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import CultivationArtAffinityResolver from '../gameplay/player/CultivationArtAffinityResolver.js';
import RuntimePlayerFactory from '../runtime/player/RuntimePlayerFactory.js';
import { createLegacyPlayerSnapshot } from '../gameplay/player/createLegacyPlayerSnapshot.js';
import Player from '../core/Player.js';

const gameDataManager = bootstrapGameData();
setGameDataManager(gameDataManager);
const resolver = new CultivationArtAffinityResolver({ gameDataManager });

function runtime(overrides = {}) {
    return new RuntimePlayerFactory().create({
        playerId: overrides.playerId || 'art-affinity-audit',
        name: 'Affinity Audit', realmId: 1, realmStage: 1,
        cultivation: '0', cultivationArtId: overrides.cultivationArtId || 'CP_FIRE_HOANG',
        spiritualRoot: overrides.spiritualRoot || 'Hoa Linh Can',
        spiritRootId: overrides.spiritRootId || 'HOA_LINH_CAN',
        spiritRootQualityTierId: 'LOWER_GRADE',
        baseAtk: '40', baseDef: '20', baseHp: '200', baseSpd: '5',
        inventory: [], skillIds: [], cultivationArtIds: [overrides.cultivationArtId || 'CP_FIRE_HOANG'],
        lastCultivate: new Date('2026-08-04T00:00:00.000Z')
    });
}

const neutral = resolver.getProjection(runtime({
    cultivationArtId: 'CP_NEUTRAL_HOANG', spiritRootId: 'MOC_LINH_CAN'
}));
assert.equal(neutral.matched, false);
assert.equal(neutral.baseBonus, 0.2);
assert.equal(neutral.affinityBonus, 0);

const exactMatch = resolver.getProjection(runtime({
    cultivationArtId: 'CP_FIRE_HOANG', spiritRootId: 'HOA_LINH_CAN'
}));
assert.equal(exactMatch.matched, true);
assert.equal(exactMatch.affinityBonus, 0.2);

const mismatch = resolver.getProjection(runtime({
    cultivationArtId: 'CP_FIRE_HOANG', spiritRootId: 'MOC_LINH_CAN'
}));
assert.equal(mismatch.matched, false);
assert.equal(mismatch.totalBonus, 0);

assert.equal(resolver.getProjection(runtime({
    cultivationArtId: 'CP_WIND_THAN', spiritRootId: 'THIEN_LINH_CAN'
})).affinityBonus, 0.5);
assert.equal(resolver.getProjection(runtime({
    cultivationArtId: 'CP_FIRE_HUYEN', spiritRootId: 'TAP_CAN'
})).affinityBonus, 0.25);
assert.equal(resolver.getProjection(runtime({
    cultivationArtId: 'CP_WIND_HOANG', spiritRootId: 'TAP_CAN'
})).affinityBonus, 0);
assert.equal(resolver.getProjection(runtime({
    cultivationArtId: 'CP_WIND_HOANG', spiritRootId: 'HON_DON_LINH_CAN'
})).affinityBonus, 0.2);

const neutralPlayer = new Player(createLegacyPlayerSnapshot(runtime({
    cultivationArtId: 'CP_NEUTRAL_HOANG', spiritRootId: 'HOA_LINH_CAN'
})).playerData);
const matchedPlayer = new Player(createLegacyPlayerSnapshot(runtime({
    cultivationArtId: 'CP_FIRE_HUYEN', spiritRootId: 'HOA_LINH_CAN'
})).playerData);
const mismatchedPlayer = new Player(createLegacyPlayerSnapshot(runtime({
    cultivationArtId: 'CP_FIRE_HUYEN', spiritRootId: 'MOC_LINH_CAN'
})).playerData);
assert.equal(neutralPlayer.cultivationSpeed, 1.2);
assert.equal(matchedPlayer.cultivationSpeed, 1.25);
assert.equal(mismatchedPlayer.cultivationSpeed, 1);

const creationRules = gameDataManager.getCollection('characterCreationRules');
const rebirthRules = gameDataManager.getCollection('rebirthRules');
assert.equal(creationRules.starterCultivationArtId, 'CP_NEUTRAL_HOANG');
assert.equal(rebirthRules.resetBootstrap.cultivationArtId, 'CP_NEUTRAL_HOANG');

const migration = fs.readFileSync(
    new URL('../database/migrations/032_neutral_starter_cultivation_art.sql', import.meta.url),
    'utf8'
);
assert(migration.includes("ALTER COLUMN cultivation_art_id SET DEFAULT 'CP_NEUTRAL_HOANG'"));
assert(migration.includes("SELECT id, 'CP_NEUTRAL_HOANG'"));
assert(!migration.includes("SET cultivation_art_id = 'CP_NEUTRAL_HOANG'"),
    'Migration must not overwrite the active cultivation art selected by existing players');

console.log(JSON.stringify({
    status: 'PASS',
    starterArtId: creationRules.starterCultivationArtId,
    bonuses: { neutral: 0.2, exactMatch: 0.2, divineMatch: 0.5, mismatch: 0 },
    specialRoots: ['THIEN_LINH_CAN', 'TAP_CAN', 'HON_DON_LINH_CAN'],
    existingPlayerActiveArtPolicy: 'KEEP_CURRENT_GRANT_NEUTRAL_OWNERSHIP'
}, null, 2));
