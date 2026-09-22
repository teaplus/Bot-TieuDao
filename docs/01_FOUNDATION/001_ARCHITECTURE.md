# 001_ARCHITECTURE.md

# System Architecture

Version: 1.0.0

---

# 1. Mục tiêu

Tài liệu này định nghĩa kiến trúc tổng thể của dự án.

Mọi source code phải tuân thủ kiến trúc này.

Không được thay đổi kiến trúc nếu chưa cập nhật tài liệu.

---

# 2. Kiến trúc tổng quan

Dự án được chia thành 5 Layer.

```
+---------------------------+
|      Discord Layer        |
+---------------------------+
            │
            ▼
+---------------------------+
|    Application Layer      |
+---------------------------+
            │
            ▼
+---------------------------+
|       Game Engine         |
+---------------------------+
            │
            ▼
+---------------------------+
|    Persistence Layer      |
+---------------------------+
            │
            ▼
+---------------------------+
| Infrastructure Layer      |
+---------------------------+
```

---

# 3. Discord Layer

Bao gồm

```
commands/

events/

buttons/

modals/
```

Chỉ xử lý

- Slash Command
- Button
- Select Menu
- Modal
- Embed

Discord Layer không được:

- Tính damage
- Query SQL
- Truy cập Battle Engine

Discord Layer chỉ gọi Service.

Ví dụ

```
/battle

↓

BattleCommand

↓

BattleService
```

---

# 4. Application Layer

Bao gồm

```
services/
```

Ví dụ

```
PlayerService

BattleService

DungeonService

InventoryService

GuildService

RankingService
```

Application Layer là nơi xử lý nghiệp vụ.

Ví dụ

BattleService

```
Load Player

↓

Load Monster

↓

Convert BattleEntity

↓

BattleEngine

↓

Save Result

↓

Reward
```

Application Layer không tính Damage.

---

# 5. Game Engine

Đây là phần quan trọng nhất.

Game Engine hoàn toàn độc lập.

```
engine

battle

calculator

effects

events

turn
```

Game Engine KHÔNG BIẾT

- Discord
- PostgreSQL
- Redis
- Repository

Game Engine chỉ xử lý gameplay.

---

# 6. Battle Engine

Battle Engine bao gồm

```
BattleEngine

BattleContext

BattleEntity

BattleAction

BattleResult

BattleState

TurnManager

TargetSelector

ActionQueue
```

Battle Engine là nơi điều khiển trận đấu.

Battle Engine không được chứa logic SQL.

---

# 7. Calculator

Calculator chỉ tính toán.

Bao gồm

```
DamageCalculator

HealCalculator

ShieldCalculator

CriticalCalculator

SpeedCalculator
```

Calculator không lưu dữ liệu.

Calculator không phát sự kiện.

Calculator không gọi Repository.

---

# 8. Effect Engine

Mọi Buff/Debuff đều kế thừa từ Effect.

```
Effect

↓

Burn

Freeze

Poison

Bleed

Heal

Shield

Taunt

Slow

Stun
```

Mọi Effect phải có

```
apply()

tick()

remove()
```

Không được xử lý trực tiếp trong BattleEngine.

---

# 9. Event System

Game sử dụng Event Driven Architecture.

```
BattleEngine

↓

EventBus

↓

Listener
```

Ví dụ

```
OnAttack

↓

Fire Spirit Root

↓

Burn

↓

Event Complete
```

Battle Engine không được gọi trực tiếp Fire Spirit Root.

---

# 10. Gameplay Modules

Gameplay được chia thành Module.

```
Player

Monster

Skill

SpiritRoot

Talent

Sect

Equipment

Dungeon

WorldBoss

Guild

Arena

Tower
```

Các module độc lập.

Có thể phát triển riêng.

---

# 11. Persistence Layer

Bao gồm

```
repositories/
```

Ví dụ

```
PlayerRepository

MonsterRepository

SkillRepository

DungeonRepository
```

Repository chỉ làm việc với Database.

Repository không có Business Logic.

Ví dụ

```
findById()

save()

update()

delete()
```

---

# 12. Infrastructure Layer

Bao gồm

```
PostgreSQL

Redis

Logger

Config

Cache

Environment
```

Infrastructure chỉ hỗ trợ hệ thống.

Không được chứa gameplay.

---

# 13. Dependency Rule

```
Discord

↓

Service

↓

Repository

↓

Database
```

```
Service

↓

BattleEngine
```

```
BattleEngine

↓

Calculator

↓

Effect

↓

EventBus
```

Không được dependency ngược.

Ví dụ

```
BattleEngine

↓

Discord
```

❌ Không hợp lệ.

---

# 14. Battle Flow

```
Discord Command

↓

BattleService

↓

Load Player

↓

Load Monster

↓

BattleEntity

↓

BattleContext

↓

BattleEngine

↓

TurnManager

↓

Action Queue

↓

Skill Executor

↓

Damage Calculator

↓

Effect Manager

↓

Battle Result

↓

Reward

↓

Save

↓

Discord Reply
```

---

# 15. Module Communication

Các module chỉ giao tiếp qua

- Service
- EventBus

Không được import chéo.

Ví dụ

```
Player

↓

Monster
```

❌ Không hợp lệ.

Player và Monster chỉ gặp nhau trong BattleEngine.

---

# 16. Extension Rule

Framework phải hỗ trợ mở rộng.

Ví dụ

Sau này thêm

```
Pet

Mount

Artifact

Formation

Alchemy

Auction

Cross Server
```

không cần sửa BattleEngine.

---

# 17. Design Principles

Áp dụng

- SOLID
- Repository Pattern
- Service Pattern
- Factory Pattern
- Strategy Pattern
- Observer Pattern
- Event Driven Architecture

---

# 18. Forbidden Rules

Không được

- Query SQL trong BattleEngine
- Query SQL trong Discord Command
- Tính Damage trong Service
- Hardcode gameplay
- Hardcode Monster
- Hardcode Skill

Gameplay phải lấy từ Database hoặc JSON.

---

# 19. Architecture Goal

Mục tiêu cuối cùng

Framework có khả năng mở rộng lên

- 300+ JavaScript Class
- 100+ Skill
- 1000+ Monster
- 500+ Equipment
- 100+ Dungeon

mà không cần thay đổi kiến trúc.

---

# End of File