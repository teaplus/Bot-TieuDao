const operationalSloPolicy = {
    id: 'operational-slo-mvp-v1',
    measurementWindowDays: 30,
    excludesDiscordTransport: true,
    availabilityPercent: 99.5,
    interactiveLatencyMs: {
        p95: 2000,
        p99: 5000
    },
    mutationLatencyMs: {
        p95: 3000
    },
    internalErrorRatePercent: 1,
    outboxDispatchLagMs: {
        p95: 30000
    },
    alertAfterContinuousViolationMinutes: 5,
    telemetryReviewAfterDays: 14
};

function deepFreeze(value) {
    Object.freeze(value);
    for (const nested of Object.values(value)) {
        if (nested && typeof nested === 'object' && !Object.isFrozen(nested)) deepFreeze(nested);
    }
    return value;
}

export default deepFreeze(operationalSloPolicy);
