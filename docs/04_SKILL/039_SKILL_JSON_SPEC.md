# Skill JSON Specification

Version: 1.0.0

---

# 1. Purpose

Tài liệu này định nghĩa format JSON chuẩn cho mọi Skill.

Tất cả Skill phải tuân thủ định dạng này.

SkillFactory sử dụng spec này để validate.

---

# 2. Design Philosophy

```
Data Driven

↓

JSON định nghĩa mọi Skill

↓

SkillFactory parse

↓

SkillExecutor thực thi

↓

Không Hardcode
```

---

# 3. Root Structure

```json
{
  "id": 10001,
  "code": "FIREBALL",
  "name": "Hỏa Diễm Quyết",
  "description": "Phóng một quả cầu lửa vào kẻ địch",
  "activation": "ACTIVE",
  "actions": [...],
  "tags": ["fire", "damage", "aoe"],
  "metadata": {}
}
```

---

# 4. Basic Fields

## id

- Type: `number`
- Required: Yes
- Unique: Yes
- Range: 10001 - 99999
- Purpose: Unique identifier

Example:
```json
"id": 10001
```

---

## code

- Type: `string`
- Required: Yes
- Unique: Yes
- Format: `UPPERCASE_WITH_UNDERSCORE`
- Purpose: Internal code name

Example:
```json
"code": "FIREBALL"
```

---

## name

- Type: `string`
- Required: Yes
- Length: 1-100
- Purpose: Display name

Example:
```json
"name": "Hỏa Diễm Quyết"
```

---

## description

- Type: `string`
- Required: No
- Length: 0-500
- Purpose: UI description only

Example:
```json
"description": "Phóng một quả cầu lửa vào kẻ địch"
```

---

## activation

- Type: `string`
- Required: Yes
- Allowed: `ACTIVE`, `PASSIVE`, `TRIGGER`
- Purpose: Skill type

Example:
```json
"activation": "ACTIVE"
```

---

# 5. Actions Array

Array chứa các Action được thực hiện theo thứ tự.

```json
"actions": [
  { "type": "DAMAGE", ... },
  { "type": "APPLY_EFFECT", ... },
  { "type": "HEAL", ... }
]
```

Mỗi Action sẽ được thực hiện tuần tự.

Nếu một Action fail → Stop execution.

---

# 6. Action Structure

```json
{
  "type": "DAMAGE",
  "target": "ENEMY",
  "params": {
    "multiplier": 1.5,
    "element": "fire"
  },
  "conditions": [],
  "metadata": {}
}
```

---

## Action.type

- Type: `string`
- Required: Yes
- Allowed: See 6.1

---

## Action.target

- Type: `string`
- Required: Yes (except PASSIVE)
- Allowed: See 6.2

---

## Action.params

- Type: `object`
- Required: Yes (tùy type)
- Structure: Tùy type (see 6.3)

---

## Action.conditions

- Type: `array`
- Required: No
- Default: `[]`
- Content: Condition objects

---

## Action.metadata

- Type: `object`
- Required: No
- Default: `{}`
- Content: Any metadata

---

# 6.1. Action Types

| Type | Description | Use Case |
|------|-------------|----------|
| DAMAGE | Gây sát thương | Tấn công |
| HEAL | Hồi máu | Chữa bệnh |
| SHIELD | Tạo khiên | Bảo vệ |
| APPLY_EFFECT | Áp dụng hiệu ứng | Buff/Debuff |
| REMOVE_EFFECT | Loại bỏ hiệu ứng | Cleanse |
| DISPEL | Loại bỏ toàn bộ buff | Cleanse buff |
| PURIFY | Loại bỏ toàn bộ debuff | Cleanse debuff |
| REVIVE | Hồi sinh | Phục sinh |
| SUMMON | Triệu hồi | Gọi quái |
| CHANGE_ATTRIBUTE | Thay đổi thuộc tính | Buff tạm |

---

# 6.2. Target Types

| Target | Description |
|--------|-------------|
| SELF | Bản thân |
| ALLY | Một đồng minh (không phải bản thân) |
| ENEMY | Một kẻ địch |
| ALL_ALLY | Tất cả đồng minh |
| ALL_ENEMY | Tất cả kẻ địch |
| RANDOM_ALLY | Ngẫu nhiên 1 đồng minh |
| RANDOM_ENEMY | Ngẫu nhiên 1 kẻ địch |
| LOWEST_HP_ALLY | Đồng minh ít máu nhất |
| LOWEST_HP_ENEMY | Kẻ địch ít máu nhất |
| HIGHEST_HP_ALLY | Đồng minh nhiều máu nhất |
| HIGHEST_HP_ENEMY | Kẻ địch nhiều máu nhất |
| HIGHEST_ATK_ALLY | Đồng minh công cao nhất |
| HIGHEST_ATK_ENEMY | Kẻ địch công cao nhất |
| LOWEST_ATK_ALLY | Đồng minh công thấp nhất |
| LOWEST_ATK_ENEMY | Kẻ địch công thấp nhất |
| DEAD_ALLY | Đồng minh chết (cho revive) |

---

# 6.3. Params by Type

### DAMAGE

```json
{
  "multiplier": 1.5,
  "formula": "ATK * multiplier",
  "element": "fire",
  "penetration": 0
}
```

- multiplier: number (> 0, required)
- formula: string (optional, default từ FormulaEngine)
- element: string (optional: fire, ice, lightning, ...)
- penetration: number (0-100, optional)

---

### HEAL

```json
{
  "multiplier": 0.8,
  "formula": "ATK * multiplier"
}
```

- multiplier: number (> 0, required)
- formula: string (optional)

---

### SHIELD

```json
{
  "multiplier": 1.0,
  "duration": 2,
  "stackable": false
}
```

- multiplier: number (> 0, required)
- duration: number (turns, > 0, optional)
- stackable: boolean (optional, default false)

---

### APPLY_EFFECT

```json
{
  "effect": "BURN",
  "chance": 100,
  "duration": 3,
  "stack": 1,
  "potency": 50
}
```

- effect: string (required)
- chance: number (0-100, optional, default 100)
- duration: number (turns, > 0, optional)
- stack: number (> 0, optional, default 1)
- potency: number (0-100, optional, effect strength)

---

### REMOVE_EFFECT

```json
{
  "effect": "BURN",
  "count": 1
}
```

- effect: string (required)
- count: number (> 0, optional, default 1)

---

### DISPEL

```json
{
  "count": 1
}
```

- count: number (> 0, optional, default all)

---

### PURIFY

```json
{
  "count": 1
}
```

- count: number (> 0, optional, default all)

---

### REVIVE

```json
{
  "hpPercent": 50
}
```

- hpPercent: number (0-100, optional, default 50)

---

### SUMMON

```json
{
  "monsterCode": "SKELETON",
  "count": 1,
  "duration": 5
}
```

- monsterCode: string (required)
- count: number (> 0, optional, default 1)
- duration: number (turns, optional)

---

### CHANGE_ATTRIBUTE

```json
{
  "attribute": "ATK",
  "value": 10,
  "duration": 2,
  "isPercentage": false
}
```

- attribute: string (required: HP, ATK, DEF, SPD, ...)
- value: number (required)
- duration: number (turns, optional)
- isPercentage: boolean (optional, default false)

---

# 7. Conditions

Điều kiện để Action được thực thi.

```json
"conditions": [
  {
    "type": "HP_BELOW",
    "value": 30
  },
  {
    "type": "HAS_EFFECT",
    "effect": "BURN"
  }
]
```

---

## Condition Types

| Type | Example | Meaning |
|------|---------|---------|
| HP_BELOW | `{ "value": 30 }` | HP < 30% |
| HP_ABOVE | `{ "value": 80 }` | HP > 80% |
| HAS_EFFECT | `{ "effect": "BURN" }` | Có Burn |
| NO_EFFECT | `{ "effect": "BURN" }` | Không có Burn |
| SHIELD_ACTIVE | | Có khiên |
| SHIELD_BROKEN | | Khiên vỡ |
| TARGET_ALIVE | | Mục tiêu còn sống |
| TARGET_DEAD | | Mục tiêu chết |

---

# 8. Tags

Array chứa tag cho tìm kiếm/phân loại.

```json
"tags": ["fire", "damage", "aoe", "active"]
```

Ví dụ tag

```
fire, ice, lightning, poison, bleed
damage, heal, shield, buff, debuff
aoe, single, passive, trigger, active
rare, epic, legend
```

---

# 9. Metadata

Object tự do cho mở rộng.

```json
"metadata": {
  "rarity": "epic",
  "cooldown": 0,
  "author": "system",
  "custom_data": {...}
}
```

Factory pass-through metadata.

---

# 10. Complete Example

### Fireball (Active Skill)

```json
{
  "id": 10001,
  "code": "FIREBALL",
  "name": "Hỏa Diễm Quyết",
  "description": "Phóng quả cầu lửa vào kẻ địch",
  "activation": "ACTIVE",
  "actions": [
    {
      "type": "DAMAGE",
      "target": "ENEMY",
      "params": {
        "multiplier": 1.5,
        "element": "fire"
      }
    },
    {
      "type": "APPLY_EFFECT",
      "target": "ENEMY",
      "params": {
        "effect": "BURN",
        "chance": 60,
        "duration": 2
      }
    }
  ],
  "tags": ["fire", "damage", "active"],
  "metadata": {
    "rarity": "common"
  }
}
```

---

### Bloodlust (Passive Skill)

```json
{
  "id": 10101,
  "code": "BLOODLUST",
  "name": "Máu Quỷ",
  "description": "Tăng sát thương khi HP thấp",
  "activation": "PASSIVE",
  "actions": [
    {
      "type": "CHANGE_ATTRIBUTE",
      "target": "SELF",
      "params": {
        "attribute": "ATK",
        "value": 30,
        "isPercentage": true
      },
      "conditions": [
        {
          "type": "HP_BELOW",
          "value": 50
        }
      ]
    }
  ],
  "tags": ["passive", "buff"],
  "metadata": {}
}
```

---

### Counter Strike (Trigger Skill)

```json
{
  "id": 10201,
  "code": "COUNTER_STRIKE",
  "name": "Phản Đòn",
  "description": "Phản công khi bị tấn công",
  "activation": "TRIGGER",
  "actions": [
    {
      "type": "DAMAGE",
      "target": "ENEMY",
      "params": {
        "multiplier": 0.7
      }
    }
  ],
  "tags": ["trigger", "damage"],
  "metadata": {
    "trigger_event": "AFTER_ATTACK",
    "trigger_chance": 50
  }
}
```

---

# 11. Versioning

JSON Schema được version.

```json
{
  "_schema_version": "1.0.0",
  "id": 10001,
  ...
}
```

Hỗ trợ upgrade từ version cũ → new.

---

End Of File
