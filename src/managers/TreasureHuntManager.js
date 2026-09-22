import fs from 'fs';
import pool from '../database/postgres.js';
import ItemFactory from './ItemFactory.js';
import ItemGenerator from './ItemGenerator.js';

const config = JSON.parse(fs.readFileSync('./src/data/treasureHunt.json', 'utf-8'));

export default class TreasureHuntManager {
    static async hunt(playerId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const playerResult = await client.query(
                'SELECT realm_id, last_treasure_hunt FROM players WHERE id = $1 FOR UPDATE',
                [playerId]
            );
            const player = playerResult.rows[0];
            if (!player) throw new Error('PLAYER_NOT_FOUND');

            const elapsed = player.last_treasure_hunt
                ? Math.floor((Date.now() - new Date(player.last_treasure_hunt).getTime()) / 1000)
                : config.cooldown_seconds;
            if (elapsed < config.cooldown_seconds) {
                const error = new Error('COOLDOWN');
                error.remainingSeconds = config.cooldown_seconds - elapsed;
                throw error;
            }

            const rewardType = this.pickWeighted(config.rewards).type;
            const reward = rewardType === 'SPIRIT_STONES'
                ? await this.rewardSpiritStones(client, playerId, player.realm_id)
                : await this.rewardItem(client, playerId, player.realm_id, rewardType);

            await client.query('UPDATE players SET last_treasure_hunt = CURRENT_TIMESTAMP WHERE id = $1', [playerId]);
            await client.query('COMMIT');
            return reward;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async rewardSpiritStones(client, playerId, realmId) {
        const range = config.spirit_stones;
        const base = ItemGenerator.randomInteger(range.min, range.max);
        const amount = Math.floor(base * (1 + (realmId - 1) * range.realm_scale));
        await client.query('UPDATE players SET spirit_stones = spirit_stones + $1 WHERE id = $2', [amount, playerId]);
        return { type: 'SPIRIT_STONES', amount };
    }

    static async rewardItem(client, playerId, realmId, rewardType) {
        const listKey = {
            EQUIPMENT: 'equipment',
            CULTIVATION_ART: 'cultivation_arts',
            SKILL_BOOK: 'skill_books'
        }[rewardType];
        const itemId = config[listKey][ItemGenerator.randomInteger(0, config[listKey].length - 1)];
        const template = ItemFactory.getTemplate(itemId);

        if (rewardType === 'EQUIPMENT') {
            const rarityOptions = config.rarities.filter((entry) => realmId >= entry.min_realm_id);
            const rarity = this.pickWeighted(rarityOptions).id;
            const generated = ItemGenerator.rollEquipment(template, rarity);
            const result = await client.query(
                `INSERT INTO player_items (player_id, item_id, rarity, instance_data)
                 VALUES ($1, $2, $3, $4::jsonb) RETURNING id`,
                [playerId, itemId, rarity, JSON.stringify({ affixes: generated.affixes })]
            );
            return { type: rewardType, item: ItemFactory.createItem(itemId, { id: result.rows[0].id, ...generated }) };
        }

        const existing = await client.query(
            `SELECT id FROM player_items
             WHERE player_id = $1 AND item_id = $2 AND equipped_slot IS NULL
             ORDER BY id LIMIT 1 FOR UPDATE`,
            [playerId, itemId]
        );
        let inventoryId;
        if (existing.rowCount) {
            inventoryId = existing.rows[0].id;
            await client.query('UPDATE player_items SET quantity = quantity + 1 WHERE id = $1', [inventoryId]);
        } else {
            const inserted = await client.query(
                `INSERT INTO player_items (player_id, item_id, rarity) VALUES ($1, $2, $3) RETURNING id`,
                [playerId, itemId, template.rarity]
            );
            inventoryId = inserted.rows[0].id;
        }
        return { type: rewardType, item: ItemFactory.createItem(itemId, { id: inventoryId, quantity: 1 }) };
    }

    static pickWeighted(entries) {
        return entries[ItemGenerator.weightedIndex(entries)];
    }
}
