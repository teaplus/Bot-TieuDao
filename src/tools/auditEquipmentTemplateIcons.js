import fs from 'fs';
import {
    getEquipmentTemplateIconPolicy,
    resolveEquipmentTemplateIcon
} from '../application/discord/UiAssetResolver.js';
import { renderPanel } from '../commands/player/trangbi.js';
import {
    resolveEquipmentComponentEmoji,
    resolveEquipmentEmoji
} from '../application/discord/EquipmentEmojiResolver.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const templates = JSON.parse(fs.readFileSync(
    new URL('../data/equipment/equipment_templates.json', import.meta.url), 'utf8'
)).templates;
const grades = JSON.parse(fs.readFileSync(
    new URL('../data/equipment/equipment_grades.json', import.meta.url), 'utf8'
)).grades.map((entry) => entry.grade);
const qualities = ['LOW', 'MIDDLE', 'HIGH'];
const policy = getEquipmentTemplateIconPolicy();
const expectedSize = Number(policy.variantSize);
assert(expectedSize === 32, 'Template equipment runtime icon policy must use 32x32', expectedSize);
const configuredIds = policy.sheets.flatMap((sheet) => Object.values(sheet.templates));
assert(configuredIds.length === 32 && new Set(configuredIds).size === 32,
    'Template icon policy must contain 32 unique item IDs');
assert([...configuredIds].sort().join(',') === templates.map((entry) => entry.id).sort().join(','),
    'Template icon policy differs from equipment GameData');

let variants = 0;
for (const template of templates) {
    for (const grade of grades) {
        for (const quality of qualities) {
            const asset = resolveEquipmentTemplateIcon({ itemId: template.id, grade, quality });
            assert(asset, 'Template equipment icon cannot be resolved', { id: template.id, grade, quality });
            const header = fs.readFileSync(asset.fullPath).subarray(0, 24);
            assert(header.readUInt32BE(16) === expectedSize && header.readUInt32BE(20) === expectedSize,
                `Template equipment icon must be ${expectedSize}x${expectedSize}`, asset.file);
            variants++;
        }
    }
}
assert(variants === 672, 'Template equipment icon matrix is incomplete', variants);
assert(resolveEquipmentTemplateIcon({ itemId: 'UNKNOWN', grade: 'HOANG', quality: 'LOW' }) === null,
    'Unknown item template must fall back to generic slot icon');

const equipment = {
    id: 'EQ_LIGHTNING_WEAPON', uuid: 'audit', name: 'Thiên Lôi Thương',
    type: 'EQUIPMENT', equipmentType: 'WEAPON', grade: 'THAN', gradeQuality: 'HIGH',
    isEquipped: true, rarityInfo: { name: 'Audit' }, getEffects: () => [],
    getEffectsDisplay: () => 'Không có'
};
const payload = renderPanel({
    interaction: { user: { displayAvatarURL: () => 'https://example.invalid/avatar.png' } },
    panel: {
        player: { name: 'Audit', effects: [] }, equipments: [equipment],
        currentStats: { hp: 100, atk: 20, def: 10, spd: 5 }
    },
    preview: null,
    types: ['WEAPON', 'ARMOR', 'NECKLACE', 'RING'].map((id) => ({ id, name: id })),
    sessionId: 'audit'
});
assert(payload.embeds[0].toJSON().thumbnail?.url
    === 'attachment://equipment-eq_lightning_weapon-than-high.png',
'Equipment panel must prefer the exact item-template icon');
const inlineEmoji = resolveEquipmentEmoji({
    itemId: equipment.id,
    equipmentType: equipment.equipmentType
});
const componentEmoji = resolveEquipmentComponentEmoji({
    itemId: equipment.id,
    equipmentType: equipment.equipmentType
});
const optionEmoji = payload.components[0].components[0].toJSON().options[1].emoji;
assert(payload.embeds[0].toJSON().description.includes(inlineEmoji),
    'Equipment panel must place the weapon-form icon before the equipped item name');
assert(typeof componentEmoji === 'string'
    ? optionEmoji?.name === componentEmoji
    : optionEmoji?.id === componentEmoji.id && optionEmoji?.name === componentEmoji.name,
    'Equipment select option must expose the weapon-form icon');

console.log(JSON.stringify({
    status: 'PASS', sheets: policy.sheets.length, templates: templates.length,
    grades: grades.length, qualities: qualities.length, variants, iconSize: `${expectedSize}x${expectedSize}`,
    exactTemplateThumbnail: true, inlineEquipmentEmoji: true, fallback: 'GENERIC_SLOT_ICON'
}, null, 2));
