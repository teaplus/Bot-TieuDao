UPDATE players
SET base_atk = 40,
    base_def = 20,
    base_hp = 200,
    base_spd = 5
WHERE realm_id = 1
  AND realm_stage = 1
  AND rebirth_count = 0
  AND base_atk = 10
  AND base_def = 10
  AND base_hp = 100
  AND base_spd = 10;
