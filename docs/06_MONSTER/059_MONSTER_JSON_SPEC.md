# Monster JSON Specification

Version: 1.0.0

---

# 1. Purpose

Tài liệu này định nghĩa format JSON chuẩn cho mọi Monster.

Tất cả Monster phải tuân thủ định dạng này.

MonsterFactory sử dụng spec này để validate.

---

# 2. Design Philosophy

```
Data Driven

↓

JSON định nghĩa mọi Monster

↓

MonsterFactory parse

↓

MonsterAI quyết định hành động

↓

Không Hardcode
```

---

# 3. Root Structure

```json
{
  "id": 30001,
  "code": "SKELETON",
  "name": "Skeleton Warrior",
  "description": "Chiến binh bộ xương",
  "type": "COMMON",
  "attributes": {...},
  "skills": {...},
  "loot": {...},
  "ai": {...},
  "tags": [...],
  "metadata": {}
}
```

---

# 4. Basic Fields

## id

- Type: `number`
- Required: Yes
- Unique: Yes
- Range: 30001 - 39999
- Purpose: Unique identifier

Example:
```json
"id": 30001
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
"code": "SKELETON"
```

---

## name

- Type: `string`
- Required: Yes
- Length: 1-100
- Purpose: Display name

Example:
```json
"name": "Skeleton Warrior"
```

---

## description

- Type: `string`
- Required: No
- Length: 0-500
- Purpose: UI description

Example:
```json
"description": "Chiến binh bộ xương"
```

---

## type

- Type: `string`
- Required: Yes
- Allowed: `COMMON`, `ELITE`, `BOSS`, `WORLD_BOSS`, `SUMMON`
- Purpose: Monster type

Example:
```json
"type": "COMMON"
```

---

# 5. Attributes Object

Monster attributes.

```json
"attributes": {
  "hp": 100,
  "atk": 50,
  "def": 20,
  "spd": 25,
  "crit": 10,
  "cdmg": 50,
  "pen": 0,
  "skd": 0,
  "ls": 0,
  "ref": 0,
  "shd": 0,
  "reg": 0,
  "ccr": 0
}
```

---

## Attribute Type

- Type: `number`
- Range: >= 0 (except HP, ATK, DEF which > 0)
- Purpose: Monster stats

---

# 6. Skills Object

Monster skills.

```json
"skills": {
  "basic": "BASIC_ATTACK",
  
  "active": [
    "SLASH",
    "HEAVY_BLOW"
  ],
  
  "passive": [
    "BLOODLUST"
  ],
  
  "trigger": [
    {
      "skill": "COUNTER",
      "event": "AFTER_ATTACK",
      "chance": 50
    }
  ]
}
```

---

## basic

- Type: `string`
- Required: Yes
- Purpose: Basic attack skill code

---

## active

- Type: `array of string`
- Required: Yes (can be empty)
- Purpose: Active skill codes

---

## passive

- Type: `array of string`
- Required: No
- Purpose: Passive skill codes

---

## trigger

- Type: `array of object`
- Required: No
- Purpose: Trigger skill definitions

Trigger object:
```json
{
  "skill": "COUNTER",
  "event": "AFTER_ATTACK",
  "chance": 50
}
```

---

# 7. Loot Object

Monster loot.

```json
"loot": {
  "gold": {
    "min": 100,
    "max": 200
  },
  
  "exp": 1000,
  
  "items": [
    {
      "code": "ITEM_CODE",
      "chance": 10
    }
  ]
}
```

---

## gold

- Type: `object`
- min: number (>= 0)
- max: number (>= min)

---

## exp

- Type: `number`
- Range: >= 0

---

## items

- Type: `array of object`
- Item object:
  - code: string
  - chance: number (0-100)

---

# 8. AI Object

Monster AI.

```json
"ai": {
  "profile": "AGGRESSIVE",
  
  "behavior": [
    "ATTACK",
    "DAMAGE_DEALER"
  ],
  
  "skills": {
    "priority": [
      "FIREBALL",
      "ICE_SWORD",
      "HEAL"
    ],
    
    "conditions": {
      "FIREBALL": "enemy > 1",
      "HEAL": "hp < 50%"
    }
  }
}
```

---

## profile

- Type: `string`
- Allowed: `AGGRESSIVE`, `DEFENSIVE`, `BALANCED`, `TACTICAL`, `SUPPORT`, `PASSIVE`

---

## behavior

- Type: `array of string`
- Example: ["ATTACK", "DAMAGE_DEALER", "HEALER"]

---

## skills

- Type: `object`
- priority: array of skill codes
- conditions: object of conditions

---

# 9. Tags Array

Classification tags.

```json
"tags": ["undead", "melee", "fire"]
```

Common tags:
```
undead, demon, humanoid, beast, elemental
melee, ranged, caster, healer, support
fire, ice, lightning, poison
elite, boss, rare
```

---

# 10. Metadata Object

Custom metadata.

```json
"metadata": {
  "icon": "skeleton.png",
  "animation": "skeleton_anim",
  "sound": "skeleton_sound.mp3",
  "color": "#808080",
  "author": "system",
  "version": "1.0"
}
```

---

# 11. Complete Examples

### Common Monster

```json
{
  "id": 30001,
  "code": "SKELETON",
  "name": "Skeleton Warrior",
  "type": "COMMON",
  "attributes": {
    "hp": 100,
    "atk": 50,
    "def": 20,
    "spd": 25
  },
  "skills": {
    "basic": "BASIC_ATTACK",
    "active": ["SLASH", "HEAVY_BLOW"],
    "passive": []
  },
  "loot": {
    "gold": { "min": 100, "max": 200 },
    "exp": 1000,
    "items": []
  },
  "ai": {
    "profile": "AGGRESSIVE"
  },
  "tags": ["undead", "melee"],
  "metadata": {}
}
```

---

### Elite Monster

```json
{
  "id": 30101,
  "code": "ORC_SHAMAN",
  "name": "Orc Shaman",
  "type": "ELITE",
  "attributes": {
    "hp": 300,
    "atk": 80,
    "def": 50,
    "spd": 30
  },
  "skills": {
    "basic": "BASIC_ATTACK",
    "active": ["FIREBALL", "HEAL"],
    "passive": ["SPELL_MASTERY"]
  },
  "loot": {
    "gold": { "min": 500, "max": 1000 },
    "exp": 5000,
    "items": [
      {
        "code": "STAFF_01",
        "chance": 20
      }
    ]
  },
  "ai": {
    "profile": "TACTICAL"
  },
  "tags": ["humanoid", "caster"],
  "metadata": {}
}
```

---

### Boss Monster

```json
{
  "id": 30201,
  "code": "DRAGON_BOSS",
  "name": "Fire Dragon",
  "type": "BOSS",
  "attributes": {
    "hp": 5000,
    "atk": 200,
    "def": 100,
    "spd": 60
  },
  "skills": {
    "basic": "BASIC_ATTACK",
    "active": [
      "FIRE_BREATH",
      "METEOR",
      "DRAGON_ROAR"
    ],
    "passive": ["DRAGON_MIGHT"]
  },
  "loot": {
    "gold": { "min": 5000, "max": 10000 },
    "exp": 50000,
    "items": [
      {
        "code": "DRAGON_SCALE",
        "chance": 50
      },
      {
        "code": "LEGENDARY_SWORD",
        "chance": 30
      }
    ]
  },
  "ai": {
    "profile": "TACTICAL"
  },
  "tags": ["dragon", "fire", "boss"],
  "metadata": {}
}
```

---

# 12. Validation Rules

Schema validation:

- id: number, unique, 30001-39999
- code: string, unique, UPPERCASE_UNDERSCORE
- name: string, 1-100 char
- type: COMMON|ELITE|BOSS|WORLD_BOSS|SUMMON
- attributes: object (all > 0 except DEF/SPD)
- skills: object (basic required)
- loot: object (optional)
- ai: object (optional, default: AGGRESSIVE)
- tags: array (optional)
- metadata: object (optional)

---

# End Of File
