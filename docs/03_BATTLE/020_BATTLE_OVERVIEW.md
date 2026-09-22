# 020_BATTLE_OVERVIEW.md

# Battle Framework Overview

Version: 1.0.0

---

# 1. Mục tiêu

Battle Framework là lõi của hệ thống chiến đấu.

Battle Framework chỉ chịu trách nhiệm điều phối trận đấu.

Battle Framework không chứa luật gameplay.

Battle Framework không biết:

- Công pháp
- Thiên phú
- Linh căn
- Môn phái
- Trang bị
- Buff
- Debuff

Battle Framework chỉ gọi các Engine tương ứng.

---

# 2. Design Philosophy

Battle Framework phải đơn giản.

Một trận đấu chỉ gồm

```
Battle

↓

Round

↓

Turn

↓

Action

↓

Result
```

Không xử lý:

- Animation
- Network
- Discord UI
- Database

---

# 3. Battle Architecture

```
                    BattleEngine
                         │
        ┌────────────────┼───────────────┐
        │                │               │
        ▼                ▼               ▼
 BattleContext      TurnManager    SkillExecutor
        │                                │
        │                                ▼
        │                         FormulaEngine
        │                                │
        ▼                                ▼
 RandomProvider                  EffectEngine
        │
        ▼
 BattleResult
```

Mỗi module chỉ làm một nhiệm vụ.

---

# 4. Core Modules

Framework gồm

```
BattleContext

BattleEntity

BattleEngine

TurnManager

SkillExecutor

FormulaEngine

EffectEngine

RandomProvider

BattleResult
```

Không thêm module nếu chưa cần.

---

# 5. Battle Lifecycle

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

Check Victory

↓

Battle End

↓

Generate Result
```

---

# 6. Battle Flow

Ví dụ

Player dùng kỹ năng.

```
Player

↓

SkillExecutor

↓

FormulaEngine

↓

Damage

↓

EffectEngine

↓

Apply Effect

↓

BattleResult
```

BattleEngine chỉ điều phối.

---

# 7. Turn Flow

Trong mỗi Turn.

```
Turn Start

↓

Tick Effect

↓

Select Skill

↓

Select Target

↓

Execute Skill

↓

Apply Damage

↓

Apply Effect

↓

Turn End
```

Nếu Entity chết trong Turn.

↓

Bỏ qua các Action còn lại.

---

# 8. Round Flow

```
Round Start

↓

Entity A

↓

Entity B

↓

Entity C

↓

Round End
```

Sau Round End.

↓

Bắt đầu Round mới.

---

# 9. BattleEntity

BattleEngine chỉ biết BattleEntity.

Không biết

```
Player

Monster

Boss

Pet
```

Tất cả đều là BattleEntity.

---

# 10. Skill Execution

BattleEngine không biết kỹ năng làm gì.

BattleEngine chỉ gọi

```
SkillExecutor.execute()
```

SkillExecutor đọc dữ liệu Skill và thực thi.

---

# 11. Damage Calculation

BattleEngine không tính Damage.

BattleEngine gọi

```
FormulaEngine.damage()
```

FormulaEngine chịu trách nhiệm:

- Damage
- Critical
- Burn
- Lifesteal
- Reflection
- Heal
- Shield

---

# 12. Effect Processing

BattleEngine không xử lý Burn.

BattleEngine không xử lý Freeze.

BattleEngine chỉ gọi

```
EffectEngine
```

EffectEngine tự quản lý:

- Apply
- Tick
- Remove

---

# 13. Random System

Mọi Random đều dùng

```
RandomProvider
```

Không sử dụng

```
Math.random()
```

---

# 14. Victory Rule

Battle kết thúc khi

```
Một Team không còn BattleEntity còn sống.
```

Không có hòa.

---

# 15. Replay

Battle Framework hỗ trợ

- Replay
- Debug
- Battle Log

Thông qua

```
BattleContext

Seed

BattleResult
```

---

# 16. Performance Goal

Battle Framework phải đáp ứng

- Không query Database trong Battle.
- Không đọc JSON trong Battle.
- Không gọi Discord API.

Toàn bộ dữ liệu phải được nạp trước khi Battle bắt đầu.

---

# 17. Module Responsibility

| Module | Trách nhiệm |
|---------|-------------|
| BattleEngine | Điều phối trận đấu |
| BattleContext | Lưu trạng thái Battle |
| BattleEntity | Đại diện một thực thể chiến đấu |
| TurnManager | Xác định lượt |
| SkillExecutor | Thực thi kỹ năng |
| FormulaEngine | Tính toán |
| EffectEngine | Buff / Debuff |
| RandomProvider | Sinh Random |
| BattleResult | Kết quả trận đấu |

---

# 18. Battle Principles

Battle Framework phải đảm bảo:

✓ Không Hardcode gameplay.

✓ Không biết Skill cụ thể.

✓ Không biết Monster cụ thể.

✓ Không biết Player cụ thể.

✓ Chỉ điều phối.

---

# 19. Future Extension

Framework hỗ trợ mở rộng:

- PvP
- World Boss
- Guild Boss
- Tower
- Endless Dungeon
- Raid

Không cần sửa BattleEngine.

---

# 20. AI Instruction

Khi sinh source code.

BattleEngine phải càng nhỏ càng tốt.

Mọi gameplay phải chuyển sang:

- FormulaEngine
- EffectEngine
- SkillExecutor

BattleEngine không được chứa Business Logic.

---

# End of File