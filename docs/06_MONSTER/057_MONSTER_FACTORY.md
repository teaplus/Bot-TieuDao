# Monster Factory

Version: 1.0.0

---

# 1. Purpose

MonsterFactory chịu trách nhiệm tạo Monster từ JSON.

MonsterFactory không chứa Battle Logic.

MonsterFactory chỉ parse JSON và validate.

---

# 2. Design Philosophy

```
monster.json

↓

MonsterFactory.create()

↓

MonsterDefinition

↓

BattleEntity
```

Separating concerns:

- MonsterFactory: Parse & Validate
- MonsterAI: Decide & Execute
- BattleEntity: Store State

---

# 3. Responsibility

MonsterFactory chịu trách nhiệm

- Parse JSON
- Validate Structure
- Validate Attributes
- Validate Skills
- Create MonsterDefinition
- Create BattleEntity

MonsterFactory không

- Tính Damage
- Quản lý Battle
- Quyết định AI

---

# 4. Create Method

```javascript
MonsterFactory.create(monsterJson)

↓

Validate Schema

↓

Validate Required Fields

↓

Validate Attributes

↓

Validate Skills

↓

Load Skill Definition

↓

Build MonsterDefinition

↓

Cache

↓

Return MonsterDefinition
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
  "attributes": object,
  "skills": object,
  "loot": object,
  "ai": object,
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
- attributes
- skills

Tùy chọn

- description
- loot
- ai
- tags
- metadata

---

## Attribute Validation

Attribute phải có

```
hp: number (> 0)
atk: number (> 0)
def: number (>= 0)
spd: number (>= 0)
...
```

---

## Skill Validation

Skill phải tồn tại.

```
basic: string (exist)

active: array of string (all exist)

passive: array of string (all exist)

trigger: array of {skill, event} (all exist)
```

---

# 6. Loot Validation

Loot phải hợp lệ.

```
gold: {min, max} (min <= max)

exp: number (>= 0)

items: array of {code, chance} (chance 0-100)
```

---

# 7. AI Validation

AI phải hợp lệ.

```
profile: AGGRESSIVE|DEFENSIVE|BALANCED|TACTICAL|SUPPORT|PASSIVE

behavior: array of string

skills: object (optional)
```

---

# 8. Error Handling

Nếu JSON không hợp lệ

↓

Throw ValidationError

Ví dụ

```
ValidationError: Missing required field 'code'

ValidationError: Invalid type 'UNKNOWN'

ValidationError: Skill 'FIREBALL' not found

ValidationError: Attribute ATK must > 0
```

---

# 9. Caching

MonsterFactory cache MonsterDefinition.

```
monsterCache = Map<code, MonsterDefinition>

MonsterFactory.create(monsterCode)

↓

Nếu đã cache

↓

Return từ cache

↓

Nếu không

↓

Lookup từ JSON file

↓

Parse & Validate

↓

Cache & Return
```

---

# 10. Registry Pattern

```
MonsterFactory.register(monsterJson)

↓

Validate

↓

Store in Registry

↓

Return MonsterDefinition
```

Hỗ trợ batch register

```
MonsterFactory.registerBatch([json1, json2, json3, ...])
```

---

# 11. Spawn Methods

```
createInstance(monsterCode)
  → Create new Monster instance

createBattle(monsterCode)
  → Create Monster for battle

createTeam(monsterCodes)
  → Create multiple Monster
```

---

# 12. Difficulty Scaling

Factory có thể scale Difficulty.

```
createScaled(monsterCode, difficulty)

difficulty = 1.0 (normal)
difficulty = 1.5 (hard)

Scale:

- HP × difficulty
- ATK × difficulty
- Reward × difficulty
```

---

# 13. Dependency

MonsterFactory sử dụng

```
MonsterDefinition (model)

SkillFactory (load skills)

ValidationError

RandomProvider
```

MonsterFactory không phụ thuộc

```
BattleEngine

Battle State

Player

Database (directly)
```

---

# 14. Example: Create Monster

```
monsterJson = {
  "id": 30001,
  "code": "SKELETON",
  "name": "Skeleton Warrior",
  "type": "COMMON",
  "attributes": {
    "hp": 100,
    "atk": 50
  },
  "skills": {
    "basic": "BASIC_ATTACK",
    "active": ["SLASH"]
  },
  "ai": {
    "profile": "AGGRESSIVE"
  }
}

↓

MonsterFactory.register(monsterJson)

↓

Validate all fields ✓

Load skills ✓

↓

Create MonsterDefinition

↓

Cache in registry

↓

Return MonsterDefinition
```

---

End Of File
