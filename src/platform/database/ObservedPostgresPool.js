function classifySql(text) {
    const sql = String(text || '').trim();
    const upper = sql.toUpperCase();
    if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(upper)) return `postgres.transaction.${upper.toLowerCase()}`;
    const patterns = [
        ['insert', /\bINSERT\s+INTO\s+([A-Za-z0-9_."]+)/i],
        ['update', /\bUPDATE\s+([A-Za-z0-9_."]+)/i],
        ['delete', /\bDELETE\s+FROM\s+([A-Za-z0-9_."]+)/i],
        ['select', /\bFROM\s+([A-Za-z0-9_."]+)/i]
    ];
    for (const [operation, pattern] of patterns) {
        const table = sql.match(pattern)?.[1];
        if (table) return `postgres.${operation}.${table.replaceAll('"', '').replaceAll('.', '_').toLowerCase()}`;
    }
    return upper.startsWith('WITH ') ? 'postgres.cte' : 'postgres.command';
}

function normalizeQueryArgs(args) {
    const normalized = [...args];
    const first = normalized[0];
    if (first && typeof first === 'object' && !Array.isArray(first)) {
        const { operationName = classifySql(first.text), ...queryConfig } = first;
        normalized[0] = queryConfig;
        return { operationName, args: normalized };
    }
    return { operationName: classifySql(first), args: normalized };
}

export default class ObservedPostgresPool {
    constructor(pool, queryMetrics) {
        this.pool = pool;
        this.queryMetrics = queryMetrics;
    }

    async connect() {
        const client = await this.queryMetrics.measure('postgres.pool.connect', () => this.pool.connect());
        return this.wrapClient(client);
    }

    async query(...args) {
        const normalized = normalizeQueryArgs(args);
        return this.queryMetrics.measure(normalized.operationName, () => this.pool.query(...normalized.args));
    }

    async queryNamed(operationName, text, values) {
        return this.queryMetrics.measure(operationName, () => this.pool.query(text, values));
    }

    on(...args) {
        this.pool.on(...args);
        return this;
    }

    async end() {
        return this.pool.end();
    }

    getStatus() {
        return Object.freeze({
            max: Number(this.pool.options?.max || 0),
            total: Number(this.pool.totalCount || 0),
            idle: Number(this.pool.idleCount || 0),
            waiting: Number(this.pool.waitingCount || 0)
        });
    }

    wrapClient(client) {
        const queryMetrics = this.queryMetrics;
        return new Proxy(client, {
            get(target, property) {
                if (property === 'query') {
                    return async (...args) => {
                        const normalized = normalizeQueryArgs(args);
                        return queryMetrics.measure(normalized.operationName, () => target.query(...normalized.args));
                    };
                }
                const value = Reflect.get(target, property, target);
                return typeof value === 'function' ? value.bind(target) : value;
            }
        });
    }
}
