import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getItemResourceIconPolicy } from './UiAssetResolver.js';

const CATEGORY_FALLBACKS = Object.freeze({
    PILL: '💊',
    MATERIAL: '📦',
    TICKET: '🎟️',
    CHEST: '🎁',
    TOKEN: '🪙',
    SCROLL: '📜',
    SPECIAL: '✨'
});

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

const POLICY = getItemResourceIconPolicy();
const SEMANTICS = new Map((POLICY?.semantics || []).map((entry) => [entry.id, entry]));
const APPLICATION_EMOJIS = loadMapping(POLICY);

function knownSemantic(value) {
    const semanticId = normalize(value);
    return SEMANTICS.has(semanticId) ? semanticId : null;
}

function resourceSemantic(resourceFamily, resourceRole) {
    return knownSemantic(`${normalize(resourceFamily)}_${normalize(resourceRole)}`);
}

export function resolveItemResourceSemanticId(value = {}) {
    if (typeof value === 'string') {
        return knownSemantic(value)
            || knownSemantic(POLICY?.itemMappings?.[normalize(value)])
            || knownSemantic(POLICY?.currencyMappings?.[normalize(value)]);
    }
    if (!value || typeof value !== 'object') return null;
    return knownSemantic(value.semanticId)
        || knownSemantic(POLICY?.itemMappings?.[normalize(value.itemId || value.id)])
        || knownSemantic(POLICY?.currencyMappings?.[normalize(value.currencyId)])
        || resourceSemantic(value.resourceFamily, value.resourceRole);
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

export function resolveItemResourceEmoji(value = {}, fallback = null) {
    const semanticId = resolveItemResourceSemanticId(value);
    if (semanticId) {
        const custom = applicationEmoji(semanticId);
        return custom
            ? `<:${custom.name}:${custom.id}>`
            : SEMANTICS.get(semanticId)?.fallback || fallback || '📦';
    }
    const category = typeof value === 'object' ? normalize(value.category || value.itemCategory) : '';
    return fallback || CATEGORY_FALLBACKS[category] || '📦';
}

export function resolveItemResourceComponentEmoji(value = {}, fallback = null) {
    const semanticId = resolveItemResourceSemanticId(value);
    return applicationEmoji(semanticId)
        || SEMANTICS.get(semanticId)?.fallback
        || resolveItemResourceEmoji(value, fallback);
}

export function getItemResourceEmojiPolicy() {
    return Object.freeze({
        policy: POLICY,
        categoryFallbacks: CATEGORY_FALLBACKS,
        applicationEmojis: APPLICATION_EMOJIS
    });
}
