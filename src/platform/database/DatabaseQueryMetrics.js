function createEntry(operationName) {
    return {
        operationName,
        count: 0,
        failureCount: 0,
        slowCount: 0,
        totalDurationMs: 0,
        maxDurationMs: 0
    };
}

export default class DatabaseQueryMetrics {
    constructor(options = {}) {
        if (!Number.isFinite(options.slowThresholdMs) || options.slowThresholdMs <= 0) {
            throw new Error('DB_SLOW_QUERY_THRESHOLD_REQUIRED');
        }
        this.slowThresholdMs = Number(options.slowThresholdMs);
        this.clock = options.clock || { now: () => performance.now() };
        this.onSlowQuery = options.onSlowQuery || (() => {});
        this.telemetry = options.telemetry || null;
        this.entries = new Map();
    }

    async measure(operationName, work) {
        if (!operationName || typeof work !== 'function') throw new Error('DB_QUERY_MEASUREMENT_INVALID');
        const startedAt = this.clock.now();
        let failed = false;
        try {
            return await work();
        } catch (error) {
            failed = true;
            throw error;
        } finally {
            const durationMs = Math.max(0, Number(this.clock.now() - startedAt));
            this.record(operationName, durationMs, failed);
        }
    }

    record(operationName, durationMs, failed = false) {
        const name = String(operationName);
        const entry = this.entries.get(name) || createEntry(name);
        entry.count += 1;
        entry.failureCount += failed ? 1 : 0;
        entry.totalDurationMs += durationMs;
        entry.maxDurationMs = Math.max(entry.maxDurationMs, durationMs);
        if (durationMs >= this.slowThresholdMs) {
            entry.slowCount += 1;
            this.onSlowQuery(Object.freeze({ operationName: name, durationMs, failed }));
        }
        this.entries.set(name, entry);
        try {
            this.telemetry?.recordDatabaseOperation({ operationName: name, durationMs, failed });
        } catch {
            // Telemetry is best-effort and cannot change database correctness.
        }
    }

    snapshot() {
        return Object.freeze([...this.entries.values()].map((entry) => Object.freeze({
            ...entry,
            averageDurationMs: entry.count ? Number((entry.totalDurationMs / entry.count).toFixed(3)) : 0
        })));
    }
}
