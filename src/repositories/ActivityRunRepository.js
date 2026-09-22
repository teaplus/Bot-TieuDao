export default class ActivityRunRepository {
    async findActive(client, payload) {
        const result = await client.query(
            `SELECT id, player_id, activity_type, content_id, operation_id, status,
                    input_snapshot, result_snapshot, reward_table_id, started_at, ready_at, completed_at
             FROM activity_runs
             WHERE player_id = $1
               AND activity_type = $2
               AND status = 'IN_PROGRESS'
             ORDER BY started_at DESC, id DESC
             LIMIT 1`,
            [payload.playerId, payload.activityType]
        );
        const row = result.rows[0];
        if (!row) return null;
        return {
            runId: String(row.id),
            playerId: row.player_id,
            activityType: row.activity_type,
            contentId: row.content_id,
            operationId: row.operation_id,
            status: row.status,
            inputSnapshot: row.input_snapshot || {},
            resultSnapshot: row.result_snapshot || null,
            rewardTableId: row.reward_table_id,
            startedAt: row.started_at,
            readyAt: row.ready_at,
            completedAt: row.completed_at
        };
    }

    async reserve(client, payload) {
        const inserted = await client.query(
            `INSERT INTO activity_runs (
                player_id, activity_type, content_id, operation_id, input_snapshot, reward_table_id, ready_at
             )
             VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
             ON CONFLICT (operation_id) DO NOTHING
             RETURNING id, status`,
            [
                payload.playerId,
                payload.activityType,
                payload.contentId,
                payload.operationId,
                JSON.stringify(payload.inputSnapshot || {}),
                payload.rewardTableId || null,
                payload.readyAt || null
            ]
        );
        if (inserted.rowCount) {
            return { runId: String(inserted.rows[0].id), status: inserted.rows[0].status };
        }

        const existing = await client.query(
            `SELECT id, player_id, activity_type, content_id, status
             FROM activity_runs
             WHERE operation_id = $1
             FOR UPDATE`,
            [payload.operationId]
        );
        const row = existing.rows[0];
        if (!row) throw new Error('ACTIVITY_RUN_RESERVATION_CONFLICT');
        if (
            row.player_id !== payload.playerId
            || row.activity_type !== payload.activityType
            || row.content_id !== payload.contentId
        ) {
            throw new Error('ACTIVITY_RUN_REQUEST_CONFLICT');
        }
        return { runId: String(row.id), status: row.status };
    }

    async lockById(client, payload) {
        const result = await client.query(
            `SELECT id, player_id, activity_type, content_id, operation_id, status,
                    input_snapshot, result_snapshot, reward_table_id, started_at, ready_at, completed_at
             FROM activity_runs
             WHERE id = $1
             FOR UPDATE`,
            [payload.runId]
        );
        const row = result.rows[0];
        if (!row) throw new Error('ACTIVITY_RUN_NOT_FOUND');
        if (payload.playerId && row.player_id !== payload.playerId) {
            throw new Error('ACTIVITY_RUN_PLAYER_MISMATCH');
        }
        if (payload.activityType && row.activity_type !== payload.activityType) {
            throw new Error('ACTIVITY_RUN_TYPE_MISMATCH');
        }

        return {
            runId: String(row.id),
            playerId: row.player_id,
            activityType: row.activity_type,
            contentId: row.content_id,
            operationId: row.operation_id,
            status: row.status,
            inputSnapshot: row.input_snapshot || {},
            resultSnapshot: row.result_snapshot || null,
            rewardTableId: row.reward_table_id,
            startedAt: row.started_at,
            readyAt: row.ready_at,
            completedAt: row.completed_at
        };
    }

    async complete(client, payload) {
        const result = await client.query(
            `UPDATE activity_runs
             SET status = 'COMPLETED',
                 result_snapshot = $2::jsonb,
                 completed_at = COALESCE($3, CURRENT_TIMESTAMP)
             WHERE id = $1
               AND status IN ('IN_PROGRESS', 'COMPLETED')
             RETURNING id, status, completed_at`,
            [payload.runId, JSON.stringify(payload.resultSnapshot || {}), payload.completedAt || null]
        );
        if (!result.rowCount) throw new Error('ACTIVITY_RUN_NOT_COMPLETABLE');
        return result.rows[0];
    }
}
