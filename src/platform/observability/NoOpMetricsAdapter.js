export default class NoOpMetricsAdapter {
    recordUseCase() {}
    recordDatabaseOperation() {}
    recordOutboxDispatchLag() {}
    recordOutboxOutcome() {}
}
