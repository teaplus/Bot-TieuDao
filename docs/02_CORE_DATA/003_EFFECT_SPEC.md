# 003_EFFECT_SPEC.md

# Effect Specification

Version: 2.1

Status: Stable

---

# 1. Purpose

Effect là đơn vị mô tả Gameplay Rule.

Effect xác định:

- Khi nào Gameplay được kích hoạt.
- Gameplay sẽ thực hiện Action nào.

Effect không trực tiếp thực thi Gameplay.

Battle Engine chịu trách nhiệm thực thi.

---

# 2. Responsibility

Effect chịu trách nhiệm:

- Gameplay Trigger
- Gameplay Rule
- Action Pipeline

Effect không chịu trách nhiệm:

- Damage Calculation
- Target Resolution
- Runtime State
- Formula Evaluation

---

# 3. Dependency

Effect phụ thuộc:

```
Action
```
Action có thể tham chiếu tới các Core Data Domain khác thông qua ID.

Ví dụ:

- Formula
- Modifier
- Effect
- Attribute
- Item
- Equipment

Tùy theo từng Action Type.

Effect không phụ thuộc:

- Battle
- Skill
- Runtime

---

# 4. Data Model

```json
{
  "id": "BURN",

  "displayName": "Thiêu Đốt",

  "description": "Gây sát thương theo lượt.",

  "type": "STATUS",

  "tags": [
    "DEBUFF",
    "DOT"
  ],

  "duration": 3,

  "stackable": true,

  "maxStack": 99,

  "events": [
    {
      "event": "TURN_END"
    }
  ],

  "actions": [
    {
      "type": "DAMAGE",

      "target": "SELF",

      "arguments": {
        "formulaId": "BURN_DAMAGE"
      }
    }
  ]
}
```

---

# 5. Properties

| Field | Required | Description |
|---------|----------|-------------|
| id | Yes | Effect Identifier |
| displayName | Yes | Display Name |
| description | No | Description |
| type | Yes | Effect Type |
| tags | No | Classification |
| duration | No | Duration (Turn) |
| stackable | No | Can Stack |
| maxStack | No | Maximum Stack |
| events | Yes | Trigger Events |
| actions | Yes | Gameplay Actions |

---

# 6. Effect Types

| Type | Description |
|------|-------------|
| PASSIVE | Luôn tồn tại |
| STATUS | Có thời gian tồn tại |
| INSTANT | Thực hiện ngay |
| TRIGGER | Kích hoạt theo điều kiện |

---

# 7. Event Model

Event mô tả thời điểm Effect được kích hoạt.

Ví dụ

```json
{
  "event": "ON_HIT",
  "chance": 30
}
```

Event chỉ mô tả:

- thời điểm
- xác suất

Event không chứa Gameplay Logic.

---

# 8. Action Model

Action là đơn vị Gameplay nhỏ nhất.

Ví dụ

```json
{
  "type": "DAMAGE",

  "target": "ENEMY_SINGLE",

  "arguments": {
    "formulaId": "SKILL_DAMAGE",
    "DAMAGE_RATE": 2.5
  }
}
```

Action gồm ba phần:

```
type

↓

target

↓

arguments
```

Trong đó:

- type quyết định hành động.
- target quyết định đối tượng.
- arguments truyền tham số cho Action.

---

# 9. Formula

Effect không chứa công thức tính toán.

Action chỉ tham chiếu:

```
formulaId
```

Formula được định nghĩa tại:

```
formulas.json
```

Formula chịu trách nhiệm:

- Damage
- Heal
- Shield
- Reflect
- Lifesteal
- DOT

Effect không thực hiện phép tính.

---

# 10. Design Rules

## Rule 1

Effect không chứa Battle Logic.

---

## Rule 2

Effect không tính Damage.

---

## Rule 3

Effect không thực hiện Target Resolution.

Effect chỉ mô tả Target.

Battle Engine chịu trách nhiệm Resolve Target.

---

## Rule 4

Gameplay luôn được mô tả bằng:

```
Events

↓

Actions
```

---

## Rule 5

Một Effect có thể chứa nhiều Action.

Mỗi Action được phép:

- sử dụng Target khác nhau.
- sử dụng Formula khác nhau.
- sử dụng Modifier khác nhau.

Ví dụ:

```
Damage → Enemy

↓

Heal → Self

↓

Buff → Ally All
```

---

# 11. Validation Rules

Một Effect hợp lệ khi:

- Có id.
- Có type.
- Có events.
- Có actions.

Mỗi Event phải sử dụng Event Type hợp lệ.

Mỗi Action phải sử dụng Action Type hợp lệ.

Mọi tham chiếu (Formula, Modifier, Effect...) phải tồn tại trong Core Data.

Nếu:

```
stackable=true
```

↓

```
maxStack
```

bắt buộc tồn tại.

Nếu:

```
duration
```

↓

duration > 0.

---

# 12. ACTION-scoped Effect capability

Effect có thể khai báo capability:

```json
{
  "scopes": ["ACTION"]
}
```

Khi được Element relation tham chiếu, definition vẫn là immutable GameData. Runtime carrier thuộc đúng `executionId`, source là caster và target là target đang resolve. Carrier không được thêm vào `BattleEntity.effects`, không tick duration/stack và phải cleanup trong `finally` sau `AFTER_ACTION`.

`ADD_MODIFIER` của carrier chỉ tạo target-specific Formula stat view cho Action hiện tại; không mutate entity. Action khác do carrier sinh ra đi qua BattleActionPipeline với ExecutionContext riêng, shared Random Provider và causal/depth guard.

---

# 13. Non Responsibilities

Effect không chịu trách nhiệm:

- Battle Context
- Runtime
- Formula
- Damage Calculation
- Target Resolution
- Attribute Modification

---

# 14. Summary

Effect là Gameplay Rule.

Gameplay được mô tả theo DSL:

```
WHEN

↓

Events

↓

DO

↓

Actions
```

Action là đơn vị Gameplay nhỏ nhất.

Formula chịu trách nhiệm tính toán.

Battle Engine chịu trách nhiệm thực thi.
