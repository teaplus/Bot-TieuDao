# 005_TARGET_RESOLVER_SPEC.md

# Target Resolver Specification

## Overview

Target Resolver chuyển Target Strategy thành danh sách Battle Entity.

---

# Input

```
BattleContext

Caster

Action
```

---

# Output

```
BattleEntity[]
```

---

# Supported Strategy

```
SELF

CASTER

OWNER

ALLY_SINGLE

ALLY_ALL

ALLY_LOWEST_HP

ALLY_HIGHEST_ATTACK

ALLY_RANDOM

ENEMY_SINGLE

ENEMY_RANDOM

ENEMY_ALL

DEAD_ALLY

ALL
```

---

# Interface

```java
BattleEntity[] resolve(
    BattleContext battleContext,
    BattleEntity caster,
    Action action
)
```

---

# Responsibility

Target Resolver chỉ:

- đọc Target Strategy
- tìm Entity phù hợp
- trả về danh sách Target

---

# Not Responsibility

Không:

- Damage
- Heal
- Buff
- Formula
- Modifier
- Animation

---

# Design Rule

Target Resolver phải Stateless.

Không cache target.

Không thay đổi Battle State.