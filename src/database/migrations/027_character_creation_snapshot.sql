ALTER TABLE players
    ADD COLUMN IF NOT EXISTS creation_rerolls_used SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS creation_rule_revision INTEGER NOT NULL DEFAULT 1;

ALTER TABLE players
    DROP CONSTRAINT IF EXISTS players_creation_rerolls_used_check,
    ADD CONSTRAINT players_creation_rerolls_used_check
        CHECK (creation_rerolls_used >= 0),
    DROP CONSTRAINT IF EXISTS players_creation_rule_revision_check,
    ADD CONSTRAINT players_creation_rule_revision_check
        CHECK (creation_rule_revision > 0);
