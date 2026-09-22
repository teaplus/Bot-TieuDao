# MONSTER_MODULE_SPEC

Module: Monster

Version: 1.0

Status: LOCKED

---

# Purpose

Định nghĩa toàn bộ dữ liệu Monster.

Monster Module chỉ chứa Template.

Battle chỉ sử dụng Runtime Monster.

---

# Scope

Bao gồm

- Monster Template
- Monster Variant
- Monster Group
- Monster AI
- Runtime Monster

Không bao gồm

- Battle Logic
- Damage Formula
- Reward Roll

---

# Runtime Pipeline

Monster Template

↓

Monster Generator

↓

Runtime Monster

↓

Battle

---

# Data Source

monster_templates.json

monster_groups.json

monster_ai.json

---

# Design Principles

Monster là Read Only.

Runtime Monster độc lập.

Reward sử dụng rewardTableId.

---

# Used By

Battle

Gameplay

Dungeon

Exploration

Secret Realm

---

# Must NOT

Không Inventory.

Không Gameplay Logic.

Không Reward Logic.

---

# End