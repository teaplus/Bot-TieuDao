import {
    compareIntegerAmounts,
    normalizeIntegerAmount
} from '../shared/numeric/IntegerAmount.js';

export default class ResourceLedgerRepository {
    async record(client, payload) {
        const delta = normalizeIntegerAmount(payload.delta);
        const balanceAfter = normalizeIntegerAmount(payload.balanceAfter);
        if (compareIntegerAmounts(balanceAfter, 0) < 0) {
            throw new Error('NEGATIVE_LEDGER_BALANCE');
        }

        const result = await client.query(
            `INSERT INTO resource_ledger (
                player_id,
                resource_type,
                resource_id,
                delta,
                balance_after,
                reason,
                reference_type,
                reference_id,
                operation_id,
                created_at
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, CURRENT_TIMESTAMP))
             RETURNING id`,
            [
                payload.playerId,
                payload.resourceType,
                payload.resourceId,
                delta,
                balanceAfter,
                payload.reason,
                payload.referenceType,
                String(payload.referenceId),
                payload.operationId || null,
                payload.createdAt || null
            ]
        );

        return String(result.rows[0].id);
    }

    async recordMany(client, entries) {
        const ids = [];
        for (const entry of entries) {
            if (compareIntegerAmounts(entry.delta, 0) === 0) continue;
            ids.push(await this.record(client, entry));
        }
        return ids;
    }
}
