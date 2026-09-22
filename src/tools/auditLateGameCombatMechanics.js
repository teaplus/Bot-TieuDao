import BattleEngine from '../battle/BattleEngine.js';
import BattleContext from '../battle/context/BattleContext.js';
import BattleEntity from '../battle/entities/BattleEntity.js';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';

function assert(condition, message, details = null) {
    if (!condition) {
        throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
    }
}

const gameDataManager = bootstrapGameData();
setGameDataManager(gameDataManager);

function entity(id, team, metadata = {}) {
    return new BattleEntity({
        id,
        name: id,
        team,
        sourceType: 'MONSTER',
        battleStat: { hp: 100, atk: 100, def: 0, spd: 10 },
        metadata
    });
}

const caster = entity('hybrid-caster', 'A', {
    element: 'FIRE',
    defensiveElement: 'FIRE'
});
const target = entity('hybrid-target', 'B', { defensiveElement: 'NEUTRAL' });
const fixedTarget = entity('fixed-target', 'B', { defensiveElement: 'NEUTRAL' });
const dispelTarget = entity('dispel-target', 'B');
const healTarget = entity('heal-target', 'A');
const context = new BattleContext({
    teams: { A: [caster, healTarget], B: [target, fixedTarget, dispelTarget] },
    random: () => 0
});
const engine = new BattleEngine({ gameDataManager, random: context.random });

const inherited = engine.actionPipeline.executeResolved({
    battleContext: context,
    caster,
    skill: {
        id: 'AUDIT_INHERIT',
        element: null,
        elementMode: 'INHERIT_CASTER'
    },
    action: {
        id: 'AUDIT_INHERIT_ACTION',
        order: 1,
        type: 'DAMAGE',
        target: 'ENEMY_SINGLE',
        formulaId: 'SKILL_DAMAGE',
        variance: false,
        critical: false
    },
    candidates: [target]
});
assert(inherited.offensiveElement === 'FIRE',
    'INHERIT_CASTER must resolve the Monster snapshot Element', inherited);

const fixed = engine.actionPipeline.executeResolved({
    battleContext: context,
    caster,
    skill: {
        id: 'AUDIT_FIXED',
        element: 'LIGHTNING',
        elementMode: 'FIXED'
    },
    action: {
        id: 'AUDIT_FIXED_ACTION',
        order: 1,
        type: 'DAMAGE',
        target: 'ENEMY_SINGLE',
        formulaId: 'SKILL_DAMAGE',
        variance: false,
        critical: false
    },
    candidates: [fixedTarget]
});
assert(fixed.offensiveElement === 'LIGHTNING',
    'FIXED must preserve the Skill-authored Element', fixed);

dispelTarget.addEffect({
    id: 'AUDIT_TIMED_BUFF',
    tags: ['BUFF'],
    remainingTurns: 2
});
const newestModifier = dispelTarget.addModifier({
    id: 'ATK_UP_20',
    value: 20,
    remainingTurns: 2
});
dispelTarget.addModifier({
    id: 'PASSIVE_AUDIT',
    value: 50,
    remainingTurns: null
});
const dispelAction = {
    id: 'AUDIT_DISPEL_ACTION',
    order: 1,
    type: 'DISPEL',
    target: 'ENEMY_SINGLE',
    chance: 100
};
const firstDispel = engine.actionPipeline.executeResolved({
    battleContext: context,
    caster,
    action: dispelAction,
    candidates: [dispelTarget]
}).actionResult.results[0];
assert(firstDispel.removedKind === 'MODIFIER'
    && firstDispel.removedId === newestModifier.id
    && dispelTarget.modifiers.some((modifier) => modifier.id === 'PASSIVE_AUDIT'),
'DISPEL must remove the newest timed positive modifier without touching passive state',
{ firstDispel, modifiers: dispelTarget.modifiers });

const secondDispel = engine.actionPipeline.executeResolved({
    battleContext: context,
    caster,
    action: { ...dispelAction, id: 'AUDIT_DISPEL_ACTION_2' },
    candidates: [dispelTarget]
}).actionResult.results[0];
assert(secondDispel.removedKind === 'EFFECT'
    && secondDispel.removedId === 'AUDIT_TIMED_BUFF',
'Second DISPEL must remove the remaining timed Buff Effect', secondDispel);

healTarget.currentHP = '25';
engine.effectEngine.applyEffect(context, healTarget, 'HEAL_BLOCK', caster);
const blockedHeal = engine.actionPipeline.executeResolved({
    battleContext: context,
    caster: healTarget,
    action: {
        id: 'AUDIT_BLOCKED_HEAL',
        order: 1,
        type: 'HEAL',
        target: 'SELF',
        base: 50,
        multiplier: 1
    },
    candidates: [healTarget]
}).actionResult.results[0];
assert(blockedHeal.applied.blocked
    && blockedHeal.applied.actualHealing === '0'
    && healTarget.currentHP === '25',
'HEAL_BLOCK must reduce Action HEAL result to zero without changing HP', blockedHeal);

const normalController = entity('normal-controller', 'A', {
    element: 'DARK',
    defensiveElement: 'DARK',
    variantId: 'NORMAL'
});
const bossController = entity('boss-controller', 'A', {
    element: 'DARK',
    defensiveElement: 'DARK',
    variantId: 'BOSS'
});
const normalControlTarget = entity('normal-control-target', 'B');
const bossControlTarget = entity('boss-control-target', 'B');
const chanceContext = new BattleContext({
    teams: {
        A: [normalController, bossController],
        B: [normalControlTarget, bossControlTarget]
    },
    random: () => 0.22
});
const chanceEngine = new BattleEngine({
    gameDataManager,
    random: chanceContext.random
});
const variantAction = {
    id: 'AUDIT_VARIANT_CONTROL',
    order: 1,
    type: 'APPLY_EFFECT',
    target: 'ENEMY_SINGLE',
    effectId: 'HEAL_BLOCK',
    chanceByVariant: { DEFAULT: 20, BOSS: 25 }
};
const normalControl = chanceEngine.actionPipeline.executeResolved({
    battleContext: chanceContext,
    caster: normalController,
    action: variantAction,
    candidates: [normalControlTarget]
}).actionResult.results[0];
const bossControl = chanceEngine.actionPipeline.executeResolved({
    battleContext: chanceContext,
    caster: bossController,
    action: { ...variantAction, id: 'AUDIT_VARIANT_CONTROL_BOSS' },
    candidates: [bossControlTarget]
}).actionResult.results[0];
assert(!normalControl.success && bossControl.success,
    'Control chance must resolve 20% for Normal and 25% for Boss from snapshot variant',
    { normalControl, bossControl });

console.log(JSON.stringify({
    status: 'PASS',
    elementModes: {
        inherited: inherited.offensiveElement,
        fixed: fixed.offensiveElement
    },
    dispelOrder: [
        firstDispel.removedKind,
        secondDispel.removedKind
    ],
    passivePreserved: true,
    blockedHealing: blockedHeal.applied.actualHealing,
    controlChanceByVariant: {
        normalAt22Percent: normalControl.success,
        bossAt22Percent: bossControl.success
    },
    typedEvents: {
        dispel: context.eventQueue.some((event) => event.type === 'DISPEL_BUFF'),
        healBlocked: context.eventQueue.some((event) => event.type === 'HEAL_BLOCKED')
    }
}, null, 2));
