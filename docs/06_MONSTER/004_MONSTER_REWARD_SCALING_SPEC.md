# Monster Reward Scaling Specification

Module: Monster / Reward / GameData

Version: 1.0

Status: APPROVED FOUNDATION AND EXPLICIT-TIER CONTRACT — TIER 5–15 CONTENT PENDING

---

## Mục tiêu

Monster Reward được sinh từ Realm Registry và một cấu hình canonical, không viết lặp
Reward Table theo từng cảnh giới và không hard-code tên cảnh giới trong runtime service.

## Nguồn dữ liệu

`src/data/monster/monster_reward_scaling.json`

File này điều khiển:

- alias Monster Reward;
- Realm order nào đã có reward;
- ID và roll count của từng bảng;
- công thức Linh Thạch;
- tỷ lệ Equipment/Item explicit theo từng tier.

`reward_tables.json` không còn chứa các bảng `MONSTER_*`; file đó tiếp tục dành cho các
nguồn độc lập như Tầm Bảo.

## Currency formula

```text
min = FLOOR(baseMin × growthFactor^(realmOrder - baseRealmOrder))
max = FLOOR(baseMax × growthFactor^(realmOrder - baseRealmOrder))
```

Baseline đã duyệt:

```text
baseRealmOrder = 1
baseMin = 10
baseMax = 20
growthFactor = 2
```

Kết quả tier 1–4 là `10–20`, `20–40`, `40–80`, `80–160`.

## Explicit rare rewards

Equipment và Item không tự scale theo currency. Mỗi entry trong `tiers` phải khai báo:

- `realmOrder`, `tableId`, `rollCount`;
- Equipment chance/type/grade pool khi có;
- Item ID, chance và quantity.

`coveragePolicy: CONFIGURED_TIERS_ONLY` có nghĩa chỉ Realm order xuất hiện trong `tiers`
được sinh reward và ánh xạ alias. Không fallback âm thầm sang tier thấp hơn.

## Runtime pipeline

```text
Realm Registry
→ Monster Reward Scaling tiers
→ generated Reward Tables
→ generated BASIC_MONSTER_DROP.realmOrderTableIds
→ MonsterGeneratorService resolve ID cuối
→ RewardTableService roll
```

Runtime Monster chỉ giữ Reward Table ID đã resolve. Discord, Battle và Reward service
không ghép `MONSTER_${realmName}` và không so sánh chuỗi tên cảnh giới.

## Content coverage

- Realm order 1–4 đã cấu hình và giữ nguyên economy trước migration.
- `Q-REWARD-006` đã chọn mô hình explicit: mỗi Realm order phải có một record riêng
  cho `rollCount`, Equipment, Item và `gradePoolId`; runtime không sinh tỷ lệ rare
  reward từ công thức.
- `Q-EQUIPMENT-002` và `Q-REWARD-007` đã khóa tuyến bảy grade cùng baseline
  Item/chance/quantity cho tier 5–15.
- Realm gate, curve grade và LUCK reward đã được duyệt; LUCK runtime đã phát hành.
- Việc publish Realm order 5–15 chờ authoring song hệ/cutover template tại
  `Q-EQUIPMENT-006` và semantics elemental tại `Q-COMBAT-019`; source
  `MONSTER_DROP` được công bố atomically cùng Reward Table để UI không hiển thị
  nguồn chưa reachable.
- Việc có reward tier không tự kích hoạt Map, Spawn Pool hoặc Monster content.

## Validation

Validator kiểm tra:

- version/ID/alias/currency formula;
- Realm order và table ID không trùng;
- Realm order tồn tại;
- roll count nguyên dương;
- Item và equipment grade pool reference hợp lệ;
- generated table tồn tại;
- generated alias mapping khớp từng tier.
