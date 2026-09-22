import { createCultivationLoadoutPayload } from '../application/discord/CultivationLoadoutPresentation.js';
import BattleSkillFactory from '../battle/factory/BattleSkillFactory.js';
import SkillFactory from '../factories/SkillFactory.js';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';

function assert(condition, message, details = {}) {
    if (!condition) {
        const error = new Error(message);
        error.details = details;
        throw error;
    }
}

const grades = ['HOANG', 'HUYEN', 'DIA', 'THIEN', 'THANH', 'THAN'];
const elements = ['METAL', 'WOOD', 'WATER', 'FIRE', 'EARTH', 'WIND', 'LIGHTNING', 'ICE'];
const gameDataManager = bootstrapGameData();
setGameDataManager(gameDataManager);
const cultivationArts = Object.values(gameDataManager.getCollection('cultivationArts'));
const skills = Object.values(gameDataManager.getCollection('skills'))
    .filter((skill) => !(skill.tags || []).includes('MONSTER_ONLY'));
const attackSkills = skills.filter((skill) => skill.type === 'ACTIVE');
const defenseSkills = skills.filter((skill) => skill.type === 'PASSIVE');

for (const elementId of elements) {
    for (const grade of grades) {
        assert(cultivationArts.some((art) => art.element === elementId && art.rarity === grade),
            `Missing cultivation art coverage for ${elementId}/${grade}`);
    }
}
for (const grade of grades) {
    assert(attackSkills.some((skill) => skill.combat.element === 'WIND' && skill.rarity === grade),
        `Missing Wind attack skill for ${grade}`);
    assert(attackSkills.some((skill) => skill.combat.element === 'LIGHTNING' && skill.rarity === grade),
        `Missing Lightning attack skill for ${grade}`);
    assert(defenseSkills.some((skill) => skill.combat.element === 'WIND' && skill.rarity === grade),
        `Missing Wind defense skill for ${grade}`);
}

const windSkill = SkillFactory.create('SK_WIND_THAN');
const windBattleSkill = new BattleSkillFactory({ gameDataManager }).create('SK_WIND_THAN');
assert(windSkill?.label === 'Khởi Nguyên Vạn Phong Kiếp'
    && windSkill.elementLabel === 'Phong'
    && windSkill.gradeLabel === 'Thần phẩm',
'Vietnamese labels were not propagated to runtime Skill', windSkill);
assert(windBattleSkill?.actions.some((action) => action.effectId === 'ELEMENT_WIND')
    && windBattleSkill.actions.some((action) => action.formulaId === 'SKILL_DAMAGE'),
'Wind attack skill is not executable by BattleSkillFactory', windBattleSkill);

const windArt = gameDataManager.requireRecord('cultivationArts', 'CP_WIND_THAN');
const pools = gameDataManager.getCollection('sectRewardPools');
assert(gameDataManager.hasRecord('itemTemplates', 'CP_WIND_THAN')
    && gameDataManager.hasRecord('itemTemplates', 'BOOK_SK_WIND_THAN')
    && gameDataManager.hasRecord('itemTemplates', 'BOOK_DEF_WIND_THAN'),
'Wind learnable item templates were not generated');
assert(pools['SECT_YINYANG:CULTIVATION_ART_THAN'].entries.some(
    (entry) => entry.itemId === 'CP_WIND_THAN'
), 'Wind cultivation art has no Sect acquisition source');
assert(pools['SECT_LIGHTNING:ATTACK_THAN'].entries.some(
    (entry) => entry.itemId === 'BOOK_SK_LIGHTNING_THAN'
), 'Lightning late-game skill has no Sect acquisition source');

const payload = createCultivationLoadoutPayload({
    sessionId: 'audit-labels',
    state: {
        learnedArts: [{ ...windArt, active: true }],
        artBooks: [],
        learnedSkills: [{ ...windSkill, isEquipped: false }],
        skillBooks: [],
        skillLoadout: { capacity: 2, maxActiveSkills: 3, equippedSkillIds: [] }
    }
});
const rendered = JSON.stringify(payload);
assert(rendered.includes('Phong') && rendered.includes('Thần phẩm')
    && rendered.includes('Khởi Nguyên Vạn Phong Kiếp'),
'Cultivation UI did not render Vietnamese element/grade/name labels');

console.log(JSON.stringify({
    status: 'PASS',
    cultivationArtCoverage: `${elements.length} elements x ${grades.length} grades`,
    windAttackSkills: grades.length,
    lightningAttackSkills: grades.length,
    windDefenseSkills: grades.length,
    sectRewardEntries: Object.values(pools).reduce((sum, pool) => sum + pool.entries.length, 0),
    labels: {
        element: windSkill.elementLabel,
        grade: windSkill.gradeLabel,
        skill: windSkill.label
    }
}, null, 2));
