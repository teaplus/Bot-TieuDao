UPDATE players
SET spirit_root_quality_tier_id = 'LOWER_GRADE'
WHERE spirit_root_quality_tier_id IS NULL;

ALTER TABLE players
    ALTER COLUMN spirit_root_quality_tier_id SET DEFAULT 'LOWER_GRADE',
    ALTER COLUMN spirit_root_quality_tier_id SET NOT NULL;

INSERT INTO player_spirit_root_reroll_entitlements (
    player_id,
    rebirth_number,
    status,
    granted_at
)
SELECT
    player.id,
    player.rebirth_count,
    'AVAILABLE',
    CURRENT_TIMESTAMP
FROM players player
WHERE player.rebirth_count > 0
ON CONFLICT (player_id, rebirth_number) DO NOTHING;
