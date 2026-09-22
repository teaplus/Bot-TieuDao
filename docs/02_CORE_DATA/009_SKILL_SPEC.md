# 009_SKILL_SPEC.md

# Skill Specification

Version: 2.0

Status: Stable

---

# 1. Purpose

Skill là đơn vị Gameplay mà nhân vật có thể sử dụng trong Battle.

Skill không trực tiếp gây Damage.

Skill không trực tiếp Heal.

Skill không trực tiếp Buff.

Skill chỉ định nghĩa:

- Thông tin kỹ năng.
- Danh sách Effect sẽ được kích hoạt.

Gameplay được thực hiện thông qua Effect.

---

# 2. Responsibility

Skill chịu trách nhiệm:

- Metadata.
- Battle Configuration.
- Tham chiếu Effect.

Skill không chịu trách nhiệm:

- Damage.
- Formula.
- Modifier.
- Target.
- Condition.

---

# 3. Dependency

Skill phụ thuộc:

Element

Effect

Skill không phụ thuộc:

Formula

Modifier

Target

Battle Runtime

---

# 4. Data Model

```json
{
    "id":"FIREBALL",

    "displayName":"Hỏa Cầu",

    "description":"Tấn công bằng hỏa cầu.",

    "element":"FIRE",

    "rarity":"COMMON",

    "effects":[
        "FIREBALL_DAMAGE"
    ]
}
```

---

# 5. Properties

| Field | Required | Description |
|--------|----------|-------------|
| id | Yes | Skill Identifier |
| displayName | Yes | Display Name |
| description | No | Description |
| element | Yes | Element |
| rarity | Yes | Skill Rank |
| effects | Yes | Effect List |
| tags | No | Classification |

---

# 6. Effect Pipeline

Skill không chứa Gameplay.

Battle Engine thực hiện:

```
Skill

↓

Effect

↓

Event

↓

Action

↓

Formula
```

---

# 7. Design Rules

## Rule 1

Skill không chứa Formula.

---

## Rule 2

Skill không chứa Damage.

---

## Rule 3

Skill không chứa Heal.

---

## Rule 4

Skill không chứa Modifier.

---

## Rule 5

Skill chỉ tham chiếu Effect.

---

## Rule 6

Một Skill có thể tham chiếu nhiều Effect.

Battle Engine thực hiện Effect theo đúng thứ tự khai báo.

---

# 8. Validation Rules

Skill hợp lệ khi:

- Có id.
- Có element.
- Có ít nhất một Effect.

---

# 9. Non Responsibilities

Skill không chịu trách nhiệm:

- Battle Logic
- Runtime
- Damage
- Formula
- Modifier
- Target
- Condition

---

# 10. Summary

Skill là Gameplay Entry.

Gameplay luôn được thực hiện theo Pipeline:

Skill

↓

Effect

↓

Action

↓

Formula