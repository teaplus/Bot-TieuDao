# MONSTER QUALITY SPEC

## Phạm vi

Phẩm chất là lớp scaling data-driven dành cho quái thường. Nó không thay thế `Monster Variant`; `NORMAL`/`ELITE` vẫn xử lý hệ số variant, còn quality cộng thêm phần trăm trên base stat đã resolve từ Realm.

## Registry

Nguồn dữ liệu: `src/data/monster/monster_quality_tiers.json`.

- 10 bậc từ `FAN_THU` đến `HONG_HOANG_DI_THU`.
- `stepPercent` mặc định là `15` và có thể chỉnh trực tiếp trong JSON.
- Công thức: `qualityBonusPercent = stepPercent × (qualityOrder - 1)`.
- Multiplier: `1 + qualityBonusPercent / 100`.
- Áp dụng cho `HP`, `ATK`, `DEF`, `SPD`; kết quả stat integer dùng `Math.floor` như Monster runtime hiện tại.
- Quality mặc định của quái không có cấu hình explicit là `FAN_THU`, multiplier `1.0`.

Ví dụ với step 15%: Phàm Thú `+0%`, Linh Thú `+15%`, Yêu Thú `+30%`, ... Hồng Hoang Dị Thú `+135%`.

## Boss

`BOSS` và `WORLD_BOSS` không resolve quality, luôn snapshot `qualityId = null`, `qualityMultiplier = 1`. Boss Bí Cảnh tiếp tục dùng stage/variant scaling cũ; kể cả caller truyền `qualityId`, runtime phải bỏ qua.

## Deterministic snapshot

Monster plan lưu `qualityId`, tên/order, bonus percent và multiplier. Activity snapshot vì vậy giữ nguyên chất lượng và stat của encounter đã reserve, không phụ thuộc lần chỉnh JSON sau đó.

## Quality Pool runtime

Nguồn dữ liệu: `src/data/monster/monster_quality_pools.json`.

- Thanh Vân Sơn Mạch: Phàm `75`, Linh `20`, Yêu `5`.
- Huyền Mộc Quốc: Phàm `55`, Linh `30`, Yêu `12`, Huyền `3`.
- Đông Hoang Đại Lục: Phàm `35`, Linh `35`, Yêu `20`, Huyền `8`, Địa `2`.
- Mỗi map ACTIVE tham chiếu pool explicit; roll dùng Random Provider được inject và snapshot quality vào activity.
- Wave thường Bí Cảnh roll pool theo Realm. Wave cuối lấy Boss Pool riêng, ép variant `BOSS` và không roll quality.

## Phần chưa kích hoạt

`Q-MONSTER-009` đã chốt policy reward riêng:

- Công thức `effectiveChance = min(100, baseChance × (1 + rewardChanceBonusPercent / 100))`.
- Chỉ áp dụng `ITEM`, `EQUIPMENT`, `SKILL`, `CULTIVATION_ART`; `CURRENCY` không đổi.
- Exploration truyền bonus từ Monster plan đã snapshot, không đọc lại quality sau battle.
- Bonus Phàm → Hồng Hoang đã duyệt tại `Q-MONSTER-011`: `0/5/10/15/20/30/40/55/75/100%`.

Phong Lang không còn chặn Thanh Vân: `Q-MONSTER-010` chọn Thiết Giáp Lang cho MVP. `Q-ELEMENT-001` bổ sung WIND là sát thương thuần; không có dodge hoặc speed semantics.
