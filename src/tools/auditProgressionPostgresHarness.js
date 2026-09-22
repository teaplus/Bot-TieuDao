import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, '../..');
const harnessSource = fs.readFileSync(
    path.join(currentDirectory, 'verifyProgressionPostgres.js'),
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

assert(harnessSource.includes("environment.PROGRESSION_TEST_DATABASE_URL || ''"),
    'Progression harness must require an explicit test database URL');
assert(harnessSource.includes('PROGRESSION_TEST_DATABASE_MUST_DIFFER_FROM_PRIMARY'),
    'Progression harness must reject the primary database identity');
assert(harnessSource.includes("const TEST_SCHEMA_PREFIX = 'progression_verify_'"),
    'Progression harness must use a controlled isolated-schema prefix');
assert(harnessSource.includes('schemaName.startsWith(TEST_SCHEMA_PREFIX)')
    && harnessSource.includes('DROP SCHEMA IF EXISTS'),
'Progression harness cleanup must be prefix-guarded');

for (const migration of [
    '016_rebirth_foundation.sql',
    '017_rebirth_leaderboard_projection.sql',
    '018_spirit_root_progression_foundation.sql',
    '019_spirit_root_quality_cutover.sql'
]) {
    assert(harnessSource.includes(migration),
        'Progression harness does not require every progression migration', { migration });
}

assert((harnessSource.match(/await database\.query\(cutoverSql\);/g) || []).length === 2,
    'Spirit Root cutover must be verified as rerunnable');
assert(harnessSource.includes('SPIRIT_ROOT_QUALITY_NOT_NULL_NOT_ENFORCED')
    && harnessSource.includes('SPIRIT_ROOT_RETRO_ENTITLEMENT_NOT_IDEMPOTENT'),
'Progression harness must verify quality and retro-entitlement cutover invariants');
assert(harnessSource.includes('REBIRTH_IDEMPOTENT_REPLAY_COUNT_INVALID')
    && harnessSource.includes('REBIRTH_DIFFERENT_OPERATION_RACE_INVALID')
    && harnessSource.includes('REBIRTH_AUDIT_ATOMICITY_INVALID'),
'Progression harness must verify Rebirth replay, race and atomic reset');
assert(harnessSource.includes('SPIRIT_ROOT_REROLL_REPLAY_COUNT_INVALID')
    && harnessSource.includes('SPIRIT_ROOT_REROLL_STALE_RACE_INVALID')
    && harnessSource.includes('SPIRIT_ROOT_REROLL_STALE_CONSUMED_NEXT_ENTITLEMENT'),
'Progression harness must verify reroll replay and stale-preview entitlement safety');
assert((harnessSource.match(/Promise\.all\(/g) || []).length >= 4,
    'Progression harness must exercise concurrent requests');

assert(packageJson.scripts?.['verify:progression:postgres']
    === 'node src/tools/verifyProgressionPostgres.js',
'Progression PostgreSQL verification script is not registered');
assert(packageJson.scripts?.['audit:progression-postgres-harness']
    === 'node src/tools/auditProgressionPostgresHarness.js',
'Progression harness audit script is not registered');

console.log(JSON.stringify({
    status: 'PASS',
    checks: {
        explicitTestDatabaseUrl: true,
        primaryDatabaseRejected: true,
        isolatedSchemaCleanup: true,
        migrations: ['016', '017', '018', '019'],
        cutoverRerun: true,
        rebirthConcurrency: true,
        rerollConcurrency: true
    }
}, null, 2));
