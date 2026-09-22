import fs from 'fs';
import CultivationLeaderboardRepository from '../repositories/CultivationLeaderboardRepository.js';
import CultivationLeaderboardService, { LEADERBOARD_REFRESH_INTERVAL_MS } from '../gameplay/leaderboard/CultivationLeaderboardService.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const sqlCalls = [];
const database = {
    async query(text, values = []) {
        sqlCalls.push({ text, values });
        if (text.includes('SELECT rank')) return { rows: [] };
        return { rows: [] };
    }
};
const repositoryUnderAudit = new CultivationLeaderboardRepository({ database });
await repositoryUnderAudit.replaceSnapshot(database, [
    { id: 1, order: 10, name: 'Realm One' },
    { id: 2, order: 20, name: 'Realm Two' }
], '2026-07-17T00:00:00.000Z');
await repositoryUnderAudit.listPage({ limit: 20, cursor: null }, database);

const deleteCallIndex = sqlCalls.findIndex((call) => call.text
    === 'DELETE FROM cultivation_leaderboard_entries');
const insertCallIndex = sqlCalls.findIndex((call) => call.text
    .includes('ORDER BY player.rebirth_count DESC'));
const refreshSql = sqlCalls[insertCallIndex].text;
const pageSql = sqlCalls.find((call) => call.text.includes('SELECT rank')).text;
const migrationSql = fs.readFileSync(new URL('../database/migrations/015_cultivation_leaderboard.sql', import.meta.url), 'utf8');
const rebirthProjectionSql = fs.readFileSync(
    new URL('../database/migrations/017_rebirth_leaderboard_projection.sql', import.meta.url),
    'utf8'
);
assert(refreshSql.includes('ORDER BY player.rebirth_count DESC'),
    'Rebirth count must be the primary leaderboard ordering key');
assert(refreshSql.includes('realm.realm_order DESC'), 'Realm order must drive leaderboard ranking');
assert(refreshSql.includes('player.realm_stage DESC'), 'Realm stage must drive leaderboard ranking');
assert((refreshSql.match(/COALESCE\(player\.cultivation, 0\) DESC/g) || []).length === 2,
    'Cultivation must be null-safe in rank window and final ordering');
assert(refreshSql.includes('player.id ASC'), 'Player ID must be deterministic tie-breaker');
assert(refreshSql.includes('LIMIT 100'), 'Read model must retain only top 100');
assert(deleteCallIndex >= 0 && insertCallIndex > deleteCallIndex,
    'Leaderboard snapshot must delete before insert within the service transaction');
assert(!refreshSql.includes('cleared AS'),
    'Leaderboard snapshot must not delete and reinsert the same table in one CTE statement');
assert(!pageSql.toUpperCase().includes('OFFSET'), 'Leaderboard page query must not use OFFSET');
assert(migrationSql.includes('CHECK (rank BETWEEN 1 AND 100)'), 'Migration must enforce top-100 rank bounds');
assert(migrationSql.includes('cultivation_leaderboard_state'), 'Migration must persist refresh state');
assert(rebirthProjectionSql.includes('ADD COLUMN IF NOT EXISTS rebirth_count NUMERIC'),
    'Rebirth projection migration must persist arbitrary-size count');

let refreshedAt = null;
let capturedDefinitions = null;
const fakeRepository = {
    async getRefreshState(_database, options = {}) {
        assert(!options.forUpdate || _database?.transaction, 'Refresh state must lock inside transaction');
        return { refreshedAt };
    },
    async replaceSnapshot(_database, definitions, timestamp) {
        capturedDefinitions = definitions;
        refreshedAt = timestamp;
    },
    async listPage() {
        return {
            items: Object.freeze([
                Object.freeze({ rank: 1, playerId: 'p1', displayName: 'Player One', rebirthCount: '12', realmName: 'Realm Two', stage: 9 }),
                Object.freeze({ rank: 2, playerId: 'p2', displayName: 'Player Two', rebirthCount: '11', realmName: 'Realm One', stage: 10 })
            ]),
            hasMore: true
        };
    }
};
const now = new Date('2026-07-17T12:00:00.000Z');
const service = new CultivationLeaderboardService({
    repository: fakeRepository,
    unitOfWork: { execute: (work) => work({ transaction: true }) },
    gameDataManager: {
        getCollection: () => ({
            1: { id: 1, order: 10, name: 'Realm One' },
            2: { id: 2, order: 20, name: 'Realm Two' }
        })
    },
    timeProvider: { now: () => now }
});

const refresh = await service.refreshIfDue();
const skipped = await service.refreshIfDue();
const page = await service.list({ limit: 2 });
assert(refresh.status === 'REFRESHED' && skipped.status === 'SKIPPED', 'Five-minute refresh gate failed');
assert(LEADERBOARD_REFRESH_INTERVAL_MS === 300000, 'Refresh interval must be five minutes');
assert(capturedDefinitions[1].order === 20, 'Realm definitions must come from GameData');
assert(page.nextCursor && page.previousCursor === null, 'First keyset page cursor contract failed');
assert(Object.keys(page.items[0]).sort().join(',') === 'displayName,rank,realmName,rebirthCount,stage', 'Public allowlist leaked fields', page.items[0]);

let staleCode = null;
try {
    const staleCursor = service.cursorCodec.encode({ direction: 'NEXT', sortValue: 1, id: 'p1', context: 'old-snapshot' });
    await service.list({ cursor: staleCursor });
} catch (error) {
    staleCode = error.code;
}
assert(staleCode === 'LEADERBOARD_CURSOR_STALE', 'Stale snapshot cursor must be rejected');

console.log(JSON.stringify({
    status: 'PASS',
    checks: {
        dataDrivenRealmOrder: true,
        deterministicRanking: true,
        rebirthFirstOrdering: true,
        topLimit: 100,
        refreshIntervalMs: LEADERBOARD_REFRESH_INTERVAL_MS,
        keysetWithoutOffset: true,
        publicAllowlist: Object.keys(page.items[0]).sort()
    }
}, null, 2));
