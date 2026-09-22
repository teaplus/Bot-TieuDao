import 'dotenv/config';
import pool from './postgres.js';
import { runMigrations } from '../platform/database/runMigrations.js';

try {
    const result = await runMigrations({ pool });
    console.log(JSON.stringify({ status: 'PASS', ...result }, null, 2));
} catch (error) {
    console.error(JSON.stringify({
        status: 'FAIL',
        message: error instanceof Error ? error.message : String(error),
        code: error?.code || null,
        details: error?.details || null
    }, null, 2));
    process.exitCode = 1;
} finally {
    await pool.end();
}
