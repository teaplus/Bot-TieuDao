import { normalizeIntegerAmount } from '../shared/numeric/IntegerAmount.js';

function mapTransfer(row) {
    if (!row) return null;
    return {
        transferId: String(row.id),
        operationId: row.operation_id,
        senderPlayerId: row.sender_player_id,
        recipientPlayerId: row.recipient_player_id,
        grossAmount: normalizeIntegerAmount(row.gross_amount),
        feeAmount: normalizeIntegerAmount(row.fee_amount),
        receivedAmount: normalizeIntegerAmount(row.received_amount),
        policyRevision: row.policy_revision,
        status: row.status,
        createdAt: row.created_at
    };
}

export default class SpiritStoneTransferRepository {
    async findPlayers(database, playerIds, options = {}) {
        const uniqueIds = [...new Set(playerIds.map(String))].sort();
        const result = await database.query(
            `SELECT id, name, account_status
             FROM players
             WHERE id = ANY($1::varchar[])
             ORDER BY id${options.forUpdate ? ' FOR UPDATE' : ''}`,
            [uniqueIds]
        );
        return result.rows.map((row) => ({
            playerId: row.id,
            name: row.name,
            accountStatus: row.account_status
        }));
    }

    async findRegisteredPlayers(database, playerIds, options = {}) {
        return this.findPlayers(database, playerIds, options);
    }

    async create(database, payload) {
        const result = await database.query(
            `INSERT INTO spirit_stone_transfers (
                operation_id, sender_player_id, recipient_player_id,
                gross_amount, fee_amount, received_amount, policy_revision,
                status, created_at
             ) VALUES ($1, $2, $3, $4, 0, $4, $5, 'COMPLETED', $6)
             RETURNING *`,
            [
                payload.operationId,
                payload.senderPlayerId,
                payload.recipientPlayerId,
                normalizeIntegerAmount(payload.amount),
                payload.policyRevision,
                payload.createdAt || new Date()
            ]
        );
        return mapTransfer(result.rows[0]);
    }
}
