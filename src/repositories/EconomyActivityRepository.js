import { normalizeIntegerAmount } from '../shared/numeric/IntegerAmount.js';

export default class EconomyActivityRepository {
    async findLatestRun(database, playerId, activityId, options = {}) {
        const lockClause = options.forUpdate ? ' FOR UPDATE' : '';
        const result = await database.query(
            `SELECT id, activity_id, period_key, map_id, reward_amount,
                    roll_seed, outcome_snapshot, completed_at
             FROM player_economy_activity_runs
             WHERE player_id = $1 AND activity_id = $2
             ORDER BY completed_at DESC, id DESC
             LIMIT 1${lockClause}`,
            [playerId, activityId]
        );
        if (!result.rowCount) return null;
        const row = result.rows[0];
        return {
            id: String(row.id),
            activityId: row.activity_id,
            periodKey: row.period_key,
            mapId: row.map_id,
            rewardAmount: normalizeIntegerAmount(row.reward_amount),
            rollSeed: row.roll_seed == null ? null : Number(row.roll_seed),
            outcomeSnapshot: row.outcome_snapshot || {},
            completedAt: row.completed_at
        };
    }

    async recordRun(client, payload) {
        const result = await client.query(
            `INSERT INTO player_economy_activity_runs (
                player_id, activity_id, operation_id, rules_revision,
                period_key, map_id, reward_amount, roll_seed,
                outcome_snapshot, completed_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
             RETURNING id, completed_at`,
            [
                payload.playerId,
                payload.activityId,
                payload.operationId,
                payload.rulesRevision,
                payload.periodKey,
                payload.mapId,
                normalizeIntegerAmount(payload.rewardAmount),
                payload.rollSeed ?? null,
                JSON.stringify(payload.outcomeSnapshot || {}),
                payload.completedAt || new Date()
            ]
        );
        return {
            runId: String(result.rows[0].id),
            completedAt: result.rows[0].completed_at
        };
    }
}
