# DATA_VALIDATOR_SPEC

Module: Foundation

Version: 1.0

Status: LOCKED

---

# Purpose

Kiểm tra toàn bộ GameData sau khi DataLoader hoàn thành.

DataValidator chịu trách nhiệm đảm bảo dữ liệu hợp lệ trước khi Runtime khởi động.

---

# Responsibilities

- Validate ID.
- Validate Enum.
- Validate Reference.
- Validate Required Field.
- Validate Duplicate.
- Validate Circular Reference.

---

# Validation Order

Raw GameData

↓

Required Field

↓

Duplicate ID

↓

Enum

↓

Reference

↓

Circular Reference

↓

Business Validation

↓

Validated GameData

---

# Validation Rules

## Required Field

Kiểm tra field bắt buộc.

---

## Duplicate ID

Không cho phép ID trùng.

---

## Enum

Kiểm tra Enum tồn tại.

---

## Reference

Kiểm tra Reference tồn tại.

Ví dụ

rewardTableId

↓

reward_tables.json

---

## Circular Reference

Không cho phép vòng lặp Reference.

---

## Business Validation

Ví dụ

min <= max

weight >= 0

requiredRealm tồn tại

grade tồn tại

...

---

# Error Policy

Có lỗi

↓

Stop Startup

Không Ignore.

Không Warning.

---

# Output

Validated GameData

---

# Dependencies

Không phụ thuộc Gameplay.

Không phụ thuộc Battle.

---

# Used By

DataLoader

---

# Must NOT

Không sửa dữ liệu.

Không Gameplay.

Không Battle.

Không Database.

---

# Notes

Validator chỉ kiểm tra.

Không tự Fix Data.

---

# End