CREATE TABLE IF NOT EXISTS shop_sessions (
    session_id TEXT PRIMARY KEY,
    player_id VARCHAR(50) NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    shop_type VARCHAR(40) NOT NULL,
    source_type VARCHAR(40) NOT NULL,
    source_ref TEXT NOT NULL,
    map_id VARCHAR(80) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    rules_revision INT NOT NULL,
    seed BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    closed_at TIMESTAMPTZ,
    CONSTRAINT shop_sessions_type_valid CHECK (shop_type IN ('MYSTERY')),
    CONSTRAINT shop_sessions_status_valid CHECK (status IN ('ACTIVE', 'EXPIRED', 'CLOSED')),
    CONSTRAINT shop_sessions_expiry_valid CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS shop_sessions_player_active_idx
ON shop_sessions (player_id, expires_at DESC)
WHERE status = 'ACTIVE';

CREATE UNIQUE INDEX IF NOT EXISTS shop_sessions_source_unique
ON shop_sessions (source_type, source_ref, shop_type);

CREATE TABLE IF NOT EXISTS shop_session_entries (
    session_id TEXT NOT NULL REFERENCES shop_sessions(session_id) ON DELETE CASCADE,
    entry_id VARCHAR(120) NOT NULL,
    position INT NOT NULL,
    product JSONB NOT NULL,
    costs JSONB NOT NULL,
    stock_initial INT NOT NULL,
    stock_remaining INT NOT NULL,
    purchase_count INT NOT NULL DEFAULT 0,
    PRIMARY KEY (session_id, entry_id),
    UNIQUE (session_id, position),
    CONSTRAINT shop_session_entries_position_valid CHECK (position > 0),
    CONSTRAINT shop_session_entries_stock_valid CHECK (
        stock_initial > 0 AND stock_remaining >= 0 AND stock_remaining <= stock_initial
    ),
    CONSTRAINT shop_session_entries_purchase_valid CHECK (purchase_count >= 0)
);
