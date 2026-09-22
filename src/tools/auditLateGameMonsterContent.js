import fs from 'fs';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { EXECUTABLE_BATTLE_ACTION_TYPES } from '../battle/actions/ActionExecutor.js';

function assert(condition, message, details = null) {
    if (!condition) {
        throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
    }
}

const gameDataManager = bootstrapGameData();
const lateRealmCodes = [
    'NGUYEN_ANH', 'HOA_THAN', 'LUYEN_HU', 'HOP_THE', 'DAI_THUA', 'DO_KIEP',
    'CHAN_TIEN', 'HUYEN_TIEN', 'KIM_TIEN', 'THAI_AT', 'DAI_LA', 'DAO_TO'
];
const lateMapIds = [
    'TRUNG_CHAU_THANH_VUC', 'THIEN_LINH_GIOI', 'HU_KHONG_HAI',
    'THANH_LINH_DAI_LUC', 'CUU_THIEN_TIEN_CANH', 'THIEN_KIEP_GIOI',
    'TIEN_GIOI', 'HUYEN_THIEN_TIEN_VUC', 'KIM_KHUYET_THIEN',
    'THAI_SO_GIOI', 'DAI_LA_THIEN', 'KHOI_NGUYEN_DAO_GIOI'
];
const lateSpawnPoolIds = lateMapIds.map((mapId) => `POOL_${mapId}`);
const spawnPools = gameDataManager.getCollection('monsterSpawnPools');
const bossPools = Object.values(gameDataManager.getCollection('secretRealmBossPools'))
    .filter((pool) => lateRealmCodes.includes(pool.realmCode));
const qualityPools = Object.values(gameDataManager.getCollection('monsterQualityPools'))
    .filter((pool) => lateRealmCodes.includes(pool.realmCode));
const monsterTemplates = gameDataManager.getCollection('monsterTemplates');
const skills = gameDataManager.getCollection('skills');
const maps = gameDataManager.getCollection('maps');
const executableTypes = new Set(EXECUTABLE_BATTLE_ACTION_TYPES);

const normalMonsterIds = lateSpawnPoolIds.flatMap((poolId) => {
    const pool = spawnPools[poolId];
    assert(pool, 'Late-game Spawn Pool missing', poolId);
    assert(pool.entries.every((entry) => entry.weight > 0),
        'Late-game Spawn Pool weight must be positive', pool);
    return pool.entries.map((entry) => entry.monsterId);
});
assert(normalMonsterIds.length === 59 && new Set(normalMonsterIds).size === 59,
    'Late-game normal Monster identity count mismatch', normalMonsterIds);

const bossMonsterIds = bossPools.flatMap((pool) => pool.entries.map((entry) => entry.monsterId));
assert(bossPools.length === 12
    && bossMonsterIds.length === 12
    && new Set(bossMonsterIds).size === 12,
'Late-game Boss Pool identity count mismatch', bossPools);
assert(bossMonsterIds.every((monsterId) => (
    !normalMonsterIds.includes(monsterId)
    && monsterTemplates[monsterId]?.allowedVariants.join(',') === 'BOSS'
)), 'Boss must remain outside normal spawn and use only BOSS variant', bossMonsterIds);

const lateMonsterIds = [...normalMonsterIds, ...bossMonsterIds];
const lateSkillIds = new Set();
const supportOnlyMonsters = [];
for (const monsterId of lateMonsterIds) {
    const monster = monsterTemplates[monsterId];
    assert(monster, 'Late-game Monster Template missing', monsterId);
    assert(monster.skillIds.length > 0 && monster.skillIds.length <= 2,
        'Late-game Monster must have one or two Skills', monster);
    let hasDamage = false;
    for (const skillId of monster.skillIds) {
        const skill = skills[skillId];
        assert(skill, 'Late-game Monster references missing Skill',
            { monsterId, skillId });
        lateSkillIds.add(skillId);
        assert(['FIXED', 'INHERIT_CASTER'].includes(skill.combat.elementMode),
            'Late-game Skill must author elementMode explicitly',
            { skillId, elementMode: skill.combat.elementMode });
        assert(skill.combat.actions.every((action) => executableTypes.has(action.type)),
            'Late-game Skill uses unsupported Action', { skillId, actions: skill.combat.actions });
        hasDamage ||= skill.combat.actions.some(
            (action) => action.type === 'DAMAGE' || action.type === 'CHAIN_DAMAGE'
        );
    }
    if (!hasDamage) supportOnlyMonsters.push(monsterId);
}
assert(supportOnlyMonsters.length === 0,
    'Every late-game Monster loadout must contain an executable Damage Action',
    supportOnlyMonsters);

assert(qualityPools.length === 12
    && qualityPools.every((pool) => (
        pool.entries.reduce((sum, entry) => sum + entry.weight, 0) === 100
    )), 'Late-game Quality Pools must cover 12 Realms with total weight 100',
qualityPools);
assert(lateMapIds.every((mapId) => {
    const map = maps[mapId];
    const qualityPool = qualityPools.find((pool) => pool.realmCode === map?.realmCode);
    return map?.status === 'ACTIVE'
        && map.monsterSpawnPoolId === `POOL_${mapId}`
        && map.monsterQualityPoolId === qualityPool?.id
        && map.activityTypes.includes('EXPLORATION')
        && map.activityTypes.includes('GATHERING');
}), 'Late-game maps must be active with canonical Spawn/Quality Pool references',
lateMapIds.map((mapId) => maps[mapId]));

const rawSkills = JSON.parse(fs.readFileSync(
    new URL('../data/monster/monster_attack_skill_templates.json', import.meta.url),
    'utf8'
)).attackSkills;
const rawSkillIndex = Object.fromEntries(rawSkills.map((skill) => [skill.id, skill]));
assert([...lateSkillIds].every((skillId) => (
    ['FIXED', 'INHERIT_CASTER'].includes(rawSkillIndex[skillId]?.elementMode)
)), 'Late-game Skill source JSON must declare elementMode, not rely on normalizer fallback',
[...lateSkillIds].filter((skillId) => !rawSkillIndex[skillId]?.elementMode));

console.log(JSON.stringify({
    status: 'PASS_ACTIVE',
    normalMonsters: normalMonsterIds.length,
    bosses: bossMonsterIds.length,
    executableSkills: lateSkillIds.size,
    spawnPools: lateSpawnPoolIds.length,
    bossPools: bossPools.length,
    qualityPools: qualityPools.length,
    mapsActive: lateMapIds.length,
    supportOnlyPending: supportOnlyMonsters,
    pendingDecision: null
}, null, 2));
