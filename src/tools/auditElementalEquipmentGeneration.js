import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import ItemFactory from '../factories/ItemFactory.js';
import ItemGenerator from '../factories/ItemGenerator.js';

function assert(condition, message, details = {}) {
    if (!condition) {
        const error = new Error(message);
        error.details = details;
        throw error;
    }
}

setGameDataManager(bootstrapGameData());

const weapon = ItemGenerator.rollEquipment(
    ItemFactory.getTemplate('EQ_FIRE_WEAPON'),
    'COMMON',
    { grade: 'THAN', gradeQuality: 'HIGH', random: () => 0 }
);
assert(weapon.elementIds.join(',') === 'FIRE,METAL', 'High quality deterministic roll did not produce two unique elements', weapon);
assert(weapon.fixedEffects.some((effect) => effect.modifierId === 'ATK_PERCENT' && effect.value === 1.53),
    'Thần weapon main stat does not use approved 153% curve', weapon.fixedEffects);
assert(weapon.fixedEffects.filter((effect) => effect.modifierId.includes('_DAMAGE_')).every((effect) => effect.value === 77),
    'Both elemental damage lines must use the full approved value', weapon.fixedEffects);
assert(weapon.affixes.length === 2, 'High quality equipment must receive two non-duplicate affixes', weapon.affixes);
assert(weapon.generatedName.startsWith('[🔥 Hỏa][⚙️ Kim]'), 'Element prefixes are not deterministic', weapon.generatedName);

const ring = ItemGenerator.rollEquipment(
    ItemFactory.getTemplate('EQ_FIRE_RING'),
    'COMMON',
    { grade: 'HOANG', gradeQuality: 'LOW', random: () => 0 }
);
assert(ring.fixedEffects.some((effect) => effect.modifierId === 'HP_PERCENT' && effect.primary === true),
    'Accessory did not roll its guaranteed primary stat', ring.fixedEffects);
assert(ring.fixedEffects.some((effect) => effect.modifierId === 'ELEMENT_FIRE_DAMAGE_PERCENT' && effect.value === 5),
    'Ring did not receive its guaranteed elemental damage line', ring.fixedEffects);
assert(ring.elementIds.length === 1 && ring.affixes.length === 0,
    'Low quality equipment must have one element and no random affix', ring);

console.log(JSON.stringify({
    status: 'PASS',
    weapon: {
        generatedName: weapon.generatedName,
        elementIds: weapon.elementIds,
        fixedEffectCount: weapon.fixedEffects.length,
        affixCount: weapon.affixes.length
    },
    ring: {
        generatedName: ring.generatedName,
        elementIds: ring.elementIds,
        primaryModifierId: ring.fixedEffects.find((effect) => effect.primary)?.modifierId
    }
}, null, 2));
