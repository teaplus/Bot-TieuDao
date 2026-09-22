INSERT INTO player_learned_recipes (
    player_id,
    recipe_id,
    source_ref
)
SELECT
    players.id,
    'CRAFT_SPIRIT_GATHERING_PILL',
    'MIGRATION:030_STARTER_SPIRIT_GATHERING_RECIPE'
FROM players
ON CONFLICT (player_id, recipe_id) DO NOTHING;
