# 033_SKILL_MODEL.md

# Skill Model

Version: 1.0.0

Status: LOCKED

---

# 1. Purpose

SkillDefinition là dữ liệu mô tả một kỹ năng.

SkillDefinition không chứa code.

SkillDefinition không chứa Battle Logic.

SkillDefinition không biết:

- Player
- Monster
- Battle
- Damage
- Buff

SkillDefinition chỉ mô tả kỹ năng.

---

# 2. Design Philosophy

Skill là Data.

Executor là Code.

```
skill.json

↓

SkillFactory

↓

SkillDefinition

↓

SkillExecutor
```

Một Skill có thể được sử dụng bởi

- Player
- Monster
- Boss
- NPC
- Pet

---

# 3. Structure

```
SkillDefinition

├── id

├── code

├── name

├── description

├── activation

├── actions

├── tags

└── metadata
```

---

# 4. Basic Information

## id

ID duy nhất.

Ví dụ

```
10001
```

---

## code

Mã nội bộ.

Ví dụ

```
FIREBALL

ICE_SWORD

THUNDER_STRIKE
```

Không được trùng.

---

## name

Tên hiển thị.

Ví dụ

```
Hỏa Diễm Quyết
```

---

## description

Mô tả.

Chỉ phục vụ UI.

Không tham gia Gameplay.

---

# 5. Activation

Skill có ba loại.

```
ACTIVE

PASSIVE

TRIGGER
```

## ACTIVE

Được chọn khi tới lượt.

SkillManager quyết định.

---

## PASSIVE

Luôn tồn tại.

Có hiệu lực suốt Battle.

---

## TRIGGER

Kích hoạt khi Battle Event xảy ra.

Ví dụ

```
HP_BELOW

RECEIVE_DAMAGE

TURN_START
```

---

# 6. Actions

Skill gồm nhiều Action.

Ví dụ

```
Damage

↓

Apply Burn

↓

Heal Self
```

SkillExecutor luôn thực hiện theo đúng thứ tự.

Không giới hạn số lượng Action.

---

# 7. Tags

Skill có thể có nhiều Tag.

Ví dụ

```
FIRE

WOOD

EARTH

METAL

WATER

LIGHTNING

ICE

SWORD

AOE

ATTACK

CONTROL

DOT

BUFF

DEBUFF
```

Tag được sử dụng bởi

- Talent
- Spirit Root
- Sect
- Equipment
- Achievement

Không dùng để thực thi Skill.

---

# 8. Metadata

Không ảnh hưởng Gameplay.

Ví dụ

```
Icon

Animation

Sound

Author

Version

Note
```

---

# 9. Rule

SkillDefinition không được chứa

```
Weight

Cooldown

Qi

Mana

Damage

Target

BattleEntity

Current HP

Current Shield
```

Những dữ liệu trên thuộc

Battle

hoặc

BattleEntity.

---

# 10. JSON Example

```json
{
    "id":10001,

    "code":"FIREBALL",

    "name":"Hỏa Diễm Quyết",

    "description":"Gây sát thương Hỏa và có tỷ lệ gây Burn.",

    "activation":"ACTIVE",

    "actions":[

        {

            "type":"DAMAGE",

            "target":"ENEMY",

            "params":{

                "formula":"SKILL",

                "multiplier":1.8

            }

        },

        {

            "type":"APPLY_EFFECT",

            "target":"ENEMY",

            "params":{

                "effect":"BURN",

                "chance":30,

                "duration":2

            }

        }

    ],

    "tags":[

        "FIRE",

        "ATTACK"

    ],

    "metadata":{

    }

}
```

---

# 11. AI Instruction

SkillDefinition chỉ là Data.

Không viết Gameplay Logic.

Không viết Formula.

Không viết AI.

SkillExecutor là nơi thực thi.

---

# Version Status

Current Version

1.0.0

Status

LOCKED

---

# Future Note

Các nội dung sau không thuộc Version 1.

- Skill Evolution
- Skill Branch
- Dynamic Skill Level
- Localization Package
- Combo Skill

---

# End Of File