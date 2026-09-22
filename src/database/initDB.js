import { runMigrations } from '../platform/database/runMigrations.js';
import pool from './postgres.js';

export async function initializeDatabase() {
    return runMigrations({ pool });
}
