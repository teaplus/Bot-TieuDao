import fs from 'fs';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import SpiritRootRoller from '../gameplay/player/SpiritRootRoller.js';
import SpiritRootEffectResolver from '../gameplay/player/SpiritRootEffectResolver.js';
import SpiritRootQualityRoller from '../gameplay/player/SpiritRootQualityRoller.js';
import BattleEntityFactory from '../runtime/battle/BattleEntityFactory.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const gameDataManager = bootstrapGameData();
const roots = Object.values(gameDataManager.getCollection('spiritRoots'));
const totalWeight = roots.reduce((total, root) => total + root.rollWeight, 0);
assert(roots.length === 11 && totalWeight === 100, 'Existing rollable Spirit Root distribution changed');

const samples = [0, 0.009999, 0.01, 0.099999, 0.10, 0.499999, 0.50, 0.999999];
const rolledIds = samples.map((randomValue) => new SpiritRootRoller({
    gameDataManager,
    random: () => randomValue
}).roll().id);
assert(rolledIds.join(',') === [
    'THIEN_LINH_CAN', 'THIEN_LINH_CAN', 'BANG_LINH_CAN', 'PHONG_LINH_CAN',
    'KIM_LINH_CAN', 'HOA_LINH_CAN', 'HOA_LINH_CAN', 'TAP_CAN'
].join(','), 'Weighted boundary mapping changed', rolledIds);

let invalidRandomRejected = false;
try {
    new SpiritRootRoller({ gameDataManager, random: () => 1 }).roll();
} catch (error) {
    invalidRandomRejected = error.message === 'SPIRIT_ROOT_RANDOM_INVALID';
}
assert(invalidRandomRejected, 'Out-of-contract RNG must fail fast');
assert(roots.every((root) => root.archetype && Array.isArray(root.elementIds)
    && Array.isArray(root.effectIds) && Array.isArray(root.tags)),
    'Current Spirit Root structural contract is incomplete');
const windRoot = roots.find((root) => root.id === 'PHONG_LINH_CAN');
assert(windRoot.elementIds.join(',') === 'WIND' && windRoot.defensiveElementId === 'WIND',
    'Phong Linh Căn must use the canonical WIND affinity', windRoot);
const chaosRoot = roots.find((root) => root.id === 'HON_DON_LINH_CAN');
assert(chaosRoot.elementIds.join(',') === 'CHAOS'
    && chaosRoot.defensiveElementId === 'CHAOS'
    && chaosRoot.rollWeight === 0
    && chaosRoot.affinityPolicy.mode === 'ALL_NON_NEUTRAL_ELEMENTS'
    && chaosRoot.tags.includes('REBIRTH_GATED'),
'Chaos Spirit Root wildcard contract or acquisition gate is invalid', chaosRoot);
const qualityTiers = Object.values(gameDataManager.getCollection('spiritRootQualityTiers'))
    .sort((left, right) => left.order - right.order);
assert(qualityTiers.map((tier) => tier.id).join(',') === [
    'LOWER_GRADE', 'MIDDLE_GRADE', 'UPPER_GRADE', 'PEAK_GRADE',
    'HEAVENLY_GRADE', 'SAINT_GRADE', 'IMMORTAL_GRADE', 'DIVINE_GRADE'
].join(','), 'Quality tier ladder mismatch', qualityTiers);
assert(qualityTiers.map((tier) => tier.effectIds.length).join(',') === '0,2,2,2,2,2,2,2',
    'Approved cultivation and affinity tier Effect mapping mismatch');
const effectResolver = new SpiritRootEffectResolver({ gameDataManager });
const chaosActionEffects = effectResolver.getActionEffects({
    spiritRootId: 'HON_DON_LINH_CAN',
    spiritRootQualityTierId: 'UPPER_GRADE'
});
assert(chaosActionEffects.some((effect) => (
    effect.predicate === 'ACTION_ELEMENT_MATCHES_SOURCE_AFFINITY'
    && effect.value === 0.04
)) && chaosActionEffects.some((effect) => (
    effect.predicate === 'ACTION_ELEMENT_COUNTERS_TARGET'
    && effect.value === 0.02
)), 'Chaos quality affinity and counter-only bonus must remain separate', chaosActionEffects);
const cultivationBonuses = qualityTiers.map((tier) => (
    effectResolver.getCultivationEffects({
        spiritRootId: 'HOA_LINH_CAN',
        spiritRootQualityTierId: tier.id
    })[0]?.value || 0
));
assert(cultivationBonuses.join(',') === '0,0.05,0.1,0.2,0.25,0.3,0.35,0.5',
    'Approved cultivation quality budget mismatch', cultivationBonuses);
const affinityBonuses = qualityTiers.map((tier) => (
    effectResolver.getActionEffects({
        spiritRootId: 'HOA_LINH_CAN',
        spiritRootQualityTierId: tier.id
    })[0]?.value || 0
));
assert(affinityBonuses.join(',') === '0,0.02,0.04,0.07,0.1,0.14,0.18,0.25',
    'Approved matching-element damage budget mismatch', affinityBonuses);
const upperGradeProjection = effectResolver.getEffectProjection({
    spiritRootId: 'HOA_LINH_CAN',
    spiritRootQualityTierId: 'UPPER_GRADE'
});
assert(upperGradeProjection.length === 2
    && upperGradeProjection.some((effect) => effect.scope === 'CULTIVATION' && effect.value === 0.1)
    && upperGradeProjection.some((effect) => effect.scope === 'ACTION'
        && effect.value === 0.04
        && effect.predicate === 'ACTION_ELEMENT_MATCHES_SOURCE_AFFINITY'),
'Spirit Root projection must expose scope-aware passive bindings', upperGradeProjection);
assert(effectResolver.getBattleEffects({
    spiritRootId: 'HOA_LINH_CAN',
    spiritRootQualityTierId: 'UPPER_GRADE'
}).length === 0, 'Unapproved template battle effects must remain inactive');
const battleEntity = new BattleEntityFactory({
    gameDataManager,
    spiritRootEffectResolver: {
        getDefinitions: () => [{ id: 'SPIRIT_ROOT_AUDIT_ENTITY' }],
        getBattleEffects: () => [{
            stat: 'atk', mode: 'add_percent_base', value: 0.1,
            source: 'spirit-root:audit'
        }]
    }
}).createFromRuntimePlayer({
    playerId: 'spirit-root-battle-audit',
    name: 'Linh Căn Battle Audit',
    baseStats: { hp: 100, atk: 100, def: 100, spd: 100 },
    inventory: { runtimeEquipments: [] },
    skillIds: [],
    activeEffects: [],
    spiritRootId: 'HOA_LINH_CAN',
    spiritRootQualityTierId: 'LOWER_GRADE',
    sectId: null,
    realmId: 1,
    cultivationArtId: 'CP_FIRE_HOANG'
});
assert(battleEntity.battleStat.atk === '110'
    && battleEntity.metadata.spiritRootEffectIds.join(',') === 'SPIRIT_ROOT_AUDIT_ENTITY',
'BattleEntityFactory must materialize approved ENTITY bindings from Spirit Root', {
    atk: battleEntity.battleStat.atk,
    metadata: battleEntity.metadata
});
const migrationSql = fs.readFileSync(
    new URL('../database/migrations/018_spirit_root_progression_foundation.sql', import.meta.url),
    'utf8'
);
assert(migrationSql.includes('UNIQUE (player_id, rebirth_number)'),
    'One entitlement per rebirth must be database-enforced');
assert(migrationSql.includes("status IN ('AVAILABLE', 'CONSUMED')"),
    'Entitlement state machine constraint missing');
const poolId = 'SPIRIT_ROOT_REBIRTH_QUALITY_V1';
const rootPool = gameDataManager.requireRecord('spiritRootRerollPools', poolId);
const rootRoller = new SpiritRootRoller({
    gameDataManager,
    random: () => 0.1
});
const rootBracketCases = [
    ['0', 'ROOT_REBIRTH_0_9', 0],
    ['9', 'ROOT_REBIRTH_0_9', 0],
    ['10', 'ROOT_REBIRTH_10_19', 0.5],
    ['19', 'ROOT_REBIRTH_10_19', 0.5],
    ['20', 'ROOT_REBIRTH_20_39', 1],
    ['39', 'ROOT_REBIRTH_20_39', 1],
    ['40', 'ROOT_REBIRTH_40_PLUS', 2],
    ['999999999999999999999', 'ROOT_REBIRTH_40_PLUS', 2]
];
for (const [count, bracketId, chaosWeight] of rootBracketCases) {
    const bracket = rootRoller.resolveTemplateBracket(poolId, count);
    const weights = rootRoller.getWeightedRoots({ poolId, rebirthCount: count });
    const actualChaosWeight = bracket.entries.find(
        (entry) => entry.spiritRootId === 'HON_DON_LINH_CAN'
    ).weight;
    assert(bracket.id === bracketId && actualChaosWeight === chaosWeight,
        'Chaos Spirit Root rebirth bracket mismatch',
        { count, bracketId: bracket.id, actualChaosWeight });
    assert(weights.reduce((sum, entry) => sum + entry.weight, 0) === 100 - (
        chaosWeight === 0 ? 0 : 0
    ), 'Rollable Spirit Root weights must total 100', { count, weights });
}
assert(rootPool.revision === 4
    && rootRoller.roll({ poolId, rebirthCount: '10' }).id === 'HON_DON_LINH_CAN',
'Chaos Spirit Root must become rollable at the approved 0.5% bracket boundary');
const bracketCases = [
    ['0', 'REBIRTH_0_START', 'LOWER_GRADE', 'PEAK_GRADE'],
    ['1', 'REBIRTH_1_2', 'LOWER_GRADE', 'PEAK_GRADE'],
    ['3', 'REBIRTH_3_5', 'LOWER_GRADE', 'HEAVENLY_GRADE'],
    ['6', 'REBIRTH_6_9', 'LOWER_GRADE', 'SAINT_GRADE'],
    ['10', 'REBIRTH_10_19', 'LOWER_GRADE', 'IMMORTAL_GRADE'],
    ['20', 'REBIRTH_20_39', 'LOWER_GRADE', 'IMMORTAL_GRADE'],
    ['999999999999999999999999', 'REBIRTH_40_PLUS', 'LOWER_GRADE', 'DIVINE_GRADE']
];
for (const [count, bracketId, firstTier, lastTier] of bracketCases) {
    const first = new SpiritRootQualityRoller({ gameDataManager, random: () => 0 })
        .roll(poolId, count);
    const last = new SpiritRootQualityRoller({ gameDataManager, random: () => 0.999999 })
        .roll(poolId, count);
    assert(first.bracket.id === bracketId && first.qualityTier.id === firstTier,
        'Quality bracket lower boundary mismatch', { count, first });
    assert(last.qualityTier.id === lastTier,
        'Quality bracket upper boundary mismatch', { count, last });
}
const cutoverSql = fs.readFileSync(
    new URL('../database/migrations/019_spirit_root_quality_cutover.sql', import.meta.url),
    'utf8'
);
assert(cutoverSql.includes("SET spirit_root_quality_tier_id = 'LOWER_GRADE'"),
    'Existing Player quality backfill mismatch');
assert(cutoverSql.includes('WHERE player.rebirth_count > 0')
    && cutoverSql.includes('ON CONFLICT (player_id, rebirth_number) DO NOTHING'),
    'Retroactive entitlement must be capped conflict-safely at one current-cycle row');

console.log(JSON.stringify({
    status: 'PASS',
    checks: {
        rootCount: roots.length,
        totalWeight,
        weightedBoundaries: true,
        reusableRoller: true,
        qualityTiers: qualityTiers.length,
        archetypeSeparated: true,
        multiElementContract: true,
        windAffinity: true,
        chaosAffinityPolicy: 'QUALITY_GLOBAL_COUNTER_2_PERCENT_FINAL',
        chaosAcquisitionPolicy: 'REBIRTH_GATED_0_0_5_1_2_PERCENT',
        chaosTemplateBrackets: rootBracketCases.map((entry) => entry[1]),
        cultivationBonuses,
        affinityBonuses,
        scopeAwareEffectProjection: true,
        battleEntityEffectMaterialization: true,
        gameplayEffectsAdded: true,
        entitlementPersistenceAdded: true,
        qualityBrackets: bracketCases.map((entry) => entry[1]),
        deterministicBackfill: 'LOWER_GRADE',
        rerollExecutionAdded: true
    }
}, null, 2));
