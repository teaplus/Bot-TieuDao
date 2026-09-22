import pool from '../database/postgres.js';

function mapEntitlement(row) {
    if (!row) return null;
    return Object.freeze({
        id: String(row.id),
        playerId: String(row.player_id),
        rebirthNumber: String(row.rebirth_number),
        availableCount: String(row.available_count || 1),
        grantedAt: new Date(row.granted_at).toISOString()
    });
}

export default class SpiritRootRerollRepository {
    constructor(options = {}) {
        this.database = options.database || pool;
    }

    async findOldestAvailable(playerId, options = {}) {
        const database = options.client || this.database;
        const result = await database.query(
            `SELECT entitlement.id, entitlement.player_id, entitlement.rebirth_number,
                    entitlement.granted_at,
                    (SELECT COUNT(*)
                     FROM player_spirit_root_reroll_entitlements available
                     WHERE available.player_id = $1 AND available.status = 'AVAILABLE') AS available_count
             FROM player_spirit_root_reroll_entitlements entitlement
             WHERE entitlement.player_id = $1 AND entitlement.status = 'AVAILABLE'
             ORDER BY entitlement.rebirth_number ASC, entitlement.id ASC
             LIMIT 1${options.forUpdate ? ' FOR UPDATE' : ''}`,
            [playerId]
        );
        return mapEntitlement(result.rows[0]);
    }

    async applyReroll(client, payload) {
        const consumed = await client.query(
            `UPDATE player_spirit_root_reroll_entitlements
             SET status = 'CONSUMED', consumed_at = $3, consumed_operation_id = $4
             WHERE id = $1 AND player_id = $2 AND status = 'AVAILABLE'
             RETURNING id, rebirth_number`,
            [payload.entitlementId, payload.playerId, payload.rolledAt, payload.operationId]
        );
        if (!consumed.rowCount) throw new Error('SPIRIT_ROOT_ENTITLEMENT_CONFLICT');

        const updated = await client.query(
            `UPDATE players
             SET spirit_root_id = $2,
                 spirit_root_quality_tier_id = $3,
                 spiritual_root = $4
             WHERE id = $1
             RETURNING id`,
            [payload.playerId, payload.newSpiritRootId,
                payload.newQualityTierId, payload.newLegacyValue]
        );
        if (!updated.rowCount) throw new Error('PLAYER_NOT_FOUND');

        const history = await client.query(
            `INSERT INTO player_spirit_root_roll_history (
                player_id, entitlement_id, operation_id, pool_id, pool_revision,
                previous_spirit_root_id, previous_quality_tier_id,
                new_spirit_root_id, new_quality_tier_id, roll_snapshot, rolled_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)
             RETURNING id, rolled_at`,
            [payload.playerId, payload.entitlementId, payload.operationId,
                payload.poolId, payload.poolRevision,
                payload.previousSpiritRootId, payload.previousQualityTierId,
                payload.newSpiritRootId, payload.newQualityTierId,
                JSON.stringify(payload.rollSnapshot), payload.rolledAt]
        );
        return Object.freeze({
            historyId: String(history.rows[0].id),
            rolledAt: history.rows[0].rolled_at
        });
    }
}
