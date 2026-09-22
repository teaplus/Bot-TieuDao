# 007_ACTION_EXECUTOR_SPEC.md

# Action Executor Specification

## Overview

Action Executor chỉ thực thi một Action.

Không execute Skill.

---

# Input

```
Action

Targets

Execution Context
```

---

# Output

```
Action Result
```

---

# Pipeline

```
Action

↓

Formula Engine

↓

Effect Engine

↓

Modifier Pipeline

↓

Action Result
```

---

# Responsibility

Action Executor:

- Execute Formula
- Execute Effect
- Generate Action Result
- Mutate resolved target state for the current Action
- Dispatch by action type through an injectable executor registry

---

# Not Responsibility

Không:

- Resolve Target
- Loop Action
- Execute Skill
- Update Turn
- Dispatch lifecycle or semantic Trigger
- Orchestrate reactive Passive Skill

---

# Runtime Boundary

`BattleActionPipeline` owns target expansion, Condition filtering and Trigger ordering.

For one `ExecutionContext`, the pipeline calls Action Executor exactly once with the final resolved target list. Action Executor returns one aggregate `Action Result` containing ordered per-target results.

Special multi-target behavior such as Chain target expansion must complete before Action Executor. The Chain executor only applies the configured jump multiplier to targets in the received order.
