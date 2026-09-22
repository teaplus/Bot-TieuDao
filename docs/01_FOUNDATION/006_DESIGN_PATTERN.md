# 006_DESIGN_PATTERN.md

# Design Pattern

Version: 1.0.0

---

# 1. Mục tiêu

Tài liệu này định nghĩa các Design Pattern được phép sử dụng trong dự án.

Không sử dụng Pattern nếu chưa được định nghĩa trong tài liệu.

Ưu tiên

- Đơn giản
- Dễ mở rộng
- Dễ đọc
- Dễ Test

Không lạm dụng Pattern.

---

# 2. Pattern Overview

Framework sử dụng các Pattern sau

```
Factory

Strategy

Repository

Service

Observer

State

Builder

Singleton

Dependency Injection

Value Object
```

Không sử dụng Pattern khi không cần thiết.

---

# 3. Factory Pattern

Factory dùng để tạo Gameplay Object.

Ví dụ

```
SkillFactory

MonsterFactory

EffectFactory

EquipmentFactory

TalentFactory

SpiritRootFactory
```

Không được

```js
new BurnEffect()

new FireSpiritRoot()

new Monster()
```

trực tiếp trong Battle Engine.

Luôn

```
Factory

↓

Create
```

Ví dụ

```js
const burn = effectFactory.create("burn");
```

---

# 4. Strategy Pattern

Strategy dùng cho

Gameplay có nhiều thuật toán.

Ví dụ

```
Target Strategy

↓

Nearest

Random

Lowest HP

Highest ATK
```

Monster AI

↓

```
Aggressive

Defensive

Support
```

Damage Formula

↓

```
PvE

PvP

Boss

WorldBoss
```

Không dùng

if...

else...

quá nhiều.

---

# 5. Repository Pattern

Repository

↓

Database

Repository chỉ

```
CRUD

Query

Transaction
```

Không được

```
Reward

Damage

Skill

Battle
```

Ví dụ

```
PlayerRepository

MonsterRepository

ItemRepository
```

---

# 6. Service Pattern

Service xử lý Business.

Ví dụ

```
BattleService

InventoryService

PlayerService

DungeonService
```

Service gọi

Repository

Factory

Battle Engine

Không gọi SQL.

---

# 7. Observer Pattern

Observer

↓

EventBus

Ví dụ

```
OnAttack

↓

Fire Spirit Root

↓

Burn
```

Ví dụ

```
OnCritical

↓

Talent

↓

Heal
```

Battle Engine không gọi trực tiếp.

---

# 8. State Pattern

State dùng cho

Battle.

Ví dụ

```
Waiting

↓

Battle Start

↓

Round

↓

Turn

↓

Battle End
```

Không dùng

```
status==1

status==2

status==3
```

---

# 9. Builder Pattern

Builder dùng khi Object lớn.

Ví dụ

```
BattleContext

Player

Monster

Reward
```

Ví dụ

```js
const player = PlayerBuilder
    .withStat(...)
    .withSkill(...)
    .withEquipment(...)
    .build();
```

Không tạo Constructor có quá nhiều tham số.

---

# 10. Singleton Pattern

Chỉ được phép Singleton

```
EventBus

Logger

Config

Random

GameClock
```

Không Singleton

Player

Monster

BattleEngine

---

# 11. Dependency Injection

Mọi Dependency

↓

Inject

Ví dụ

Sai

```js
const repository = new PlayerRepository();
```

Đúng

```js
constructor(playerRepository)
```

Lý do

- Test
- Mock
- Replace

---

# 12. Value Object

Stat nên dùng

Value Object.

Ví dụ

```
Damage

Health

Shield

CriticalRate

Speed
```

Không dùng Number ở khắp nơi.

---

# 13. Aggregate Root

Player là Aggregate Root.

```
Player

↓

Equipment

↓

Skill

↓

Inventory

↓

Talent
```

Không truy cập

EquipmentRepository

trực tiếp.

---

# 14. Domain Model

Gameplay

↓

Model

Không phải Database.

Ví dụ

Player

không phải

PlayerTable.

---

# 15. Anti Pattern

Không được

God Class

↓

```
GameManager

BattleManager

SkillManager

PlayerManager
```

làm mọi thứ.

---

Không dùng

```
Util.js
```

1000 dòng.

---

Không dùng

```
Helper.js
```

làm đủ thứ.

---

# 16. Battle Pattern

Battle sử dụng

```
State

+

Strategy

+

Observer

+

Factory
```

BattleEngine

không dùng

if...

else...

để xử lý Gameplay.

---

# 17. Skill Pattern

Skill

↓

Factory

↓

Strategy

↓

Effect

Ví dụ

```
Fireball

↓

Damage

↓

Burn
```

Không Hardcode.

---

# 18. Effect Pattern

Effect

↓

Inheritance

```
Effect

↓

Burn

↓

Freeze

↓

Heal

↓

Shield
```

Mọi Effect

đều implement

```
apply()

tick()

remove()
```

---

# 19. AI Pattern

Monster AI

↓

Strategy

Ví dụ

```
Aggressive

Defensive

Support

Boss
```

Không viết

100 dòng if.

---

# 20. Reward Pattern

Reward

↓

Builder

↓

Factory

Không tạo Reward bằng Constructor.

---

# 21. Config Pattern

Gameplay

↓

JSON

↓

Factory

↓

Object

Không Hardcode.

---

# 22. Future Pattern

Cho phép mở rộng

```
Command Pattern

Decorator Pattern

Composite Pattern
```

Hiện tại

Chưa sử dụng.

---

# 23. AI Instruction

Khi sinh source code

AI phải

✓ Không tạo God Class.

✓ Gameplay dùng Factory.

✓ Database dùng Repository.

✓ Business dùng Service.

✓ Event dùng Observer.

✓ Battle dùng State.

✓ AI dùng Strategy.

✓ Gameplay Object dùng Builder khi cần.

Nếu có xung đột

↓

Tài liệu này ưu tiên.

---

# End of File