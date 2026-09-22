import operationalSloPolicy from './OperationalSloPolicy.js';

function check(metric, actual, target, comparator) {
    const measured = Number(actual);
    const available = Number.isFinite(measured);
    const passing = available && comparator(measured, target);
    return Object.freeze({ metric, available, passing, actual: available ? measured : null, target });
}

export default function evaluateOperationalSlo(snapshot, policy = operationalSloPolicy) {
    const checks = Object.freeze([
        check('availabilityPercent', snapshot?.availabilityPercent, policy.availabilityPercent, (a, t) => a >= t),
        check('interactiveLatencyMs.p95', snapshot?.interactiveLatencyMs?.p95, policy.interactiveLatencyMs.p95, (a, t) => a <= t),
        check('interactiveLatencyMs.p99', snapshot?.interactiveLatencyMs?.p99, policy.interactiveLatencyMs.p99, (a, t) => a <= t),
        check('mutationLatencyMs.p95', snapshot?.mutationLatencyMs?.p95, policy.mutationLatencyMs.p95, (a, t) => a <= t),
        check('internalErrorRatePercent', snapshot?.internalErrorRatePercent, policy.internalErrorRatePercent, (a, t) => a < t),
        check('outboxDispatchLagMs.p95', snapshot?.outboxDispatchLagMs?.p95, policy.outboxDispatchLagMs.p95, (a, t) => a <= t)
    ]);
    const complete = checks.every((item) => item.available);
    const passing = complete && checks.every((item) => item.passing);
    const violationDurationMinutes = Math.max(0, Number(snapshot?.violationDurationMinutes || 0));

    return Object.freeze({
        policyId: policy.id,
        complete,
        passing,
        alertEligible: complete && !passing
            && violationDurationMinutes >= policy.alertAfterContinuousViolationMinutes,
        violationDurationMinutes,
        checks
    });
}
