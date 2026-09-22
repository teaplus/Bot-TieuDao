# Phase 7 PostgreSQL Verification Harness

## Safety boundary

`npm run verify:phase7:postgres` chỉ chạy khi có `PHASE7_TEST_DATABASE_URL`.

- Nếu thiếu biến, script trả `SKIP` và không mở kết nối.
- Test URL phải khác connection identity của `DATABASE_URL` theo protocol/user/host/port/database; đổi password/query string không thể lách guard. Không có override để dùng primary database.
- Mỗi lần chạy tạo schema `phase7_verify_<pid>_<timestamp>`.
- Toàn bộ migrations/data test nằm trong schema này.
- `finally` chỉ được drop schema có prefix cố định, sau đó đóng pool.
- Output không chứa database URL, credential, SQL params hoặc raw database error message.

## Checks

1. Chạy toàn bộ forward migrations và xác nhận migration 015 được áp dụng.
2. Seed năm Player ở nhiều Realm/stage/cultivation.
3. Hai refresh Leaderboard đồng thời phải cho đúng một `REFRESHED` và một `SKIPPED` qua state-row lock.
4. Đọc hai trang keyset; refresh sau 5 phút; cursor snapshot cũ phải bị từ chối.
5. Constraint top 100 phải từ chối rank 101.
6. PostgreSQL phải tạo được query plan cho keyset read.
7. Seed 200 Outbox event; hai worker claim đồng thời batch 100 bằng `SKIP LOCKED`; không được trùng event ID.

Harness không benchmark latency/SLO vì kết quả phụ thuộc máy/CI. Soak test dài và query-plan acceptance threshold chỉ nên chạy trong môi trường gần production.
