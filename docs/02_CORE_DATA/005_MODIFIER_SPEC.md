# 005_MODIFIER_SPEC.md

# Modifier Specification

Version: 2.0

Status: Stable

---

# 1. Purpose

Modifier định nghĩa cách thay đổi Battle Attribute.

Modifier không phải Buff.

Modifier không phải Debuff.

Modifier chỉ mô tả phép biến đổi của một Attribute.

Modifier được Effect hoặc Action áp dụng lên Battle Context.

---

# 2. Responsibility

Modifier chịu trách nhiệm:

- Thay đổi Battle Attribute.
- Định nghĩa phép biến đổi.
- Cung cấp dữ liệu cho Battle Stat Calculator.

Modifier không chịu trách nhiệm:

- Trigger.
- Duration.
- Stack.
- Battle Logic.
- Formula.

---

# 3. Dependency

Modifier chỉ phụ thuộc:

```
Attribute
```

Thông qua:

```
attribute
```

Modifier không phụ thuộc:

- Effect
- Formula
- Battle
- Runtime

---

# 4. Data Model

```json
{
  "id": "ATK_UP_20",

  "displayName": "Tăng Công",

  "description": "Tăng 20% Công.",

  "attribute": "ATK",

  "operation": "MULTIPLY",

  "value": 20,

  "valueType": "PERCENT"
}
```

---

# 5. Properties

| Field | Required | Description |
|---------|----------|-------------|
| id | Yes | Modifier Identifier |
| displayName | Yes | Display Name |
| description | No | Description |
| attribute | Yes | Target Attribute |
| operation | Yes | Modifier Operation |
| value | Yes | Modifier Value |
| valueType | Yes | FLAT hoặc PERCENT |

---

# 6. Operations

| Operation | Description |
|------------|-------------|
| ADD | Cộng |
| SUBTRACT | Trừ |
| MULTIPLY | Nhân theo % |
| SET | Gán giá trị |

Ví dụ:

```
ADD
+100 HP
```

```
SUBTRACT
-50 HP
```

```
MULTIPLY
+20%
```

```
SET
100
```

---

# 7. Value Types

## FLAT

Giá trị tuyệt đối.

Ví dụ

```
+100 HP
```

---

## PERCENT

Giá trị phần trăm.

Ví dụ

```
+20% ATK
```

---

# 8. Design Rules

## Rule 1

Modifier chỉ thay đổi đúng một Attribute.

---

## Rule 2

Modifier không chứa Duration.

---

## Rule 3

Modifier không chứa Trigger.

---

## Rule 4

Modifier không chứa Stack.

---

## Rule 5

Modifier không tính toán Formula.

---

## Rule 6

Modifier có thể áp dụng cho mọi Attribute được định nghĩa trong:

```
attributes.json
```

Không giới hạn:

- HP
- ATK
- DEF
- SPD
- CRIT
- PEN
- SKD
- LS
- SHD
- ...

---

# 9. Validation Rules

Modifier hợp lệ khi:

- Có id.
- Có attribute.
- Có operation.
- Có value.
- Có valueType.

attribute phải tồn tại trong:

```
attributes.json
```

---

# 10. Non Responsibilities

Modifier không chịu trách nhiệm:

- Battle Logic
- Trigger
- Duration
- Formula
- Effect
- Runtime
- Target

---

# 11. Summary

Modifier là Attribute Transformer.

Modifier không phải Buff.

Modifier không phải Debuff.

Modifier chỉ mô tả phép thay đổi của Battle Attribute.