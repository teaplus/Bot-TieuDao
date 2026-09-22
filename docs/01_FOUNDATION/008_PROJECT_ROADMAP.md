# 008_PROJECT_ROADMAP.md

# Development Roadmap

Version: 1.0.0

---

# 1. Mục tiêu

Tài liệu này định nghĩa trình tự phát triển toàn bộ Framework.

AI phải sinh source code theo đúng thứ tự.

Không được bỏ qua bước.

Không được sinh module khi dependency chưa hoàn thành.

---

# 2. Development Principle

Framework được chia thành nhiều Phase.

Mỗi Phase phải hoàn thành trước khi sang Phase tiếp theo.

```
Foundation

↓

Engine

↓

Gameplay

↓

Infrastructure

↓

Content

↓

Feature
```

---

# 3. Overall Roadmap

```
Phase 0

Design Documents

↓

Phase 1

Foundation

↓

Phase 2

Battle Engine

↓

Phase 3

Calculator

↓

Phase 4

Effect Engine

↓

Phase 5

Skill Engine

↓

Phase 6

Player System

↓

Phase 7

Monster System

↓

Phase 8

Dungeon

↓

Phase 9

Discord

↓

Phase 10

Gameplay

↓

Phase 11

Testing

↓

Phase 12

Deployment
```

---

# 4. Phase 0

Design Documents

Hoàn thành

```
000

↓

009
```

Không viết code.

---

# 5. Phase 1

Foundation

Bao gồm

```
Config

Logger

Environment

Database

Redis

EventBus

Random

Constants

Exception

Dependency Injection
```

Kết quả

Framework khởi động được.

---

# 6. Phase 2

Battle Engine

Thứ tự

```
BattleState

↓

BattleAction

↓

BattleResult

↓

BattleEntity

↓

BattleContext

↓

TurnManager

↓

ActionQueue

↓

TargetSelector

↓

BattleEngine
```

Không sinh Damage trước.

---

# 7. Phase 3

Calculator

```
DamageCalculator

↓

HealCalculator

↓

ShieldCalculator

↓

CriticalCalculator

↓

SpeedCalculator
```

Calculator phải là Pure Function.

---

# 8. Phase 4

Effect Engine

```
Effect

↓

Burn

↓

Freeze

↓

Bleed

↓

Poison

↓

Shield

↓

Heal

↓

Slow

↓

Taunt

↓

Stun
```

Sau Phase này

Battle Engine đã hỗ trợ Buff/Debuff.

---

# 9. Phase 5

Skill Engine

```
Skill

↓

SkillFactory

↓

SkillExecutor

↓

SkillTarget

↓

SkillCooldown

↓

Ultimate
```

Skill đọc từ JSON hoặc Database.

Không Hardcode.

---

# 10. Phase 6

Player System

```
Player

↓

PlayerStat

↓

PlayerCultivation

↓

PlayerInventory

↓

PlayerEquipment

↓

PlayerSkill

↓

PlayerTalent

↓

PlayerSpiritRoot
```

Player chưa cần Discord.

---

# 11. Phase 7

Monster System

```
Monster

↓

MonsterFactory

↓

MonsterSkill

↓

MonsterPassive

↓

MonsterAI

↓

Boss

↓

WorldBoss
```

---

# 12. Phase 8

Dungeon

```
Dungeon

↓

DungeonStage

↓

DungeonRoom

↓

DungeonReward

↓

DungeonGenerator
```

---

# 13. Phase 9

Discord

```
Discord Client

↓

Slash Commands

↓

Interaction

↓

Embed

↓

Button

↓

Modal
```

Discord chỉ là UI.

---

# 14. Phase 10

Gameplay

```
Quest

↓

Guild

↓

Ranking

↓

Auction

↓

Mail

↓

Achievement

↓

Tower

↓

Arena

↓

PvP
```

---

# 15. Phase 11

Testing

```
Battle

↓

Calculator

↓

Effect

↓

Player

↓

Dungeon

↓

Repository
```

Mỗi Module phải có Unit Test.

---

# 16. Phase 12

Deployment

```
Docker

↓

Docker Compose

↓

PM2

↓

Backup

↓

Monitoring
```

---

# 17. Development Rule

Không được sinh

```
SkillExecutor
```

khi chưa có

```
BattleContext
```

---

Không được sinh

```
Player
```

khi chưa có

```
DamageCalculator
```

---

Không được sinh

```
MonsterAI
```

khi chưa có

```
BattleEngine
```

---

# 18. AI Code Generation Order

AI phải sinh theo thứ tự

```
Foundation

↓

Engine

↓

Calculator

↓

Effects

↓

Skill

↓

Player

↓

Monster

↓

Dungeon

↓

Discord

↓

Gameplay
```

Không đảo thứ tự.

---

# 19. Milestones

## Milestone 1

Framework chạy được

```
npm start
```

---

## Milestone 2

Battle Engine

Player

VS

Monster

---

## Milestone 3

Có Skill

Có Buff

Có Debuff

---

## Milestone 4

Dungeon hoàn chỉnh

---

## Milestone 5

Discord Bot hoàn chỉnh

---

## Milestone 6

Gameplay hoàn chỉnh

---

# 20. Estimated Modules

Framework dự kiến

```
300~400 Classes

120~150 Services

80~100 JSON Config

200+ Unit Tests
```

---

# 21. Estimated Development Order

```
Lesson 001

↓

Lesson 050

Foundation

↓

Lesson 100

Battle Engine

↓

Lesson 150

Player

↓

Lesson 200

Monster

↓

Lesson 250

Discord

↓

Lesson 300

Gameplay
```

---

# 22. AI Instruction

Khi sinh code

AI phải

✓ Kiểm tra Dependency.

✓ Sinh đúng thứ tự.

✓ Không bỏ qua Phase.

✓ Không sinh Module chưa đủ Dependency.

Nếu có xung đột

↓

Roadmap ưu tiên.

---

# 23. Completion Criteria

Framework được xem là hoàn thành khi

✓ Battle Engine hoạt động.

✓ Discord hoạt động.

✓ PvE hoạt động.

✓ Dungeon hoạt động.

✓ World Boss hoạt động.

✓ PvP hoạt động.

✓ Guild hoạt động.

✓ Có thể mở rộng thêm Module mà không sửa kiến trúc.

---

# End of File