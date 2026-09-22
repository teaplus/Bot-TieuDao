# AI_CONTEXT.md

# AI Context

Version: 2.0.0

---

# Project

Discord Tu Tiên RPG

Turn-Based Battle Game

Node.js

JavaScript

Discord Bot

---

# Current Version

Version 1

---

# Current Phase

Data Framework

---

# Current Mission

Hoàn thiện Game Data.

Gameplay được mô tả hoàn toàn bằng JSON.

Sau khi Data ổn định.

↓

Regenerate Documentation.

↓

Sinh Source Code.

---

# Data Architecture

```
Excel

↓

Normalize

↓

Game Data (JSON)

↓

GameDataLoader

↓

GameDataRepository

↓

Runtime

↓

Battle
```

Runtime Data

```
Database

↓

Player

↓

Inventory

↓

Currency

↓

Quest

↓

Dungeon Progress
```

Gameplay Data và Runtime Data hoàn toàn tách biệt.

---

# Current Game Data

Gameplay hiện được chia thành các nhóm dữ liệu.

- Attributes
- Attribute Categories
- Elements
- Element Relations
- Effects
- Modifiers
- Realms
- Cultivation
- Talents
- Skills
- Equipment
- Sect
- Monster

Mỗi nhóm dữ liệu độc lập.

Không phụ thuộc Source Code.

---

# Single Source Of Truth

Gameplay chỉ tồn tại trong JSON.

JSON là nguồn dữ liệu duy nhất.

Markdown không phải Gameplay.

Markdown chỉ mô tả JSON.

Nếu Gameplay thay đổi.

↓

Update JSON.

↓

Regenerate Markdown.

Không sửa Gameplay trực tiếp trong Markdown.

---

# Runtime Data

Runtime lưu trong Database.

Bao gồm

- Player
- Inventory
- Currency
- Equipment đang mặc
- Quest
- Cooldown
- Statistics
- Dungeon Progress

Gameplay không lưu Database.

---

# Battle Architecture

```
BattleEngine

↓

TurnManager

↓

SkillManager

↓

SkillExecutor

↓

FormulaEngine

↓

CombatResult

↓

BattleEntity.applyCombatResult()

↓

EffectEngine

↓

BattleResult
```

---

# Core Principles

BattleEngine chỉ điều phối.

TurnManager quản lý lượt.

SkillManager quyết định Skill.

SkillExecutor thực thi Skill.

FormulaEngine chỉ tính toán.

EffectEngine chỉ quản lý Effect.

BattleEntity chỉ lưu Runtime State.

Gameplay không nằm trong Engine.

Gameplay nằm trong JSON.

---

# Data Driven Principles

Skill là Data.

Monster là Data.

Equipment là Data.

Sect là Data.

Modifier là Data.

Effect là Data.

Gameplay không Hardcode.

Không tạo class riêng cho từng Skill.

Không tạo class riêng cho từng Monster.

Không tạo class riêng cho từng Equipment.

---

# Current Skill Design

Skill Definition

↓

Action[]

↓

SkillExecutor

↓

CombatResult

Skill không có code.

Skill không có Cooldown.

Skill không có Mana.

Skill không có Qi.

Skill được chọn bằng Weight.

Weight thuộc BattleEntity.

Trigger Skill kích hoạt bằng Battle Event.

---

# Monster Design

Monster không có

- Grade
- Quality

Monster chỉ có

- Realm
- Element
- Variant
- Attack Skill
- Defense Skill
- AI

Monster Drop được mô tả bằng JSON.

---

# Equipment Design

Equipment gồm

- Type
- Grade
- Quality
- Required Realm
- Base Attribute
- Random Affix

Equipment hoàn toàn Data Driven.

---

# AI Working Rules

AI chỉ review Data.

AI chỉ báo lỗi Data.

AI không tự chuẩn hóa.

AI không tự redesign.

AI không thêm Gameplay.

Nếu phát hiện ý tưởng mới.

↓

Future Backlog.

Không triển khai.

---

# Current Goal

Hoàn thiện toàn bộ Game Data.

↓

Validate Data.

↓

Regenerate Documentation.

↓

Sinh Source Code.

---

# End Of File