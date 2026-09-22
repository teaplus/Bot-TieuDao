import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import MonsterGeneratorService from '../gameplay/monsters/MonsterGeneratorService.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const gameDataManager = bootstrapGameData();
const races = Object.values(gameDataManager.getCollection('monsterSkillCatalog'));
const standardSkills = races.flatMap((race) => race.skills);
const bossSkills = races.flatMap((race) => race.bossSkills);
const semantics = gameDataManager.getCollection('monsterSkillElementSemantics');
const runtimeSkills = gameDataManager.getCollection('skills');
const monsterTemplates = Object.values(gameDataManager.getCollection('monsterTemplates'));
const maxMonsterSkills = gameDataManager.getCollection('monsterRules').skillSlots.maxSkills;
const monsterGenerator = new MonsterGeneratorService({ gameDataManager, random: () => 0 });

assert(races.length === 20, 'Monster skill catalog race count mismatch', races.length);
assert(standardSkills.length === 100, 'Monster standard skill catalog count mismatch', standardSkills.length);
assert(bossSkills.length === 12, 'Monster boss skill catalog count mismatch', bossSkills.length);
assert(new Set([...standardSkills, ...bossSkills].map((skill) => skill.id)).size === 112,
    'Monster skill catalog IDs must be globally unique');
const executableCatalogSkills = [...standardSkills, ...bossSkills]
    .filter((skill) => runtimeSkills[skill.id]);
assert(executableCatalogSkills.length === 75
    && executableCatalogSkills.every((skill) => runtimeSkills[skill.id].tags.includes('MONSTER_ONLY')),
'Executable Monster Skills must match the approved active plus late-game subset',
executableCatalogSkills);
const windBlade = runtimeSkills.MON_SK_AVIAN_WIND_BLADE;
const windElement = gameDataManager.requireRecord('elements', 'WIND');
const windEffect = gameDataManager.requireRecord('coreEffects', windElement.effectId);
const windRelations = Object.values(gameDataManager.getCollection('elementRelations'))
    .filter((relation) => relation.from === 'WIND' || relation.to === 'WIND');
assert(windBlade?.element === 'WIND'
    && windBlade.combat.actions.length === 1
    && windBlade.combat.actions[0].type === 'DAMAGE'
    && windBlade.combat.actions[0].element === 'WIND',
'WIND must be implemented as direct damage only', windBlade);
assert(windElement.tags.includes('DIRECT_DAMAGE')
    && windEffect.tags.includes('MARKER')
    && windRelations.length === 0,
'WIND must not gain implicit passive, dodge, speed, generate or counter semantics', {
    windElement, windEffect, windRelations
});
assert(semantics.filter((entry) => entry.status === 'SUPPORTED').length === 10
    && semantics.filter((entry) => entry.status === 'CONTENT_PENDING').length === 0,
'Monster element semantic support classification mismatch', semantics);
assert(semantics.every(
    (entry) => entry.elementStatus !== 'CONTENT_PENDING'
        && entry.mechanicStatus !== 'CONTENT_PENDING'
        && entry.runtimeElementId
), 'Every canonical Monster Element mechanic must be executable', semantics);
assert(maxMonsterSkills === 2
    && monsterTemplates.every((monster) => monster.skillIds.length <= maxMonsterSkills),
'Every Monster Template must respect the two-Skill limit', {
    maxMonsterSkills,
    violations: monsterTemplates
        .filter((monster) => monster.skillIds.length > maxMonsterSkills)
        .map((monster) => monster.id)
});
assert(monsterTemplates.every((monster) => (
    monsterGenerator.createMonster(monster.id).skillIds.length <= maxMonsterSkills
)), 'Generated Monster exceeded the two-Skill runtime limit');
let limitGuardError = null;
try {
    monsterGenerator.pickSkills({
        id: 'AUDIT_OVER_LIMIT',
        skillIds: ['SKILL_1', 'SKILL_2', 'SKILL_3']
    });
} catch (error) {
    limitGuardError = error.message;
}
assert(limitGuardError === 'MONSTER_SKILL_LIMIT_EXCEEDED:AUDIT_OVER_LIMIT:3:2',
    'Monster runtime hard guard did not reject an oversized loadout', limitGuardError);

console.log(JSON.stringify({
    status: 'PASS',
    races: races.length,
    standardSkills: standardSkills.length,
    bossSkills: bossSkills.length,
    stagedExecutableSkills: executableCatalogSkills.length,
    contentPendingSkills: 112 - executableCatalogSkills.length,
    monsterTemplates: monsterTemplates.length,
    maxMonsterSkills,
    runtimeLimitGuard: true,
    supportedElementSemantics: 10,
    canonicalPendingMechanics: []
}, null, 2));
