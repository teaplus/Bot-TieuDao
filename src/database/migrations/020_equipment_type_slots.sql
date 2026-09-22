-- Canonical loadout rule: one equipped instance per data-driven equipment type.
-- Existing physical slot aliases are converted to the template equipment type.

DROP INDEX IF EXISTS equipment_instances_player_slot_unique;

CREATE TEMP TABLE migration_020_equipment_slots ON COMMIT DROP AS
SELECT
        id,
        player_id,
        CASE
            WHEN NULLIF(instance_data->>'equipmentType', '') IS NOT NULL
                THEN UPPER(instance_data->>'equipmentType')
            WHEN UPPER(template_id) LIKE '%\_ROBE' ESCAPE '\' THEN 'ROBE'
            WHEN UPPER(template_id) LIKE '%\_ARMOR' ESCAPE '\' THEN 'ARMOR'
            WHEN UPPER(template_id) LIKE '%\_WEAPON' ESCAPE '\' THEN 'WEAPON'
            WHEN UPPER(template_id) LIKE '%\_RING' ESCAPE '\' THEN 'RING'
            ELSE UPPER(equipped_slot)
        END AS equipment_type,
        ROW_NUMBER() OVER (
            PARTITION BY player_id, CASE
                WHEN NULLIF(instance_data->>'equipmentType', '') IS NOT NULL
                    THEN UPPER(instance_data->>'equipmentType')
                WHEN UPPER(template_id) LIKE '%\_ROBE' ESCAPE '\' THEN 'ROBE'
                WHEN UPPER(template_id) LIKE '%\_ARMOR' ESCAPE '\' THEN 'ARMOR'
                WHEN UPPER(template_id) LIKE '%\_WEAPON' ESCAPE '\' THEN 'WEAPON'
                WHEN UPPER(template_id) LIKE '%\_RING' ESCAPE '\' THEN 'RING'
                ELSE UPPER(equipped_slot)
            END
            ORDER BY updated_at DESC, id DESC
        ) AS type_rank
FROM equipment_instances
WHERE equipped_slot IS NOT NULL;

UPDATE equipment_instances equipment
SET equipped_slot = NULL,
    updated_at = CURRENT_TIMESTAMP
FROM migration_020_equipment_slots inferred
WHERE equipment.id = inferred.id
  AND inferred.type_rank > 1;

UPDATE equipment_instances equipment
SET equipped_slot = inferred.equipment_type,
    instance_data = jsonb_set(
        equipment.instance_data,
        '{equipmentType}',
        to_jsonb(inferred.equipment_type),
        true
    ),
    updated_at = CURRENT_TIMESTAMP
FROM migration_020_equipment_slots inferred
WHERE equipment.id = inferred.id
  AND inferred.type_rank = 1;

CREATE UNIQUE INDEX equipment_instances_player_slot_unique
ON equipment_instances (player_id, equipped_slot)
WHERE equipped_slot IS NOT NULL;

DROP INDEX IF EXISTS player_equipped_slot_unique;

WITH inferred AS (
    SELECT
        id,
        player_id,
        CASE
            WHEN NULLIF(instance_data->>'equipmentType', '') IS NOT NULL
                THEN UPPER(instance_data->>'equipmentType')
            WHEN UPPER(item_id) LIKE '%\_ROBE' ESCAPE '\' THEN 'ROBE'
            WHEN UPPER(item_id) LIKE '%\_ARMOR' ESCAPE '\' THEN 'ARMOR'
            WHEN UPPER(item_id) LIKE '%\_WEAPON' ESCAPE '\' THEN 'WEAPON'
            WHEN UPPER(item_id) LIKE '%\_RING' ESCAPE '\' THEN 'RING'
            ELSE UPPER(equipped_slot)
        END AS equipment_type,
        ROW_NUMBER() OVER (
            PARTITION BY player_id, CASE
                WHEN NULLIF(instance_data->>'equipmentType', '') IS NOT NULL
                    THEN UPPER(instance_data->>'equipmentType')
                WHEN UPPER(item_id) LIKE '%\_ROBE' ESCAPE '\' THEN 'ROBE'
                WHEN UPPER(item_id) LIKE '%\_ARMOR' ESCAPE '\' THEN 'ARMOR'
                WHEN UPPER(item_id) LIKE '%\_WEAPON' ESCAPE '\' THEN 'WEAPON'
                WHEN UPPER(item_id) LIKE '%\_RING' ESCAPE '\' THEN 'RING'
                ELSE UPPER(equipped_slot)
            END
            ORDER BY id DESC
        ) AS type_rank
    FROM player_items
    WHERE equipped_slot IS NOT NULL
)
UPDATE player_items item
SET equipped_slot = CASE WHEN inferred.type_rank = 1 THEN inferred.equipment_type ELSE NULL END,
    instance_data = CASE
        WHEN inferred.type_rank = 1 THEN jsonb_set(
            item.instance_data,
            '{equipmentType}',
            to_jsonb(inferred.equipment_type),
            true
        )
        ELSE item.instance_data
    END
FROM inferred
WHERE item.id = inferred.id;

CREATE UNIQUE INDEX player_equipped_slot_unique
ON player_items (player_id, equipped_slot)
WHERE equipped_slot IS NOT NULL;
