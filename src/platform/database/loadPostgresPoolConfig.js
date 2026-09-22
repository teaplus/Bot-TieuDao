function readString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function readPositiveInteger(env, key, fallback) {
    const raw = readString(env[key]);
    if (!raw) return fallback;
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${key}_INVALID`);
    return value;
}

export default function loadPostgresPoolConfig(env = process.env) {
    const nodeEnv = readString(env.NODE_ENV) || 'development';
    const isProduction = nodeEnv === 'production';
    if (isProduction && !readString(env.DB_POOL_MAX)) {
        throw new Error('DB_POOL_MAX_REQUIRED_IN_PRODUCTION');
    }

    const config = {
        connectionString: readString(env.DATABASE_URL) || undefined,
        max: readPositiveInteger(env, 'DB_POOL_MAX', 5),
        idleTimeoutMillis: readPositiveInteger(env, 'DB_IDLE_TIMEOUT_MS', 30000),
        connectionTimeoutMillis: readPositiveInteger(env, 'DB_CONNECT_TIMEOUT_MS', 10000),
        statementTimeoutMillis: readPositiveInteger(env, 'DB_STATEMENT_TIMEOUT_MS', 15000),
        queryTimeoutMillis: readPositiveInteger(env, 'DB_QUERY_TIMEOUT_MS', 20000),
        slowQueryThresholdMs: readPositiveInteger(env, 'DB_SLOW_QUERY_MS', 250),
        nodeEnv,
        isProduction
    };
    return Object.freeze(config);
}

export function sanitizePostgresPoolConfig(config) {
    return Object.freeze({
        max: config.max,
        idleTimeoutMillis: config.idleTimeoutMillis,
        connectionTimeoutMillis: config.connectionTimeoutMillis,
        statementTimeoutMillis: config.statementTimeoutMillis,
        queryTimeoutMillis: config.queryTimeoutMillis,
        slowQueryThresholdMs: config.slowQueryThresholdMs,
        nodeEnv: config.nodeEnv,
        connectionStringConfigured: Boolean(config.connectionString)
    });
}
