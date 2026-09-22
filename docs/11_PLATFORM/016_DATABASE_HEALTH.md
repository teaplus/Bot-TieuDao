# Database Health Implementation

## Mục tiêu

`DatabaseHealthService` cung cấp readiness primitive cho PostgreSQL mà không làm business logic hoặc Discord adapter phụ thuộc vào chi tiết của `pg`.

Đây không phải liveness policy, HTTP endpoint, dashboard hay alerting system. Bề mặt vận hành cụ thể chỉ được nối khi deployment contract được xác định.

## Contract

- Chạy `SELECT 1 AS ok` với operation name ổn định `database.health.check`.
- Trả `HEALTHY` khi PostgreSQL phản hồi đúng; mọi exception được chuyển thành `UNHEALTHY` với reason `DATABASE_UNAVAILABLE`.
- Không trả exception message, SQL, parameters, connection string hoặc credential.
- Kèm duration và pool snapshot `{ max, total, idle, waiting }` để operator quan sát saturation.
- Cho phép đọc aggregate query metrics từ cùng observed pool.

## Correctness boundary

- Health check chỉ quan sát; không thay đổi gameplay state và không được dùng như distributed lock.
- PostgreSQL vẫn là source of truth. Health status không cho phép bỏ qua transaction, idempotency hoặc constraint.
- Một lần health check thành công không bảo đảm request kế tiếp sẽ thành công; caller vẫn phải xử lý database failure bình thường.
- Health reason không tự quyết định alert. Baseline/điều kiện alert đã được duyệt trong `operational-slo-mvp-v1`; `Q-OBS-001` đã chốt OpenTelemetry contract, còn MeterProvider/exporter/production aggregation thuộc deployment.

## Verification

Chạy `npm run audit:database-health`. Audit kiểm tra healthy/unavailable path, stable operation name, immutable/sanitized response, pool saturation và query metrics snapshot.
