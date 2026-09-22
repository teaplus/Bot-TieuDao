CREATE TABLE IF NOT EXISTS player_wallets (
    player_id VARCHAR(50) NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    currency_id VARCHAR(80) NOT NULL,
    amount NUMERIC(30, 0) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (player_id, currency_id),
    CONSTRAINT player_wallets_currency_id_not_blank CHECK (length(trim(currency_id)) > 0),
    CONSTRAINT player_wallets_amount_non_negative CHECK (amount >= 0)
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM players
        WHERE spirit_stones < 0
           OR sect_points < 0
           OR honor_points < 0
           OR event_points < 0
    ) THEN
        RAISE EXCEPTION 'Cannot backfill player_wallets: negative legacy currency balance exists';
    END IF;
END $$;

INSERT INTO player_wallets (player_id, currency_id, amount)
SELECT id, currency_id, amount
FROM players
CROSS JOIN LATERAL (
    VALUES
        ('SPIRIT_STONE', COALESCE(spirit_stones, 0)),
        ('SECT_POINT', COALESCE(sect_points, 0)),
        ('HONOR', COALESCE(honor_points, 0)),
        ('EVENT_POINT', COALESCE(event_points, 0))
) AS legacy_wallet(currency_id, amount)
ON CONFLICT (player_id, currency_id)
DO UPDATE SET amount = EXCLUDED.amount,
              updated_at = CURRENT_TIMESTAMP;

CREATE OR REPLACE FUNCTION sync_legacy_player_wallets()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO player_wallets (player_id, currency_id, amount)
    VALUES
        (NEW.id, 'SPIRIT_STONE', COALESCE(NEW.spirit_stones, 0)),
        (NEW.id, 'SECT_POINT', COALESCE(NEW.sect_points, 0)),
        (NEW.id, 'HONOR', COALESCE(NEW.honor_points, 0)),
        (NEW.id, 'EVENT_POINT', COALESCE(NEW.event_points, 0))
    ON CONFLICT (player_id, currency_id)
    DO UPDATE SET amount = EXCLUDED.amount,
                  updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS players_wallet_legacy_sync ON players;

CREATE TRIGGER players_wallet_legacy_sync
AFTER INSERT OR UPDATE OF spirit_stones, sect_points, honor_points, event_points
ON players
FOR EACH ROW
EXECUTE FUNCTION sync_legacy_player_wallets();
