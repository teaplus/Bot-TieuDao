import ApplicationTelemetry from './ApplicationTelemetry.js';

export const applicationTelemetry = new ApplicationTelemetry();

export function configureMetricsAdapter(adapter) {
    applicationTelemetry.setAdapter(adapter);
    return applicationTelemetry;
}
