# 030_COMBAT_RESULT.md

# Combat Result

Version: 1.0.0

---

# 1. Purpose

CombatResult là kết quả do FormulaEngine trả về.

FormulaEngine không cập nhật BattleEntity.

---

# 2. Structure

CombatResult

├── damage

├── hpDamage

├── shieldDamage

├── heal

├── critical

├── lifesteal

├── reflection

├── appliedEffects

└── metadata

---

# 3. Rule

BattleEntity.applyCombatResult()

là nơi duy nhất cập nhật

HP

Shield

Effect

---

# 4. AI Instruction

FormulaEngine luôn trả về CombatResult.

Không sửa BattleEntity trực tiếp.

---

# End Of File