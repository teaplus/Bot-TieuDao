# 001_ATTRIBUTE_SPEC.md

# Attribute Specification

Version: 1.0

Status: Stable

---

# 1. Purpose

Attribute là đơn vị dữ liệu cơ bản nhất của Gameplay.

Attribute chỉ định nghĩa **một loại chỉ số**.

Attribute không chứa:

- Runtime State
- Gameplay Logic
- Formula
- Effect
- UI Information

---

# 2. Scope

Attribute được tham chiếu bởi:

- Battle Entity
- Formula
- Modifier
- Skill
- Equipment
- Talent
- Monster

Attribute không phụ thuộc vào Domain khác.

---

# 3. Data Model

## JSON Schema

```json
{
    "id": "ATK",
    "type": "INTEGER",
    "min": 0
}
```

---

# 4. Properties

| Field | Type | Required | Description |
|---------|----------|-------------|
| id | String | Yes | Unique Attribute Identifier |
| type | Enum | Yes | Runtime Value Type |
| min | Number | No | Minimum Allowed Value |
| max | Number | No | Maximum Allowed Value |

---

# 5. Supported Types

| Type | Description |
|------|-------------|
| INTEGER | Integer Number |
| DECIMAL | Floating Point Number |
| BOOLEAN | Boolean Value |

# 5.x. Display Format

Format dùng để mô tả cách biểu diễn dữ liệu.

Format không ảnh hưởng đến Runtime.

Format không ảnh hưởng đến Formula.

Format chỉ phục vụ hiển thị hoặc kiểm tra dữ liệu.

Các Format hiện hỗ trợ:

| Format | Ý nghĩa |
|---------|----------|
| NUMBER | Giá trị số thông thường |
| PERCENT | Giá trị phần trăm |
---

# 6. Design Rules

## Rule 1

Một Attribute chỉ đại diện cho một loại chỉ số.

Ví dụ:

- HP
- ATK
- DEF
- SPD

---

## Rule 2

Attribute không lưu Runtime Value.

Ví dụ:

Sai

```json
{
    "id":"HP",
    "value":500
}
```

Đúng

```json
{
    "id":"HP",
    "type":"INTEGER"
}
```

---

## Rule 3

Attribute không chứa Gameplay Logic.

Không có:

- Formula
- Effect
- Modifier
- Condition

---

## Rule 4

Attribute phải Immutable.

Không sửa ID sau khi phát hành.

---

# 7. Naming Convention

Attribute ID sử dụng:

- UPPER_SNAKE_CASE
- ASCII
- Không khoảng trắng
- Không ký tự đặc biệt

Ví dụ

```
HP
ATK
DEF
SPD
CRIT_RATE
CRIT_DAMAGE
PENETRATION
LIFESTEAL
HEAL_POWER
SHIELD_POWER
CONTROL_RESIST
LUCK
```

---

# 8. Validation Rules

Một Attribute hợp lệ khi:

- Có id
- id duy nhất
- type hợp lệ
- min <= max (nếu cùng tồn tại)

---

# 9. Runtime Example

Core Data

```json
{
    "id":"ATK",
    "type":"INTEGER",
    "min":0
}
```

Runtime

```json
{
    "attribute":"ATK",
    "value":1250
}
```

Runtime không ghi ngược Core Data.

---

# 10. JSON Example

```json
[
    {
        "id":"HP",
        "type": "INTEGER",
        "format": "NUMBER",
        "min":0
    },
    {
        "id": "ATK",
        "type": "INTEGER",
        "format": "NUMBER",
        "min": 0
    },
    {
        "id":"DEF",
        "type": "INTEGER",
        "format": "NUMBER",
        "min":0
    },
    {
        "id":"SPD",
        "type": "INTEGER",
        "format": "NUMBER",
        "min":0
    },
    {
        "id":"CRIT_RATE",
        "type": "DECIMAL",
        "format": "PERCENT",
        "min":0,
        "max":100
    },
    {
        "id":"CRIT_DAMAGE",
        "type": "DECIMAL",
        "format": "PERCENT",
        "min":0
    },
    {
        "id":"PENETRATION",
        "type": "DECIMAL",
        "format": "PERCENT",
        "min":0,
        "max":100
    },
    {
        "id":"LIFESTEAL",
        "type": "DECIMAL",
        "format": "PERCENT",
        "min":0,
        "max":1
    }
]
```

---

# 11. Non Responsibilities

Attribute không chịu trách nhiệm:

- Formula Calculation
- Gameplay Logic
- Runtime State
- Battle Logic
- UI
- Localization

---

# 12. Extension Rules

Khi thêm Attribute mới:

- Chỉ thêm object mới.
- Không đổi ID cũ.
- Không thay đổi ý nghĩa của Attribute đã phát hành.

---

# 13. Summary

Attribute là Foundation Domain của Gameplay.

Attribute chỉ định nghĩa:

- ID
- Data Type
- Value Range

Mọi Runtime, Formula và Gameplay đều được xử lý ở các Domain khác.