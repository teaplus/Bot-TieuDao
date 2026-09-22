import pool from '../database/postgres.js';
import ItemFactory from '../factories/ItemFactory.js';

// LEGACY: use gameplay/player/EquipmentService.js for new command flows.
export default class EquipmentManager {
    static async equip(playerId, inventoryId) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');
            const result = await client.query(
                `SELECT id, item_id, equipped_slot
                 FROM player_items
                 WHERE id = $1 AND player_id = $2
                 FOR UPDATE`,
                [inventoryId, playerId]
            );
            const row = result.rows[0];
            if (!row) throw new Error('ITEM_NOT_FOUND');

            const template = ItemFactory.getTemplate(row.item_id);
            if (!template || template.type !== 'EQUIPMENT') throw new Error('NOT_EQUIPMENT');

            await client.query(
                `UPDATE player_items
                 SET equipped_slot = NULL
                 WHERE player_id = $1 AND equipped_slot = $2`,
                [playerId, template.slot]
            );
            await client.query(
                `UPDATE player_items SET equipped_slot = $1 WHERE id = $2`,
                [template.slot, inventoryId]
            );
            await client.query('COMMIT');

            return { name: template.name, slot: template.slot };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async unequip(playerId, slot) {
        const result = await pool.query(
            `UPDATE player_items
             SET equipped_slot = NULL
             WHERE player_id = $1 AND equipped_slot = $2
             RETURNING item_id`,
            [playerId, slot]
        );

        if (!result.rowCount) throw new Error('SLOT_EMPTY');
        return ItemFactory.getTemplate(result.rows[0].item_id);
    }
}
