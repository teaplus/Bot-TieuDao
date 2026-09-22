import SystemTimeProvider from '../time/SystemTimeProvider.js';

export default class OutboxWorker {
    constructor(options = {}) {
        if (!options.workerId) throw new Error('OUTBOX_WORKER_ID_REQUIRED');
        if (!options.unitOfWork) throw new Error('OUTBOX_UNIT_OF_WORK_REQUIRED');
        if (!options.outboxRepository) throw new Error('OUTBOX_REPOSITORY_REQUIRED');
        this.workerId = options.workerId;
        this.unitOfWork = options.unitOfWork;
        this.outboxRepository = options.outboxRepository;
        this.handlers = options.handlers || new Map();
        this.timeProvider = options.timeProvider || new SystemTimeProvider();
        this.batchSize = Number(options.batchSize || 100);
        this.leaseSeconds = Number(options.leaseSeconds || 60);
        this.baseBackoffSeconds = Number(options.baseBackoffSeconds || 5);
        this.maxBackoffSeconds = Number(options.maxBackoffSeconds || 900);
        this.maxAttempts = Number(options.maxAttempts || 10);
        this.telemetry = options.telemetry || null;
    }

    async processBatch() {
        const events = await this.unitOfWork.execute((client) => (
            this.outboxRepository.claimBatch(client, {
                workerId: this.workerId,
                limit: this.batchSize,
                leaseSeconds: this.leaseSeconds,
                now: this.timeProvider.now()
            })
        ));
        const results = [];
        for (const event of events) {
            const occurredAt = new Date(event.occurredAt).getTime();
            const claimedAt = new Date(this.timeProvider.now()).getTime();
            if (Number.isFinite(occurredAt) && Number.isFinite(claimedAt)) {
                this.recordTelemetry('recordOutboxDispatchLag', {
                    eventType: event.eventType,
                    lagMs: Math.max(0, claimedAt - occurredAt)
                });
            }
            const result = await this.processEvent(event);
            results.push(result);
            this.recordTelemetry('recordOutboxOutcome', { eventType: event.eventType, outcome: result.status });
        }
        return Object.freeze(results);
    }

    async processEvent(event) {
        const handler = this.handlers instanceof Map
            ? this.handlers.get(event.eventType)
            : this.handlers[event.eventType];
        let handlerError = null;
        try {
            if (typeof handler !== 'function') throw new Error(`OUTBOX_HANDLER_NOT_FOUND:${event.eventType}`);
            await handler(event, {
                renewLease: () => this.unitOfWork.execute((client) => (
                    this.outboxRepository.renewLease(client, {
                        eventId: event.id,
                        workerId: this.workerId,
                        renewedAt: this.timeProvider.now()
                    })
                ))
            });
        } catch (error) {
            handlerError = error;
        }

        if (handlerError) {
            return this.recordFailure(event, handlerError);
        }

        try {
            const acknowledgment = await this.unitOfWork.execute((client) => (
                this.outboxRepository.acknowledge(client, {
                    eventId: event.id,
                    workerId: this.workerId,
                    processedAt: this.timeProvider.now()
                })
            ));
            return Object.freeze({ eventId: event.id, status: 'PROCESSED', acknowledgment });
        } catch (error) {
            if (error.message === 'OUTBOX_LEASE_LOST') {
                return Object.freeze({ eventId: event.id, status: 'LEASE_LOST' });
            }
            throw error;
        }
    }

    async recordFailure(event, error) {
        try {
            const failure = await this.unitOfWork.execute((client) => (
                this.outboxRepository.fail(client, {
                    eventId: event.id,
                    workerId: this.workerId,
                    failedAt: this.timeProvider.now(),
                    error,
                    maxAttempts: this.maxAttempts,
                    baseBackoffSeconds: this.baseBackoffSeconds,
                    maxBackoffSeconds: this.maxBackoffSeconds
                })
            ));
            return Object.freeze({
                eventId: event.id,
                status: failure.deadLetteredAt ? 'DEAD_LETTERED' : 'RETRY_SCHEDULED',
                failure
            });
        } catch (failureError) {
            if (failureError.message === 'OUTBOX_LEASE_LOST') {
                return Object.freeze({ eventId: event.id, status: 'LEASE_LOST' });
            }
            throw failureError;
        }
    }

    recordTelemetry(method, measurement) {
        try {
            this.telemetry?.[method]?.(measurement);
        } catch {
            // Telemetry is best-effort and cannot interrupt an already claimed event.
        }
    }
}
