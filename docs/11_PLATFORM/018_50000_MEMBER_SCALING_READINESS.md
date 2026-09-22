# 50.000 THÀNH VIÊN — GHI CHÚ SẴN SÀNG MỞ RỘNG

Status: DEFERRED — CHƯA TRIỂN KHAI

Ngày ghi nhận: 2026-08-06

## Bối cảnh vận hành

- Một Discord server có khoảng 50.000 thành viên.
- Dự kiến vài trăm đến vài nghìn người có thể hoạt động đồng thời.
- Số người online không được xem là số request mỗi giây. Throughput mục tiêu chỉ được khóa
  sau khi có workload/load-test thực tế.
- PostgreSQL tiếp tục là source of truth; Redis không phải điều kiện correctness.

## Đánh giá hiện trạng

- Lazy Evaluation không ghi tick theo giây, phù hợp với quy mô thành viên này.
- Guest chỉ được tạo khi lần đầu dùng Economy command; không tạo trước 50.000 Player.
- Discord client hiện không yêu cầu Guild Members intent nên không cache toàn bộ member list.
- Bounded load harness hiện chỉ bao phủ Leaderboard/Outbox ở 10–100 worker; chưa chứng minh tải
  của Daily/Work/Slot/High Low hoặc các gameplay command.

## Hạng mục phải làm trước production load lớn

1. Thay High Low component collector theo từng ván bằng interaction router stateless dùng trạng
   thái PostgreSQL.
2. Tạo lightweight Economy/Mini Game context query; không tải inventory, skill và công pháp cho
   mỗi lệnh kiếm tiền/cược.
3. Gộp hoặc tối ưu `ensureGuest` để giảm query amplification.
4. Thêm rate limit/backpressure theo user, channel và command; thiết kế adapter cho multi-process.
5. Lập connection budget: tổng pool của bot instance, worker và phần dự phòng phải nằm trong
   giới hạn PostgreSQL. Production không dùng mặc định `DB_POOL_MAX=5` một cách máy móc.
6. Load-test command thật ở nhiều mức concurrency, đo p95/p99, error rate, pool waiting và slow
   query; sau đó mới quyết định số process, pool size, PgBouncer hoặc Redis.
7. Chỉ scale ngang khi idempotency, row lock và component routing đã hoạt động đúng giữa nhiều
   process.

## Điều kiện hoàn thành

- Workload và SLO production được xác định bằng số đo, không suy ra từ member count.
- Không double reward hoặc settle trùng khi request đồng thời.
- Pool không bão hòa kéo dài và latency đạt `operational-slo-mvp-v1`.
- Restart/multi-process không làm mất phiên tương tác.

