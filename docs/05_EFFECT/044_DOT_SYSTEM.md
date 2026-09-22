# DOT System

Version: 1.0.0

---

# 1. Purpose

DOT (Damage Over Time) System định nghĩa cơ chế gây sát thương mỗi turn.

DOT là loại Debuff có tick damage.

EffectEngine quản lý tick logic.

---

# 2. Design Philosophy

DOT không gây sát thương ngay khi apply.

DOT gây sát thương tại mỗi turn end.

DOT có Duration, mỗi tick Duration - 1.

Khi Duration = 0 → remove DOT.

---

# 3. DOT Types

Framework hỗ trợ các loại DOT.

## Elemental DOT

Gây sát thương theo nguyên tố.

Ví dụ

```
Burn: 10% ATK Hỏa damage
Poison: 5% ATK Độc damage
Bleed: 8% ATK Vật lý damage
```

---

## Curse DOT

Gây sát thương từ Curse.

Ví dụ

```
Soul Drain: 15% Max HP
Death Wound: 20% ATK
```

---

# 4. DOT Tick Timing

DOT tick tại mỗi turn.

```
Turn 1 Start
Turn 1 Action
Turn 1 End

↓

EffectEngine.tick()

↓

DOT Tick → Damage to Target

↓

Duration - 1

↓

If Duration = 0 → Remove
```

---

# 5. DOT Damage Calculation

DOT Damage được tính bởi FormulaEngine.

```
DOT Damage = Base Stat * Multiplier

Ví dụ:

Burn DOT (multiplier = 0.1):

Target ATK = 100

Burn Damage = 100 * 0.1 = 10 HP/turn
```

---

## Dynamic Calculation

DOT Damage có thể thay đổi theo Stat.

```
Burn Damage = Target ATK * Potency / 100

Nếu Target ATK tăng

→ Burn Damage tăng
```

---

# 6. DOT Stacking

Khi apply cùng loại DOT mấy lần.

```
Burn 1: 10% ATK
+
Burn 2: 10% ATK
=
Burn Stack 2: 20% ATK

hoặc

Separate Burn 1, Burn 2, Burn 3 (mỗi cái tick riêng)
```

Stack Mode được định nghĩa trong EffectDefinition.

---

# 7. DOT Resistance

Entity có thể kháng DOT.

```
Fire Resistance: 30%

→ Burn damage × (1 - 30%) = 70% damage

hoặc

Element Resistance (tùy Element)
```

---

# 8. DOT Tick Order

Khi nhiều DOT cùng tick.

```
Turn End

↓

EffectEngine.tickAll()

↓

Sort DOT by priority

↓

Tick from highest to lowest priority
```

Priority

```
Fire DOT > Poison DOT > Bleed DOT (tùy cấu hình)
```

---

# 9. DOT Interrupt

Khi Entity chết.

```
Entity HP = 0

↓

DOT stop ticking

↓

DOT removed
```

---

# 10. DOT Removal

DOT có thể bị remove bằng

```
Duration Expire

Manual Remove (REMOVE_EFFECT)

Purify (PURIFY Action)

Cleanse Item/Skill

Replace by new DOT

Immunity Buff reflect
```

---

# 11. Example: Burn DOT Flow

```
Skill: Fireball

↓

Action 1: DAMAGE (1.5x ATK Hỏa)

Action 2: APPLY_EFFECT (Burn, 60% chance)

↓

Chance check: 60%

Roll: 45 → success

↓

EffectFactory.create()

↓

EffectDefinition {
  id: 20001,
  code: "BURN",
  type: "DOT",
  duration: {value: 3},
  tick: {
    enabled: true,
    damage: {
      multiplier: 0.1,
      element: "fire"
    }
  }
}

↓

EffectEngine.apply(BURN to Target)

↓

Battle Tick:

Turn 1 End:
- Burn tick: 10% ATK damage
- Duration: 3 → 2

Turn 2 End:
- Burn tick: 10% ATK damage
- Duration: 2 → 1

Turn 3 End:
- Burn tick: 10% ATK damage
- Duration: 1 → 0
- Burn removed
```

---

# 12. Multiple DOT

Entity có thể bị nhiều DOT cùng lúc.

```
Target status:

Burn (10% ATK)
Poison (5% ATK)
Bleed (8% ATK)

↓

Turn End tick:

Burn damage: 10 HP
Poison damage: 5 HP
Bleed damage: 8 HP
Total: 23 HP

↓

Each DOT track Duration independently
```

---

# 13. DOT Cascade

Khi DOT gây sát thương

↓

Có thể trigger Event.

Ví dụ

```
Burn tick damage

↓

Trigger "After Damage" Event

↓

Passive Skill check Event
```

---

# 14. Max DOT

Có thể giới hạn số DOT.

```
Max DOT on Entity: 10

Nếu vượt quá → oldest DOT bị remove

hoặc

Newest DOT không được áp dụng
```

---

# 15. AI Instruction

DOT System định nghĩa

"DOT gây sát thương mỗi turn"

không định nghĩa

"Công thức tính sát thương" (FormulaEngine)

"Khi nào apply DOT" (Skill/AI)

---

# End Of File
