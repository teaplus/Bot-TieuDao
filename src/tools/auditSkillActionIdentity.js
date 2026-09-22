import fs from 'node:fs';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import GameDataValidator from '../foundation/game-data/GameDataValidator.js';
import BattleSkillFactory from '../battle/factory/BattleSkillFactory.js';
import BattleActionPipeline from '../battle/actions/BattleActionPipeline.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const sources = [
    ['src/data/skills/attack_skill_templates.json', 'attackSkills'],
    ['src/data/skills/defense_skills_templates.json', 'defenseSkills']
];
const rawSkills = sources.flatMap(([file, collection]) => {
    const document = JSON.parse(fs.readFileSync(file, 'utf8'));
    return document[collection];
});
const rawActions = rawSkills.flatMap((skill) => skill.actions.map((action) => ({ skill, action })));

assert(rawSkills.length === 88, 'Unexpected skill count', rawSkills.length);
assert(rawActions.length === 177, 'Unexpected action count', rawActions.length);
for (const skill of rawSkills) {
    const ids = new Set();
    const orders = new Set();
    skill.actions.forEach((action, index) => {
        assert(typeof action.id === 'string' && action.id.length > 0, 'Missing raw action id', { skillId: skill.id, index });
        assert(Number.isSafeInteger(action.order) && action.order > 0, 'Invalid raw action order', { skillId: skill.id, index });
        assert(!ids.has(action.id), 'Duplicate raw action id in skill', { skillId: skill.id, actionId: action.id });
        assert(!orders.has(action.order), 'Duplicate raw action order in skill', { skillId: skill.id, order: action.order });
        ids.add(action.id);
        orders.add(action.order);
    });
}

const gameDataManager = bootstrapGameData();
const factory = new BattleSkillFactory({ gameDataManager });
for (const rawSkill of rawSkills) {
    const runtimeSkill = factory.create(rawSkill.id);
    assert(runtimeSkill, 'Runtime skill missing', rawSkill.id);
    const expected = [...rawSkill.actions].sort((left, right) => left.order - right.order);
    assert(runtimeSkill.actions.length === expected.length, 'Runtime action count changed', rawSkill.id);
    runtimeSkill.actions.forEach((action, index) => {
        assert(action.id === expected[index].id, 'Factory changed action identity', { skillId: rawSkill.id, index });
        assert(action.order === expected[index].order, 'Factory changed action order', { skillId: rawSkill.id, index });
        assert(Object.isFrozen(action), 'Runtime action is mutable', action.id);
    });
}

const invalidErrors = [];
new GameDataValidator().validateSkillReferences({
    skills: {
        INVALID: {
            effects: [],
            combat: {
                actions: [
                    { id: 'DUPLICATE', order: 1, type: 'DAMAGE' },
                    { id: 'DUPLICATE', order: 1, type: 'DAMAGE' },
                    { order: 0, type: 'UNKNOWN' }
                ]
            }
        }
    },
    actionTypes: { DAMAGE: { id: 'DAMAGE' } },
    formulas: {}, coreEffects: {}, modifiers: {}, conditions: {}
}, invalidErrors);
assert(invalidErrors.some((error) => error.includes('.id must be a non-empty string')), 'Missing ID was not rejected');
assert(invalidErrors.some((error) => error.includes('.id duplicates DUPLICATE')), 'Duplicate ID was not rejected');
assert(invalidErrors.some((error) => error.includes('.order duplicates 1')), 'Duplicate order was not rejected');
assert(invalidErrors.some((error) => error.includes('.order must be a positive safe integer')), 'Invalid order was not rejected');
assert(invalidErrors.some((error) => error.includes('actionTypes.UNKNOWN')), 'Unknown action type was not rejected');

const eventIdentity = new BattleActionPipeline({ elementEffectEngine: {} }).createEventIdentity({
    caster: { id: 'ACTOR' },
    skill: { id: 'SKILL' },
    action: { id: 'ACTION', type: 'DAMAGE' },
    actionIndex: 2
});
assert(eventIdentity.actionId === 'ACTION' && eventIdentity.actionIndex === 2,
    'Battle event identity does not contain stable action identity', eventIdentity);

console.log(JSON.stringify({
    status: 'PASS',
    checks: {
        skills: rawSkills.length,
        actions: rawActions.length,
        rawIdentityAndOrder: true,
        validatorRejectsInvalidIdentityAndOrder: true,
        factoryPreservesIdentityAndOrder: true,
        eventIdentityIncludesActionId: true
    }
}, null, 2));
