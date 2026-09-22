# REFERENCE_RULE_SPEC

Module: Core Data

Version: 1.0

Status: LOCKED

---

# Purpose

Định nghĩa quy tắc tham chiếu giữa các JSON.

Đây là Technical Contract của toàn bộ Data Schema.

---

# General Rule

Mọi Reference đều sử dụng ID.

Không sử dụng Object.

Ví dụ

Đúng

rewardTableId

Sai

rewardTable

{
}

---

# Reference Convention

Tên Field

↓

Tên Collection

---

realmId

↓

realms

---

elementId

↓

elements

---

attributeId

↓

attributes

---

modifierId

↓

modifiers

---

actionTypeId

↓

actionTypes

---

currencyId

↓

currencies

---

itemId

↓

itemTemplates

---

equipmentId

↓

equipmentTemplates

---

skillId

↓

skillTemplates

---

monsterId

↓

monsterTemplates

---

rewardTableId

↓

rewardTables

---

sectId

↓

sects

---

# Array Reference

Nếu tham chiếu nhiều Object.

↓

Sử dụng List ID.

Ví dụ

modifierIds

skillIds

itemIds

---

# Runtime Rule

Gameplay Resolve ID thông qua GameDataManager.

Không Resolve trực tiếp từ JSON.

---

# Validation Rules

Validator phải kiểm tra:

- Missing Reference
- Duplicate ID
- Circular Reference

---

# Must NOT

Không dùng Object Reference.

Không Embed Data.

---

# End