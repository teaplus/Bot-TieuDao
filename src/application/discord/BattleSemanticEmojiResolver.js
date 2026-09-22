import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getBattleSemanticIconPolicy } from './UiAssetResolver.js';

const EFFECT_ALIASES = Object.freeze({
    HEALING: 'HEAL',
    ADD_SHIELD: 'SHIELD',
    REMOVE_DEBUFF: 'PURIFY',
    DISPEL: 'PURIFY',
    CRIT: 'CRITICAL'
});

const PRIORITY = Object.freeze([
    'CHAIN_DAMAGE', 'HEAL_BLOCK', 'FREEZE', 'STUN', 'SILENCE', 'SLOW', 'BURN',
    'PURIFY', 'HEAL', 'SHIELD', 'DAMAGE'
]);

function normalize(value) {
    return String(value || '').trim().toUpperCase();
}

function loadMapping(policy) {
    if (!policy?.mappingFile) return Object.freeze({});
    try {
        const root = fileURLToPath(new URL('../../assets/ui/', import.meta.url));
        const fullPath = path.resolve(root, policy.mappingFile);
        if (!fullPath.startsWith(`${path.resolve(root)}${path.sep}`)) return Object.freeze({});
        const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        return Object.freeze({ ...(parsed.emojis || {}) });
    } catch {
        return Object.freeze({});
    }
}

const POLICY = getBattleSemanticIconPolicy();
const SEMANTICS = new Map((POLICY?.semantics || []).map((entry) => [entry.id, entry]));
const APPLICATION_EMOJIS = loadMapping(POLICY);

function knownSemantic(value) {
    const normalized = normalize(value);
    const aliased = EFFECT_ALIASES[normalized] || normalized;
    return SEMANTICS.has(aliased) ? aliased : null;
}

function actionSemantic(action) {
    return knownSemantic(action?.effectId)
        || knownSemantic(action?.arguments?.effectId)
        || knownSemantic(action?.type);
}

export function resolveBattleSemanticId(value) {
    if (typeof value === 'string') return knownSemantic(value);
    if (!value || typeof value !== 'object') return null;
    if (value.critical) return 'CRITICAL';

    const direct = knownSemantic(value.semanticId)
        || knownSemantic(value.effectId)
        || knownSemantic(value.actionType)
        || knownSemantic(value.type);
    if (direct) return direct;

    const actions = value.actions || value.skill?.actions || [];
    const found = new Set(actions.map(actionSemantic).filter(Boolean));
    return PRIORITY.find((semanticId) => found.has(semanticId)) || null;
}

function applicationEmoji(semanticId) {
    const definition = APPLICATION_EMOJIS[semanticId];
    if (!definition || !/^\d{17,20}$/.test(String(definition.id || ''))) return null;
    if (!/^[a-z0-9_]{2,32}$/i.test(String(definition.name || ''))) return null;
    return Object.freeze({
        id: String(definition.id),
        name: String(definition.name),
        animated: false
    });
}

export function resolveBattleSemanticEmoji(value, fallback = '✨') {
    const semanticId = resolveBattleSemanticId(value);
    if (!semanticId) return fallback;
    const custom = applicationEmoji(semanticId);
    return custom
        ? `<:${custom.name}:${custom.id}>`
        : SEMANTICS.get(semanticId)?.fallback || fallback;
}

export function resolveBattleSemanticComponentEmoji(value, fallback = '✨') {
    const semanticId = resolveBattleSemanticId(value);
    return applicationEmoji(semanticId)
        || SEMANTICS.get(semanticId)?.fallback
        || fallback;
}

export function getBattleSemanticEmojiPolicy() {
    return Object.freeze({
        policy: POLICY,
        applicationEmojis: APPLICATION_EMOJIS
    });
}
