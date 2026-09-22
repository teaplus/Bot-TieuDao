# Operational SLO Policy

## Revision

`operational-slo-mvp-v1` là baseline MVP tạm thời, đo theo cửa sổ 30 ngày và phải được review sau 14 ngày có production telemetry.

## Service-level objectives

| Chỉ số | Mục tiêu |
|---|---:|
| Application availability | `>= 99.5%` |
| Interactive internal latency p95 | `<= 2000ms` |
| Interactive internal latency p99 | `<= 5000ms` |
| Mutation internal latency p95 | `<= 3000ms` |
| Internal error rate | `< 1%` |
| Outbox dispatch lag p95 | `<= 30000ms` |

Application latency bắt đầu khi adapter đã chuyển request vào use case và kết thúc khi use case trả result. Discord transport/ack/network latency không nằm trong SLO này và phải được đo riêng.

Ngưỡng slow database operation 250ms là tín hiệu profiling, không phải database SLO.

## Alert contract

- Chỉ đánh giá alert khi snapshot có đủ sáu metric.
- Vi phạm phải liên tục ít nhất 5 phút mới `alertEligible`.
- Telemetry thiếu được ghi nhận là incomplete, không được tự coi là healthy hoặc phát false alert.
- `evaluateOperationalSlo` chỉ đánh giá snapshot; exporter/dashboard/paging integration thuộc deployment platform.

## Verification

Chạy `npm run audit:operational-slo`.
