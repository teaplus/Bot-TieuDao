# SKILL_TEMPLATE_SPEC

Purpose

Định nghĩa Skill gốc.

Skill Template là Read Only.

---

Data Source

skill_templates.json

---

Responsibilities

Một Skill gồm

- id
- displayName
- category
- grade
- element
- actions
- trigger
- cooldownTurns (số nguyên không âm; `0` là compatibility trong lúc bảng balance chưa được duyệt)

---

Runtime

Skill Template

↓

Runtime Skill

---

Skill Template không lưu

Mana

Qi

Runtime State

`cooldownTurns` là policy tĩnh của Skill. Số lượt cooldown còn lại là battle-local Runtime State, không ghi ngược vào template hoặc PostgreSQL.

---

Dependencies

Grade

Action

Trigger

Element

---

Used By

Skill Generator

Battle

Monster

Sect

---

End
