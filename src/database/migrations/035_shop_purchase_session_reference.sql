ALTER TABLE player_shop_purchases
ADD COLUMN IF NOT EXISTS session_id TEXT REFERENCES shop_sessions(session_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS player_shop_purchases_session_idx
ON player_shop_purchases (session_id, purchased_at DESC)
WHERE session_id IS NOT NULL;
