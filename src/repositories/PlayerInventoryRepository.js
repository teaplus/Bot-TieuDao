import PersistenceCutoverRepository from './PersistenceCutoverRepository.js';
import { normalizeIntegerAmount } from '../shared/numeric/IntegerAmount.js';

const ACTIVE_STATUS = 'ACTIVE';

function activeRuntimeId(kind, id) {
    return `${kind === 'EQUIPMENT' ? 'E' : 'S'}:${id}`;
}

function parseActiveRuntimeId(runtimeId, expectedKind) {
    const match = String(runtimeId).match(/^([SE]):(\d+)$/);
    if (!match) throw new Error('INVALID_ACTIVE_INVENTORY_ID');
    const kind = match[1] === 'E' ? 'EQUIPMENT' : 'STACK';
    if (expectedKind && kind !== expectedKind) throw new Error('INVENTORY_KIND_MISMATCH');
    return { kind, id: match[2] };
}

export default class PlayerInventoryRepository {
    constructor(options = {}) {
        this.cutoverRepository = options.cutoverRepository || new PersistenceCutoverRepository();
    }

    async getMode(database) {
        const cutover = await this.cutoverRepository.get(database, 'INVENTORY');
        return cutover?.status === ACTIVE_STATUS ? ACTIVE_STATUS : 'LEGACY';
    }

    async listEntries(database, playerId) {
        const mode = await this.getMode(database);
        if (mode === ACTIVE_STATUS) {
            const result = await database.query(
                `SELECT runtime_id AS id, item_id, quantity, rarity, instance_data, equipped_slot
                 FROM (
                    SELECT
                        'S:' || id::text AS runtime_id,
                        item_id,
                        quantity,
                        rarity,
                        instance_data,
                        NULL::varchar AS equipped_slot,
                        id AS storage_id
                    FROM inventory_stacks
                    WHERE player_id = $1
                    UNION ALL
                    SELECT
                        'E:' || id::text AS runtime_id,
                        template_id AS item_id,
                        1::bigint AS quantity,
                        rarity,
                        instance_data,
                        equipped_slot,
                        id AS storage_id
                    FROM equipment_instances
                    WHERE player_id = $1
                 ) entries
                 ORDER BY runtime_id`,
                [playerId]
            );
            return result.rows;
        }

        const result = await database.query(
            `SELECT id, item_id, quantity, rarity, instance_data, equipped_slot
             FROM player_items
             WHERE player_id = $1
             ORDER BY id`,
            [playerId]
        );
        return result.rows;
    }

    async listCapacityRowsForUpdate(client, playerId) {
        const mode = await this.getMode(client);
        if (mode === ACTIVE_STATUS) {
            const stacks = await client.query(
                `SELECT item_id, NULL::varchar AS equipped_slot
                 FROM inventory_stacks
                 WHERE player_id = $1
                 FOR UPDATE`,
                [playerId]
            );
            const equipments = await client.query(
                `SELECT template_id AS item_id, equipped_slot
                 FROM equipment_instances
                 WHERE player_id = $1
                 FOR UPDATE`,
                [playerId]
            );
            return [...stacks.rows, ...equipments.rows];
        }

        const result = await client.query(
            `SELECT item_id, equipped_slot
             FROM player_items
             WHERE player_id = $1
             FOR UPDATE`,
            [playerId]
        );
        return result.rows;
    }

    async findOwnedEntryForUpdate(client, playerId, runtimeId, expectedKind) {
        const mode = await this.getMode(client);
        if (mode === ACTIVE_STATUS) {
            const parsed = parseActiveRuntimeId(runtimeId, expectedKind);
            const table = parsed.kind === 'EQUIPMENT' ? 'equipment_instances' : 'inventory_stacks';
            const itemColumn = parsed.kind === 'EQUIPMENT' ? 'template_id' : 'item_id';
            const result = await client.query(
                `SELECT id, ${itemColumn} AS item_id,
                        ${parsed.kind === 'EQUIPMENT' ? '1::bigint' : 'quantity'} AS quantity,
                        ${parsed.kind === 'EQUIPMENT' ? 'equipped_slot' : 'NULL::varchar AS equipped_slot'}
                 FROM ${table}
                 WHERE id = $1 AND player_id = $2
                 FOR UPDATE`,
                [parsed.id, playerId]
            );
            return result.rows[0] || null;
        }

        const result = await client.query(
            `SELECT id, item_id, quantity, equipped_slot
             FROM player_items
             WHERE id = $1 AND player_id = $2
             FOR UPDATE`,
            [runtimeId, playerId]
        );
        return result.rows[0] || null;
    }

    async listStacksForItemForUpdate(client, playerId, itemId) {
        const mode = await this.getMode(client);
        if (mode === ACTIVE_STATUS) {
            const result = await client.query(
                `SELECT id, item_id, quantity
                 FROM inventory_stacks
                 WHERE player_id = $1 AND item_id = $2
                 ORDER BY id
                 FOR UPDATE`,
                [playerId, itemId]
            );
            return result.rows.map((row) => ({ ...row, runtimeId: activeRuntimeId('STACK', row.id) }));
        }

        const result = await client.query(
            `SELECT id, item_id, quantity
             FROM player_items
             WHERE player_id = $1
               AND item_id = $2
               AND equipped_slot IS NULL
             ORDER BY id
             FOR UPDATE`,
            [playerId, itemId]
        );
        return result.rows.map((row) => ({ ...row, runtimeId: String(row.id) }));
    }

    async findStackForUpdate(client, playerId, itemId) {
        const rows = await this.listStacksForItemForUpdate(client, playerId, itemId);
        return rows[0] || null;
    }

    async getStackQuantity(database, playerId, itemId) {
        const mode = await this.getMode(database);
        const result = mode === ACTIVE_STATUS
            ? await database.query(
                `SELECT COALESCE(SUM(quantity), 0) AS quantity
                 FROM inventory_stacks
                 WHERE player_id = $1 AND item_id = $2`,
                [playerId, itemId]
            )
            : await database.query(
                `SELECT COALESCE(SUM(quantity), 0) AS quantity
                 FROM player_items
                 WHERE player_id = $1
                   AND item_id = $2
                   AND equipped_slot IS NULL`,
                [playerId, itemId]
            );
        return normalizeIntegerAmount(result.rows[0]?.quantity || 0);
    }

    async getEquipmentCount(database, playerId, itemId) {
        const mode = await this.getMode(database);
        const result = mode === ACTIVE_STATUS
            ? await database.query(
                `SELECT COUNT(*) AS quantity
                 FROM equipment_instances
                 WHERE player_id = $1 AND template_id = $2`,
                [playerId, itemId]
            )
            : await database.query(
                `SELECT COUNT(*) AS quantity
                 FROM player_items
                 WHERE player_id = $1 AND item_id = $2`,
                [playerId, itemId]
            );
        return normalizeIntegerAmount(result.rows[0]?.quantity || 0);
    }

    async addStackableItem(client, payload) {
        const existing = await this.findStackForUpdate(client, payload.playerId, payload.itemId);
        if (existing) {
            await this.incrementStack(client, existing.runtimeId, payload.quantity || 1);
            return existing.runtimeId;
        }
        return this.insertStack(client, payload);
    }

    async consumeItemAcrossStacks(client, payload) {
        const required = BigInt(payload.quantity || 1);
        if (required <= 0n) throw new Error('INVALID_ITEM_QUANTITY');
        const rows = await this.listStacksForItemForUpdate(client, payload.playerId, payload.itemId);
        const owned = rows.reduce((total, row) => total + BigInt(row.quantity), 0n);
        if (owned < required) throw new Error(payload.errorCode || 'INSUFFICIENT_ITEM_QUANTITY');

        let remaining = required;
        const consumed = [];
        for (const row of rows) {
            if (remaining === 0n) break;
            const rowQuantity = BigInt(row.quantity);
            const quantity = rowQuantity < remaining ? rowQuantity : remaining;
            await this.consumeStackQuantity(client, row.runtimeId, quantity);
            consumed.push({
                itemId: payload.itemId,
                inventoryId: row.runtimeId,
                quantity: quantity.toString()
            });
            remaining -= quantity;
        }
        return consumed;
    }

    async insertStack(client, payload) {
        const mode = await this.getMode(client);
        const result = mode === ACTIVE_STATUS
            ? await client.query(
                `INSERT INTO inventory_stacks (player_id, item_id, quantity, rarity, instance_data)
                 VALUES ($1, $2, $3, $4, $5::jsonb)
                 RETURNING id`,
                [payload.playerId, payload.itemId, payload.quantity || 1, payload.rarity || null, JSON.stringify(payload.instanceData || {})]
            )
            : await client.query(
                `INSERT INTO player_items (player_id, item_id, quantity, rarity, instance_data)
                 VALUES ($1, $2, $3, $4, $5::jsonb)
                 RETURNING id`,
                [payload.playerId, payload.itemId, payload.quantity || 1, payload.rarity || null, JSON.stringify(payload.instanceData || {})]
            );
        const id = result.rows[0].id;
        return mode === ACTIVE_STATUS ? activeRuntimeId('STACK', id) : String(id);
    }

    async insertEquipment(client, payload) {
        const mode = await this.getMode(client);
        const result = mode === ACTIVE_STATUS
            ? await client.query(
                `INSERT INTO equipment_instances (player_id, template_id, rarity, instance_data, equipped_slot)
                 VALUES ($1, $2, $3, $4::jsonb, $5)
                 RETURNING id`,
                [payload.playerId, payload.itemId, payload.rarity || null, JSON.stringify(payload.instanceData || {}), payload.equippedSlot || null]
            )
            : await client.query(
                `INSERT INTO player_items (player_id, item_id, quantity, rarity, instance_data, equipped_slot)
                 VALUES ($1, $2, 1, $3, $4::jsonb, $5)
                 RETURNING id`,
                [payload.playerId, payload.itemId, payload.rarity || null, JSON.stringify(payload.instanceData || {}), payload.equippedSlot || null]
            );
        const id = result.rows[0].id;
        return mode === ACTIVE_STATUS ? activeRuntimeId('EQUIPMENT', id) : String(id);
    }

    async incrementStack(client, runtimeId, quantity) {
        const mode = await this.getMode(client);
        if (mode === ACTIVE_STATUS) {
            const parsed = parseActiveRuntimeId(runtimeId, 'STACK');
            await client.query(
                `UPDATE inventory_stacks SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
                [quantity, parsed.id]
            );
            return;
        }
        await client.query(`UPDATE player_items SET quantity = quantity + $1 WHERE id = $2`, [quantity, runtimeId]);
    }

    async consumeStackQuantity(client, runtimeId, quantity) {
        const mode = await this.getMode(client);
        const parsed = mode === ACTIVE_STATUS ? parseActiveRuntimeId(runtimeId, 'STACK') : { id: runtimeId };
        const table = mode === ACTIVE_STATUS ? 'inventory_stacks' : 'player_items';
        const current = await client.query(`SELECT quantity FROM ${table} WHERE id = $1 FOR UPDATE`, [parsed.id]);
        if (!current.rowCount) throw new Error('ITEM_NOT_FOUND');
        const owned = BigInt(current.rows[0].quantity);
        const consumed = BigInt(quantity);
        if (owned < consumed) throw new Error('INSUFFICIENT_ITEM_QUANTITY');
        if (owned === consumed) {
            await client.query(`DELETE FROM ${table} WHERE id = $1`, [parsed.id]);
        } else {
            await client.query(
                `UPDATE ${table} SET quantity = quantity - $1${mode === ACTIVE_STATUS ? ', updated_at = CURRENT_TIMESTAMP' : ''} WHERE id = $2`,
                [String(consumed), parsed.id]
            );
        }
    }

    async equip(client, playerId, runtimeId, slot) {
        const mode = await this.getMode(client);
        if (mode === ACTIVE_STATUS) {
            const parsed = parseActiveRuntimeId(runtimeId, 'EQUIPMENT');
            await client.query(
                `UPDATE equipment_instances SET equipped_slot = NULL, updated_at = CURRENT_TIMESTAMP
                 WHERE player_id = $1 AND equipped_slot = $2`,
                [playerId, slot]
            );
            const result = await client.query(
                `UPDATE equipment_instances SET equipped_slot = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2 AND player_id = $3 RETURNING id`,
                [slot, parsed.id, playerId]
            );
            if (!result.rowCount) throw new Error('ITEM_NOT_FOUND');
            return;
        }
        await client.query(`UPDATE player_items SET equipped_slot = NULL WHERE player_id = $1 AND equipped_slot = $2`, [playerId, slot]);
        const result = await client.query(
            `UPDATE player_items SET equipped_slot = $1 WHERE id = $2 AND player_id = $3 RETURNING id`,
            [slot, runtimeId, playerId]
        );
        if (!result.rowCount) throw new Error('ITEM_NOT_FOUND');
    }

    async unequip(client, playerId, slot) {
        const mode = await this.getMode(client);
        const result = mode === ACTIVE_STATUS
            ? await client.query(
                `UPDATE equipment_instances SET equipped_slot = NULL, updated_at = CURRENT_TIMESTAMP
                 WHERE player_id = $1 AND equipped_slot = $2 RETURNING id, template_id AS item_id`,
                [playerId, slot]
            )
            : await client.query(
                `UPDATE player_items SET equipped_slot = NULL
                 WHERE player_id = $1 AND equipped_slot = $2 RETURNING id, item_id`,
                [playerId, slot]
            );
        if (!result.rowCount) throw new Error('SLOT_EMPTY');
        return {
            inventoryId: mode === ACTIVE_STATUS
                ? activeRuntimeId('EQUIPMENT', result.rows[0].id)
                : String(result.rows[0].id),
            itemId: result.rows[0].item_id
        };
    }
}
