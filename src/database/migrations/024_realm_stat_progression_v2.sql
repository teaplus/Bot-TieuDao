ALTER TABLE players
    ADD COLUMN IF NOT EXISTS realm_stat_policy_revision INTEGER NOT NULL DEFAULT 1;

WITH RECURSIVE stat_curve AS (
    SELECT
        1::INTEGER AS realm_id,
        1::INTEGER AS realm_stage,
        200::NUMERIC AS hp,
        40::NUMERIC AS atk,
        20::NUMERIC AS def,
        5::NUMERIC AS spd
    UNION ALL
    SELECT
        CASE WHEN current.realm_stage < 10 THEN current.realm_id ELSE current.realm_id + 1 END,
        CASE WHEN current.realm_stage < 10 THEN current.realm_stage + 1 ELSE 1 END,
        FLOOR(current.hp * factor.numerator / factor.denominator),
        FLOOR(current.atk * factor.numerator / factor.denominator),
        FLOOR(current.def * factor.numerator / factor.denominator),
        FLOOR(current.spd * factor.numerator / factor.denominator)
    FROM stat_curve current
    CROSS JOIN LATERAL (
        SELECT
            CASE
                WHEN current.realm_stage < 10 AND current.realm_id = 1 THEN 11::NUMERIC
                WHEN current.realm_stage < 10 THEN 6::NUMERIC
                WHEN current.realm_id = 1 THEN 3::NUMERIC
                ELSE 17::NUMERIC
            END AS numerator,
            CASE
                WHEN current.realm_stage < 10 AND current.realm_id = 1 THEN 10::NUMERIC
                WHEN current.realm_stage < 10 THEN 5::NUMERIC
                WHEN current.realm_id = 1 THEN 2::NUMERIC
                ELSE 10::NUMERIC
            END AS denominator
    ) factor
    WHERE current.realm_id < 15 OR current.realm_stage < 10
), resolved AS (
    SELECT
        player.id,
        curve.hp + FLOOR(FLOOR(SQRT(curve.hp * curve.hp * player.rebirth_count)) / 4) AS hp,
        curve.atk + FLOOR(FLOOR(SQRT(curve.atk * curve.atk * player.rebirth_count)) / 4) AS atk,
        curve.def + FLOOR(FLOOR(SQRT(curve.def * curve.def * player.rebirth_count)) / 4) AS def,
        curve.spd + FLOOR(FLOOR(SQRT(curve.spd * curve.spd * player.rebirth_count)) / 4) AS spd
    FROM players player
    JOIN stat_curve curve
      ON curve.realm_id = player.realm_id
     AND curve.realm_stage = player.realm_stage
)
UPDATE players player
SET base_hp = resolved.hp,
    base_atk = resolved.atk,
    base_def = resolved.def,
    base_spd = resolved.spd,
    realm_stat_policy_revision = 2
FROM resolved
WHERE player.id = resolved.id;

ALTER TABLE players
    ALTER COLUMN realm_stat_policy_revision SET DEFAULT 2;
