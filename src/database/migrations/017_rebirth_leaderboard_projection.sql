ALTER TABLE cultivation_leaderboard_entries
    ADD COLUMN IF NOT EXISTS rebirth_count NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE cultivation_leaderboard_entries
    DROP CONSTRAINT IF EXISTS cultivation_leaderboard_rebirth_count_non_negative_integer;

ALTER TABLE cultivation_leaderboard_entries
    ADD CONSTRAINT cultivation_leaderboard_rebirth_count_non_negative_integer
    CHECK (rebirth_count >= 0 AND rebirth_count = TRUNC(rebirth_count));

DROP INDEX IF EXISTS players_cultivation_rank_source_idx;

CREATE INDEX IF NOT EXISTS players_cultivation_rank_source_idx
ON players (rebirth_count DESC, realm_id, realm_stage DESC, cultivation DESC, id ASC);
