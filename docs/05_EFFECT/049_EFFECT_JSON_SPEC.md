# Effect JSON Specification

Version: 1.0.0

---

# 1. Purpose

Tài liệu này định nghĩa format JSON chuẩn cho mọi Effect.

Tất cả Effect phải tuân thủ định dạng này.

EffectFactory sử dụng spec này để validate.

---

# 2. Design Philosophy

```
Data Driven

↓

JSON định nghĩa mọi Effect

↓

EffectFactory parse

↓

EffectEngine quản lý

↓

Không Hardcode
```

---

# 3. Root Structure

```json
{
  "id": 20001,
  "code": "BURN",
  "name": "Burn",
  "description": "Gây Hỏa sát thương 10% ATK mỗi turn",
  "type": "DOT",
  "properties": {...},
  "duration": {...},
  "stack": {...},
  "tick": {...},
  "conditions": [...],
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
- Range: 20001 - 29999
- Purpose: Unique identifier

Example:
```json
"id": 20001
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
"code": "BURN"
```

---

## name

- Type: `string`
- Required: Yes
- Length: 1-100
- Purpose: Display name

Example:
```json
"name": "Burn"
```

---

## description

- Type: `string`
- Required: No
- Length: 0-500
- Purpose: UI description only

Example:
```json
"description": "Gây Hỏa sát thương 10% ATK mỗi turn"
```

---

## type

- Type: `string`
- Required: Yes
- Allowed: `BUFF`, `DEBUFF`, `PASSIVE`, `DOT`, `HOT`, `CONTROL`, `SHIELD`, `IMMUNITY`
- Purpose: Effect type

Example:
```json
"type": "DOT"
```

---

# 5. Properties Object

Effect properties.

```json
"properties": {
  "potency": 100,
  "removable": true,
  "resistance": 0,
  "statModifier": {...}
}
```

---

## potency

- Type: `number`
- Range: 0-100
- Default: 100
- Purpose: Effect strength

Example:
```json
"potency": 100
```

---

## removable

- Type: `boolean`
- Default: true
- Purpose: Can be removed or not

Example:
```json
"removable": true
```

---

## resistance

- Type: `number`
- Range: 0-100
- Default: 0
- Purpose: Innate resistance %

Example:
```json
"resistance": 0
```

---

## statModifier

- Type: `object`
- Purpose: Stat modification for BUFF/DEBUFF

Example:
```json
"statModifier": {
  "attribute": "ATK",
  "value": 20,
  "isPercentage": true
}
```

---

# 6. Duration Object

Duration configuration.

```json
"duration": {
  "type": "TURN",
  "value": 3,
  "tickTiming": "END_OF_TURN"
}
```

---

## type

- Type: `string`
- Allowed: `TURN`, `PERMANENT`
- Required: Yes

Example:
```json
"type": "TURN"
```

---

## value

- Type: `number`
- Required: Yes
- Rules: > 0 if TURN, -1 if PERMANENT

Example:
```json
"value": 3
```

---

## tickTiming

- Type: `string`
- Allowed: `START_OF_TURN`, `END_OF_TURN`, `IMMEDIATE`
- Default: `END_OF_TURN`

Example:
```json
"tickTiming": "END_OF_TURN"
```

---

# 7. Stack Object

Stacking configuration.

```json
"stack": {
  "stackable": true,
  "maxStack": 5,
  "refreshDuration": false
}
```

---

## stackable

- Type: `boolean`
- Default: false

Example:
```json
"stackable": true
```

---

## maxStack

- Type: `number`
- Required: Yes if stackable
- Min: 1

Example:
```json
"maxStack": 5
```

---

## refreshDuration

- Type: `boolean`
- Default: false

Example:
```json
"refreshDuration": false
```

---

# 8. Tick Object (DOT/HOT)

Tick configuration for DOT/HOT effects.

```json
"tick": {
  "enabled": true,
  "damage": {
    "multiplier": 0.1,
    "element": "fire",
    "type": "DOT"
  }
}
```

Hoặc

```json
"tick": {
  "enabled": true,
  "heal": {
    "multiplier": 0.05,
    "type": "HOT"
  }
}
```

---

## damage (for DOT)

```json
"damage": {
  "multiplier": 0.1,
  "element": "fire|ice|lightning|...",
  "type": "DOT",
  "penetration": 0
}
```

---

## heal (for HOT)

```json
"heal": {
  "multiplier": 0.05,
  "type": "HOT"
}
```

---

# 9. Conditions Array

Conditions for effect application.

```json
"conditions": [
  {
    "type": "HP_ABOVE",
    "value": 50
  },
  {
    "type": "NO_EFFECT",
    "effect": "IMMUNITY"
  }
]
```

---

## Condition Types

| Type | Example |
|------|---------|
| HP_ABOVE | `{ "value": 50 }` |
| HP_BELOW | `{ "value": 30 }` |
| HAS_EFFECT | `{ "effect": "BURN" }` |
| NO_EFFECT | `{ "effect": "IMMUNITY" }` |
| SHIELD_ACTIVE | |
| NO_DEBUFF | |
| TARGET_ALIVE | |
| TARGET_DEAD | |

---

# 10. Tags Array

Classification tags.

```json
"tags": ["fire", "debuff", "dot", "remove"]
```

Common tags:
```
fire, ice, lightning, poison, bleed
buff, debuff, dot, hot, control
remove, cleanse, purify
passive, trigger, active
rare, epic, legend
```

---

# 11. Metadata Object

Custom metadata.

```json
"metadata": {
  "icon": "burn.png",
  "animation": "burn_effect",
  "sound": "burn_sound.mp3",
  "color": "#FF6600",
  "author": "system",
  "version": "1.0"
}
```

---

# 12. Complete Examples

### Burn (DEBUFF + DOT)

```json
{
  "id": 20001,
  "code": "BURN",
  "name": "Burn",
  "description": "Gây Hỏa sát thương 10% ATK mỗi turn",
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
  "stack": {
    "stackable": true,
    "maxStack": 5,
    "refreshDuration": false
  },
  "tick": {
    "enabled": true,
    "damage": {
      "multiplier": 0.1,
      "element": "fire",
      "type": "DOT"
    }
  },
  "conditions": [],
  "tags": ["fire", "debuff", "dot", "remove"],
  "metadata": {
    "icon": "burn.png",
    "animation": "burn_effect"
  }
}
```

---

### Stun (CONTROL)

```json
{
  "id": 20101,
  "code": "STUN",
  "name": "Stun",
  "description": "Không thể hành động",
  "type": "CONTROL",
  "properties": {
    "potency": 100,
    "removable": true
  },
  "duration": {
    "type": "TURN",
    "value": 1,
    "tickTiming": "START_OF_TURN"
  },
  "stack": {
    "stackable": false,
    "maxStack": 1,
    "refreshDuration": true
  },
  "conditions": [],
  "tags": ["control", "debuff", "remove"],
  "metadata": {
    "icon": "stun.png"
  }
}
```

---

### Regeneration (HOT + BUFF)

```json
{
  "id": 20201,
  "code": "REGENERATION",
  "name": "Regeneration",
  "description": "Hồi 5% Max HP mỗi turn",
  "type": "HOT",
  "properties": {
    "potency": 100,
    "removable": true
  },
  "duration": {
    "type": "TURN",
    "value": 5,
    "tickTiming": "END_OF_TURN"
  },
  "stack": {
    "stackable": true,
    "maxStack": 3,
    "refreshDuration": false
  },
  "tick": {
    "enabled": true,
    "heal": {
      "multiplier": 0.05,
      "type": "HOT"
    }
  },
  "conditions": [],
  "tags": ["buff", "hot"],
  "metadata": {
    "icon": "regeneration.png"
  }
}
```

---

### Attack Buff (BUFF)

```json
{
  "id": 20301,
  "code": "ATK_BUFF",
  "name": "Attack Buff",
  "description": "Tăng công 20 điểm",
  "type": "BUFF",
  "properties": {
    "potency": 100,
    "removable": true,
    "statModifier": {
      "attribute": "ATK",
      "value": 20,
      "isPercentage": false
    }
  },
  "duration": {
    "type": "TURN",
    "value": 3,
    "tickTiming": "END_OF_TURN"
  },
  "stack": {
    "stackable": true,
    "maxStack": 5,
    "refreshDuration": false
  },
  "conditions": [],
  "tags": ["buff", "damage"],
  "metadata": {
    "icon": "atk_buff.png"
  }
}
```

---

### Immunity (PASSIVE)

```json
{
  "id": 20401,
  "code": "BURN_IMMUNITY",
  "name": "Burn Immunity",
  "description": "Miễn dịch Burn",
  "type": "IMMUNITY",
  "properties": {
    "potency": 100,
    "removable": false
  },
  "duration": {
    "type": "PERMANENT",
    "value": -1
  },
  "conditions": [],
  "tags": ["passive", "immunity"],
  "metadata": {
    "icon": "immunity.png"
  }
}
```

---

# 13. Versioning

JSON Schema được version.

```json
{
  "_schema_version": "1.0.0",
  "id": 20001,
  ...
}
```

Support upgrade từ version cũ → new.

---

# 14. Validation Rules

Schema validation:

- id: number, unique, 20001-29999
- code: string, unique, UPPERCASE_UNDERSCORE
- name: string, 1-100 char
- type: BUFF|DEBUFF|PASSIVE|DOT|HOT|CONTROL|SHIELD|IMMUNITY
- properties: object (required if type need)
- duration: object (required)
- stack: object (optional, default no stack)
- conditions: array (optional)
- tags: array (optional)
- metadata: object (optional)

---

# End Of File
