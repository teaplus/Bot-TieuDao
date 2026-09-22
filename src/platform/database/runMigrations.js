import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import AppError from '../../shared/errors/AppError.js';

const MIGRATION_LOCK_ID = 2026071501;
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultMigrationsDirectory = path.resolve(currentDirectory, '../../database/migrations');

function listMigrationFiles(migrationsDirectory) {
    return fs.readdirSync(migrationsDirectory)
        .filter((fileName) => /^\d+_[a-z0-9_]+\.sql$/i.test(fileName))
        .sort((left, right) => left.localeCompare(right));
}

export async function runMigrations(options = {}) {
    const databasePool = options.pool;
    if (!databasePool) {
        throw new AppError('Migration pool is required', { code: 'DATABASE_MIGRATION_POOL_REQUIRED' });
    }
    const migrationsDirectory = options.migrationsDirectory || defaultMigrationsDirectory;
    const client = await databasePool.connect();

    try {
        await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version TEXT PRIMARY KEY,
                checksum TEXT NOT NULL,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const appliedResult = await client.query('SELECT version, checksum FROM schema_migrations');
        const applied = new Map(appliedResult.rows.map((row) => [row.version, row.checksum]));
        const appliedNow = [];

        for (const fileName of listMigrationFiles(migrationsDirectory)) {
            const sql = fs.readFileSync(path.join(migrationsDirectory, fileName), 'utf8');
            const checksum = crypto.createHash('sha256').update(sql).digest('hex');

            if (applied.has(fileName)) {
                if (applied.get(fileName) !== checksum) {
                    throw new AppError(`Applied migration was modified: ${fileName}`, {
                        code: 'DATABASE_MIGRATION_CHECKSUM_MISMATCH',
                        details: { fileName }
                    });
                }
                continue;
            }

            await client.query('BEGIN');
            try {
                await client.query(sql);
                await client.query(
                    'INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)',
                    [fileName, checksum]
                );
                await client.query('COMMIT');
                appliedNow.push(fileName);
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
        }

        return { applied: appliedNow };
    } finally {
        try {
            await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
        } finally {
            client.release();
        }
    }
}
