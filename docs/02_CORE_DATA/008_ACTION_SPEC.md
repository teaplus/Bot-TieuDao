# 008_ACTION_SPEC.md

# Action Specification

Version: 2.0

Status: Stable

---

# 1. Purpose

Action là đơn vị Gameplay nhỏ nhất.

Một Action mô tả một hành động duy nhất.

Ví dụ:

- Damage
- Heal
- Add Effect
- Remove Effect
- Add Modifier
- Remove Modifier
- Revive

Action không chứa Gameplay Rule.

Gameplay Rule thuộc Effect.

---

# 2. Responsibility

Action chịu trách nhiệm:

- Thực hiện một hành động.
- Tham chiếu các Foundation Domain.

Action không chịu trách nhiệm:

- Trigger.
- Battle Flow.
- Skill Logic.
- Runtime.

---

# 3. Dependency

Action có thể tham chiếu:

```
Target
Formula
Modifier
Effect
Condition
```

Action không phụ thuộc:

```
Skill
Battle
Runtime
```
---

# 3.1 Runtime Context

Action Definition chỉ mô tả dữ liệu.

Khi thực thi, ActionExecutor nhận:

```
Action
Source
Resolved Targets
Battle Context
```

ActionExecutor không được:

```
Resolve Target

Resolve Condition

Trigger Event

Thay đổi Battle Flow
```
---

# 4. Data Model

```json
{
    "type":"DAMAGE",

    "target":"ENEMY_SINGLE",

    "conditionId":"",

    "arguments":{

        "formulaId":"SKILL_DAMAGE",

        "DAMAGE_RATE":2.5

    }
}
```

---

# 5. Properties

| Field | Required | Description |
|--------|----------|-------------|
| type | Yes | Action Type |
| target | Yes | Target Strategy |
| conditionId | No | Execute Condition |
| arguments | No | Action Parameters |

---

# 6. Action Flow

Battle Engine thực hiện Action theo thứ tự:

```
Resolve Target Candidates

↓

Evaluate Condition cho từng Target

↓

Execute Action
```

---

Nếu một Skill chứa nhiều Action.

↓

Battle Engine thực hiện theo đúng thứ tự khai báo.

```
Action 1

↓

Action 2

↓

Action 3
```

Battle Engine không tự động thay đổi thứ tự Action.


Nếu Condition trả về false.

↓

Target tương ứng bị loại khỏi Action.

Nếu không còn Target hợp lệ.

↓

Action bị bỏ qua và Battle Runtime ghi `ACTION_SKIPPED_CONDITION`.

Condition dùng subject `SELF` vẫn được evaluate trong cùng pipeline cho từng Target; kết quả giống nhau trên mọi Target. Condition dùng subject `TARGET` luôn nhận đúng Target đang được lọc.

---

# 7. Action Types

Action Type là Executor Identifier.

Ví dụ

```
DAMAGE

HEAL

ADD_EFFECT

REMOVE_EFFECT

ADD_MODIFIER

REMOVE_MODIFIER

REVIVE

PURIFY
```

Battle Engine sẽ ánh xạ:

```
type

↓

Executor
```

Ví dụ

```
DAMAGE

↓

DamageExecutor
```

---

# 8. Arguments

Arguments phụ thuộc từng Action.

Ví dụ

Damage

```json
{
    "formulaId":"SKILL_DAMAGE",

    "DAMAGE_RATE":2.5
}
```

Heal

```json
{
    "formulaId":"HEAL_ATTACK"
}
```

Add Effect

```json
{
    "effectId":"BURN"
}
```

Add Modifier

```json
{
    "modifierId":"ATK_UP_20"
}
```
---

# 8.1 Target Override

Đối với Action tạo Effect.

Nếu Effect định nghĩa target riêng.

↓

Effect.target được ưu tiên.

Nếu Effect không khai báo target.

↓

Sử dụng Action.target.

Ví dụ

Action

```json
{
    "type":"ADD_EFFECT",
    "target":"ENEMY_SINGLE",
    "arguments":{
        "effectId":"BURN"
    }
}
```

Effect

```json
{
    "id":"BURN",
    "target":"SELF"
}
```

Executor cuối cùng sẽ áp dụng Effect lên SELF.
---

# 9. Design Rules

## Rule 1

Một Action chỉ thực hiện một nhiệm vụ.

---

## Rule 2

Một Action chỉ có một Target.

---

## Rule 3

Một Action chỉ có một Condition.

---

## Rule 4

Action không chứa Trigger.

---

## Rule 5

Action không chứa Event.

---

## Rule 6

Action không chứa Duration.

---

## Rule 7

Action không chứa Stack.

---

## Rule 8

Action không được gọi Action khác.

---

## Rule 9

Action không được quyết định Action tiếp theo.

---

## Rule 10

Action không chứa AI Logic.
---



# 10. Validation Rules

Action hợp lệ khi:

- Có type.
- Có target.
- Action Type tồn tại.
- Target tồn tại.
- Condition tồn tại (nếu khai báo).
- Executor tương ứng tồn tại.

Nếu Action yêu cầu Formula.

↓

formulaId bắt buộc tồn tại.

Nếu Action yêu cầu Modifier.

↓

modifierId bắt buộc tồn tại.

Nếu Action yêu cầu Effect.

↓

effectId bắt buộc tồn tại.

---

# 11. Non Responsibilities

Action không chịu trách nhiệm:

- Trigger
- Event
- Skill
- Battle Flow
- Runtime
- Animation
- AI
- Formula Calculation
- Target Resolution
- Condition Resolution
---

# 12. Summary

Action là Gameplay Command.

Battle Engine thực hiện:

```
Condition

↓

Target

↓

Executor
```
Action Definition là immutable.

Battle Runtime không được sửa Action.

Mọi Runtime State phải được lưu trong Battle Context.

Action là đơn vị Gameplay nhỏ nhất.
