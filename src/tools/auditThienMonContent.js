import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import MapEncounterService from '../gameplay/maps/MapEncounterService.js';
import MonsterGeneratorService from '../gameplay/monsters/MonsterGeneratorService.js';
import SecretRealmService from '../gameplay/secret-realm/SecretRealmService.js';
import ActionExecutor from '../battle/actions/ActionExecutor.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const gameDataManager = bootstrapGameData();
setGameDataManager(gameDataManager);
const monsterGenerator = new MonsterGeneratorService({ gameDataManager, random: () => 0 });
const mapCases = [
    {
        mapId: 'THANH_VAN_SON_MACH', realmId: 1, realmCode: 'LUYEN_KHI', poolId: 'POOL_TRUC_LAM',
        qualityPoolId: 'QUALITY_POOL_THANH_VAN', qualities: [['FAN_THU', 75], ['LINH_THU', 20], ['YEU_THU', 5]],
        monsters: ['MON_BEAST_SPIRIT_RABBIT', 'MON_BEAST_SPIRIT_FOX', 'MON_BEAST_DEMON_WOLF', 'MON_BEAST_IRON_WOLF', 'MON_WOOD_TREE_DEMON'],
        bossId: 'MON_BOSS_WOLF_KING'
    },
    {
        mapId: 'HUYEN_MOC_QUOC', realmId: 2, realmCode: 'TRUC_CO', poolId: 'POOL_HOA_DIEM_SON',
        qualityPoolId: 'QUALITY_POOL_HUYEN_MOC', qualities: [['FAN_THU', 55], ['LINH_THU', 30], ['YEU_THU', 12], ['HUYEN_THU', 3]],
        monsters: ['MON_WOOD_FLOWER_DEMON', 'MON_WOOD_VINE_DEMON', 'MON_WOOD_ANCIENT_WOOD', 'MON_WOOD_SPIRIT_FLOWER', 'MON_SPIRIT_GINSENG', 'MON_SPIRIT_STONE'],
        bossId: 'MON_BOSS_TEN_THOUSAND_YEAR_TREE'
    },
    {
        mapId: 'DONG_HOANG_DAI_LUC', realmId: 3, realmCode: 'KET_DAN', poolId: 'POOL_THIEN_MON',
        qualityPoolId: 'QUALITY_POOL_DONG_HOANG', qualities: [['FAN_THU', 35], ['LINH_THU', 35], ['YEU_THU', 20], ['HUYEN_THU', 8], ['DIA_THU', 2]],
        monsters: ['MON_BEAST_WHITE_TIGER', 'MON_BEAST_BLOOD_TIGER', 'MON_BEAST_DEMON_BEAR', 'MON_BEAST_FLAME_LION', 'MON_BEAST_THUNDER_LEOPARD', 'MON_BEAST_VAJRA_APE'],
        bossId: 'MON_BOSS_WHITE_TIGER_KING'
    }
];

for (const testCase of mapCases) {
    const map = gameDataManager.requireRecord('maps', testCase.mapId);
    const pool = gameDataManager.requireRecord('monsterSpawnPools', testCase.poolId);
    const qualityPool = gameDataManager.requireRecord('monsterQualityPools', testCase.qualityPoolId);
    const bossPool = Object.values(gameDataManager.getCollection('secretRealmBossPools'))
        .find((candidate) => candidate.realmCode === testCase.realmCode);

    assert(map.status === 'ACTIVE' && map.activityTypes.includes('EXPLORATION'), 'Map must be active for exploration', map);
    assert(map.monsterSpawnPoolId === pool.id && map.monsterQualityPoolId === qualityPool.id,
        'Map pool references mismatch', map);
    assert(JSON.stringify(pool.entries.map((entry) => entry.monsterId)) === JSON.stringify(testCase.monsters),
        'Map monster mapping mismatch', pool.entries);
    assert(pool.entries.every((entry) => entry.weight === 1 && entry.spawnType === 'NORMAL'),
        'Normal map monsters must use equal weight and NORMAL variant', pool.entries);
    assert(JSON.stringify(qualityPool.entries.map((entry) => [entry.qualityId, entry.weight])) === JSON.stringify(testCase.qualities),
        'Map quality weights mismatch', qualityPool.entries);
    assert(bossPool?.entries.length === 1 && bossPool.entries[0].monsterId === testCase.bossId,
        'Secret Realm boss mapping mismatch', bossPool);

    for (const monsterId of testCase.monsters) {
        const template = gameDataManager.requireRecord('monsterTemplates', monsterId);
        const monster = monsterGenerator.createMonster(monsterId, { variantId: 'NORMAL', qualityId: 'FAN_THU' });
        const skills = monster.skillIds.map((skillId) => gameDataManager.requireRecord('skills', skillId));
        const actions = skills.flatMap((skill) => skill.combat.actions);
        assert(template.realmCode === testCase.realmCode, 'Monster realm mismatch', { monsterId, realmCode: template.realmCode });
        assert(monster.variantId === 'NORMAL' && monster.qualityId === 'FAN_THU', 'Normal monster runtime metadata mismatch', monster);
        assert(skills.length > 0 && skills.every((skill) => skill.tags.includes('MONSTER_ONLY')),
            'Monster must use explicit MONSTER_ONLY skills', { monsterId, skillIds: monster.skillIds });
        assert(actions.every((action) => ActionExecutor.supports(action.type)),
            'Monster skill contains unsupported action', { monsterId, actions });
        assert(actions.some((action) => action.type === 'DAMAGE'),
            'Every normal monster loadout needs an offensive action to avoid support-only timeout', { monsterId, actions });
    }

    const firstEncounter = new MapEncounterService({ gameDataManager, random: () => 0 }).select(testCase.mapId, testCase.realmId);
    const lastEncounter = new MapEncounterService({ gameDataManager, random: () => 0.999999 }).select(testCase.mapId, testCase.realmId);
    assert(firstEncounter.monsterId === testCase.monsters[0]
        && firstEncounter.variantId === 'NORMAL'
        && firstEncounter.qualityId === testCase.qualities[0][0], 'First weighted map boundary mismatch', firstEncounter);
    assert(lastEncounter.monsterId === testCase.monsters.at(-1)
        && lastEncounter.variantId === 'NORMAL'
        && lastEncounter.qualityId === testCase.qualities.at(-1)[0], 'Last weighted map boundary mismatch', lastEncounter);

    const boss = monsterGenerator.createMonster(testCase.bossId, { variantId: 'BOSS', qualityId: 'HONG_HOANG_DI_THU' });
    assert(boss.variantId === 'BOSS' && boss.qualityId === null && boss.qualityMultiplier === 1,
        'Secret Realm boss must ignore monster quality', boss);
    assert(boss.skillIds.map((skillId) => gameDataManager.requireRecord('skills', skillId))
        .flatMap((skill) => skill.combat.actions).some((action) => action.type === 'DAMAGE'),
    'Secret Realm boss needs an offensive action', boss);
}

const secretRealmService = new SecretRealmService({ gameDataManager, random: () => 0 });
const waves = secretRealmService.generateWaves({ realmId: 1, spiritualRoot: 'WOOD' }, { waveCount: 3 });
assert(waves.slice(0, -1).every((wave) => wave.type === 'MONSTER'
    && wave.monster.variantId === 'NORMAL'
    && wave.monster.qualityId === 'FAN_THU'), 'Secret Realm normal waves must stay NORMAL and receive quality', waves);
assert(waves.at(-1).type === 'BOSS'
    && waves.at(-1).monster.id === 'MON_BOSS_WOLF_KING'
    && waves.at(-1).monster.qualityId === null, 'Secret Realm final wave boss contract mismatch', waves.at(-1));

console.log(JSON.stringify({
    status: 'PASS',
    checks: {
        activeMaps: mapCases.length,
        normalMonsters: mapCases.reduce((total, testCase) => total + testCase.monsters.length, 0),
        secretRealmBosses: mapCases.length,
        equalSpawnWeight: true,
        qualityPools: true,
        executableMonsterSkills: true,
        offensiveLoadouts: true,
        bossQualityExcluded: true,
        secretRealmWaveVariants: true
    }
}, null, 2));
