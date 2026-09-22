ALTER TABLE player_exploration_runs
ADD COLUMN IF NOT EXISTS encounter_type VARCHAR(40) NOT NULL DEFAULT 'MONSTER';

ALTER TABLE player_exploration_runs
ADD COLUMN IF NOT EXISTS event_id VARCHAR(120);

ALTER TABLE player_exploration_runs
ADD CONSTRAINT player_exploration_runs_encounter_type_valid
CHECK (encounter_type IN ('MONSTER', 'MYSTERY_MERCHANT', 'FORTUNE_REWARD'))
NOT VALID;

ALTER TABLE player_exploration_runs
VALIDATE CONSTRAINT player_exploration_runs_encounter_type_valid;

CREATE INDEX IF NOT EXISTS player_exploration_runs_encounter_idx
ON player_exploration_runs (player_id, encounter_type, completed_at DESC);
