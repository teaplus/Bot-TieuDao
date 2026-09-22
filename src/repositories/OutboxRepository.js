function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
}

export default class OutboxRepository {
    async enqueue(client, event) {
        if (!client || typeof client.query !== 'function') {
            throw new Error('OUTBOX_TRANSACTION_CLIENT_REQUIRED');
        }
        if (!event.aggregateType || !event.aggregateId || !event.eventType) {
            throw new Error('OUTBOX_EVENT_IDENTITY_REQUIRED');
        }
        if (!event.payload || typeof event.payload !== 'object' || Array.isArray(event.payload)) {
            throw new Error('OUTBOX_EVENT_PAYLOAD_REQUIRED');
        }

        const result = await client.query(
            `INSERT INTO outbox_events (
                aggregate_type,
                aggregate_id,
                event_type,
                payload,
                occurred_at
             )
             VALUES ($1, $2, $3, $4::jsonb, $5)
             RETURNING id, occurred_at`,
            [
                event.aggregateType,
                String(event.aggregateId),
                event.eventType,
                JSON.stringify(event.payload),
                event.occurredAt || new Date()
            ]
        );

        return {
            id: String(result.rows[0].id),
            aggregateType: event.aggregateType,
            aggregateId: String(event.aggregateId),
            eventType: event.eventType,
            occurredAt: result.rows[0].occurred_at
        };
    }

    async claimBatch(client, options) {
        this.assertClient(client);
        const limit = Number(options.limit || 100);
        const leaseSeconds = Number(options.leaseSeconds || 60);
        if (!options.workerId) throw new Error('OUTBOX_WORKER_ID_REQUIRED');
        if (!Number.isSafeInteger(limit) || limit <= 0 || limit > 1000) throw new Error('OUTBOX_CLAIM_LIMIT_INVALID');
        if (!Number.isSafeInteger(leaseSeconds) || leaseSeconds <= 0) throw new Error('OUTBOX_LEASE_SECONDS_INVALID');
        const now = options.now || new Date();
        const result = await client.query(
            `WITH candidates AS (
                SELECT id
                FROM outbox_events
                WHERE processed_at IS NULL
                  AND dead_lettered_at IS NULL
                  AND available_at <= $1
                  AND (locked_at IS NULL OR locked_at <= $1 - ($2 * INTERVAL '1 second'))
                ORDER BY available_at, id
                FOR UPDATE SKIP LOCKED
                LIMIT $3
             )
             UPDATE outbox_events event
             SET locked_at = $1,
                 locked_by = $4,
                 attempt_count = event.attempt_count + 1
             FROM candidates
             WHERE event.id = candidates.id
             RETURNING event.id, event.aggregate_type, event.aggregate_id,
                       event.event_type, event.payload, event.occurred_at,
                       event.attempt_count, event.locked_at`,
            [now, leaseSeconds, limit, options.workerId]
        );
        return result.rows.map((row) => this.mapRow(row));
    }

    async acknowledge(client, options) {
        this.assertClient(client);
        const result = await client.query(
            `UPDATE outbox_events
             SET processed_at = $1,
                 locked_at = NULL,
                 locked_by = NULL,
                 last_error = NULL
             WHERE id = $2
               AND locked_by = $3
               AND processed_at IS NULL
               AND dead_lettered_at IS NULL
             RETURNING id, processed_at`,
            [options.processedAt || new Date(), options.eventId, options.workerId]
        );
        if (!result.rowCount) throw new Error('OUTBOX_LEASE_LOST');
        return { eventId: String(result.rows[0].id), processedAt: result.rows[0].processed_at };
    }

    async fail(client, options) {
        this.assertClient(client);
        const failedAt = options.failedAt || new Date();
        const maxAttempts = Number(options.maxAttempts || 10);
        const baseBackoffSeconds = Number(options.baseBackoffSeconds || 5);
        const maxBackoffSeconds = Number(options.maxBackoffSeconds || 900);
        const current = await client.query(
            `SELECT id, attempt_count
             FROM outbox_events
             WHERE id = $1
               AND locked_by = $2
               AND processed_at IS NULL
               AND dead_lettered_at IS NULL
             FOR UPDATE`,
            [options.eventId, options.workerId]
        );
        if (!current.rowCount) throw new Error('OUTBOX_LEASE_LOST');
        const attemptCount = Number(current.rows[0].attempt_count);
        const deadLettered = attemptCount >= maxAttempts;
        const backoffSeconds = deadLettered
            ? 0
            : Math.min(maxBackoffSeconds, baseBackoffSeconds * (2 ** Math.max(0, attemptCount - 1)));
        const availableAt = new Date(failedAt.getTime() + (backoffSeconds * 1000));
        const result = await client.query(
            `UPDATE outbox_events
             SET locked_at = NULL,
                 locked_by = NULL,
                 available_at = $1,
                 last_error = $2,
                 dead_lettered_at = $3
             WHERE id = $4
               AND locked_by = $5
             RETURNING id, attempt_count, available_at, dead_lettered_at`,
            [
                availableAt,
                String(options.error?.stack || options.error?.message || options.error || 'OUTBOX_HANDLER_FAILED').slice(0, 4000),
                deadLettered ? failedAt : null,
                options.eventId,
                options.workerId
            ]
        );
        if (!result.rowCount) throw new Error('OUTBOX_LEASE_LOST');
        return {
            eventId: String(result.rows[0].id),
            attemptCount,
            backoffSeconds,
            availableAt: result.rows[0].available_at,
            deadLetteredAt: result.rows[0].dead_lettered_at
        };
    }

    async renewLease(client, options) {
        this.assertClient(client);
        const result = await client.query(
            `UPDATE outbox_events
             SET locked_at = $1
             WHERE id = $2
               AND locked_by = $3
               AND processed_at IS NULL
               AND dead_lettered_at IS NULL
             RETURNING id, locked_at`,
            [options.renewedAt || new Date(), options.eventId, options.workerId]
        );
        if (!result.rowCount) throw new Error('OUTBOX_LEASE_LOST');
        return { eventId: String(result.rows[0].id), lockedAt: result.rows[0].locked_at };
    }

    assertClient(client) {
        if (!client || typeof client.query !== 'function') throw new Error('OUTBOX_TRANSACTION_CLIENT_REQUIRED');
    }

    mapRow(row) {
        return Object.freeze({
            id: String(row.id),
            aggregateType: row.aggregate_type,
            aggregateId: row.aggregate_id,
            eventType: row.event_type,
            payload: deepFreeze({ ...(row.payload || {}) }),
            occurredAt: row.occurred_at,
            attemptCount: Number(row.attempt_count),
            lockedAt: row.locked_at
        });
    }
}
