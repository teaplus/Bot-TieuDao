import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AttachmentBuilder } from 'discord.js';

const ASSET_DIRECTORY = fileURLToPath(new URL('../../assets/ui/', import.meta.url));
const MANIFEST_PATH = path.join(ASSET_DIRECTORY, 'ui_assets.json');

function loadManifest() {
    try {
        const parsed = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
        return Object.freeze({
            assets: new Map((parsed.assets || []).map((asset) => [asset.id, Object.freeze({ ...asset })])),
            equipmentIconPolicy: parsed.equipmentIconPolicy || null,
            equipmentTemplateIconPolicy: parsed.equipmentTemplateIconPolicy || null,
            applicationEmojiPolicy: parsed.applicationEmojiPolicy || null,
            battleSemanticIconPolicy: parsed.battleSemanticIconPolicy || null,
            itemResourceIconPolicy: parsed.itemResourceIconPolicy || null,
            shopAreaIconPolicy: parsed.shopAreaIconPolicy || null,
            mapArtPolicy: parsed.mapArtPolicy || null,
            monsterPortraitPolicy: parsed.monsterPortraitPolicy || null,
            sectEmblemPolicy: parsed.sectEmblemPolicy || null
        });
    } catch {
        return Object.freeze({
            assets: new Map(), equipmentIconPolicy: null, equipmentTemplateIconPolicy: null,
            applicationEmojiPolicy: null, battleSemanticIconPolicy: null,
            itemResourceIconPolicy: null,
            shopAreaIconPolicy: null,
            mapArtPolicy: null, monsterPortraitPolicy: null,
            sectEmblemPolicy: null
        });
    }
}

const MANIFEST = loadManifest();

function resolveSafePath(relativePath) {
    const fullPath = path.resolve(ASSET_DIRECTORY, String(relativePath || ''));
    const root = `${path.resolve(ASSET_DIRECTORY)}${path.sep}`;
    return fullPath.startsWith(root) ? fullPath : null;
}

export function resolveUiAsset(assetId) {
    const definition = MANIFEST.assets.get(assetId);
    if (!definition) return null;

    const fullPath = resolveSafePath(definition.file);
    if (!fullPath || !fs.existsSync(fullPath)) return null;

    return Object.freeze({
        ...definition,
        fullPath,
        imageUrl: `attachment://${definition.attachmentName}`
    });
}

export function createUiAssetAttachment(assetId) {
    const asset = resolveUiAsset(assetId);
    if (!asset) return null;

    return Object.freeze({
        asset,
        file: new AttachmentBuilder(asset.fullPath, {
            name: asset.attachmentName,
            description: asset.id
        })
    });
}

export function listUiAssets() {
    return Object.freeze([...MANIFEST.assets.keys()]);
}

function normalizePolicyId(value) {
    return String(value || '').trim().toUpperCase();
}

function applyPattern(pattern, values) {
    return Object.entries(values).reduce(
        (resolved, [key, value]) => resolved.replaceAll(`{${key}}`, String(value).toLowerCase()),
        String(pattern || '')
    );
}

export function resolveEquipmentIcon({ equipmentType, grade, quality }) {
    const policy = MANIFEST.equipmentIconPolicy;
    if (!policy) return null;

    const typeId = normalizePolicyId(equipmentType);
    const gradeId = normalizePolicyId(grade);
    const qualityId = normalizePolicyId(quality) === 'MEDIUM'
        ? 'MIDDLE'
        : normalizePolicyId(quality);
    const type = policy.types?.find((entry) => entry.id === typeId);
    const gradeDefinition = policy.grades?.find((entry) => entry.id === gradeId);
    const qualityDefinition = policy.qualities?.find((entry) => entry.id === qualityId);
    if (!type || !gradeDefinition || !qualityDefinition) return null;

    const file = applyPattern(policy.filePattern, {
        type: typeId, grade: gradeId, quality: qualityId
    });
    const attachmentName = applyPattern(policy.attachmentPattern, {
        type: typeId, grade: gradeId, quality: qualityId
    });
    const fullPath = resolveSafePath(file);
    if (!fullPath || !fs.existsSync(fullPath)) return null;

    return Object.freeze({
        id: `EQUIPMENT_${typeId}_${gradeId}_${qualityId}`,
        type: 'EQUIPMENT_ICON',
        equipmentType: typeId,
        grade: gradeDefinition,
        quality: qualityDefinition,
        file,
        fullPath,
        attachmentName,
        imageUrl: `attachment://${attachmentName}`
    });
}

export function createEquipmentIconAttachment(options) {
    const asset = resolveEquipmentIcon(options);
    if (!asset) return null;
    return Object.freeze({
        asset,
        file: new AttachmentBuilder(asset.fullPath, {
            name: asset.attachmentName,
            description: `${asset.equipmentType} · ${asset.grade.displayName} · ${asset.quality.displayName}`
        })
    });
}

export function getEquipmentIconPolicy() {
    return MANIFEST.equipmentIconPolicy;
}

function equipmentTemplateIds(policy) {
    return (policy?.sheets || []).flatMap((sheet) => Object.values(sheet.templates || {}));
}

export function resolveEquipmentTemplateIcon({ itemId, grade, quality }) {
    const policy = MANIFEST.equipmentTemplateIconPolicy;
    const framePolicy = MANIFEST.equipmentIconPolicy;
    if (!policy || !framePolicy) return null;

    const normalizedItemId = normalizePolicyId(itemId);
    const gradeId = normalizePolicyId(grade);
    const normalizedQuality = normalizePolicyId(quality);
    const qualityId = normalizedQuality === "MEDIUM" ? "MIDDLE" : normalizedQuality;
    if (!equipmentTemplateIds(policy).includes(normalizedItemId)) return null;

    const gradeDefinition = framePolicy.grades?.find((entry) => entry.id === gradeId);
    const qualityDefinition = framePolicy.qualities?.find((entry) => entry.id === qualityId);
    if (!gradeDefinition || !qualityDefinition) return null;

    const values = { template: normalizedItemId, grade: gradeId, quality: qualityId };
    const file = applyPattern(policy.filePattern, values);
    const attachmentName = applyPattern(policy.attachmentPattern, values);
    const fullPath = resolveSafePath(file);
    if (!fullPath || !fs.existsSync(fullPath)) return null;

    return Object.freeze({
        id: `EQUIPMENT_TEMPLATE_${normalizedItemId}_${gradeId}_${qualityId}`,
        type: "EQUIPMENT_TEMPLATE_ICON",
        itemId: normalizedItemId,
        grade: gradeDefinition,
        quality: qualityDefinition,
        file,
        fullPath,
        attachmentName,
        imageUrl: `attachment://${attachmentName}`
    });
}

export function createEquipmentTemplateIconAttachment(options) {
    const asset = resolveEquipmentTemplateIcon(options);
    if (!asset) return null;
    return Object.freeze({
        asset,
        file: new AttachmentBuilder(asset.fullPath, {
            name: asset.attachmentName,
            description: `${asset.itemId} · ${asset.grade.displayName} · ${asset.quality.displayName}`
        })
    });
}

export function getEquipmentTemplateIconPolicy() {
    return MANIFEST.equipmentTemplateIconPolicy;
}

export function getApplicationEmojiPolicy() {
    return MANIFEST.applicationEmojiPolicy;
}

export function getBattleSemanticIconPolicy() {
    return MANIFEST.battleSemanticIconPolicy;
}

export function getItemResourceIconPolicy() {
    return MANIFEST.itemResourceIconPolicy;
}

export function getShopAreaIconPolicy() {
    return MANIFEST.shopAreaIconPolicy;
}

export function resolveMapArt(mapId) {
    const normalizedMapId = normalizePolicyId(mapId);
    const definition = MANIFEST.mapArtPolicy?.maps?.find((entry) => entry.id === normalizedMapId);
    if (!definition) return null;

    const fullPath = resolveSafePath(definition.file);
    if (!fullPath || !fs.existsSync(fullPath)) return null;
    return Object.freeze({
        ...definition,
        type: 'MAP_ART',
        fullPath,
        imageUrl: `attachment://${definition.attachmentName}`
    });
}

export function createMapArtAttachment(mapId) {
    const asset = resolveMapArt(mapId);
    if (!asset) return null;
    return Object.freeze({
        asset,
        file: new AttachmentBuilder(asset.fullPath, {
            name: asset.attachmentName,
            description: asset.id
        })
    });
}

export function getMapArtPolicy() {
    return MANIFEST.mapArtPolicy;
}

export function resolveMonsterPortrait({ monsterId, raceId, element } = {}) {
    const policy = MANIFEST.monsterPortraitPolicy;
    if (!policy) return null;

    const normalizedMonsterId = normalizePolicyId(monsterId);
    const normalizedRaceId = normalizePolicyId(raceId);
    const normalizedElement = normalizePolicyId(element);
    const definition = policy.bosses?.find((entry) => entry.id === normalizedMonsterId)
        || policy.overrides?.find((entry) => entry.id === normalizedMonsterId)
        || policy.races?.find((entry) => entry.id === normalizedRaceId)
        || (!normalizedRaceId
            ? policy.elementals?.find((entry) => entry.id === normalizedElement)
            : null);
    if (!definition) return null;

    const fullPath = resolveSafePath(definition.file);
    if (!fullPath || !fs.existsSync(fullPath)) return null;
    return Object.freeze({
        ...definition,
        type: 'MONSTER_PORTRAIT',
        monsterId: normalizedMonsterId || null,
        raceId: normalizedRaceId || null,
        element: normalizedElement || null,
        fullPath,
        imageUrl: `attachment://${definition.attachmentName}`
    });
}

export function createMonsterPortraitAttachment(options) {
    const asset = resolveMonsterPortrait(options);
    if (!asset) return null;
    return Object.freeze({
        asset,
        file: new AttachmentBuilder(asset.fullPath, {
            name: asset.attachmentName,
            description: asset.monsterId || asset.raceId || asset.element || 'MONSTER'
        })
    });
}

export function getMonsterPortraitPolicy() {
    return MANIFEST.monsterPortraitPolicy;
}

export function resolveSectEmblem(sectId) {
    const normalizedSectId = normalizePolicyId(sectId);
    const definition = MANIFEST.sectEmblemPolicy?.sects?.find(
        (entry) => entry.id === normalizedSectId
    );
    if (!definition) return null;

    const fullPath = resolveSafePath(definition.file);
    if (!fullPath || !fs.existsSync(fullPath)) return null;
    return Object.freeze({
        ...definition,
        type: 'SECT_EMBLEM',
        fullPath,
        imageUrl: `attachment://${definition.attachmentName}`
    });
}

export function createSectEmblemAttachment(sectId) {
    const asset = resolveSectEmblem(sectId);
    if (!asset) return null;
    return Object.freeze({
        asset,
        file: new AttachmentBuilder(asset.fullPath, {
            name: asset.attachmentName,
            description: asset.id
        })
    });
}

export function getSectEmblemPolicy() {
    return MANIFEST.sectEmblemPolicy;
}
