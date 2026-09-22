# Monster Class

Version: 1.0.0

---

# 1. Purpose

Monster Class định nghĩa phân loại Monster theo tính chất.

Mỗi Monster Class có hành vi khác nhau.

MonsterAI dựa vào Class để quyết định.

---

# 2. Classification

Monster được chia theo Class.

## Melee

Chiến đấu gần.

- ATK cao, DEF vừa
- Skill tập trung vào tấn công
- AI: Approach target, attack

---

## Ranged

Chiến đấu xa.

- ATK cao, DEF thấp
- Skill tập trung vào sát thương từ xa
- AI: Keep distance, attack

---

## Tank

Phòng thủ.

- ATK thấp, DEF cao
- Skill tập trung vào bảo vệ
- AI: Draw aggro, reduce damage

---

## Healer

Chữa bệnh.

- ATK thấp, REG cao
- Skill tập trung vào heal
- AI: Heal ally when HP low

---

## Support

Hỗ trợ.

- ATK vừa, DEF vừa
- Skill tập trung vào buff/debuff
- AI: Buff ally, debuff enemy

---

## Caster

Phép sư.

- ATK cao (Magic), DEF thấp
- Skill tập trung vào sát thương phép
- AI: Casting damage spell

---

## Hybrid

Kết hợp.

- ATK vừa, DEF vừa
- Skill tập trung vào tấn công và hỗ trợ
- AI: Balance attack and support

---

# 3. Behavioral Pattern

Mỗi Class có hành vi pattern.

### Melee Pattern

```
Turn Start

→ Check HP < 30%

  Yes → Heal if can

  No → Check enemy distance

    Near → Attack

    Far → Approach
```

---

### Healer Pattern

```
Turn Start

→ Check ally HP

  Ally HP < 50%

    → Heal ally

  Ally HP > 50%

    → Check enemy

      → Attack or buff
```

---

### Caster Pattern

```
Turn Start

→ Check MP/Resource

  Enough

    → Cast spell

  Not enough

    → Basic attack
```

---

# 4. Stat Template

Mỗi Class có Stat template.

### Melee Template

```
HP: 100

ATK: 80

DEF: 50

SPD: 40
```

---

### Tank Template

```
HP: 150

ATK: 40

DEF: 100

SPD: 20
```

---

### Caster Template

```
HP: 60

ATK: 70

DEF: 30

SPD: 50
```

---

# 5. Skill Set

Mỗi Class có Skill Set típ.

### Melee Skill Set

- Basic Attack
- Slash (single damage)
- Heavy Blow (AOE damage)
- Bleed (DOT)

---

### Healer Skill Set

- Basic Attack
- Heal
- Regeneration (HOT)
- Protect (Shield)

---

### Support Skill Set

- Basic Attack
- Buff Ally
- Debuff Enemy
- Crowd Control

---

# 6. Weakness & Strength

Mỗi Class có điểm mạnh yếu.

### Melee

Strength: High damage, Fast attack

Weakness: Low defense, Low range

Counter: Kiting, Control

---

### Tank

Strength: High defense, Can tank

Weakness: Low damage, Slow

Counter: Ignore defense, Damage over time

---

### Caster

Strength: High magic damage, AOE

Weakness: Low HP, Low defense

Counter: Burst damage, Interrupt

---

# 7. Class in Battle

BattleEntity khởi tạo với Class.

```
monster = {
  definition: {...},
  class: "MELEE",
  stats: {...},
  behavior: {...}
}

MonsterAI sử dụng Class

→ AI Profile mặc định

→ Behavior Pattern

→ Skill priority
```

---

# 8. Multiclass

Một số Monster có multiple Class.

```
Hybrid Monster:

Primary Class: Melee

Secondary Class: Healer

→ Can attack AND heal

→ AI priority: Attack > Heal
```

---

# 9. Boss Class

Boss có Class riêng.

```
Boss Class:

Unique behavior

Custom skill set

Phase change

Complex AI
```

---

# 10. Summon Class

Summon có Class riêng.

```
Summon Class:

Temporary

Depend on caster

AI follow caster strategy

Duration-based
```

---

End Of File
