export default class ShopSessionRepository {
    async findActive(database, playerId, now = new Date(), options = {}) {
        const lock = options.forUpdate ? ' FOR UPDATE' : '';
        const result = await database.query(
            `SELECT session.session_id, session.player_id, session.shop_type,
                    session.source_type, session.source_ref, session.map_id,
                    session.status, session.rules_revision, session.seed,
                    session.created_at, session.expires_at
             FROM shop_sessions session
             WHERE session.player_id = $1
               AND session.shop_type = 'MYSTERY'
               AND session.status = 'ACTIVE'
               AND session.expires_at > $2
             ORDER BY session.expires_at DESC
             LIMIT 1${lock}`,
            [playerId, now]
        );
        if (!result.rows[0]) return null;
        const entries = await this.listEntries(database, result.rows[0].session_id);
        return this.mapSession({ ...result.rows[0], entries });
    }

    async create(database, payload) {
        await database.query(
            `UPDATE shop_sessions
             SET status = 'EXPIRED', closed_at = $2
             WHERE player_id = $1 AND shop_type = 'MYSTERY'
               AND status = 'ACTIVE' AND expires_at <= $2`,
            [payload.playerId, payload.createdAt]
        );
        const active = await this.findActive(database, payload.playerId, payload.createdAt, {
            forUpdate: true
        });
        if (active) return active;
        await database.query(
            `INSERT INTO shop_sessions (
                session_id, player_id, shop_type, source_type, source_ref, map_id,
                rules_revision, seed, created_at, expires_at
             ) VALUES ($1, $2, 'MYSTERY', $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (source_type, source_ref, shop_type) DO NOTHING`,
            [
                payload.sessionId, payload.playerId, payload.sourceType, payload.sourceRef,
                payload.mapId, payload.rulesRevision, payload.seed,
                payload.createdAt, payload.expiresAt
            ]
        );
        for (const [index, entry] of payload.entries.entries()) {
            await database.query(
                `INSERT INTO shop_session_entries (
                    session_id, entry_id, position, product, costs,
                    stock_initial, stock_remaining
                 ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $6)
                 ON CONFLICT (session_id, entry_id) DO NOTHING`,
                [
                    payload.sessionId, entry.id, index + 1,
                    JSON.stringify(entry.product), JSON.stringify(entry.costs),
                    entry.stock
                ]
            );
        }
        return this.findById(database, payload.sessionId);
    }

    async findById(database, sessionId) {
        const result = await database.query(
            `SELECT * FROM shop_sessions WHERE session_id = $1`,
            [sessionId]
        );
        if (!result.rows[0]) return null;
        const entries = await this.listEntries(database, sessionId);
        return this.mapSession({ ...result.rows[0], entries });
    }

    async listEntries(database, sessionId) {
        const result = await database.query(
            `SELECT entry_id, position, product, costs, stock_initial,
                    stock_remaining, purchase_count
             FROM shop_session_entries
             WHERE session_id = $1
             ORDER BY position`,
            [sessionId]
        );
        return result.rows.map((row) => ({
            entryId: row.entry_id,
            position: Number(row.position),
            product: row.product,
            costs: row.costs,
            stockInitial: Number(row.stock_initial),
            stockRemaining: Number(row.stock_remaining),
            purchaseCount: Number(row.purchase_count)
        }));
    }

    mapSession(row) {
        return {
            sessionId: row.session_id,
            playerId: row.player_id,
            shopType: row.shop_type,
            sourceType: row.source_type,
            sourceRef: row.source_ref,
            mapId: row.map_id,
            status: row.status,
            rulesRevision: Number(row.rules_revision),
            seed: Number(row.seed),
            createdAt: row.created_at,
            expiresAt: row.expires_at,
            entries: row.entries || []
        };
    }
}
