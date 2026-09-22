# ITEM_TEMPLATE_SPEC

Module: Item

Version: 1.0

Status: LOCKED

---

# Purpose

Định nghĩa Template của toàn bộ Item.

Item Template là dữ liệu gốc để tạo Runtime Item.

---

# Scope

Item Template mô tả:

- ID
- Tên
- Category
- Icon
- Description
- Effect
- Stack
- Tradable

Không mô tả Runtime.

---

# Data Source

item_templates.json

---

# Runtime Flow

Item Template

↓

Gameplay

↓

Runtime Item

↓

Inventory

---

# Responsibilities

Item Template chỉ định nghĩa dữ liệu.

Không thực hiện Effect.

Không cộng Stat.

Không thêm Currency.

---

# Item Categories

Ví dụ

- Consumable
- Material
- Ticket
- Quest
- Special

Category được định nghĩa bằng Data.

---

# Item Effect

Item có thể chứa nhiều Effect.

Effect được tham chiếu bằng ID.

Ví dụ

effects

↓

effectId

↓

item_effects.json

---

# Runtime Rules

Runtime Item chỉ lưu:

- templateId
- quantity

Mọi thông tin khác lấy từ Template.

---

# Used By

Inventory

Reward

Shop

Craft

Exchange

Gameplay

---

# Must NOT

Không lưu Quantity.

Không lưu Owner.

Không lưu Runtime State.

---

# Related Specification

002_ITEM_CATEGORY_SPEC.md

003_ITEM_EFFECT_SPEC.md

---

# End