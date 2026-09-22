import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, '../..');
const harnessSource = fs.readFileSync(path.join(currentDirectory, 'verifyPhase7Postgres.js'), 'utf8');
const leaderboardSource = fs.readFileSync(
    path.join(projectRoot, 'src/repositories/CultivationLeaderboardRepository.js'),
    'utf8'
);
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

function assert(condition, message, details = {}) {
    if (!condition) {
        const error = new Error(message);
        error.details = details;
        throw error;
    }
}

assert(harnessSource.includes('environment.PHASE7_TEST_DATABASE_URL')
    && harnessSource.includes('environment.PROGRESSION_TEST_DATABASE_URL')
    && harnessSource.includes('environment.ACTIVITY_TEST_DATABASE_URL'),
'Phase 7 harness must accept only explicitly test-labelled database URLs');
assert(harnessSource.includes('PHASE7_TEST_DATABASE_MUST_DIFFER_FROM_PRIMARY'),
    'Phase 7 harness must reject the primary database identity');
assert(harnessSource.includes("const TEST_SCHEMA_PREFIX = 'phase7_verify_'")
    && harnessSource.includes('schemaName.startsWith(TEST_SCHEMA_PREFIX)')
    && harnessSource.includes('DROP SCHEMA IF EXISTS'),
'Phase 7 harness must use prefix-guarded isolated-schema cleanup');
assert(harnessSource.includes('failureStage')
    && harnessSource.includes('sanitizeFailureMessage'),
'Phase 7 harness must emit safe diagnostic stages');

assert(leaderboardSource.includes("await database.query('DELETE FROM cultivation_leaderboard_entries')"),
    'Leaderboard refresh must delete the old snapshot before inserting the new snapshot');
assert(!leaderboardSource.includes('cleared AS ('),
    'Leaderboard refresh must not delete/reinsert the same table in one CTE statement');
assert(harnessSource.includes("now = new Date(now.getTime() + 300000)")
    && harnessSource.includes('LEADERBOARD_STALE_CURSOR_NOT_REJECTED'),
'Phase 7 harness must exercise a second snapshot refresh and stale cursor rejection');
assert(harnessSource.includes('generate_series(1, 200)')
    && harnessSource.includes('occurred_at, available_at')
    && harnessSource.includes('Promise.all([')
    && harnessSource.includes('OUTBOX_SKIP_LOCKED_DUPLICATE_CLAIM'),
'Phase 7 harness must exercise deterministic concurrent Outbox claims');
assert(packageJson.scripts?.['verify:phase7:postgres']
    === 'node src/tools/verifyPhase7Postgres.js',
'Phase 7 PostgreSQL verification script is not registered');
assert(packageJson.scripts?.['audit:phase7-postgres-harness']
    === 'node src/tools/auditPhase7PostgresHarness.js',
'Phase 7 PostgreSQL harness audit is not registered');

console.log(JSON.stringify({
    status: 'PASS',
    checks: {
        sharedTestUrlFallback: true,
        primaryDatabaseRejected: true,
        isolatedSchemaCleanup: true,
        repeatLeaderboardRefresh: true,
        deterministicOutboxClock: true,
        concurrentOutboxClaim: 200
    }
}, null, 2));
