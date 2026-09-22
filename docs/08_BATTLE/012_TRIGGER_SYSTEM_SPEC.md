# 012_TRIGGER_SYSTEM_SPEC.md

# Trigger System Specification

Version: 2.0

Status: Stable

---

# 1. Purpose

Trigger xác định thời điểm Gameplay được kích hoạt.

Trigger không thực hiện Gameplay.

Trigger chỉ thông báo Battle Engine khi điều kiện kích hoạt xảy ra.

---

# 2. Responsibility

Trigger chịu trách nhiệm:

- Xác định thời điểm kích hoạt.
- Mô tả loại sự kiện cần lắng nghe.
- Kết nối Event với Gameplay.

Trigger không chịu trách nhiệm:

- Damage.
- Heal.
- Effect Logic.
- Battle Flow.
- Runtime State.

---

# 3. Dependency

Trigger có thể tham chiếu:

```
Event
Condition
```

Trigger không phụ thuộc:

```
Skill
Action
Effect
Battle
Runtime
```

---

# 4. Data Model

```json
{
    "event":"ON_ATTACK",

    "conditionId":"HP_BELOW_50"
}
```

---

# 5. Properties

| Field | Required | Description |
|--------|----------|-------------|
| event | Yes | Runtime Event |
| conditionId | No | Optional Execute Condition |

---

# 6. Trigger Flow

Battle Engine phát sinh Runtime Event.

↓

Trigger Registry tìm Trigger phù hợp.

↓

Resolve Condition.

↓

Nếu Condition hợp lệ.

↓

Gameplay được kích hoạt.

---

# 7. Runtime Events

Ví dụ

```
ON_BATTLE_START

ON_BATTLE_END

ON_TURN_START

ON_TURN_END

ON_ATTACK

ON_HIT

ON_DAMAGE

ON_CRITICAL

ON_KILL

ON_DEATH

ON_HEAL

ON_EFFECT_ADD

ON_EFFECT_REMOVE
```

Danh sách Event được định nghĩa trong Runtime.

Trigger chỉ tham chiếu.

---

# 8. Trigger Resolution

Battle Engine thực hiện:

```
Receive Event

↓

Find Trigger

↓

Resolve Condition

↓

Execute Gameplay
```

Battle Engine có thể xử lý nhiều Trigger cùng một Event.

Các Trigger được thực hiện theo thứ tự đăng ký.

## Action lifecycle ordering

Mỗi Action/`ExecutionContext` chỉ phát một cặp lifecycle hook, không phát một cặp cho mỗi target:

```
BEFORE_ACTION (all resolved target IDs)

→ mutate and collect all ordered target results

→ semantic event per result/target

→ reactive Defense for a living damaged target

→ ON_DEATH when the damage result defeated its target

→ AFTER_ACTION (aggregate Action Result)
```

Action nhiều target giữ thứ tự semantic event theo thứ tự result. `CHAIN_DAMAGE` giữ action type bên ngoài cho lifecycle hook; từng hit vẫn phát `ON_HIT`/`ON_DEATH` cho target tương ứng.

---

# 9. Design Rules

## Rule 1

Trigger chỉ mô tả thời điểm kích hoạt.

---

## Rule 2

Trigger không chứa Gameplay Logic.

---

## Rule 3

Trigger không chứa Target.

---

## Rule 4

Trigger không chứa Formula.

---

## Rule 5

Trigger không chứa Duration.

---

## Rule 6

Trigger không chứa Stack.

---

## Rule 7

Trigger không được thay đổi Battle Flow.

---

## Rule 8

Trigger phải độc lập với Skill.

---

## Rule 9

Trigger Definition là immutable.

---

# 10. Validation Rules

Trigger hợp lệ khi:

- Có event.
- Event tồn tại.
- Condition tồn tại (nếu khai báo).

---

# 11. Non Responsibilities

Trigger không chịu trách nhiệm:

- Damage
- Heal
- Modifier
- Effect Logic
- Formula
- Target
- Runtime
- Animation

---

# 12. Summary

Trigger là bộ mô tả thời điểm kích hoạt Gameplay.

Battle Engine thực hiện:

```
Runtime Event

↓

Trigger

↓

Condition

↓

Gameplay
```

Trigger không thực hiện Gameplay.

Trigger chỉ xác định khi nào Gameplay được phép bắt đầu.
