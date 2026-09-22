function defaultTimer() {
    return {
        setInterval: (callback, intervalMs) => setInterval(callback, intervalMs),
        clearInterval: (handle) => clearInterval(handle)
    };
}

export default class IntervalScheduler {
    constructor(options = {}) {
        this.timer = options.timer || defaultTimer();
        this.onTaskError = options.onTaskError || (() => {});
        this.tasks = new Map();
        this.started = false;
    }

    register(definition) {
        if (this.started) throw new Error('SCHEDULER_ALREADY_STARTED');
        const id = String(definition?.id || '');
        const intervalMs = Number(definition?.intervalMs);
        if (!id) throw new Error('SCHEDULER_TASK_ID_REQUIRED');
        if (this.tasks.has(id)) throw new Error(`SCHEDULER_TASK_DUPLICATE:${id}`);
        if (!Number.isSafeInteger(intervalMs) || intervalMs < 1) {
            throw new Error(`SCHEDULER_INTERVAL_INVALID:${id}`);
        }
        if (typeof definition.task !== 'function') throw new Error(`SCHEDULER_TASK_HANDLER_REQUIRED:${id}`);

        this.tasks.set(id, {
            id,
            intervalMs,
            runOnStart: definition.runOnStart === true,
            keepProcessAlive: definition.keepProcessAlive === true,
            task: definition.task,
            running: false,
            handle: null,
            runCount: 0,
            failureCount: 0,
            skippedOverlapCount: 0
        });
        return this;
    }

    async start() {
        if (this.started) return Object.freeze({ status: 'ALREADY_STARTED' });
        this.started = true;
        const initialRuns = [];
        for (const task of this.tasks.values()) {
            task.handle = this.timer.setInterval(() => void this.trigger(task.id), task.intervalMs);
            if (!task.keepProcessAlive) task.handle?.unref?.();
            if (task.runOnStart) initialRuns.push(this.trigger(task.id));
        }
        await Promise.all(initialRuns);
        return Object.freeze({ status: 'STARTED', taskCount: this.tasks.size });
    }

    async trigger(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) throw new Error(`SCHEDULER_TASK_NOT_FOUND:${taskId}`);
        if (task.running) {
            task.skippedOverlapCount += 1;
            return Object.freeze({ taskId, status: 'SKIPPED_OVERLAP' });
        }

        task.running = true;
        try {
            const result = await task.task();
            task.runCount += 1;
            return Object.freeze({ taskId, status: 'COMPLETED', result });
        } catch (error) {
            task.failureCount += 1;
            this.onTaskError(Object.freeze({
                taskId,
                errorCode: error?.code || 'SCHEDULED_TASK_FAILED'
            }));
            return Object.freeze({ taskId, status: 'FAILED', errorCode: error?.code || 'SCHEDULED_TASK_FAILED' });
        } finally {
            task.running = false;
        }
    }

    stop() {
        for (const task of this.tasks.values()) {
            if (task.handle !== null) this.timer.clearInterval(task.handle);
            task.handle = null;
        }
        this.started = false;
        return Object.freeze({ status: 'STOPPED', taskCount: this.tasks.size });
    }

    getStatus() {
        return Object.freeze({
            started: this.started,
            tasks: Object.freeze([...this.tasks.values()].map((task) => Object.freeze({
                id: task.id,
                intervalMs: task.intervalMs,
                runOnStart: task.runOnStart,
                keepProcessAlive: task.keepProcessAlive,
                running: task.running,
                runCount: task.runCount,
                failureCount: task.failureCount,
                skippedOverlapCount: task.skippedOverlapCount
            })))
        });
    }
}
