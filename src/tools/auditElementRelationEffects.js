import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import GameDataManager from '../foundation/game-data/GameDataManager.js';
import GameDataValidator from '../foundation/game-data/GameDataValidator.js';
import BattleEngine from '../battle/BattleEngine.js';
import BattleContext from '../battle/context/BattleContext.js';
import BattleEntity from '../battle/entities/BattleEntity.js';
import BattleEntityFactory from '../runtime/battle/BattleEntityFactory.js';

function assert(condition, message, details = {}) {
    if (!condition) {
        const error = new Error(message);
        error.details = details;
        throw error;
    }
}

function createManagerWithScopedRelation(options = {}) {
    const base = bootstrapGameData();
    const data = structuredClone(base.gameData);
    data.coreEffects.EFFECT_ELEMENT_WATER_COUNTER_FIRE = {
        id: 'EFFECT_ELEMENT_WATER_COUNTER_FIRE',
        displayName: 'Audit Water Counter Fire',
        description: 'Audit-only ACTION-scoped relation carrier.',
        type: 'INSTANT',
        scopes: ['ACTION'],
        tags: ['ELEMENT_RELATION'],
        duration: null,
        stackable: false,
        maxStack: null,
        events: [{ event: 'ON_APPLY', chance: null, conditionId: null }],
        actions: options.actions || [{
            type: 'ADD_MODIFIER',
            target: 'SELF',
            element: null,
            conditionId: null,
            arguments: { modifierId: 'ATK_UP_20' }
        }]
    };
    data.elementRelations.COUNTER_WATER_FIRE.effectId = 'EFFECT_ELEMENT_WATER_COUNTER_FIRE';
    new GameDataValidator().validateAll(data);
    return new GameDataManager(data);
}

function createManagerWithoutRelationEffects() {
    const base = bootstrapGameData();
    const data = structuredClone(base.gameData);
    for (const relation of Object.values(data.elementRelations)) {
        relation.effectId = null;
    }
    new GameDataValidator().validateAll(data);
    return new GameDataManager(data);
}

function auditAuthoredContent(gameDataManager) {
    const relations = Object.values(gameDataManager.getCollection('elementRelations'));
    const effectIds = new Set(relations.map((relation) => relation.effectId));
    assert(relations.length === 12 && effectIds.size === 12 && !effectIds.has(null), 'Element relations must reference twelve distinct Effects', relations);
    for (const relation of relations) {
        const effect = gameDataManager.requireRecord('coreEffects', relation.effectId);
        const action = effect.actions[0];
        const expectedModifierId = relation.relationType === 'GENERATE' ? 'ATK_UP_10' : 'ATK_UP_20';
        assert(effect.scopes.includes('ACTION') && action.type === 'ADD_MODIFIER' && action.target === 'SELF', 'Relation Effect ACTION contract is invalid', { relation, effect });
        assert(action.chance === 100 && action.arguments.modifierId === expectedModifierId, 'Relation Effect baseline does not match approved balance', { relation, effect });
    }
}

function auditSourcePriority(gameDataManager) {
    const engine = new BattleEngine({ gameDataManager, random: () => 0.5 });
    const resolver = engine.actionPipeline.elementEffectEngine;
    assert(resolver.resolveOffensiveElement({
        action: { element: 'WATER' }, effectElement: 'EARTH', skill: { element: 'FIRE' }
    }) === 'WATER', 'Action Element must have highest priority');
    assert(resolver.resolveOffensiveElement({
        action: {}, effectElement: 'EARTH', skill: { element: 'FIRE' }
    }) === 'EARTH', 'Effect Element must override Skill Element');
    assert(resolver.resolveOffensiveElement({
        action: {}, skill: { element: 'FIRE' }
    }) === 'FIRE', 'Skill Element fallback is invalid');
    assert(resolver.resolveOffensiveElement({ action: {}, caster: { metadata: { defensiveElement: 'WATER' } } }) === 'NEUTRAL', 'Actor innate Element must not become offensive fallback');
}

function auditMultiTargetIsolation(gameDataManager) {
    const caster = createEntity('multi-caster', 'A', { hp: 200, atk: 100, def: 0, spd: 10 });
    const fireTarget = createEntity('multi-fire', 'B', { hp: 300, atk: 1, def: 0, spd: 5 }, 'FIRE');
    const earthTarget = createEntity('multi-earth', 'B', { hp: 300, atk: 1, def: 0, spd: 4 }, 'EARTH');
    const context = new BattleContext({ teams: { A: [caster], B: [fireTarget, earthTarget] }, random: () => 0.5 });
    const engine = new BattleEngine({ gameDataManager, random: context.random });
    const execution = engine.actionPipeline.executeResolved({
        battleContext: context,
        caster,
        action: { type: 'DAMAGE', target: 'ENEMY_ALL', element: 'WATER', multiplier: 1, variance: false, critical: false },
        candidates: [fireTarget, earthTarget]
    });
    assert(execution.actionResult.results.map((result) => result.amount).join(',') === '120,100', 'Relation modifier leaked across targets', execution.actionResult);
    assert(execution.elementRelations[0].scopedEffectIds.length === 1 && execution.elementRelations[1].scopedEffectIds.length === 0, 'Per-target relation snapshots are not isolated', execution.elementRelations);
    return execution.actionResult.results.map((result) => result.amount);
}

function createEntity(id, team, battleStat, defensiveElement = 'NEUTRAL') {
    return new BattleEntity({
        id,
        team,
        battleStat,
        metadata: { defensiveElement }
    });
}

function executeDamage(gameDataManager, action = {}) {
    const caster = createEntity('element-caster', 'A', { hp: 200, atk: 100, def: 0, spd: 10 });
    const target = createEntity('element-target', 'B', { hp: 300, atk: 1, def: 0, spd: 5 }, 'FIRE');
    const context = new BattleContext({ teams: { A: [caster], B: [target] }, random: () => 0.25 });
    const engine = new BattleEngine({ gameDataManager, random: context.random });
    const execution = engine.actionPipeline.executeResolved({
        battleContext: context,
        caster,
        skill: { id: 'AUDIT_SKILL', element: 'FIRE' },
        action: {
            type: 'DAMAGE', target: 'ENEMY_SINGLE', element: 'WATER',
            multiplier: 1, variance: false, critical: false, ...action
        },
        candidates: [target]
    });
    return { caster, target, context, engine, execution };
}

function executeRelationDamage(gameDataManager, offensiveElement, defensiveElement) {
    const caster = createEntity(`relation-${offensiveElement}`, 'A', { hp: 200, atk: 100, def: 0, spd: 10 });
    const target = createEntity(`relation-${defensiveElement}`, 'B', { hp: 300, atk: 1, def: 0, spd: 5 }, defensiveElement);
    const context = new BattleContext({ teams: { A: [caster], B: [target] }, random: () => 0.5 });
    const engine = new BattleEngine({ gameDataManager, random: context.random });
    return engine.actionPipeline.executeResolved({
        battleContext: context,
        caster,
        action: { type: 'DAMAGE', target: 'ENEMY_SINGLE', element: offensiveElement, multiplier: 1, variance: false, critical: false },
        candidates: [target]
    });
}

function auditValidation(manager) {
    const validator = new GameDataValidator();
    const missingErrors = [];
    validator.validateElementRelations({
        elements: manager.getCollection('elements'),
        coreEffects: manager.getCollection('coreEffects'),
        elementRelations: {
            INVALID: { relationType: 'COUNTER', from: 'WATER', to: 'FIRE', effectId: 'MISSING' }
        }
    }, missingErrors);
    assert(missingErrors.some((error) => error.includes('missing coreEffects.MISSING')), 'Missing relation Effect was accepted', missingErrors);

    const scopeErrors = [];
    validator.validateElementRelations({
        elements: manager.getCollection('elements'),
        coreEffects: { INVALID_EFFECT: { id: 'INVALID_EFFECT', scopes: [] } },
        elementRelations: {
            INVALID: { relationType: 'COUNTER', from: 'WATER', to: 'FIRE', effectId: 'INVALID_EFFECT' }
        }
    }, scopeErrors);
    assert(scopeErrors.some((error) => error.includes('supporting ACTION scope')), 'Non-ACTION relation Effect was accepted', scopeErrors);
}

function auditCleanupOnFailure(gameDataManager) {
    const caster = createEntity('error-caster', 'A', { hp: 100, atk: 100, def: 0, spd: 10 });
    const target = createEntity('error-target', 'B', { hp: 100, atk: 1, def: 0, spd: 5 }, 'FIRE');
    const context = new BattleContext({ teams: { A: [caster], B: [target] } });
    const engine = new BattleEngine({
        gameDataManager,
        actionExecutor: { execute() { throw new Error('AUDIT_EXECUTOR_FAILURE'); } }
    });
    let message = null;
    try {
        engine.actionPipeline.executeResolved({
            battleContext: context,
            caster,
            action: { type: 'DAMAGE', target: 'ENEMY_SINGLE', element: 'WATER' },
            candidates: [target]
        });
    } catch (error) {
        message = error.message;
    }
    assert(message === 'AUDIT_EXECUTOR_FAILURE', 'Injected formula/action failure was not propagated', { message });
    assert(engine.actionPipeline.elementEffectEngine.activeScopeCount === 0, 'ACTION scope leaked after failure');
}

function auditCausalGuard() {
    const manager = createManagerWithScopedRelation({
        actions: [{
            type: 'DAMAGE', target: 'TARGET', element: 'WATER', conditionId: null,
            arguments: {}
        }]
    });
    const caster = createEntity('cycle-caster', 'A', { hp: 100, atk: 100, def: 0, spd: 10 });
    const target = createEntity('cycle-target', 'B', { hp: 100, atk: 1, def: 0, spd: 5 }, 'FIRE');
    const context = new BattleContext({ teams: { A: [caster], B: [target] }, random: () => 0.5 });
    const engine = new BattleEngine({ gameDataManager: manager, random: context.random });
    let message = null;
    try {
        engine.actionPipeline.executeResolved({
            battleContext: context,
            caster,
            action: { type: 'DAMAGE', target: 'ENEMY_SINGLE', element: 'WATER' },
            candidates: [target]
        });
    } catch (error) {
        message = error.message;
    }
    assert(message === 'ELEMENT_RELATION_CAUSAL_CYCLE:COUNTER_WATER_FIRE:EFFECT_ELEMENT_WATER_COUNTER_FIRE', 'Causal cycle was not rejected deterministically', { message });
    assert(engine.actionPipeline.elementEffectEngine.activeScopeCount === 0, 'Recursive relation scopes leaked after causal guard');
}

function auditSpiritRootAffinityDamage(gameDataManager) {
    const factory = new BattleEntityFactory({ gameDataManager });
    const createCaster = () => factory.createFromRuntimePlayer({
        playerId: 'affinity-caster',
        name: 'Hỏa Tu',
        baseStats: { hp: 200, atk: 100, def: 0, spd: 10 },
        inventory: { runtimeEquipments: [] },
        skillIds: [],
        activeEffects: [],
        spiritRootId: 'HOA_LINH_CAN',
        spiritRootQualityTierId: 'UPPER_GRADE',
        sectId: null,
        realmId: 1,
        cultivationArtId: 'CP_FIRE_HOANG'
    });
    const execute = ({ element = 'FIRE', skill = { id: 'FIRE_AUDIT_SKILL', element: 'FIRE' }, type = 'DAMAGE' } = {}) => {
        const caster = createCaster();
        const target = createEntity(`affinity-target-${element}-${type}-${skill ? 'skill' : 'basic'}`, 'B', {
            hp: 500, atk: 1, def: 0, spd: 5
        });
        const context = new BattleContext({ teams: { A: [caster], B: [target] }, random: () => 0.5 });
        const engine = new BattleEngine({ gameDataManager, random: context.random });
        const execution = engine.actionPipeline.executeResolved({
            battleContext: context,
            caster,
            skill,
            action: {
                id: `AFFINITY_${type}`,
                type,
                target: 'ENEMY_SINGLE',
                element,
                multiplier: 1,
                variance: false,
                critical: false,
                arguments: type === 'CHAIN_DAMAGE' ? { jumpMultipliers: [1] } : {}
            },
            candidates: [target]
        });
        return { context, execution };
    };

    const matched = execute();
    const mismatched = execute({ element: 'WATER' });
    const basic = execute({ skill: null });
    const neutral = execute({ element: 'NEUTRAL' });
    const chain = execute({ type: 'CHAIN_DAMAGE' });
    const matchedResult = matched.execution.actionResult.results[0];

    assert(matchedResult.amount === '104'
        && matchedResult.spiritRootAffinity.beforeAffinityAmount === '100'
        && matchedResult.spiritRootAffinity.multiplier === '1.04',
    'Matching elemental Skill damage must apply the approved post-formula multiplier', matchedResult);
    assert(matched.execution.spiritRootAffinity.applied
        && matched.execution.spiritRootAffinity.qualityTierId === 'UPPER_GRADE'
        && matched.execution.spiritRootAffinity.elementId === 'FIRE',
    'ExecutionContext must snapshot Spirit Root affinity identity', matched.execution.spiritRootAffinity);
    assert(matched.context.eventQueue.filter((event) => (
        event.type === 'SPIRIT_ROOT_AFFINITY_DAMAGE_APPLIED'
    )).length === 1, 'Affinity multiplier must emit exactly one observation event', matched.context.eventQueue);
    assert(mismatched.execution.actionResult.results[0].amount === '100'
        && basic.execution.actionResult.results[0].amount === '100'
        && neutral.execution.actionResult.results[0].amount === '100',
    'Mismatch, basic attack and NEUTRAL must not receive Spirit Root affinity damage', {
        mismatch: mismatched.execution.actionResult.results[0],
        basic: basic.execution.actionResult.results[0],
        neutral: neutral.execution.actionResult.results[0]
    });
    assert(chain.execution.actionResult.results[0].amount === '104',
        'Direct CHAIN_DAMAGE Skill must receive affinity bonus once', chain.execution.actionResult);

    return Object.freeze({
        matchedDamage: matchedResult.amount,
        mismatchedDamage: mismatched.execution.actionResult.results[0].amount,
        chainDamage: chain.execution.actionResult.results[0].amount,
        multiplier: matchedResult.spiritRootAffinity.multiplier
    });
}

function main() {
    const baseManager = bootstrapGameData();
    const scopedManager = createManagerWithScopedRelation();
    auditAuthoredContent(baseManager);
    auditValidation(scopedManager);
    auditSourcePriority(scopedManager);

    const scoped = executeDamage(scopedManager);
    assert(scoped.execution.offensiveElement === 'WATER', 'Action explicit Element did not win source priority', scoped.execution);
    assert(scoped.execution.actionResult.results[0].amount === '120', 'Scoped ATK modifier did not affect current hit', scoped.execution.actionResult);
    assert(scoped.caster.battleStat.atk === '100' && scoped.caster.modifiers.length === 0, 'Scoped modifier mutated caster state');
    assert(scoped.target.effects.length === 0, 'Relation carrier leaked into BattleEntity.effects');
    assert(scoped.execution.elementRelations[0].relationIds[0] === 'COUNTER_WATER_FIRE', 'Relation snapshot is missing', scoped.execution.elementRelations);
    assert(scoped.execution.elementRelations[0].scopedEffectIds[0] === 'EFFECT_ELEMENT_WATER_COUNTER_FIRE', 'Scoped Effect snapshot is missing', scoped.execution.elementRelations);
    assert(scoped.context.eventQueue.filter((event) => event.type === 'ELEMENT_RELATION_APPLIED').length === 1, 'Relation observation event cardinality is invalid');
    const beforeIndex = scoped.context.eventQueue.findIndex((event) => event.type === 'BATTLE_TRIGGER' && event.timing === 'BEFORE_ACTION');
    const relationIndex = scoped.context.eventQueue.findIndex((event) => event.type === 'ELEMENT_RELATION_APPLIED');
    const damageIndex = scoped.context.eventQueue.findIndex((event) => event.type === 'DAMAGE');
    const afterIndex = scoped.context.eventQueue.findIndex((event) => event.type === 'BATTLE_TRIGGER' && event.timing === 'AFTER_ACTION');
    assert(beforeIndex < relationIndex && relationIndex < damageIndex && damageIndex < afterIndex, 'Element relation phase ordering is invalid', scoped.context.eventQueue);
    assert(scoped.engine.actionPipeline.elementEffectEngine.activeScopeCount === 0, 'ACTION scope leaked after normal completion');

    const compatible = executeDamage(createManagerWithoutRelationEffects());
    assert(compatible.execution.actionResult.results[0].amount === '100', 'Relation without effectId changed Action result', compatible.execution.actionResult);
    assert(!compatible.context.eventQueue.some((event) => event.type === 'ELEMENT_RELATION_APPLIED'), 'Relation without effectId emitted behavior event');
    const multiTargetDamage = auditMultiTargetIsolation(scopedManager);
    const generateDamage = executeRelationDamage(baseManager, 'FIRE', 'EARTH').actionResult.results[0].amount;
    assert(generateDamage === '110', 'GENERATE baseline must apply ATK_UP_10', { generateDamage });

    const factory = new BattleEntityFactory({ gameDataManager: baseManager });
    assert(factory.resolvePlayerDefensiveElement({ spiritRootId: 'THUY_LINH_CAN' }) === 'WATER', 'Single-element Spirit Root was not materialized');
    assert(factory.resolvePlayerDefensiveElement({ spiritRootId: 'TAP_CAN' }) === 'NEUTRAL', 'Mixed Spirit Root must be NEUTRAL');
    const spiritRootAffinity = auditSpiritRootAffinityDamage(baseManager);
    auditCleanupOnFailure(scopedManager);
    auditCausalGuard();

    console.log(JSON.stringify({
        status: 'PASS',
        summary: {
            offensivePriority: scoped.execution.offensiveElement,
            defensiveElement: scoped.execution.elementRelations[0].defensiveElement,
            scopedDamage: scoped.execution.actionResult.results[0].amount,
            generateDamage,
            compatibilityDamage: compatible.execution.actionResult.results[0].amount,
            authoredRelationEffects: 12,
            multiTargetDamage,
            carrierStoredOnEntity: false,
            cleanupOnSuccessAndFailure: true,
            causalGuard: true,
            phaseOrdering: ['BEFORE_ACTION', 'ELEMENT_RELATION_APPLIED', 'DAMAGE', 'AFTER_ACTION'],
            observationEventCount: 1,
            spiritRootAffinity
        }
    }, null, 2));
}

main();
