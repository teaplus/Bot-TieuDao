ALTER TABLE player_shop_purchases
ADD COLUMN IF NOT EXISTS product_kind VARCHAR(40) NOT NULL DEFAULT 'ITEM';

ALTER TABLE player_shop_purchases
ADD COLUMN IF NOT EXISTS product_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE player_shop_purchases
ADD CONSTRAINT player_shop_purchases_product_kind_valid
CHECK (product_kind IN ('ITEM', 'CULTIVATION_ART_BOOK', 'SKILL_BOOK', 'EQUIPMENT'))
NOT VALID;

ALTER TABLE player_shop_purchases
VALIDATE CONSTRAINT player_shop_purchases_product_kind_valid;

CREATE INDEX IF NOT EXISTS player_shop_purchases_product_idx
ON player_shop_purchases (product_kind, item_id, purchased_at DESC);
