# 011_EXECUTION_CONTEXT_SPEC.md

# Execution Context Specification

Version: 2.0

Status: Stable

---

# 1. Purpose

Execution Context là đối tượng Runtime được tạo trong quá trình thực thi Battle.

Nó mang toàn bộ dữ liệu cần thiết để hoàn thành **một Action**.

Execution Context giúp các module Battle trao đổi dữ liệu mà không phụ thuộc trực tiếp vào nhau.

Execution Context không chứa Gameplay.

Execution Context không chứa Business Logic.

---

# 2. Design Goal

* Immutable Reference
* Stateless Module
* Single Source Of Truth
* Low Coupling
* Easy Extension

---

# 3. Dependency

Execution Context phụ thuộc vào Runtime.

Bao gồm:

* Battle Context
* Battle Entity
* Runtime Skill
* Runtime Action

Execution Context không phụ thuộc Core Data.

Mọi Core Data phải được Resolve trước khi đưa vào Execution Context.

---

# 4. Runtime Flow

```text
Battle Engine

↓

Create Execution Context

↓

Resolve Targets

↓

Check Conditions

↓

Execute Formula

↓

Execute Action

↓

Apply Effect

↓

Generate Result

↓

Destroy Context
```

Execution Context chỉ tồn tại trong quá trình thực thi Action hiện tại.

---

# 5. Model

```text
ExecutionContext

├── battleContext
├── caster
├── skill
├── action
├── executionId
├── targets
├── actionIndex
├── currentRound
├── random
├── formulaResult
├── actionResult
├── offensiveElement
├── elementRelations[]
```

---

# 6. Properties

| Field         | Description                   |
| ------------- | ----------------------------- |
| battleContext | Battle Runtime hiện tại       |
| caster        | Battle Entity thực thi Action |
| skill         | Runtime Skill hiện tại        |
| action        | Runtime Action hiện tại       |
| executionId   | Identity duy nhất của Action execution |
| targets       | Danh sách Target đã Resolve   |
| actionIndex   | Vị trí Action trong Skill     |
| currentRound  | Round hiện tại                |
| random        | Random Provider               |
| formulaResult | Kết quả Formula gần nhất      |
| actionResult  | Kết quả Action hiện tại       |
| offensiveElement | Offensive Element đã snapshot |
| elementRelations | Defensive Element, relation IDs và scoped Effect IDs theo từng target |

---

# 7. Lifecycle

```text
Create

↓

Resolve Target

↓

Check Condition

↓

Execute Formula

↓

Execute Action

↓

Apply Effect

↓

Generate Result

↓

Destroy
```

Execution Context luôn được hủy sau khi Action kết thúc.

Không tái sử dụng giữa nhiều Action.

---

# 8. Responsibility

Execution Context chịu trách nhiệm:

* Mang dữ liệu Runtime.
* Chia sẻ dữ liệu giữa các Battle Module.
* Lưu kết quả trung gian trong quá trình thực thi Action.

Execution Context không chịu trách nhiệm:

* Gameplay Logic.
* Damage Calculation.
* Target Resolution.
* Formula Evaluation.
* Effect Processing.

---

# 9. Design Rules

## Rule 1

Một Execution Context chỉ phục vụ một Action.

---

## Rule 2

Execution Context không được ghi vào Core Data.

---

## Rule 3

Execution Context không được cache.

---

## Rule 4

Execution Context không được chia sẻ giữa nhiều Action.

---

## Rule 5

Execution Context chỉ chứa Runtime Object.

Không lưu JSON Definition.

---

## Rule 6

Execution Context không Resolve Reference.

Mọi Skill, Action, Formula, Effect hoặc Modifier phải được Resolve trước khi sử dụng.

---

# 10. Related Context

Execution Context là Context cấp Action.

Battle có thể tồn tại nhiều Context khác nhau.

Ví dụ:

* Battle Context
* Execution Context
* Formula Context (nếu có)
* Effect Context (nếu có)

Các Context này có trách nhiệm độc lập.

---

# 11. Summary

Execution Context là Runtime Object phục vụ việc thực thi một Action.

Execution Context chỉ mang dữ liệu Runtime.

Execution Context không chứa Gameplay Logic.

Execution Context được tạo khi bắt đầu Action và bị hủy ngay sau khi Action hoàn thành.
