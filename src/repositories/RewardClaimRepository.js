export default class RewardClaimRepository {
    async findByBusinessKey(database, payload) {
        const result = await database.query(
            `SELECT id, claimed_at, rolled_reward_snapshot
             FROM reward_claims
             WHERE player_id = $1 AND claim_type = $2 AND source_ref = $3`,
            [payload.playerId, payload.claimType, payload.sourceRef]
        );
        if (!result.rowCount) return null;
        return {
            claimId: String(result.rows[0].id),
            claimedAt: result.rows[0].claimed_at,
            rewardSnapshot: result.rows[0].rolled_reward_snapshot || []
        };
    }

    async create(client, payload) {
        if (!payload.operationId) throw new Error('REWARD_CLAIM_OPERATION_ID_REQUIRED');
        if (!payload.claimType) throw new Error('REWARD_CLAIM_TYPE_REQUIRED');
        if (!payload.sourceRef) throw new Error('REWARD_CLAIM_SOURCE_REF_REQUIRED');

        const result = await client.query(
            `INSERT INTO reward_claims (
                player_id,
                claim_type,
                source_ref,
                operation_id,
                reward_table_id,
                rolled_reward_snapshot,
                activity_run_id,
                claimed_at
             )
             VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, COALESCE($8, CURRENT_TIMESTAMP))
             RETURNING id, claimed_at`,
            [
                payload.playerId,
                payload.claimType,
                payload.sourceRef,
                payload.operationId,
                payload.rewardTableId || null,
                JSON.stringify(payload.rolledRewardSnapshot || []),
                payload.activityRunId || null,
                payload.claimedAt || null
            ]
        );

        return {
            claimId: String(result.rows[0].id),
            claimedAt: result.rows[0].claimed_at
        };
    }
}
