# ITEM_EFFECT_SPEC

Module: Item

Version: 1.0

Status: LOCKED

---

# Purpose

Định nghĩa Effect của Item.

Effect mô tả Item sẽ thực hiện điều gì khi được sử dụng.

Effect không trực tiếp thay đổi Runtime.

---

# Scope

Effect được tham chiếu từ Item Template.

Một Item có thể có:

- một Effect
- nhiều Effect

Effect được ActionSystem thực thi.

---

# Data Source

item_effects.json

---

# Runtime Flow

Item

↓

Item Effect

↓

Action

↓

ActionSystem

↓

Runtime Result

---

# Responsibilities

Effect chỉ mô tả:

- Effect Type
- Value
- Target
- Duration (nếu có)

Không thực hiện Effect.

---

# Supported Effect

Ví dụ

BREAKTHROUGH_RATE

↓

Action

↓

ADD_BREAKTHROUGH_RATE

---

GAIN_EXP

↓

Action

↓

ADD_CULTIVATION_EXP

---

OPEN_SECRET_REALM

↓

Action

↓

START_SECRET_REALM

---

UP_HP

↓

Action

↓

ADD_MODIFIER

---

UP_ATK

↓

Action

↓

ADD_MODIFIER

---

# Runtime Rules

Effect không sửa Player.

Effect không sửa Inventory.

Effect chỉ tạo Action Request.

---

# Effect Chain

Item

↓

Effect

↓

Action

↓

Modifier (optional)

↓

Runtime

---

# Used By

Consumable

Ticket

Special Item

Quest Item

---

# Dependencies

ActionType

Modifier

---

# Must NOT

Không Gameplay.

Không Battle Logic.

Không Database.

Không Discord.

---

# Related Specification

006_ACTION_SYSTEM_SPEC.md

005_MODIFIER_SPEC.md

---

# End