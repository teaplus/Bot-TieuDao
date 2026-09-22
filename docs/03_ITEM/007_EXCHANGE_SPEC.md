# 007_EXCHANGE_SPEC.md

Module: Item

Version: 1.0

Status: LOCKED

---

# Purpose

Exchange định nghĩa toàn bộ quy tắc đổi vật phẩm.

Exchange không thực hiện giao dịch.

Gameplay chịu trách nhiệm Exchange.

---

# Scope

Exchange bao gồm:

- Cost
- Reward
- Requirement
- Limit

---

# Data Source

exchange_templates.json

---

# Runtime Flow

Exchange Template

↓

Gameplay

↓

Validation

↓

Reward

---

# Exchange Definition

Một Exchange gồm:

- id
- cost
- reward
- limit
- requiredRealm

---

# Cost

Cost có thể gồm:

- Item
- Currency
- Equipment

---

# Reward

Reward sử dụng RewardTable.

Gameplay nhận Reward thông qua RewardSystem.

---

# Limit

Có thể giới hạn:

- Daily
- Weekly
- Monthly
- Lifetime

Gameplay quản lý tiến trình.

---

# Runtime Rules

Exchange không tự:

- Trừ Item.
- Thêm Reward.

Gameplay chịu trách nhiệm.

---

# Dependencies

RewardTable

Currency

GameDataManager

---

# Used By

Gameplay

Sect

Shop

---

# Must NOT

Không Inventory.

Không Battle.

Không Database.

---

# Related Specification

004_REWARD_TABLE_SPEC.md

006_CRAFT_SPEC.md

---

# End