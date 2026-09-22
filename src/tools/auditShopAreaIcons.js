import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getShopAreaIconPolicy } from '../application/discord/UiAssetResolver.js';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import { renderShopPanel } from '../commands/player/shop.js';
import {
    createShopAreaIconAttachment,
    resolveShopAreaComponentEmoji,
    resolveShopAreaDefinition,
    resolveShopAreaEmoji
} from '../application/discord/ShopAreaIconResolver.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `:${JSON.stringify(details)}` : ''}`);
}

function dimensions(filePath) {
    const header = fs.readFileSync(filePath).subarray(0, 26);
    assert(header.toString('ascii', 1, 4) === 'PNG', 'SHOP_AREA_ASSET_NOT_PNG', filePath);
    return {
        width: header.readUInt32BE(16),
        height: header.readUInt32BE(20),
        colorType: header[25]
    };
}

function applyPattern(pattern, areaId) {
    return String(pattern).replaceAll('{area}', areaId.toLowerCase());
}

const root = fileURLToPath(new URL('../assets/ui/', import.meta.url));
const gameDataManager = bootstrapGameData();
setGameDataManager(gameDataManager);
const policy = getShopAreaIconPolicy();
assert(policy, 'SHOP_AREA_ICON_POLICY_MISSING');
assert(policy.areas.length === 4, 'SHOP_AREA_ICON_COUNT_INVALID');
assert(new Set(policy.areas.map((entry) => entry.id)).size === 4, 'SHOP_AREA_ICON_ID_DUPLICATED');

for (const area of policy.areas) {
    const master = path.join(root, applyPattern(policy.masterPattern, area.id));
    const source = path.join(root, applyPattern(policy.sourcePattern, area.id));
    assert(fs.existsSync(master), 'SHOP_AREA_MASTER_MISSING', area.id);
    assert(fs.existsSync(source), 'SHOP_AREA_EMOJI_SOURCE_MISSING', area.id);
    const masterSize = dimensions(master);
    const sourceSize = dimensions(source);
    assert(masterSize.width === policy.masterSize && masterSize.height === policy.masterSize,
        'SHOP_AREA_MASTER_SIZE_INVALID', { area: area.id, masterSize });
    assert(masterSize.colorType === 6, 'SHOP_AREA_MASTER_ALPHA_MISSING', area.id);
    assert(sourceSize.width === policy.sourceSize && sourceSize.height === policy.sourceSize,
        'SHOP_AREA_SOURCE_SIZE_INVALID', { area: area.id, sourceSize });
    assert(fs.statSync(source).size <= 256 * 1024, 'SHOP_AREA_SOURCE_TOO_LARGE', area.id);
    assert(resolveShopAreaDefinition(area.id)?.displayName === area.displayName,
        'SHOP_AREA_DEFINITION_RESOLUTION_INVALID', area.id);
    assert(resolveShopAreaEmoji(area.id), 'SHOP_AREA_INLINE_EMOJI_EMPTY', area.id);
    assert(resolveShopAreaComponentEmoji(area.id), 'SHOP_AREA_COMPONENT_EMOJI_EMPTY', area.id);
    assert(createShopAreaIconAttachment(area.id)?.imageUrl,
        'SHOP_AREA_ATTACHMENT_RESOLUTION_INVALID', area.id);
}

const shopCommand = fs.readFileSync(new URL('../commands/player/shop.js', import.meta.url), 'utf8');
assert(shopCommand.includes('createShopAreaIconAttachment')
    && shopCommand.includes('resolveShopAreaComponentEmoji')
    && shopCommand.includes('.setThumbnail(areaAsset.imageUrl)'),
'SHOP_AREA_COMMAND_INTEGRATION_MISSING');
assert(!shopCommand.includes('**Giới hạn:**'), 'SHOP_UI_STILL_DISPLAYS_PURCHASE_LIMIT');

const rendered = renderShopPanel({
    interaction: null,
    client: { gameDataManager },
    view: {
        shopName: 'Phường Thị · Thanh Vân Sơn Mạch', mapName: 'Thanh Vân Sơn Mạch',
        balance: '12345', entries: [{
            id: 'BREAKTHROUGH_PILL', itemId: 'BREAKTHROUGH_PILL',
            itemName: 'Phá Chướng Đan', productKind: 'ITEM', product: {
                kind: 'ITEM', templateId: 'BREAKTHROUGH_PILL', quantity: 1, snapshot: null
            },
            itemDescription: 'Đan dược kiểm thử.', price: '200', quantity: 1,
            currencyId: 'SPIRIT_STONE', available: true, unavailableReason: null,
            stockRemaining: null, purchaseLimit: null
        }]
    },
    areas: policy.areas.map((entry) => entry.id), area: 'MAP',
    selectedId: 'BREAKTHROUGH_PILL', sessionId: 'audit', notice: null
});
const embedJson = rendered.embeds[0].toJSON();
const areaSelectJson = rendered.components[0].toJSON().components[0];
assert(rendered.files.length === 1 && embedJson.thumbnail?.url === 'attachment://shop-map.png',
    'SHOP_AREA_THUMBNAIL_PAYLOAD_INVALID');
assert(areaSelectJson.options.every((option) => option.emoji),
    'SHOP_AREA_SELECT_EMOJI_MISSING');
assert(embedJson.description.includes('12.345') && embedJson.footer?.text.includes('Không giới hạn'),
    'SHOP_AREA_PRESENTATION_SUMMARY_INVALID');

const mapping = JSON.parse(fs.readFileSync(path.join(root, policy.mappingFile), 'utf8'));
assert(mapping.applicationId || Object.keys(mapping.emojis || {}).length === 0,
    'SHOP_AREA_EMOJI_MAPPING_PARTIAL');

console.log(JSON.stringify({
    status: 'PASS',
    areas: policy.areas.map((entry) => entry.id),
    masterSize: `${policy.masterSize}x${policy.masterSize}`,
    sourceSize: `${policy.sourceSize}x${policy.sourceSize}`,
    mappingState: mapping.applicationId ? 'SYNCED' : 'READY_TO_SYNC',
    thumbnailIntegration: true,
    componentIntegration: true,
    purchaseLimitPresentationRemoved: true
}, null, 2));
