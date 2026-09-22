# 025_SKILL_EXECUTOR.md

# Skill Executor

Version: 1.0.0

Status: LOCKED

---

# 1. Purpose

SkillExecutor chịu trách nhiệm thực thi một SkillDefinition.

SkillExecutor không quyết định Skill nào sẽ được sử dụng.

SkillExecutor không chứa Battle Logic.

SkillExecutor chỉ thực hiện các Action được mô tả trong SkillDefinition.

---

# 2. Responsibility

SkillExecutor chịu trách nhiệm

- Validate Skill
- Execute Action
- Gọi FormulaEngine
- Gọi EffectEngine
- Sinh CombatResult

SkillExecutor không

- Roll Skill
- Chọn Skill
- Tính Damage
- Quản lý Buff
- Quản lý Battle

---

# 3. Dependency

SkillExecutor sử dụng

```
SkillDefinition

↓

CombatContext

↓

FormulaEngine

↓

EffectEngine
```

Không phụ thuộc

```
BattleEngine

Discord

Database

Repository
```

---

# 4. Execution Flow

```
SkillDefinition

↓

Validate

↓

Load Actions

↓

Execute Action 1

↓

Execute Action 2

↓

...

↓

CombatResult

↓

Return
```

---

# 5. Input

SkillExecutor nhận

```
CombatContext

SkillDefinition
```

CombatContext gồm

```
Caster

Target

BattleContext

RandomProvider
```

---

# 6. Output

SkillExecutor luôn trả về

```
CombatResult
```

Không cập nhật BattleEntity.

Không sửa HP.

Không Apply Effect.

---

# 7. Execution Rule

SkillExecutor luôn thực hiện

```
actions[]
```

theo đúng thứ tự.

Ví dụ

```
Damage

↓

Burn

↓

Heal

↓

Shield
```

Không được thay đổi thứ tự.

---

# 8. Action Dispatch

Mỗi Action sẽ được chuyển tới Engine phù hợp.

Ví dụ

```
DAMAGE

↓

FormulaEngine

------------------

HEAL

↓

FormulaEngine

------------------

SHIELD

↓

FormulaEngine

------------------

APPLY_EFFECT

↓

EffectEngine

------------------

REMOVE_EFFECT

↓

EffectEngine
```

SkillExecutor không tự xử lý Action.

---

# 9. Formula Action

Các Action sau sử dụng FormulaEngine

```
DAMAGE

HEAL

SHIELD
```

FormulaEngine trả về

```
ActionResult
```

SkillExecutor thêm vào CombatResult.

---

# 10. Effect Action

Các Action sau sử dụng EffectEngine

```
APPLY_EFFECT

REMOVE_EFFECT

PURIFY

DISPEL
```

EffectEngine trả về

EffectResult.

---

# 11. Multi Target

Nếu Action có nhiều mục tiêu

Ví dụ

```
ALL_ENEMY
```

↓

Executor sẽ thực hiện Action cho từng BattleEntity.

CombatResult sẽ lưu kết quả của toàn bộ mục tiêu.

---

# 12. Error Handling

Nếu một Action thất bại

Ví dụ

```
Không có Target
```

↓

Bỏ qua Action.

↓

Tiếp tục Action tiếp theo.

Skill không bị hủy.

---

# 13. Invalid Skill

Nếu SkillDefinition không hợp lệ

↓

SkillExecutor trả về

```
CombatResult

status = FAILED
```

---

# 14. Public API

```
execute()

executeAction()

validate()

buildCombatResult()
```

---

# 15. Design Rule

SkillExecutor

Không biết

```
Fire Ball

Kiếm Trảm

Lôi Kiếp

Băng Phong
```

SkillExecutor chỉ biết

```
SkillDefinition

↓

Action
```

---

# 16. Sequence

```
SkillManager

↓

SkillExecutor

↓

Action Loop

↓

FormulaEngine

↓

EffectEngine

↓

CombatResult

↓

Return
```

---

# 17. Performance

SkillExecutor

Không đọc JSON.

Không query Database.

Không gọi Discord API.

Toàn bộ SkillDefinition phải được load trước Battle.

---

# 18. AI Instruction

SkillExecutor chỉ thực thi.

Không quyết định Skill.

Không tính Damage.

Không Apply HP.

Không Apply Shield.

Không Apply Buff.

Mọi Gameplay phải chuyển sang

FormulaEngine

EffectEngine

BattleEntity.applyCombatResult()

---

# Version Status

Current Version

1.0.0

Status

LOCKED

---

# Future Note

Các nội dung sau không thuộc Version 1.

- Combo Action
- Conditional Action
- Interrupt Action
- Parallel Action
- Nested Action
- Script Action

Không triển khai ở Version 1.

---

# End Of File