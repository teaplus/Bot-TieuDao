# ITEM_MODULE_SPEC

Module: Item

Version: 1.0

Status: LOCKED

---

# Purpose

Định nghĩa toàn bộ hệ thống Item của trò chơi.

Item Module chịu trách nhiệm quản lý dữ liệu Item và các hệ thống liên quan.

Bao gồm:

- Item Template
- Reward
- Shop
- Craft
- Exchange
- Gathering

Item Module không quản lý Runtime Inventory.

---

# Scope

Item Module bao gồm:

- Item Definition
- Reward Definition
- Shop Definition
- Craft Definition
- Exchange Definition
- Gathering Reward

Không bao gồm:

- Inventory
- Currency Runtime
- Player Item

---

# Runtime Flow

GameData

↓

Item Module

↓

Gameplay

↓

Inventory

Item Module chỉ cung cấp Data.

Gameplay quyết định cách sử dụng.

---

# Dependencies

Phụ thuộc:

- Core Data
- GameDataManager

Được sử dụng bởi:

- Gameplay
- Battle
- Reward
- Shop
- Craft

---

# Data Source

Item Module sử dụng:

- item_templates.json
- reward_tables.json
- shops.json
- crafts.json
- exchanges.json
- gathering.json

---

# Runtime Rules

Item Module là Read Only.

Gameplay không được sửa Template.

---

# Must NOT

Không chứa Inventory.

Không chứa Runtime State.

Không chứa Battle Logic.

Không chứa Database.

---

# Related Specification

001_ITEM_TEMPLATE_SPEC.md

004_REWARD_TABLE_SPEC.md

005_SHOP_SPEC.md

---

# End