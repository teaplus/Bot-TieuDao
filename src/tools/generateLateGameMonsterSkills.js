import fs from 'fs';

const ROOT = new URL('../../', import.meta.url);
const DRAFT_URL = new URL('docs/06_MONSTER/007_LATE_GAME_CONTENT_MATRIX_DRAFT.md', ROOT);
const CATALOG_URL = new URL('src/data/monster/monster_skill_catalog.json', ROOT);
const OUTPUT_URL = new URL('src/data/monster/monster_attack_skill_templates.json', ROOT);

const CONTROL_CHANCE = Object.freeze({ DEFAULT: 20, BOSS: 25 });
const CHAIN_ARGUMENTS = Object.freeze({
    maxTargets: 3,
    allowRepeat: false,
    jumpMultipliers: [1, 0.7, 0.4]
});

const BEHAVIOR_BY_ID = Object.freeze({
    MON_SK_SERPENT_CONSTRICT: 'DAMAGE_CONTROL',
    MON_SK_SERPENT_SHED: 'PURIFY',
    MON_SK_SERPENT_POISON_MIST: 'CONTROL',
    MON_SK_AVIAN_GALE: 'CHAIN_DAMAGE',
    MON_SK_AVIAN_FLIGHT: 'SPD_BUFF',
    MON_SK_AVIAN_THUNDER_WING: 'DAMAGE_CONTROL',
    MON_SK_AVIAN_MYRIAD_FEATHERS: 'CHAIN_DAMAGE',
    MON_SK_DRAGON_MIGHT: 'ATK_BUFF',
    MON_SK_DRAGON_BREATH: 'CHAIN_DAMAGE',
    MON_SK_DRAGON_SCALE: 'SHIELD',
    MON_SK_DRAGON_WEATHER_CALL: 'CONTROL',
    MON_SK_DRAGON_WORLD_END_BREATH: 'CHAIN_DAMAGE',
    MON_SK_TURTLE_SHELL: 'SHIELD',
    MON_SK_TURTLE_WATER_SHIELD: 'SHIELD',
    MON_SK_TURTLE_EARTHQUAKE: 'CHAIN_DAMAGE',
    MON_SK_TURTLE_RECOVERY: 'HEAL',
    MON_SK_TURTLE_XUANWU_SHIELD: 'SHIELD',
    MON_SK_INSECT_SWARM_ATTACK: 'CHAIN_DAMAGE',
    MON_SK_SEA_TSUNAMI: 'CHAIN_DAMAGE',
    MON_SK_SEA_WATER_PRISON: 'CONTROL',
    MON_SK_SEA_VORTEX: 'DAMAGE_CONTROL',
    MON_SK_HEAVENLY_DEMON_HEART_CORRUPTION: 'DAMAGE_CONTROL',
    MON_SK_HEAVENLY_DEMON_ILLUSION: 'CONTROL',
    MON_SK_HEAVENLY_DEMON_POSSESSION: 'DAMAGE_CONTROL',
    MON_SK_HEAVENLY_DEMON_BODY: 'SHIELD',
    MON_SK_YAO_CHARM: 'CONTROL',
    MON_SK_YAO_BERSERK: 'ATK_BUFF',
    MON_SK_YAO_ILLUSION: 'CONTROL',
    MON_SK_ANCIENT_DEVOUR_HEAVEN: 'CHAIN_DAMAGE',
    MON_SK_ANCIENT_DEVOUR: 'DAMAGE_HEAL',
    MON_SK_ANCIENT_PRESSURE: 'CONTROL',
    MON_SK_DIVINE_PUNISHMENT: 'CHAIN_DAMAGE',
    MON_SK_DIVINE_SHIELD: 'SHIELD',
    MON_SK_DIVINE_REBIRTH: 'HEAL',
    MON_SK_DAO_DISPEL: 'DISPEL',
    MON_SK_DAO_HEAL_LOCK: 'HEAL_BLOCK',
    MON_SK_DAO_SUPPRESSION: 'CONTROL',
    MON_SK_DAO_RULE_DESTRUCTION: 'CHAIN_DAMAGE'
});

const FIXED_ELEMENTS = Object.freeze({
    MON_SK_AVIAN_WIND_BLADE: 'WIND',
    MON_SK_AVIAN_GALE: 'WIND',
    MON_SK_AVIAN_FLIGHT: 'WIND',
    MON_SK_AVIAN_THUNDER_WING: 'LIGHTNING',
    MON_SK_AVIAN_MYRIAD_FEATHERS: 'WIND',
    MON_SK_AVIAN_GOLDEN_WING_SLASH: 'METAL',
    MON_SK_SEA_TSUNAMI: 'WATER',
    MON_SK_SEA_TIDAL_WAVE: 'WATER',
    MON_SK_SEA_WATER_PRISON: 'WATER',
    MON_SK_SEA_WATER_ARROW: 'WATER',
    MON_SK_SEA_VORTEX: 'WATER',
    MON_SK_TURTLE_WATER_SHIELD: 'WATER',
    MON_SK_TURTLE_EARTHQUAKE: 'EARTH',
    MON_SK_HEAVENLY_DEMON_FIRE: 'DARK',
    MON_SK_YAO_FIRE: 'FIRE',
    MON_SK_ANCIENT_CHAOS_QI: 'CHAOS',
    MON_SK_DIVINE_LIGHT: 'LIGHT',
    MON_SK_DAO_PUNISHMENT: 'LIGHT',
    MON_SK_DAO_DISPEL: 'CHAOS',
    MON_SK_DAO_HEAL_LOCK: 'DARK',
    MON_SK_DAO_SUPPRESSION: 'LIGHT',
    MON_SK_DAO_RULE_DESTRUCTION: 'CHAOS'
});

function readJson(url) {
    return JSON.parse(fs.readFileSync(url, 'utf8'));
}

function createCatalogIndex(catalog) {
    const index = new Map();
    for (const race of catalog.races || []) {
        for (const entry of [...(race.skills || []), ...(race.bossSkills || [])]) {
            index.set(entry.id, {
                ...entry,
                raceId: race.id,
                bossSkill: (race.bossSkills || []).some((skill) => skill.id === entry.id)
            });
        }
    }
    return index;
}

function action(skillId, order, payload) {
    return {
        id: `${skillId}_ACTION_${String(order).padStart(2, '0')}`,
        order,
        ...payload
    };
}

function controlAction(skillId, order) {
    return action(skillId, order, {
        type: 'APPLY_EFFECT',
        effectId: 'STUN',
        chanceByVariant: CONTROL_CHANCE
    });
}

function buildActions(skillId, behavior) {
    const damage = () => action(skillId, 1, {
        type: 'DAMAGE',
        formulaId: 'SKILL_DAMAGE'
    });
    switch (behavior) {
        case 'DAMAGE_CONTROL':
            return [damage(), controlAction(skillId, 2)];
        case 'CHAIN_DAMAGE':
            return [action(skillId, 1, {
                type: 'CHAIN_DAMAGE',
                formulaId: 'SKILL_DAMAGE',
                arguments: CHAIN_ARGUMENTS
            })];
        case 'CONTROL':
            return [controlAction(skillId, 1)];
        case 'HEAL':
            return [action(skillId, 1, { type: 'HEAL', formulaId: 'HEAL_ATTACK' })];
        case 'DAMAGE_HEAL':
            return [
                damage(),
                action(skillId, 2, {
                    type: 'HEAL',
                    target: 'SELF',
                    formulaId: 'HEAL_ATTACK'
                })
            ];
        case 'SHIELD':
            return [action(skillId, 1, {
                type: 'ADD_SHIELD',
                formulaId: 'SHIELD_ATTACK'
            })];
        case 'ATK_BUFF':
            return [action(skillId, 1, {
                type: 'ADD_MODIFIER',
                modifierId: 'ATK_UP_20',
                arguments: { duration: 2 }
            })];
        case 'SPD_BUFF':
            return [action(skillId, 1, {
                type: 'ADD_MODIFIER',
                modifierId: 'SPD_UP_10',
                arguments: { duration: 2 }
            })];
        case 'PURIFY':
            return [action(skillId, 1, {
                type: 'PURIFY',
                arguments: { count: 1 }
            })];
        case 'DISPEL':
            return [action(skillId, 1, {
                type: 'DISPEL',
                chanceByVariant: CONTROL_CHANCE
            })];
        case 'HEAL_BLOCK':
            return [action(skillId, 1, {
                type: 'APPLY_EFFECT',
                effectId: 'HEAL_BLOCK',
                chanceByVariant: CONTROL_CHANCE
            })];
        default:
            return [damage()];
    }
}

function resolveTarget(behavior) {
    if (['HEAL', 'SHIELD', 'ATK_BUFF', 'SPD_BUFF', 'PURIFY'].includes(behavior)) {
        return { team: 'SELF', scope: 'SELF' };
    }
    return { team: 'ENEMY', scope: 'SINGLE' };
}

function buildSkill(skillId, catalogEntry) {
    const behavior = BEHAVIOR_BY_ID[skillId] || 'DAMAGE';
    const fixedElement = FIXED_ELEMENTS[skillId] || null;
    const utility = !['DAMAGE', 'CHAIN_DAMAGE'].includes(behavior);
    return {
        id: skillId,
        displayName: catalogEntry.displayName,
        grade: catalogEntry.bossSkill ? 'THIEN' : 'DIA',
        elementMode: fixedElement ? 'FIXED' : 'INHERIT_CASTER',
        element: fixedElement,
        cooldownTurns: utility ? 3 : 2,
        target: resolveTarget(behavior),
        actions: buildActions(skillId, behavior),
        tags: [
            'MONSTER_ONLY',
            catalogEntry.raceId,
            behavior,
            ...(catalogEntry.bossSkill ? ['BOSS'] : [])
        ]
    };
}

const draft = fs.readFileSync(DRAFT_URL, 'utf8');
const referencedIds = [...new Set(
    [...draft.matchAll(/MON_SK_[A-Z0-9_]+/g)].map((match) => match[0])
)].sort();
const catalog = readJson(CATALOG_URL);
const catalogIndex = createCatalogIndex(catalog);
const output = readJson(OUTPUT_URL);
const existingIds = new Set((output.attackSkills || []).map((skill) => skill.id));
output.attackSkills = (output.attackSkills || []).map((skill) => {
    if (!referencedIds.includes(skill.id)) return skill;
    const fixedElement = FIXED_ELEMENTS[skill.id] || null;
    return {
        ...skill,
        elementMode: fixedElement ? 'FIXED' : 'INHERIT_CASTER',
        element: fixedElement
    };
});
const additions = referencedIds
    .filter((skillId) => !existingIds.has(skillId))
    .map((skillId) => {
        const catalogEntry = catalogIndex.get(skillId);
        if (!catalogEntry) throw new Error(`LATE_GAME_SKILL_MISSING_CATALOG:${skillId}`);
        return buildSkill(skillId, catalogEntry);
    });

output.version = Math.max(Number(output.version || 1), 2);
output.attackSkills = [...output.attackSkills, ...additions];
fs.writeFileSync(OUTPUT_URL, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
    status: 'GENERATED',
    referencedSkills: referencedIds.length,
    existingSkills: existingIds.size,
    addedSkills: additions.length,
    totalSkills: output.attackSkills.length,
    inheritedElementSkills: additions.filter(
        (skill) => skill.elementMode === 'INHERIT_CASTER'
    ).length,
    fixedElementSkills: additions.filter((skill) => skill.elementMode === 'FIXED').length
}, null, 2));
