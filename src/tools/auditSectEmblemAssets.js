import fs from 'fs';
import { fileURLToPath } from 'url';
import {
    getSectEmblemPolicy,
    resolveSectEmblem
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

const policy = getSectEmblemPolicy();
assert(policy, 'sectEmblemPolicy is missing');

const sects = readJson('../data/sect/sect_template.json').sects;
const expectedIds = new Set(sects.map((sect) => sect.id));
const configuredIds = new Set(policy.sects.map((sect) => sect.id));

assert(policy.sects.length === sects.length,
    'Each canonical Sect must have exactly one emblem', {
        expected: sects.length,
        actual: policy.sects.length
    });
assert(configuredIds.size === policy.sects.length, 'Sect emblem IDs must be unique');
assert(new Set(policy.sects.map((entry) => entry.attachmentName)).size === policy.sects.length,
    'Sect emblem attachment names must be unique');

for (const sectId of expectedIds) {
    assert(configuredIds.has(sectId), 'Canonical Sect has no emblem mapping', sectId);
}

for (const definition of policy.sects) {
    assert(expectedIds.has(definition.id), 'Emblem maps an unknown Sect', definition.id);
    const fullPath = fileURLToPath(new URL(`../assets/ui/${definition.file}`, import.meta.url));
    assert(fs.existsSync(fullPath), 'Sect emblem file is missing', definition.file);
    assert(fs.statSync(fullPath).size <= 10 * 1024 * 1024,
        'Sect emblem exceeds 10 MiB safety limit', definition.file);
    const dimensions = pngDimensions(fullPath);
    assert(dimensions.width === policy.width && dimensions.height === policy.height,
        'Sect emblem dimensions do not match policy', {
            file: definition.file,
            dimensions
        });
    assert(resolveSectEmblem(definition.id)?.attachmentName === definition.attachmentName,
        'Sect emblem resolver returned an unexpected asset', definition.id);
}

assert(resolveSectEmblem('UNKNOWN_SECT') === null,
    'Unknown Sect emblem must resolve to null');

const presentation = fs.readFileSync(
    new URL('../application/discord/SectPresentation.js', import.meta.url),
    'utf8'
);
assert(presentation.includes('createSectEmblemAttachment')
    && presentation.includes('emblem?.asset.imageUrl')
    && presentation.includes('attachments: []'),
'Sect panel has not integrated emblem attachment replacement');

console.log(JSON.stringify({
    status: 'PASS',
    checks: {
        canonicalSects: sects.length,
        emblemMappings: policy.sects.length,
        dimensions: `${policy.width}x${policy.height}`,
        discordUploadSafe: true,
        fallbackSafe: true
    }
}, null, 2));
