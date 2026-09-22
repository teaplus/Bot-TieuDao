# 002_ELEMENT_SPEC.md

# Element Specification

Version: 2.0

Status: Stable

---

# 1. Purpose

Element định nghĩa một nguyên tố trong Gameplay.

Element là một Rich Reference Domain.

Element chịu trách nhiệm:

- Định danh nguyên tố.
- Mô tả thông tin của nguyên tố.
- Liên kết tới Gameplay thông qua Effect.
- Mô tả quan hệ tiến hóa (Mutation).

Element không chứa Gameplay Logic.

---

# 2. Responsibility

Element chịu trách nhiệm:

- Identity
- Metadata
- Gameplay Entry
- Evolution Information
- Classification

Gameplay được thực thi bởi Effect.

---

# 3. Dependency

Element chỉ phụ thuộc:

```
Effect
```

Thông qua:

```
effectId
```

Element không phụ thuộc:

- Formula
- Modifier
- Skill
- Battle
- Runtime

---

# 4. Data Model

```json
{
    "id":"FIRE",

    "displayName":"Hỏa",

    "description":"Ngũ hành Hỏa.",

    "effectId":"ELEMENT_FIRE",

    "tags":[
        "ELEMENT",
        "OFFENSIVE"
    ]
}
```

Mutation Element

```json
{
    "id":"LIGHTNING",

    "displayName":"Lôi",

    "description":"Biến dị hệ Hỏa.",

    "effectId":"ELEMENT_LIGHTNING",

    "mutation":true,

    "parentElement":"FIRE",

    "tags":[
        "ELEMENT",
        "MUTATION",
        "OFFENSIVE"
    ]
}
```

---

# 5. Properties

| Field | Required | Description |
|---------|----------|-------------|
| id | Yes | Unique Element Identifier |
| displayName | Yes | Display Name |
| description | No | Description |
| effectId | Yes | Default Gameplay Effect |
| mutation | No | Mutation Flag |
| parentElement | No | Parent Element |
| tags | No | Classification |

---

# 6. Design Rules

## Rule 1

Element không chứa Gameplay Logic.

Gameplay được định nghĩa trong Effect.

---

## Rule 2

Element không chứa Formula.

---

## Rule 3

Element không chứa Modifier.

---

## Rule 4

Element không chứa Runtime State.

---

## Rule 5

Element không mô tả quan hệ giữa các Element.

Mọi quan hệ giữa Element được định nghĩa tại dữ liệu chuyên biệt (ví dụ: element_relations.json).

Runtime normalization hiện hành chuyển hai nhóm nguồn `generate` và `counter` thành immutable relation records:

```json
{
    "id": "COUNTER_WATER_FIRE",
    "relationType": "COUNTER",
    "from": "WATER",
    "to": "FIRE",
    "effectId": null
}
```

`from` và `to` phải tham chiếu Element tồn tại và không được trùng nhau. `effectId` là optional trong migration; khi được khai báo, nó phải tham chiếu Core Effect có `scopes: ["ACTION"]`.

Kiến trúc combat relation là Effect-driven: `relationType` chỉ phân loại/lookup, không hard-code multiplier. Relation không có `effectId` không tạo behavior. Relation có `effectId` tạo ACTION-scoped carrier trước Formula; carrier có thể cung cấp target-specific Modifier hoặc sinh Action chuẩn.

`ElementRelationResolver` chỉ thực hiện exact directional lookup trên relation đã normalize. Resolver không tự đảo chiều, không tạo neutral relation và không fallback mutation Element về `parentElement`; các semantics đó chỉ được bổ sung sau khi có quyết định/content tường minh.

Offensive Element được snapshot một lần theo thứ tự `Action -> owning Effect -> Skill -> NEUTRAL`. Không fallback innate Element của actor. Defensive Element được snapshot riêng từng target theo `runtime override -> metadata.defensiveElement -> NEUTRAL`. Player lấy defensive Element từ Spirit Root có đúng một `elementId`; Monster lấy từ template/plan.

Baseline MVP hiện hành author mười Effect riêng: năm relation `GENERATE` cấp scoped `ATK_UP_10`, năm relation `COUNTER` cấp scoped `ATK_UP_20`; target `SELF`, chance 100%. Đây là content data-driven trên từng relation, không phải behavior hard-code theo `relationType` trong runtime.

---

## Rule 6

Element chỉ tham chiếu Gameplay thông qua:

```
effectId
```

Battle Engine không được hardcode Gameplay theo Element.

---

# 7. Validation Rules

Một Element hợp lệ khi:

- Có id
- Có displayName
- Có effectId
- id duy nhất

parentElement phải tham chiếu tới một Element hợp lệ.

Element không được tham chiếu chính nó làm parentElement.
---

# 8. Extension Rules

Khi thêm Element mới.

Chỉ thêm object mới.

Không sửa Element cũ.

Gameplay phải được bổ sung bằng Effect mới.

---

# 9. Non Responsibilities

Element không chịu trách nhiệm:

- Damage
- Heal
- Buff
- Debuff
- Formula
- Action
- Battle Logic
- Runtime

---

# 10. Summary

Element là Rich Reference Domain.

Element chỉ mô tả nguyên tố.

Gameplay luôn được mở rộng thông qua Effect.
