# Monster Framework Overview

Version: 1.0.0

---

# 1. Purpose

Monster Framework định nghĩa toàn bộ hệ thống Monster trong Battle.

Monster Framework được thiết kế theo hướng Data Driven.

Monster chỉ là dữ liệu + AI.

MonsterEngine chịu trách nhiệm quản lý.

---

# 2. Design Philosophy

Monster không chứa hardcode.

Monster chỉ mô tả:

- Monster là gì
- Monster có kỹ năng gì
- Monster hành động như thế nào

MonsterFactory tạo Monster từ JSON.

MonsterAI quyết định hành động.

BattleEngine điều phối.

---

# 3. Monster Architecture

```
monster.json (Data)

↓

MonsterFactory (Parse & Validate)

↓

MonsterDefinition (Model)

↓

BattleEntity

↓

MonsterAI (Behavior)

↓

Battle Action
```

---

# 4. Monster Categories

Framework chia Monster thành các nhóm.

## Normal Monster

Quái thường.

HP thấp, Damage thấp.

Dùng để grind.

---

## Elite Monster

Quái mạnh.

HP cao, Damage cao.

Boss của một map.

---

## Boss

Trùm lớn.

HP rất cao, Damage rất cao.

Kỹ năng đặc biệt.

---

## World Boss

Trùm thế giới.

HP cực cao, Damage cực cao.

Multiple phase.

Cần team để chiến.

---

## Summon

Quái triệu hồi.

Từ Skill hoặc Passive.

Temporary (có duration).

---

# 5. Monster Attributes

Monster có đầy đủ Attribute.

```
Core: HP, ATK, DEF, SPD

Combat: CRIT, CDMG, PEN, SKD, LS, REF

Defense: SHD, REG, CCR

Effect: ...

Special: ...
```

---

# 6. Monster Skills

Mỗi Monster có:

```
Basic Attack

Active Skills

Passive Skills

Trigger Skills
```

Kỹ năng định nghĩa trong MonsterDefinition.

SkillManager quản lý.

---

# 7. Monster AI

Mỗi Monster có AI.

```
AI Profile: Aggressive, Defensive, Balanced, Tactical, ...

AI Behavior: Attack, Heal, Buff, Control, ...

AI Logic: Decision making
```

MonsterAI tính toán hành động.

TurnManager thực thi.

---

# 8. Monster Loot

Khi Monster chết.

```
Drop Item

Drop Gold

Drop Experience

Reward Event
```

Loot được định nghĩa trong MonsterDefinition.

---

# 9. Monster Spawn

Monster có thể spawn.

```
Một lần (quête)

Vô hạn (respawn)

Giờ cụ thể (spawner)

Event (boss event)
```

---

# 10. Data Driven

Không tạo class riêng cho từng Monster.

Mọi Monster được định nghĩa bằng JSON.

MonsterFactory parse JSON.

MonsterAI thực thi hành động.

---

# 11. Monster Types

Framework hỗ trợ.

```
Common

Elite

Boss

World Boss

Summon
```

Mỗi type có hành vi khác.

---

# 12. Complete Workflow

```
monster.json (Data)

↓

MonsterFactory.create()

↓

MonsterDefinition (Model)

↓

BattleEntity (State)

↓

MonsterAI.decide() (Behavior)

↓

Skill Selection

↓

Skill Execution

↓

Result
```

---

End Of File
