# 023_BATTLE_ENGINE.md

# Battle Engine

Version: 1.0.0

---

# 1. Purpose

BattleEngine là trung tâm điều phối trận đấu.

BattleEngine không chứa Gameplay Rule.

---

# 2. Dependency

BattleEngine sử dụng

```
BattleContext

TurnManager

SkillExecutor

FormulaEngine

EffectEngine

RandomProvider
```

Không sử dụng

```
Discord

Repository

Database

Redis
```

---

# 3. Battle Flow

```
Create Battle

↓

Initialize

↓

Battle Start

↓

Round Loop

↓

Turn Loop

↓

Execute Skill

↓

Apply Effect

↓

Victory Check

↓

Battle End

↓

Generate Result
```

---

# 4. Main Loop

```
while (Battle Running)

↓

Current Entity

↓

Tick Effect

↓

Select Skill

↓

Select Target

↓

Execute Skill

↓

Check Death

↓

Next Turn
```

---

# 5. Initialize

BattleEngine phải

- Clone BattleEntity
- Khởi tạo BattleContext
- Sinh Seed
- Khởi tạo BattleLog

---

# 6. Execute Turn

Một Turn gồm

```
Turn Start

↓

Effect Tick

↓

Skill Execute

↓

Cooldown Update

↓

Turn End
```

---

# 7. Execute Skill

BattleEngine chỉ gọi

```
SkillExecutor.execute()
```

Không biết Skill làm gì.

---

# 8. Damage

BattleEngine gọi

```
FormulaEngine.damage()
```

Không tính Damage.

---

# 9. Effect

BattleEngine gọi

```
EffectEngine

apply()

tick()

remove()
```

---

# 10. Death

Sau mỗi Action.

↓

Kiểm tra Entity chết.

↓

Nếu chết.

↓

Bỏ lượt.

---

# 11. Victory

Sau mỗi Turn.

↓

Kiểm tra

```
Player Team

Monster Team
```

Nếu một Team chết hết.

↓

Battle End.

---

# 12. Battle Result

Battle kết thúc.

↓

Sinh BattleResult.

BattleEngine không tính Reward.

---

# 13. Logging

BattleEngine ghi

BattleLog.

Không ghi Database.

---

# 14. Performance

BattleEngine

- Không query Database.
- Không đọc JSON.
- Không gọi Discord API.

Battle chỉ làm việc trên Memory.

---

# 15. Public API

```
start()

update()

executeTurn()

finish()
```

---

# 16. AI Instruction

BattleEngine chỉ điều phối.

Không viết Gameplay Rule.

Không viết Formula.

Không viết Effect.

Không viết Skill Logic.

---

# End Of File