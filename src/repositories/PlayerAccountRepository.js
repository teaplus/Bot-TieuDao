export default class PlayerAccountRepository {
    async ensureGuest(database, playerId) {
        const inserted = await database.query(
            `INSERT INTO players (
                id, name, account_status, character_registered_at,
                realm_id, realm_stage, spirit_stones
             ) VALUES ($1, 'Lữ Khách', 'GUEST', NULL, 1, 1, 0)
             ON CONFLICT (id) DO NOTHING
             RETURNING id, account_status`,
            [playerId]
        );
        if (inserted.rowCount) {
            return { playerId, accountStatus: 'GUEST', created: true };
        }
        const existing = await database.query(
            `SELECT id, account_status FROM players WHERE id = $1`,
            [playerId]
        );
        if (!existing.rowCount) throw new Error('PLAYER_ACCOUNT_ENSURE_FAILED');
        return {
            playerId,
            accountStatus: existing.rows[0].account_status,
            created: false
        };
    }
}
