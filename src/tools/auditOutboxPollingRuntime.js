import OutboxPollingRuntime, { OUTBOX_BATCH_SIZE, OUTBOX_POLL_INTERVAL_MS } from '../platform/events/OutboxPollingRuntime.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

let registered;
let processed = 0;
const scheduler = {
    register(definition) { registered = definition; return this; },
    async start() { return { status: 'STARTED' }; },
    stop() { return { status: 'STOPPED' }; },
    getStatus() { return { started: true }; }
};
const runtime = new OutboxPollingRuntime({
    worker: { async processBatch() { processed += 1; return []; } },
    scheduler
});

assert(OUTBOX_POLL_INTERVAL_MS === 1000, 'Outbox poll interval must be one second');
assert(OUTBOX_BATCH_SIZE === 100, 'Outbox batch size must be 100');
assert(registered.runOnStart && registered.keepProcessAlive, 'Dedicated worker lifecycle policy is invalid');
await registered.task();
assert(processed === 1, 'One scheduler tick must process exactly one batch');
assert((await runtime.start()).status === 'STARTED', 'Runtime start failed');
assert(runtime.stop().status === 'STOPPED', 'Runtime stop failed');

console.log(JSON.stringify({
    status: 'PASS',
    checks: {
        separateRuntime: true,
        pollIntervalMs: OUTBOX_POLL_INTERVAL_MS,
        batchSize: OUTBOX_BATCH_SIZE,
        maxBatchesPerTick: 1,
        keepsWorkerAlive: true
    }
}, null, 2));
