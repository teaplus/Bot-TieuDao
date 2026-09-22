import IntervalScheduler from '../platform/scheduler/IntervalScheduler.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const intervals = [];
const cleared = [];
const timer = {
    setInterval(callback, intervalMs) {
        const handle = { callback, intervalMs, unrefCalled: false, unref() { this.unrefCalled = true; } };
        intervals.push(handle);
        return handle;
    },
    clearInterval(handle) { cleared.push(handle); }
};
let releaseLongTask;
let runCount = 0;
const errors = [];
const scheduler = new IntervalScheduler({ timer, onTaskError: (event) => errors.push(event) });
scheduler.register({
    id: 'leaderboard-refresh',
    intervalMs: 300000,
    runOnStart: true,
    task: async () => { runCount += 1; return 'REFRESHED'; }
});
scheduler.register({
    id: 'long-task',
    intervalMs: 1000,
    keepProcessAlive: true,
    task: () => new Promise((resolve) => { releaseLongTask = resolve; })
});
scheduler.register({
    id: 'failing-task',
    intervalMs: 1000,
    task: async () => { const error = new Error('secret database detail'); error.code = 'SAFE_FAILURE'; throw error; }
});

const started = await scheduler.start();
assert(started.taskCount === 3 && runCount === 1, 'runOnStart contract failed', started);
assert(intervals[0].intervalMs === 300000 && intervals[0].unrefCalled, 'Gateway timer registration failed');
assert(!intervals[1].unrefCalled, 'Dedicated worker timer must keep its process alive');

const running = scheduler.trigger('long-task');
const overlap = await scheduler.trigger('long-task');
assert(overlap.status === 'SKIPPED_OVERLAP', 'Overlapping task was not skipped');
releaseLongTask('DONE');
await running;

const failure = await scheduler.trigger('failing-task');
assert(failure.status === 'FAILED' && failure.errorCode === 'SAFE_FAILURE', 'Failure result must be sanitized');
assert(errors[0].errorCode === 'SAFE_FAILURE' && !JSON.stringify(errors).includes('secret'), 'Error callback leaked details');

const stopped = scheduler.stop();
const status = scheduler.getStatus();
assert(stopped.taskCount === 3 && cleared.length === 3 && !status.started, 'Scheduler stop failed');
assert(status.tasks.find((task) => task.id === 'long-task').skippedOverlapCount === 1, 'Overlap metric missing');

console.log(JSON.stringify({
    status: 'PASS',
    checks: {
        triggerOnly: true,
        runOnStart: true,
        leaderboardIntervalMs: intervals[0].intervalMs,
        overlapProtection: true,
        sanitizedFailure: true,
        cleanStop: true
    }
}, null, 2));
