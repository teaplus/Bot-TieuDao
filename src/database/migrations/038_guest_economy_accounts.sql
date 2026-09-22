ALTER TABLE players
    ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) NOT NULL DEFAULT 'REGISTERED',
    ADD COLUMN IF NOT EXISTS character_registered_at TIMESTAMPTZ;

UPDATE players
SET character_registered_at = COALESCE(character_registered_at, created_at::TIMESTAMPTZ)
WHERE account_status = 'REGISTERED'
  AND character_registered_at IS NULL;

ALTER TABLE players
    DROP CONSTRAINT IF EXISTS players_account_status_valid,
    ADD CONSTRAINT players_account_status_valid
        CHECK (account_status IN ('GUEST', 'REGISTERED')),
    DROP CONSTRAINT IF EXISTS players_registered_at_consistent,
    ADD CONSTRAINT players_registered_at_consistent
        CHECK (
            (account_status = 'GUEST' AND character_registered_at IS NULL)
            OR (account_status = 'REGISTERED' AND character_registered_at IS NOT NULL)
        );

CREATE INDEX IF NOT EXISTS players_guest_created_idx
ON players (created_at, id)
WHERE account_status = 'GUEST';
