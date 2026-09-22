# 2026-07-11 Project Roadmap

## Mục tiêu

Biến bộ spec trong `docs/` thành một dự án Discord Tu Tiên RPG hoàn chỉnh bằng Node.js, có thể mở rộng bằng data, dễ test, và bám đúng kiến trúc đã khóa trong tài liệu.

## Nguyên tắc triển khai

1. Không build feature lớn trước khi xong nền tảng dependency.
2. Không code gameplay trực tiếp trong command Discord.
3. Không để runtime đọc JSON trực tiếp.
4. Ưu tiên module chạy độc lập với Discord để test và simulation.
5. Mỗi phase đều phải có output code chạy được, không chỉ có structure.

## Roadmap đề xuất

### Phase 0 - Chuẩn hóa project hiện tại

Mục tiêu:
- Chốt thư mục mục tiêu theo docs.
- Tách rõ `application`, `gameplay`, `battle`, `runtime`, `platform`, `data`.
- Thêm script dev/test/lint/bootstrap.

Deliverables:
- Khung thư mục mới trong `src/`.
- `app bootstrap` tối thiểu.
- Config loader theo environment.
- Logger cơ bản.
- Quy ước lỗi và result object.

Done khi:
- Bot vẫn khởi động được.
- Command cũ chưa cần hoàn hảo nhưng không bị vỡ entrypoint.

### Phase 1 - Game Data Pipeline

Mục tiêu:
- Xây `DataLoader`, `DataValidator`, `GameDataManager`.
- Chuẩn hóa toàn bộ JSON data vào một registry read-only.

Deliverables:
- `src/data/json/*`
- `src/foundation/data-loader/*`
- `src/foundation/data-validator/*`
- `src/foundation/game-data/*`
- Error report cho missing ref, duplicate id, enum sai.

Done khi:
- App boot được và validate toàn bộ data trước khi login Discord.
- Không còn class gameplay/runtime nào đọc file JSON trực tiếp.

### Phase 2 - Core Data Contracts

Mục tiêu:
- Khóa schema thực thi cho realm, element, attribute, modifier, currency, action type.

Deliverables:
- JSON schema hoặc validator rule cho core data.
- Mapper object chuẩn cho từng collection.
- Test validate cho core collections.

Done khi:
- Core data có thể được query qua `GameDataManager` với API ổn định.

### Phase 3 - Platform + Repository Foundation

Mục tiêu:
- Định nghĩa hạ tầng lưu trữ và boundary transaction.

Deliverables:
- Database client wrapper.
- Repository interfaces.
- Player repository, inventory repository, progress repository.
- ID generator, random provider, time provider.
- Save pipeline bản đầu.

Done khi:
- Có thể load/save player runtime theo contract mới.

### Phase 4 - Runtime Model

Mục tiêu:
- Chuẩn hóa runtime object tách biệt khỏi template data.

Deliverables:
- `RuntimePlayer`
- `RuntimeInventory`
- `RuntimeItem`
- `RuntimeEquipment`
- `RuntimeSkill`
- `RuntimeCurrency`
- `RuntimeEffect`
- `BattleEntityFactory`

Done khi:
- Có thể build một runtime player hoàn chỉnh từ DB + GameDataManager.

### Phase 5 - Item / Equipment / Skill / Monster Module

Mục tiêu:
- Hoàn thiện các module content làm đầu vào cho gameplay và battle.

Deliverables:
- Item template + effect resolver.
- Reward table system.
- Equipment generator.
- Skill template/trigger/action resolver.
- Monster template/group/AI/generator.

Done khi:
- Có thể sinh player loadout và monster team hoàn toàn từ data.

### Phase 6 - Battle Engine MVP

Mục tiêu:
- Có battle loop tối thiểu chạy được trong memory.

Deliverables:
- BattleContext
- BattleEntity
- TurnManager
- TargetSelector
- ActionExecutor
- FormulaEngine MVP
- EffectEngine MVP
- BattleResult

Scope MVP:
- Damage
- Heal
- Shield
- Buff/debuff cơ bản
- Cooldown
- Chọn mục tiêu đơn giản

Done khi:
- Chạy được simulation `player vs monster`.
- Không phụ thuộc Discord hay DB trong lúc resolve battle.

### Phase 7 - Gameplay Core MVP

Mục tiêu:
- Build các flow người chơi cốt lõi trước khi mở rộng feature.

Deliverables:
- Player profile
- Inventory
- Cultivation
- Breakthrough
- Reward apply
- Basic exploration

Done khi:
- Người chơi có thể tạo nhân vật, tu luyện, nhận reward, xem tiến trình.

### Phase 8 - Discord Application Layer

Mục tiêu:
- Gắn game kernel vào Discord một cách sạch và dễ mở rộng.

Deliverables:
- Command router
- Interaction handler
- Response builder
- Message/embed renderer
- Error handler
- Session tối thiểu

Ưu tiên command:
- `/start`
- `/profile`
- `/tuvi`
- `/dotpha`
- `/inventory`
- `/skill`
- `/equip`

Done khi:
- Toàn bộ flow core MVP dùng được qua slash command.

### Phase 9 - Gameplay Expansion

Mục tiêu:
- Mở rộng feature theo docs sau khi core ổn định.

Deliverables:
- Sect
- Shop runtime
- Craft runtime
- Exchange runtime
- Gathering
- Secret realm
- Reward runtime
- Player progress

Ưu tiên gameplay:
1. Exploration
2. Secret realm
3. Shop
4. Craft
5. Exchange
6. Sect

Done khi:
- Có gameplay loop farm, tiêu hao tài nguyên, vượt ải, nhận đồ, nâng tiến trình.

### Phase 10 - Advanced Combat Content

Mục tiêu:
- Nâng battle từ MVP lên framework có thể mở rộng dài hạn.

Deliverables:
- Trigger timing chuẩn
- Stack rule
- Priority rule
- DOT/HOT
- Crowd control
- Multi-wave battle
- Boss behavior
- World boss

Done khi:
- Secret realm và world boss dùng chung một battle framework ổn định.

### Phase 11 - Testing + Simulation

Mục tiêu:
- Bảo vệ gameplay khỏi lệch cân bằng và regression.

Deliverables:
- Unit test cho validator, repository, reward, battle formula.
- Integration test cho gameplay flows.
- Battle simulation CLI.
- Snapshot log cho combat result.

Done khi:
- Có thể chạy regression test trước mỗi lần đổi data hoặc logic.

### Phase 12 - Operations + Release

Mục tiêu:
- Đưa project sang trạng thái deploy được và bảo trì được.

Deliverables:
- Migration strategy.
- Seed data.
- Env template.
- Logging policy.
- Monitoring cơ bản.
- Admin command hoặc internal tools tối thiểu.

Done khi:
- Có thể deploy bot ổn định trên môi trường thật.

## Backlog spec cần làm rõ trước khi code sâu

1. Schema JSON chi tiết cho tất cả collection còn thiếu field.
2. Battle formula cụ thể: hit, crit, def, pen, speed, turn order.
3. Trigger lifecycle: on turn start, on action, on hit, on kill, on round end.
4. Save pipeline và transaction boundary cho gameplay reward/battle reward.
5. Session model cho interaction nhiều bước trên Discord.
6. Secret realm config: ticket loại nào, số wave, unlock rule, reward rule, reset rule.

## Thứ tự triển khai thực tế mình khuyến nghị

1. Refactor bootstrap + structure.
2. Làm game data pipeline.
3. Làm runtime + repository.
4. Làm reward/item/equipment/skill/monster generator.
5. Làm battle MVP.
6. Gắn command Discord cho flow core.
7. Mở gameplay expansion.
8. Thêm test, simulator, vận hành.

## Milestone giao hàng

- Milestone A: Boot app + validate data + load player runtime.
- Milestone B: Battle MVP chạy CLI.
- Milestone C: Slash commands core chơi được trên Discord.
- Milestone D: Secret realm loop hoàn chỉnh.
- Milestone E: Test + simulation + deploy ready.

## Gợi ý sprint đầu tiên

Sprint 1 nên chỉ làm:
- Chuẩn hóa cấu trúc `src/`.
- Tạo config/logger/error/result.
- Tạo `GameDataLoader`, `GameDataValidator`, `GameDataManager`.
- Bỏ toàn bộ `readFileSync` trực tiếp khỏi runtime class mới.
- Viết test boot + validate data.

Nếu Sprint 1 làm chắc, các phase sau sẽ nhanh và ít phải đập đi xây lại.
