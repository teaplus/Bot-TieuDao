import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    getMonsterPortraitPolicy,
    resolveMonsterPortrait
} from '../application/discord/UiAssetResolver.js';

function assert(condition, message, details = null) {
    if (!condition) {
        throw new Error(`${message}${details == null ? '' : `: ${JSON.stringify(details)}`}`);
    }
}

function readJson(relativePath) {
    return JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
}

function pngDimensions(filePath) {
    const buffer = fs.readFileSync(filePath);
    assert(buffer.toString('ascii', 1, 4) === 'PNG', 'Asset is not a PNG', filePath);
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const policy = getMonsterPortraitPolicy();
assert(policy, 'monsterPortraitPolicy is missing');
const templates = readJson('../data/monster/monster_template.json').monsterTemplates;
const spawnPools = readJson('../data/maps/monster_spawn_pools.json').spawnPools;
const bossPools = readJson('../data/monster/secret_realm_boss_pools.json').pools;
const templateById = new Map(templates.map((template) => [template.id, template]));
const normalIds = [...new Set(spawnPools.flatMap((pool) => pool.entries.map((entry) => entry.monsterId)))];
const bossIds = [...new Set(bossPools.flatMap((pool) => pool.entries.map((entry) => entry.monsterId)))];

assert(policy.races.length === 14, 'Expected 14 explicit race portraits', policy.races.length);
assert(policy.elementals.length === 7, 'Expected 7 elemental palette portraits', policy.elementals.length);
assert(policy.bosses.length === 15, 'Expected 15 unique Boss portraits', policy.bosses.length);
assert(normalIds.length === 83, 'Normal spawn catalog count changed; review portrait coverage', normalIds.length);
assert(bossIds.length === 15, 'Boss pool catalog count changed; review portrait coverage', bossIds.length);

const definitions = [...policy.races, ...policy.elementals, ...policy.bosses];
assert(new Set(definitions.map((entry) => entry.attachmentName)).size === definitions.length,
    'Monster portrait attachment names must be unique');

for (const definition of definitions) {
    const fullPath = fileURLToPath(new URL(`../assets/ui/${definition.file}`, import.meta.url));
    assert(fs.existsSync(fullPath), 'Monster portrait file is missing', definition.file);
    assert(fs.statSync(fullPath).size <= 10 * 1024 * 1024,
        'Monster portrait exceeds 10 MiB safety limit', definition.file);
    assert(pngDimensions(fullPath).width === policy.width
        && pngDimensions(fullPath).height === policy.height,
    'Monster portrait dimensions do not match policy', definition.file);
}

for (const monsterId of [...normalIds, ...bossIds]) {
    const template = templateById.get(monsterId);
    assert(template, 'Spawned Monster ID has no template', monsterId);
    assert(resolveMonsterPortrait({
        monsterId,
        raceId: template.raceId,
        element: template.element
    }), 'Spawned monster cannot resolve a portrait', monsterId);
}

for (const bossId of bossIds) {
    const template = templateById.get(bossId);
    const asset = resolveMonsterPortrait({
        monsterId: bossId,
        raceId: template.raceId,
        element: template.element
    });
    assert(asset?.file.includes('/bosses/') || asset?.file.includes('\\bosses\\'),
        'Boss did not resolve its unique portrait before race fallback', bossId);
}

assert(resolveMonsterPortrait({ monsterId: 'UNKNOWN', raceId: 'UNKNOWN', element: 'UNKNOWN' }) === null,
    'Unknown monster portrait must resolve to null');

const commandDirectory = fileURLToPath(new URL('../commands/player/', import.meta.url));
for (const command of ['thamhiem.js', 'dungoan.js', 'biccanh.js']) {
    const source = fs.readFileSync(path.join(commandDirectory, command), 'utf8');
    assert(source.includes('createMonsterPortraitAttachment')
        && source.includes('thumbnailUrl:'),
    'Battle command has not integrated monster portraits', command);
}

console.log(JSON.stringify({
    status: 'PASS',
    checks: {
        racePortraits: policy.races.length,
        elementalPalettes: policy.elementals.length,
        bossPortraits: policy.bosses.length,
        coveredNormalMonsters: normalIds.length,
        coveredBosses: bossIds.length,
        dimensions: `${policy.width}x${policy.height}`,
        battleCommands: 3,
        fallbackSafe: true
    }
}, null, 2));
