import fs from 'fs';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import BattleSkillFactory from '../battle/factory/BattleSkillFactory.js';
import SkillCooldownState from '../battle/skills/SkillCooldownState.js';
import SkillManager from '../battle/skills/SkillManager.js';
import BattleEngine from '../battle/BattleEngine.js';
import BattleContext from '../battle/context/BattleContext.js';
import BattleEntity from '../battle/entities/BattleEntity.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const gameDataManager = bootstrapGameData();
const skillFactory = new BattleSkillFactory({ gameDataManager });
const skills = Object.values(gameDataManager.getCollection('skills') || {});
assert(skills.length > 0, 'Skill registry is empty');
assert(skills.every((skill) => Number.isSafeInteger(skill.cooldownTurns) && skill.cooldownTurns >= 0),
    'Normalized Skill cooldown must be a non-negative integer');
const activeSkills = skills.filter((skill) => skill.type === 'ACTIVE');
const activeCooldownCounts = activeSkills.reduce((counts, skill) => {
    const key = String(skill.cooldownTurns);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
}, {});
const controlEffectIds = new Set(['STUN', 'FREEZE', 'SILENCE', 'SLOW', 'HEAL_BLOCK']);
const isUtilitySkill = (skill) => {
    const hasDamage = skill.actions.some((action) => ['DAMAGE', 'CHAIN_DAMAGE'].includes(action.type));
    return !hasDamage || skill.actions.some((action) => (
        ['HEAL', 'ADD_SHIELD', 'SHIELD', 'PURIFY', 'DISPEL'].includes(action.type)
        || controlEffectIds.has(action.effectId)
        || controlEffectIds.has(action.arguments?.effectId)
    ));
};
const invalidAuthoredCooldowns = activeSkills
    .filter((skill) => skill.cooldownTurns !== (isUtilitySkill(skill) ? 3 : 2))
    .map((skill) => ({
        id: skill.id,
        cooldownTurns: skill.cooldownTurns,
        expected: isUtilitySkill(skill) ? 3 : 2
    }));
assert(invalidAuthoredCooldowns.length === 0,
    'Authored Active Skill cooldown semantic rule is invalid', invalidAuthoredCooldowns);
assert(activeCooldownCounts['0'] === undefined,
    'Active Skill compatibility cooldown 0 is forbidden', activeCooldownCounts);
const utilitySkillIds = [
    'MON_SK_BEAST_BERSERK',
    'MON_SK_BEAST_HUNTING_INSTINCT',
    'MON_SK_BEAST_FRENZY',
    'MON_SK_BEAST_KING_PRESSURE',
    'MON_SK_SPIRIT_PURIFY',
    'MON_SK_SPIRIT_HASTE'
];
assert(utilitySkillIds.every(
    (skillId) => gameDataManager.getRecord('skills', skillId)?.cooldownTurns === 3
), 'Approved Utility Skill cooldown must be three turns');
const sample = skillFactory.create(skills[0].id);
assert(sample.cooldownTurns === skills[0].cooldownTurns,
    'BattleSkillFactory did not preserve cooldownTurns');
assert(Object.isFrozen(sample), 'Battle Skill must remain immutable');

const state = new SkillCooldownState();
state.start('SKILL_A', 3);
state.start('SKILL_B', 2);
assert(!state.isReady('SKILL_A') && !state.isReady('SKILL_B'), 'Started cooldown must not be ready');
const firstTick = state.tick({ excludeSkillIds: ['SKILL_A'] });
assert(state.getRemainingTurns('SKILL_A') === 3, 'Excluded newly-started cooldown must not tick');
assert(firstTick[0]?.skillId === 'SKILL_B' && firstTick[0]?.after === 1, 'Cooldown B tick is invalid');
state.tick();
assert(state.getRemainingTurns('SKILL_A') === 2 && state.isReady('SKILL_B'), 'Cooldown transition is invalid');
state.tick();
state.tick();
assert(state.isReady('SKILL_A') && Object.keys(state.snapshot()).length === 0,
    'Cooldown must become ready after enough ticks');

let invalidRejected = false;
try {
    state.start('INVALID', -1);
} catch (error) {
    invalidRejected = error.message === 'INVALID_SKILL_COOLDOWN_TURNS';
}
assert(invalidRejected, 'Negative cooldown must be rejected');

const battleEngineSource = fs.readFileSync(new URL('../battle/BattleEngine.js', import.meta.url), 'utf8');
assert(battleEngineSource.includes('SKILL_COOLDOWN_STARTED')
    && battleEngineSource.includes('SKILL_COOLDOWN_TICK')
    && battleEngineSource.includes('SKILL_COOLDOWN_READY'),
    'BattleEngine cooldown lifecycle events are missing');

const cooldownBySkillId = Object.freeze({
    SKILL_A: 3,
    SKILL_B: 2
});
const skillManager = new SkillManager({
    random: () => 0,
    gameDataManager,
    skillFactory: {
        create(skillId) {
            const cooldownTurns = cooldownBySkillId[skillId];
            if (cooldownTurns === undefined) return null;
            return Object.freeze({
                id: skillId,
                name: skillId,
                type: 'ACTIVE',
                trigger: 'TURN_ACTION',
                cooldownTurns,
                target: 'ENEMY_SINGLE',
                actions: Object.freeze([])
            });
        }
    }
});
const entity = {
    skills: Object.freeze(['SKILL_A', 'SKILL_B']),
    skillCooldowns: new SkillCooldownState()
};
const selectedSkillIds = [];
for (let turn = 0; turn < 5; turn += 1) {
    const selectedSkill = skillManager.selectSkill(entity);
    selectedSkillIds.push(selectedSkill.id);
    skillManager.startCooldown(entity, selectedSkill);
    skillManager.tickCooldowns(entity, {
        excludeSkillIds: selectedSkill.id === 'BASIC_ATTACK' ? [] : [selectedSkill.id]
    });
}
assert(
    JSON.stringify(selectedSkillIds)
        === JSON.stringify(['SKILL_A', 'SKILL_B', 'BASIC_ATTACK', 'BASIC_ATTACK', 'SKILL_A']),
    'Ready-pool/basic fallback sequence is invalid',
    selectedSkillIds
);

const prioritySkillManager = new SkillManager({
    random: () => 0,
    gameDataManager,
    selfSustainPriorityHpPercent: 50,
    skillFactory: {
        create(skillId) {
            const definitions = {
                DAMAGE_SKILL: {
                    id: 'DAMAGE_SKILL',
                    type: 'ACTIVE',
                    trigger: 'TURN_ACTION',
                    target: 'ENEMY_SINGLE',
                    cooldownTurns: 2,
                    actions: [{ type: 'DAMAGE', target: 'ENEMY_SINGLE' }]
                },
                HEAL_SKILL: {
                    id: 'HEAL_SKILL',
                    type: 'ACTIVE',
                    trigger: 'TURN_ACTION',
                    target: 'SELF',
                    cooldownTurns: 3,
                    actions: [{ type: 'HEAL', target: 'SELF' }]
                },
                SHIELD_SKILL: {
                    id: 'SHIELD_SKILL',
                    type: 'ACTIVE',
                    trigger: 'TURN_ACTION',
                    target: 'SELF',
                    cooldownTurns: 3,
                    actions: [{ type: 'ADD_SHIELD', target: 'SELF' }]
                }
            };
            return definitions[skillId] || null;
        }
    }
});
const priorityEntity = {
    skills: ['DAMAGE_SKILL', 'HEAL_SKILL'],
    battleStat: { hp: '100' },
    currentHP: '49',
    skillCooldowns: new SkillCooldownState()
};
assert(
    prioritySkillManager.selectSkill(priorityEntity).id === 'HEAL_SKILL',
    'Self-heal must be prioritized below 50% HP'
);
priorityEntity.currentHP = '50';
assert(
    prioritySkillManager.selectSkill(priorityEntity).id === 'DAMAGE_SKILL',
    'Self-heal priority must use a strict below-50% comparison'
);
priorityEntity.currentHP = '49';
priorityEntity.skillCooldowns.start('HEAL_SKILL', 3);
assert(
    prioritySkillManager.selectSkill(priorityEntity).id === 'DAMAGE_SKILL',
    'Self-sustain priority must not bypass cooldown'
);
const shieldPriorityEntity = {
    skills: ['DAMAGE_SKILL', 'SHIELD_SKILL'],
    battleStat: { hp: '100' },
    currentHP: '1',
    skillCooldowns: new SkillCooldownState()
};
assert(
    prioritySkillManager.selectSkill(shieldPriorityEntity).id === 'SHIELD_SKILL',
    'Self-shield must be prioritized below 50% HP'
);

const runtimeActor = new BattleEntity({
    id: 'cooldown-actor',
    name: 'Cooldown Actor',
    team: 'A',
    battleStat: { hp: 1000, atk: 10, def: 0, spd: 10 },
    skills: ['SKILL_A', 'SKILL_B']
});
const runtimeTarget = new BattleEntity({
    id: 'cooldown-target',
    name: 'Cooldown Target',
    team: 'B',
    battleStat: { hp: 1000, atk: 10, def: 0, spd: 1 },
    skills: []
});
const runtimeContext = new BattleContext({
    battleId: 'audit:skill-cooldown',
    teams: { A: [runtimeActor], B: [runtimeTarget] },
    random: () => 0
});
const runtimeEngine = new BattleEngine({
    random: () => 0,
    gameDataManager,
    skillManager
});
for (let turn = 0; turn < 5; turn += 1) {
    runtimeEngine.executeTurn(runtimeContext, runtimeActor);
}
const runtimeSkillIds = runtimeContext.combatLog
    .map((entry) => entry.details?.skillId)
    .filter(Boolean);
assert(
    JSON.stringify(runtimeSkillIds)
        === JSON.stringify(['SKILL_A', 'SKILL_B', 'BASIC_ATTACK', 'BASIC_ATTACK', 'SKILL_A']),
    'BattleEngine did not preserve the approved cooldown sequence',
    runtimeSkillIds
);
assert(
    runtimeContext.eventQueue.some((event) => event.type === 'SKILL_COOLDOWN_STARTED')
        && runtimeContext.eventQueue.some((event) => event.type === 'SKILL_COOLDOWN_TICK')
        && runtimeContext.eventQueue.some((event) => event.type === 'SKILL_COOLDOWN_READY'),
    'BattleEngine did not emit the full cooldown event lifecycle'
);

console.log(JSON.stringify({
    status: 'PASS',
    mode: 'RUNTIME_ACTIVE_COMPLETE_CONTENT',
    activeCooldownCounts,
    checks: [
        'game-data-cooldown-shape', 'battle-skill-preservation', 'immutable-skill',
        'battle-local-state', 'excluded-new-cooldown', 'tick-to-ready',
        'negative-value-guard', 'battle-engine-lifecycle-events',
        'ready-pool-basic-fallback-sequence', 'battle-engine-runtime-sequence',
        'self-heal-priority-below-half', 'self-shield-priority-below-half',
        'self-sustain-does-not-bypass-cooldown',
        'all-active-skills-positive-cooldown',
        'damage-two-turns-utility-three-turns',
        'utility-skills-three-turn-cooldown'
    ],
    contentBlockedBy: []
}, null, 2));
