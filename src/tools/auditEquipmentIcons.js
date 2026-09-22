import fs from 'fs';
import {
    createEquipmentIconAttachment,
    getEquipmentIconPolicy,
    resolveEquipmentIcon
} from '../application/discord/UiAssetResolver.js';
import { renderPanel } from '../commands/player/trangbi.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const equipmentGrades = JSON.parse(fs.readFileSync(
    new URL('../data/equipment/equipment_grades.json', import.meta.url), 'utf8'
)).grades;
const policy = getEquipmentIconPolicy();
const expectedTypes = ['WEAPON', 'ARMOR', 'NECKLACE', 'RING'];
const expectedGrades = equipmentGrades.map((entry) => entry.grade);
const expectedQualities = ['LOW', 'MIDDLE', 'HIGH'];
assert(policy.types.map((entry) => entry.id).join(',') === expectedTypes.join(','),
    'Equipment icon types differ from GameData');
assert(policy.grades.map((entry) => entry.id).join(',') === expectedGrades.join(','),
    'Equipment icon grades differ from GameData');
assert(policy.qualities.map((entry) => entry.id).join(',') === expectedQualities.join(','),
    'Equipment icon qualities differ from GameData');

let resolvedCount = 0;
for (const equipmentType of expectedTypes) {
    for (const grade of expectedGrades) {
        for (const quality of expectedQualities) {
            const asset = resolveEquipmentIcon({ equipmentType, grade, quality });
            assert(asset, 'Equipment icon cannot be resolved', { equipmentType, grade, quality });
            const header = fs.readFileSync(asset.fullPath).subarray(0, 24);
            assert(header.readUInt32BE(16) === 256 && header.readUInt32BE(20) === 256,
                'Equipment icon must be 256x256', asset.file);
            resolvedCount++;
        }
    }
}
assert(resolvedCount === 84, 'Equipment icon matrix is incomplete', resolvedCount);
assert(resolveEquipmentIcon({ equipmentType: 'WEAPON', grade: 'UNKNOWN', quality: 'LOW' }) === null,
    'Unknown grade must use UI fallback');
assert(createEquipmentIconAttachment({
    equipmentType: 'WEAPON', grade: 'THAN', quality: 'HIGH'
})?.asset.id === 'EQUIPMENT_WEAPON_THAN_HIGH', 'Attachment resolver returned the wrong variant');

const equipped = {
    uuid: 'eq-audit', name: 'Audit Kiếm', type: 'EQUIPMENT', equipmentType: 'WEAPON',
    grade: 'THAN', gradeQuality: 'HIGH', isEquipped: true,
    rarityInfo: { name: 'Audit' }, getEffects: () => [], getEffectsDisplay: () => 'Không có'
};
const panel = {
    player: { name: 'Audit', effects: [] },
    equipments: [equipped],
    currentStats: { hp: 100, atk: 20, def: 10, spd: 5 }
};
const types = expectedTypes.map((id) => ({ id, name: id }));
const payload = renderPanel({
    interaction: { user: { displayAvatarURL: () => 'https://example.invalid/avatar.png' } },
    panel, preview: null, types, sessionId: 'audit'
});
assert(payload.files.length === 1 && payload.attachments.length === 0,
    'Equipment panel must attach exactly one current icon');
assert(payload.embeds[0].toJSON().thumbnail?.url === 'attachment://equipment-weapon-than-high.png',
    'Equipment panel does not display the resolved icon');

console.log(JSON.stringify({
    status: 'PASS',
    types: expectedTypes.length,
    grades: expectedGrades.length,
    qualities: expectedQualities.length,
    variants: resolvedCount,
    panelThumbnail: true,
    fallback: 'USER_AVATAR'
}, null, 2));
