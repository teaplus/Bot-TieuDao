# 001_ARCHITECTURE_SPEC.md

Module: Foundation

Version: 1.0

Status: LOCKED

---

# Purpose

Định nghĩa kiến trúc tổng thể của Game Engine.

Đây là tài liệu nền tảng cho toàn bộ Source Code.

Tất cả Module trong dự án phải tuân theo kiến trúc được mô tả tại đây.

---

# Scope

Bao gồm

- Layer
- Module
- Dependency
- Runtime
- Data Flow

Không mô tả Gameplay.

Không mô tả Battle Formula.

Không mô tả JSON chi tiết.

---

# Architecture

Project sử dụng kiến trúc Data Driven.

```
                JSON
                  │
                  ▼
         GameDataManager
                  │
                  ▼
            Runtime Layer
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
   Gameplay   Battle    Discord
```

---

# Layer

## Data Layer

Chứa toàn bộ dữ liệu cấu hình.

Ví dụ

- Skill
- Equipment
- Monster
- Item
- Reward

Data Layer không chứa Logic.

---

## Runtime Layer

Chịu trách nhiệm:

- Load Data
- Cache Data
- Validate Data
- Cung cấp GameData

Runtime Layer không chứa Gameplay.

---

## Gameplay Layer

Chịu trách nhiệm:

- Tu luyện
- Đột phá
- Môn phái
- Bí cảnh
- Shop
- Craft
- Inventory

Gameplay không chứa Battle Formula.

---

## Battle Layer

Chịu trách nhiệm:

- Battle
- Damage
- Turn
- Effect
- Skill

Battle không đọc JSON.

Battle không truy cập Database.

---

## Discord Layer

Chịu trách nhiệm:

- Slash Command
- Button
- Embed
- Message

Discord không chứa Gameplay.

---

# Dependency Rules

Cho phép

```
Discord

↓

Gameplay

↓

Runtime

↓

GameData
```

Battle

↓

Runtime

↓

GameData

---

Không cho phép

Battle

↓

Discord

Gameplay

↓

Discord API

Battle

↓

Database

Battle

↓

JSON

---

# GameData

GameData chỉ được khởi tạo một lần.

```
JSON

↓

Loader

↓

Validator

↓

GameData

↓

Runtime
```

GameData là Read Only.

Gameplay không được sửa GameData.

---

# Runtime Flow

```
Application Start

↓

Load JSON

↓

Validate

↓

GameData

↓

Gameplay

↓

Battle

↓

Discord
```

---

# Responsibility

## GameDataManager

- Load JSON
- Validate
- Cache

---

## Gameplay

- Điều khiển gameplay
- Thay đổi Runtime State

---

## Battle

- Mô phỏng chiến đấu

---

## Discord

- Hiển thị kết quả

---

# Runtime State

Runtime State bao gồm

- Player
- Inventory
- Equipment
- Currency
- Quest
- Dungeon Progress

Runtime State không nằm trong JSON.

---

# Design Principles

- Data First
- Data Driven
- Single Responsibility
- Low Coupling
- High Cohesion
- Read Only GameData

---

# Must NOT

Không Hardcode Gameplay.

Không Hardcode Skill.

Không Hardcode Monster.

Không Hardcode Equipment.

Không đọc JSON trong Runtime.

Không Query Database trong Battle.

---

# Related Specification

- DATA_LOADING_SPEC
- GAME_DATA_MANAGER_SPEC
- RANDOM_SYSTEM_SPEC
- REWARD_SYSTEM_SPEC

---

# End Of File