# LATE_GAME_CONTENT_MATRIX_DRAFT

## 1. Trạng thái tài liệu

- Trạng thái: `IMPLEMENTED`.
- Nguồn tên: `Danh_sach_quai_vat_game_tu_tien.txt` và
  `Ky_nang_quai_vat_theo_chung_toc.txt`.
- Phạm vi: 12 map từ Nguyên Anh đến Đạo Tổ.
- Mapping quái/Boss, Boss-only, baseline control và Quality Pool đã được duyệt tại
  `Q-MONSTER-015/016`; Hybrid Element và Xóa Buff/Khóa Hồi Máu đã hoàn tất tại
  `Q-MONSTER-017`, `Q-COMBAT-021`. `Q-MONSTER-018 A` chốt Băng Quy dùng Phản
  Kích + Hồi Phục. GameData đã phát hành 63 Skill được tuyến này tham chiếu,
  59 quái thường, 12 Boss và đầy đủ pool; cả 12 map hiện ở trạng thái `ACTIVE`.

## 2. Contract chung đã duyệt

### 2.1 Encounter

- Mỗi map có 4–5 quái thường, spawn equal-weight.
- Quái thường chỉ dùng variant `NORMAL`/`ELITE`, có phẩm chất theo Quality Pool.
- Boss không xuất hiện trong Thám Hiểm; mỗi cảnh giới có một Secret Realm Boss Pool
  weight `1`.
- Boss dùng variant `BOSS`, không roll phẩm chất, giữ công thức boss adaptive hiện tại.
- Mỗi quái và boss có tối đa hai Skill.
- Loadout ưu tiên một Skill tấn công và một Skill tấn công/hồi máu/khiên/khống chế.
- Skill damage cooldown 2. Skill hồi máu/khiên/khống chế cooldown 3.
- Hồi máu/khiên bản thân chỉ được ưu tiên khi HP dưới 50%, không bỏ qua cooldown.

### 2.2 Baseline Skill Action

Đây là power budget đã duyệt và được áp dụng:

| Nhóm | Primitive hiện hữu | Baseline đề xuất |
|---|---|---|
| Tấn công đơn | `DAMAGE` + `SKILL_DAMAGE` | Không thêm multiplier ngoài formula hiện tại |
| Tấn công chuỗi | `CHAIN_DAMAGE` | Tối đa 3 mục tiêu, multiplier nhảy `1/0,7/0,4` |
| Khống chế thường | `APPLY_EFFECT` | 20% thành công, duration 1 lượt |
| Khống chế boss | `APPLY_EFFECT` | 25% thành công, duration 1 lượt |
| Hồi máu | `HEAL` | Dùng formula hồi máu hiện hữu, ưu tiên dưới 50% HP |
| Khiên | `ADD_SHIELD` | Dùng formula khiên hiện hữu, ưu tiên dưới 50% HP |
| Buff/debuff | `ADD_MODIFIER` | Duration 2 lượt |
| Thanh tẩy | `PURIFY` | Xóa một debuff |
| Xóa buff | `DISPEL` | 20% thường/25% Boss; xóa một Buff dương mới nhất |
| Khóa hồi máu | `APPLY_EFFECT: HEAL_BLOCK` | 20% thường/25% Boss; chặn Action HEAL một lượt |

### 2.3 Quy tắc ID

- Monster ID: `MON_<RACE>_<ENGLISH_NAME>`.
- Boss ID: `MON_BOSS_<ENGLISH_NAME>`.
- Spawn Pool: `POOL_<MAP_ID>`.
- Quality Pool: `QUALITY_POOL_<MAP_ID>`.
- Secret Realm Boss Pool: `SECRET_BOSS_POOL_<REALM_CODE>`.
- Skill giữ ID canonical đã có trong `monster_skill_catalog.json`.

## 3. Ma trận map và quái thường

`Hệ đề xuất` là Element của Monster Template. Element trên từng Skill Action vẫn phải
được author/validate riêng khi triển khai.

### 3.1 Trung Châu Thánh Vực — Nguyên Anh

Chủ đề: Xà tộc chiếm cứ linh mạch và cổ thành Trung Châu.

| Quái | Race | Hệ đề xuất | Skill 1 | Skill 2 | Weight |
|---|---|---|---|---|---:|
| Thanh Xà | `SERPENT` | `WOOD` | `MON_SK_SERPENT_VENOM` | `MON_SK_SERPENT_CONSTRICT` | 20 |
| Xích Xà | `SERPENT` | `FIRE` | `MON_SK_SERPENT_BLOOD_VENOM` | `MON_SK_SERPENT_CONSTRICT` | 20 |
| Độc Xà | `SERPENT` | `WATER` | `MON_SK_SERPENT_VENOM` | `MON_SK_SERPENT_POISON_MIST` | 20 |
| Hắc Mãng | `SERPENT` | `EARTH` | `MON_SK_SERPENT_CONSTRICT` | `MON_SK_SERPENT_SHED` | 20 |
| Huyền Xà | `SERPENT` | `ICE` | `MON_SK_SERPENT_BLOOD_VENOM` | `MON_SK_SERPENT_SHED` | 20 |

Boss Bí Cảnh: **Cửu Đầu Xà** — `WATER`;
`MON_SK_SERPENT_NINE_HEAD_VENOM` +
`MON_SK_SERPENT_HEAVEN_DESCENT`.

### 3.2 Thiên Linh Giới — Hóa Thần

Chủ đề: Điểu tộc làm chủ các linh phong và hỏa vực trên không.

| Quái | Race | Hệ đề xuất | Skill 1 | Skill 2 | Weight |
|---|---|---|---|---|---:|
| Phong Ưng | `AVIAN` | `WIND` | `MON_SK_AVIAN_WIND_BLADE` | `MON_SK_AVIAN_DIVE` | 20 |
| Huyết Ưng | `AVIAN` | `FIRE` | `MON_SK_AVIAN_DIVE` | `MON_SK_AVIAN_GALE` | 20 |
| Hắc Nha | `AVIAN` | `METAL` | `MON_SK_AVIAN_DIVE` | `MON_SK_AVIAN_FLIGHT` | 20 |
| Hỏa Điểu | `AVIAN` | `FIRE` | `MON_SK_AVIAN_WIND_BLADE` | `MON_SK_AVIAN_GALE` | 20 |
| Lôi Điểu | `AVIAN` | `LIGHTNING` | `MON_SK_AVIAN_THUNDER_WING` | `MON_SK_AVIAN_DIVE` | 20 |

Boss Bí Cảnh: **Chu Tước Hậu Duệ** — `FIRE`;
`MON_SK_AVIAN_MYRIAD_FEATHERS` +
`MON_SK_AVIAN_GOLDEN_WING_SLASH`.

### 3.3 Hư Không Hải — Luyện Hư

Chủ đề: Hải tộc và thủy quái sinh tồn giữa hư không thủy triều.

| Quái | Race | Hệ đề xuất | Skill 1 | Skill 2 | Weight |
|---|---|---|---|---|---:|
| Sa Ngư | `SEA` | `WATER` | `MON_SK_SEA_WATER_ARROW` | `MON_SK_SEA_VORTEX` | 20 |
| Yêu Kình | `SEA` | `WATER` | `MON_SK_SEA_TSUNAMI` | `MON_SK_SEA_TIDAL_WAVE` | 20 |
| Thủy Xà | `SEA` | `WATER` | `MON_SK_SEA_WATER_ARROW` | `MON_SK_SEA_WATER_PRISON` | 20 |
| Hải Mãng | `SEA` | `ICE` | `MON_SK_SEA_TIDAL_WAVE` | `MON_SK_SEA_WATER_PRISON` | 20 |
| Hải Long | `SEA` | `WATER` | `MON_SK_SEA_TSUNAMI` | `MON_SK_SEA_VORTEX` | 20 |

Boss Bí Cảnh: **Hải Vương** — `WATER`;
`MON_SK_SEA_TSUNAMI` + `MON_SK_SEA_VORTEX`.

### 3.4 Thánh Linh Đại Lục — Hợp Thể

Chủ đề: Quy tộc và linh điểu phòng thủ thánh địa cổ.

| Quái | Race | Hệ đề xuất | Skill 1 | Skill 2 | Weight |
|---|---|---|---|---|---:|
| Linh Quy | `TURTLE` | `WATER` | `MON_SK_TURTLE_WATER_SHIELD` | `MON_SK_TURTLE_EARTHQUAKE` | 20 |
| Huyền Quy | `TURTLE` | `EARTH` | `MON_SK_TURTLE_SHELL` | `MON_SK_TURTLE_COUNTER` | 20 |
| Hắc Quy | `TURTLE` | `WATER` | `MON_SK_TURTLE_WATER_SHIELD` | `MON_SK_TURTLE_COUNTER` | 20 |
| Băng Quy | `TURTLE` | `ICE` | `MON_SK_TURTLE_COUNTER` | `MON_SK_TURTLE_RECOVERY` | 20 |
| Thanh Loan | `AVIAN` | `WIND` | `MON_SK_AVIAN_WIND_BLADE` | `MON_SK_AVIAN_FLIGHT` | 20 |

Boss Bí Cảnh: **Huyền Vũ** — `WATER`;
`MON_SK_TURTLE_XUANWU_SHIELD` +
`MON_SK_TURTLE_EARTHQUAKE`.

### 3.5 Cửu Thiên Tiên Cảnh — Đại Thừa

Chủ đề: Long tộc phân chia cửu thiên, mỗi nhánh thống lĩnh một linh vực.

| Quái | Race | Hệ đề xuất | Skill 1 | Skill 2 | Weight |
|---|---|---|---|---|---:|
| Ấu Long | `DRAGON` | `WIND` | `MON_SK_DRAGON_CLAW` | `MON_SK_DRAGON_SCALE` | 20 |
| Thanh Long | `DRAGON` | `WOOD` | `MON_SK_DRAGON_BREATH` | `MON_SK_DRAGON_WEATHER_CALL` | 20 |
| Hắc Long | `DRAGON` | `WATER` | `MON_SK_DRAGON_MIGHT` | `MON_SK_DRAGON_CLAW` | 20 |
| Băng Long | `DRAGON` | `ICE` | `MON_SK_DRAGON_BREATH` | `MON_SK_DRAGON_SCALE` | 20 |
| Lôi Long | `DRAGON` | `LIGHTNING` | `MON_SK_DRAGON_CLAW` | `MON_SK_DRAGON_WEATHER_CALL` | 20 |

Boss Bí Cảnh: **Thái Cổ Chân Long** — `LIGHTNING`;
`MON_SK_DRAGON_WORLD_END_BREATH` +
`MON_SK_DRAGON_TRUE_DESCENT`.

### 3.6 Thiên Kiếp Giới — Độ Kiếp

Chủ đề: Thiên Ma hóa thành tâm kiếp và ngoại ma ngăn cản người Độ Kiếp.

| Quái | Race | Hệ đề xuất | Skill 1 | Skill 2 | Weight |
|---|---|---|---|---|---:|
| Thiên Ma | `HEAVENLY_DEMON` | `DARK` | `MON_SK_HEAVENLY_DEMON_FIRE` | `MON_SK_HEAVENLY_DEMON_BODY` | 20 |
| Tâm Ma | `HEAVENLY_DEMON` | `DARK` | `MON_SK_HEAVENLY_DEMON_HEART_CORRUPTION` | `MON_SK_HEAVENLY_DEMON_ILLUSION` | 20 |
| Huyễn Ma | `HEAVENLY_DEMON` | `DARK` | `MON_SK_HEAVENLY_DEMON_ILLUSION` | `MON_SK_HEAVENLY_DEMON_POSSESSION` | 20 |
| Kiếm Ma | `HEAVENLY_DEMON` | `METAL` | `MON_SK_HEAVENLY_DEMON_FIRE` | `MON_SK_HEAVENLY_DEMON_BODY` | 20 |
| Huyết Ma | `HEAVENLY_DEMON` | `FIRE` | `MON_SK_HEAVENLY_DEMON_FIRE` | `MON_SK_HEAVENLY_DEMON_HEART_CORRUPTION` | 20 |

Boss Bí Cảnh: **Ma Đế** — `DARK`;
`MON_SK_HEAVENLY_DEMON_FIRE` +
`MON_SK_HEAVENLY_DEMON_BODY`.

### 3.7 Tiên Giới — Chân Tiên

Chủ đề: Linh vật hóa hình và tiên long bảo vệ nguồn sinh mệnh Tiên Giới.

| Quái | Race | Hệ đề xuất | Skill 1 | Skill 2 | Weight |
|---|---|---|---|---|---:|
| Linh Chi Tinh | `SPIRIT_CREATURE` | `WOOD` | `MON_SK_SPIRIT_LIGHT` | `MON_SK_SPIRIT_HEAL` | 20 |
| Hoa Linh | `SPIRIT_CREATURE` | `WOOD` | `MON_SK_SPIRIT_LIGHT` | `MON_SK_SPIRIT_HASTE` | 20 |
| Mộc Linh | `SPIRIT_CREATURE` | `WOOD` | `MON_SK_SPIRIT_LIGHT` | `MON_SK_SPIRIT_LIFE_SPRING` | 20 |
| Ứng Long | `DRAGON` | `WIND` | `MON_SK_DRAGON_CLAW` | `MON_SK_DRAGON_WEATHER_CALL` | 20 |
| Hỏa Long | `DRAGON` | `FIRE` | `MON_SK_DRAGON_BREATH` | `MON_SK_DRAGON_SCALE` | 20 |

Boss Bí Cảnh: **Vạn Linh Chi Chủ** — `WOOD`;
`MON_SK_SPIRIT_LIGHT` +
`MON_SK_SPIRIT_LIFE_SPRING`.

### 3.8 Huyền Thiên Tiên Vực — Huyền Tiên

Chủ đề: Yêu tộc hóa hình, sở trường huyễn thuật và yêu hỏa.

| Quái | Race | Hệ đề xuất | Skill 1 | Skill 2 | Weight |
|---|---|---|---|---|---:|
| Hồ Yêu | `YAO` | `FIRE` | `MON_SK_YAO_FIRE` | `MON_SK_YAO_CHARM` | 20 |
| Miêu Yêu | `YAO` | `WIND` | `MON_SK_YAO_AURA` | `MON_SK_YAO_ILLUSION` | 20 |
| Điểu Yêu | `YAO` | `WIND` | `MON_SK_YAO_FIRE` | `MON_SK_YAO_ILLUSION` | 20 |
| Xà Yêu | `YAO` | `WATER` | `MON_SK_YAO_AURA` | `MON_SK_YAO_CHARM` | 20 |
| Hổ Yêu | `YAO` | `METAL` | `MON_SK_YAO_BERSERK` | `MON_SK_YAO_FIRE` | 20 |

Boss Bí Cảnh: **Yêu Hoàng** — `DARK`;
`MON_SK_YAO_FIRE` + `MON_SK_YAO_ILLUSION`.

### 3.9 Kim Khuyết Thiên — Kim Tiên

Chủ đề: Sinh linh Kim hệ tụ hội trong thiên vực kim khuyết.

| Quái | Race | Hệ đề xuất | Skill 1 | Skill 2 | Weight |
|---|---|---|---|---|---:|
| Kim Ưng | `AVIAN` | `METAL` | `MON_SK_AVIAN_GOLDEN_WING_SLASH` | `MON_SK_AVIAN_DIVE` | 20 |
| Kim Lân Mãng | `SERPENT` | `METAL` | `MON_SK_SERPENT_CONSTRICT` | `MON_SK_SERPENT_SHED` | 20 |
| Kim Long | `DRAGON` | `METAL` | `MON_SK_DRAGON_CLAW` | `MON_SK_DRAGON_SCALE` | 20 |
| Kim Giáp Trùng | `INSECT` | `METAL` | `MON_SK_INSECT_ARMOR_CORROSION` | `MON_SK_INSECT_SWARM_ATTACK` | 20 |
| Kim Giáp Quy | `TURTLE` | `METAL` | `MON_SK_TURTLE_SHELL` | `MON_SK_TURTLE_COUNTER` | 20 |

Boss Bí Cảnh: **Kim Sí Đại Bằng** — `METAL`;
`MON_SK_AVIAN_GOLDEN_WING_SLASH` +
`MON_SK_AVIAN_MYRIAD_FEATHERS`.

### 3.10 Thái Sơ Giới — Thái Ất

Chủ đề: Dị thú Thượng Cổ thức tỉnh từ thời Thái Sơ.

| Quái | Race | Hệ đề xuất | Skill 1 | Skill 2 | Weight |
|---|---|---|---|---|---:|
| Cùng Kỳ | `ANCIENT_BEAST` | `CHAOS` | `MON_SK_ANCIENT_DESTRUCTION` | `MON_SK_ANCIENT_PRESSURE` | 20 |
| Thao Thiết | `ANCIENT_BEAST` | `CHAOS` | `MON_SK_ANCIENT_DEVOUR_HEAVEN` | `MON_SK_ANCIENT_DEVOUR` | 20 |
| Thao Ngột | `ANCIENT_BEAST` | `EARTH` | `MON_SK_ANCIENT_DESTRUCTION` | `MON_SK_ANCIENT_PRESSURE` | 20 |
| Hỗn Độn Thú | `ANCIENT_BEAST` | `CHAOS` | `MON_SK_ANCIENT_CHAOS_QI` | `MON_SK_ANCIENT_DEVOUR` | 20 |
| Côn Bằng | `ANCIENT_BEAST` | `WIND` | `MON_SK_ANCIENT_DEVOUR_HEAVEN` | `MON_SK_ANCIENT_PRESSURE` | 20 |

Boss Bí Cảnh: **Thái Cổ Dị Thú** — `CHAOS`;
`MON_SK_ANCIENT_DESTRUCTION` +
`MON_SK_ANCIENT_PRESSURE`.

### 3.11 Đại La Thiên — Đại La

Chủ đề: Ngũ đại Thần Thú trấn giữ năm phương Đại La.

| Quái | Race | Hệ đề xuất | Skill 1 | Skill 2 | Weight |
|---|---|---|---|---|---:|
| Thanh Long | `DIVINE_BEAST` | `WOOD` | `MON_SK_DIVINE_ELEMENT_LORD` | `MON_SK_DIVINE_REBIRTH` | 20 |
| Bạch Hổ | `DIVINE_BEAST` | `METAL` | `MON_SK_DIVINE_PUNISHMENT` | `MON_SK_DIVINE_SHIELD` | 20 |
| Chu Tước | `DIVINE_BEAST` | `FIRE` | `MON_SK_DIVINE_ELEMENT_LORD` | `MON_SK_DIVINE_REBIRTH` | 20 |
| Huyền Vũ | `DIVINE_BEAST` | `WATER` | `MON_SK_DIVINE_SHIELD` | `MON_SK_DIVINE_PUNISHMENT` | 20 |
| Kỳ Lân | `DIVINE_BEAST` | `EARTH` | `MON_SK_DIVINE_LIGHT` | `MON_SK_DIVINE_SHIELD` | 20 |

Boss Bí Cảnh: **Ngũ Thánh Thú** — `LIGHT`;
`MON_SK_DIVINE_ELEMENT_LORD` +
`MON_SK_DIVINE_PUNISHMENT`.

Ghi chú identity: các tên Thanh Long/Bạch Hổ/Huyền Vũ ở đây là bản
`DIVINE_BEAST`, phải có ID khác với Monster cấp thấp hoặc boss Quy/Long tộc.

### 3.12 Khởi Nguyên Đạo Giới — Đạo Tổ

Chủ đề: hóa thân quy tắc và ý chí Thiên Đạo.

| Quái | Race | Hệ đề xuất | Skill 1 | Skill 2 | Weight |
|---|---|---|---|---|---:|
| Thiên Đạo Ý Chí | `HEAVENLY_DAO_AVATAR` | `LIGHT` | `MON_SK_DAO_PUNISHMENT` | `MON_SK_DAO_SUPPRESSION` | 25 |
| Đạo Linh | `HEAVENLY_DAO_AVATAR` | `LIGHT` | `MON_SK_DAO_PUNISHMENT` | `MON_SK_DAO_DISPEL` | 25 |
| Hỗn Độn Linh | `HEAVENLY_DAO_AVATAR` | `CHAOS` | `MON_SK_DAO_RULE_DESTRUCTION` | `MON_SK_DAO_DISPEL` | 25 |
| Đạo Binh | `HEAVENLY_DAO_AVATAR` | `METAL` | `MON_SK_DAO_PUNISHMENT` | `MON_SK_DAO_HEAL_LOCK` | 25 |

Boss Bí Cảnh: **Thiên Đạo Hóa Thân** — `CHAOS`;
`MON_SK_DAO_RULE_DESTRUCTION` +
`MON_SK_DAO_SUPPRESSION`.

## 4. Quality Pool đã duyệt

Quality chỉ roll cho quái thường/Elite. Boss bỏ qua bảng này.

| Realm order | Map | Phân phối đề xuất |
|---:|---|---|
| 4 | Trung Châu Thánh Vực | Linh 45%, Yêu 35%, Huyền 15%, Địa 5% |
| 5 | Thiên Linh Giới | Yêu 45%, Huyền 35%, Địa 15%, Thiên 5% |
| 6 | Hư Không Hải | Huyền 45%, Địa 35%, Thiên 15%, Thánh 5% |
| 7 | Thánh Linh Đại Lục | Địa 45%, Thiên 35%, Thánh 15%, Tiên 5% |
| 8 | Cửu Thiên Tiên Cảnh | Thiên 45%, Thánh 35%, Tiên 15%, Thần 5% |
| 9 | Thiên Kiếp Giới | Thánh 45%, Tiên 35%, Thần 15%, Hồng Hoang 5% |
| 10 | Tiên Giới | Thánh 30%, Tiên 40%, Thần 25%, Hồng Hoang 5% |
| 11 | Huyền Thiên Tiên Vực | Tiên 40%, Thần 40%, Hồng Hoang 20% |
| 12 | Kim Khuyết Thiên | Tiên 25%, Thần 55%, Hồng Hoang 20% |
| 13 | Thái Sơ Giới | Tiên 10%, Thần 70%, Hồng Hoang 20% |
| 14 | Đại La Thiên | Thần 80%, Hồng Hoang 20% |
| 15 | Khởi Nguyên Đạo Giới | Thần 80%, Hồng Hoang 20% |

Quyết định `Q-MONSTER-016 B`: lần phát hành đầu cap Hồng Hoang 20% từ Huyền Tiên
trở đi; phần vượt cap ở bốn map cuối đã chuyển sang Thần. Hồng Hoang vẫn tăng stat
base `9 × 15% = 135%` và tăng tương đối 100% chance reward phi currency.

## 5. Boss Pool đề xuất

| Realm | Boss |
|---|---|
| Nguyên Anh | Cửu Đầu Xà |
| Hóa Thần | Chu Tước Hậu Duệ |
| Luyện Hư | Hải Vương |
| Hợp Thể | Huyền Vũ |
| Đại Thừa | Thái Cổ Chân Long |
| Độ Kiếp | Ma Đế |
| Chân Tiên | Vạn Linh Chi Chủ |
| Huyền Tiên | Yêu Hoàng |
| Kim Tiên | Kim Sí Đại Bằng |
| Thái Ất | Thái Cổ Dị Thú |
| Đại La | Ngũ Thánh Thú |
| Đạo Tổ | Thiên Đạo Hóa Thân |

## 6. Nội dung dữ liệu đã triển khai

- 59 Monster Template thường và 12 Boss Template.
- 12 Monster Spawn Pool.
- 12 Monster Quality Pool.
- 12 Secret Realm Boss Pool.
- Đã author executable definition cho toàn bộ Monster Skill được 12 map tham chiếu.
- Đã chuyển đúng 12 map từ `CONTENT_PENDING` sang `ACTIVE`, thêm
  `EXPLORATION/GATHERING` và các pool reference tương ứng.
- Không cần migration PostgreSQL vì đây là GameData content; Player current-map state
  dùng ID map đã tồn tại.

## 7. Gate kiểm chứng khi triển khai

- Validator: mọi Element, Skill, Monster, Pool, Realm và Reward reference tồn tại.
- Mỗi loadout tối đa hai Skill và có ít nhất một Damage Action executable.
- Boss không nằm trong normal spawn pool và không có Quality.
- Tổng weight mỗi Spawn/Quality/Boss Pool hợp lệ.
- Encounter deterministic với seeded Random Provider cho cả 12 map.
- Reward alias resolve đủ order 4–15.
- Exploration và Secret Realm simulation ít nhất một case mỗi Realm.
- Không thêm Action type mới nếu chưa có câu hỏi/contract riêng.

## 8. Các điểm chủ dự án cần xác nhận trước khi triển khai

1. Mapping quái/Skill/Boss tại mục 3 và 5: **đã duyệt** theo
   `Q-MONSTER-015 A`.
2. Quality Pool tại mục 4: **đã duyệt** theo `Q-MONSTER-016 B`.
3. Boss chỉ xuất hiện ở Bí Cảnh, không xuất hiện trong Thám Hiểm: **đã duyệt**.
4. Hướng cho `LIGHT`, `DARK`, `CHAOS`:
   - **E1 — Thêm ba Element canonical dạng sát thương thuần:** ban đầu không có
     tương sinh/tương khắc; mechanic Purify/Heal Block/Dispel được author riêng bằng
     primitive đã duyệt. Data-driven và giữ đúng lore, nhưng mở rộng Battle Stat và
     Equipment elemental registry.
   - **E2 — Giữ các map liên quan ở `CONTENT_PENDING`:** triển khai trước các map chỉ
     dùng tám Element hiện hữu; an toàn nhưng tuyến late-game vẫn bị ngắt.
   - **E3 — Đổi các Monster đó sang `NEUTRAL`:** ít việc nhất nhưng làm mất bản sắc
     Quang/Ám/Hỗn Độn và trái catalog nguồn; không đề xuất.
   - **Quyết định:** Chủ dự án chọn E1. `LIGHT/DARK/CHAOS` đã có foundation
     canonical; Ánh Sáng và Bóng Tối khắc lẫn nhau, Hỗn Độn không có quan hệ khắc.
     `Q-ELEMENT-002/003` đã RESOLVED theo wildcard: bonus phẩm tương hợp mọi Skill
     Damage có hệ; bonus riêng 2% chỉ nhân vào sát thương cuối khi Action thực sự
     `COUNTER` mục tiêu. Element Damage từ trang bị giữ nguyên 100%, không có phép
     giảm `1/3`.
5. Baseline Skill Action và tỷ lệ control 20%/25%: **đã duyệt và triển khai**.
   Element hybrid hoàn tất tại `Q-MONSTER-017`; Xóa Buff/Khóa Hồi Máu hoàn tất tại
   `Q-COMBAT-021`. `Q-MONSTER-018 A` đã thay Mai Giáp của Băng Quy bằng Phản
   Kích, khôi phục invariant mọi loadout có ít nhất một Damage Action.
