import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pgConnectionString from "pg-connection-string";
import DatabaseQueryMetrics from "../platform/database/DatabaseQueryMetrics.js";
import ObservedPostgresPool from "../platform/database/ObservedPostgresPool.js";
import loadPostgresPoolConfig, {
  sanitizePostgresPoolConfig,
} from "../platform/database/loadPostgresPoolConfig.js";
import { applicationTelemetry } from "../platform/observability/telemetryContext.js";
const { Pool } = pg;
const { parse } = pgConnectionString;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const caCertPath = path.join(__dirname, "ca.pem");

export const postgresPoolConfig = loadPostgresPoolConfig(process.env);
export const postgresQueryMetrics = new DatabaseQueryMetrics({
  slowThresholdMs: postgresPoolConfig.slowQueryThresholdMs,
  telemetry: applicationTelemetry,
  onSlowQuery: ({ operationName, durationMs, failed }) => {
    console.warn(
      `[WARN] PostgreSQL slow operation ${JSON.stringify({
        operationName,
        durationMs,
        failed,
      })}`
    );
  },
});

// Parse the connection string manually to prevent pg from overwriting the ssl object
const connectionConfig = postgresPoolConfig.connectionString
  ? parse(postgresPoolConfig.connectionString)
  : {};

const rawPool = new Pool({
  ...connectionConfig,
  max: postgresPoolConfig.max,
  idleTimeoutMillis: postgresPoolConfig.idleTimeoutMillis,
  connectionTimeoutMillis: postgresPoolConfig.connectionTimeoutMillis,
  statement_timeout: postgresPoolConfig.statementTimeoutMillis,
  query_timeout: postgresPoolConfig.queryTimeoutMillis,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync(caCertPath).toString(),
  },
});

const pool = new ObservedPostgresPool(rawPool, postgresQueryMetrics);

pool.on("error", (err) => {
  console.error(
    `[ERROR] PostgreSQL pool error ${JSON.stringify({ message: err.message })}`
  );
});

export const sanitizedPostgresPoolConfig =
  sanitizePostgresPoolConfig(postgresPoolConfig);
export default pool;
