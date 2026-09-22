# 007_DEPENDENCY_RULE.md

# Dependency Rule

Version: 1.0.0

---

# 1. Mục tiêu

Tài liệu này định nghĩa toàn bộ quy tắc Dependency của dự án.

Mọi Module phải tuân thủ tài liệu này.

Nếu source code vi phạm Dependency Rule thì được xem là sai kiến trúc.

---

# 2. Triết lý

Dependency chỉ được phép đi theo một chiều.

Không được phép phụ thuộc ngược.

Mọi Module phải có trách nhiệm rõ ràng.

---

# 3. Kiến trúc

```
Discord

↓

Application(Service)

↓

Game Engine

↓

Repository

↓

Database
```

Không được phép

```
Database

↓

Battle Engine
```

---

# 4. Layer Dependency

```
Discord
```

được phép gọi

```
Application
```

---

```
Application
```

được phép gọi

```
Repository

Battle Engine

Factory
```

---

```
Repository
```

được phép gọi

```
Database
```

---

```
Battle Engine
```

được phép gọi

```
Calculator

EventBus

Effect

Factory
```

---

```
Calculator
```

không được gọi

Repository

Discord

Database

---

# 5. Battle Engine Dependency

Battle Engine chỉ biết

```
BattleContext

BattleEntity

BattleAction

BattleState

BattleResult

Calculator

Effect

EventBus
```

Battle Engine không biết

```
Player

Monster

Discord

Repository

Database

Redis
```

---

# 6. Repository Dependency

Repository chỉ biết

```
Database

SQL

Entity Mapper
```

Repository không biết

```
Battle

Damage

PlayerService

Discord
```

---

# 7. Service Dependency

Service được phép gọi

```
Repository

BattleEngine

Factory

EventBus
```

Service không được gọi

```
Discord API

SQL trực tiếp
```

---

# 8. Discord Dependency

Command

↓

Service

Không gọi

```
Repository

Battle Engine

Database
```

---

# 9. Calculator Dependency

Calculator

↓

Value Object

↓

Math

Không gọi

```
EventBus

Repository

Discord

Logger
```

Calculator phải là Pure Function.

---

# 10. Effect Dependency

Effect được phép gọi

```
BattleContext

BattleEntity

Calculator

EventContext
```

Không được gọi

```
Repository

Discord

PlayerService
```

---

# 11. AI Dependency

Monster AI được phép gọi

```
Target Strategy

BattleContext

Skill
```

Không được

```
Query SQL

Discord

Reward
```

---

# 12. Factory Dependency

Factory chỉ tạo Object.

Không chứa

Business Logic.

Ví dụ

```
MonsterFactory

SkillFactory

EffectFactory
```

---

# 13. Config Dependency

Gameplay đọc Config.

Config không đọc Gameplay.

---

# 14. EventBus Dependency

EventBus

không biết

Listener.

Listener

đăng ký Event.

```
BattleEngine

↓

Publish

↓

EventBus

↓

Listener
```

Không

```
BattleEngine

↓

FireSpiritRoot
```

---

# 15. Shared Dependency

shared/

được phép được import bởi

toàn bộ project.

Nhưng shared

không được import

Module khác.

---

# 16. Utils Dependency

Utils

không được

Import Gameplay.

Ví dụ

```
Random

MathUtil

DateUtil
```

Không import

Player

Monster

Skill

---

# 17. Domain Dependency

Module

không được import chéo.

Ví dụ

```
Player

↓

Monster
```

❌

Sai.

Player và Monster

chỉ gặp nhau

trong BattleEngine.

---

# 18. Circular Dependency

Không được

```
Player

↓

Skill

↓

Player
```

Không được

```
Effect

↓

Battle

↓

Effect
```

Mọi Dependency

phải là

DAG

(Directed Acyclic Graph)

---

# 19. Allowed Dependency Matrix

```
Discord
    ↓
Service
    ↓
BattleEngine
    ↓
Calculator
    ↓
Math

Service
    ↓
Repository
    ↓
Database
```

---

# 20. Forbidden Dependency Matrix

Không được

```
BattleEngine

↓

Repository
```

---

Không được

```
Repository

↓

BattleEngine
```

---

Không được

```
Discord

↓

Database
```

---

Không được

```
Calculator

↓

Repository
```

---

Không được

```
Player

↓

Monster
```

---

# 21. Dependency Injection

Không

```js
const repository = new PlayerRepository();
```

Đúng

```js
constructor(playerRepository)
```

Dependency phải được Inject.

---

# 22. Interface Rule

Các Module chỉ làm việc với

Contract

không làm việc với

Implementation.

Ví dụ

BattleEngine

không biết

PostgreSQL.

BattleEngine chỉ biết

PlayerRepository Interface.

---

# 23. Value Object

Không truyền

Primitive

quá nhiều.

Sai

```js
calculateDamage(

100,

50,

0.5,

2.0,

15

)
```

Đúng

```js
calculateDamage({

attacker,

target,

skill,

context

})
```

---

# 24. Extension Rule

Module mới

phải tuân theo

Dependency hiện tại.

Ví dụ

Pet

↓

BattleEngine

Không

↓

Discord.

---

# 25. AI Instruction

Khi sinh source code

AI phải

✓ Không Circular Dependency

✓ Không Import ngược

✓ BattleEngine độc lập

✓ Repository chỉ SQL

✓ Discord chỉ UI

✓ Service điều phối

✓ Calculator Pure Function

✓ Effect không Query Database

Nếu có xung đột

↓

Tài liệu này ưu tiên.

---

# 26. Architecture Validation Checklist

Trước khi sinh bất kỳ file nào

AI phải tự kiểm tra

□ Có import sai Layer không?

□ Có Circular Dependency không?

□ Có Repository trong Battle Engine không?

□ Có Discord trong Gameplay không?

□ Có SQL trong Service không?

□ Có Business Logic trong Repository không?

Nếu có

↓

Refactor trước khi sinh code.

---

# End of File