import pool from './postgres.js';

export async function initializeDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS players (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                realm_id INT DEFAULT 1,
                spiritual_root VARCHAR(50) DEFAULT 'Tạp Căn',
                cultivation_art_id VARCHAR(50) DEFAULT 'cp_001',
                spirit_stones BIGINT DEFAULT 0,
                cultivation NUMERIC(20,2) DEFAULT 0,
                base_atk INT DEFAULT 10,
                base_def INT DEFAULT 10,
                base_hp INT DEFAULT 100,
                base_spd INT DEFAULT 10,
                last_cultivate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await pool.query(`ALTER TABLE players ALTER COLUMN cultivation TYPE NUMERIC(20,2) USING cultivation::NUMERIC(20,2)`);
        await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS cultivation_art_id VARCHAR(50) DEFAULT 'cp_001'`);
        await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS spirit_stones BIGINT DEFAULT 0`);
        await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS last_treasure_hunt TIMESTAMP`);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS player_items (
                id BIGSERIAL PRIMARY KEY,
                player_id VARCHAR(50) NOT NULL REFERENCES players(id) ON DELETE CASCADE,
                item_id VARCHAR(50) NOT NULL,
                quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
                rarity VARCHAR(30),
                instance_data JSONB NOT NULL DEFAULT '{}'::jsonb,
                equipped_slot VARCHAR(30),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await pool.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS player_equipped_slot_unique
            ON player_items (player_id, equipped_slot)
            WHERE equipped_slot IS NOT NULL
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS player_cultivation_arts (
                player_id VARCHAR(50) NOT NULL REFERENCES players(id) ON DELETE CASCADE,
                art_id VARCHAR(50) NOT NULL,
                learned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (player_id, art_id)
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS player_skills (
                player_id VARCHAR(50) NOT NULL REFERENCES players(id) ON DELETE CASCADE,
                skill_id VARCHAR(50) NOT NULL,
                learned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (player_id, skill_id)
            )
        `);
        await pool.query(`
            INSERT INTO player_cultivation_arts (player_id, art_id)
            SELECT id, COALESCE(cultivation_art_id, 'cp_001') FROM players
            ON CONFLICT DO NOTHING
        `);
        console.log('Đã kiểm tra và khởi tạo database thành công.');
    } catch (error) {
        console.error('Lỗi khởi tạo database:', error);
        throw error;
    }
}
