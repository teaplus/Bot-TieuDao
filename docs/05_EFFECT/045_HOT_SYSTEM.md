# HOT System

Version: 1.0.0

---

# 1. Purpose

HOT (Heal Over Time) System định nghĩa cơ chế hồi máu mỗi turn.

HOT là loại Buff có tick heal.

EffectEngine quản lý tick logic.

---

# 2. Design Philosophy

HOT không hồi máu ngay khi apply.

HOT hồi máu tại mỗi turn end.

HOT có Duration, mỗi tick Duration - 1.

Khi Duration = 0 → remove HOT.

---

# 3. HOT Types

Framework hỗ trợ các loại HOT.

## Regeneration HOT

Hồi máu từ tự nhiên.

Ví dụ

```
Regeneration: 5% Max HP/turn
Natural Healing: 50 HP/turn
```

---

## Spell HOT

Hồi máu từ Spell.

Ví dụ

```
Healing Aura: 8% Max HP/turn
Life Link: 10% ATK/turn
```

---

## Special HOT

Hồi máu đặc biệt.

Ví dụ

```
Shield Regen: 5% Max Shield/turn
Recovery: Restore 1 status per turn
```

---

# 4. HOT Tick Timing

HOT tick tại mỗi turn.

```
Turn 1 Start
Turn 1 Action
Turn 1 End

↓

EffectEngine.tick()

↓

HOT Tick → Heal to Target

↓

Duration - 1

↓

If Duration = 0 → Remove
```

---

# 5. HOT Heal Calculation

HOT Heal được tính bởi FormulaEngine.

```
HOT Heal = Base Stat * Multiplier

Ví dụ:

Regeneration (multiplier = 0.05):

Target Max HP = 200

Regen Heal = 200 * 0.05 = 10 HP/turn
```

---

## Dynamic Calculation

HOT Heal có thể thay đổi theo Stat.

```
HOT Heal = Target Stat * Multiplier

Nếu Target Max HP tăng

→ HOT Heal tăng
```

---

# 6. HOT Stacking

Khi apply cùng loại HOT mấy lần.

```
Regen 1: 5% Max HP
+
Regen 2: 5% Max HP
=
Regen Stack 2: 10% Max HP

hoặc

Separate Regen 1, Regen 2, Regen 3 (mỗi cái tick riêng)
```

Stack Mode được định nghĩa trong EffectDefinition.

---

# 7. HOT Cap

HOT heal không vượt quá Max HP.

```
Target HP = 150 / 200

HOT tick: 20 HP

Target HP after heal = 150 + 20 = 170 (< 200, OK)

hoặc

Target HP = 190 / 200

HOT tick: 20 HP

Target HP after heal = 190 + 20 = 200 (cap at Max HP)
```

---

# 8. HOT Tick Order

Khi nhiều HOT cùng tick.

```
Turn End

↓

EffectEngine.tickAll()

↓

Sort HOT by priority

↓

Tick from highest to lowest priority
```

Priority

```
Important HOT > Normal HOT (tùy cấu hình)
```

---

# 9. HOT Interrupt

Khi Entity chết.

```
Entity HP = 0

↓

HOT stop ticking

↓

HOT removed
```

Hoặc nếu Entity được revive

→ HOT vẫn tích hoạt với Duration còn lại.

---

# 10. HOT Removal

HOT có thể bị remove bằng

```
Duration Expire

Manual Remove (REMOVE_EFFECT)

Dispel (DISPEL Action)

Cleanse Item/Skill

Replace by new HOT

Counter by Debuff
```

---

# 11. Example: Regeneration HOT Flow

```
Skill: Heal

↓

Action 1: HEAL (0.8x Stat)

Action 2: APPLY_EFFECT (Regeneration)

↓

EffectFactory.create()

↓

EffectDefinition {
  id: 20201,
  code: "REGENERATION",
  type: "HOT",
  duration: {value: 5},
  tick: {
    enabled: true,
    heal: {
      multiplier: 0.05,
      type: "HOT"
    }
  }
}

↓

EffectEngine.apply(REGEN to Target)

↓

Battle Tick:

Turn 1 End:
- Regen tick: 5% Max HP heal
- Duration: 5 → 4

Turn 2 End:
- Regen tick: 5% Max HP heal
- Duration: 4 → 3

Turn 3 End:
- Regen tick: 5% Max HP heal
- Duration: 3 → 2

Turn 4 End:
- Regen tick: 5% Max HP heal
- Duration: 2 → 1

Turn 5 End:
- Regen tick: 5% Max HP heal
- Duration: 1 → 0
- Regen removed
```

---

# 12. Multiple HOT

Entity có thể có nhiều HOT cùng lúc.

```
Target status:

Regeneration (5% Max HP)
Heal Aura (8% Max HP)
Life Link (10% ATK)

↓

Turn End tick:

Regen heal: 10 HP
Aura heal: 16 HP
Link heal: 10 HP
Total: 36 HP

↓

Each HOT track Duration independently
```

---

# 13. HOT Cascade

Khi HOT gây heal

↓

Có thể trigger Event.

Ví dụ

```
HOT tick heal

↓

Trigger "After Heal" Event

↓

Passive Skill check Event
```

---

# 14. Max HOT

Có thể giới hạn số HOT.

```
Max HOT on Entity: 10

Nếu vượt quá → oldest HOT bị remove

hoặc

Newest HOT không được áp dụng
```

---

# 15. HOT vs Immediate Heal

## HOT

Hồi máu mỗi turn trong Duration.

```
Duration: 5 turn

Heal per turn: 10 HP

Total heal: 50 HP (distributed over 5 turns)
```

---

## Immediate Heal

Hồi máu ngay.

```
HEAL Action

Heal: 50 HP ngay lập tức
```

---

# 16. AI Instruction

HOT System định nghĩa

"HOT hồi máu mỗi turn"

không định nghĩa

"Công thức tính hồi máu" (FormulaEngine)

"Khi nào apply HOT" (Skill/AI)

---

# End Of File
