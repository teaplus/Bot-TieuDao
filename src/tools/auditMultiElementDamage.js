import ActionExecutor from '../battle/actions/ActionExecutor.js';
import BattleActionFactory from '../battle/factory/BattleActionFactory.js';
import ActionScopedElementEffectEngine from '../battle/elements/ActionScopedElementEffectEngine.js';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import GameDataValidator from '../foundation/game-data/GameDataValidator.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';

function assert(condition, message, details = {}) {
    if (!condition) {
        const error = new Error(message);
        error.details = details;
        throw error;
    }
}

const gameDataManager = bootstrapGameData();
setGameDataManager(gameDataManager);
let randomCalls = 0;
const executor = new ActionExecutor({
    gameDataManager,
    random: () => {
        randomCalls += 1;
        return randomCalls === 1 ? 0 : 1;
    }
});
const actor = {
    id: 'multi-actor',
    battleStat: {
        atk: '100', def: '0', hp: '100', spd: '10', pen: '0', skillDamage: '0',
        critRate: '0', critDamage: '50', fireDamage: '50', iceDamage: '0'
    }
};
const target = {
    id: 'multi-target',
    battleStat: {
        atk: '1', def: '0', hp: '100', spd: '1',
        fireResist: '20', iceResist: '0'
    }
};
const action = new BattleActionFactory().create({
    id: 'AUDIT_MULTI_DAMAGE',
    order: 1,
    type: 'DAMAGE',
    target: 'ENEMY_SINGLE',
    formulaId: 'SKILL_DAMAGE',
    elementWeights: { FIRE: 70, ICE: 30 }
});
const components = Object.entries(action.elementWeights).map(([elementId, weight]) => ({
    elementId,
    weight,
    spiritRootAffinity: { applied: false },
    targetContexts: new Map()
}));
const result = executor.calculateMultiElementDamage(
    actor,
    action,
    target,
    executor.getActionArguments(action),
    { elementComponents: components }
);

assert(result.amount === '91', 'Weighted multi-element damage is incorrect', result);
assert(result.elementalComponents[0].weightedAmount === '67'
    && result.elementalComponents[1].weightedAmount === '24',
'Each element must apply its own bonus/resistance before weighting', result.elementalComponents);
assert(randomCalls === 1, 'Multi-element components must share one formula random roll', { randomCalls });
assert(Object.isFrozen(action.elementWeights), 'BattleActionFactory did not freeze elementWeights', action);

const scopeEngine = new ActionScopedElementEffectEngine({ gameDataManager, random: () => 0 });
const scopedActor = {
    ...actor,
    attributeToStatKey: (attributeId) => ({
        ATK: 'atk', DEF: 'def', HP: 'hp', SPD: 'spd', PEN: 'pen', SKD: 'skillDamage'
    })[attributeId] || String(attributeId || '').toLowerCase(),
    metadata: { spiritRootElementIds: [], spiritRootActionEffects: [] }
};
const scopedTarget = {
    ...target,
    attributeToStatKey: scopedActor.attributeToStatKey,
    effects: [],
    metadata: { defensiveElement: 'METAL' }
};
const scope = scopeEngine.activate({
    battleContext: { enqueueEvent() {} },
    caster: scopedActor,
    skill: { id: 'AUDIT_MULTI_SKILL' },
    action,
    targets: [scopedTarget]
});
assert(scope.offensiveElement === 'MULTI' && scope.elementComponents.length === 2,
    'Action scope did not materialize one component per authored element', scope);
const relationExecutor = new ActionExecutor({ gameDataManager, random: () => 0 });
const relationResult = relationExecutor.calculateMultiElementDamage(
    scopedActor,
    action,
    scopedTarget,
    relationExecutor.getActionArguments(action),
    { elementComponents: scope.elementComponents }
);
assert(relationResult.amount === '104'
    && scope.elementComponents[0].snapshots[0].relationIds.includes('COUNTER_FIRE_METAL'),
'Each weighted component did not resolve its own element relation', {
    relationResult,
    snapshots: scope.elementComponents.map((component) => component.snapshots)
});
scopeEngine.cleanup(scope);
assert(scopeEngine.activeScopeCount === 0, 'Multi-element action scope leaked after cleanup');

const invalidGameData = structuredClone(gameDataManager.gameData);
invalidGameData.skills.SK_FIRE_HOANG.combat.actions[1].elementWeights = { FIRE: 60, ICE: 30 };
let validationError = null;
try {
    new GameDataValidator().validateAll(invalidGameData);
} catch (error) {
    validationError = error;
}
assert(validationError?.details?.errors?.some((error) => error.includes('must total exactly 100')),
    'GameDataValidator accepted elementWeights whose total is not 100',
    validationError?.details);

console.log(JSON.stringify({
    status: 'PASS',
    totalDamage: result.amount,
    components: result.elementalComponents.map((component) => ({
        elementId: component.elementId,
        weight: component.weight,
        weightedAmount: component.weightedAmount
    })),
    sharedRandomCalls: randomCalls,
    validationGuard: 'EXACT_TOTAL_100'
}, null, 2));
