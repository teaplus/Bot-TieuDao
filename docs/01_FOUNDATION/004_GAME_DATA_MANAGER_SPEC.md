# GAME_DATA_MANAGER_SPEC

Module: Foundation

Version: 1.0

Status: LOCKED

---

# Purpose

GameDataManager quản lý toàn bộ GameData sau khi Validation thành công.

Đây là điểm truy cập duy nhất tới GameData.

---

# Responsibilities

- Lưu GameData.
- Cache GameData.
- Tra cứu Template.
- Tra cứu Collection.
- Cung cấp API cho Runtime.

---

# Runtime Flow

Validated GameData

↓

GameDataManager.initialize()

↓

Runtime

↓

Gameplay

↓

Battle

---

# Managed Data

Core Data

↓

Item

↓

Equipment

↓

Skill

↓

Monster

↓

Reward

↓

Gameplay Config

---

# Public APIs

Get By Id

Get Collection

Find

Exists

---

# Find

Find chỉ Filter trên dữ liệu Memory.

Không Query Database.

Ví dụ

Find Skill

↓

Element

↓

Category

↓

Grade

↓

Quality

↓

Candidate List

Gameplay tự Random.

---

# Runtime Rules

GameData Read Only.

Không Module nào được sửa.

---

# Performance

Load một lần.

Tra cứu Memory.

Không Reload.

---

# Dependencies

Validated GameData

---

# Used By

Gameplay

Battle

Discord

---

# Must NOT

Không đọc File.

Không Validate.

Không Gameplay.

Không Battle Logic.

Không Database.

---

# Notes

GameDataManager là Data Access Layer của toàn bộ Engine.

---

# End