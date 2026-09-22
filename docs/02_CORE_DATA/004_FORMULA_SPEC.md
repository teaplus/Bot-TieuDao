# 004_FORMULA_SPEC.md

# Formula Specification

Version: 2.0

Status: Stable

---

# 1. Purpose

Formula định nghĩa công thức tính toán của Gameplay.

Formula chịu trách nhiệm:

- Damage
- Heal
- Shield
- Reflect
- Lifesteal
- DOT
- HOT

Formula không chịu trách nhiệm:

- Trigger
- Target
- Battle Logic
- Gameplay Rule

Formula chỉ trả về một giá trị.

---

# 2. Responsibility

Formula chịu trách nhiệm:

- Tính toán giá trị.
- Cung cấp kết quả cho Action.
- Định nghĩa biểu thức toán học.

Formula không chịu trách nhiệm:

- Resolve Variable.
- Resolve Target.
- Battle Context.
- Runtime.

---

# 3. Dependency

Formula không phụ thuộc Domain nào.

Battle Engine chịu trách nhiệm:

- Resolve Variables.
- Evaluate Expression.

Action tham chiếu Formula thông qua:

```
formulaId
```

---

# 4. Data Model

```json
{
  "id": "SKILL_DAMAGE",

  "displayName": "Sát thương kỹ năng",

  "description": "Sát thương kỹ năng cơ bản.",

  "expression": "(ATK - DEF * (1 - PEN / 100)) * DAMAGE_RATE * (1 + SKD / 100) * RANDOM",

  "variables": {
    "ATK": "SELF.ATK",
    "DEF": "TARGET.DEF",
    "PEN": "SELF.PEN",
    "SKD": "SELF.SKD",
    "DAMAGE_RATE": "PARAM.DAMAGE_RATE",
    "RANDOM": "RANDOM(0.8,1.0)"
  }
}
```

---

# 5. Properties

| Field | Required | Description |
|---------|----------|-------------|
| id | Yes | Formula Identifier |
| displayName | Yes | Display Name |
| description | No | Description |
| expression | Yes | Mathematical Expression |
| variables | No | Variable Mapping |

---

# 6. Expression

Expression là biểu thức toán học.

Ví dụ

```
(ATK - DEF * (1 - PEN / 100))
*
DAMAGE_RATE
*
(1 + SKD / 100)
*
RANDOM
```

Expression chỉ được sử dụng:

- toán tử

```
+
-
*
/
%
()
```

- hằng số

```
0.25

100

1.5
```

- Variable

```
ATK

DEF

PEN

RANDOM

...
```

Không được hardcode:

```
SELF.ATK
```

```
TARGET.DEF
```

trong Expression.

---

# 7. Variables

Variables dùng để ánh xạ Variable trong Expression tới Battle Context.

Ví dụ

```json
{
  "variables": {
    "ATK": "SELF.ATK",
    "DEF": "TARGET.DEF",
    "DAMAGE_RATE": "PARAM.DAMAGE_RATE"
  }
}
```

Battle Engine sẽ Resolve Variables trước khi Evaluate Expression.

---

# 8. Variable Sources

## SELF

Battle Attribute của người thực thi Formula.

Ví dụ

```
SELF.ATK

SELF.DEF

SELF.CDMG
```

---

## TARGET

Battle Attribute của mục tiêu.

Ví dụ

```
TARGET.DEF

TARGET.HP

TARGET.TEN
```

---

## INPUT

Giá trị đầu vào từ Action trước.

Ví dụ

```
INPUT.DAMAGE

INPUT.HEAL

INPUT.SHIELD
```

---

## PARAM

Tham số được truyền từ Action.

Ví dụ

```
PARAM.DAMAGE_RATE

PARAM.HEAL_RATE

PARAM.SHIELD_RATE
```

---

# 9. Battle Attribute Rule

Mọi Attribute trong Formula đều được hiểu là:

```
Battle Attribute
```

Ví dụ

```
ATK
```

không phải

```
Base ATK
```

mà là

```
Battle ATK
```

Bao gồm:

- Base Attribute
- Equipment
- Talent
- Passive
- Buff
- Debuff
- Modifier

Formula không cần sử dụng:

```
Current ATK
```

hoặc

```
Final ATK
```

---

# 10. Formula Types

Formula được chia thành hai nhóm.

## Generic Formula

Generic Formula nhận tham số từ Action.

Ví dụ

```
SKILL_DAMAGE

HEAL_SKILL

SHIELD_SKILL
```

Generic Formula sử dụng:

```
PARAM.xxx
```

---

## Fixed Formula

Gameplay Formula không nhận tham số.

Ví dụ

```
BURN_DAMAGE

POISON_DAMAGE

BLEED_DAMAGE

REGEN_HEAL
```

Giá trị được viết trực tiếp trong Expression.

Ví dụ

```
ATK * 0.35
```

---

# 11. Design Rules

## Rule 1

Formula chỉ trả về một giá trị.

---

## Rule 2

Formula không Resolve Variable.

---

## Rule 3

Formula không Resolve Target.

---

## Rule 4

Formula không Trigger Gameplay.

---

## Rule 5

Formula không chứa Battle Logic.

---

## Rule 6

Expression phải ngắn gọn và dễ đọc.

Ưu tiên biểu diễn giống công thức toán học.

---

## Rule 7

Expression không tham chiếu trực tiếp Battle Context.

Luôn thông qua Variables.

---

# 12. Validation Rules

Formula hợp lệ khi:

- Có id.
- Có expression.

Nếu Expression sử dụng Variable.

↓

Variable phải được khai báo trong:

```
variables
```

---

# 13. Non Responsibilities

Formula không chịu trách nhiệm:

- Trigger
- Effect
- Modifier
- Target
- Runtime
- Battle Context

---

# 14. Summary

Formula là Mathematical Expression.

Formula không biết Battle.

Formula không biết Gameplay.

Battle Engine chịu trách nhiệm:

```
Resolve Variables

↓

Evaluate Expression

↓

Return Value
```

Formula chỉ mô tả:

```
How to Calculate
```

không mô tả:

```
When

Who

Why
```