# RUNTIME_EQUIPMENT_SPEC

Purpose

Runtime Equipment là Equipment thực tế của Player.

---

Runtime Object

Runtime Equipment gồm

templateId

level

affixes

lockState

createTime

---

Không chứa

displayName

description

icon

grade

type

---

Runtime Flow

Runtime Equipment

↓

Template

↓

Battle Stat

---

Design Rule

Runtime chỉ lưu dữ liệu thay đổi.

Mọi dữ liệu khác đọc từ Template.

---

Used By

Inventory

Battle

Gameplay

---

End