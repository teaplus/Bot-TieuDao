const OPERATION_PATTERN = /^[a-z0-9][a-z0-9._-]{0,119}$/;
const USE_CASE_TYPES = new Set(['INTERACTIVE', 'MUTATION', 'BACKGROUND']);

function stableOperationName(value) {
    const name = String(value || '').toLowerCase();
    return OPERATION_PATTERN.test(name) ? name : 'unknown';
}

function stableType(value) {
    const type = String(value || '').toUpperCase();
    return USE_CASE_TYPES.has(type) ? type.toLowerCase() : 'unknown';
}

export default class OpenTelemetryMetricsAdapter {
    constructor(options = {}) {
        const meter = options.meter;
        if (!meter || typeof meter.createCounter !== 'function' || typeof meter.createHistogram !== 'function') {
            throw new Error('OPENTELEMETRY_METER_REQUIRED');
        }
        this.useCaseCount = meter.createCounter('tieudao.application.operation.count', {
            description: 'Application use-case executions', unit: '{operation}'
        });
        this.useCaseFailureCount = meter.createCounter('tieudao.application.operation.failure.count', {
            description: 'Failed application use-case executions', unit: '{operation}'
        });
        this.useCaseDuration = meter.createHistogram('tieudao.application.operation.duration', {
            description: 'Internal application use-case latency excluding Discord transport', unit: 'ms'
        });
        this.databaseDuration = meter.createHistogram('tieudao.database.operation.duration', {
            description: 'PostgreSQL operation latency', unit: 'ms'
        });
        this.databaseFailureCount = meter.createCounter('tieudao.database.operation.failure.count', {
            description: 'Failed PostgreSQL operations', unit: '{operation}'
        });
        this.outboxDispatchLag = meter.createHistogram('tieudao.outbox.dispatch.lag', {
            description: 'Elapsed time from outbox occurrence to worker claim', unit: 'ms'
        });
        this.outboxOutcomeCount = meter.createCounter('tieudao.outbox.outcome.count', {
            description: 'Outbox processing outcomes', unit: '{event}'
        });
    }

    recordUseCase(measurement) {
        const attributes = {
            'operation.name': stableOperationName(measurement.operationName),
            'operation.type': stableType(measurement.operationType)
        };
        this.useCaseCount.add(1, attributes);
        this.useCaseDuration.record(Math.max(0, Number(measurement.durationMs || 0)), attributes);
        if (measurement.failed) this.useCaseFailureCount.add(1, attributes);
    }

    recordDatabaseOperation(measurement) {
        const attributes = { 'operation.name': stableOperationName(measurement.operationName) };
        this.databaseDuration.record(Math.max(0, Number(measurement.durationMs || 0)), attributes);
        if (measurement.failed) this.databaseFailureCount.add(1, attributes);
    }

    recordOutboxDispatchLag(measurement) {
        this.outboxDispatchLag.record(Math.max(0, Number(measurement.lagMs || 0)), {
            'event.type': stableOperationName(measurement.eventType)
        });
    }

    recordOutboxOutcome(measurement) {
        this.outboxOutcomeCount.add(1, {
            'event.type': stableOperationName(measurement.eventType),
            outcome: stableOperationName(measurement.outcome)
        });
    }
}
