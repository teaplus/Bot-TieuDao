import BattleEngine from '../battle/BattleEngine.js';
import BattleContext from '../battle/context/BattleContext.js';
import BattleEntity from '../battle/entities/BattleEntity.js';
import BattleEntityFactory from '../runtime/battle/BattleEntityFactory.js';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const gameDataManager = bootstrapGameData();
setGameDataManager(gameDataManager);
const factory = new BattleEntityFactory({ gameDataManager });

function createRuntimePlayer(spiritRootId, qualityTierId) {
    return {
        playerId: `chaos-audit-${spiritRootId}`,
        name: 'Hỗn Độn Tu Sĩ',
        baseStats: { hp: 500, atk: 100, def: 0, spd: 10 },
        inventory: { runtimeEquipments: [] },
        skillIds: [],
        activeEffects: [],
        spiritRootId,
        spiritRootQualityTierId: qualityTierId,
        sectId: null,
        realmId: 1,
        cultivationArtId: 'CP_FIRE_HOANG'
    };
}

function createCaster(spiritRootId, qualityTierId, elementalStats = {}) {
    const materialized = factory.createFromRuntimePlayer(
        createRuntimePlayer(spiritRootId, qualityTierId),
        { id: `caster-${spiritRootId}-${qualityTierId}` }
    );
    return new BattleEntity({
        id: materialized.id,
        name: materialized.name,
        team: 'A',
        sourceType: 'PLAYER',
        battleStat: { ...materialized.battleStat, ...elementalStats },
        metadata: materialized.metadata
    });
}

function execute({
    caster,
    element = 'FIRE',
    elementWeights = null,
    targetElement = 'NEUTRAL',
    targetStats = {}
}) {
    const target = new BattleEntity({
        id: `target-${element}-${targetElement}`,
        name: 'Mục Tiêu',
        team: 'B',
        battleStat: { hp: 1000, atk: 1, def: 0, spd: 1, ...targetStats },
        metadata: { defensiveElement: targetElement }
    });
    const context = new BattleContext({
        teams: { A: [caster], B: [target] },
        random: () => 0.5
    });
    const engine = new BattleEngine({ gameDataManager, random: context.random });
    return engine.actionPipeline.executeResolved({
        battleContext: context,
        caster,
        skill: { id: 'CHAOS_AUDIT_SKILL', element },
        action: {
            id: 'CHAOS_AUDIT_DAMAGE',
            type: 'DAMAGE',
            target: 'ENEMY_SINGLE',
            ...(elementWeights ? { elementWeights } : { element }),
            multiplier: 1,
            variance: false,
            critical: false
        },
        candidates: [target]
    });
}

const chaosRoot = gameDataManager.requireRecord('spiritRoots', 'HON_DON_LINH_CAN');
assert(chaosRoot.rollWeight === 0 && chaosRoot.tags.includes('REBIRTH_GATED'),
    'Chaos Spirit Root must use the approved rebirth-gated acquisition pool',
    chaosRoot);

const lowerChaos = createCaster('HON_DON_LINH_CAN', 'LOWER_GRADE');
const upperChaos = createCaster('HON_DON_LINH_CAN', 'UPPER_GRADE');
const lowerNeutralResult = execute({ caster: lowerChaos, element: 'WATER' });
const lowerCounterResult = execute({
    caster: lowerChaos,
    element: 'WATER',
    targetElement: 'FIRE'
});
const upperNeutralResult = execute({ caster: upperChaos, element: 'LIGHT' });
const upperCounterResult = execute({
    caster: upperChaos,
    element: 'LIGHT',
    targetElement: 'DARK'
});
assert(lowerNeutralResult.actionResult.results[0].amount === '100'
    && lowerCounterResult.actionResult.results[0].amount === '122',
'Lower-grade Chaos +2% must activate only when the Skill Element counters the target',
{
    neutral: lowerNeutralResult.actionResult,
    counter: lowerCounterResult.actionResult
});
assert(upperNeutralResult.actionResult.results[0].amount === '104'
    && upperCounterResult.actionResult.results[0].amount === '126'
    && upperCounterResult.actionResult.results[0].spiritRootAffinity.bonusRate === '0.04'
    && upperCounterResult.actionResult.results[0].spiritRootAffinity.appliedCounterBonusRate === '0.02'
    && upperCounterResult.actionResult.results[0].spiritRootAffinity.counterTriggered,
'Upper-grade Chaos must keep 4% quality globally and add 2% after a counter relation',
{
    neutral: upperNeutralResult.actionResult,
    counter: upperCounterResult.actionResult
});

const equippedChaos = createCaster('HON_DON_LINH_CAN', 'UPPER_GRADE', {
    fireDamage: 30,
    waterDamage: 30
});
const equippedResult = execute({
    caster: equippedChaos,
    element: 'FIRE',
    targetElement: 'METAL'
});
const equippedDamage = equippedResult.actionResult.results[0];
assert(equippedDamage.amount === '164'
    && equippedDamage.elementalEquipment.damageBonus === '30',
'Chaos affinity must preserve the full authored Element Damage contribution',
equippedDamage);

const resistedResult = execute({
    caster: equippedChaos,
    element: 'FIRE',
    targetElement: 'METAL',
    targetStats: { fireResist: 30 }
}).actionResult.results[0];
assert(resistedResult.amount === '114'
    && resistedResult.elementalEquipment.resistance === '30',
'Chaos affinity must preserve full Element Damage and target Element Resistance',
resistedResult);

const multiResult = execute({
    caster: equippedChaos,
    elementWeights: { FIRE: 50, WATER: 50 },
    targetElement: 'METAL'
}).actionResult.results[0];
assert(multiResult.amount === '149'
    && multiResult.elementalComponents[0].spiritRootAffinity.bonusRate === '0.04'
    && multiResult.elementalComponents[0].spiritRootAffinity.appliedCounterBonusRate === '0.02'
    && multiResult.elementalComponents[0].spiritRootAffinity.counterTriggered
    && multiResult.elementalComponents[1].spiritRootAffinity.bonusRate === '0.04'
    && multiResult.elementalComponents[1].spiritRootAffinity.appliedCounterBonusRate === '0'
    && !multiResult.elementalComponents[1].spiritRootAffinity.counterTriggered
    && multiResult.elementalComponents.every(
        (component) => component.elementalEquipment.damageBonus === '30'
    ),
'Each weighted component must add Chaos 2% only when that component counters the target',
multiResult);

const fireRoot = createCaster('HOA_LINH_CAN', 'UPPER_GRADE', { fireDamage: 30 });
const fireResult = execute({ caster: fireRoot, element: 'FIRE' }).actionResult.results[0];
assert(fireResult.amount === '135'
    && fireResult.elementalEquipment.damageBonus === '30',
'Normal Spirit Roots must retain the full authored Element Damage contribution',
fireResult);

const chaosRelations = Object.values(gameDataManager.getCollection('elementRelations'))
    .filter((relation) => relation.from === 'CHAOS' || relation.to === 'CHAOS');
assert(chaosRelations.length === 0, 'Chaos must remain uncountered', chaosRelations);

console.log(JSON.stringify({
    status: 'PASS',
    acquisitionPolicy: 'REBIRTH_GATED',
    lowerGradeNeutralDamage: lowerNeutralResult.actionResult.results[0].amount,
    lowerGradeCounterDamage: lowerCounterResult.actionResult.results[0].amount,
    upperGradeNeutralDamage: upperNeutralResult.actionResult.results[0].amount,
    upperGradeCounterDamage: upperCounterResult.actionResult.results[0].amount,
    equipmentDamage: equippedDamage.amount,
    equipmentBonus: {
        effective: equippedDamage.elementalEquipment.damageBonus,
        scale: 'FULL'
    },
    resistedDamage: resistedResult.amount,
    multiElementDamage: multiResult.amount,
    normalRootEquipmentDamage: fireResult.amount,
    chaosRelations: chaosRelations.length
}, null, 2));
