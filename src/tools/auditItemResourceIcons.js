import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getItemResourceIconPolicy } from '../application/discord/UiAssetResolver.js';
import {
    resolveItemResourceComponentEmoji,
    resolveItemResourceEmoji,
    resolveItemResourceSemanticId
} from '../application/discord/ItemResourceEmojiResolver.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

function applyPattern(pattern, semanticId) {
    return String(pattern).replaceAll('{semantic}', semanticId.toLowerCase());
}

function dimensions(filePath) {
    const header = fs.readFileSync(filePath).subarray(0, 24);
    assert(header.toString('ascii', 1, 4) === 'PNG', 'Asset is not PNG', filePath);
    return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
}

const root = fileURLToPath(new URL('../assets/ui/', import.meta.url));
const policy = getItemResourceIconPolicy();
assert(policy, 'itemResourceIconPolicy is missing');
assert(policy.semantics.length === 11, 'Expected 11 item/resource semantic icons');
assert(new Set(policy.semantics.map((entry) => entry.id)).size === policy.semantics.length,
    'Item/resource semantic IDs must be unique');

for (const semantic of policy.semantics) {
    const master = path.join(root, applyPattern(policy.masterPattern, semantic.id));
    const source = path.join(root, applyPattern(policy.sourcePattern, semantic.id));
    assert(fs.existsSync(master), 'Item/resource master is missing', semantic.id);
    assert(fs.existsSync(source), 'Item/resource emoji source is missing', semantic.id);
    assert(dimensions(master).width === policy.masterSize
        && dimensions(master).height === policy.masterSize,
    'Item/resource master dimensions are invalid', semantic.id);
    assert(dimensions(source).width === policy.sourceSize
        && dimensions(source).height === policy.sourceSize,
    'Item/resource source dimensions are invalid', semantic.id);
    assert(fs.statSync(source).size <= 256 * 1024,
        'Item/resource emoji source exceeds 256 KiB', semantic.id);
    assert(resolveItemResourceSemanticId(semantic.id) === semantic.id,
        'Semantic resolver failed', semantic.id);
    assert(resolveItemResourceEmoji({ semanticId: semantic.id }),
        'Inline resolver returned empty value', semantic.id);
    assert(resolveItemResourceComponentEmoji({ semanticId: semantic.id }),
        'Component resolver returned empty value', semantic.id);
}

const resources = JSON.parse(fs.readFileSync(
    new URL('../data/gathering/resource_catalog.json', import.meta.url), 'utf8'
)).resources;
assert(resources.length === 60, 'Expected 60 map gathering resources');
for (const resource of resources) {
    assert(resolveItemResourceSemanticId({
        resourceFamily: resource.family,
        resourceRole: resource.role
    }) === `${resource.family}_${resource.role}`,
    'Gathering resource is not covered by semantic icon policy', resource.id);
}

for (const [itemId, semanticId] of Object.entries(policy.itemMappings || {})) {
    assert(resolveItemResourceSemanticId({ itemId }) === semanticId,
        'Exact item mapping failed', itemId);
}
assert(resolveItemResourceSemanticId({ currencyId: 'SPIRIT_STONE' }) === 'SPIRIT_STONE',
    'Spirit stone currency mapping failed');

const mapping = JSON.parse(fs.readFileSync(path.join(root, policy.mappingFile), 'utf8'));
const mapped = Object.entries(mapping.emojis || {});
if (mapping.applicationId) {
    assert(mapped.length === policy.semantics.length,
        'Synced mapping must contain every item/resource semantic');
} else {
    assert(mapped.length === 0, 'Unsynced mapping must not contain partial IDs');
    assert(!resolveItemResourceEmoji({ itemId: 'BREAKTHROUGH_PILL' }).startsWith('<:'),
        'Unsynced resolver must use Unicode fallback');
}

const inventorySource = fs.readFileSync(
    new URL('../application/discord/InventoryPresentation.js', import.meta.url), 'utf8'
);
const rewardSource = fs.readFileSync(
    new URL('../application/discord/RewardTextFormatter.js', import.meta.url), 'utf8'
);
const professionSource = fs.readFileSync(
    new URL('../commands/player/nghenghiep.js', import.meta.url), 'utf8'
);
assert(inventorySource.includes('resolveItemResourceEmoji')
    && inventorySource.includes('resolveItemResourceComponentEmoji'),
'Inventory UI has not integrated item/resource icon resolver');
assert(rewardSource.includes('resolveItemResourceEmoji'),
    'Reward text has not integrated item/resource icon resolver');
assert(professionSource.includes('resolveItemResourceEmoji')
    && professionSource.includes('resolveItemResourceComponentEmoji'),
'Profession UI has not integrated item/resource icon resolver');

console.log(JSON.stringify({
    status: 'PASS',
    semantics: policy.semantics.length,
    gatheringResourcesCovered: resources.length,
    masterSize: `${policy.masterSize}x${policy.masterSize}`,
    sourceSize: `${policy.sourceSize}x${policy.sourceSize}`,
    mappingState: mapping.applicationId ? 'SYNCED' : 'READY_TO_SYNC',
    integrations: ['inventory', 'reward-text', 'profession']
}, null, 2));
