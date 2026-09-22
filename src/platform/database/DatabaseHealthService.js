export default class DatabaseHealthService {
    constructor(options = {}) {
        if (!options.pool) throw new Error('DATABASE_HEALTH_POOL_REQUIRED');
        this.pool = options.pool;
        this.clock = options.clock || { now: () => performance.now() };
    }

    async check() {
        const startedAt = this.clock.now();
        try {
            const result = typeof this.pool.queryNamed === 'function'
                ? await this.pool.queryNamed('database.health.check', 'SELECT 1 AS ok')
                : await this.pool.query('SELECT 1 AS ok');
            const healthy = Number(result.rows?.[0]?.ok) === 1;
            return Object.freeze({
                status: healthy ? 'HEALTHY' : 'UNHEALTHY',
                durationMs: this.durationSince(startedAt),
                pool: this.getPoolStatus(),
                reason: healthy ? null : 'DATABASE_HEALTH_RESPONSE_INVALID'
            });
        } catch {
            return Object.freeze({
                status: 'UNHEALTHY',
                durationMs: this.durationSince(startedAt),
                pool: this.getPoolStatus(),
                reason: 'DATABASE_UNAVAILABLE'
            });
        }
    }

    getQueryMetricsSnapshot() {
        return this.pool.queryMetrics?.snapshot?.() || Object.freeze([]);
    }

    getPoolStatus() {
        return this.pool.getStatus?.() || Object.freeze({ max: 0, total: 0, idle: 0, waiting: 0 });
    }

    durationSince(startedAt) {
        return Math.max(0, Number((this.clock.now() - startedAt).toFixed(3)));
    }
}
