# Boss Framework

Version: 1.0.0

---

# 1. Purpose

Boss Framework định nghĩa hệ thống Boss Monster.

Boss là loại Monster mạnh đặc biệt.

Boss có mechanics riêng.

---

# 2. Boss Definition

Boss là Monster với:

```
Rất cao HP

Rất cao ATK/DEF

Unique Skill

Phase System (có thể)

Pattern (có thể)

Treasure (nhất định)
```

---

# 3. Boss Types

Có nhiều loại Boss.

## Dungeon Boss

Boss của một Dungeon.

- Difficulty: Medium
- Reward: Medium
- Single phase (có thể)

---

## Chapter Boss

Boss kết thúc Chapter.

- Difficulty: High
- Reward: High
- Multi-phase (có thể)

---

## Event Boss

Boss của Event.

- Difficulty: Custom
- Reward: Event item
- Duration limited

---

## Special Boss

Boss đặc biệt.

- Difficulty: Very High
- Reward: Rare
- Unique mechanics

---

# 4. Phase System

Boss có thể có nhiều Phase.

```
Phase 1: 0-100% HP

Phase 2: 50% HP trigger

Phase 3: 25% HP trigger

Each phase:

- Different skills
- Different stats
- Different AI behavior
```

---

## Phase Trigger

```
{
  "phase": 2,
  "trigger": {
    "type": "HP_BELOW",
    "value": 50
  },
  "effect": {
    "skill": "PHASE_2_BUFF",
    "animation": "phase_change"
  }
}
```

---

# 5. Boss Pattern

Boss có Pattern.

```
Attack Pattern:

1. Skill A
2. Skill B
3. Basic Attack
4. Skill C
5. Repeat

Or

Random pattern

Or

Conditional pattern
```

---

# 6. Boss Immunity

Boss có thể miễn dịch.

```
Immunity to:

- Stun
- Silence
- Control

Or

Partial immunity (50% resistance)
```

---

# 7. Boss Enrage

Boss có thể Enrage.

```
Trigger:

- After X turn
- Player heal too many
- Player damage too much

Effect:

- Increase ATK +50%
- Increase SPD +50%
- Reduce defense
- Auto attack pattern

Duration:

- 3 turn
- Or until defeated
```

---

# 8. Boss Loot

Boss loot cao hơn.

```
loot: {
  gold: {
    min: 5000,
    max: 10000
  },
  
  exp: 50000,
  
  items: [
    {
      code: "LEGENDARY_SWORD",
      chance: 30
    },
    {
      code: "EPIC_ARMOR",
      chance: 50
    }
  ],
  
  special: [
    {
      code: "BOSS_MARK",
      chance: 100
    }
  ]
}
```

---

# 9. Boss Spawn

Boss spawn khác.

```
Once only

Or

Respawn after X hour

Or

Defeated flag (NPC quest)

Or

Event schedule
```

---

# 10. Boss AI

Boss AI khác.

```
AI Profile: TACTICAL

Behavior:

1. Learn player pattern
2. Adapt strategy
3. Use phase change
4. Execute enrage
5. Focus on weakness
```

---

# 11. Boss Difficulty

Boss có Difficulty.

```
Easy: 30-50% player level

Normal: 50-80% player level

Hard: 80-120% player level

Insane: 120%+ player level
```

---

# 12. Boss Quest

Boss có thể là Quest.

```
Quest:

- Kill Boss X
- Collect Boss item
- Defeat Boss in time

Reward:

- Gold
- Exp
- Item
- Title
```

---

# 13. Boss Evolution

Boss có thể evolve.

```
First encounter: Weakened

Defeated later: Stronger form

Enraged form: Temporary boost

True form: All power unleashed
```

---

End Of File
