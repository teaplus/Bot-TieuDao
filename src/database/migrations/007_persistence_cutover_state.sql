CREATE TABLE IF NOT EXISTS persistence_cutovers (
    domain VARCHAR(80) PRIMARY KEY,
    status VARCHAR(30) NOT NULL,
    source_revision VARCHAR(128),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    backfilled_at TIMESTAMPTZ,
    activated_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT persistence_cutovers_status_valid
        CHECK (status IN ('LEGACY', 'BACKFILLED', 'ACTIVE'))
);

INSERT INTO persistence_cutovers (domain, status)
VALUES ('INVENTORY', 'LEGACY')
ON CONFLICT (domain) DO NOTHING;
