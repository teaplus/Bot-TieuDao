# 018_FORMULA_ENGINE.md

# Formula Engine

Version: 1.0.0

---

# 1. Mục tiêu

Mọi công thức trong game phải đi qua Formula Engine.

Battle Engine không chứa công thức.

---

# 2. Triết lý

Battle Engine

↓

Formula Engine

↓

Result

---

# 3. Formula

Framework gồm

Damage Formula

Heal Formula

Burn Formula

Shield Formula

EXP Formula

Drop Formula

Cultivation Formula

---

# 4. Damage Formula

Theo

012_DAMAGE_SYSTEM

---

# 5. Heal Formula

Heal

=

Base Heal

×

(1+REG%)

---

# 6. Shield Formula

Shield

=

Base Shield

×

(1+SHD%)

---

# 7. Burn Formula

Burn

=

Current ATK

×

Burn Multiplier

---

# 8. Reflection Formula

Reflection

=

Final Damage

×

REF%

---

# 9. Lifesteal Formula

Heal

=

Damage To HP

×

LS%

Không tính Damage lên Shield.

---

# 10. Critical Formula

Random

↓

CRIT

↓

Damage

×

(1+CDMG%)

---

# 11. CC Formula

Final Chance

=

CC

×

(1-CCR%)

---

# 12. Formula Priority

Damage

↓

Shield

↓

HP

↓

Lifesteal

↓

Reflection

---

# 13. Extension

Có thể thêm

PvP Formula

Boss Formula

Event Formula

---

# 14. AI Rule

Battle Engine không chứa công thức.

Formula Engine là nơi duy nhất tính toán.

---

# End