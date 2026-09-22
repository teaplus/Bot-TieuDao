import fs from 'fs';

const ROOT = new URL('../../', import.meta.url);
const DRAFT_URL = new URL('docs/06_MONSTER/007_LATE_GAME_CONTENT_MATRIX_DRAFT.md', ROOT);
const MONSTER_URL = new URL('src/data/monster/monster_template.json', ROOT);
const SPAWN_URL = new URL('src/data/maps/monster_spawn_pools.json', ROOT);
const BOSS_POOL_URL = new URL('src/data/monster/secret_realm_boss_pools.json', ROOT);
const MAP_URL = new URL('src/data/maps/maps.json', ROOT);

const QUALITY_POOL_BY_REALM = Object.freeze({
    NGUYEN_ANH: 'QUALITY_POOL_TRUNG_CHAU',
    HOA_THAN: 'QUALITY_POOL_THIEN_LINH',
    LUYEN_HU: 'QUALITY_POOL_HU_KHONG',
    HOP_THE: 'QUALITY_POOL_THANH_LINH',
    DAI_THUA: 'QUALITY_POOL_CUU_THIEN',
    DO_KIEP: 'QUALITY_POOL_THIEN_KIEP',
    CHAN_TIEN: 'QUALITY_POOL_TIEN_GIOI',
    HUYEN_TIEN: 'QUALITY_POOL_HUYEN_THIEN',
    KIM_TIEN: 'QUALITY_POOL_KIM_KHUYET',
    THAI_AT: 'QUALITY_POOL_THAI_SO',
    DAI_LA: 'QUALITY_POOL_DAI_LA',
    DAO_TO: 'QUALITY_POOL_KHOI_NGUYEN'
});

const MAPS = Object.freeze([
    {
        section: '3.1', mapId: 'TRUNG_CHAU_THANH_VUC', realmCode: 'NGUYEN_ANH',
        spawnPoolId: 'POOL_TRUNG_CHAU_THANH_VUC', bossRaceId: 'SERPENT'
    },
    {
        section: '3.2', mapId: 'THIEN_LINH_GIOI', realmCode: 'HOA_THAN',
        spawnPoolId: 'POOL_THIEN_LINH_GIOI', bossRaceId: 'AVIAN'
    },
    {
        section: '3.3', mapId: 'HU_KHONG_HAI', realmCode: 'LUYEN_HU',
        spawnPoolId: 'POOL_HU_KHONG_HAI', bossRaceId: 'SEA'
    },
    {
        section: '3.4', mapId: 'THANH_LINH_DAI_LUC', realmCode: 'HOP_THE',
        spawnPoolId: 'POOL_THANH_LINH_DAI_LUC', bossRaceId: 'TURTLE'
    },
    {
        section: '3.5', mapId: 'CUU_THIEN_TIEN_CANH', realmCode: 'DAI_THUA',
        spawnPoolId: 'POOL_CUU_THIEN_TIEN_CANH', bossRaceId: 'DRAGON'
    },
    {
        section: '3.6', mapId: 'THIEN_KIEP_GIOI', realmCode: 'DO_KIEP',
        spawnPoolId: 'POOL_THIEN_KIEP_GIOI', bossRaceId: 'HEAVENLY_DEMON'
    },
    {
        section: '3.7', mapId: 'TIEN_GIOI', realmCode: 'CHAN_TIEN',
        spawnPoolId: 'POOL_TIEN_GIOI', bossRaceId: 'SPIRIT_CREATURE'
    },
    {
        section: '3.8', mapId: 'HUYEN_THIEN_TIEN_VUC', realmCode: 'HUYEN_TIEN',
        spawnPoolId: 'POOL_HUYEN_THIEN_TIEN_VUC', bossRaceId: 'YAO'
    },
    {
        section: '3.9', mapId: 'KIM_KHUYET_THIEN', realmCode: 'KIM_TIEN',
        spawnPoolId: 'POOL_KIM_KHUYET_THIEN', bossRaceId: 'AVIAN'
    },
    {
        section: '3.10', mapId: 'THAI_SO_GIOI', realmCode: 'THAI_AT',
        spawnPoolId: 'POOL_THAI_SO_GIOI', bossRaceId: 'ANCIENT_BEAST'
    },
    {
        section: '3.11', mapId: 'DAI_LA_THIEN', realmCode: 'DAI_LA',
        spawnPoolId: 'POOL_DAI_LA_THIEN', bossRaceId: 'DIVINE_BEAST'
    },
    {
        section: '3.12', mapId: 'KHOI_NGUYEN_DAO_GIOI', realmCode: 'DAO_TO',
        spawnPoolId: 'POOL_KHOI_NGUYEN_DAO_GIOI', bossRaceId: 'HEAVENLY_DAO_AVATAR'
    }
].map((entry, index) => Object.freeze({
    ...entry,
    realmOrder: index + 4,
    bossPoolId: `SECRET_BOSS_POOL_${entry.realmCode}`
})));

function readJson(url) {
    return JSON.parse(fs.readFileSync(url, 'utf8'));
}

function writeJson(url, value) {
    fs.writeFileSync(url, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function slug(value) {
    return String(value)
        .replaceAll('Đ', 'D')
        .replaceAll('đ', 'd')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

const MONSTER_ID_OVERRIDES = Object.freeze({
    'YAO:Hồ Yêu': 'MON_YAO_FOX',
    'YAO:Hổ Yêu': 'MON_YAO_TIGER'
});

function monsterId(monster) {
    return MONSTER_ID_OVERRIDES[`${monster.raceId}:${monster.displayName}`]
        || `MON_${monster.raceId}_${slug(monster.displayName)}`;
}

function parseSection(draft, map, nextMap) {
    const startMarker = `### ${map.section} `;
    const start = draft.indexOf(startMarker);
    if (start < 0) throw new Error(`LATE_GAME_SECTION_NOT_FOUND:${map.section}`);
    const end = nextMap
        ? draft.indexOf(`### ${nextMap.section} `, start + startMarker.length)
        : draft.indexOf('## 4.', start + startMarker.length);
    const content = draft.slice(start, end);
    const rowPattern = /^\| ([^|]+?) \| `([A-Z_]+)` \| `([A-Z]+)` \| `(MON_SK_[A-Z0-9_]+)` \| `(MON_SK_[A-Z0-9_]+)` \| (\d+) \|$/gm;
    const monsters = [...content.matchAll(rowPattern)].map((match) => ({
        displayName: match[1].trim(),
        raceId: match[2],
        element: match[3],
        skillIds: [match[4], match[5]],
        weight: Number(match[6])
    }));
    const bossMatch = content.match(
        /Boss Bí Cảnh: \*\*([^*]+)\*\* — `([A-Z]+)`;\s*`(MON_SK_[A-Z0-9_]+)` \+\s*`(MON_SK_[A-Z0-9_]+)`\./
    );
    if (monsters.length === 0 || !bossMatch) {
        throw new Error(`LATE_GAME_SECTION_PARSE_FAILED:${map.section}`);
    }
    return {
        monsters,
        boss: {
            displayName: bossMatch[1].trim(),
            raceId: map.bossRaceId,
            element: bossMatch[2],
            skillIds: [bossMatch[3], bossMatch[4]]
        }
    };
}

function normalTemplate(map, monster) {
    return {
        id: monsterId(monster),
        displayName: monster.displayName,
        raceId: monster.raceId,
        element: monster.element,
        combat: {
            aiProfile: 'NORMAL',
            skillIds: monster.skillIds
        },
        scalingRule: {
            minRealm: map.realmCode,
            fixedStage: 1
        },
        allowedVariants: ['NORMAL', 'ELITE'],
        baseRewardId: 'BASIC_MONSTER_DROP'
    };
}

function bossTemplate(map, boss) {
    return {
        id: `MON_BOSS_${slug(boss.displayName)}`,
        displayName: boss.displayName,
        raceId: boss.raceId,
        element: boss.element,
        combat: {
            aiProfile: 'BOSS',
            skillIds: boss.skillIds
        },
        scalingRule: { minRealm: map.realmCode },
        allowedVariants: ['BOSS'],
        baseRewardId: 'BASIC_MONSTER_DROP'
    };
}

function mergeById(existing, additions, removedIds = []) {
    const additionIds = new Set(additions.map((entry) => entry.id));
    const removalIds = new Set(removedIds);
    return [
        ...existing.filter((entry) => (
            !additionIds.has(entry.id) && !removalIds.has(entry.id)
        )),
        ...additions
    ];
}

const draft = fs.readFileSync(DRAFT_URL, 'utf8');
const parsedMaps = MAPS.map((map, index) => ({
    map,
    content: parseSection(draft, map, MAPS[index + 1])
}));
const normalTemplates = parsedMaps.flatMap(({ map, content }) => (
    content.monsters.map((monster) => normalTemplate(map, monster))
));
const legacyGeneratedNormalIds = parsedMaps.flatMap(({ content }) => (
    content.monsters.map(
        (monster) => `MON_${monster.raceId}_${slug(monster.displayName)}`
    )
));
const bossTemplates = parsedMaps.map(({ map, content }) => bossTemplate(map, content.boss));
const monsterData = readJson(MONSTER_URL);
monsterData.version = Math.max(Number(monsterData.version || 1), 4);
monsterData.monsterTemplates = mergeById(
    monsterData.monsterTemplates || [],
    [...normalTemplates, ...bossTemplates],
    legacyGeneratedNormalIds
);
writeJson(MONSTER_URL, monsterData);

const spawnData = readJson(SPAWN_URL);
const spawnPools = parsedMaps.map(({ map, content }) => ({
    id: map.spawnPoolId,
    entries: content.monsters.map((monster) => ({
        monsterId: monsterId(monster),
        weight: monster.weight,
        minPlayerRealmOrder: map.realmOrder,
        maxPlayerRealmOrder: null,
        spawnType: 'NORMAL'
    }))
}));
spawnData.version = Math.max(Number(spawnData.version || 1), 2);
spawnData.spawnPools = mergeById(spawnData.spawnPools || [], spawnPools);
writeJson(SPAWN_URL, spawnData);

const bossPoolData = readJson(BOSS_POOL_URL);
const bossPools = parsedMaps.map(({ map, content }) => ({
    id: map.bossPoolId,
    realmCode: map.realmCode,
    entries: [{
        monsterId: `MON_BOSS_${slug(content.boss.displayName)}`,
        weight: 1
    }]
}));
bossPoolData.version = Math.max(Number(bossPoolData.version || 1), 2);
bossPoolData.pools = mergeById(bossPoolData.pools || [], bossPools);
writeJson(BOSS_POOL_URL, bossPoolData);

const mapData = readJson(MAP_URL);
const activeMaps = MAPS.map((map) => {
    const existing = (mapData.maps || []).find((entry) => entry.id === map.mapId);
    if (!existing) throw new Error(`LATE_GAME_MAP_NOT_FOUND:${map.mapId}`);
    const monsterQualityPoolId = QUALITY_POOL_BY_REALM[map.realmCode];
    if (!monsterQualityPoolId) {
        throw new Error(`LATE_GAME_QUALITY_POOL_MAPPING_NOT_FOUND:${map.realmCode}`);
    }
    return {
        ...existing,
        status: 'ACTIVE',
        monsterSpawnPoolId: map.spawnPoolId,
        monsterQualityPoolId,
        activityTypes: ['EXPLORATION', 'GATHERING']
    };
});
mapData.version = Math.max(Number(mapData.version || 1), 3);
mapData.maps = mergeById(mapData.maps || [], activeMaps);
writeJson(MAP_URL, mapData);

console.log(JSON.stringify({
    status: 'GENERATED_ACTIVE',
    normalMonsters: normalTemplates.length,
    bosses: bossTemplates.length,
    spawnPools: spawnPools.length,
    bossPools: bossPools.length,
    mapsActivated: activeMaps.length,
    pendingDecision: null
}, null, 2));
