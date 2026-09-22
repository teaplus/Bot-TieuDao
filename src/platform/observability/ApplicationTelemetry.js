import NoOpMetricsAdapter from './NoOpMetricsAdapter.js';

export default class ApplicationTelemetry {
    constructor(options = {}) {
        this.adapter = options.adapter || new NoOpMetricsAdapter();
        this.clock = options.clock || { now: () => performance.now() };
        this.onAdapterError = options.onAdapterError || (() => {});
    }

    setAdapter(adapter) {
        if (!adapter || typeof adapter !== 'object') throw new Error('TELEMETRY_ADAPTER_REQUIRED');
        this.adapter = adapter;
        return this;
    }

    async measureUseCase(definition, work) {
        if (!definition?.operationName || typeof work !== 'function') {
            throw new Error('USE_CASE_MEASUREMENT_INVALID');
        }
        const startedAt = this.clock.now();
        let failed = false;
        try {
            return await work();
        } catch (error) {
            failed = true;
            throw error;
        } finally {
            this.safeRecord('recordUseCase', {
                operationName: definition.operationName,
                operationType: definition.operationType,
                durationMs: Math.max(0, Number(this.clock.now() - startedAt)),
                failed
            });
        }
    }

    recordDatabaseOperation(measurement) {
        this.safeRecord('recordDatabaseOperation', measurement);
    }

    recordOutboxDispatchLag(measurement) {
        this.safeRecord('recordOutboxDispatchLag', measurement);
    }

    recordOutboxOutcome(measurement) {
        this.safeRecord('recordOutboxOutcome', measurement);
    }

    safeRecord(method, measurement) {
        try {
            this.adapter[method]?.(Object.freeze({ ...measurement }));
        } catch {
            this.onAdapterError(Object.freeze({ method, errorCode: 'TELEMETRY_ADAPTER_FAILED' }));
        }
    }
}
