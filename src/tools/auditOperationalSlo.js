import operationalSloPolicy from '../platform/observability/OperationalSloPolicy.js';
import evaluateOperationalSlo from '../platform/observability/evaluateOperationalSlo.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const healthy = evaluateOperationalSlo({
    availabilityPercent: 99.7,
    interactiveLatencyMs: { p95: 1800, p99: 4500 },
    mutationLatencyMs: { p95: 2500 },
    internalErrorRatePercent: 0.8,
    outboxDispatchLagMs: { p95: 25000 }
});
const violating = evaluateOperationalSlo({
    availabilityPercent: 99.4,
    interactiveLatencyMs: { p95: 2200, p99: 5500 },
    mutationLatencyMs: { p95: 3500 },
    internalErrorRatePercent: 1,
    outboxDispatchLagMs: { p95: 31000 },
    violationDurationMinutes: 5
});
const incomplete = evaluateOperationalSlo({ availabilityPercent: 100 });

assert(healthy.passing && !healthy.alertEligible, 'Healthy SLO snapshot must pass');
assert(!violating.passing && violating.alertEligible, 'Five-minute violation must be alert eligible');
assert(!incomplete.complete && !incomplete.alertEligible, 'Incomplete telemetry must not trigger a false alert');
assert(operationalSloPolicy.excludesDiscordTransport, 'Discord transport must be excluded');
assert(Object.isFrozen(operationalSloPolicy.interactiveLatencyMs), 'Policy must be deeply immutable');

console.log(JSON.stringify({ status: 'PASS', policy: operationalSloPolicy, checks: healthy.checks.length }, null, 2));
