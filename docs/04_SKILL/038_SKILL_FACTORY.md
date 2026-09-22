# Skill Factory

Version: 1.0.0

---

# 1. Purpose

SkillFactory chịu trách nhiệm tạo SkillDefinition từ JSON.

SkillFactory không chứa Battle Logic.

SkillFactory chỉ parse JSON và validate.

---

# 2. Design Philosophy

```
skill.json

↓

SkillFactory.create()

↓

SkillDefinition

↓

SkillManager

↓

SkillExecutor
```

Separating concerns:

- SkillFactory: Parse & Validate
- SkillManager: Manage & Select
- SkillExecutor: Execute

---

# 3. Responsibility

SkillFactory chịu trách nhiệm

- Parse JSON
- Validate Structure
- Validate Types
- Validate References
- Create SkillDefinition

SkillFactory không

- Tính Damage
- Quản lý Entity
- Quản lý Battle
- Tối ưu hóa

---

# 4. Create Method

```javascript
SkillFactory.create(skillJson)

↓

Validate Schema

↓

Validate Required Fields

↓

Validate Actions

↓

Build SkillDefinition

↓

Return SkillDefinition
```

---

# 5. Validation

## Schema Validation

Kiểm tra cấu trúc JSON đúng định dạng.

```
{
  "id": number,
  "code": string,
  "name": string,
  "description": string,
  "activation": string,
  "actions": array,
  "tags": array,
  "metadata": object
}
```

---

## Required Fields

Bắt buộc

- id
- code
- name
- activation
- actions

Tùy chọn

- description
- tags
- metadata

---

## Activation Validation

Activation phải là một trong

```
ACTIVE
PASSIVE
TRIGGER
```

---

## Actions Validation

Mỗi Action phải có

```
type
target (ngoài PASSIVE)
params (tùy type)
conditions (tùy chọn)
```

Action type phải là một trong

```
DAMAGE
HEAL
SHIELD
APPLY_EFFECT
REMOVE_EFFECT
DISPEL
PURIFY
REVIVE
SUMMON
CHANGE_ATTRIBUTE
```

---

## Target Validation

Target phải là một trong

```
SELF
ALLY
ENEMY
ALL_ALLY
ALL_ENEMY
RANDOM_ALLY
RANDOM_ENEMY
LOWEST_HP_ALLY
LOWEST_HP_ENEMY
HIGHEST_HP_ALLY
HIGHEST_HP_ENEMY
HIGHEST_ATK_ALLY
HIGHEST_ATK_ENEMY
LOWEST_ATK_ALLY
LOWEST_ATK_ENEMY
DEAD_ALLY
```

---

## Params Validation

Tùy thuộc Action type.

### DAMAGE

```
multiplier (number, > 0)
formula (string, optional)
element (string, optional)
```

### HEAL

```
multiplier (number, > 0)
```

### SHIELD

```
multiplier (number, > 0)
duration (number, > 0)
```

### APPLY_EFFECT

```
effect (string)
chance (number, 0-100)
duration (number, > 0)
stack (number, > 0)
```

---

# 6. Error Handling

Nếu JSON không hợp lệ

↓

Throw ValidationError

Ví dụ

```
ValidationError: Missing required field 'code'

ValidationError: Invalid activation 'UNKNOWN'

ValidationError: Action type 'INVALID' not supported
```

---

# 7. Caching

SkillFactory có thể cache.

```
skillCache = Map<id, SkillDefinition>

SkillFactory.create(json)

↓

Nếu id đã cache

↓

Return từ cache

↓

Nếu không

↓

Parse & Validate

↓

Cache & Return
```

---

# 8. Registry Pattern

```
SkillFactory.register(skillJson)

↓

Validate

↓

Store in Registry

↓

Return SkillDefinition
```

Hỗ trợ batch register

```
SkillFactory.registerBatch([json1, json2, json3, ...])
```

---

# 9. Metadata Handling

Metadata là Object tự do.

Factory không validate metadata.

Metadata được pass-through.

```
metadata: {
  rarity: "rare",
  cooldown: 0,
  custom_property: "value"
}
```

---

# 10. Dependency

SkillFactory sử dụng

```
SkillDefinition (model)
ValidationError
```

SkillFactory không phụ thuộc

```
BattleEngine
BattleEntity
SkillExecutor
SkillManager
```

---

End Of File
