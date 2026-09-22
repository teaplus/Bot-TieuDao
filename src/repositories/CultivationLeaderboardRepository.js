function mapRow(row) {
    return Object.freeze({
        rank: Number(row.rank),
        playerId: String(row.player_id),
        displayName: row.display_name,
        rebirthCount: String(row.rebirth_count || 0),
        realmId: Number(row.realm_id),
        realmOrder: Number(row.realm_order),
        realmName: row.realm_name,
        stage: Number(row.realm_stage),
        cultivation: String(row.cultivation),
        refreshedAt: new Date(row.refreshed_at).toISOString()
    });
}

export default class CultivationLeaderboardRepository {
    constructor(options = {}) {
        if (!options.database) throw new Error('LEADERBOARD_DATABASE_REQUIRED');
        this.database = options.database;
    }

    async getRefreshState(database = this.database, options = {}) {
        const result = await database.query(
            `SELECT refreshed_at
             FROM cultivation_leaderboard_state
             WHERE singleton_id = 1${options.forUpdate ? ' FOR UPDATE' : ''}`
        );
        return Object.freeze({
            refreshedAt: result.rows[0]?.refreshed_at
                ? new Date(result.rows[0].refreshed_at).toISOString()
                : null
        });
    }

    async replaceSnapshot(database, realmDefinitions, refreshedAt) {
        if (!Array.isArray(realmDefinitions) || realmDefinitions.length === 0) {
            throw new Error('LEADERBOARD_REALM_DEFINITIONS_REQUIRED');
        }
        const values = [];
        const placeholders = realmDefinitions.map((realm, index) => {
            const offset = index * 3;
            values.push(realm.id, realm.order, realm.name);
            return `($${offset + 1}::int, $${offset + 2}::int, $${offset + 3}::text)`;
        });
        values.push(refreshedAt);
        const refreshedAtParameter = `$${values.length}`;

        await database.query('DELETE FROM cultivation_leaderboard_entries');
        await database.query(
            `WITH realm_definitions(realm_id, realm_order, realm_name) AS (
                VALUES ${placeholders.join(', ')}
             ), ranked AS (
                SELECT
                    ROW_NUMBER() OVER (
                        ORDER BY player.rebirth_count DESC,
                                 realm.realm_order DESC,
                                 player.realm_stage DESC,
                                 COALESCE(player.cultivation, 0) DESC,
                                 player.id ASC
                    )::smallint AS rank,
                    player.id AS player_id,
                    player.name AS display_name,
                    player.rebirth_count,
                    player.realm_id,
                    realm.realm_order,
                    realm.realm_name,
                    player.realm_stage,
                    COALESCE(player.cultivation, 0) AS cultivation
                FROM players player
                INNER JOIN realm_definitions realm ON realm.realm_id = player.realm_id
                WHERE player.account_status = 'REGISTERED'
                ORDER BY player.rebirth_count DESC,
                         realm.realm_order DESC,
                         player.realm_stage DESC,
                         COALESCE(player.cultivation, 0) DESC,
                         player.id ASC
                LIMIT 100
             )
             INSERT INTO cultivation_leaderboard_entries (
                rank, player_id, display_name, rebirth_count, realm_id, realm_order,
                realm_name, realm_stage, cultivation, refreshed_at
             )
             SELECT rank, player_id, display_name, rebirth_count, realm_id, realm_order,
                    realm_name, realm_stage, cultivation, ${refreshedAtParameter}::timestamptz
             FROM ranked`,
            values
        );

        await database.query(
            `UPDATE cultivation_leaderboard_state
             SET refreshed_at = $1
             WHERE singleton_id = 1`,
            [refreshedAt]
        );
    }

    async listPage(request, database = this.database) {
        const cursor = request.cursor;
        const previous = cursor?.direction === 'PREVIOUS';
        const params = [];
        let predicate = '';
        if (cursor) {
            params.push(Number(cursor.sortValue), cursor.id);
            predicate = previous
                ? 'WHERE (rank, player_id) < ($1::smallint, $2::text)'
                : 'WHERE (rank, player_id) > ($1::smallint, $2::text)';
        }
        params.push(request.limit + 1);
        const limitParameter = `$${params.length}`;
        const result = await database.query(
            `SELECT rank, player_id, display_name, rebirth_count, realm_id, realm_order,
                    realm_name, realm_stage, cultivation, refreshed_at
             FROM cultivation_leaderboard_entries
             ${predicate}
             ORDER BY rank ${previous ? 'DESC' : 'ASC'}, player_id ${previous ? 'DESC' : 'ASC'}
             LIMIT ${limitParameter}`,
            params
        );
        const hasMore = result.rows.length > request.limit;
        const selected = result.rows.slice(0, request.limit).map(mapRow);
        if (previous) selected.reverse();
        return Object.freeze({ items: Object.freeze(selected), hasMore });
    }
}
