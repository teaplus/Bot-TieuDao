ALTER TABLE activity_runs
ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM activity_runs
        WHERE activity_type = 'GATHERING'
          AND status = 'IN_PROGRESS'
        GROUP BY player_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'GATHERING_ACTIVE_RUN_RECONCILIATION_REQUIRED';
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS activity_runs_one_active_gathering_per_player
ON activity_runs (player_id)
WHERE activity_type = 'GATHERING' AND status = 'IN_PROGRESS';

CREATE INDEX IF NOT EXISTS activity_runs_gathering_ready_idx
ON activity_runs (ready_at, player_id)
WHERE activity_type = 'GATHERING' AND status = 'IN_PROGRESS';
