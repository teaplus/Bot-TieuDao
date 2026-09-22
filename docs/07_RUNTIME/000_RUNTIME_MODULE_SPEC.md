# RUNTIME_MODULE_SPEC

Module: Runtime

Version: 1.0

Status: LOCKED

---

# Purpose

Runtime Module quản lý toàn bộ dữ liệu động của trò chơi.

Runtime Data đại diện cho trạng thái hiện tại của người chơi và các đối tượng đang hoạt động.

Runtime không chứa Template.

Runtime không chứa Gameplay.

Runtime chỉ lưu trạng thái.

---

# Scope

Bao gồm

- Runtime Player
- Runtime Inventory
- Runtime Item
- Runtime Equipment
- Runtime Skill
- Runtime Currency
- Runtime Effect
- Runtime Repository
- Battle Entity Factory

---

# Runtime Pipeline

GameData

↓

Template

↓

Runtime Object

↓

Repository

↓

Gameplay

↓

BattleEntityFactory

↓

Battle

---

# Design Principles

Template bất biến.

Runtime thay đổi.

Gameplay thao tác Runtime.

Battle chỉ đọc BattleEntity.

---

# Must NOT

Không Formula.

Không Battle Logic.

Không Discord.

---

# End