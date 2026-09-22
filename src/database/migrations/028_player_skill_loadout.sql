ALTER TABLE player_skills
    ADD COLUMN IF NOT EXISTS equipped_slot SMALLINT,
    ADD COLUMN IF NOT EXISTS loadout_revision INTEGER;

ALTER TABLE player_skills
    DROP CONSTRAINT IF EXISTS player_skills_equipped_slot_check,
    ADD CONSTRAINT player_skills_equipped_slot_check
        CHECK (equipped_slot IS NULL OR equipped_slot > 0),
    DROP CONSTRAINT IF EXISTS player_skills_loadout_revision_check,
    ADD CONSTRAINT player_skills_loadout_revision_check
        CHECK (loadout_revision IS NULL OR loadout_revision > 0);

CREATE UNIQUE INDEX IF NOT EXISTS player_skills_equipped_slot_unique
ON player_skills (player_id, equipped_slot)
WHERE equipped_slot IS NOT NULL;

-- One-time deterministic backfill for the currently approved Active Skill
-- identity family. Luyện Khí/Trúc Cơ receive two slots; later Realms receive
-- at most three Active Skills. Passive Skills remain unequipped so no new
-- character Effect becomes active implicitly.
WITH ranked_active AS (
    SELECT
        skill.player_id,
        skill.skill_id,
        ROW_NUMBER() OVER (
            PARTITION BY skill.player_id
            ORDER BY skill.learned_at, skill.skill_id
        ) AS slot,
        CASE WHEN player.realm_id IN (1, 2) THEN 2 ELSE 3 END AS active_capacity
    FROM player_skills AS skill
    JOIN players AS player ON player.id = skill.player_id
    WHERE skill.skill_id LIKE 'SK\_%' ESCAPE '\'
)
UPDATE player_skills AS skill
SET equipped_slot = ranked.slot,
    loadout_revision = 1
FROM ranked_active AS ranked
WHERE skill.player_id = ranked.player_id
  AND skill.skill_id = ranked.skill_id
  AND ranked.slot <= ranked.active_capacity
  AND skill.equipped_slot IS NULL;
