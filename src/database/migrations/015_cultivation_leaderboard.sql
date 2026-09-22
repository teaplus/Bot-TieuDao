CREATE TABLE IF NOT EXISTS cultivation_leaderboard_entries (
    rank SMALLINT PRIMARY KEY CHECK (rank BETWEEN 1 AND 100),
    player_id VARCHAR(50) NOT NULL UNIQUE REFERENCES players(id) ON DELETE CASCADE,
    display_name VARCHAR(100) NOT NULL,
    realm_id INT NOT NULL,
    realm_order INT NOT NULL,
    realm_name VARCHAR(100) NOT NULL,
    realm_stage SMALLINT NOT NULL CHECK (realm_stage > 0),
    cultivation NUMERIC(30,6) NOT NULL CHECK (cultivation >= 0),
    refreshed_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS cultivation_leaderboard_rank_player_idx
ON cultivation_leaderboard_entries (rank, player_id);

CREATE INDEX IF NOT EXISTS players_cultivation_rank_source_idx
ON players (realm_id, realm_stage DESC, cultivation DESC, id ASC);

CREATE TABLE IF NOT EXISTS cultivation_leaderboard_state (
    singleton_id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (singleton_id = 1),
    refreshed_at TIMESTAMPTZ
);

INSERT INTO cultivation_leaderboard_state (singleton_id, refreshed_at)
VALUES (1, NULL)
ON CONFLICT (singleton_id) DO NOTHING;
