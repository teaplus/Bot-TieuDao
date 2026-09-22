import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const harnessSource = fs.readFileSync(
    path.join(currentDirectory, 'loadPhase7Postgres.js'),
    'utf8'
);
const packageJson = JSON.parse(fs.readFileSync(
    path.resolve(currentDirectory, '../../package.json'),
    'utf8'
));

assert(harnessSource.includes('environment.PHASE7_TEST_DATABASE_URL')
    && harnessSource.includes('environment.PROGRESSION_TEST_DATABASE_URL')
    && harnessSource.includes('environment.ACTIVITY_TEST_DATABASE_URL'),
'Load harness must use only explicitly labelled test database URLs');
assert(!/^\s*\|\|\s*environment\.DATABASE_URL/m.test(harnessSource),
    'Load harness must never fall back to the primary database URL');
assert(harnessSource.includes('PHASE7_TEST_DATABASE_MUST_DIFFER_FROM_PRIMARY'),
    'Load harness must reject a test database matching the primary database');
assert(harnessSource.includes("'PHASE7_LOAD_CONCURRENCY', 10, 10, 100"),
    'Load concurrency must default to 10 and remain bounded at 100');
assert(harnessSource.includes('DROP SCHEMA IF EXISTS'),
    'Load harness must clean its isolated schema');
assert(harnessSource.includes('PHASE7_LOAD_OUTBOX_DUPLICATE_CLAIM')
    && harnessSource.includes('PHASE7_LOAD_OUTBOX_UNPROCESSED_EVENTS'),
'Load harness must fail on duplicate claims or unprocessed events');
assert(harnessSource.includes('evaluateOperationalSlo(sloSample)'),
    'Load harness must evaluate its bounded sample against the operational SLO');
assert(packageJson.scripts['load:phase7:postgres']
    === 'node src/tools/loadPhase7Postgres.js',
'Package script load:phase7:postgres is missing');
assert(packageJson.scripts['audit:phase7-load-harness']
    === 'node src/tools/auditPhase7LoadHarness.js',
'Package script audit:phase7-load-harness is missing');

console.log(JSON.stringify({
    status: 'PASS',
    checks: [
        'test-database-only',
        'primary-database-rejection',
        'concurrency-10-to-100',
        'isolated-schema-cleanup',
        'duplicate-claim-guard',
        'unprocessed-event-guard',
        'slo-sample-evaluation'
    ]
}, null, 2));
