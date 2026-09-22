import fs from 'fs';
import pool from '../database/postgres.js';
import ItemFactory from './ItemFactory.js';

const arts = JSON.parse(fs.readFileSync('./src/data/cultivationArts.json', 'utf-8'));

async function consumeOne(client, inventoryId) {
    await client.query(
        `DELETE FROM player_items WHERE id = $1 AND quantity = 1`,
        [inventoryId]
    );
    await client.query(
        `UPDATE player_items SET quantity = quantity - 1 WHERE id = $1 AND quantity > 1`,
        [inventoryId]
    );
}

export default class CultivationArtManager {
    static async learn(playerId, inventoryId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const result = await client.query(
                `SELECT id, item_id FROM player_items
                 WHERE id = $1 AND player_id = $2 FOR UPDATE`,
                [inventoryId, playerId]
            );
            const row = result.rows[0];
            if (!row) throw new Error('ITEM_NOT_FOUND');
            const template = ItemFactory.getTemplate(row.item_id);
            if (template?.type !== 'CULTIVATION_ART') throw new Error('NOT_ART');

            const inserted = await client.query(
                `INSERT INTO player_cultivation_arts (player_id, art_id)
                 VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING art_id`,
                [playerId, template.artId]
            );
            if (!inserted.rowCount) throw new Error('ALREADY_LEARNED');

            await consumeOne(client, inventoryId);
            await client.query('UPDATE players SET cultivation_art_id = $1 WHERE id = $2', [template.artId, playerId]);
            await client.query('COMMIT');
            return arts[template.artId];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async equip(playerId, artId) {
        const result = await pool.query(
            `UPDATE players SET cultivation_art_id = $1
             WHERE id = $2 AND EXISTS (
                 SELECT 1 FROM player_cultivation_arts WHERE player_id = $2 AND art_id = $1
             ) RETURNING cultivation_art_id`,
            [artId, playerId]
        );
        if (!result.rowCount) throw new Error('ART_NOT_LEARNED');
        return arts[artId];
    }

    static async list(playerId) {
        const result = await pool.query(
            `SELECT a.art_id, p.cultivation_art_id = a.art_id AS active
             FROM player_cultivation_arts a JOIN players p ON p.id = a.player_id
             WHERE a.player_id = $1 ORDER BY a.learned_at`,
            [playerId]
        );
        return result.rows.map((row) => ({ ...arts[row.art_id], active: row.active })).filter((art) => art.id);
    }
}
