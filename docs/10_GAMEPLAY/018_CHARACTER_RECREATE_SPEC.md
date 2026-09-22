# XÓA VÀ TẠO LẠI NHÂN VẬT — BẢN PHÂN TÍCH

Module: Player / Character Lifecycle

Version: 1.0

Status: ACTIVE — `Q-PLAYER-002` RESOLVED

---

## 1. Mục tiêu đã rõ

Cho phép Discord user reset toàn bộ trạng thái nhân vật nhìn thấy để chạy lại `/start`, nhưng
giữ nguyên số dư `SPIRIT_STONE`.

Không hard-delete row `players`: transfer/Nối Từ có foreign key `RESTRICT`, đồng thời hard-delete
sẽ phá lịch sử audit. Hướng an toàn là reset cùng identity về `account_status = GUEST`, để
`/start` nâng cấp lại row đó thành `REGISTERED`.

## 2. Dữ liệu reset dự kiến

- đạo hiệu, Realm/Stage/tu vi, base stat và idle checkpoint;
- Linh Căn/phẩm cấp, số lần Luân hồi và entitlement reroll;
- Công Pháp/Kỹ Năng/loadout;
- inventory stack, equipment instance, legacy item/equipped slot;
- nghề nghiệp/recipe, map state/movement projection;
- Tông Môn, contribution và character leaderboard projection;
- active gameplay session/run không được phép tồn tại khi reset.

## 3. Dữ liệu phải giữ để bảo toàn economy/audit

- wallet `SPIRIT_STONE` và legacy projection đồng bộ;
- immutable `resource_ledger` cùng transfer sent/received;
- idempotency records, reward claims/period counters và economy histories cần cho chống nhận lại;
- Discord identity row `players.id`.

Các record giữ lại không xuất hiện như tiến trình nhân vật cũ, nhưng ngăn reset để farm Daily,
starter reward hoặc xóa dấu vết transfer.

## 4. Transaction và lifecycle

Reset phải khóa Player trước, kiểm tra mọi activity/craft/minigame session `ACTIVE|IN_PROGRESS`,
snapshot số dư Linh Thạch, xóa/reset các projection theo thứ tự foreign key, chuyển account về
GUEST và ghi immutable `player_character_reset_history` trong một transaction.

`/start` sau reset phân biệt lần tạo đầu với recreate qua `character_reset_count`: cấp lại starter
equipment, recipe và công pháp để nhân vật hợp lệ, nhưng không cộng lại 100 Linh Thạch.

## 5. UX dự kiến

Slash command `/xoanhanvat` hiển thị danh sách dữ liệu mất, số dư Linh Thạch được giữ và thời
điểm có thể reset tiếp. Owner phải bấm Danger confirmation; timeout/hủy không thay đổi database.
Confirmation TTL là 60 giây.

## 6. Policy data-driven đã phát hành

Nguồn chuẩn là `src/data/player/character_reset_rules.json`:

- `retainedCurrencyIds = ["SPIRIT_STONE"]`;
- `starterCurrencyGrantOnRecreate = false`;
- `cooldownSeconds = 0` ở cấu hình ban đầu và có thể chỉnh không cần sửa service;
- `activeStatePolicy = BLOCK_ACTIVITY_CRAFT_MINIGAME`;
- account đích sau reset là `GUEST`.

## 7. Persistence và bảo vệ đồng thời

Migration `043_character_recreate_foundation.sql` bổ sung reset counter/timestamp và immutable
history. Service dùng Player lock, active-state lock, idempotency operation và một PostgreSQL
transaction. Nếu bất kỳ bước xóa/reset/ledger/history thất bại thì toàn bộ thao tác rollback.

PostgreSQL integration đã xác nhận: giữ nguyên Linh Thạch, reset currency khác có ledger, chặn
Blackjack active, replay operation không reset lần hai và `/start` recreate không nhận lại 100
Linh Thạch.

---

End
