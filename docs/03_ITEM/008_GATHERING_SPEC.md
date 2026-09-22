# 008_GATHERING_SPEC.md

Module: Item

Version: 1.0

Status: LOCKED

---

# Purpose

Gathering định nghĩa hoạt động thu thập tài nguyên.

Gathering không sinh Reward.

RewardSystem chịu trách nhiệm sinh Reward.

---

# Scope

Gathering bao gồm:

- Gathering Type
- Reward Table
- Required Realm
- Cooldown (nếu có)

---

# Data Source

gathering.json

---

# Runtime Flow

Gathering

↓

Gameplay

↓

RewardTable

↓

RewardSystem

↓

RewardResult

---

# Gathering Types

Ví dụ

- Spirit Herb
- Ore
- Wood
- Crystal

Có thể mở rộng bằng Data.

---

# Reward

Gathering chỉ tham chiếu

rewardTableId

Reward được định nghĩa trong

reward_tables.json

---

# Unlock

Có thể yêu cầu

- Realm
- Quest
- Area

Gameplay kiểm tra.

---

# Runtime Rules

Gathering không Roll Reward.

Không thêm Item.

Không cộng Currency.

Gameplay thực hiện.

---

# Dependencies

RewardTable

GameDataManager

---

# Used By

Gameplay

Exploration

---

# Must NOT

Không Inventory.

Không Battle.

Không Discord.

---

# Related Specification

004_REWARD_TABLE_SPEC.md

007_GAMEPLAY

---

# End