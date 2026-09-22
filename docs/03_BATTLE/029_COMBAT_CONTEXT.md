# 029_COMBAT_CONTEXT.md

# Combat Context

Version: 1.0.0

---

# 1. Purpose

CombatContext chứa toàn bộ dữ liệu cần thiết cho một lần tính toán chiến đấu.

FormulaEngine chỉ nhận CombatContext.

---

# 2. Structure

CombatContext

├── caster

├── target

├── skill

├── battleContext

├── randomProvider

├── currentRound

├── currentTurn

└── metadata

---

# 3. Rule

CombatContext chỉ tồn tại trong lúc thực thi Skill.

Không lưu Database.

Không Cache.

---

# 4. AI Instruction

Nếu FormulaEngine cần dữ liệu mới.

↓

Thêm vào CombatContext.

Không sửa API FormulaEngine.

---

# End Of File