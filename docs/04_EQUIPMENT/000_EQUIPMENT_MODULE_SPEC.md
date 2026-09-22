# EQUIPMENT_MODULE_SPEC

Module: Equipment

Version: 1.0

Status: LOCKED

---

# Purpose

Equipment Module quản lý toàn bộ dữ liệu và Runtime của trang bị.

Module này chỉ định nghĩa dữ liệu.

Gameplay quyết định:

- Nhận trang bị
- Trang bị
- Tháo trang bị
- Cường hóa
- Bán

Battle chỉ đọc Runtime Equipment.

---

# Scope

Bao gồm

- Equipment Template
- Equipment Type
- Equipment Grade
- Equipment Set
- Equipment Affix
- Runtime Equipment
- Equipment Generator

Không bao gồm

- Inventory
- Player
- Battle Formula

---

# Runtime Pipeline

Equipment Template

↓

Equipment Generator

↓

Runtime Equipment

↓

Equipment Slot

↓

Battle Stat

---

# Data Source

equipment_templates.json

equipment_types.json

equipment_grades.json

equipment_affixes.json

equipment_sets.json

---

# Design Principles

Data First

Template Read Only

Runtime độc lập

Generator chịu trách nhiệm sinh Equipment

---

# Dependencies

Core Data

Item Module

Reward System

Random System

---

# Used By

Gameplay

Battle

Reward

Shop

Craft

---

# Must NOT

Không Gameplay Logic

Không Battle Logic

Không Inventory Logic

---

# End