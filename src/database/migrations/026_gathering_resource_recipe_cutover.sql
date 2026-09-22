-- Q-PROFESSION-015:
-- Replace the legacy generic SPIRIT_HERB with the map-specific
-- HERB_TU_LINH_THAO at a 1:1 ratio.
--
-- INVENTORY ACTIVE means inventory_stacks is authoritative. LEGACY and
-- BACKFILLED still use player_items as the authoritative source. The snapshot
-- follows that rule so ledger balances are never counted twice.
CREATE TEMP TABLE gathering_resource_recipe_cutover_snapshot
ON COMMIT DROP
AS
WITH inventory_mode AS (
    SELECT COALESCE(
        (
            SELECT status
            FROM persistence_cutovers
            WHERE domain = 'INVENTORY'
        ),
        'LEGACY'
    ) AS status
),
authoritative_items AS (
    SELECT stack.player_id, stack.item_id, stack.quantity::NUMERIC(30, 0) AS quantity
    FROM inventory_stacks AS stack
    CROSS JOIN inventory_mode AS mode
    WHERE mode.status = 'ACTIVE'
      AND stack.item_id IN ('SPIRIT_HERB', 'HERB_TU_LINH_THAO')

    UNION ALL

    SELECT item.player_id, item.item_id, item.quantity::NUMERIC(30, 0) AS quantity
    FROM player_items AS item
    CROSS JOIN inventory_mode AS mode
    WHERE mode.status <> 'ACTIVE'
      AND item.item_id IN ('SPIRIT_HERB', 'HERB_TU_LINH_THAO')
),
balances AS (
    SELECT
        player_id,
        COALESCE(
            SUM(quantity) FILTER (WHERE item_id = 'SPIRIT_HERB'),
            0
        )::NUMERIC(30, 0) AS legacy_quantity,
        COALESCE(
            SUM(quantity) FILTER (WHERE item_id = 'HERB_TU_LINH_THAO'),
            0
        )::NUMERIC(30, 0) AS replacement_quantity
    FROM authoritative_items
    GROUP BY player_id
)
SELECT player_id, legacy_quantity, replacement_quantity
FROM balances
WHERE legacy_quantity > 0;

INSERT INTO resource_ledger (
    player_id,
    resource_type,
    resource_id,
    delta,
    balance_after,
    reason,
    reference_type,
    reference_id,
    operation_id
)
SELECT
    snapshot.player_id,
    'ITEM',
    'SPIRIT_HERB',
    -snapshot.legacy_quantity,
    0,
    'CONTENT_RESOURCE_MIGRATION',
    'MIGRATION',
    '026_gathering_resource_recipe_cutover',
    'MIGRATION:026:' || snapshot.player_id || ':SPIRIT_HERB'
FROM gathering_resource_recipe_cutover_snapshot AS snapshot
WHERE NOT EXISTS (
    SELECT 1
    FROM resource_ledger AS ledger
    WHERE ledger.operation_id =
        'MIGRATION:026:' || snapshot.player_id || ':SPIRIT_HERB'
);

INSERT INTO resource_ledger (
    player_id,
    resource_type,
    resource_id,
    delta,
    balance_after,
    reason,
    reference_type,
    reference_id,
    operation_id
)
SELECT
    snapshot.player_id,
    'ITEM',
    'HERB_TU_LINH_THAO',
    snapshot.legacy_quantity,
    snapshot.replacement_quantity + snapshot.legacy_quantity,
    'CONTENT_RESOURCE_MIGRATION',
    'MIGRATION',
    '026_gathering_resource_recipe_cutover',
    'MIGRATION:026:' || snapshot.player_id || ':HERB_TU_LINH_THAO'
FROM gathering_resource_recipe_cutover_snapshot AS snapshot
WHERE NOT EXISTS (
    SELECT 1
    FROM resource_ledger AS ledger
    WHERE ledger.operation_id =
        'MIGRATION:026:' || snapshot.player_id || ':HERB_TU_LINH_THAO'
);

-- Update both persistence representations. BACKFILLED installations therefore
-- remain consistent when the inventory cutover is activated later.
UPDATE player_items
SET item_id = 'HERB_TU_LINH_THAO'
WHERE item_id = 'SPIRIT_HERB';

UPDATE inventory_stacks
SET item_id = 'HERB_TU_LINH_THAO',
    updated_at = CURRENT_TIMESTAMP
WHERE item_id = 'SPIRIT_HERB';
