import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    resolveEquipmentComponentEmoji,
    resolveEquipmentEmoji
} from '../application/discord/EquipmentEmojiResolver.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

function applyPattern(pattern, templateId) {
    return String(pattern).replaceAll('{template}', templateId.toLowerCase());
}

const assetRoot = fileURLToPath(new URL('../assets/ui/', import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(assetRoot, 'ui_assets.json'), 'utf8'));
const templatePolicy = manifest.equipmentTemplateIconPolicy;
const emojiPolicy = manifest.applicationEmojiPolicy;
const templateIds = templatePolicy.sheets.flatMap((sheet) => Object.values(sheet.templates));
const mappingPath = path.join(assetRoot, emojiPolicy.mappingFile);
const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

assert(templateIds.length === 32 && new Set(templateIds).size === 32,
    'Application emoji policy must cover 32 unique equipment templates');
assert(Number(emojiPolicy.sourceSize) === 128,
    'Discord application emoji upload source must be 128x128');

for (const templateId of templateIds) {
    const sourcePath = path.join(assetRoot, applyPattern(emojiPolicy.sourcePattern, templateId));
    assert(fs.existsSync(sourcePath), 'Application emoji source is missing', templateId);
    const stat = fs.statSync(sourcePath);
    assert(stat.size <= 256 * 1024, 'Application emoji source exceeds 256 KiB', templateId);
    const header = fs.readFileSync(sourcePath).subarray(0, 24);
    assert(header.readUInt32BE(16) === 128 && header.readUInt32BE(20) === 128,
        'Application emoji source must be 128x128', templateId);
}

const mappedEntries = Object.entries(mapping.emojis || {});
if (mapping.applicationId) {
    assert(/^\d{17,20}$/.test(String(mapping.applicationId)),
        'Synced application ID is not a Discord Snowflake');
    assert(mappedEntries.length === 32, 'Synced emoji mapping must contain all 32 templates');
    for (const templateId of templateIds) {
        const definition = mapping.emojis[templateId];
        const expectedName = applyPattern(emojiPolicy.namePattern, templateId);
        assert(definition?.name === expectedName && /^\d{17,20}$/.test(String(definition?.id || '')),
            'Synced application emoji mapping is invalid', templateId);
        assert(resolveEquipmentEmoji({ itemId: templateId }).includes(`:${definition.name}:${definition.id}>`),
            'Inline resolver did not select the synced application emoji', templateId);
        assert(resolveEquipmentComponentEmoji({ itemId: templateId }).id === definition.id,
            'Component resolver did not select the synced application emoji', templateId);
    }
} else {
    assert(mappedEntries.length === 0, 'Unsynced mapping must not contain partial emoji IDs');
    assert(!resolveEquipmentEmoji({ itemId: templateIds[0] }).startsWith('<:'),
        'Unsynced resolver must use the Unicode fallback');
}

console.log(JSON.stringify({
    status: 'PASS', templates: templateIds.length, sources: templateIds.length,
    sourceSize: '128x128', mappingState: mapping.applicationId ? 'SYNCED' : 'READY_TO_SYNC',
    mapped: mappedEntries.length
}, null, 2));
