# OpenTelemetry Metrics Contract

## Architecture boundary

Core project không cấu hình MeterProvider, reader, collector, exporter hoặc vendor backend. Deployment inject một OpenTelemetry-compatible `Meter` vào `OpenTelemetryMetricsAdapter`, sau đó gọi `configureMetricsAdapter(adapter)`.

Nếu không cấu hình, `NoOpMetricsAdapter` là mặc định. Telemetry adapter/exporter failure chỉ phát sanitized callback và không thay đổi database/gameplay correctness.

Theo OpenTelemetry Metrics API, Counter dùng cho giá trị chỉ tăng và Histogram dùng cho phân phối duration/lag cần percentile.

## Instruments

| Instrument | Loại | Mục đích |
|---|---|---|
| `tieudao.application.operation.count` | Counter | Tổng use-case |
| `tieudao.application.operation.failure.count` | Counter | Use-case lỗi |
| `tieudao.application.operation.duration` | Histogram ms | Interactive/mutation/background latency |
| `tieudao.database.operation.duration` | Histogram ms | PostgreSQL operation latency |
| `tieudao.database.operation.failure.count` | Counter | PostgreSQL failure |
| `tieudao.outbox.dispatch.lag` | Histogram ms | Event occurrence đến worker claim |
| `tieudao.outbox.outcome.count` | Counter | Processed/retry/dead-letter/lease-lost |

Attributes chỉ gồm stable `operation.name`, `operation.type`, `event.type`, `outcome`. Không đưa player ID, event ID, SQL, params, error message hoặc Discord interaction ID vào attributes.

## Instrumented boundaries

- `DatabaseQueryMetrics` forward mỗi measured operation sang telemetry singleton.
- `OutboxWorker` ghi dispatch lag và outcome.
- `CultivationLeaderboardService` đo `leaderboard.list` và `leaderboard.refresh` ở business boundary.
- Gameplay service mới phải dùng stable operation name; không tạo instrument mới theo player/content ID.

## Deployment gate

Deployment vẫn phải chọn MeterProvider/exporter/backend, histogram views, 30-day retention, dashboard và alert routing. Các lựa chọn đó không làm thay đổi core instrumentation contract.

## Verification

Chạy `npm run audit:opentelemetry-metrics`.
