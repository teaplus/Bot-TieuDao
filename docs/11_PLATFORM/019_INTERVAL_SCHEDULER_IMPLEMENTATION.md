# Interval Scheduler Implementation

## Boundary

`IntervalScheduler` chỉ đăng ký interval và trigger callback. Gameplay/service sở hữu toàn bộ logic, transaction và due-policy.

## Runtime contract

- Task ID duy nhất, interval là positive safe integer.
- Task được đăng ký trước `start()`; không thay registry khi scheduler đang chạy.
- `runOnStart` cho phép chạy lần đầu trong bootstrap sau khi migrations hoàn tất.
- Một task không chạy chồng trong cùng process; trigger thứ hai trả `SKIPPED_OVERLAP`.
- Task failure được cô lập, tăng failure counter và callback chỉ nhận `taskId/errorCode`, không nhận error message/stack có thể chứa dữ liệu nhạy cảm.
- `stop()` clear toàn bộ timer; Discord client gọi stop khi destroy.
- Gateway/background task mặc định dùng `unref()` để timer không tự giữ process sống. Dedicated worker đặt `keepProcessAlive: true` để interval chính là lifecycle handle của process.

Multi-process exclusivity không thuộc scheduler. Leaderboard dùng PostgreSQL state-row lock; outbox dùng `SKIP LOCKED` lease. Scheduler không thay thế các database coordination primitive này.

## Registered task

`cultivation-leaderboard-refresh` chạy on-start và interval 300.000ms. Callback chỉ gọi `CultivationLeaderboardService.refreshIfDue()`; service vẫn tự kiểm tra cadence trong transaction.

## Verification

Chạy `npm run audit:interval-scheduler`.
