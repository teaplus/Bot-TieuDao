# 006_CRAFT_SPEC.md

Module: Item

Version: 1.0

Status: LOCKED

---

# Purpose

Craft định nghĩa toàn bộ công thức chế tạo.

Craft không thực hiện chế tạo.

Gameplay chịu trách nhiệm Craft.

---

# Scope

Craft bao gồm:

- Recipe
- Input
- Output
- Cost
- Unlock Condition

---

# Data Source

crafts.json

---

# Runtime Flow

Recipe

↓

Gameplay

↓

Check Material

↓

Consume Material

↓

Generate Reward

---

# Recipe

Một Recipe bao gồm:

- id
- inputs
- outputs
- currencies
- requiredRealm

---

# Input

Input có thể là

- Item
- Equipment
- Currency

---

# Output

Output sử dụng Reward Definition.

Không tạo Item trực tiếp.

---

# Unlock

Recipe có thể yêu cầu

- Realm
- Quest
- Achievement

Gameplay kiểm tra.

---

# Runtime Rules

Craft không Random.

Nếu cần Random.

↓

RewardTable

↓

RewardSystem

---

# Dependencies

RewardTable

Currency

GameDataManager

---

# Used By

Gameplay

---

# Must NOT

Không Inventory.

Không Battle.

Không Database.

---

# Related Specification

004_REWARD_TABLE_SPEC.md

005_SHOP_SPEC.md

009_PROFESSION_SYSTEM_SPEC.md

---

# End
