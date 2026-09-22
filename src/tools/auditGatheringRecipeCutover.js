import fs from 'fs';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';

function assert(condition, message, details = null) {
    if (!condition) {
        throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
    }
}

const gameDataManager = bootstrapGameData();
const recipe = gameDataManager.getRecord('craftTemplates', 'CRAFT_BREAKTHROUGH_PILL');
const legacyItem = gameDataManager.getRecord('itemTemplates', 'SPIRIT_HERB');
const replacementItem = gameDataManager.getRecord('itemTemplates', 'HERB_TU_LINH_THAO');

assert(recipe, 'Breakthrough Pill recipe is missing');
assert(JSON.stringify(recipe.materials) === JSON.stringify([
    { itemId: 'HERB_TU_LINH_THAO', quantity: 4 },
    { itemId: 'HERB_THANH_TAM_THAO', quantity: 1 }
]), 'Breakthrough Pill must use the approved explicit Gathering materials', recipe.materials);
assert(legacyItem?.status === 'DEPRECATED'
    && legacyItem.replacedByItemId === 'HERB_TU_LINH_THAO',
'Legacy SPIRIT_HERB deprecation metadata is incomplete', legacyItem);
assert(replacementItem?.name === 'Tụ Linh Thảo',
    'Replacement Gathering item is missing', replacementItem);

const migrationSql = fs.readFileSync(
    new URL('../database/migrations/026_gathering_resource_recipe_cutover.sql', import.meta.url),
    'utf8'
);
assert(migrationSql.includes("mode.status = 'ACTIVE'")
    && migrationSql.includes("mode.status <> 'ACTIVE'"),
'Migration must select exactly one authoritative inventory representation');
assert(migrationSql.includes("UPDATE player_items")
    && migrationSql.includes("UPDATE inventory_stacks"),
'Migration must keep legacy and split inventory representations consistent');
assert(migrationSql.includes("'SPIRIT_HERB'")
    && migrationSql.includes("'HERB_TU_LINH_THAO'"),
'Migration must explicitly convert the approved source and replacement Item IDs');
assert(migrationSql.includes('CONTENT_RESOURCE_MIGRATION')
    && migrationSql.includes('resource_ledger')
    && migrationSql.includes('WHERE NOT EXISTS'),
'Migration must write replay-guarded Resource Ledger entries');
assert(migrationSql.includes('snapshot.replacement_quantity + snapshot.legacy_quantity'),
    'Replacement ledger balance must preserve pre-existing and converted quantities');

console.log(JSON.stringify({
    status: 'PASS',
    checks: [
        'explicit-breakthrough-pill-materials',
        'legacy-item-deprecation',
        'authoritative-inventory-selection',
        'legacy-and-split-storage-conversion',
        'resource-ledger-replay-guard',
        'quantity-preservation'
    ]
}, null, 2));
