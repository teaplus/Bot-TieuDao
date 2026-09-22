-- Cut over the canonical four-slot equipment model:
-- ROBE -> NECKLACE and the non-canonical SWORD template family -> WIND.
-- Existing generated effects/affixes are preserved byte-for-byte.

UPDATE equipment_instances
SET template_id = REPLACE(
        REPLACE(template_id, 'EQ_SWORD_', 'EQ_WIND_'),
        '_ROBE',
        '_NECKLACE'
    ),
    equipped_slot = CASE WHEN UPPER(equipped_slot) = 'ROBE' THEN 'NECKLACE' ELSE equipped_slot END,
    instance_data = CASE
        WHEN UPPER(COALESCE(instance_data->>'equipmentType', '')) = 'ROBE'
            THEN jsonb_set(instance_data, '{equipmentType}', '"NECKLACE"'::jsonb, true)
        ELSE instance_data
    END,
    updated_at = CURRENT_TIMESTAMP
WHERE template_id LIKE 'EQ_SWORD_%'
   OR template_id LIKE '%\_ROBE' ESCAPE '\'
   OR UPPER(COALESCE(equipped_slot, '')) = 'ROBE'
   OR UPPER(COALESCE(instance_data->>'equipmentType', '')) = 'ROBE';

UPDATE player_items
SET item_id = REPLACE(
        REPLACE(item_id, 'EQ_SWORD_', 'EQ_WIND_'),
        '_ROBE',
        '_NECKLACE'
    ),
    equipped_slot = CASE WHEN UPPER(equipped_slot) = 'ROBE' THEN 'NECKLACE' ELSE equipped_slot END,
    instance_data = CASE
        WHEN UPPER(COALESCE(instance_data->>'equipmentType', '')) = 'ROBE'
            THEN jsonb_set(instance_data, '{equipmentType}', '"NECKLACE"'::jsonb, true)
        ELSE instance_data
    END
WHERE item_id LIKE 'EQ_SWORD_%'
   OR item_id LIKE '%\_ROBE' ESCAPE '\'
   OR UPPER(COALESCE(equipped_slot, '')) = 'ROBE'
   OR UPPER(COALESCE(instance_data->>'equipmentType', '')) = 'ROBE';
