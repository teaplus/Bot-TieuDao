import pool from '../../database/postgres.js';
import PostgresUnitOfWork from './PostgresUnitOfWork.js';

const defaultUnitOfWork = new PostgresUnitOfWork(pool);

export async function runInTransaction(work) {
    return defaultUnitOfWork.execute(work);
}
