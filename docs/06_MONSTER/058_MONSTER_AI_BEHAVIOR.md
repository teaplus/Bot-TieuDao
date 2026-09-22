# Monster AI Behavior

Version: 1.0.0

---

# 1. Purpose

Monster AI Behavior định nghĩa chi tiết hành vi AI.

AI Behavior là logic quyết định.

BattleEngine không biết AI Logic.

---

# 2. Behavior Tree

AI sử dụng Behavior Tree.

```
Node types:

- Selector (OR)
- Sequence (AND)
- Action
- Condition
- Loop
```

---

# 3. Example Behavior Tree

### Aggressive AI

```
Root: Selector

├── Sequence: Check & Heal
│   ├── Condition: HP < 30%
│   ├── Action: Cast Heal
│
├── Selector: Choose Attack
│   ├── Sequence: Check & AOE
│   │   ├── Condition: Enemy > 2
│   │   ├── Action: Cast AOE Skill
│   │
│   └── Action: Cast Single Damage
│
└── Action: Basic Attack
```

---

### Defensive AI

```
Root: Selector

├── Sequence: Check & Heal
│   ├── Condition: HP < 50%
│   ├── Action: Cast Heal
│
├── Sequence: Check & Buff
│   ├── Condition: No buff active
│   ├── Action: Cast Buff
│
├── Sequence: Check & Debuff
│   ├── Condition: Enemy debuff-able
│   ├── Action: Cast Debuff
│
└── Action: Basic Attack
```

---

# 4. Decision Scoring

AI score setiap skill.

```
Score = Base Score + Condition Bonus + Situation Bonus

Example:

Damage Skill:

- Base: 80
- If target low HP: +20 → 100
- If Crit ready: +10 → 110

Heal Skill:

- Base: 60
- If ally low HP: +40 → 100
- If danger: +20 → 120

Select: Heal (120 > 110)
```

---

# 5. State Machine

AI có thể dùng State Machine.

```
States:

- IDLE
- ATTACKING
- HEALING
- BUFFING
- FLEEING
- DEAD

Transition:

IDLE → Check condition → ATTACKING

ATTACKING → HP low → HEALING

HEALING → HP ok → ATTACKING

FLEEING → Escape condition → IDLE
```

---

# 6. Pattern Adaptation

AI có thể adapt pattern.

```
Turn 1-3: Random action

Turn 4-6: Choose best action

Turn 7+: Adapt to enemy

Track:

- What work?
- What fail?

Adjust:

- Priority change
- Skill change
- Target change
```

---

# 7. Risk Assessment

AI assess risk.

```
Risk = (Enemy ATK - My DEF) × Probability

If Risk > Threshold:

  → Defensive

If Risk < Threshold:

  → Aggressive

Adapt strategy based on risk
```

---

# 8. Resource Management

AI manage resource.

```
If have limited resource (MP):

- Use cheap skill first
- Save expensive for critical
- Regenerate if possible

If no limit:

- Use best skill always
```

---

# 9. Team Behavior

Multi-monster team AI.

```
If ally exists:

- Protect ally
- Heal ally when low
- Buff ally

If many enemies:

- Focus fire on weakest
- Reduce enemy team strength

If surrounded:

- Retreat together
- Form defensive line
```

---

# 10. Boss Behavior

Boss AI special.

```
Phase behavior:

- Different skill per phase
- Auto phase transition
- Enrage at timer

Pattern behavior:

- Repeat pattern
- or Adapt pattern

Desperate behavior:

- Last resort skill
- Final attack
```

---

# 11. Tactical Analysis

AI analyze battle.

```
Analysis:

1. Count team vs enemy
2. Average HP compare
3. Threat assess
4. Resource check
5. Objective evaluate

Decision:

- Aggressive: 1v1, HP good
- Defensive: Outnumbered, HP bad
- Balanced: Neutral situation
- Tactical: Complex situation
```

---

# 12. Learning System

AI can learn (optional).

```
Track success/fail

Success:

- Increase skill priority
- Increase target priority

Fail:

- Decrease skill priority
- Change strategy

Learning:

- Per battle
- or Global (across battles)
```

---

# 13. Integration

AI integrate with:

```
BattleEntity (get state)

SkillManager (get skills)

TargetSelector (select target)

FormulaEngine (predict damage)

BattleEngine (execute action)
```

---

# 14. Example: Combat Decision

```
Turn Start

BattleEntity state:

- HP: 60/100
- Skills available: [SLASH, HEAL, BUFF]
- Enemy: 1 (HP 80/100)
- Ally: none

AI Profile: AGGRESSIVE

Behavior tree:

1. Check HP < 30% → No
2. Choose attack:
   - SLASH score: 80
   - HEAL score: 0 (not needed)
   - BUFF score: 20
   - Best: SLASH (80)
3. Select target:
   - Enemy 1 (only one)
4. Execute SLASH on Enemy 1
```

---

End Of File
