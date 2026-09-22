# PostgreSQL Pool và Query Observability Policy

Status: Phase 7 approved implementation

## Connection budget

- Development mặc định `DB_POOL_MAX=5`.
- Production bắt buộc khai báo `DB_POOL_MAX`; thiếu giá trị làm bootstrap fail-fast.
- Operator tính pool max mỗi process theo `floor((DB_CONNECTION_BUDGET - reserve) / process_count)`.
- Tổng pool của bot, worker, migration và công cụ vận hành phải nằm trong database connection budget.

## Approved defaults

| Environment key | Default | Meaning |
|---|---:|---|
| `DB_IDLE_TIMEOUT_MS` | 30000 | Đóng idle client sau 30 giây. |
| `DB_CONNECT_TIMEOUT_MS` | 10000 | Timeout lấy/kết nối client. |
| `DB_STATEMENT_TIMEOUT_MS` | 15000 | PostgreSQL statement timeout. |
| `DB_QUERY_TIMEOUT_MS` | 20000 | Client-side query timeout. |
| `DB_SLOW_QUERY_MS` | 250 | Ngưỡng query operation chậm. |

Mọi giá trị phải là positive safe integer và có thể override bằng environment variable.

## Observability

- `ObservedPostgresPool` đo pool connect và mọi pool/client query.
- Query có thể cung cấp `operationName` tường minh trong query config; metadata này bị loại trước khi gọi `pg`.
- Query legacy được phân loại ổn định theo operation/table, ví dụ `postgres.select.players`.
- Metrics chỉ chứa operation name, duration, failure và aggregate counters; không lưu SQL text, values, `DATABASE_URL` hoặc credentials.
- Bootstrap chỉ log sanitized pool config với boolean `connectionStringConfigured`.

## Correctness

- Timeout không thay thế transaction/idempotency.
- Query timeout/connection failure phải propagate để UnitOfWork rollback.
- Pool metric chỉ phục vụ quan sát và không quyết định reward, lock, cooldown hoặc cache correctness.
