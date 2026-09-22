import BattleActionFactory from '../battle/factory/BattleActionFactory.js';
import BattleSkillFactory from '../battle/factory/BattleSkillFactory.js';
import SkillManager from '../battle/skills/SkillManager.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

function assertThrows(callback, expectedMessage) {
    try {
        callback();
    } catch (error) {
        assert(error.message === expectedMessage, 'Unexpected error message', error.message);
        return;
    }
    throw new Error(`Expected error: ${expectedMessage}`);
}

const template = {
    id: 'SK_AUDIT',
    name: 'Audit Skill',
    type: 'ACTIVE',
    trigger: 'TURN_ACTION',
    condition: { hpPercent: 50, nested: { enabled: true } },
    tags: ['AUDIT'],
    combat: {
        target: { team: 'ENEMY', scope: 'SINGLE' },
        actions: [
            {
                id: 'audit-chain', order: 2, type: 'CHAIN_DAMAGE',
                arguments: { jumpMultipliers: [1, 0.7, 0.4], nested: { maxTargets: 3 } }
            },
            { id: 'audit-effect', order: 1, type: 'ADD_EFFECT', effectId: 'BURN' }
        ]
    }
};
const gameDataManager = { getRecord: (_collection, id) => id === template.id ? template : null };
const skill = new BattleSkillFactory({ gameDataManager }).create(template.id);

assert(skill.actions.map((action) => action.id).join(',') === 'audit-effect,audit-chain',
    'Action identity/order was not preserved', skill.actions);
assert(skill.target === 'ENEMY_SINGLE', 'Target normalization changed');
assert(Object.isFrozen(skill) && Object.isFrozen(skill.condition.nested), 'Skill condition is not deeply frozen');
assert(Object.isFrozen(skill.actions) && Object.isFrozen(skill.actions[1].arguments.jumpMultipliers),
    'Action arguments are not deeply frozen');

template.condition.hpPercent = 10;
template.combat.actions[0].arguments.jumpMultipliers[1] = 0;
template.tags.push('MUTATED');
assert(skill.condition.hpPercent === 50, 'Runtime skill shares condition with source template');
assert(skill.actions[1].arguments.jumpMultipliers[1] === 0.7, 'Runtime action shares nested arguments with source template');
assert(skill.tags.length === 1, 'Runtime skill shares tags with source template');

const actionFactory = new BattleActionFactory();
const action = actionFactory.create({ id: 'standalone-damage', order: 1, type: 'DAMAGE', arguments: { params: { rate: 2 } } });
assert(Object.isFrozen(action) && Object.isFrozen(action.arguments.params), 'Standalone action is not deeply immutable');
assert(Object.isFrozen(actionFactory.createMany([{ id: 'standalone-heal', order: 1, type: 'HEAL' }])), 'Action list is not immutable');
assertThrows(() => actionFactory.create({ order: 1, type: 'DAMAGE' }), 'BATTLE_ACTION_ID_REQUIRED');
assertThrows(() => actionFactory.create({ id: 'bad-order', type: 'DAMAGE' }), 'BATTLE_ACTION_ORDER_INVALID:bad-order');

const basicAttack = new SkillManager({
    gameDataManager,
    skillFactory: { create: () => null }
}).createBasicAttack();
assert(Object.isFrozen(basicAttack) && Object.isFrozen(basicAttack.actions)
    && Object.isFrozen(basicAttack.actions[0].arguments), 'Basic Attack runtime skill is mutable');
assert(basicAttack.actions[0].id === 'BASIC_ATTACK_ACTION_01', 'Basic Attack action identity is missing');
assert(basicAttack.id === 'BASIC_ATTACK' && basicAttack.name === 'Đánh Thường'
    && basicAttack.displayName === 'Basic Attack', 'Basic Attack canonical name/displayName contract is invalid', basicAttack);

console.log(JSON.stringify({
    status: 'PASS',
    checks: {
        sourceIsolation: true,
        deepImmutableSkill: true,
        deepImmutableActions: true,
        actionIdPreservedWhenPresent: true,
        targetNormalizationPreserved: true,
        immutableBasicAttack: true,
        basicAttackDisplayContract: true
    }
}, null, 2));
