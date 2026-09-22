# Buff System

Version: 1.0.0

---

# 1. Purpose

Buff System định nghĩa toàn bộ hệ thống Buff.

Buff là Effect có tác động tích cực.

EffectEngine quản lý vòng đời Buff.

---

# 2. Design Philosophy

Buff không tự apply.

Buff được trigger bởi

```
Skill Action (APPLY_EFFECT)

Passive Skill

Trigger Event

Item
```

---

# 3. Buff Types

Framework hỗ trợ các loại Buff.

## Stat Buff

Tăng Chỉ số.

Ví dụ

```
ATK +20

DEF +10

SPD +5

CRIT +10%
```

Calculation

```
Current ATK + 20

hoặc

Current ATK * (1 + 10%)
```

---

## Shield Buff

Tạo khiên.

Ví dụ

```
Shield +100

Shield +10% Max HP
```

Absorb damage khi bị tấn công.

---

## Regeneration Buff

Hồi máu mỗi turn (HOT).

Ví dụ

```
Regen 5% Max HP/turn

Regen 50 HP/turn
```

---

## Status Buff

Thay đổi trạng thái.

Ví dụ

```
Evasion +20%

Lifesteal +10%

Reflection +15%
```

---

## Immunity Buff

Miễn dịch hiệu ứng.

Ví dụ

```
Burn Immunity

Control Immunity

Debuff Immunity
```

Khi có Immunity → Effect tương ứng không được áp dụng.

---

# 4. Buff Stack

Buff có thể stack.

### Stack Mode 1: Additive

```
ATK Buff 1: +20

+

ATK Buff 2: +20

=

ATK Total: +40
```

### Stack Mode 2: Multiplicative

```
ATK Buff 1: +20%

×

ATK Buff 2: +10%

=

ATK Total: ×1.32 (1.2 * 1.1)
```

### Stack Mode 3: Replace

```
Old: Burn 3 turn (10% ATK)

New: Burn 2 turn (15% ATK)

Result: Burn 2 turn (15% ATK)
```

Stack Mode được định nghĩa trong EffectDefinition.

---

# 5. Buff Duration

Buff có Duration.

Khi Duration hết

↓

Buff tự động remove.

```
Turn 1: Buff Active

Turn 2: Buff Active

Turn 3: Buff Tick → Duration - 1 → Duration = 0 → Remove
```

---

# 6. Buff Tick

Nếu Buff là HOT

↓

Mỗi Turn End tick sẽ

- Heal target
- Duration - 1
- Nếu duration = 0 → remove

---

# 7. Refresh Buff

Khi apply Buff mới tương tự

↓

Có thể refresh Duration.

```
Old: ATK +20 (2 turn còn lại)

New: ATK +20 (3 turn)

refreshDuration = true

Result: ATK +20 (3 turn)
```

---

## refreshDuration = false

```
Old: ATK +20 (2 turn)

New: ATK +20 (3 turn)

Result: 2 Buff ATK +20 (2 turn), 1 Buff ATK +20 (3 turn)
```

---

# 8. Remove Buff

Buff có thể bị remove bằng

```
Duration Expire

Manual Remove

Cleanse (DISPEL Action)

Replace by new Buff

Immunity (reflect)
```

---

## Cleanse

Loại bỏ tất cả Buff.

```
Entity has:

Buff A (ATK +20)

Buff B (DEF +10)

Buff C (Regen)

↓

Cleanse

↓

Tất cả Buff removed
```

---

## Selective Remove

Loại bỏ Buff theo Tag.

```
Entity has:

Buff A (tag: fire)

Buff B (tag: ice)

Buff C (tag: control)

↓

Remove (tag: fire)

↓

Buff A removed

Buff B, C remains
```

---

# 9. Buff Conflict

Nếu apply cùng lúc nhiều Buff

↓

EffectEngine quyết định thứ tự.

---

# 10. Buff Cascade

Khi apply Buff

↓

Có thể trigger Event.

Ví dụ

```
Apply Shield Buff

↓

Trigger "Shield Active" Event

↓

Passive Skill check Event
```

---

# 11. Buff Condition

Buff có thể chỉ áp dụng khi đủ điều kiện.

```
conditions: [
  {
    "type": "TARGET_HP_ABOVE",
    "value": 50
  }
]
```

Nếu điều kiện không thỏa

↓

Buff không được áp dụng

---

# 12. Stat Buff Calculation

Stat Buff ảnh hưởng tới Stat.

```
Formula:

Current Stat = Base Stat + All Stat Buffs + Modifier

Ví dụ:

Base ATK = 100

Buff ATK +20

Buff ATK +10%

Result = 100 + 20 + (100 * 10%) = 130
```

---

# 13. Shield Buff Calculation

Shield Buff tạo khiên.

```
Shield = Buff Value

Khi nhận Damage:

Damage Priority:

1. Reduce Shield first
2. Nếu Shield = 0 → Reduce HP
3. Nếu Shield > Damage → Shield - Damage, HP không thay đổi
4. Nếu Shield < Damage → Shield = 0, HP - (Damage - Shield)
```

---

# 14. Passive Buff

Passive Skill có thể apply Buff.

```
Passive Skill: Bloodlust

↓

Apply Buff: ATK +30% (khi HP < 50%)

↓

Luôn Active trong Battle
```

Passive Buff không tick, không có duration.

---

# 15. Example: Complete Buff Flow

```
Skill: Power Strike

↓

Action: DAMAGE

↓

Action: APPLY_EFFECT (ATK +20)

↓

EffectFactory.create()

↓

EffectDefinition {
  code: "ATK_BUFF_20",
  type: "BUFF",
  properties: {statModifier: {attribute: "ATK", value: 20}},
  duration: {value: 3, type: "TURN"}
}

↓

EffectEngine.apply()

↓

Check Condition → OK

Check Resistance → No resistance

Apply to Target

↓

Target.buffs.push(Effect)

↓

Battle tick:

Turn 1: Buff Active, Duration = 2
Turn 2: Buff Active, Duration = 1
Turn 3: Buff Active, Duration = 0 → Remove
```

---

# 16. Buff Cap

Có thể giới hạn Buff.

```
Max Buff: 10

Nếu vượt quá → Buff cũ bị replace

hoặc

Buff mới không được áp dụng
```

Buff Cap được định nghĩa trong BattleConfig.

---

# 17. AI Instruction

Buff System định nghĩa

"Buff làm gì"

không định nghĩa

"Khi nào apply Buff"

Khi nào apply được định nghĩa trong

Skill

Passive Skill

Trigger

---

# End Of File
