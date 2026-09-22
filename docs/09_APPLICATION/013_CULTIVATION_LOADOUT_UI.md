# Cultivation & Skill Loadout UI

Module: Application / Discord UI / Player Skill Loadout

Status: IMPLEMENTED — `Q-SKILL-002/003/004` RESOLVED.

## Command contract

`/congphap` là command duy nhất quản lý:

- Công Pháp tu luyện đang vận hành;
- Công Pháp và Kỹ Năng đã lĩnh ngộ;
- bí kíp Công Pháp/Kỹ Năng trong Túi Trữ Vật;
- loadout Kỹ Năng Chủ động và Bị động.

Command không có subcommand. `/kynang` đã được gỡ khỏi registry.

## Loadout canonical

- Active và Passive dùng chung tổng capacity.
- Mỗi Skill chỉ xuất hiện một lần.
- Tối đa 3 Active trong mọi cảnh giới.
- Passive chỉ kích hoạt Effect hoặc passive battle trigger khi được trang bị.
- Runtime Player tách `learnedSkillIds` và `equippedSkillIds`; alias `skillIds` tại Battle
  chỉ chứa equipped loadout.
- Replace loadout chạy trong transaction với lock Player trước, sau đó lock ownership rows.
  Unique partial index `(player_id, equipped_slot)` ngăn hai Skill chiếm cùng ô.

Capacity lấy từ `skill_rules.json`, revision 1:

| Mốc cảnh giới | Tổng ô |
| --- | ---: |
| Luyện Khí | 2 |
| Kết Đan | 3 |
| Hóa Thần | 4 |
| Hợp Thể | 5 |
| Độ Kiếp | 6 |
| Huyền Tiên | 7 |
| Thái Ất | 8 |
| Đạo Tổ | 9 |

Các cảnh giới nằm giữa giữ capacity của mốc gần nhất phía trước.

## Migration và backfill

Migration 028 thêm `equipped_slot` và `loadout_revision` vào `player_skills`.
Backfill deterministic theo `learned_at, skill_id`:

- Luyện Khí/Trúc Cơ lấy tối đa 2 Active;
- cảnh giới từ Kết Đan trở lên lấy tối đa 3 Active;
- Passive cũ không tự trang bị để tránh tự ý kích hoạt Effect mới.

## Discord presentation

- Thanh select Công Pháp và thanh multi-select Kỹ Năng tách biệt.
- Multi-select cho phép chọn từ 0 đến capacity hiện tại; chọn 0 là tháo toàn bộ Skill.
- Summary hiển thị tổng ô, Active/max Active, Passive và số ô từng Skill.
- Discord giới hạn 25 option, nên Skill được phân trang. Toàn bộ Skill đang trang bị luôn
  xuất hiện ở mọi trang; đổi trang không thể vô tình làm mất equipped loadout.
- Hai nút trang trước/sau dùng chung hàng với nút Đóng; toàn dashboard không vượt 5 action row.
- Phiên owner-only, ephemeral, TTL 2 phút và disable component khi đóng/hết hạn.

## Verification

- `audit:skill-loadout-runtime`
- `audit:cultivation-loadout-ui`
- `verify:progression:postgres` kiểm tra capacity, Active cap và concurrent replacement atomic.
