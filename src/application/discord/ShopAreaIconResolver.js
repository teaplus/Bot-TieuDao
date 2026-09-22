import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AttachmentBuilder } from 'discord.js';
import { getShopAreaIconPolicy } from './UiAssetResolver.js';

const ROOT = fileURLToPath(new URL('../../assets/ui/', import.meta.url));
const POLICY = getShopAreaIconPolicy();
const AREAS = new Map((POLICY?.areas || []).map((entry) => [entry.id, Object.freeze({ ...entry })]));

function normalize(value) {
    return String(value || '').trim().toUpperCase();
}

function applyPattern(pattern, areaId) {
    return String(pattern || '').replaceAll('{area}', areaId.toLowerCase());
}

function safePath(relativePath) {
    const fullPath = path.resolve(ROOT, relativePath);
    return fullPath.startsWith(`${path.resolve(ROOT)}${path.sep}`) ? fullPath : null;
}

function loadMapping() {
    if (!POLICY?.mappingFile) return Object.freeze({});
    try {
        const mappingPath = safePath(POLICY.mappingFile);
        const parsed = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
        return Object.freeze({ ...(parsed.emojis || {}) });
    } catch {
        return Object.freeze({});
    }
}

const APPLICATION_EMOJIS = loadMapping();

function applicationEmoji(areaId) {
    const mapped = APPLICATION_EMOJIS[areaId];
    if (!mapped || !/^\d{17,20}$/.test(String(mapped.id || ''))
        || !/^[a-z0-9_]{2,32}$/i.test(String(mapped.name || ''))) return null;
    return Object.freeze({ id: String(mapped.id), name: String(mapped.name), animated: false });
}

export function resolveShopAreaDefinition(value) {
    return AREAS.get(normalize(value)) || null;
}

export function resolveShopAreaEmoji(value) {
    const areaId = normalize(value);
    const definition = AREAS.get(areaId);
    if (!definition) return '🏪';
    const custom = applicationEmoji(areaId);
    return custom ? `<:${custom.name}:${custom.id}>` : definition.fallback;
}

export function resolveShopAreaComponentEmoji(value) {
    const areaId = normalize(value);
    return applicationEmoji(areaId) || AREAS.get(areaId)?.fallback || '🏪';
}

export function createShopAreaIconAttachment(value) {
    const areaId = normalize(value);
    if (!AREAS.has(areaId) || !POLICY?.sourcePattern) return null;
    const fullPath = safePath(applyPattern(POLICY.sourcePattern, areaId));
    if (!fullPath || !fs.existsSync(fullPath)) return null;
    const attachmentName = `shop-${areaId.toLowerCase()}.png`;
    return Object.freeze({
        imageUrl: `attachment://${attachmentName}`,
        file: new AttachmentBuilder(fullPath, {
            name: attachmentName,
            description: AREAS.get(areaId).displayName
        })
    });
}

export function getShopAreaIconMapping() {
    return Object.freeze({ policy: POLICY, applicationEmojis: APPLICATION_EMOJIS });
}
