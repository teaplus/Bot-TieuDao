export default class IdempotencyRepository {
    async reserve(client, payload) {
        const inserted = await client.query(
            `INSERT INTO idempotency_records (
                operation_id,
                player_id,
                operation_type,
                request_hash,
                status,
                business_key,
                retention_policy
             )
             VALUES ($1, $2, $3, $4, 'IN_PROGRESS', $5, $6)
             ON CONFLICT DO NOTHING
             RETURNING operation_id, status`,
            [
                payload.operationId,
                payload.playerId,
                payload.operationType,
                payload.requestHash,
                payload.businessKey || null,
                payload.retentionPolicy || 'DEFAULT'
            ]
        );

        if (inserted.rowCount) {
            return { status: 'RESERVED', operationId: payload.operationId };
        }

        const existing = await client.query(
            `SELECT operation_id, request_hash, status, response
             FROM idempotency_records
             WHERE operation_id = $1
                OR (
                    $2::text IS NOT NULL
                    AND player_id = $3
                    AND operation_type = $4
                    AND business_key = $2
                )
             FOR UPDATE`,
            [
                payload.operationId,
                payload.businessKey || null,
                payload.playerId,
                payload.operationType
            ]
        );
        const row = existing.rows[0];

        if (!row) {
            throw new Error('IDEMPOTENCY_RESERVATION_CONFLICT');
        }

        if (row.request_hash !== payload.requestHash) {
            throw new Error('IDEMPOTENCY_REQUEST_HASH_CONFLICT');
        }

        return {
            status: row.status,
            operationId: row.operation_id,
            response: row.response || null
        };
    }

    async complete(client, payload) {
        const result = await client.query(
            `UPDATE idempotency_records
             SET status = 'COMPLETED',
                 response = $2::jsonb,
                 completed_at = CURRENT_TIMESTAMP,
                 response_expires_at = CURRENT_TIMESTAMP + ($3 * INTERVAL '1 day')
             WHERE operation_id = $1
             RETURNING operation_id, status, response, response_expires_at`,
            [payload.operationId, JSON.stringify(payload.response), payload.responseRetentionDays || 30]
        );

        if (!result.rowCount) {
            throw new Error('IDEMPOTENCY_OPERATION_NOT_FOUND');
        }

        return result.rows[0];
    }

    async cleanup(client) {
        const cleared = await client.query(
            `UPDATE idempotency_records
             SET response = NULL
             WHERE retention_policy = 'ONE_TIME_CLAIM'
               AND response_expires_at <= CURRENT_TIMESTAMP
               AND response IS NOT NULL`
        );
        const deleted = await client.query(
            `DELETE FROM idempotency_records
             WHERE retention_policy = 'DEFAULT'
               AND response_expires_at <= CURRENT_TIMESTAMP`
        );

        return {
            clearedResponses: cleared.rowCount,
            deletedOperations: deleted.rowCount
        };
    }
}
