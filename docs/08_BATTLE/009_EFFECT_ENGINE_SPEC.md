# 009_EFFECT_ENGINE_SPEC.md

# Effect Engine Specification

## Overview

Effect Engine áp dụng Effect lên Target.

---

# Input

```
Action

Resolved Targets

Formula Result
```

---

# Output

```
Battle Changes
```

---

# Supported Effect

```
DAMAGE

HEAL

SHIELD

BUFF

DEBUFF

SUMMON

REVIVE

PURIFY

DISPEL
```

---

# Executor

Mỗi Effect có Executor riêng.

```
DamageExecutor

HealExecutor

ShieldExecutor

BuffExecutor

DebuffExecutor

SummonExecutor
```

Không sử dụng if-else hoặc switch theo Effect Type.

---

# Responsibility

Effect Engine:

- Execute Effect
- Generate Battle Changes

---

# Not Responsibility

Không:

- Resolve Target
- Formula
- Skill Execute