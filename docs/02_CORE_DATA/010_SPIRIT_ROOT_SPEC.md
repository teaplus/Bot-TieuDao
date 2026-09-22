# Spirit Root Specification

Version: 3.1  
Status: LOCKED

## Purpose

Spirit Root là domain data-driven mô tả Linh căn được cấp cho Player. Runtime Player chỉ lưu `spiritRootId`; metadata và liên kết gameplay được resolve từ GameData.

## Data Source

`src/data/spirit-roots/spirit_roots.json`

## Model

- `id`: ID chuẩn `UPPER_SNAKE_CASE`.
- `displayName`: tên hiển thị.
- `legacyValue`: giá trị chuỗi tương thích database hiện tại trong giai đoạn migration.
- `archetype`: loại hình/lore (`HEAVENLY`, `MUTATED`, `ELEMENTAL`, `MIXED`), không biểu diễn sức mạnh.
- `elementIds`: danh sách affinity reference tới Element.
- `defensiveElementId`: hệ phòng thủ canonical, phải thuộc `elementIds`; null được resolve thành `NEUTRAL`.
- `rollWeight`: trọng số khởi tạo nhân vật.
- `effectIds`: danh sách reference tùy chọn tới Effect.
- `tags`: metadata phân loại.

Quality được tách thành registry `spirit_root_quality_tiers.json`. Player lưu `spiritRootId` và `spiritRootQualityTierId` độc lập. Mỗi quality tier có `order` và `effectIds`; ladder canonical gồm Hạ/Trung/Thượng/Cực/Thiên/Thánh/Tiên/Thần Phẩm.

## Quality Power Budget

| Phẩm cấp | ID | Tu luyện | Sát thương Skill cùng hệ |
| --- | --- | ---: | ---: |
| Hạ Phẩm | `LOWER_GRADE` | 0% | 0% |
| Trung Phẩm | `MIDDLE_GRADE` | 5% | 2% |
| Thượng Phẩm | `UPPER_GRADE` | 10% | 4% |
| Cực Phẩm | `PEAK_GRADE` | 20% | 7% |
| Thiên Phẩm | `HEAVENLY_GRADE` | 25% | 10% |
| Thánh Phẩm | `SAINT_GRADE` | 30% | 14% |
| Tiên Phẩm | `IMMORTAL_GRADE` | 35% | 18% |
| Thần Phẩm | `DIVINE_GRADE` | 50% | 25% |

## Rules

- Roll theo tổng `rollWeight`; entry có weight `0` không được chọn.
- Service không hardcode tên, xác suất hoặc danh sách Linh căn.
- Spirit Root không trực tiếp sửa Player/Battle; gameplay đi qua Effect/Modifier reference.
- `legacyValue` chỉ phục vụ tương thích, không phải ID domain mới.
- `elementIds = []` và `defensiveElementId = null` là hợp lệ, được battle resolve thành `NEUTRAL`.
- `defensiveElementId` không được nằm ngoài `elementIds`; runtime không tự chọn matchup có lợi nhất.
- Quality Effect tăng cultivation `0/5/10/20/25/30/35/50%` và matching-element Skill damage `0/2/4/7/10/14/18/25%`; không cộng battle stat global và không cộng dồn nhiều quality tier.
- Core Effect tĩnh dùng generic `passiveBindings`, không dùng policy riêng hard-code theo Spirit Root.
- Resolver hỗ trợ `ACTION`, `CULTIVATION`, `ENTITY` và `BREAKTHROUGH`. Matching damage dùng ACTION binding có predicate `ACTION_ELEMENT_MATCHES_SOURCE_AFFINITY`; runtime không suy ra con số từ tên/archetype/order.
- `PHONG_LINH_CAN` dùng affinity và defensive Element `WIND`. WIND hiện không có quan hệ sinh/khắc nên matchup vẫn neutral theo exact relation resolver.
- Matching damage chỉ áp cho direct `DAMAGE`/`CHAIN_DAMAGE` Action thuộc Skill. Offensive Element được resolve theo `Action → Effect → Skill`, phải khác `NEUTRAL` và nằm trong `spiritRootElementIds`. Mỗi Action áp tối đa một lần.
- Multiplier matching damage chạy hậu Formula, sau các stat/Skill Damage/Element Relation modifier hiện hành và trước `receiveDamage()` trừ khiên/HP. Basic attack, DOT/status và supplemental Effect không được hưởng.
- Execution result/context và observation event lưu Element, quality, bonus rate, multiplier và Effect IDs để replay/audit.
- Pool revision 4 dùng thứ tự quality Hạ/Trung/Thượng/Cực/Thiên/Thánh/Tiên/Thần:
  - Player mới, đời 0: `55/30/12/3/0/0/0/0`;
  - đời 1–2: `55/30/12/3/0/0/0/0`;
  - đời 3–5: `35/35/22/7/1/0/0/0`;
  - đời 6–9: `20/32/30/15/2/1/0/0`;
  - đời 10–19: `10/22/32/24/8/3/1/0`;
  - đời 20–39: `5/15/28/27/15/7/3/0`;
  - đời 40+: `2/8/18/27/22/14/7/2`.
- Player mới roll quality bằng bracket đời 0, độc lập với lượt roll loại Linh Căn. Player hiện hữu/backfill vẫn giữ `LOWER_GRADE` theo migration cũ và không bị reroll. Player hiện hữu có `rebirth_count > 0` nhận tối đa một entitlement hồi tố tại count hiện tại.
- Entitlement tích lũy được consume oldest-first và dùng bracket tại `rebirth_number` lúc cấp, không dùng odds đời hiện tại.
- Nếu template+quality trùng chính xác trạng thái hiện tại, seeded roller lấy cặp tiếp theo; rejected draws được lưu trong roll snapshot. Fail-safe hết thì rollback, không consume entitlement.
- Template-weight bracket Hỗn Độn theo số đời là `0–9: 0%`, `10–19: 0,5%`,
  `20–39: 1%`, `40+: 2%`; phần weight tương ứng được trừ khỏi Ngũ Hành Linh Căn.
  Mỗi bracket chứa đủ mọi template và tổng weight 100. `/start` dùng đời 0; reroll
  snapshot `templateBracketId`, toàn bộ weight và pool revision.

## Current Compatibility

Trọng số template nền: Thiên Linh Căn 1%, ba Linh căn biến dị tổng 9%, năm Linh căn
đơn hệ tổng 60% và Ngũ Hành Linh Căn 30%. Hỗn Độn có weight nền 0 và chỉ vào pool
qua bracket Luân hồi đã duyệt. Sau migration 019, mọi Player có quality Hạ Phẩm trở
lên; không còn quality null.

Ba quality ID mới chỉ là GameData reference; persistence đã lưu quality bằng `TEXT` và không có enum/check-list cố định nên không cần migration. `IMMORTAL_GRADE` giữ stable ID, chỉ đổi order từ 5 thành 7.
