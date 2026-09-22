# Architecture Decisions V2

Version: 2.1  
Status: APPROVED SUPPLEMENT  
Approved by: Project Owner  
Approved at: 2026-07-15

## Scope

Tài liệu này ghi nhận các lựa chọn do chủ dự án trả lời trong `docs/questions.md`. Nó bổ sung cho các decision đang LOCKED, không sửa hoặc xóa decision cũ.

## Approved Decisions

| ID | Decision |
|---|---|
| ADR2-001 | `docs/ROADMAP_DATABASE_ARCHITECTURE.md` là roadmap bổ sung; roadmap LOCKED hiện tại vẫn giữ nguyên. |
| ADR2-002 | PostgreSQL migration dùng SQL thuần và `pg`; DDL production không nằm rải rác trong bootstrap. |
| ADR2-003 | Runtime row ID dùng BIGINT identity; amount lớn dùng NUMERIC và serialize an toàn, không ép qua JavaScript Number. |
| ADR2-004 | Transaction boundary dùng UnitOfWork được inject vào use case; PostgreSQL adapter quản lý transaction vật lý. |
| ADR2-005 | Spirit Root là domain JSON data-driven; Player lưu reference/giá trị compatibility, gameplay qua Effect/Modifier. |
| ADR2-006 | Progression dùng Realm + Stage; tiểu đột phá tăng stage, đại đột phá đổi realm. |
| ADR2-007 | Cultivation offline tính liên tục, không giới hạn thời gian; raw gain áp dụng mọi modifier hợp lệ, phần vượt ngưỡng transition chỉ nhận 30%. |
| ADR2-008 | Đột phá thất bại mất một tỷ lệ cultivation được cấu hình trong data. |
| ADR2-009 | Contract dài hạn là `Skill -> Effect -> Action`; legacy action bridge chỉ là compatibility adapter. |
| ADR2-010 | Tách inventory stack và equipment instance trong persistence. |
| ADR2-011 | Currency persistence dùng wallet chuẩn hóa `(player_id, currency_id)`. |
| ADR2-012 | MVP chỉ có một idle source là Cultivation; engine vẫn có contract mở rộng. |
| ADR2-013 | Claim hybrid: profile preview, collect explicit, breakthrough settle atomically. |
| ADR2-014 | Idempotency dùng `operation_id` trung lập; Discord interaction ID được adapter ánh xạ vào operation ID. |
| ADR2-015 | Game timezone là `Asia/Ho_Chi_Minh`; timestamp persistence dùng UTC/TIMESTAMPTZ. |
| ADR2-016 | Reward claim all-or-nothing trong một transaction. |
| ADR2-017 | V1 late-game giới hạn ở Sect membership và solo PvE; PvP/World Boss để phase sau. |
| ADR2-018 | PostgreSQL là source of truth; Redis được phép ở phase scaling cho cache/coordination nhưng không quyết định correctness. |
| ADR2-019 | Minor breakthrough chắc chắn; major breakthrough tại Stage tối đa mới roll success rate của realm hiện tại. |
| ADR2-020 | Required cultivation và stat theo Stage dùng `FLOOR(initial × growthPerStage^(stage-1))`. |
| ADR2-021 | Mọi thay đổi công pháp/trang bị ảnh hưởng cultivation rate phải settle theo loadout cũ trong cùng transaction trước mutation. |
| ADR2-022 | Inventory split dùng application migration đọc GameData trong maintenance window; backfill và reconciliation hoàn tất trước cutover/xóa legacy. |
| ADR2-023 | `Q-PROGRESSION-010` supersede phần battle stat của ADR2-020: base HP/ATK/DEF/SPD compound từ transition trước và FLOOR mỗi bước; Luyện Khí minor ×1.1, transition đầu ×1.5, từ Trúc Cơ minor ×1.2 và major ×1.7. Required cultivation vẫn giữ ADR2-020. |

## Parameters Still Required

Các parameter follow-up hiện đã được trả lời. `Q-IDLE-004` chọn settle-before-change và `Q-INVENTORY-002` chọn application migration trong maintenance window; không còn câu hỏi mở trong registry hiện tại.

## Approved Parameters — 2026-07-16

- Resource numeric policy theo loại: currency/resource `NUMERIC(30,0)`, cultivation `NUMERIC(30,6)`, rate/config `NUMERIC(18,8)`, item quantity ưu tiên BIGINT.
- Breakthrough failure loss là 25% required cultivation trên từng transition; clamp bằng current cultivation.
- Idempotency theo operation class: cached response 30 ngày; business key one-time giữ vĩnh viễn.
- Economy week bắt đầu Thứ Hai 00:00 theo `Asia/Ho_Chi_Minh`.
- Inventory full làm reward transaction rollback; claim vẫn retryable.
- Cultivation offline không có time cap; phần raw gain vượt required cultivation của transition tiếp theo nhận hệ số `0.20`.
- Minor breakthrough guaranteed; major mới roll. Required cultivation vẫn dùng `initial × growth^(stage-1)`; battle base stat dùng compound transition policy ADR2-023.
