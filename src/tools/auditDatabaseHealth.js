import assert from 'node:assert/strict';
import DatabaseHealthService from '../platform/database/DatabaseHealthService.js';

let tick = 0;
const metricsSnapshot = Object.freeze([{ operationName: 'database.health.check', count: 1 }]);
const poolStatus = Object.freeze({ max: 5, total: 3, idle: 2, waiting: 0 });
const healthy = new DatabaseHealthService({
    pool: {
        queryMetrics: { snapshot: () => metricsSnapshot },
        async queryNamed(operationName, sql) {
            assert.equal(operationName, 'database.health.check');
            assert.equal(sql, 'SELECT 1 AS ok');
            return { rows: [{ ok: 1 }] };
        },
        getStatus: () => poolStatus
    },
    clock: { now: () => (tick += 5) }
});
const healthyResult = await healthy.check();
assert.deepEqual(healthyResult, {
    status: 'HEALTHY', durationMs: 5, pool: poolStatus, reason: null
});
assert.equal(healthy.getQueryMetricsSnapshot(), metricsSnapshot);

const unavailable = new DatabaseHealthService({
    pool: {
        async queryNamed() { throw new Error('connection refused secret-host'); },
        getStatus: () => Object.freeze({ max: 5, total: 0, idle: 0, waiting: 2 })
    },
    clock: { now: () => (tick += 5) }
});
const unavailableResult = await unavailable.check();
assert.equal(unavailableResult.status, 'UNHEALTHY');
assert.equal(unavailableResult.reason, 'DATABASE_UNAVAILABLE');
assert.equal(JSON.stringify(unavailableResult).includes('secret-host'), false);
assert(Object.isFrozen(healthyResult) && Object.isFrozen(unavailableResult));

console.log(JSON.stringify({ status: 'PASS', checks: {
    sanitizedHealth: true,
    stableOperationName: true,
    poolSaturationSnapshot: poolStatus,
    queryMetricsSnapshot: true,
    unavailableReason: unavailableResult.reason
} }, null, 2));
