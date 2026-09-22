# 003_BATTLE_PIPELINE_SPEC.md

# Battle Pipeline Specification

## Overview

Battle Engine chỉ chịu trách nhiệm điều phối pipeline.

Mọi logic chiến đấu được phân chia thành các module độc lập.

---

# Battle Pipeline

```
Battle Engine
      │
      ▼
Skill Executor
      │
      ▼
Action Loop
      │
      ▼
Target Resolver
      │
      ▼
Condition Checker
      │
      ▼
Formula Engine
      │
      ▼
Effect Engine
      │
      ▼
Modifier Pipeline
      │
      ▼
Collect Result
      │
      ▼
Next Action
```

---

# Execute Flow

```
Execute Skill

FOR EACH Action

    Resolve Target

    Check Condition

    Execute Formula

    Apply Effect

    Collect Result

END
```

Element relation phase của mỗi Action chạy theo ordering ổn định:

```text
Resolve/expand targets
-> Filter Condition per target
-> BEFORE_ACTION (một lần)
-> Snapshot offensive/defensive Element
-> Exact relation lookup
-> Attach/execute ACTION-scoped relation Effect
-> Formula + Action mutation
-> Semantic/reactive/death hooks
-> AFTER_ACTION (một lần)
-> Cleanup ACTION scope trong finally
```

Relation Effect carrier không phát thêm lifecycle hook. Supplemental Action do carrier tạo có ExecutionContext/lifecycle riêng. Relation không có `effectId`, Element `NEUTRAL` hoặc không có exact relation không đổi RNG hay Action Result.

---

# Design Rule

Battle Engine không biết:

- Damage
- Heal
- Shield
- Buff
- Debuff
- Summon

Battle Engine chỉ điều phối Pipeline.

---

# Responsibility

Battle Engine chịu trách nhiệm:

- Execute Skill
- Execute Action Loop
- Collect Result
- Update Battle State

Không xử lý business logic.
