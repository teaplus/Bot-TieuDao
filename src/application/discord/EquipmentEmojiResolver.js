const EQUIPMENT_TYPE_EMOJI = Object.freeze({
    WEAPON: '🗡️',
    ARMOR: '🛡️',
    NECKLACE: '📿',
    RING: '💍'
});

const EQUIPMENT_TEMPLATE_EMOJI = Object.freeze({
    EQ_WOOD_WEAPON: '🪄',
    EQ_EARTH_WEAPON: '🔨',
    EQ_LIGHTNING_WEAPON: '🔱'
});

function normalize(value) {
    return String(value || '').trim().toUpperCase();
}

function loadApplicationEmojiMapping() {
    const policy = getApplicationEmojiPolicy();
    if (!policy?.mappingFile) return Object.freeze({});
    try {
        const assetRoot = fileURLToPath(new URL('../../assets/ui/', import.meta.url));
        const fullPath = path.resolve(assetRoot, policy.mappingFile);
        if (!fullPath.startsWith(`${path.resolve(assetRoot)}${path.sep}`)) return Object.freeze({});
        const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        return Object.freeze({ ...(parsed.emojis || {}) });
    } catch {
        return Object.freeze({});
    }
}

const APPLICATION_EMOJIS = loadApplicationEmojiMapping();

function resolveApplicationEmoji(itemId) {
    const definition = APPLICATION_EMOJIS[normalize(itemId)];
    if (!definition || !/^\d{17,20}$/.test(String(definition.id || ''))) return null;
    if (!/^[a-z0-9_]{2,32}$/i.test(String(definition.name || ''))) return null;
    return Object.freeze({ id: String(definition.id), name: String(definition.name), animated: false });
}

export function resolveEquipmentEmoji({ itemId, equipmentType, slot } = {}) {
    const applicationEmoji = resolveApplicationEmoji(itemId);
    if (applicationEmoji) return `<:${applicationEmoji.name}:${applicationEmoji.id}>`;
    return EQUIPMENT_TEMPLATE_EMOJI[normalize(itemId)]
        || EQUIPMENT_TYPE_EMOJI[normalize(equipmentType || slot)]
        || '🎁';
}

export function resolveEquipmentComponentEmoji(options = {}) {
    return resolveApplicationEmoji(options.itemId) || resolveEquipmentEmoji(options);
}

export function getEquipmentTypeEmoji(equipmentType) {
    return EQUIPMENT_TYPE_EMOJI[normalize(equipmentType)] || '🎁';
}

export function getEquipmentEmojiPolicy() {
    return Object.freeze({
        typeFallbacks: EQUIPMENT_TYPE_EMOJI,
        templateOverrides: EQUIPMENT_TEMPLATE_EMOJI,
        applicationEmojis: APPLICATION_EMOJIS
    });
}
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getApplicationEmojiPolicy } from './UiAssetResolver.js';
