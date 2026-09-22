# Effect Definition

Version: 1.0.0

Status: LOCKED

---

# 1. Purpose

EffectDefinition là dữ liệu mô tả một Effect.

EffectDefinition không chứa code.

EffectDefinition không chứa Battle Logic.

EffectDefinition không biết:

- BattleEntity
- Battle
- Damage Calculation
- AI

EffectDefinition chỉ mô tả Effect.

---

# 2. Design Philosophy

Effect là Data.

Engine là Code.

```
effect.json

↓

EffectFactory

↓

EffectDefinition

↓

EffectEngine
```

Một Effect có thể được áp dụng bởi

- Skill
- Passive Skill
- Monster AI
- Trigger Event
- Item
- Talent

---

# 3. Structure

```
EffectDefinition

├── id

├── code

├── name

├── description

├── type

├── properties

├── stack

├── duration

├── tick

├── conditions

├── tags

└── metadata
```

---

# 4. Basic Information

## id

ID duy nhất.

Ví dụ

```
20001
```

Range: 20001-29999 (Effect IDs)

---

## code

Mã nội bộ.

Ví dụ

```
BURN

FREEZE

STUN

POISON

BLEED

WEAKNESS

REGENERATION

SHIELD_UP
```

Không được trùng.

---

## name

Tên hiển thị.

Ví dụ

```
Burn

Freeze

Stun
```

---

## description

Mô tả.

Chỉ phục vụ UI.

Không tham gia Gameplay.

Ví dụ

```
Gây 10% ATK sát thương mỗi turn trong 3 turn.
```

---

# 5. Type

Xác định loại Effect.

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

## BUFF

Tác động tích cực.

Ví dụ

- Tăng Công
- Tăng Máu
- Tăng Crit
- Hồi Shield

---

## DEBUFF

Tác động tiêu cực.

Ví dụ

- Giảm Công
- Burn
- Freeze
- Stun

---

## PASSIVE

Luôn có hiệu lực.

Không có Duration.

Ví dụ

- Reflection
- Lifesteal
- Evasion

---

## DOT

Damage Over Time.

Gây sát thương mỗi tick.

Ví dụ

- Burn
- Bleed
- Poison

---

## HOT

Heal Over Time.

Hồi máu mỗi tick.

Ví dụ

- Regeneration
- Life Link

---

## CONTROL

Kiểm soát Entity.

Ví dụ

- Stun (không hành động)
- Freeze (không di chuyển)
- Silence (không skill)

---

## SHIELD

Tạo khiên.

Ví dụ

- Barrier
- Protection

---

## IMMUNITY

Miễn dịch.

Ví dụ

- Burn Immunity
- Control Immunity

---

# 6. Properties

Effect Properties chứa các thuộc tính.

```
{
  "statModifier": {...},
  "resistance": 0,
  "potency": 100,
  "removable": true
}
```

---

## statModifier

Thay đổi Stat.

```
{
  "attribute": "ATK",
  "value": 20,
  "isPercentage": true
}
```

Hoặc

```
{
  "attribute": "BURN_DAMAGE",
  "value": 10,
  "isPercentage": false
}
```

---

## resistance

Khả năng kháng cự.

```
0 = không có kháng cự
50 = 50% chance reduce effect
100 = miễn dịch
```

---

## potency

Sức mạnh Effect.

```
0-100

Ảnh hưởng tới tính toán damage/heal/buff
```

---

## removable

Có thể bị remove không.

```
true = có thể remove
false = không thể remove (permanent)
```

---

# 7. Stack

Stack Configuration.

```
{
  "stackable": true,
  "maxStack": 5,
  "refreshDuration": false
}
```

---

## stackable

Có thể stack không.

```
true = có thể stack
false = chỉ 1 Effect
```

---

## maxStack

Số lượng stack tối đa.

```
Nếu vượt quá → stack cũ bị replace
```

---

## refreshDuration

Khi apply thêm Effect, có refresh Duration không.

```
true = reset duration
false = duration không thay đổi
```

---

# 8. Duration

Duration Configuration.

```
{
  "type": "TURN",
  "value": 3,
  "tickTiming": "END_OF_TURN"
}
```

---

## type

Loại Duration.

```
TURN = tính bằng turn
PERMANENT = không có duration
```

---

## value

Số turn.

```
3 = 3 turn
Nếu PERMANENT → value = -1
```

---

## tickTiming

Khi nào tick.

```
START_OF_TURN = đầu turn
END_OF_TURN = cuối turn
IMMEDIATE = ngay lập tức (nếu DOT)
```

---

# 9. Tick

Tick Configuration (cho DOT/HOT).

```
{
  "enabled": true,
  "damage": {
    "multiplier": 0.1,
    "type": "DOT"
  }
}
```

Hoặc

```
{
  "enabled": true,
  "heal": {
    "multiplier": 0.05,
    "type": "HOT"
  }
}
```

---

# 10. Conditions

Điều kiện áp dụng Effect.

```
"conditions": [
  {
    "type": "TARGET_HP_ABOVE",
    "value": 50
  },
  {
    "type": "NO_IMMUNITY",
    "immunity": "BURN_IMMUNITY"
  }
]
```

---

# 11. Tags

Phân loại Effect.

```
fire, ice, lightning, poison, bleed
buff, debuff, dot, hot, control
remove, cleanse, purify
```

Tag được sử dụng bởi

- Resistance
- Cleanse/Purify
- AI
- Achievement

---

# 12. Metadata

Không ảnh hưởng Gameplay.

```
{
  "icon": "burn.png",
  "animation": "burn_effect",
  "sound": "burn_sound.mp3",
  "color": "#FF6600",
  "author": "system"
}
```

---

# 13. Rule

EffectDefinition không được chứa

```
Caster Info

Target Info

Current HP

Current Shield

Damage Calculation

AI Logic

Random Values
```

Những dữ liệu trên thuộc

EffectEngine

hoặc

BattleEntity.

---

# 14. JSON Example

### Burn Effect (DEBUFF + DOT)

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
  "stack": {
    "stackable": true,
    "maxStack": 5,
    "refreshDuration": false
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
      "element": "fire",
      "type": "DOT"
    }
  },
  "conditions": [],
  "tags": ["fire", "debuff", "dot", "remove"],
  "metadata": {
    "icon": "burn.png"
  }
}
```

---

### Stun Effect (CONTROL)

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
  "stack": {
    "stackable": false,
    "maxStack": 1,
    "refreshDuration": true
  },
  "duration": {
    "type": "TURN",
    "value": 1,
    "tickTiming": "START_OF_TURN"
  },
  "conditions": [],
  "tags": ["control", "debuff", "remove"],
  "metadata": {
    "icon": "stun.png"
  }
}
```

---

### Regeneration (HOT BUFF)

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
  "stack": {
    "stackable": true,
    "maxStack": 3,
    "refreshDuration": false
  },
  "duration": {
    "type": "TURN",
    "value": 5,
    "tickTiming": "END_OF_TURN"
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

# 15. AI Instruction

EffectDefinition chỉ là Data.

Không viết Battle Logic.

Không viết Tick Logic.

Không viết Remove Logic.

EffectEngine là nơi thực thi.

---

# Version Status

Current Version

1.0.0

Status

LOCKED

---

# Future Note

Các nội dung sau không thuộc Version 1.

- Conditional Effects
- Chained Effects
- Effect Trigger
- Effect Combo
- Dynamic Potency

---

# End Of File
