# Debuff System

Version: 1.0.0

---

# 1. Purpose

Debuff System định nghĩa toàn bộ hệ thống Debuff.

Debuff là Effect có tác động tiêu cực.

EffectEngine quản lý vòng đời Debuff.

---

# 2. Design Philosophy

Debuff được áp dụng từ

```
Skill Action (APPLY_EFFECT)

Monster AI

Trigger Event

Passive Counter
```

Debuff ảnh hưởng tới hành động và Stat của Entity.

---

# 3. Debuff Types

Framework hỗ trợ các loại Debuff.

## Stat Debuff

Giảm Chỉ số.

Ví dụ

```
ATK -20

DEF -10

SPD -5

CRIT -10%
```

Calculation

```
Current ATK - 20

hoặc

Current ATK * (1 - 10%)
```

---

## Damage Over Time (DOT)

Gây sát thương mỗi turn.

Ví dụ

```
Burn: 10% ATK/turn

Poison: 5% ATK/turn

Bleed: 8% ATK/turn
```

Tick mỗi turn end.

---

## Crowd Control

Kiểm soát Entity.

Ví dụ

```
Stun: Không hành động

Freeze: Không di chuyển

Silence: Không sử dụng Skill
```

Control Effect thay đổi hành vi.

---

## Curse Debuff

Gây hiệu ứng tiêu cực.

Ví dụ

```
Weakness: Sát thương -20%

Vulnerability: Nhận sát thương +30%

Mute: Không thể hồi máu
```

---

# 4. Debuff Resistance

Entity có thể kháng Debuff.

```
CCR (Crowd Control Resistance): %

Ví dụ:

Stun chance 100%

Entity CCR: 30%

Actual chance: 100% - 30% = 70%
```

---

## Immunity Buff

Nếu Entity có Immunity Buff

↓

Debuff tương ứng không được áp dụng.

```
Entity has: Burn Immunity

↓

Apply Burn

↓

Burn rejected

↓

Immunity Buff remove (nếu cấu hình)
```

---

# 5. Debuff Stack

Debuff có thể stack.

### Stack Mode 1: Additive Damage

```
Burn 1: 10% ATK

+

Burn 2: 10% ATK

=

Total DOT: 20% ATK
```

### Stack Mode 2: Refresh Duration

```
Burn 1: 3 turn (10% ATK)

+

Burn 2: 2 turn (10% ATK)

refreshDuration = true

Result: 2 turn (10% ATK)
```

### Stack Mode 3: Increase Potency

```
Burn 1: Potency 100

+

Burn 2: Potency 100

maxStack = 3

Result: Potency 200 (or effect stacked)
```

---

# 6. Debuff Duration

Debuff có Duration.

Khi Duration hết

↓

Debuff tự động remove.

---

# 7. Debuff Tick

Nếu Debuff là DOT

↓

Mỗi Turn End tick sẽ

- Gây sát thương
- Duration - 1
- Nếu duration = 0 → remove

---

# 8. Remove Debuff

Debuff có thể bị remove bằng

```
Duration Expire

Manual Remove

Purify (PURIFY Action)

Cleanse Self (Item/Skill)

Replace by new Debuff

Immunity Buff reflect
```

---

## Purify

Loại bỏ tất cả Debuff.

```
Entity has:

Debuff A (Burn)

Debuff B (Poison)

Debuff C (Weakness)

↓

Purify

↓

Tất cả Debuff removed
```

---

## Selective Remove

Loại bỏ Debuff theo Tag.

```
Entity has:

Debuff A (tag: fire, DOT)

Debuff B (tag: poison, DOT)

Debuff C (tag: control, Stun)

↓

Remove (tag: fire)

↓

Debuff A removed

Debuff B, C remains
```

---

# 9. Debuff Conflict

Nếu apply cùng lúc nhiều Debuff

↓

EffectEngine quyết định thứ tự.

Ưu tiên

```
Crowd Control > DOT > Stat Debuff
```

---

# 10. Debuff Cascade

Khi apply Debuff

↓

Có thể trigger Event.

Ví dụ

```
Apply Stun

↓

Trigger "Stunned" Event

↓

Passive Skill check Event
```

---

# 11. Debuff Condition

Debuff có thể chỉ áp dụng khi đủ điều kiện.

```
conditions: [
  {
    "type": "TARGET_HP_BELOW",
    "value": 50
  },
  {
    "type": "NO_DEBUFF",
    "debuff": "IMMUNITY"
  }
]
```

Nếu điều kiện không thỏa

↓

Debuff không được áp dụng

---

# 12. Stat Debuff Calculation

Stat Debuff giảm Stat.

```
Formula:

Current Stat = Base Stat + All Buffs - All Debuffs + Modifier

Ví dụ:

Base ATK = 100

Buff ATK +20

Debuff ATK -10

Result = 100 + 20 - 10 = 110
```

---

# 13. Control Debuff Impact

Control Debuff thay đổi hành vi.

## Stun

Không thể hành động.

```
Turn Start

Entity stunned?

→ Yes → Skip Turn → Turn End

→ No → Normal Action
```

---

## Freeze

Không thể di chuyển.

```
Skill targeting (SELF, ALLY, ENEMY)?

Freeze không ảnh hưởng → Vẫn có thể hành động

Nhưng không thể chọn di chuyển target?

(Nếu game có di chuyển)
```

---

## Silence

Không thể sử dụng Skill.

```
Skill Selection

Silence active?

→ Yes → Only Basic Attack

→ No → Active Skill or Basic Attack
```

---

# 14. Example: Complete Debuff Flow

```
Skill: Poison Strike

↓

Action: DAMAGE

↓

Action: APPLY_EFFECT (Poison)

↓

Chance check: 60%

Roll: 50 → success

↓

EffectFactory.create()

↓

EffectDefinition {
  code: "POISON",
  type: "DOT",
  duration: {value: 3},
  tick: {damage: {multiplier: 0.05}}
}

↓

EffectEngine.apply()

↓

Check Resistance (CCR)

Check Condition → OK

Check Immunity → No poison immunity

Apply to Target

↓

Target.debuffs.push(Effect)

↓

Battle tick:

Turn 1: Poison Active, Tick 5% ATK damage, Duration = 2
Turn 2: Poison Active, Tick 5% ATK damage, Duration = 1
Turn 3: Poison Active, Tick 5% ATK damage, Duration = 0 → Remove
```

---

# 15. Debuff Cap

Có thể giới hạn Debuff.

```
Max Debuff: 10

Nếu vượt quá → Debuff cũ bị replace

hoặc

Debuff mới không được áp dụng
```

Debuff Cap được định nghĩa trong BattleConfig.

---

# 16. Dispel vs Purify

## Dispel

Loại bỏ Buff (tích cực).

```
Skill Action: DISPEL

↓

Remove all Buffs
```

---

## Purify

Loại bỏ Debuff (tiêu cực).

```
Skill Action: PURIFY

↓

Remove all Debuffs
```

---

# 17. Priority

Khi xảy ra conflict

Debuff Priority

```
1. Crowd Control (highest)
2. DOT
3. Stat Debuff (lowest)
```

---

# 18. AI Instruction

Debuff System định nghĩa

"Debuff làm gì"

không định nghĩa

"Khi nào apply Debuff"

Khi nào apply được định nghĩa trong

Skill

Monster AI

Trigger

---

# End Of File
