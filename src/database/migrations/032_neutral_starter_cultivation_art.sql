BEGIN;

ALTER TABLE players
    ALTER COLUMN cultivation_art_id SET DEFAULT 'CP_NEUTRAL_HOANG';

-- Existing players keep their selected active art. Grant the neutral starter art so
-- anyone affected by the new affinity rule can opt into the stable +20% baseline.
INSERT INTO player_cultivation_arts (player_id, art_id)
SELECT id, 'CP_NEUTRAL_HOANG'
FROM players
ON CONFLICT (player_id, art_id) DO NOTHING;

UPDATE idle_accumulators
SET rules_revision = 'cultivation-rules-v3'
WHERE source_id = 'CULTIVATION';

COMMIT;
