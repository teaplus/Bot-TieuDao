# 006_ACTION_SYSTEM_SPEC.md

Module: Foundation

Version: 1.0

Status: LOCKED

---

# Purpose

ActionSystem chịu trách nhiệm thực thi Action Definition.

Action là đơn vị hành động nhỏ nhất của Gameplay.

Mọi Gameplay đều được tạo thành từ nhiều Action.

---

# Scope

ActionSystem chịu trách nhiệm:

- Thực thi Action.
- Validate Action Input.
- Trả về Action Result.

Không chịu trách nhiệm:

- Gameplay Flow.
- Battle Flow.
- Damage Formula.
- Random Candidate.

---

# Responsibilities

- Resolve Action.
- Dispatch Action Executor.
- Execute Action.
- Collect Result.
- Return ActionResult.

---

# Runtime Flow

Action Request

↓

ActionSystem

↓

Action Executor

↓

Action Result

---

# Action Definition

Action được định nghĩa trong

action_types.json

Ví dụ

- DAMAGE
- HEAL
- SHIELD
- APPLY_EFFECT
- REMOVE_EFFECT
- ADD_ITEM
- REMOVE_ITEM
- ADD_CURRENCY
- REMOVE_CURRENCY
- TELEPORT
- START_BATTLE

ActionSystem không định nghĩa Action.

---

# Execution Model

Một Skill

↓

Nhiều Action

Một Item

↓

Nhiều Action

Một Gameplay Event

↓

Nhiều Action

ActionSystem thực thi tuần tự theo thứ tự khai báo.

---

# Input

Action Definition

Runtime Context

Target

Source

---

# Output

ActionResult

Bao gồm:

- Success
- Failed
- Generated Events
- Runtime Changes

---

# Dependencies

ActionType

RandomSystem

Runtime Context

---

# Used By

Skill Executor

Reward System

Gameplay

Quest

Item

Battle

---

# Error Policy

Action không hợp lệ

↓

Stop Action

↓

Return Failed Result

Không Crash Runtime.

---

# Must NOT

Không đọc JSON.

Không Gameplay Decision.

Không Battle Flow.

Không Discord.

Không Database.

---

# Notes

ActionSystem chỉ biết cách thực thi Action.

Không biết Action được tạo từ đâu.

---

# Related Specification

005_RANDOM_SYSTEM_SPEC.md

007_REWARD_SYSTEM_SPEC.md

---

# End