# EQUIPMENT_TEMPLATE_SPEC

Module: Equipment

Version: 1.0

Status: LOCKED

---

# Purpose

Template định nghĩa Equipment gốc.

Template là dữ liệu bất biến.

---

# Data Source

equipment_templates.json

---

# Responsibilities

Template định nghĩa

- id
- displayName
- typeId
- gradeId
- requiredRealm
- baseAttributes
- setId

---

# Runtime

Template

↓

Generator

↓

Runtime Equipment

---

# Base Attribute

Template chỉ chứa

Base Attribute

Ví dụ

ATK

DEF

HP

Không chứa

Affix

---

# Used By

Reward

Craft

Generator

Shop

---

# Must NOT

Không Affix

Không Owner

Không Level

Không Durability

---

# End