import fs from 'fs';
import PlayerMapStateRepository from '../repositories/PlayerMapStateRepository.js';

function assert(condition, message, details = null) {
    if (!condition) {
        const error = new Error(message);
        error.details = details;
        throw error;
    }
}

async function auditRepository() {
    const statements = [];
    const database = {
        async query(sql, params) {
            const statement = sql.replace(/\s+/g, ' ').trim();
            statements.push({ statement, params });
            if (statement.startsWith('SELECT player_id')) {
                return {
                    rowCount: 1,
                    rows: [{
                        player_id: 'map-player',
                        current_map_id: 'THANH_VAN_SON_MACH',
                        movement_version: '2',
                        moved_at: new Date('2026-07-21T00:00:00.000Z')
                    }]
                };
            }
            if (statement.startsWith('INSERT INTO player_map_states')) {
                return {
                    rowCount: 1,
                    rows: [{
                        player_id: params[0],
                        current_map_id: params[1],
                        movement_version: '3',
                        moved_at: params[2]
                    }]
                };
            }
            return { rowCount: 1, rows: [{ id: '1' }] };
        }
    };
    const repository = new PlayerMapStateRepository();
    const state = await repository.get(database, 'map-player', { forUpdate: true });
    const moved = await repository.setCurrentMap(database, {
        playerId: 'map-player',
        mapId: 'HUYEN_MOC_QUOC',
        movedAt: new Date('2026-07-21T00:01:00.000Z')
    });
    const recorded = await repository.recordMovement(database, {
        playerId: 'map-player',
        operationId: 'move-operation',
        fromMapId: 'THANH_VAN_SON_MACH',
        toMapId: 'HUYEN_MOC_QUOC',
        direction: 'HIGHER'
    });

    assert(state.currentMapId === 'THANH_VAN_SON_MACH' && state.movementVersion === '2',
        'Map state read mapping is invalid', state);
    assert(moved.currentMapId === 'HUYEN_MOC_QUOC' && moved.movementVersion === '3',
        'Map state upsert mapping is invalid', moved);
    assert(recorded, 'Movement audit row was not recorded');
    assert(statements[0].statement.endsWith('FOR UPDATE'),
        'Map mutation must support row locking', statements[0]);
    assert(statements.some(({ statement }) => statement.includes('ON CONFLICT (operation_id) DO NOTHING')),
        'Movement audit must be operation-idempotent', statements);
}

try {
    const migration = fs.readFileSync(
        new URL('../database/migrations/021_player_map_state.sql', import.meta.url),
        'utf8'
    );
    assert(migration.includes('CREATE TABLE IF NOT EXISTS player_map_states'),
        'Player map state table migration is missing');
    assert(migration.includes('current_map_id VARCHAR(80) NOT NULL'),
        'Current map must not be nullable once state exists');
    assert(migration.includes('operation_id TEXT NOT NULL UNIQUE'),
        'Map movement history lacks operation idempotency');
    assert(migration.includes("'HIGHER', 'LOWER'"),
        'Movement direction contract is missing');
    await auditRepository();
    console.log(JSON.stringify({
        status: 'PASS',
        persistence: 'PLAYER_CURRENT_MAP',
        routePolicy: 'REALM_ORDER_1_TO_15'
    }, null, 2));
} catch (error) {
    console.error(JSON.stringify({
        status: 'FAIL',
        message: error instanceof Error ? error.message : String(error),
        details: error?.details || null
    }, null, 2));
    process.exitCode = 1;
}
