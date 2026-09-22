# ACTION_TYPE_SPEC

Module: Core Data

Version: 1.0

Status: LOCKED

---

# Purpose

Định nghĩa Contract của ActionSystem.

---

# Data Source

action_types.json

---

# Responsibilities

ActionType chỉ định nghĩa:

- id
- displayName

Không định nghĩa Logic.

---

# Runtime

Action

↓

ActionSystem

↓

Executor

↓

Result

---

# Used By

Skill

Item

Reward

Gameplay

Battle

---

# Must NOT

Không Formula.

Không Gameplay.

---

# End