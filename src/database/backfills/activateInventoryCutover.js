import pool from '../postgres.js';
import PostgresUnitOfWork from '../../platform/database/PostgresUnitOfWork.js';
import { bootstrapGameData } from '../../foundation/game-data/bootstrapGameData.js';
import PersistenceCutoverRepository from '../../repositories/PersistenceCutoverRepository.js';
import {
    calculateInventoryClassificationRevision,
    classifyInventoryTemplates
} from './backfillInventorySplit.js';

const MAINTENANCE_LOCK_ID = 724196301;

function requireMaintenanceMode(environment) {
    if (environment.INVENTORY_MAINTENANCE_MODE !== 'true') {
        throw new Error('INVENTORY_MAINTENANCE_MODE_REQUIRED');
    }
}

function canonicalJson(value) {
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value ?? null);
}

function assertEqual(actual, expected, errorCode) {
    if (String(actual ?? '') !== String(expected ?? '')) throw new Error(errorCode);
}

async function assertStackMatches(client, row) {
    const target = await client.query(
        `SELECT player_id, item_id, quantity, rarity, instance_data
         FROM inventory_stacks
         WHERE legacy_item_id = $1`,
        [row.id]
    );
    if (!target.rowCount) throw new Error(`INVENTORY_CUTOVER_MISSING_STACK:${row.id}`);
    const current = target.rows[0];
    assertEqual(current.player_id, row.player_id, `INVENTORY_CUTOVER_STACK_PLAYER_MISMATCH:${row.id}`);
    assertEqual(current.item_id, row.item_id, `INVENTORY_CUTOVER_STACK_ITEM_MISMATCH:${row.id}`);
    assertEqual(current.quantity, row.quantity, `INVENTORY_CUTOVER_STACK_QUANTITY_MISMATCH:${row.id}`);
    assertEqual(current.rarity, row.rarity, `INVENTORY_CUTOVER_STACK_RARITY_MISMATCH:${row.id}`);
    if (canonicalJson(current.instance_data || {}) !== canonicalJson(row.instance_data || {})) {
        throw new Error(`INVENTORY_CUTOVER_STACK_DATA_MISMATCH:${row.id}`);
    }
}

async function assertEquipmentMatches(client, row) {
    const target = await client.query(
        `SELECT player_id, template_id, rarity, instance_data, equipped_slot
         FROM equipment_instances
         WHERE legacy_item_id = $1`,
        [row.id]
    );
    if (!target.rowCount) throw new Error(`INVENTORY_CUTOVER_MISSING_EQUIPMENT:${row.id}`);
    const current = target.rows[0];
    assertEqual(current.player_id, row.player_id, `INVENTORY_CUTOVER_EQUIPMENT_PLAYER_MISMATCH:${row.id}`);
    assertEqual(current.template_id, row.item_id, `INVENTORY_CUTOVER_EQUIPMENT_ITEM_MISMATCH:${row.id}`);
    assertEqual(current.rarity, row.rarity, `INVENTORY_CUTOVER_EQUIPMENT_RARITY_MISMATCH:${row.id}`);
    assertEqual(current.equipped_slot, row.equipped_slot, `INVENTORY_CUTOVER_EQUIPMENT_SLOT_MISMATCH:${row.id}`);
    if (canonicalJson(current.instance_data || {}) !== canonicalJson(row.instance_data || {})) {
        throw new Error(`INVENTORY_CUTOVER_EQUIPMENT_DATA_MISMATCH:${row.id}`);
    }
}

export async function activateInventoryCutover(options = {}) {
    requireMaintenanceMode(options.environment || process.env);
    const gameDataManager = options.gameDataManager || bootstrapGameData();
    const classifications = classifyInventoryTemplates(gameDataManager);
    const sourceRevision = calculateInventoryClassificationRevision(classifications);
    const cutoverRepository = options.cutoverRepository || new PersistenceCutoverRepository();
    const unitOfWork = options.unitOfWork || new PostgresUnitOfWork(options.pool || pool);

    return unitOfWork.execute(async (client) => {
        await client.query('SELECT pg_advisory_xact_lock($1)', [MAINTENANCE_LOCK_ID]);
        await client.query('LOCK TABLE player_items IN SHARE ROW EXCLUSIVE MODE');
        await client.query('LOCK TABLE inventory_stacks IN SHARE ROW EXCLUSIVE MODE');
        await client.query('LOCK TABLE equipment_instances IN SHARE ROW EXCLUSIVE MODE');

        const cutover = await cutoverRepository.get(client, 'INVENTORY', { forUpdate: true });
        if (cutover?.status !== 'BACKFILLED') throw new Error('INVENTORY_CUTOVER_NOT_BACKFILLED');
        if (cutover.source_revision !== sourceRevision) throw new Error('INVENTORY_CUTOVER_SOURCE_REVISION_MISMATCH');

        const source = await client.query(
            `SELECT id, player_id, item_id, quantity, rarity, instance_data, equipped_slot
             FROM player_items
             ORDER BY id`
        );
        for (const row of source.rows) {
            const kind = classifications.get(row.item_id);
            if (!kind) throw new Error(`UNKNOWN_ITEM_TEMPLATE:${row.item_id}:legacy=${row.id}`);
            if (kind === 'EQUIPMENT') await assertEquipmentMatches(client, row);
            else await assertStackMatches(client, row);
        }

        const counts = await client.query(
            `SELECT
                (SELECT count(*) FROM player_items) AS legacy_count,
                (SELECT count(*) FROM inventory_stacks WHERE legacy_item_id IS NOT NULL) AS stack_count,
                (SELECT count(*) FROM equipment_instances WHERE legacy_item_id IS NOT NULL) AS equipment_count`
        );
        const reconciliation = counts.rows[0];
        if (BigInt(reconciliation.legacy_count) !== BigInt(reconciliation.stack_count) + BigInt(reconciliation.equipment_count)) {
            throw new Error('INVENTORY_CUTOVER_RECONCILIATION_FAILED');
        }

        await cutoverRepository.markActive(client, {
            domain: 'INVENTORY',
            sourceRevision,
            details: {
                legacyCount: String(reconciliation.legacy_count),
                stackCount: String(reconciliation.stack_count),
                equipmentCount: String(reconciliation.equipment_count),
                runtimeRouter: 'PlayerInventoryRepository'
            }
        });
        return {
            status: 'ACTIVE',
            sourceRevision,
            verifiedRows: source.rowCount
        };
    });
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`).href) {
    activateInventoryCutover()
        .then((result) => console.log(JSON.stringify(result, null, 2)))
        .catch((error) => {
            console.error(JSON.stringify({ status: 'FAIL', message: error.message }, null, 2));
            process.exitCode = 1;
        })
        .finally(() => pool.end());
}
