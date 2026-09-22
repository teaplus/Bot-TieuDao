import assert from 'node:assert/strict';
import DatabaseQueryMetrics from '../platform/database/DatabaseQueryMetrics.js';

const ticks = [0, 50, 100, 450, 500, 900];
const slowEvents = [];
const metrics = new DatabaseQueryMetrics({
    slowThresholdMs: 250,
    clock: { now: () => ticks.shift() },
    onSlowQuery: (event) => slowEvents.push(event)
});

await metrics.measure('player.findById', async () => ({ id: 'p1' }));
await assert.rejects(
    () => metrics.measure('activity.complete', async () => { throw new Error('DB_FAILURE'); }),
    /DB_FAILURE/
);
await metrics.measure('player.findById', async () => ({ id: 'p2' }));

const snapshot = metrics.snapshot();
const player = snapshot.find(({ operationName }) => operationName === 'player.findById');
const activity = snapshot.find(({ operationName }) => operationName === 'activity.complete');
assert.deepEqual(player, {
    operationName: 'player.findById', count: 2, failureCount: 0, slowCount: 1,
    totalDurationMs: 450, maxDurationMs: 400, averageDurationMs: 225
});
assert.deepEqual(activity, {
    operationName: 'activity.complete', count: 1, failureCount: 1, slowCount: 1,
    totalDurationMs: 350, maxDurationMs: 350, averageDurationMs: 350
});
assert.equal(slowEvents.length, 2);
assert(slowEvents.every((event) => !Object.hasOwn(event, 'sql') && !Object.hasOwn(event, 'params')));
assert(Object.isFrozen(snapshot) && snapshot.every(Object.isFrozen));
assert.throws(() => new DatabaseQueryMetrics(), /DB_SLOW_QUERY_THRESHOLD_REQUIRED/);

console.log(JSON.stringify({ status: 'PASS', checks: {
    stableOperationNames: true,
    noSqlParameters: true,
    failuresMeasured: true,
    slowQueriesMeasured: true,
    snapshot
} }, null, 2));
