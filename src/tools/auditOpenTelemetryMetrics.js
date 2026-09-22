import ApplicationTelemetry from '../platform/observability/ApplicationTelemetry.js';
import OpenTelemetryMetricsAdapter from '../platform/observability/OpenTelemetryMetricsAdapter.js';
import DatabaseQueryMetrics from '../platform/database/DatabaseQueryMetrics.js';
import { applicationTelemetry, configureMetricsAdapter } from '../platform/observability/telemetryContext.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const instruments = [];
const meter = {
    createCounter(name, config) {
        const measurements = [];
        const instrument = { name, config, measurements, add: (value, attributes) => measurements.push({ value, attributes }) };
        instruments.push(instrument);
        return instrument;
    },
    createHistogram(name, config) {
        const measurements = [];
        const instrument = { name, config, measurements, record: (value, attributes) => measurements.push({ value, attributes }) };
        instruments.push(instrument);
        return instrument;
    }
};
const adapter = new OpenTelemetryMetricsAdapter({ meter });
const ticks = [0, 125, 200, 260];
const telemetryErrors = [];
const telemetry = new ApplicationTelemetry({
    adapter,
    clock: { now: () => ticks.shift() },
    onAdapterError: (event) => telemetryErrors.push(event)
});

await telemetry.measureUseCase({ operationName: 'leaderboard.list', operationType: 'INTERACTIVE' }, async () => 'OK');
let failed = false;
try {
    await telemetry.measureUseCase({ operationName: 'sect.exchange', operationType: 'MUTATION' }, async () => { throw new Error('EXPECTED'); });
} catch { failed = true; }
assert(failed, 'Telemetry wrapper must preserve use-case failure');

const queryMetrics = new DatabaseQueryMetrics({ slowThresholdMs: 250, telemetry });
queryMetrics.record('player.find_by_id', 40, false);
const exporterFailureQueryMetrics = new DatabaseQueryMetrics({
    slowThresholdMs: 250,
    telemetry: { recordDatabaseOperation() { throw new Error('EXPORTER_DOWN'); } }
});
const databaseCorrectness = await exporterFailureQueryMetrics.measure('database.safe', async () => 'DATABASE_RESULT');
assert(databaseCorrectness === 'DATABASE_RESULT', 'Telemetry failure changed database correctness');
telemetry.recordOutboxDispatchLag({ eventType: 'reward.granted', lagMs: 500 });
telemetry.recordOutboxOutcome({ eventType: 'reward.granted', outcome: 'PROCESSED' });

const duration = instruments.find((item) => item.name === 'tieudao.application.operation.duration');
assert(duration.measurements[0].value === 125, 'Use-case duration was not recorded');
assert(duration.measurements[0].attributes['operation.name'] === 'leaderboard.list', 'Stable operation attribute missing');
assert(!JSON.stringify(instruments).includes('playerId'), 'High-cardinality player attribute leaked');
assert(instruments.length === 7, 'Instruments must be created once', instruments.map((item) => item.name));

const failingTelemetry = new ApplicationTelemetry({
    adapter: { recordUseCase() { throw new Error('EXPORTER_DOWN'); } },
    clock: { now: (() => { let value = 0; return () => value += 1; })() },
    onAdapterError: (event) => telemetryErrors.push(event)
});
const correctness = await failingTelemetry.measureUseCase({ operationName: 'player.profile', operationType: 'INTERACTIVE' }, async () => 'SOURCE_TRUTH');
assert(correctness === 'SOURCE_TRUTH', 'Telemetry failure changed correctness');
assert(telemetryErrors[0].errorCode === 'TELEMETRY_ADAPTER_FAILED', 'Telemetry error must be sanitized');
configureMetricsAdapter(adapter);
assert(applicationTelemetry.adapter === adapter, 'Deployment adapter configuration seam failed');

console.log(JSON.stringify({
    status: 'PASS',
    checks: {
        openTelemetryMeterContract: true,
        instrumentCount: instruments.length,
        histogramLatency: true,
        stableLowCardinalityAttributes: true,
        adapterFailureFallback: true,
        databaseFailureFallback: true,
        exporterConfiguredInCore: false
    }
}, null, 2));
