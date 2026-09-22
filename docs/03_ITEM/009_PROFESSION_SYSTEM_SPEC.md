# PROFESSION_SYSTEM_SPEC

Module: Item / Gameplay

Version: 0.2

Status: APPROVED FOUNDATION — CONTENT PARTIALLY BLOCKED

---

# Purpose

Định nghĩa nền tảng hệ thống Nghề nghiệp chế tạo theo hướng data-driven, lazy evaluation và độc lập Discord.

Năm nghề canonical:

| ID | Tên | Trạng thái MVP | Sản phẩm định hướng |
| --- | --- | --- | --- |
| `ALCHEMIST` | Luyện Đan Sư | ACTIVE | Đan dược (`PILL`) |
| `TALISMAN_MASTER` | Phù Sư | ACTIVE | Phù lục consumable (`TALISMAN`) |
| `ARTIFACT_REFINER` | Luyện Khí Sư | ACTIVE | Tạo/nâng cấp Equipment |
| `FORMATION_MASTER` | Trận Sư | DEFINITION_ONLY | Formation loadout trong phase sau |
| `PUPPET_MASTER` | Khôi Lỗi Sư | DEFINITION_ONLY | Puppet companion trong phase sau |

`DEFINITION_ONLY` có nghĩa là ID, tên và boundary được đăng ký trước; chưa giả lập bằng consumable và chưa có runtime gameplay.

---

# Player Profession Policy

- Một Player có thể học và phát triển cả năm nghề.
- Mỗi nghề có EXP và phẩm nghề độc lập.
- Persistence dùng identity `(player_id, profession_id)`; không hard-code năm cột trên bảng Player.
- Không có đổi nghề hoặc reset nghề trong MVP vì không có giới hạn số nghề.

---

# Progression

- Mỗi nghề có chín phẩm từ Nhất Phẩm đến Cửu Phẩm.
- Threshold EXP, EXP của recipe và Realm gate là GameData, không nằm trong Discord command hoặc database function.
- Recipe khai báo `requiredProfessionId` và `requiredProfessionGrade`.
- Bảng progression chuẩn:

| Phẩm | EXP tích lũy | EXP recipe | Realm tối thiểu | Thời gian cơ bản |
| ---: | ---: | ---: | --- | ---: |
| 1 | 0 | 10 | `LUYEN_KHI` | 1 phút |
| 2 | 100 | 20 | `TRUC_CO` | 3 phút |
| 3 | 300 | 40 | `KET_DAN` | 10 phút |
| 4 | 700 | 80 | `NGUYEN_ANH` | 30 phút |
| 5 | 1500 | 160 | `HOA_THAN` | 90 phút |
| 6 | 3100 | 320 | `LUYEN_HU` | 240 phút |
| 7 | 6300 | 640 | `HOP_THE` | 600 phút |
| 8 | 12700 | 1280 | `DAI_THUA` | 1440 phút |
| 9 | 25500 | 2560 | `DO_KIEP` | 2880 phút |

- Recipe thấp hơn nghề hiện tại từ hai phẩm trở lên chỉ nhận 25% EXP, làm tròn xuống theo integer policy.
- EXP có thể vượt threshold nhưng grade thực tế không vượt Realm gate của Player.

---

# Recipe Unlock

Hai unlock mode canonical:

- `AUTO_BY_GRADE`: tự mở khi đủ nghề phẩm và các điều kiện recipe.
- `LEARNED`: phải dùng Recipe Item một lần để ghi learned recipe.

Recipe hiếm có thể rơi từ Reward/Monster/Quest/Sect nhưng nguồn cụ thể thuộc content data. Learned recipe là progression dài hạn, không phải inventory item sau khi đã học.

---

# Output Contract

Recipe output là tagged union, không giả định mọi output là stackable Item:

- `ITEM`: đan dược, phù lục và material.
- `EQUIPMENT`: runtime equipment instance.
- `FORMATION`: reserved cho Formation runtime phase sau.
- `PUPPET`: reserved cho Puppet runtime phase sau.

MVP chỉ execute `ITEM` và `EQUIPMENT`. Output type chưa có executor phải bị validator/runtime từ chối rõ, không fallback sang Item.

- Trong MVP, chỉ `EQUIPMENT` có phẩm chất thông qua `gradeQuality`/pool hiện hành.
- `ITEM` gồm PILL/TALISMAN giữ potency cố định theo template; không thêm quality vào identity của stack.

---

# Lazy Craft Job

Craft nghề nghiệp dùng start/claim, không có per-second tick:

1. Validate Player, nghề, recipe, Realm, learned recipe, slot và nguyên liệu.
2. Tạo immutable input/output policy snapshot và `ready_at`.
3. Khi claim, lấy thời gian database/application, khóa job và kiểm tra trạng thái.
4. Roll output bằng seed đã snapshot, apply reward và EXP trong một transaction.
5. Unique operation/business key chống start hoặc claim trùng.

- Một active slot cho mỗi nghề.
- Batch từ 1 đến 99; input/output và thời gian cùng nhân tuyến tính theo batch.
- Nguyên liệu/currency bị tiêu trong transaction start; MVP không cancel/refund job.
- `ready_at` cố định, claim chủ động, không có offline cap.
- Duration mặc định lấy từ bảng phẩm nghề; recipe có thể override bằng GameData khi được duyệt cụ thể.

---

# Energy And Tools

- MVP không có profession energy.
- MVP không có durability hoặc repair.
- Công cụ nghề có thể được bổ sung sau dưới dạng Effect/Modifier data-driven, nhưng không bắt buộc để dựng foundation.
- Sản lượng được giới hạn bởi nguyên liệu, thời gian và slot.

---

# Rebirth

- Giữ profession EXP/grade và learned recipes qua Luân hồi.
- Luân hồi bị chặn khi còn craft job đang hoạt động, cùng nguyên tắc activity gate hiện hành.
- Inventory/equipment vẫn tuân theo retention matrix Luân hồi hiện tại.
- Recipe luôn kiểm tra Realm tại lúc start; không cho start recipe vượt Realm chỉ vì nghề được giữ lại.

---

# Discord Boundary

- Command chính: `/nghenghiep`.
- Dashboard có chọn nghề và các view: Tổng quan, Công thức, Đang chế tạo.
- Start/claim là application use case; command chỉ render read model và gửi operation ID.
- `/chetao` có thể là shortcut sau, không tạo business logic riêng.
- `/nghenghiep` hiện triển khai bằng panel ephemeral: chọn nghề, recipe, batch; start/claim/refresh dùng application service và interaction ID làm operation ID.
- Các nghề `DEFINITION_ONLY` vẫn xuất hiện để thể hiện lộ trình nhưng action chế tạo bị vô hiệu hóa.

---

# Proposed Persistence Boundaries

- `player_professions`: EXP/grade/revision theo Player + profession.
- `player_learned_recipes`: ownership recipe vĩnh viễn.
- `profession_craft_jobs`: lifecycle persisted `IN_PROGRESS/CLAIMED/FAILED`; `READY` là trạng thái suy ra từ `ready_at`, không cần tick hoặc database write.
- Reward claim, resource ledger và idempotency tiếp tục dùng foundation hiện có.

DDL và runtime foundation được phép triển khai. Phá Chướng Đan dùng recipe explicit
`Tụ Linh Thảo ×4 + Thanh Tâm Thảo ×1` theo `Q-PROFESSION-015`. Content nghề nghiệp
mới ngoài recipe này vẫn phải chờ thông số được duyệt.

---

# Starter alchemy content

- `character_creation_rules.json` là nguồn cấu hình canonical cho các Đan Phương được cấp khi
  tạo nhân vật; runtime không hard-code danh sách trong Discord command.
- Recipe khởi đầu phải dùng `unlockMode: LEARNED` và được ghi vào
  `player_learned_recipes` trong cùng transaction tạo Player.
- Revision 3 cấp `CRAFT_BREAKTHROUGH_PILL` và `CRAFT_SPIRIT_GATHERING_PILL`.
- Migration 029/030 backfill idempotent hai Đan Phương này cho Player hiện hữu.

## Map-resource alignment

- Phá Chướng Đan dùng `Tụ Linh Thảo ×4 + Thanh Tâm Thảo ×1`; cả hai thuộc pool Linh Thảo
  của Thanh Vân Sơn Mạch.
- `CRAFT_SPIRIT_GATHERING_PILL`: Nhất Phẩm, `LEARNED`, thời gian 1 phút, không tốn
  Linh Thạch, tiêu `Tụ Linh Thảo ×3`, tạo một `SPIRIT_GATHERING_PILL`.
- Tụ Linh Đan Luyện Khí cộng 10% yêu cầu tu vi của tầng nhỏ hiện tại, chỉ dùng đúng
  `LUYEN_KHI` và không vượt ngưỡng đột phá.
- Đan Phương Tụ Linh Đan và Phá Chướng Đan đều nằm trong starter recipe revision 3.
- Quái Luyện Khí có ba reward roll; mỗi roll Tụ Linh Thảo 5% ×1 và Thanh Tâm Thảo
  1% ×1. Đây là nguồn phụ, vẫn chịu bonus chance từ phẩm chất quái.
- `/nghenghiep` hiển thị `/thuthap`, `/thamhiem` và Thanh Vân Sơn Mạch theo source
  metadata của nguyên liệu.
- `/tuido` dùng select để sử dụng Tụ Linh Đan. Use case chốt tu vi offline, kiểm tra
  exact Realm, tiêu Item và cập nhật tu vi trong cùng idempotent transaction.

---

# Related Specification

- `000_ITEM_MODULE_SPEC.md`
- `001_ITEM_TEMPLATE_SPEC.md`
- `003_ITEM_EFFECT_SPEC.md`
- `006_CRAFT_SPEC.md`
- `../10_GAMEPLAY/010_CRAFT_RUNTIME_SPEC.md`

---

# End
