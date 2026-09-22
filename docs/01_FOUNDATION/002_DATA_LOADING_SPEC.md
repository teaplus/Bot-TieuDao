# DATA_LOADING_SPEC

Module: Foundation

Version: 1.0

Status: LOCKED

---

# Purpose

DataLoader chịu trách nhiệm nạp toàn bộ Game Data từ thư mục Data.

DataLoader chỉ đọc dữ liệu.

Không kiểm tra Business Rule.

Không Cache.

Không Gameplay.

---

# Responsibilities

- Đọc file JSON.
- Parse JSON.
- Chuyển dữ liệu thành Object.
- Chuyển dữ liệu cho DataValidator.
- Chuyển GameData hợp lệ cho GameDataManager.

---

# Runtime Flow

Application Start

↓

Locate Data Folder

↓

Read JSON Files

↓

Parse JSON

↓

Create Raw GameData

↓

DataValidator

↓

GameDataManager

↓

Runtime Ready

---

# Loading Order

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

Gameplay

---

# Input

Data Folder

---

# Output

Raw GameData

---

# Error Handling

Nếu:

- File không tồn tại.
- JSON Syntax sai.
- Parse thất bại.

↓

Stop Loading.

---

# Dependencies

File System

JSON Parser

---

# Used By

Application Startup

---

# Must NOT

Không Validate Reference.

Không Validate Enum.

Không Gameplay.

Không Battle.

Không Discord.

Không Database.

---

# Notes

DataLoader chỉ đọc dữ liệu.

Mọi Validation thuộc DataValidator.

---

# End