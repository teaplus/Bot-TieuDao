# GAMEPLAY_MODULE_SPEC

Module: Gameplay

Version: 1.0

Status: LOCKED

---

# Purpose

Gameplay Module điều phối toàn bộ Game Logic.

Gameplay không tính Damage.

Gameplay không thực thi Skill.

Gameplay chỉ:

- Validate
- Chuẩn bị Runtime
- Gọi Battle
- Áp dụng Reward
- Lưu Progress

---

# Responsibilities

Gameplay quản lý

- Player
- Inventory
- Cultivation
- Breakthrough
- Sect
- Exploration
- Secret Realm
- Shop
- Craft
- Exchange

---

# Runtime Pipeline

Discord Command

↓

Gameplay

↓

Battle (optional)

↓

Reward

↓

Player Progress

↓

Save

---

# Dependencies

Foundation

Core Data

Item

Equipment

Skill

Monster

Battle

---

# Must NOT

Không Formula

Không Damage

Không Skill Logic

Không Discord API

---

# End