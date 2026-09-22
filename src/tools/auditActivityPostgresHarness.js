import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, '../..');
const harnessSource = fs.readFileSync(
    path.join(currentDirectory, 'verifyActivityPostgres.js'),
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

assert(harnessSource.includes("environment.ACTIVITY_TEST_DATABASE_URL || ''"),
    'Activity harness must require an explicit test database URL');
assert(harnessSource.includes('ACTIVITY_TEST_DATABASE_MUST_DIFFER_FROM_PRIMARY'),
    'Activity harness must reject the primary database identity');
assert(harnessSource.includes("const TEST_SCHEMA_PREFIX = 'activity_verify_'"),
    'Activity harness must use a controlled isolated-schema prefix');
assert(harnessSource.includes('schemaName.startsWith(TEST_SCHEMA_PREFIX)')
    && harnessSource.includes('DROP SCHEMA IF EXISTS'),
'Activity harness cleanup must be prefix-guarded');

for (const migration of [
    '009_reward_claim_foundation.sql',
    '010_activity_run_foundation.sql',
    '011_gathering_lazy_activity.sql',
    '012_activity_progress_projection.sql'
]) {
    assert(harnessSource.includes(migration),
        'Activity harness does not require every activity migration', { migration });
}

assert(harnessSource.includes('EXPLORATION_RESERVE_IDEMPOTENCY_INVALID')
    && harnessSource.includes('EXPLORATION_CRASH_STATE_NOT_DURABLE')
    && harnessSource.includes('EXPLORATION_COMPLETION_IDEMPOTENCY_INVALID'),
'Activity harness must verify Exploration reserve, crash state and completion');
assert(harnessSource.includes('SECRET_REALM_TICKET_ROLLBACK_NOT_ATOMIC')
    && harnessSource.includes('SECRET_REALM_ONE_TICKET_RACE_INVALID')
    && harnessSource.includes('SECRET_REALM_COMPLETION_IDEMPOTENCY_INVALID'),
'Activity harness must verify Secret Realm rollback, ticket race and completion');
assert(harnessSource.includes('GATHERING_ACTIVE_RUN_RACE_INVALID')
    && harnessSource.includes('GATHERING_EARLY_CLAIM_ROLLBACK_INVALID')
    && harnessSource.includes('GATHERING_CLAIM_ATOMICITY_INVALID'),
'Activity harness must verify Gathering start race, early rollback and claim atomicity');
assert((harnessSource.match(/Promise\.all(?:Settled)?\(/g) || []).length >= 6,
    'Activity harness must exercise concurrent start and completion requests');
assert(harnessSource.includes("throw new Error('VERIFY_SECRET_REALM_ROLLBACK')"),
    'Activity harness must force failure after ticket debit to verify rollback');

assert(packageJson.scripts?.['verify:activity:postgres']
    === 'node src/tools/verifyActivityPostgres.js',
'Activity PostgreSQL verification script is not registered');
assert(packageJson.scripts?.['audit:activity-postgres-harness']
    === 'node src/tools/auditActivityPostgresHarness.js',
'Activity harness audit script is not registered');

console.log(JSON.stringify({
    status: 'PASS',
    checks: {
        explicitTestDatabaseUrl: true,
        primaryDatabaseRejected: true,
        isolatedSchemaCleanup: true,
        migrations: ['009', '010', '011', '012'],
        explorationLifecycle: true,
        secretRealmRollbackAndRace: true,
        gatheringClaimRace: true
    }
}, null, 2));
