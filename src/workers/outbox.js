import 'dotenv/config';
import os from 'node:os';
import pool, { sanitizedPostgresPoolConfig } from '../database/postgres.js';
import { runMigrations } from '../platform/database/runMigrations.js';
import PostgresUnitOfWork from '../platform/database/PostgresUnitOfWork.js';
import OutboxWorker from '../platform/events/OutboxWorker.js';
import OutboxPollingRuntime, { OUTBOX_BATCH_SIZE } from '../platform/events/OutboxPollingRuntime.js';
import Logger from '../platform/logger/Logger.js';
import OutboxRepository from '../repositories/OutboxRepository.js';
import { applicationTelemetry } from '../platform/observability/telemetryContext.js';

const logger = new Logger();
const workerId = String(process.env.OUTBOX_WORKER_ID || `${os.hostname()}:${process.pid}`).trim();
const handlers = new Map();
const unitOfWork = new PostgresUnitOfWork(pool);
const worker = new OutboxWorker({
    workerId,
    unitOfWork,
    outboxRepository: new OutboxRepository(),
    handlers,
    telemetry: applicationTelemetry,
    batchSize: OUTBOX_BATCH_SIZE
});
const runtime = new OutboxPollingRuntime({
    worker,
    onTaskError: ({ taskId, errorCode }) => logger.error('Outbox scheduled task failed', { taskId, errorCode })
});

let stopping = false;
async function shutdown(signal) {
    if (stopping) return;
    stopping = true;
    runtime.stop();
    logger.info('Outbox worker stopping', { signal, workerId });
    await pool.end();
}

try {
    await runMigrations({ pool });
    await runtime.start();
    logger.info('Outbox worker started', {
        workerId,
        batchSize: OUTBOX_BATCH_SIZE,
        pollIntervalMs: 1000,
        registeredHandlerCount: handlers.size,
        database: sanitizedPostgresPoolConfig
    });
    process.once('SIGINT', () => void shutdown('SIGINT'));
    process.once('SIGTERM', () => void shutdown('SIGTERM'));
} catch (error) {
    logger.error('Outbox worker bootstrap failed', { errorCode: error?.code || 'OUTBOX_WORKER_BOOTSTRAP_FAILED' });
    await shutdown('BOOTSTRAP_FAILURE');
    process.exitCode = 1;
}
