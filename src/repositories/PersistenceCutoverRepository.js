const VALID_STATUSES = new Set(['LEGACY', 'BACKFILLED', 'ACTIVE']);

export default class PersistenceCutoverRepository {
    async get(database, domain, options = {}) {
        const result = await database.query(
            `SELECT domain, status, source_revision, details, backfilled_at, activated_at, updated_at
             FROM persistence_cutovers
             WHERE domain = $1${options.forUpdate ? ' FOR UPDATE' : ''}`,
            [domain]
        );
        return result.rows[0] || null;
    }

    async markBackfilled(client, payload) {
        const current = await this.get(client, payload.domain, { forUpdate: true });
        if (current?.status === 'ACTIVE') {
            throw new Error(`CUTOVER_ALREADY_ACTIVE:${payload.domain}`);
        }
        return this.setStatus(client, {
            ...payload,
            status: 'BACKFILLED'
        });
    }

    async markActive(client, payload) {
        const current = await this.get(client, payload.domain, { forUpdate: true });
        if (current?.status !== 'BACKFILLED') {
            throw new Error(`CUTOVER_NOT_BACKFILLED:${payload.domain}`);
        }
        if (
            payload.sourceRevision
            && current.source_revision
            && payload.sourceRevision !== current.source_revision
        ) {
            throw new Error(`CUTOVER_SOURCE_REVISION_MISMATCH:${payload.domain}`);
        }
        return this.setStatus(client, {
            ...payload,
            status: 'ACTIVE'
        });
    }

    async setStatus(client, payload) {
        if (!VALID_STATUSES.has(payload.status)) {
            throw new Error(`INVALID_CUTOVER_STATUS:${payload.status}`);
        }

        const result = await client.query(
            `INSERT INTO persistence_cutovers (
                domain,
                status,
                source_revision,
                details,
                backfilled_at,
                activated_at,
                updated_at
             )
             VALUES (
                $1,
                $2,
                $3,
                $4::jsonb,
                CASE WHEN $2 = 'BACKFILLED' THEN CURRENT_TIMESTAMP ELSE NULL END,
                CASE WHEN $2 = 'ACTIVE' THEN CURRENT_TIMESTAMP ELSE NULL END,
                CURRENT_TIMESTAMP
             )
             ON CONFLICT (domain)
             DO UPDATE SET status = EXCLUDED.status,
                           source_revision = EXCLUDED.source_revision,
                           details = EXCLUDED.details,
                           backfilled_at = CASE
                               WHEN EXCLUDED.status = 'BACKFILLED' THEN CURRENT_TIMESTAMP
                               ELSE persistence_cutovers.backfilled_at
                           END,
                           activated_at = CASE
                               WHEN EXCLUDED.status = 'ACTIVE' THEN CURRENT_TIMESTAMP
                               ELSE persistence_cutovers.activated_at
                           END,
                           updated_at = CURRENT_TIMESTAMP
             RETURNING domain, status, source_revision, details, backfilled_at, activated_at, updated_at`,
            [
                payload.domain,
                payload.status,
                payload.sourceRevision || null,
                JSON.stringify(payload.details || {})
            ]
        );
        return result.rows[0];
    }
}
