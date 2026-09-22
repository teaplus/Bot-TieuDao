CREATE TABLE IF NOT EXISTS idle_accumulators (
    player_id VARCHAR(50) NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    source_id VARCHAR(80) NOT NULL,
    checkpoint_at TIMESTAMPTZ NOT NULL,
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    rules_revision VARCHAR(80),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (player_id, source_id),
    CONSTRAINT idle_accumulators_source_id_not_blank CHECK (length(trim(source_id)) > 0)
);

INSERT INTO idle_accumulators (player_id, source_id, checkpoint_at, rules_revision)
SELECT
    id,
    'CULTIVATION',
    COALESCE(last_cultivate, created_at, CURRENT_TIMESTAMP::timestamp) AT TIME ZONE 'UTC',
    'cultivation-rules-v1'
FROM players
ON CONFLICT (player_id, source_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idle_accumulators_source_checkpoint_idx
ON idle_accumulators (source_id, checkpoint_at);
