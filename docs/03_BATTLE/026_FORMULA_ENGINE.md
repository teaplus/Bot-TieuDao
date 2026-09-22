# 026_FORMULA_ENGINE.md

# Formula Engine

Version: 1.0.0

---

# 1. Purpose

FormulaEngine chịu trách nhiệm tính toán toàn bộ chỉ số trong Battle.

BattleEngine không được tự tính.

---

# 2. Responsibility

FormulaEngine xử lý

- Damage
- Critical
- Burn
- Heal
- Shield
- Lifesteal
- Reflection

---

# 3. Damage Formula

Đánh thường

```
BaseDamage

=

ATK

-

DEF × (1-PEN%)
```

↓

```
Random

0.8~1.0
```

↓

Critical

↓

Shield

↓

HP

---

# 4. Skill Formula

```
BaseDamage

×

SkillMultiplier

×

(1+SKD%)
```

↓

Random

↓

Critical

---

# 5. Heal Formula

```
Heal

=

Base Heal

×

(1+REG%)
```

---

# 6. Shield Formula

```
Shield

=

Base Shield

×

(1+SHD%)
```

---

# 7. Burn Formula

```
Current ATK

×

Burn Multiplier
```

Không Crit.

---

# 8. Reflection Formula

```
Damage To HP

×

REF%
```

---

# 9. Lifesteal Formula

```
Damage To HP

×

LS%
```

Không tính Damage lên Shield.

---

# 10. Critical Formula

```
Roll CRIT

↓

Damage

×

(1+CDMG%)
```

---

# 11. Public API

```
damage()

heal()

shield()

burn()

lifesteal()

reflection()

critical()
```

---

# 12. Rule

FormulaEngine không sửa HP.

FormulaEngine chỉ trả về kết quả.

BattleEntity tự cập nhật HP.

---

# 13. AI Instruction

FormulaEngine chỉ tính toán.

Không cập nhật Battle State.

---

# End Of File