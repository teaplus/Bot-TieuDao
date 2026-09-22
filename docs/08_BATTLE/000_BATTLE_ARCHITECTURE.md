# Battle Framework Architecture

Version: 2.0

---

# 1. Vision

Battle Framework được thiết kế theo các nguyên tắc:

- Data First
- Data Driven
- Event Driven
- Stateless System
- Runtime Oriented
- Open For Extension
- Closed For Modification

Battle Engine không chứa Gameplay Logic.

Gameplay được mô tả hoàn toàn bằng Data.

Battle Engine chỉ điều phối Runtime Pipeline.

---

# 2. Design Philosophy

Battle Framework được chia thành nhiều Layer độc lập.

```
Game Data
      │
      ▼
Runtime Model
      │
      ▼
Pipeline
      │
      ▼
Hook Dispatcher
      │
      ▼
Business Systems
      │
      ▼
Battle Engine
```

Mỗi Layer chỉ phụ thuộc Layer phía dưới.

Không được phụ thuộc ngược.

---

# 3. Layer Responsibility

## Layer 1

Game Data

Bao gồm:

- Skill
- Monster
- Equipment
- Modifier
- Formula
- Effect
- Talent

Layer này chỉ chứa dữ liệu.

Không có Runtime.

---

## Layer 2

Runtime Model

Bao gồm:

- BattleContext
- BattleEntity
- RuntimeSkill
- RuntimeAction
- RuntimeModifier

Runtime được tạo khi Battle bắt đầu.

Không sửa Game Data.

---

## Layer 3

Pipeline

Pipeline là trái tim của Battle.

Pipeline luôn cố định.

```
Action

↓

Resolve Target

↓

Validate

↓

Condition

↓

Dispatch PRE_FORMULA

↓

Formula

↓

Dispatch POST_FORMULA

↓

Dispatch PRE_EFFECT

↓

Effect

↓

Dispatch POST_EFFECT

↓

Generate Result
```

Không module nào được tự ý thay đổi Pipeline.

---

## Layer 4

Event / Hook

Battle Engine không gọi:

Damage

Heal

Reflect

Life Steal

...

Battle Engine chỉ Dispatch Event.

Ví dụ

```
PRE_FORMULA

POST_FORMULA

PRE_EFFECT

POST_EFFECT

TURN_START

TURN_END

ROUND_START

ROUND_END
```

Hook đăng ký vào các Event này.

---

## Layer 5

Business Systems

Bao gồm

Target Resolver

Formula Engine

Effect Engine

Condition Checker

...

Các System đều Stateless.

---

## Layer 6

Battle Engine

Battle Engine chỉ:

- Start Battle
- Execute Turn
- Execute Skill
- Execute Action
- Update State
- Finish Battle

Không xử lý Gameplay Logic.

---

# 4. Runtime Flow

```
Battle

↓

Turn

↓

Skill

↓

Action

↓

Pipeline

↓

Result

↓

Next Action

↓

Next Turn
```

---

# 5. Runtime Object

Battle chỉ sử dụng Runtime Object.

```
BattleContext

↓

BattleEntity

↓

RuntimeSkill

↓

RuntimeAction
```

Không Runtime nào ghi ngược Game Data.

---

# 6. Event Driven Architecture

Mọi Gameplay đều được kích hoạt thông qua Event.

Ví dụ

OnAttack

↓

PRE_FORMULA

↓

Formula

↓

POST_FORMULA

↓

PRE_EFFECT

↓

Damage

↓

POST_EFFECT

↓

Life Steal

↓

Reflect

↓

POST_ACTION

↓

Cooldown

↓

End

---

# 7. Hook System

Hook là cơ chế mở rộng Battle.

Ví dụ

Equipment

Talent

Passive

Aura

Buff

Debuff

đều được mô tả bằng Hook.

Ví dụ

```
Critical+

↓

PRE_FORMULA
```

```
Reflect

↓

POST_EFFECT
```

```
Burn

↓

TURN_END
```

Không thêm logic vào Battle Engine.

---

# 8. Dependency Rule

Battle Engine

↓

Pipeline

↓

Hook Dispatcher

↓

Business System

↓

Runtime

↓

Data

Không được phụ thuộc ngược.

---

# 9. Design Rule

Battle Engine không được:

- if(skill.id)
- switch(effect)
- switch(formula)
- switch(modifier)

Mọi Gameplay đều phải được Data hóa.

---

# 10. Extension Rule

Muốn thêm Skill

↓

JSON

Muốn thêm Effect

↓

Executor

↓

Registry

Muốn thêm Formula

↓

Formula

↓

Registry

Muốn thêm Buff

↓

Hook

↓

JSON

Không sửa Battle Engine.

---

# 11. Summary

Battle Framework chỉ có một nhiệm vụ:

Điều phối Runtime Pipeline.

Gameplay thuộc về Data.

Business Logic thuộc về System.

Extension thuộc về Hook.

Battle Engine không biết Gameplay.