# 007_REWARD_SYSTEM_SPEC.md

Module: Foundation

Version: 1.0

Status: LOCKED

---

# Purpose

RewardSystem chịu trách nhiệm sinh Reward từ RewardTable.

Toàn bộ Gameplay sử dụng cùng một Reward System.

---

# Scope

RewardSystem chịu trách nhiệm:

- Resolve RewardTable.
- Roll Reward.
- Execute Reward.
- Generate RewardResult.

Không chịu trách nhiệm:

- Battle.
- Inventory.
- Quest.
- Shop.

---

# Responsibilities

- Đọc RewardTable.
- Roll theo Weight.
- Roll Quantity.
- Sinh RewardResult.

Không thêm Reward trực tiếp vào Player.

---

# Runtime Flow

RewardTable

↓

RewardSystem

↓

RandomSystem

↓

RewardResult

↓

Gameplay

↓

Inventory / Currency

---

# Reward Source

RewardTable được sử dụng bởi:

- Monster
- Elite
- Boss
- Secret Realm
- Exploration
- Gathering
- Quest
- Event
- Chest

RewardSystem không phân biệt nguồn.

---

# Supported Reward Types

Currency

Item

Equipment

Skill

Pet

Title

Custom

Các Reward Type được mở rộng bằng Data.

---

# Roll Rules

RewardSystem chỉ Roll.

Gameplay quyết định:

- Khi nào Roll.
- Roll bao nhiêu lần.

---

# Quantity

Quantity luôn được Roll sau khi Reward được chọn.

Ví dụ

Reward

↓

Spirit Stone

↓

Quantity

10 ~ 20

---

# Input

RewardTable

Roll Count

Runtime Context

---

# Output

RewardResult

Bao gồm

- Currency
- Item
- Equipment
- Skill
- Custom Reward

---

# Dependencies

GameDataManager

RandomSystem

ActionSystem

---

# Used By

Monster

Quest

Dungeon

Gathering

Event

Gameplay

---

# Error Policy

RewardTable không tồn tại

↓

Return Failed Result

Reward Invalid

↓

Ignore Reward

↓

Continue Roll

Không Crash Runtime.

---

# Runtime Rules

RewardSystem không:

- Thêm Item.
- Thêm Currency.
- Cập nhật Inventory.

RewardSystem chỉ sinh RewardResult.

Gameplay chịu trách nhiệm áp dụng Reward.

---

# Must NOT

Không đọc JSON.

Không Inventory.

Không Database.

Không Discord.

Không Battle Logic.

---

# Design Principles

RewardSystem phải độc lập với Gameplay.

Gameplay chỉ cung cấp:

- RewardTable
- Roll Count

RewardSystem trả về:

RewardResult

---

# Related Specification

004_GAME_DATA_MANAGER_SPEC.md

005_RANDOM_SYSTEM_SPEC.md

006_ACTION_SYSTEM_SPEC.md

---

# End