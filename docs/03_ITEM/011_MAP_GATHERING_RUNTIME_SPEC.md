# Map Gathering Runtime Specification

Module: Item / Gathering / Map

Version: 1.0

Status: APPROVED SUPPLEMENT

---

## Mục tiêu

Người chơi thu thập Linh Thảo hoặc Linh Khoáng tại map hiện tại bằng Lazy Evaluation. Hệ thống không tick theo giây và không roll reward khi bắt đầu.

## Content model

- `resourceTier` bằng `navigationOrder` của map, từ 1 đến 15.
- Mỗi map có hai tài nguyên `HERB` và hai tài nguyên `ORE`.
- `resourceTier` độc lập với Item rarity.
- Resource catalog là nguồn JSON; canonical normalizer sinh map pool, Reward Table và Gathering Template.
- Mỗi pool dùng `WEIGHTED_ONE`: đúng một Item được chọn mỗi lần claim.

### Baseline

| Nhóm | Duration | Vai trò chính | Vai trò hiếm |
|---|---:|---|---|
| Linh Thảo | 30 giây | weight 75, quantity 1–3 | weight 25, quantity 1 |
| Linh Khoáng | 60 giây | weight 75, quantity 1–3 | weight 25, quantity 1 |

## Start flow

1. Nhận `playerId`, `gatheringId`, `operationId`.
2. Mở idempotent transaction và khóa Player.
3. Resolve `currentMapId` trong cùng transaction.
4. Xác nhận Gathering Template thuộc đúng map hiện tại, map/content ACTIVE và cảnh giới hợp lệ.
5. Reserve một `activity_runs` trạng thái `IN_PROGRESS`.
6. Snapshot `mapId`, tên map, resource family/tier, realm, reward table và `readyAt`.

Unique partial index bảo vệ tối đa một Gathering active trên mỗi Player.

## Claim flow

1. Nhận `runId` và claim operation ID.
2. Khóa Player rồi khóa Activity Run.
3. Từ chối nếu chưa tới `readyAt`.
4. Roll Reward Table snapshot đúng một lần tại claim.
5. Apply reward, Resource Ledger, Reward Claim, Activity completion và legacy progress trong cùng transaction.
6. One-time business key chống nhận trùng.

Người chơi có thể di chuyển sau khi start; reward vẫn thuộc map snapshot lúc bắt đầu.

## Discord UI

`/thuthap` là dashboard ephemeral:

- hiển thị map và tier hiện tại;
- hiển thị hai resource pool cùng tỷ lệ/sản lượng;
- bắt đầu Hái Linh Thảo hoặc Khai Linh Khoáng;
- đọc lại active run từ PostgreSQL;
- cho claim khi computed status là READY;
- có nút refresh và có thể mở lại sau timeout/restart.

Không dùng timer để ghi database hoặc tự động claim.

## Data validation

- đúng 60 Gathering Resource;
- đúng 30 map-family pool;
- mỗi map-family có đúng hai entry;
- tổng weight mỗi pool bằng 100;
- tier phải bằng map navigation order;
- Item/Map/Realm/Reward references phải tồn tại;
- duration và baseline role phải đúng config đã duyệt.

## Liên kết với Luyện Đan nhập môn

- Tại `THANH_VAN_SON_MACH`, pool `HERB` trả đúng hai Item:
  `HERB_TU_LINH_THAO` và `HERB_THANH_TAM_THAO`.
- Phá Chướng Đan Phương tiêu `Tụ Linh Thảo ×4 + Thanh Tâm Thảo ×1`, do đó recipe và
  tài nguyên map khởi đầu đã khớp reference.
- Reward quái/Thám hiểm là nguồn độc lập. Quái Luyện Khí hiện có nguồn phụ:
  mỗi trong ba roll trả Tụ Linh Thảo 5% ×1 và Thanh Tâm Thảo 1% ×1.
- `/nghenghiep` hiển thị cả `/thuthap`, `/thamhiem` và Thanh Vân Sơn Mạch trên
  nguyên liệu có hai nguồn.
