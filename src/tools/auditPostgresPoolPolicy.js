import assert from 'node:assert/strict';
import DatabaseQueryMetrics from '../platform/database/DatabaseQueryMetrics.js';
import ObservedPostgresPool from '../platform/database/ObservedPostgresPool.js';
import loadPostgresPoolConfig, { sanitizePostgresPoolConfig } from '../platform/database/loadPostgresPoolConfig.js';

const development = loadPostgresPoolConfig({ NODE_ENV: 'development' });
assert.equal(development.max, 5);
assert.equal(development.idleTimeoutMillis, 30000);
assert.equal(development.connectionTimeoutMillis, 10000);
assert.equal(development.statementTimeoutMillis, 15000);
assert.equal(development.queryTimeoutMillis, 20000);
assert.equal(development.slowQueryThresholdMs, 250);
assert.throws(
    () => loadPostgresPoolConfig({ NODE_ENV: 'production' }),
    /DB_POOL_MAX_REQUIRED_IN_PRODUCTION/
);
const production = loadPostgresPoolConfig({
    NODE_ENV: 'production', DATABASE_URL: 'postgresql://secret', DB_POOL_MAX: '12',
    DB_IDLE_TIMEOUT_MS: '31000', DB_CONNECT_TIMEOUT_MS: '11000',
    DB_STATEMENT_TIMEOUT_MS: '16000', DB_QUERY_TIMEOUT_MS: '21000', DB_SLOW_QUERY_MS: '300'
});
assert.equal(production.max, 12);
assert.equal(production.slowQueryThresholdMs, 300);
const sanitized = sanitizePostgresPoolConfig(production);
assert.equal(sanitized.connectionStringConfigured, true);
assert.equal(Object.hasOwn(sanitized, 'connectionString'), false);
assert.throws(
    () => loadPostgresPoolConfig({ NODE_ENV: 'development', DB_POOL_MAX: '0' }),
    /DB_POOL_MAX_INVALID/
);

const calls = [];
let released = false;
const rawClient = {
    async query(...args) { calls.push(args); return { rows: [] }; },
    release() { released = true; }
};
const rawPool = {
    async connect() { return rawClient; },
    async query(...args) { calls.push(args); return { rows: [] }; },
    on() {},
    async end() {}
};
let tick = 0;
const metrics = new DatabaseQueryMetrics({
    slowThresholdMs: 250,
    clock: { now: () => (tick += 10) }
});
const observed = new ObservedPostgresPool(rawPool, metrics);
await observed.query('SELECT id FROM players WHERE id = $1', ['p1']);
await observed.query({
    operationName: 'player.wallet.lock',
    text: 'SELECT id FROM players WHERE id = $1 FOR UPDATE',
    values: ['p1']
});
const client = await observed.connect();
await client.query('UPDATE players SET name = $1 WHERE id = $2', ['Name', 'p1']);
client.release();
assert.equal(released, true);
assert.deepEqual(calls[0], ['SELECT id FROM players WHERE id = $1', ['p1']]);
assert.equal(calls[1][0].operationName, undefined, 'Custom observability metadata leaked into pg query config');
const operationNames = metrics.snapshot().map(({ operationName }) => operationName);
assert(operationNames.includes('postgres.select.players'));
assert(operationNames.includes('player.wallet.lock'));
assert(operationNames.includes('postgres.pool.connect'));
assert(operationNames.includes('postgres.update.players'));

console.log(JSON.stringify({ status: 'PASS', checks: {
    developmentPoolMax: development.max,
    productionFailFast: true,
    productionPoolMax: production.max,
    sanitizedConfig: sanitized,
    stableOperationNames: operationNames,
    sqlParametersExcludedFromMetrics: true
} }, null, 2));
