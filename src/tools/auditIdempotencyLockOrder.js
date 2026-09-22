import IdempotentOperationExecutor from '../platform/idempotency/IdempotentOperationExecutor.js';

function assert(condition, message, details = {}) {
    if (!condition) {
        const error = new Error(message);
        error.details = details;
        throw error;
    }
}

function createExecutor(events, reservation) {
    const client = {
        async query(sql, params) {
            events.push({ type: 'PLAYER_LOCK', sql: String(sql), params });
            return { rowCount: 1, rows: [{ id: params[0] }] };
        }
    };
    return new IdempotentOperationExecutor({
        unitOfWork: {
            async execute(work) {
                events.push({ type: 'BEGIN' });
                const result = await work(client);
                events.push({ type: 'COMMIT' });
                return result;
            }
        },
        idempotencyRepository: {
            async reserve(_client, payload) {
                events.push({ type: 'IDEMPOTENCY_RESERVE', payload });
                return reservation;
            },
            async complete(_client, payload) {
                events.push({ type: 'IDEMPOTENCY_COMPLETE', payload });
            }
        }
    });
}

const operation = {
    operationId: 'lock-order-operation',
    playerId: 'lock-order-player',
    operationType: 'LOCK_ORDER_AUDIT',
    requestHash: 'lock-order-request-hash'
};

const mutationEvents = [];
const mutationExecutor = createExecutor(mutationEvents, { status: 'RESERVED' });
const mutationResult = await mutationExecutor.execute(operation, async () => {
    mutationEvents.push({ type: 'DOMAIN_WORK' });
    return { outcome: 'SUCCESS' };
});
const mutationOrder = mutationEvents.map((event) => event.type);
assert(mutationOrder.join(',')
    === 'BEGIN,PLAYER_LOCK,IDEMPOTENCY_RESERVE,DOMAIN_WORK,IDEMPOTENCY_COMPLETE,COMMIT',
'Idempotent mutation lock order is invalid', { mutationOrder });
assert(mutationEvents[1].sql === 'SELECT id FROM players WHERE id = $1 FOR UPDATE'
    && mutationEvents[1].params[0] === operation.playerId,
'Idempotent executor did not lock the canonical Player row');
assert(mutationResult.outcome === 'SUCCESS', 'Idempotent executor changed mutation response');

const replayEvents = [];
const replayExecutor = createExecutor(replayEvents, {
    status: 'COMPLETED',
    response: { outcome: 'SUCCESS' }
});
const replayResult = await replayExecutor.execute(operation, async () => {
    replayEvents.push({ type: 'UNEXPECTED_WORK' });
    return { outcome: 'INVALID' };
});
const replayOrder = replayEvents.map((event) => event.type);
assert(replayOrder.join(',') === 'BEGIN,PLAYER_LOCK,IDEMPOTENCY_RESERVE,COMMIT',
    'Idempotent replay lock order is invalid', { replayOrder });
assert(replayResult.outcome === 'SUCCESS' && replayResult.idempotentReplay === true,
    'Idempotent replay response changed');

console.log(JSON.stringify({
    status: 'PASS',
    checks: {
        lockOrder: ['PLAYER', 'IDEMPOTENCY', 'DOMAIN'],
        playerLockSql: true,
        mutationCompleted: true,
        replaySkippedWork: true
    }
}, null, 2));
