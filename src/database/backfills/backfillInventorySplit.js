import crypto from 'node:crypto';
import pool from '../postgres.js';
import PostgresUnitOfWork from '../../platform/database/PostgresUnitOfWork.js';
import { bootstrapGameData } from '../../foundation/game-data/bootstrapGameData.js';
import PersistenceCutoverRepository from '../../repositories/PersistenceCutoverRepository.js';

const MAINTENANCE_LOCK_ID = 724196301;

function requireMaintenanceMode(environment) {
    if (environment.INVENTORY_MAINTENANCE_MODE !== 'true') {
        throw new Error('INVENTORY_MAINTENANCE_MODE_REQUIRED');
    }
}

export function classifyInventoryTemplates(gameDataManager) {
    const templates = gameDataManager.getCollection('itemTemplates') || {};
    return new Map(Object.entries(templates).map(([itemId, template]) => [
        itemId,
        template.type === 'EQUIPMENT' ? 'EQUIPMENT' : 'STACK'
    ]));
}

export function calculateInventoryClassificationRevision(classifications) {
    const canonical = [...classifications.entries()]
        .sort(([left], [right]) => left.localeCompare(right));
    return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

async function assertNoOppositeClassification(client, row, kind) {
    const oppositeTable = kind === 'EQUIPMENT' ? 'inventory_stacks' : 'equipment_instances';
    const existing = await client.query(
        `SELECT 1 FROM ${oppositeTable} WHERE legacy_item_id = $1`,
        [row.id]
    );
    if (existing.rowCount) {
        throw new Error(`LEGACY_ITEM_CLASSIFICATION_CONFLICT:${row.id}`);
    }
}

async function backfillEquipment(client, row) {
    if (String(row.quantity) !== '1') {
        throw new Error(`EQUIPMENT_QUANTITY_MUST_BE_ONE:${row.id}`);
    }

    await client.query(
        `INSERT INTO equipment_instances (
            player_id,
            template_id,
            rarity,
            instance_data,
            equipped_slot,
            legacy_item_id,
            created_at
         )
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
         ON CONFLICT (legacy_item_id)
         DO UPDATE SET player_id = EXCLUDED.player_id,
                       template_id = EXCLUDED.template_id,
                       rarity = EXCLUDED.rarity,
                       instance_data = EXCLUDED.instance_data,
                       equipped_slot = EXCLUDED.equipped_slot,
                       updated_at = CURRENT_TIMESTAMP`,
        [
            row.player_id,
            row.item_id,
            row.rarity,
            JSON.stringify(row.instance_data || {}),
            row.equipped_slot,
            row.id,
            row.created_at
        ]
    );
}

async function backfillStack(client, row) {
    await client.query(
        `INSERT INTO inventory_stacks (
            player_id,
            item_id,
            quantity,
            rarity,
            instance_data,
            legacy_item_id,
            created_at
         )
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
         ON CONFLICT (legacy_item_id)
         DO UPDATE SET player_id = EXCLUDED.player_id,
                       item_id = EXCLUDED.item_id,
                       quantity = EXCLUDED.quantity,
                       rarity = EXCLUDED.rarity,
                       instance_data = EXCLUDED.instance_data,
                       updated_at = CURRENT_TIMESTAMP`,
        [
            row.player_id,
            row.item_id,
            String(row.quantity),
            row.rarity,
            JSON.stringify(row.instance_data || {}),
            row.id,
            row.created_at
        ]
    );
}

export async function backfillInventorySplit(options = {}) {
    const environment = options.environment || process.env;
    requireMaintenanceMode(environment);
    const gameDataManager = options.gameDataManager || bootstrapGameData();
    const classifications = classifyInventoryTemplates(gameDataManager);
    const sourceRevision = calculateInventoryClassificationRevision(classifications);
    const unitOfWork = options.unitOfWork || new PostgresUnitOfWork(options.pool || pool);
    const cutoverRepository = options.cutoverRepository || new PersistenceCutoverRepository();

    return unitOfWork.execute(async (client) => {
        await client.query('SELECT pg_advisory_xact_lock($1)', [MAINTENANCE_LOCK_ID]);
        await client.query('LOCK TABLE player_items IN SHARE ROW EXCLUSIVE MODE');
        const source = await client.query(
            `SELECT id, player_id, item_id, quantity, rarity, instance_data, equipped_slot, created_at
             FROM player_items
             ORDER BY id`
        );

        let equipmentCount = 0;
        let stackCount = 0;
        for (const row of source.rows) {
            const kind = classifications.get(row.item_id);
            if (!kind) {
                throw new Error(`UNKNOWN_ITEM_TEMPLATE:${row.item_id}:legacy=${row.id}`);
            }

            await assertNoOppositeClassification(client, row, kind);
            if (kind === 'EQUIPMENT') {
                await backfillEquipment(client, row);
                equipmentCount += 1;
            } else {
                await backfillStack(client, row);
                stackCount += 1;
            }
        }

        const reconciliation = await client.query(
            `SELECT
                (SELECT count(*) FROM player_items) AS legacy_count,
                (SELECT count(*) FROM inventory_stacks WHERE legacy_item_id IS NOT NULL) AS stack_count,
                (SELECT count(*) FROM equipment_instances WHERE legacy_item_id IS NOT NULL) AS equipment_count`
        );
        const counts = reconciliation.rows[0];
        if (BigInt(counts.legacy_count) !== BigInt(counts.stack_count) + BigInt(counts.equipment_count)) {
            throw new Error('INVENTORY_BACKFILL_RECONCILIATION_FAILED');
        }

        await cutoverRepository.markBackfilled(client, {
            domain: 'INVENTORY',
            sourceRevision,
            details: {
                legacyCount: String(counts.legacy_count),
                stackCount: String(counts.stack_count),
                equipmentCount: String(counts.equipment_count)
            }
        });

        return {
            status: 'BACKFILLED_NOT_CUT_OVER',
            sourceRevision,
            sourceRows: source.rowCount,
            stackCount,
            equipmentCount
        };
    });
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`).href) {
    backfillInventorySplit()
        .then((result) => console.log(JSON.stringify(result, null, 2)))
        .catch((error) => {
            console.error(JSON.stringify({ status: 'FAIL', message: error.message }, null, 2));
            process.exitCode = 1;
        })
        .finally(() => pool.end());
}
