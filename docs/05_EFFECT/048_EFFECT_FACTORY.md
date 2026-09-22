# Effect Factory

Version: 1.0.0

---

# 1. Purpose

EffectFactory chịu trách nhiệm tạo EffectDefinition từ JSON.

EffectFactory không chứa Battle Logic.

EffectFactory chỉ parse JSON và validate.

---

# 2. Design Philosophy

```
effect.json

↓

EffectFactory.get() / .create()

↓

EffectDefinition

↓

EffectEngine.apply()
```

Separating concerns:

- EffectFactory: Parse & Validate
- EffectEngine: Apply & Manage
- EffectDefinition: Model

---

# 3. Responsibility

EffectFactory chịu trách nhiệm

- Parse JSON
- Validate Structure
- Validate Types
- Validate Properties
- Create EffectDefinition
- Cache Definitions

EffectFactory không

- Tính Damage
- Quản lý Entity
- Quản lý Battle
- Apply Effect

---

# 4. Create Method

```javascript
EffectFactory.create(effectJson)

↓

Validate Schema

↓

Validate Required Fields

↓

Validate Type

↓

Validate Properties

↓

Build EffectDefinition

↓

Cache

↓

Return EffectDefinition
```

---

# 5. Validation

## Schema Validation

Kiểm tra cấu trúc JSON.

```
{
  "id": number,
  "code": string,
  "name": string,
  "type": string,
  "properties": object,
  "duration": object,
  "stack": object,
  "conditions": array,
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
- type

Tùy chọn

- description
- properties
- duration
- stack
- conditions
- tags
- metadata

---

## Type Validation

Type phải là một trong

```
BUFF
DEBUFF
PASSIVE
DOT
HOT
CONTROL
SHIELD
IMMUNITY
```

---

## Duration Validation

Duration phải có

```
type: TURN | PERMANENT
value: number (> 0 nếu TURN)
tickTiming: START_OF_TURN | END_OF_TURN | IMMEDIATE
```

---

## Stack Validation

Stack phải có

```
stackable: boolean
maxStack: number (> 0 nếu stackable)
refreshDuration: boolean
```

---

## Condition Validation

Condition phải đúng format.

```
{
  "type": string,
  "value": number | string
}
```

Allowed type:

```
HP_ABOVE
HP_BELOW
HAS_EFFECT
NO_EFFECT
SHIELD_ACTIVE
NO_DEBUFF
TARGET_ALIVE
TARGET_DEAD
```

---

# 6. Property Validation

Validate Properties theo Type.

### BUFF / DEBUFF

```
properties: {
  potency: 0-100 (optional),
  removable: boolean (optional),
  statModifier: {...}
}
```

### DOT / HOT

```
properties: {
  potency: 0-100,
  removable: boolean,
  tick: {
    enabled: true,
    damage/heal: {
      multiplier: number,
      type: DOT/HOT
    }
  }
}
```

### CONTROL

```
properties: {
  potency: 100,
  removable: boolean
}
```

---

# 7. Error Handling

Nếu JSON không hợp lệ

↓

Throw ValidationError

Ví dụ

```
ValidationError: Missing required field 'code'

ValidationError: Invalid type 'UNKNOWN'

ValidationError: Invalid duration value (must > 0)

ValidationError: Stack maxStack must > 0 if stackable
```

---

# 8. Caching

EffectFactory cache EffectDefinition.

```
effectCache = Map<code, EffectDefinition>

EffectFactory.get(effectCode)

↓

Nếu đã cache

↓

Return từ cache

↓

Nếu không

↓

Lookup từ Repository

↓

Parse & Validate

↓

Cache & Return
```

---

# 9. Registry Pattern

```
EffectFactory.register(effectJson)

↓

Validate

↓

Store in Registry

↓

Return EffectDefinition
```

Hỗ trợ batch register

```
EffectFactory.registerBatch([json1, json2, json3, ...])
```

---

# 10. Lookup Methods

```
get(effectCode)
  → Get from cache

getById(effectId)
  → Lookup by ID

getByTag(tag)
  → Get all with tag

searchByName(name)
  → Search by name (like)
```

---

# 11. Metadata Handling

Metadata là Object tự do.

Factory không validate metadata.

Metadata được pass-through.

```
metadata: {
  icon: "burn.png",
  animation: "burn_effect",
  color: "#FF6600",
  custom: "value"
}
```

---

# 12. Version Handling

Support Effect JSON versioning.

```
{
  "_schema_version": "1.0.0",
  "id": 20001,
  ...
}
```

Factory có thể upgrade từ version cũ.

---

# 13. Dependency

EffectFactory sử dụng

```
EffectDefinition (model)

ValidationError

RandomProvider (for validation)
```

EffectFactory không phụ thuộc

```
BattleEngine

EffectEngine

BattleEntity

Database
```

---

# 14. Integration

EffectFactory integrate với:

```
EffectEngine (when apply effect)
  ↓
EffectEngine.apply(target, effectCode)
  ↓
EffectFactory.get(effectCode)
  ↓
Return EffectDefinition

Data Layer (batch load effects)
  ↓
EffectFactory.registerBatch(effects from DB)
```

---

# 15. Performance

EffectFactory tối ưu:

- Lazy load on first request
- Cache after load
- Batch register for startup
- Index by code, id, tag

---

# Example: Create Effect

```
effectJson = {
  "id": 20001,
  "code": "BURN",
  "name": "Burn",
  "type": "DOT",
  "properties": {
    "potency": 100,
    "removable": true
  },
  "duration": {
    "type": "TURN",
    "value": 3,
    "tickTiming": "END_OF_TURN"
  },
  "tick": {
    "enabled": true,
    "damage": {
      "multiplier": 0.1,
      "element": "fire"
    }
  },
  "tags": ["fire", "dot"],
  "metadata": {
    "icon": "burn.png"
  }
}

↓

EffectFactory.register(effectJson)

↓

Validate Schema → OK
Validate Type → DOT ✓
Validate Duration → OK
Validate Properties → OK
Validate Stack → default OK

↓

Create EffectDefinition

↓

Cache

↓

Return EffectDefinition
```

---

# End Of File
