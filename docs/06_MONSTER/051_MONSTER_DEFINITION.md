# Monster Definition

Version: 1.0.0

Status: LOCKED

---

# 1. Purpose

MonsterDefinition là dữ liệu mô tả một Monster.

MonsterDefinition không chứa code.

MonsterDefinition không chứa Battle Logic.

MonsterDefinition không biết:

- Player
- Battle
- Damage
- AI

MonsterDefinition chỉ mô tả Monster.

---

# 2. Design Philosophy

Monster là Data.

AI là Code.

```
monster.json

↓

MonsterFactory

↓

MonsterDefinition

↓

MonsterAI
```

Một Monster Definition có thể spawn

- 1 lần
- Nhiều lần
- Vô hạn

---

# 3. Structure

```
MonsterDefinition

├── id

├── code

├── name

├── description

├── type

├── attributes

├── skills

├── loot

├── ai

├── tags

└── metadata
```

---

# 4. Basic Information

## id

ID duy nhất.

Ví dụ

```
30001
```

Range: 30001-39999 (Monster IDs)

---

## code

Mã nội bộ.

Ví dụ

```
SKELETON

ORC

DRAGON

BOSS_DEMON
```

Không được trùng.

---

## name

Tên hiển thị.

Ví dụ

```
Skeleton Warrior

Orc Shaman

Fire Dragon
```

---

## description

Mô tả.

Chỉ phục vụ UI.

Không tham gia Gameplay.

---

## type

Loại Monster.

```
COMMON

ELITE

BOSS

WORLD_BOSS

SUMMON
```

---

# 5. Attributes

Monster Attributes.

```
hp: 100

atk: 50

def: 20

spd: 30

crit: 10

cdmg: 50

pen: 0

skd: 0

ls: 0

ref: 0

shd: 0

reg: 0

ccr: 0

...
```

---

# 6. Skills

Monster Skills.

```
skills: {
  basic: "BASIC_ATTACK",
  
  active: [
    "FIREBALL",
    "ICE_SWORD",
    "HEAL"
  ],
  
  passive: [
    "BLOODLUST",
    "REGENERATION"
  ],
  
  trigger: [
    {
      skill: "COUNTER",
      event: "AFTER_ATTACK"
    }
  ]
}
```

---

# 7. Loot

Monster Loot.

```
loot: {
  gold: {
    min: 100,
    max: 200
  },
  
  exp: 1000,
  
  items: [
    {
      code: "SWORD_01",
      chance: 10
    },
    {
      code: "ARMOR_01",
      chance: 5
    }
  ]
}
```

---

# 8. AI Profile

Monster AI Profile.

```
ai: {
  profile: "AGGRESSIVE",
  
  behavior: [
    "ATTACK",
    "DAMAGE_DEALER"
  ],
  
  skills: {
    priority: ["FIREBALL", "ICE_SWORD", "HEAL"],
    conditions: {...}
  }
}
```

---

# 9. Tags

Phân loại Monster.

```
fire, ice, undead, demon, humanoid

elite, boss, rare

flying, ground, aquatic
```

---

# 10. Metadata

Không ảnh hưởng Gameplay.

```
{
  "icon": "skeleton.png",
  "animation": "skeleton_anim",
  "sound": "skeleton_sound.mp3",
  "author": "system"
}
```

---

# 11. Rule

MonsterDefinition không được chứa

```
Current HP

Weight

Battle State

AI Decision

Random Values

Damage Calculation

Player Info
```

Những dữ liệu trên thuộc

BattleEntity

hoặc

MonsterAI.

---

# 12. JSON Example

```json
{
  "id": 30001,
  "code": "SKELETON",
  "name": "Skeleton Warrior",
  "description": "Chiến binh bộ xương",
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

# 13. AI Instruction

MonsterDefinition chỉ là Data.

Không viết AI Logic.

Không viết Battle Logic.

MonsterAI là nơi thực thi.

---

# Version Status

Current Version

1.0.0

Status

LOCKED

---

# End Of File
