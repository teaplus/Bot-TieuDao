import fs from 'node:fs';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import SkillLoadoutPolicy from '../gameplay/player/SkillLoadoutPolicy.js';
import RuntimePlayerFactory from '../runtime/player/RuntimePlayerFactory.js';
import BattleEntityFactory from '../runtime/battle/BattleEntityFactory.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

function assertThrows(callback, expectedMessage) {
    try {
        callback();
    } catch (error) {
        assert(error.message === expectedMessage, 'Unexpected policy error', error.message);
        return;
    }
    throw new Error(`Expected error: ${expectedMessage}`);
}

const manager = bootstrapGameData();
setGameDataManager(manager);
const policy = new SkillLoadoutPolicy({ gameDataManager: manager });
const expectedCapacities = [2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9];
const capacities = Object.values(manager.getCollection('realms'))
    .sort((left, right) => left.order - right.order)
    .map((realm) => policy.getCapacity(realm.id));
assert(JSON.stringify(capacities) === JSON.stringify(expectedCapacities),
    'Realm Skill capacity curve does not match approved milestones', capacities);

const learned = [
    'SK_FIRE_HOANG',
    'SK_WOOD_HOANG',
    'SK_EARTH_HOANG',
    'SK_WATER_HOANG',
    'DEF_FIRE_HOANG'
];
const approved = policy.validate(
    ['SK_FIRE_HOANG', 'SK_WOOD_HOANG', 'SK_EARTH_HOANG', 'DEF_FIRE_HOANG'],
    learned,
    5
);
assert(approved.capacity === 4
    && approved.activeCount === 3
    && approved.passiveCount === 1,
'Valid mixed Active/Passive loadout was rejected');
assertThrows(
    () => policy.validate(
        ['SK_FIRE_HOANG', 'SK_WOOD_HOANG', 'SK_EARTH_HOANG', 'SK_WATER_HOANG'],
        learned,
        5
    ),
    'SKILL_LOADOUT_ACTIVE_LIMIT_EXCEEDED'
);
assertThrows(
    () => policy.validate(['SK_FIRE_HOANG', 'SK_FIRE_HOANG'], learned, 5),
    'SKILL_LOADOUT_DUPLICATE'
);
assertThrows(
    () => policy.validate(['SK_LIGHTNING_HOANG'], learned, 5),
    'SKILL_NOT_LEARNED'
);
assertThrows(
    () => policy.validate(
        ['SK_FIRE_HOANG', 'SK_WOOD_HOANG', 'DEF_FIRE_HOANG'],
        learned,
        1
    ),
    'SKILL_LOADOUT_CAPACITY_EXCEEDED'
);

const runtimePlayer = new RuntimePlayerFactory().create({
    playerId: 'loadout-audit',
    name: 'Loadout Audit',
    realmId: 5,
    realmStage: 1,
    cultivation: '0',
    cultivationArtId: 'CP_FIRE_HOANG',
    spiritRootId: 'HOA_LINH_CAN',
    spiritRootQualityTierId: 'LOWER_GRADE',
    walletBalances: {},
    inventory: [],
    learnedSkillIds: learned,
    equippedSkillIds: approved.skillIds,
    cultivationArtIds: ['CP_FIRE_HOANG'],
    baseAtk: '100',
    baseDef: '50',
    baseHp: '500',
    baseSpd: '10'
});
assert(runtimePlayer.learnedSkillIds.length === 5
    && runtimePlayer.skillIds.length === 4
    && !runtimePlayer.skillIds.includes('SK_WATER_HOANG'),
'Runtime Player did not separate learned and equipped Skill IDs');
const battleEntity = new BattleEntityFactory({ gameDataManager: manager })
    .createFromRuntimePlayer(runtimePlayer);
assert(JSON.stringify(battleEntity.skills) === JSON.stringify(approved.skillIds),
    'Battle snapshot does not use only equipped Skills');
assert(battleEntity.metadata.equippedPassiveSkillIds.includes('DEF_FIRE_HOANG'),
    'Equipped Passive identity is missing from Battle snapshot');

const migration = fs.readFileSync(
    new URL('../database/migrations/028_player_skill_loadout.sql', import.meta.url),
    'utf8'
);
assert(migration.includes('equipped_slot')
    && migration.includes('player_skills_equipped_slot_unique')
    && migration.includes('ROW_NUMBER()'),
'Skill loadout migration/backfill contract is incomplete');

console.log(JSON.stringify({
    status: 'PASS',
    checks: {
        capacityByRealm: capacities,
        maxActiveSkills: approved.maxActiveSkills,
        mixedLoadout: true,
        learnedEquippedSeparation: true,
        battleUsesEquippedOnly: true,
        deterministicBackfill: true
    }
}, null, 2));
