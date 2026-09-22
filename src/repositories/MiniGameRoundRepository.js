import { normalizeIntegerAmount } from '../shared/numeric/IntegerAmount.js';

function mapRound(row) {
    if (!row) return null;
    return {
        roundId: String(row.id),
        playerId: row.player_id,
        gameId: row.game_id,
        rulesRevision: row.rules_revision,
        operationId: row.operation_id,
        wager: normalizeIntegerAmount(row.wager),
        payout: normalizeIntegerAmount(row.payout),
        netDelta: normalizeIntegerAmount(row.net_delta),
        inputSnapshot: row.input_snapshot || {},
        outcomeSnapshot: row.outcome_snapshot || null,
        rngSnapshot: row.rng_snapshot || null,
        status: row.status,
        startedAt: row.started_at,
        settledAt: row.settled_at,
        expiresAt: row.expires_at
    };
}

const ROUND_COLUMNS = `id, player_id, game_id, rules_revision, operation_id,
    wager, payout, net_delta, input_snapshot, outcome_snapshot, rng_snapshot,
    status, started_at, settled_at, expires_at`;

export default class MiniGameRoundRepository {
    async findActiveRound(database, playerId, gameId, options = {}) {
        const result = await database.query(
            `SELECT ${ROUND_COLUMNS}
             FROM player_minigame_rounds
             WHERE player_id = $1 AND game_id = $2 AND status = 'ACTIVE'
             LIMIT 1${options.forUpdate ? ' FOR UPDATE' : ''}`,
            [playerId, gameId]
        );
        return mapRound(result.rows[0]);
    }

    async findPlayerRound(database, playerId, roundId, options = {}) {
        const result = await database.query(
            `SELECT ${ROUND_COLUMNS}
             FROM player_minigame_rounds
             WHERE id = $1 AND player_id = $2
             LIMIT 1${options.forUpdate ? ' FOR UPDATE' : ''}`,
            [roundId, playerId]
        );
        return mapRound(result.rows[0]);
    }

    async recordActiveRound(client, payload) {
        const result = await client.query(
            `INSERT INTO player_minigame_rounds (
                player_id, game_id, rules_revision, operation_id,
                wager, payout, net_delta, input_snapshot, outcome_snapshot, rng_snapshot,
                status, started_at, expires_at
             ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7::jsonb, $8::jsonb, $9::jsonb,
                       'ACTIVE', $10, $11)
             RETURNING ${ROUND_COLUMNS}`,
            [
                payload.playerId,
                payload.gameId,
                payload.rulesRevision,
                payload.operationId,
                normalizeIntegerAmount(payload.wager),
                normalizeIntegerAmount(payload.netDelta),
                JSON.stringify(payload.inputSnapshot || {}),
                JSON.stringify(payload.outcomeSnapshot || {}),
                JSON.stringify(payload.rngSnapshot || {}),
                payload.startedAt || new Date(),
                payload.expiresAt
            ]
        );
        return mapRound(result.rows[0]);
    }

    async updateActiveRoundState(client, payload) {
        const result = await client.query(
            `UPDATE player_minigame_rounds
             SET wager = $3,
                 net_delta = $4,
                 outcome_snapshot = $5::jsonb
             WHERE id = $1 AND player_id = $2 AND status = 'ACTIVE'
             RETURNING ${ROUND_COLUMNS}`,
            [
                payload.roundId,
                payload.playerId,
                normalizeIntegerAmount(payload.wager),
                normalizeIntegerAmount(payload.netDelta),
                JSON.stringify(payload.outcomeSnapshot || {})
            ]
        );
        if (!result.rowCount) throw new Error('MINIGAME_ROUND_NOT_ACTIVE');
        return mapRound(result.rows[0]);
    }

    async settleRound(client, payload) {
        const result = await client.query(
            `UPDATE player_minigame_rounds
             SET wager = COALESCE($3, wager),
                 payout = $4,
                 net_delta = $5,
                 outcome_snapshot = $6::jsonb,
                 status = 'SETTLED',
                 settled_at = $7
             WHERE id = $1 AND player_id = $2 AND status = 'ACTIVE'
             RETURNING ${ROUND_COLUMNS}`,
            [
                payload.roundId,
                payload.playerId,
                payload.wager == null ? null : normalizeIntegerAmount(payload.wager),
                normalizeIntegerAmount(payload.payout),
                normalizeIntegerAmount(payload.netDelta),
                JSON.stringify(payload.outcomeSnapshot || {}),
                payload.settledAt || new Date()
            ]
        );
        if (!result.rowCount) throw new Error('MINIGAME_ROUND_NOT_ACTIVE');
        return mapRound(result.rows[0]);
    }

    async expireRound(client, payload) {
        const result = await client.query(
            `UPDATE player_minigame_rounds
             SET payout = wager,
                 net_delta = 0,
                 outcome_snapshot = $3::jsonb,
                 status = 'EXPIRED',
                 settled_at = $4
             WHERE id = $1 AND player_id = $2 AND status = 'ACTIVE'
             RETURNING ${ROUND_COLUMNS}`,
            [
                payload.roundId,
                payload.playerId,
                JSON.stringify(payload.outcomeSnapshot || { outcome: 'EXPIRED_REFUND' }),
                payload.settledAt || new Date()
            ]
        );
        if (!result.rowCount) throw new Error('MINIGAME_ROUND_NOT_ACTIVE');
        return mapRound(result.rows[0]);
    }

    async recordSettledRound(client, payload) {
        const result = await client.query(
            `INSERT INTO player_minigame_rounds (
                player_id, game_id, rules_revision, operation_id,
                wager, payout, net_delta, input_snapshot, outcome_snapshot,
                rng_snapshot, status, started_at, settled_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb,
                       $10::jsonb, 'SETTLED', $11, $11)
             RETURNING ${ROUND_COLUMNS}`,
            [
                payload.playerId,
                payload.gameId,
                payload.rulesRevision,
                payload.operationId,
                normalizeIntegerAmount(payload.wager),
                normalizeIntegerAmount(payload.payout),
                normalizeIntegerAmount(payload.netDelta),
                JSON.stringify(payload.inputSnapshot || {}),
                JSON.stringify(payload.outcomeSnapshot || {}),
                JSON.stringify(payload.rngSnapshot || {}),
                payload.settledAt || new Date()
            ]
        );
        return mapRound(result.rows[0]);
    }
}
