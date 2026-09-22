import pool from '../database/postgres.js';
import ItemFactory from './ItemFactory.js';
import SkillFactory from './SkillFactory.js';

export default class SkillManager {
    static async learn(playerId, inventoryId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const result = await client.query(
                `SELECT id, item_id, quantity FROM player_items
                 WHERE id = $1 AND player_id = $2 FOR UPDATE`,
                [inventoryId, playerId]
            );
            const row = result.rows[0];
            if (!row) throw new Error('ITEM_NOT_FOUND');
            const template = ItemFactory.getTemplate(row.item_id);
            if (template?.type !== 'SKILL_BOOK') throw new Error('NOT_SKILL_BOOK');

            const inserted = await client.query(
                `INSERT INTO player_skills (player_id, skill_id)
                 VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING skill_id`,
                [playerId, template.skillId]
            );
            if (!inserted.rowCount) throw new Error('ALREADY_LEARNED');

            if (row.quantity > 1) {
                await client.query('UPDATE player_items SET quantity = quantity - 1 WHERE id = $1', [inventoryId]);
            } else {
                await client.query('DELETE FROM player_items WHERE id = $1', [inventoryId]);
            }
            await client.query('COMMIT');
            return SkillFactory.create(template.skillId);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async list(playerId) {
        const result = await pool.query(
            'SELECT skill_id FROM player_skills WHERE player_id = $1 ORDER BY learned_at',
            [playerId]
        );
        return result.rows.map((row) => SkillFactory.create(row.skill_id)).filter(Boolean);
    }
}
