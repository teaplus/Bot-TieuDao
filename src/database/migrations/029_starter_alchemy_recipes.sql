INSERT INTO player_learned_recipes (
    player_id,
    recipe_id,
    source_ref
)
SELECT
    players.id,
    'CRAFT_BREAKTHROUGH_PILL',
    'MIGRATION:029_STARTER_ALCHEMY_RECIPES'
FROM players
ON CONFLICT (player_id, recipe_id) DO NOTHING;
