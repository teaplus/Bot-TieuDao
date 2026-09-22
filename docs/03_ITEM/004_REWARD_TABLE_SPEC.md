# REWARD_TABLE_SPEC

Module: Item

Version: 1.0

Status: LOCKED

---

# Purpose

RewardTable định nghĩa toàn bộ dữ liệu Drop của trò chơi.

RewardTable không Roll.

RewardSystem chịu trách nhiệm Roll.

---

# Scope

RewardTable được sử dụng bởi:

- Monster
- Gathering
- Quest
- Event
- Chest
- Secret Realm

---

# Data Source

reward_tables.json

---

# Runtime Flow

RewardTable

↓

RewardSystem

↓

RandomSystem

↓

RewardResult

---

# Reward Types

RewardTable hỗ trợ:

- Currency
- Item
- Equipment
- Pet
- Title

Có thể mở rộng.

---

# Reward Definition

Một Reward bao gồm:

- Reward Type
- Target ID
- Weight
- Quantity

Không chứa Runtime Data.

---

# Roll Rules

RewardTable chỉ mô tả:

- Roll Count
- Candidate
- Weight
- Quantity

RewardSystem quyết định cách Roll.

---

# Dependencies

RandomSystem

GameDataManager

---

# Used By

RewardSystem

Gameplay

---

# Must NOT

Không Gameplay.

Không Inventory.

Không Battle.

---

# Related Specification

007_REWARD_SYSTEM_SPEC.md

---

# End