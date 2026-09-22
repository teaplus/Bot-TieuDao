# ATTRIBUTE_SPEC

Module: Core Data

Version: 1.0

Status: LOCKED

---

# Purpose

Định nghĩa Attribute của Runtime.

---

# Data Source

attributes.json

---

# Responsibilities

Attribute chỉ định nghĩa:

- id
- displayName
- valueType

---

# Used By

Player

Monster

Equipment

Modifier

Battle

---

# Pipeline

Base

↓

Equipment

↓

Modifier

↓

Battle Stat

↓

Formula

---

# Must NOT

Không Formula.

---

# End