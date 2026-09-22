import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getBattleSemanticIconPolicy } from '../application/discord/UiAssetResolver.js';
import {
    resolveBattleSemanticComponentEmoji,
    resolveBattleSemanticEmoji,
    resolveBattleSemanticId
} from '../application/discord/BattleSemanticEmojiResolver.js';

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
const policy = getBattleSemanticIconPolicy();
assert(policy, 'battleSemanticIconPolicy is missing');
assert(policy.semantics.length === 12, 'Expected 12 battle semantic icons');
assert(new Set(policy.semantics.map((entry) => entry.id)).size === policy.semantics.length,
    'Battle semantic IDs must be unique');

for (const semantic of policy.semantics) {
    const master = path.join(root, applyPattern(policy.masterPattern, semantic.id));
    const source = path.join(root, applyPattern(policy.sourcePattern, semantic.id));
    assert(fs.existsSync(master), 'Battle semantic master is missing', semantic.id);
    assert(fs.existsSync(source), 'Battle semantic emoji source is missing', semantic.id);
    assert(dimensions(master).width === policy.masterSize
        && dimensions(master).height === policy.masterSize,
    'Battle semantic master dimensions are invalid', semantic.id);
    assert(dimensions(source).width === policy.sourceSize
        && dimensions(source).height === policy.sourceSize,
    'Battle semantic source dimensions are invalid', semantic.id);
    assert(fs.statSync(source).size <= 256 * 1024,
        'Battle semantic emoji source exceeds 256 KiB', semantic.id);
    assert(resolveBattleSemanticId(semantic.id) === semantic.id,
        'Semantic ID resolver failed', semantic.id);
    assert(resolveBattleSemanticEmoji(semantic.id), 'Inline resolver returned empty value', semantic.id);
    assert(resolveBattleSemanticComponentEmoji(semantic.id),
        'Component resolver returned empty value', semantic.id);
}

assert(resolveBattleSemanticId({ actions: [{ type: 'CHAIN_DAMAGE' }] }) === 'CHAIN_DAMAGE',
    'Skill semantic inference must prioritize chain damage');
assert(resolveBattleSemanticId({ actions: [{ type: 'DAMAGE' }, { type: 'APPLY_EFFECT', effectId: 'STUN' }] }) === 'STUN',
    'Skill semantic inference must prioritize control over generic damage');
assert(resolveBattleSemanticId({ actions: [{ type: 'ADD_SHIELD' }] }) === 'SHIELD',
    'Shield action alias did not resolve');
assert(resolveBattleSemanticId('UNKNOWN') === null, 'Unknown semantic must resolve to null');

const mapping = JSON.parse(fs.readFileSync(path.join(root, policy.mappingFile), 'utf8'));
const mapped = Object.entries(mapping.emojis || {});
if (mapping.applicationId) {
    assert(mapped.length === policy.semantics.length,
        'Synced mapping must contain every battle semantic');
} else {
    assert(mapped.length === 0, 'Unsynced mapping must not contain partial IDs');
    assert(!resolveBattleSemanticEmoji('DAMAGE').startsWith('<:'),
        'Unsynced resolver must use Unicode fallback');
}

const battleSource = fs.readFileSync(
    new URL('../application/discord/BattleLogAnimator.js', import.meta.url), 'utf8'
);
const battleEngineSource = fs.readFileSync(
    new URL('../battle/BattleEngine.js', import.meta.url), 'utf8'
);
const loadoutSource = fs.readFileSync(
    new URL('../application/discord/CultivationLoadoutPresentation.js', import.meta.url), 'utf8'
);
assert(battleSource.includes('resolveBattleSemanticEmoji'),
    'Battle log has not integrated semantic emoji resolver');
assert(battleEngineSource.includes('actionTypes: [...new Set(skillActions.map'),
    'Battle summary does not expose canonical Action types for semantic presentation');
assert(loadoutSource.includes('resolveBattleSemanticComponentEmoji')
    && loadoutSource.includes('resolveBattleSemanticEmoji'),
'Cultivation loadout has not integrated semantic emoji resolver');

console.log(JSON.stringify({
    status: 'PASS',
    semantics: policy.semantics.length,
    masterSize: `${policy.masterSize}x${policy.masterSize}`,
    sourceSize: `${policy.sourceSize}x${policy.sourceSize}`,
    mappingState: mapping.applicationId ? 'SYNCED' : 'READY_TO_SYNC',
    integrations: ['battle-summary', 'battle-log', 'congphap']
}, null, 2));
