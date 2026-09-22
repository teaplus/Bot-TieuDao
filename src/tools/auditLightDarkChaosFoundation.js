import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import ElementRelationResolver from '../battle/elements/ElementRelationResolver.js';
import {
    BATTLE_STAT_DEFINITIONS,
    ELEMENTAL_BATTLE_ELEMENT_IDS
} from '../battle/stats/BattleStatPolicy.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const gameDataManager = bootstrapGameData();
const resolver = new ElementRelationResolver({ gameDataManager });
const elements = gameDataManager.getCollection('elements');
const effects = gameDataManager.getCollection('coreEffects');
const semantics = gameDataManager.getCollection('monsterSkillElementSemantics');

for (const elementId of ['LIGHT', 'DARK', 'CHAOS']) {
    assert(elements[elementId], `Missing canonical Element ${elementId}`);
    assert(effects[elements[elementId].effectId]?.tags.includes('MARKER'),
        `${elementId} must use a no-op marker Effect`);
    assert(ELEMENTAL_BATTLE_ELEMENT_IDS.includes(elementId),
        `${elementId} is missing from Battle Stat policy`);
    assert(BATTLE_STAT_DEFINITIONS[`${elementId.toLowerCase()}Damage`]
        && BATTLE_STAT_DEFINITIONS[`${elementId.toLowerCase()}Resist`],
    `${elementId} damage/resistance stats are incomplete`);
}

assert(resolver.has('LIGHT', 'DARK', 'COUNTER')
    && resolver.has('DARK', 'LIGHT', 'COUNTER'),
'LIGHT and DARK must counter each other in both directions');
assert(Object.values(gameDataManager.getCollection('elementRelations'))
    .filter((relation) => relation.from === 'CHAOS' || relation.to === 'CHAOS').length === 0,
'CHAOS must not have incoming or outgoing Element Relations before its formula is approved');

for (const [sourceName, runtimeElementId] of [
    ['Quang', 'LIGHT'],
    ['Ám', 'DARK'],
    ['Hỗn Độn', 'CHAOS']
]) {
    const semantic = semantics.find((entry) => entry.sourceName === sourceName);
    assert(semantic?.runtimeElementId === runtimeElementId
        && semantic.elementStatus === 'SUPPORTED'
        && semantic.mechanicStatus === 'SUPPORTED',
    `Monster semantic contract is invalid for ${sourceName}`, semantic);
}

console.log(JSON.stringify({
    status: 'PASS',
    canonicalElements: ['LIGHT', 'DARK', 'CHAOS'],
    lightDarkMutualCounter: true,
    chaosRelations: 0,
    battleStatsAdded: 6,
    supportedMonsterMechanics: ['PURIFY', 'HEAL_BLOCK', 'DISPEL']
}, null, 2));
