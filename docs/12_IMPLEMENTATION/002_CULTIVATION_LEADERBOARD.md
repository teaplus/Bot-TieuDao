# Cultivation Leaderboard MVP

## Ranking contract

Leaderboard global, không season, giữ top 100 theo thứ tự:

1. `realm.order DESC` từ Realm GameData;
2. `realm_stage DESC`;
3. `cultivation DESC`;
4. `player_id ASC` làm deterministic tie-breaker.

Public result chỉ gồm `rank`, `displayName`, `realmName`, `stage`. `playerId`, cultivation và field nội bộ vẫn nằm trong read model để xếp hạng/cursor nhưng không đi qua public projection.

## Materialized read model

- Migration 015 tạo `cultivation_leaderboard_entries` và singleton refresh state.
- Refresh truyền Realm definitions từ GameData vào parameterized SQL; không hard-code mapping Realm trong repository.
- Refresh khóa state row và thay snapshot trong một transaction. Nhiều worker cùng trigger không refresh chồng nhau.
- `refreshIfDue()` chỉ refresh khi snapshot chưa tồn tại hoặc đã đủ 5 phút. `IntervalScheduler` trigger on-start và mỗi 5 phút, không chứa logic leaderboard.
- Read path query bảng top 100 bằng keyset cursor, không aggregate trực tiếp từ Player/ledger/activity logs.
- Cursor mang `refreshedAt`; cursor của snapshot cũ bị từ chối bằng `LEADERBOARD_CURSOR_STALE`.

## Deployment

Chạy migration trước khi expose service. Application bootstrap khởi động scheduler sau migrations; service vẫn tự bảo vệ cadence bằng state-row lock. Discord adapter đã được triển khai sau khi `Q-LEADERBOARD-002` RESOLVED và chỉ phụ thuộc public business projection.

## Discord presentation

`Q-LEADERBOARD-002` đã RESOLVED. Command `/bangxephang` hiển thị 20 hạng/trang bằng public projection, dùng buttons Trước/Sau và opaque cursor do service trả về. Component session chỉ nhận người gọi command và hết hạn tuyệt đối sau 10 phút; timeout loại bỏ buttons.

Nếu refresh làm cursor stale, adapter gọi lại trang đầu và thông báo bảng vừa cập nhật. Adapter không query repository, không tính rank và không expose player ID/cultivation nội bộ.

## Verification

Chạy `npm run audit:cultivation-leaderboard`. PostgreSQL integration test thật cho migration, concurrent refresh lock và query plan vẫn là production cutover gate.
