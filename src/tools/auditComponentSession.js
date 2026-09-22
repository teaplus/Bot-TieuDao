import ComponentSession from '../application/discord/ComponentSession.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

let now = 0;
const waits = [];
let call = 0;
const session = ComponentSession.forMessage({
    interaction: { user: { id: 'owner' } },
    message: {
        async awaitMessageComponent(options) {
            waits.push(options.time);
            call += 1;
            if (call === 1) return { user: { id: 'owner' }, customId: 'test:next' };
            throw new Error('TIMEOUT');
        }
    },
    prefix: 'test:',
    timeoutMs: 600000,
    timeProvider: { now: () => now }
});
let timedOut = false;
await session.run({
    onCollect: async () => { now = 240000; return true; },
    onTimeout: async () => { timedOut = true; }
});

assert(waits[0] === 600000, 'Initial component timeout is incorrect');
assert(waits[1] === 360000, 'Session TTL was reset after collection');
assert(timedOut, 'Timeout cleanup was not called');
assert(session.matches({ user: { id: 'owner' }, customId: 'test:next' }), 'Owner/prefix match failed');
assert(!session.matches({ user: { id: 'other' }, customId: 'test:next' }), 'Foreign user was accepted');

console.log(JSON.stringify({
    status: 'PASS',
    checks: { absoluteSessionTtlMs: 600000, remainingAfterFourMinutesMs: waits[1], ownerOnly: true }
}, null, 2));
