# PROJECT_ROADMAP.md

# Discord Tu Tiên RPG

Master Roadmap

Version 1.0.0

---

# Overview

Tài liệu này mô tả toàn bộ lộ trình phát triển của dự án.

Đây là Roadmap chính thức.

PROJECT_TODO.md chỉ mô tả Sprint hiện tại.

PROJECT_ROADMAP.md mô tả toàn bộ vòng đời dự án.

---

# Legend

| Status | Meaning |
|----------|---------|
| ⬜ | Todo |
| 🟢 | In Progress |
| 🟡 | Review |
| ✅ | Complete |
| 🔒 | Locked |

---

# Phase 0

Foundation

Status

🔒 LOCKED

Documents

```
000 - 009
```

Goal

- Kiến trúc
- Coding Standard
- Folder Structure
- Roadmap
- Glossary

Deliverables

- Foundation hoàn chỉnh

---

# Phase 1

Gameplay Rule

Status

🔒 LOCKED

Documents

```
010 - 019
```

Goal

Thiết kế toàn bộ Gameplay Rule.

Bao gồm

- Attribute
- Modifier
- Formula
- Effect
- Battle Stat

Deliverables

Gameplay Framework.

---

# Phase 2

Battle Framework

Status

🟡 REVIEW

Documents

```
020 - 031
```

Goal

Thiết kế Battle Engine.

Bao gồm

- BattleEngine
- TurnManager
- SkillExecutor
- FormulaEngine
- EffectEngine
- CombatContext
- CombatResult

Deliverables

Battle Framework Version 1.

---

# Phase 3

Skill Framework

Status

� LOCKED

Documents

```
032 - 039
```

Goal

Thiết kế Data Driven Skill System.

Bao gồm

- SkillDefinition
- Action
- Trigger
- SkillManager
- SkillFactory
- JSON Specification

Deliverables

Skill Framework Version 1 - COMPLETE

Review: PHASE3_REVIEW.md

---

# Phase 4

Effect Framework

Status

🔒 LOCKED

Documents

```
040 - 049
```

Goal

Thiết kế toàn bộ Buff Debuff System.

Bao gồm

- Effect
- Buff
- Debuff
- DOT
- HOT
- Control
- Effect Factory

Deliverables

Effect Framework Version 1 - COMPLETE

Review: PHASE4_REVIEW.md

---

# Phase 5

Monster Framework

Status

🔒 LOCKED

Documents

```
050 - 059
```

Goal

Thiết kế Monster System.

Bao gồm

- Monster
- Boss
- World Boss
- Monster AI
- Summon
- Monster Factory

Deliverables

Monster Framework Version 1 - COMPLETE

Review: PHASE5_REVIEW.md

---

# Phase 6

Player Framework

Status

⬜ TODO

Documents

```
060 - 069
```

Goal

Thiết kế Player.

Bao gồm

- Cultivation
- Spirit Root
- Talent
- Sect
- Equipment
- Inventory

Deliverables

Player Framework.

---

# Phase 7

Item Framework

Status

⬜ TODO

Documents

```
070 - 079
```

Goal

Thiết kế Item.

Bao gồm

- Weapon
- Armor
- Ring
- Consumable
- Material
- Artifact

Deliverables

Item Framework.

---

# Phase 8

Dungeon Framework

Status

⬜ TODO

Documents

```
080 - 089
```

Goal

Thiết kế PvE.

Bao gồm

- Dungeon
- Stage
- Wave
- Reward
- Drop
- Loot

Deliverables

Dungeon Framework.

---

# Phase 9

Content Framework

Status

⬜ TODO

Documents

```
090 - 099
```

Goal

Chuẩn hóa toàn bộ dữ liệu gameplay.

Bao gồm

- Skill Data
- Monster Data
- Item Data
- Dungeon Data
- Talent Data

Deliverables

Data Specification.

---

# Phase 10

Discord Framework

Status

⬜ TODO

Documents

```
100 - 109
```

Goal

Tích hợp Discord.

Bao gồm

- Slash Command
- Button
- Modal
- Embed
- Session

Deliverables

Discord Framework.

---

# Phase 11

Persistence Framework

Status

⬜ TODO

Documents

```
110 - 119
```

Goal

Thiết kế Database.

Bao gồm

- Schema
- Repository
- Cache
- Migration

Deliverables

Persistence Layer.

---

# Phase 12

Gameplay Systems

Status

⬜ TODO

Documents

```
120 - 129
```

Goal

Gameplay ngoài Battle.

Bao gồm

- Guild
- Mail
- Quest
- Achievement
- Ranking

Deliverables

Gameplay Systems.

---

# Phase 13

Deployment

Status

⬜ TODO

Documents

```
130 - 139
```

Goal

Đưa game vào Production.

Bao gồm

- Logging
- Monitoring
- Docker
- CI/CD
- Deployment

Deliverables

Production Environment.

---

# Phase 14

Testing

Status

⬜ TODO

Documents

```
140 - 149
```

Goal

Đảm bảo chất lượng.

Bao gồm

- Unit Test
- Integration Test
- Performance Test
- Stress Test
- Security Review

Deliverables

Release Candidate.

---

# Milestones

| Milestone | Description |
|------------|-------------|
| M1 | Foundation Complete |
| M2 | Gameplay Rule Complete |
| M3 | Battle Framework Complete |
| M4 | Skill Framework Complete |
| M5 | Effect Framework Complete |
| M6 | Core Gameplay Complete |
| M7 | Discord Integration Complete |
| M8 | Beta Release |
| M9 | Production Release |

---

# Current Progress

```
Foundation            🔒

Gameplay Rule         🔒

Battle Framework      🟡

Skill Framework       🟢

Effect Framework      ⬜

Monster Framework     ⬜

Player Framework      ⬜

Item Framework        ⬜

Dungeon Framework     ⬜

Content Framework     ⬜

Discord Framework     ⬜

Persistence           ⬜

Gameplay Systems      ⬜

Deployment            ⬜

Testing               ⬜
```

---

# Version Policy

Version 1

- Hoàn thành toàn bộ Framework.
- Không tối ưu sớm.
- Không Over Engineering.
- Ưu tiên kiến trúc ổn định.

Version 2

- Bổ sung các tính năng trong Future Backlog.
- Tối ưu hiệu năng.
- Mở rộng Gameplay.

---

# Completion Rule

Một Phase chỉ được chuyển sang

🔒 LOCKED

khi:

- Tất cả Document hoàn thành.
- PROJECT_TODO không còn Task.
- Architecture đã ổn định.
- Được xác nhận bởi Developer.

---

# End Of File