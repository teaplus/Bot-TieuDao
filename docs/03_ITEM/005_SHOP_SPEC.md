# 005_SHOP_SPEC.md

Module: Item

Version: 1.0

Status: LOCKED

---

# Purpose

Shop định nghĩa dữ liệu của toàn bộ cửa hàng trong trò chơi.

Shop không bán Item.

Shop chỉ định nghĩa danh sách hàng hóa.

Gameplay chịu trách nhiệm mua bán.

---

# Scope

Shop Module chịu trách nhiệm:

- Shop Definition
- Shop Item
- Price Definition
- Refresh Rule

Không chịu trách nhiệm:

- Currency
- Inventory
- Purchase Logic

---

# Data Source

shops.json

---

# Runtime Flow

Shop Template

↓

Gameplay

↓

Purchase Request

↓

Validation

↓

Reward

---

# Shop Definition

Một Shop bao gồm:

- id
- displayName
- description
- entries

---

# Shop Entry

Một Entry có thể bao gồm:

- Item
- Equipment
- Currency Exchange
- Special Reward

---

# Price

Price sử dụng Currency.

Ví dụ

Currency ID

↓

Amount

Một Entry có thể có nhiều loại Currency.

---

# Purchase Rules

Gameplay kiểm tra:

- Currency
- Unlock Condition
- Purchase Limit

Shop chỉ mô tả dữ liệu.

---

# Refresh

Refresh Rule được định nghĩa bằng Data.

Ví dụ

- Never
- Daily
- Weekly
- Monthly

Gameplay thực hiện Refresh.

---

# Dependencies

Currency

RewardTable

GameDataManager

---

# Used By

Gameplay

Inventory

---

# Must NOT

Không cộng Item.

Không trừ Currency.

Không đọc Player.

Không Battle.

---

# Related Specification

004_CURRENCY_SPEC.md

004_REWARD_TABLE_SPEC.md

---

# End