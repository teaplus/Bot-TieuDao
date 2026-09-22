# 006_TARGET_SPEC.md

# Target Specification

Version: 2.0

Status: Stable

---

# 1. Purpose

Target định nghĩa cách Action lựa chọn Battle Entity.

Target chỉ mô tả:

- Đối tượng nào sẽ được Action tác động.

Target không chịu trách nhiệm:

- Battle Logic
- Formula
- Condition
- Runtime

Battle Engine chịu trách nhiệm Resolve Target.

---

# 2. Responsibility

Target chịu trách nhiệm:

- Định nghĩa Target Strategy.
- Cung cấp Target cho Action.

Target không chịu trách nhiệm:

- Gameplay.
- Damage.
- Heal.
- Buff.
- Debuff.

---

# 3. Dependency

Target không phụ thuộc Domain nào.

Action tham chiếu:

```
target
```

Battle Engine chịu trách nhiệm:

```
Target Resolver
```

---

# 4. Data Model

```json
{
  "id": "ENEMY_SINGLE",

  "displayName": "Một kẻ địch"
}
```

---

# 5. Properties

| Field | Required | Description |
|---------|----------|-------------|
| id | Yes | Target Identifier |
| displayName | Yes | Display Name |

---

# 6. Target Types

## Self

```
SELF
```

Chính đối tượng thực thi Action.

---

## Ally

```
ALLY_SINGLE
```

Một đồng minh.

```
ALLY_ALL
```

Toàn bộ đồng minh.

```
ALLY_RANDOM
```

Một đồng minh ngẫu nhiên.

```
ALLY_LOWEST_HP
```

Đồng minh có HP thấp nhất.

```
ALLY_HIGHEST_ATTACK
```

Đồng minh có ATK cao nhất.

---

## Enemy

```
ENEMY_SINGLE
```

Một kẻ địch.

```
ENEMY_RANDOM
```

Một kẻ địch ngẫu nhiên.

```
ENEMY_ALL
```

Toàn bộ kẻ địch.

---

## Dead

```
DEAD_ALLY
```

Một đồng minh đã tử trận.

---

## Global

```
ALL
```

Toàn bộ Battle Entity.

---

# 7. Design Rules

## Rule 1

Target chỉ mô tả cách chọn Battle Entity.

---

## Rule 2

Target không Resolve Battle Entity.

Battle Engine chịu trách nhiệm Resolve.

---

## Rule 3

Target không chứa Gameplay Logic.

---

## Rule 4

Một Action chỉ có một Target.

---

## Rule 5

Một Effect có thể chứa nhiều Action.

Mỗi Action được phép sử dụng Target khác nhau.

Ví dụ

```
Action 1

↓

ENEMY_SINGLE

----------------

Action 2

↓

SELF

----------------

Action 3

↓

ALLY_ALL
```

---

# 8. Validation Rules

Target hợp lệ khi:

- Có id.
- id là duy nhất.

---

# 9. Non Responsibilities

Target không chịu trách nhiệm:

- Battle
- Formula
- Modifier
- Condition
- Effect
- Runtime

---

# 10. Summary

Target là Target Strategy.

Target chỉ mô tả:

```
Who
```

Battle Engine chịu trách nhiệm:

```
Resolve Target
```