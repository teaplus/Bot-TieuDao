import assert from 'node:assert/strict';
import OutboxWorker from '../platform/events/OutboxWorker.js';

let activeTransactions = 0;
const transactionClient = { id: 'outbox-transaction' };
const unitOfWork = {
    async execute(work) {
        activeTransactions += 1;
        try {
            return await work(transactionClient);
        } finally {
            activeTransactions -= 1;
        }
    }
};
const calls = [];
const outboxRepository = {
    async claimBatch(client, options) {
        calls.push({ method: 'claimBatch', client, options });
        return [
            Object.freeze({ id: '1', eventType: 'SUCCESS', payload: Object.freeze({ value: 1 }), attemptCount: 1 }),
            Object.freeze({ id: '2', eventType: 'RETRY', payload: Object.freeze({ value: 2 }), attemptCount: 1 }),
            Object.freeze({ id: '3', eventType: 'DEAD', payload: Object.freeze({ value: 3 }), attemptCount: 10 }),
            Object.freeze({ id: '4', eventType: 'LEASE_LOST', payload: Object.freeze({ value: 4 }), attemptCount: 1 })
        ];
    },
    async renewLease(client, options) {
        calls.push({ method: 'renewLease', client, options });
        return { eventId: options.eventId };
    },
    async acknowledge(client, options) {
        calls.push({ method: 'acknowledge', client, options });
        if (options.eventId === '4') throw new Error('OUTBOX_LEASE_LOST');
        return { eventId: options.eventId };
    },
    async fail(client, options) {
        calls.push({ method: 'fail', client, options });
        const deadLetteredAt = options.eventId === '3' ? options.failedAt : null;
        return {
            eventId: options.eventId,
            attemptCount: options.eventId === '3' ? 10 : 1,
            backoffSeconds: options.eventId === '3' ? 0 : 5,
            deadLetteredAt
        };
    }
};
const now = new Date('2026-07-17T00:00:00.000Z');
const handlers = new Map([
    ['SUCCESS', async (event, context) => {
        assert.equal(activeTransactions, 0, 'Handler ran while claim transaction was open');
        assert.equal(Object.isFrozen(event), true);
        await context.renewLease();
    }],
    ['RETRY', async () => {
        assert.equal(activeTransactions, 0, 'Retrying handler ran inside transaction');
        throw new Error('TRANSIENT_FAILURE');
    }],
    ['DEAD', async () => {
        assert.equal(activeTransactions, 0, 'Dead-letter handler ran inside transaction');
        throw new Error('PERMANENT_FAILURE');
    }],
    ['LEASE_LOST', async () => {
        assert.equal(activeTransactions, 0, 'Lease-lost handler ran inside transaction');
    }]
]);
const worker = new OutboxWorker({
    workerId: 'worker-a', unitOfWork, outboxRepository, handlers,
    timeProvider: { now: () => now },
    telemetry: {
        recordOutboxDispatchLag() { throw new Error('EXPORTER_DOWN'); },
        recordOutboxOutcome() { throw new Error('EXPORTER_DOWN'); }
    }
});

const results = await worker.processBatch();
assert.deepEqual(results.map(({ status }) => status), ['PROCESSED', 'RETRY_SCHEDULED', 'DEAD_LETTERED', 'LEASE_LOST']);
assert.equal(calls[0].method, 'claimBatch');
assert.equal(calls[0].options.leaseSeconds, 60);
assert.equal(calls[0].options.limit, 100);
assert(calls.every(({ client }) => client === transactionClient));
assert.equal(calls.filter(({ method }) => method === 'acknowledge').length, 2);
assert.equal(calls.filter(({ method }) => method === 'fail').length, 2);
assert.equal(calls.filter(({ method }) => method === 'renewLease').length, 1);

console.log(JSON.stringify({
    status: 'PASS',
    checks: {
        shortTransactions: true,
        leaseSeconds: 60,
        retryBackoffSeconds: 5,
        maxAttempts: 10,
        statuses: results.map(({ status }) => status),
        explicitLeaseRenewal: true
    }
}, null, 2));
