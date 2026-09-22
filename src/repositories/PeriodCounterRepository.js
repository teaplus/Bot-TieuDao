import {
    compareIntegerAmounts,
    normalizeIntegerAmount
} from '../shared/numeric/IntegerAmount.js';

const SUPPORTED_PERIODS = new Set(['DAILY', 'WEEKLY', 'MONTHLY', 'LIFETIME']);

export default class PeriodCounterRepository {
    async getValue(database, payload) {
        const result = await database.query(
            `SELECT value
             FROM player_period_counters
             WHERE player_id = $1
               AND counter_type = $2
               AND subject_id = $3
               AND period_type = $4
               AND period_key = $5`,
            [
                payload.playerId,
                payload.counterType,
                payload.subjectId,
                payload.periodType,
                payload.periodKey
            ]
        );

        return normalizeIntegerAmount(result.rows[0]?.value || 0);
    }

    async incrementWithinLimit(client, payload) {
        const increment = normalizeIntegerAmount(payload.increment || 1);
        const limit = normalizeIntegerAmount(payload.limit);
        if (compareIntegerAmounts(increment, 0) <= 0 || compareIntegerAmounts(limit, 0) <= 0) {
            throw new Error('INVALID_PERIOD_COUNTER_AMOUNT');
        }
        if (!SUPPORTED_PERIODS.has(payload.periodType)) {
            throw new Error(`UNSUPPORTED_PERIOD_TYPE:${payload.periodType}`);
        }

        const result = await client.query(
            `INSERT INTO player_period_counters (
                player_id,
                counter_type,
                subject_id,
                period_type,
                period_key,
                value
             )
             SELECT $1, $2, $3, $4, $5, $6
             WHERE $6::bigint <= $7::bigint
             ON CONFLICT (player_id, counter_type, subject_id, period_type, period_key)
             DO UPDATE SET value = player_period_counters.value + EXCLUDED.value,
                           updated_at = CURRENT_TIMESTAMP
             WHERE player_period_counters.value + EXCLUDED.value <= $7::bigint
             RETURNING value`,
            [
                payload.playerId,
                payload.counterType,
                payload.subjectId,
                payload.periodType,
                payload.periodKey,
                increment,
                limit
            ]
        );

        if (!result.rowCount) {
            throw new Error(payload.errorCode || 'PERIOD_LIMIT_REACHED');
        }
        return normalizeIntegerAmount(result.rows[0].value);
    }
}
