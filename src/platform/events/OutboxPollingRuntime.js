import IntervalScheduler from '../scheduler/IntervalScheduler.js';

export const OUTBOX_POLL_INTERVAL_MS = 1000;
export const OUTBOX_BATCH_SIZE = 100;

export default class OutboxPollingRuntime {
    constructor(options = {}) {
        if (!options.worker) throw new Error('OUTBOX_POLLING_WORKER_REQUIRED');
        this.worker = options.worker;
        this.scheduler = options.scheduler || new IntervalScheduler({ onTaskError: options.onTaskError });
        this.scheduler.register({
            id: 'outbox-process-batch',
            intervalMs: OUTBOX_POLL_INTERVAL_MS,
            runOnStart: true,
            keepProcessAlive: true,
            task: () => this.worker.processBatch()
        });
    }

    start() {
        return this.scheduler.start();
    }

    stop() {
        return this.scheduler.stop();
    }

    getStatus() {
        return this.scheduler.getStatus();
    }
}
