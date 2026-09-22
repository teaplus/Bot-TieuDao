# ITEM_CATEGORY_SPEC

Module: Item

Version: 1.0

Status: LOCKED

---

# Purpose

Định nghĩa các nhóm Item trong trò chơi.

Category chỉ dùng để phân loại.

Không ảnh hưởng Gameplay.

---

# Scope

Category được sử dụng bởi:

- Inventory
- Shop
- Craft
- Exchange
- Reward

Không quyết định cách Item hoạt động.

---

# Data Source

item_categories.json

---

# Responsibilities

Category chỉ định nghĩa:

- id
- displayName
- description

Không chứa:

- Effect
- Action
- Modifier

---

# Runtime Usage

Gameplay sử dụng Category để:

- Filter Item
- Hiển thị Inventory
- Shop Filter
- Craft Filter

---

# Typical Categories

Ví dụ

- CONSUMABLE
- MATERIAL
- TICKET
- QUEST
- SPECIAL

Có thể mở rộng bằng Data.

---

# Runtime Rules

Category không quyết định Item có dùng được hay không.

Gameplay quyết định.

---

# Used By

Inventory

Shop

Craft

Exchange

Reward

---

# Must NOT

Không chứa Gameplay.

Không chứa Runtime Logic.

Không chứa Action.

---

# Related Specification

001_ITEM_TEMPLATE_SPEC.md

003_ITEM_EFFECT_SPEC.md

---

# End