import fs from 'fs';
import {
    createMapArtAttachment,
    getMapArtPolicy,
    resolveMapArt
} from '../application/discord/UiAssetResolver.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const maps = JSON.parse(fs.readFileSync(
    new URL('../data/maps/maps.json', import.meta.url), 'utf8'
)).maps;
const policy = getMapArtPolicy();
const policyIds = policy.maps.map((entry) => entry.id);

assert(maps.length === 15, 'Canonical map catalog must contain 15 maps');
assert(policyIds.length === 15 && new Set(policyIds).size === 15,
    'Map art policy must contain 15 unique map IDs');
assert([...policyIds].sort().join(',') === maps.map((entry) => entry.id).sort().join(','),
    'Map art policy differs from canonical maps GameData');
assert(new Set(policy.maps.map((entry) => entry.attachmentName)).size === 15,
    'Map art attachment names must be unique');

let totalBytes = 0;
for (const map of maps) {
    const asset = resolveMapArt(map.id);
    assert(asset, 'Map art cannot be resolved', map.id);
    const stat = fs.statSync(asset.fullPath);
    totalBytes += stat.size;
    assert(stat.size <= 10 * 1024 * 1024, 'Map art exceeds Discord attachment safety limit', map.id);
    const header = fs.readFileSync(asset.fullPath).subarray(0, 24);
    assert(header.readUInt32BE(16) === policy.width && header.readUInt32BE(20) === policy.height,
        'Map art dimensions differ from policy', map.id);
    const attachment = createMapArtAttachment(map.id);
    assert(attachment?.asset.imageUrl === `attachment://${asset.attachmentName}`,
        'Map art attachment URL is invalid', map.id);
}
assert(resolveMapArt('UNKNOWN_MAP') === null && createMapArtAttachment('UNKNOWN_MAP') === null,
    'Unknown map art must use a null presentation fallback');

const integrations = [
    '../commands/player/chuyenmap.js',
    '../commands/player/nhanvat.js',
    '../commands/player/thamhiem.js',
    '../commands/player/dungoan.js',
    '../commands/player/biccanh.js',
    '../commands/player/thuthap.js'
];
for (const relativePath of integrations) {
    const source = fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8');
    assert(source.includes('createMapArtAttachment'),
        'Map-aware Discord presenter is missing map art integration', relativePath);
}

console.log(JSON.stringify({
    status: 'PASS', maps: maps.length,
    dimensions: `${policy.width}x${policy.height}`,
    totalBytes, integrations: integrations.length,
    fallback: 'NULL_PRESENTATION_ASSET'
}, null, 2));
