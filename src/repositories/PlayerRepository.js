import pool from '../database/postgres.js';
import ItemFactory from '../managers/ItemFactory.js';
import SkillFactory from '../managers/SkillFactory.js';

export default class PlayerRepository {
    static async findById(playerId) {
        const playerResult = await pool.query('SELECT * FROM players WHERE id = $1', [playerId]);
        if (!playerResult.rows.length) return null;

        const itemResult = await pool.query(
            `SELECT id, item_id, quantity, rarity, instance_data, equipped_slot
             FROM player_items WHERE player_id = $1 ORDER BY id`,
            [playerId]
        );
        const inventory = itemResult.rows
            .map((row) => ItemFactory.createItem(row.item_id, row))
            .filter(Boolean);

        const skillResult = await pool.query(
            'SELECT skill_id FROM player_skills WHERE player_id = $1 ORDER BY learned_at',
            [playerId]
        );
        const skills = skillResult.rows.map((row) => SkillFactory.create(row.skill_id)).filter(Boolean);

        return {
            data: {
                ...playerResult.rows[0],
                equipments: inventory.filter((item) => item.type === 'EQUIPMENT'),
                passive_skills: skills.filter((skill) => skill.type === 'PASSIVE')
            },
            inventory,
            skills
        };
    }
}
