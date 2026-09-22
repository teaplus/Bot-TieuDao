CREATE TABLE IF NOT EXISTS players (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    realm_id INT DEFAULT 1,
    spiritual_root VARCHAR(50) DEFAULT 'Tạp Căn',
    cultivation_art_id VARCHAR(50) DEFAULT 'CP_FIRE_HOANG',
    sect_id VARCHAR(80),
    spirit_stones BIGINT DEFAULT 0,
    sect_points BIGINT DEFAULT 0,
    honor_points BIGINT DEFAULT 0,
    event_points BIGINT DEFAULT 0,
    cultivation NUMERIC(20,2) DEFAULT 0,
    base_atk INT DEFAULT 10,
    base_def INT DEFAULT 10,
    base_hp INT DEFAULT 100,
    base_spd INT DEFAULT 10,
    last_cultivate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE players ALTER COLUMN cultivation TYPE NUMERIC(20,2) USING cultivation::NUMERIC(20,2);
ALTER TABLE players ADD COLUMN IF NOT EXISTS cultivation_art_id VARCHAR(50) DEFAULT 'CP_FIRE_HOANG';
ALTER TABLE players ADD COLUMN IF NOT EXISTS sect_id VARCHAR(80);
ALTER TABLE players ALTER COLUMN cultivation_art_id SET DEFAULT 'CP_FIRE_HOANG';
UPDATE players SET cultivation_art_id = 'CP_FIRE_HOANG' WHERE cultivation_art_id IS NULL OR cultivation_art_id = 'cp_001';
ALTER TABLE players ADD COLUMN IF NOT EXISTS spirit_stones BIGINT DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS sect_points BIGINT DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS honor_points BIGINT DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS event_points BIGINT DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_treasure_hunt TIMESTAMP;

CREATE TABLE IF NOT EXISTS player_items (
    id BIGSERIAL PRIMARY KEY,
    player_id VARCHAR(50) NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    item_id VARCHAR(50) NOT NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    rarity VARCHAR(30),
    instance_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    equipped_slot VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS player_equipped_slot_unique
ON player_items (player_id, equipped_slot)
WHERE equipped_slot IS NOT NULL;

CREATE TABLE IF NOT EXISTS player_cultivation_arts (
    player_id VARCHAR(50) NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    art_id VARCHAR(50) NOT NULL,
    learned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (player_id, art_id)
);

CREATE TABLE IF NOT EXISTS player_skills (
    player_id VARCHAR(50) NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    skill_id VARCHAR(50) NOT NULL,
    learned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (player_id, skill_id)
);

CREATE TABLE IF NOT EXISTS player_exploration_runs (
    id BIGSERIAL PRIMARY KEY,
    player_id VARCHAR(50) NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    outcome VARCHAR(30) NOT NULL,
    monster_id VARCHAR(80),
    monster_template_id VARCHAR(80),
    reward_table_id VARCHAR(80),
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS player_secret_realm_runs (
    id BIGSERIAL PRIMARY KEY,
    player_id VARCHAR(50) NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    outcome VARCHAR(30) NOT NULL,
    wave_count INT NOT NULL DEFAULT 0,
    cleared_waves INT NOT NULL DEFAULT 0,
    boss_monster_id VARCHAR(80),
    reward_table_id VARCHAR(80),
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS player_gathering_runs (
    id BIGSERIAL PRIMARY KEY,
    player_id VARCHAR(50) NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    gathering_id VARCHAR(80) NOT NULL,
    reward_table_id VARCHAR(80),
    stamina_cost INT NOT NULL DEFAULT 0,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS player_shop_purchases (
    id BIGSERIAL PRIMARY KEY,
    player_id VARCHAR(50) NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    shop_id VARCHAR(80) NOT NULL,
    entry_id VARCHAR(80) NOT NULL,
    item_id VARCHAR(80) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    currency_id VARCHAR(80) NOT NULL,
    price BIGINT NOT NULL DEFAULT 0,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS player_craft_logs (
    id BIGSERIAL PRIMARY KEY,
    player_id VARCHAR(50) NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    recipe_id VARCHAR(80) NOT NULL,
    result_item_id VARCHAR(80) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    currency_id VARCHAR(80) NOT NULL,
    currency_cost BIGINT NOT NULL DEFAULT 0,
    crafted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS player_exchange_logs (
    id BIGSERIAL PRIMARY KEY,
    player_id VARCHAR(50) NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    exchange_id VARCHAR(80) NOT NULL,
    costs JSONB NOT NULL DEFAULT '[]'::jsonb,
    rewards JSONB NOT NULL DEFAULT '[]'::jsonb,
    exchanged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO player_cultivation_arts (player_id, art_id)
SELECT id, COALESCE(cultivation_art_id, 'CP_FIRE_HOANG') FROM players
ON CONFLICT DO NOTHING;

DELETE FROM player_cultivation_arts old_art
WHERE old_art.art_id = 'cp_001'
  AND EXISTS (
      SELECT 1 FROM player_cultivation_arts new_art
      WHERE new_art.player_id = old_art.player_id
        AND new_art.art_id = 'CP_FIRE_HOANG'
  );

UPDATE player_cultivation_arts SET art_id = 'CP_FIRE_HOANG' WHERE art_id = 'cp_001';
