# 2026-07-11 Docs Analysis

## Mục tiêu

Đọc toàn bộ `docs/**/*.md`, đối chiếu với source hiện tại, rồi chốt hiện trạng dự án trước khi triển khai roadmap code hoàn chỉnh.

## Phạm vi đã đọc

- `docs/00_PROJECT`: bootstrap AI, roadmap, todo, design decision, changelog.
- `docs/01_FOUNDATION`: architecture, data loading, validator, game data manager, action, reward, random, glossary, roadmap.
- `docs/02_CORE_DATA`: game data model, reference rule, realm, element, attribute, modifier, action type, currency.
- `docs/03_ITEM`: item template, item effect, reward table, shop, craft, exchange, gathering, effect system.
- `docs/04_EQUIPMENT`: template, type, grade, affix, set, runtime, generator.
- `docs/05_SKILL`: template, category, grade, trigger, action, pool, generator, runtime.
- `docs/06_MONSTER`: template, variant, group, AI, runtime, generator.
- `docs/07_RUNTIME`: runtime player, inventory, item, equipment, skill, currency, effect, repository, battle entity factory.
- `docs/08_BATTLE`: module, entity, context, pipeline, turn manager, target selector, skill manager, action executor, formula, effect, result.
- `docs/09_APPLICATION`: command, router, session, response, render, interaction, scheduler, error handler, bootstrap.
- `docs/10_GAMEPLAY`: player, inventory, cultivation, breakthrough, sect, exploration, secret realm, world boss, shop/craft/exchange/reward runtime, progress.
- `docs/11_PLATFORM`: configuration, logger, database, cache, event bus, scheduler, random/time/id provider, transaction, save pipeline, bootstrap.
- `docs/12_IMPLEMENTATION`: folder structure, dependency rule, repository/service/factory/validator/interface/class design, testing, error handling, code style, AI guide.

## Kiến trúc mục tiêu rút ra từ docs

1. Dự án đi theo hướng `Data First`, `Data Driven`, `Single Source Of Truth`.
2. `GameData` phải được nạp một lần, validate một lần, sau đó dùng dạng read-only cho runtime.
3. Dependency một chiều:
   `Application -> Gameplay -> Runtime/Repository -> Platform`
   và `Battle -> Runtime -> GameData`.
4. Battle không đọc database, không đọc JSON, chỉ chạy trên runtime object trong memory.
5. Gameplay không chứa battle formula, Application không chứa gameplay logic, Repository không chứa gameplay logic.

## Hiện trạng source code

### Điểm đang có

- Đã có bot Discord chạy bằng Node.js ESM.
- Đã có lệnh người chơi cơ bản trong `src/commands/player`.
- Đã có một số object/game manager như `Player`, `ItemFactory`, `SkillFactory`, `EquipmentManager`, `TreasureHuntManager`.
- Đã có PostgreSQL connector trong `src/database`.
- Đã có dữ liệu JSON thử nghiệm trong `src/data`.

### Độ lệch so với docs

1. Source hiện tại vẫn đọc JSON trực tiếp trong runtime class.
   - Ví dụ: `src/core/Player.js` đọc `realms.json`, `cultivationArts.json`, `effects.json`.
   - Điều này lệch với rule `Gameplay/Battle không đọc JSON trực tiếp`.
2. Kiến trúc hiện tại thiên về script + manager hơn là layer rõ ràng theo docs.
3. Chưa thấy `GameDataLoader`, `DataValidator`, `GameDataManager` đúng chuẩn tài liệu.
4. Chưa thấy battle engine hoàn chỉnh theo pipeline docs.
5. Nhiều spec gameplay/battle/application/platform mới ở mức khung, chưa đủ chi tiết để code dứt điểm toàn bộ module.
6. Test framework gần như chưa có.
7. `package.json` chưa có scripts cho lint, test, migration, seed, simulate.

## Đánh giá chất lượng spec

### Phần đã đủ mạnh để bắt đầu code nền tảng

- Foundation architecture.
- Dependency rule.
- Game data model tổng quát.
- Reward/action/random định hướng trách nhiệm.
- Folder/dependency/class design rule.

### Phần còn thiếu chi tiết để code sâu

- Nhiều file ở `08_BATTLE`, `09_APPLICATION`, `10_GAMEPLAY`, `11_PLATFORM`, `12_IMPLEMENTATION` mới có heading hoặc skeleton.
- Chưa có schema field đầy đủ cho toàn bộ JSON collections.
- Chưa có contract chi tiết cho save pipeline, transaction boundary, session lifecycle.
- Chưa có combat formula hoàn chỉnh, trigger timing, priority order, effect stack policy ở mức triển khai.

## Kết luận phân tích

1. Không nên nhảy ngay vào code full feature trên nền source hiện tại.
2. Nên tái cấu trúc dần về đúng kiến trúc docs, nhưng theo kiểu song song an toàn, tránh đập toàn bộ bot đang có.
3. Giai đoạn đầu cần khóa lại:
   - cấu trúc thư mục,
   - bootstrap ứng dụng,
   - game data pipeline,
   - runtime entity chuẩn,
   - repository contract,
   - battle contract tối thiểu.
4. Sau khi nền tảng ổn định mới nên mở rộng secret realm, exploration, shop, craft, exchange, world boss.

## Quyết định triển khai đề xuất

- Giữ Node.js + Discord.js + PostgreSQL.
- Chuyển dần từ `manager centric` sang `module/layer centric`.
- Tạo một `core game kernel` độc lập Discord để dễ test và simulation.
- Dùng docs làm contract, nhưng cần bổ sung mini-spec thực thi trước mỗi phase code lớn.

## Kết quả của lần phân tích này

- Đã đọc toàn bộ docs để nắm phạm vi và dependency.
- Đã đối chiếu với source hiện tại để xác định khoảng cách kiến trúc.
- Đã sẵn sàng chốt roadmap triển khai thực tế trong file roadmap đi kèm.
