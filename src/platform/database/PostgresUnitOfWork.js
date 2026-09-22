export default class PostgresUnitOfWork {
    constructor(pool) {
        this.pool = pool;
    }

    async execute(work) {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');
            const result = await work(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}
