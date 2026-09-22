ALTER TABLE player_exploration_runs
ADD COLUMN IF NOT EXISTS activity_run_id BIGINT REFERENCES activity_runs(id) ON DELETE RESTRICT;

ALTER TABLE player_secret_realm_runs
ADD COLUMN IF NOT EXISTS activity_run_id BIGINT REFERENCES activity_runs(id) ON DELETE RESTRICT;

ALTER TABLE player_gathering_runs
ADD COLUMN IF NOT EXISTS activity_run_id BIGINT REFERENCES activity_runs(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS player_exploration_runs_activity_unique
ON player_exploration_runs (activity_run_id)
WHERE activity_run_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS player_secret_realm_runs_activity_unique
ON player_secret_realm_runs (activity_run_id)
WHERE activity_run_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS player_gathering_runs_activity_unique
ON player_gathering_runs (activity_run_id)
WHERE activity_run_id IS NOT NULL;
