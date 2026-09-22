import fs from 'fs';
import {
    DASHBOARD_TABS,
    renderDashboardPayload
} from '../commands/player/nhanvat.js';
import {
    listUiAssets,
    resolveUiAsset
} from '../application/discord/UiAssetResolver.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const expected = ['CHARACTER_OVERVIEW', 'CULTIVATION', 'JOURNEY'];
assert([...listUiAssets()].sort().join(',') === [...expected].sort().join(','), 'UI asset manifest differs from MVP pack');

for (const assetId of expected) {
    const asset = resolveUiAsset(assetId);
    assert(asset, 'UI asset cannot be resolved', assetId);
    assert(fs.statSync(asset.fullPath).size > 0, 'UI asset is empty', assetId);
    assert(asset.imageUrl === `attachment://${asset.attachmentName}`, 'Attachment URL is invalid', asset);
}

const player = {
    name: 'Audit', realmInfo: { name: 'Luyện Khí', req_cul: 100, success_rate: 100 },
    realmStage: 1, spiritualRoot: 'Hỏa', spiritRootQualityInfo: null,
    cultivationArt: { name: 'Xích Viêm Quyết', rarityInfo: { name: 'Hoàng' } },
    rebirthCount: 0, spiritStones: 0, cultivation: 0, cultivationSpeed: 60,
    effects: [], equipments: [], getFinalStat: () => 10,
    getCultivationProgress: () => 0, isAtMaxStage: () => false
};
const state = {
    player, attributeBonuses: [], spiritRootEffects: [], skills: [], inventoryItems: [],
    cultivationPreview: {
        persistedCultivation: 0, projectedCultivation: 0, earned: 0, seconds: 0,
        gainPerMinute: 60, fullEfficiencyGain: 0, overflowEffectiveGain: 0
    },
    location: {
        current: { displayName: 'Thanh Vân Sơn Mạch', description: 'Audit', navigationOrder: 1, activityTypes: [] },
        currentRealmName: 'Luyện Khí', lower: null, higher: null
    }
};
const interaction = { user: { displayAvatarURL: () => 'https://example.invalid/avatar.png' } };
const tabAsset = {
    [DASHBOARD_TABS.OVERVIEW]: 'CHARACTER_OVERVIEW',
    [DASHBOARD_TABS.CULTIVATION]: 'CULTIVATION',
    [DASHBOARD_TABS.JOURNEY]: 'JOURNEY'
};

for (const [tab, assetId] of Object.entries(tabAsset)) {
    const payload = renderDashboardPayload({ state, interaction, sessionId: 'audit', activeTab: tab });
    assert(payload.files.length === 1, 'Visual dashboard tab must attach exactly one image', tab);
    assert(payload.attachments.length === 0, 'Old dashboard attachments must be removed on tab switch', tab);
    assert(payload.embeds[0].toJSON().image?.url === resolveUiAsset(assetId).imageUrl,
        'Dashboard tab references the wrong image', { tab, assetId });
}

const equipmentPayload = renderDashboardPayload({
    state, interaction, sessionId: 'audit', activeTab: DASHBOARD_TABS.EQUIPMENT
});
assert(equipmentPayload.files.length === 0, 'Tab without an MVP asset must retain the text-only fallback');

console.log(JSON.stringify({
    status: 'PASS',
    assets: expected,
    integration: ['overview', 'cultivation', 'journey'],
    fallback: 'TEXT_ONLY'
}, null, 2));
