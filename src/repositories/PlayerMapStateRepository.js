export default class PlayerMapStateRepository {
    async get(database, playerId, options = {}) {
        const lockClause = options.forUpdate ? ' FOR UPDATE' : '';
        const result = await database.query(
            `SELECT player_id, current_map_id, movement_version, moved_at
             FROM player_map_states
             WHERE player_id = $1${lockClause}`,
            [playerId]
        );
        if (!result.rowCount) return null;
        return {
            playerId: result.rows[0].player_id,
            currentMapId: result.rows[0].current_map_id,
            movementVersion: String(result.rows[0].movement_version),
            movedAt: result.rows[0].moved_at
        };
    }

    async setCurrentMap(database, payload) {
        const result = await database.query(
            `INSERT INTO player_map_states (
                player_id, current_map_id, movement_version, moved_at
             ) VALUES ($1, $2, 0, $3)
             ON CONFLICT (player_id)
             DO UPDATE SET current_map_id = EXCLUDED.current_map_id,
                           movement_version = player_map_states.movement_version + 1,
                           moved_at = EXCLUDED.moved_at,
                           updated_at = CURRENT_TIMESTAMP
             RETURNING player_id, current_map_id, movement_version, moved_at`,
            [payload.playerId, payload.mapId, payload.movedAt || new Date()]
        );
        return {
            playerId: result.rows[0].player_id,
            currentMapId: result.rows[0].current_map_id,
            movementVersion: String(result.rows[0].movement_version),
            movedAt: result.rows[0].moved_at
        };
    }

    async recordMovement(database, payload) {
        const result = await database.query(
            `INSERT INTO player_map_movements (
                player_id, operation_id, from_map_id, to_map_id, direction, moved_at
             ) VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (operation_id) DO NOTHING
             RETURNING id`,
            [
                payload.playerId,
                payload.operationId,
                payload.fromMapId || null,
                payload.toMapId,
                payload.direction,
                payload.movedAt || new Date()
            ]
        );
        return result.rowCount > 0;
    }
}
