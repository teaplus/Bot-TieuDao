# RUNTIME_REPOSITORY_SPEC

Module: Runtime

Version: 1.0

Status: LOCKED

---

# Purpose

Repository là lớp truy cập Runtime Data.

Gameplay không thao tác Database trực tiếp.

---

# Responsibilities

Repository chịu trách nhiệm

- Load
- Save
- Delete
- Query

---

# Repository

PlayerRepository

InventoryRepository

EquipmentRepository

SkillRepository

CurrencyRepository

EffectRepository

---

# Runtime Flow

Gameplay

↓

Repository

↓

Database

---

# Rules

Gameplay chỉ gọi Repository.

Battle không gọi Repository.

---

# Must NOT

Không Gameplay Logic.

Không Formula.

---

# End