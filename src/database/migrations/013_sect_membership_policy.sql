ALTER TABLE players
ADD COLUMN IF NOT EXISTS sect_rejoin_available_at TIMESTAMPTZ;

ALTER TABLE players
ADD COLUMN IF NOT EXISTS sect_policy_revision VARCHAR(80);

CREATE INDEX IF NOT EXISTS players_sect_rejoin_available_idx
ON players (sect_rejoin_available_at)
WHERE sect_id IS NULL AND sect_rejoin_available_at IS NOT NULL;
