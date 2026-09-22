# SKILL_MODULE_SPEC

Module: Skill

Version: 1.0

Status: LOCKED

---

# Purpose

Skill Module định nghĩa toàn bộ dữ liệu của Công pháp và Võ kỹ.

Skill Module không chứa Battle Logic.

Skill Module không chứa Gameplay Logic.

Battle chỉ thực thi Runtime Skill.

---

# Scope

Bao gồm

- Skill Template
- Skill Grade
- Skill Category
- Skill Trigger
- Skill Action
- Skill Pool
- Runtime Skill

Không bao gồm

- Battle
- Formula
- AI
- Damage

---

# Runtime Pipeline

Skill Template

↓

Skill Generator

↓

Runtime Skill

↓

Battle

---

# Data Source

skill_templates.json

skill_categories.json

skill_grades.json

skill_actions.json

skill_triggers.json

skill_pools.json

---

# Dependencies

Core Data

Action System

Modifier

Random System

---

# Used By

Gameplay

Battle

Monster

Sect

---

# Must NOT

Không Damage Formula

Không Gameplay Logic

Không Runtime State

---

# End