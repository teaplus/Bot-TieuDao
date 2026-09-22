# 004_SKILL_ACTION_SPEC.md

# Skill Action Specification

## Mục tiêu

Action là đơn vị thực thi nhỏ nhất (Atomic Executable Unit) trong Battle Runtime.

Một Skill không trực tiếp thực hiện gameplay.

Skill chỉ là tập hợp các Action được Battle Engine thực thi tuần tự.

Battle Runtime chịu trách nhiệm:

- Resolve Target
- Check Condition
- Execute Formula
- Apply Effect
- Update Battle Context

Action không chứa runtime logic.



---

# Kiến trúc

```
Skill
 ├── Action 1
 ├── Action 2
 ├── Action 3
 └── ...
```

Battle Engine sẽ thực thi từng Action theo thứ tự.

```
Battle Engine
      │
      ▼
Load Skill
      │
      ▼
Sort Action By Order
      │
      ▼
Execute Action #1
      │
      ▼
Execute Action #2
      │
      ▼
Execute Action #3
      │
      ▼
...
```

---

# Action Model

```json
{
  "id": "action_fire_001",
  "order": 1,
  "type": "APPLY_EFFECT",
  "target": "ENEMY_SINGLE",
  "condition": null,
  "formulaId": null,
  "effectId": "ELEMENT_FIRE",
  "parameters": {}
}
```

---

# Field

| Field | Required | Description |
|---------|----------|-------------|
| id | ✓ | Action ID |
| order | ✓ | Thứ tự thực thi |
| type | ✓ | Action Type |
| target | ✓ | Target Strategy |
| condition | | Điều kiện thực thi |
| formulaId | | Formula sử dụng |
| effectId | | Effect được Apply |
| parameters | | Dữ liệu bổ sung |

---

# Action Type

Action chỉ thực hiện **một nhiệm vụ duy nhất**.

Ví dụ:

```
DAMAGE
```

```
HEAL
```

```
APPLY_EFFECT
```

```
REMOVE_EFFECT
```

```
ADD_MODIFIER
```

```
REMOVE_MODIFIER
```

```
ADD_SHIELD
```

```
REMOVE_SHIELD
```

```
PURIFY
```

```
REVIVE
```

```
SUMMON
```

```
TELEPORT
```

```
TRANSFORM
```

```
CUSTOM
```

Battle Engine quyết định cách thực thi từng Action Type.

---

# Một Action chỉ có một trách nhiệm

Không thực hiện nhiều gameplay trong cùng một Action.

Ví dụ KHÔNG khuyến khích:

```json
{
  "type":"DAMAGE",
  "formulaId":"SKILL_DAMAGE",
  "effectId":"ELEMENT_FIRE"
}
```

Action trên vừa Damage vừa Apply Effect.

Thay vào đó:

```json
{
  "actions":[
    {
      "order":1,
      "type":"APPLY_EFFECT",
      "effectId":"ELEMENT_FIRE"
    },
    {
      "order":2,
      "type":"DAMAGE",
      "formulaId":"SKILL_DAMAGE"
    }
  ]
}
```

Mỗi Action chỉ thực hiện một loại gameplay.

---

# Runtime Flow

Battle Engine thực thi Skill theo vòng lặp Action.

```
Load Skill
      │
      ▼
For Each Action
      │
      ▼
Resolve Target
      │
      ▼
Check Condition
      │
      ▼
Execute Action
      │
      ▼
Next Action
```

---

# Execute Action

Tùy theo Action Type mà Battle Engine sẽ gọi module tương ứng.

Ví dụ:

```
DAMAGE
        │
        ▼
Formula Engine
        │
        ▼
Battle Result
```

```
HEAL
        │
        ▼
Formula Engine
        │
        ▼
Battle Result
```

```
APPLY_EFFECT
        │
        ▼
Effect Engine
```

```
ADD_MODIFIER
        │
        ▼
Modifier Engine
```

```
ADD_SHIELD
        │
        ▼
Shield Engine
```

---

# Formula

Chỉ các Action cần tính toán mới sử dụng Formula.

Ví dụ:

- DAMAGE
- HEAL
- SHIELD

Các Action như:

- APPLY_EFFECT
- REMOVE_EFFECT
- PURIFY

không bắt buộc phải có Formula.

---

# Effect

Action có thể Apply Effect.

Ví dụ:

```json
{
  "type":"APPLY_EFFECT",
  "effectId":"ELEMENT_FIRE"
}
```

Battle Engine sẽ chuyển Effect cho Effect Engine xử lý.

---

# Condition

Nếu Condition không thỏa mãn thì Action bị bỏ qua.

Ví dụ:

```json
{
  "condition":"TARGET_HP_BELOW_50"
}
```

---

# Ví dụ Skill

Ví dụ Fireball.

```json
{
  "id":"SK_FIREBALL",

  "actions":[

    {
      "id":"fire_01",
      "order":1,
      "type":"APPLY_EFFECT",
      "target":"ENEMY_SINGLE",
      "effectId":"ELEMENT_FIRE"
    },

    {
      "id":"fire_02",
      "order":2,
      "type":"DAMAGE",
      "target":"ENEMY_SINGLE",
      "formulaId":"SKILL_DAMAGE"
    }

  ]
}
```

Battle Runtime:

```
Fireball

↓

Action 1

↓

Apply Fire Effect

↓

Action 2

↓

Calculate Damage

↓

End Skill
```

---

# Design Principles

- Skill chỉ là dữ liệu.
- Action là đơn vị thực thi nhỏ nhất.
- Một Action chỉ có một trách nhiệm.
- Battle Engine điều phối Action Loop.
- Formula chỉ dùng khi Action cần tính toán.
- Effect chỉ được Apply bởi APPLY_EFFECT.
- Thứ tự gameplay được quyết định bằng `order`.
- Battle Runtime không phụ thuộc vào nội dung Skill.