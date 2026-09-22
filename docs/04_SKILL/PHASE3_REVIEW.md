# Phase 3 - Skill Framework

Review & Lock Summary

Date: 2026-07-11

---

# Status

✅ **COMPLETE**

🔒 **LOCKED**

---

# Documents

| Doc | Title | Status |
|-----|-------|--------|
| 032 | Skill Framework Overview | ✅ |
| 033 | Skill Model | 🔒 LOCKED |
| 034 | Skill Action | ✅ |
| 035 | Skill Targeting | ✅ |
| 036 | Skill Trigger | ✅ |
| 037 | Skill Manager | ✅ |
| 038 | Skill Factory | ✅ NEW |
| 039 | Skill JSON Spec | ✅ NEW |

Total: 8 documents (2 new, 6 completed)

---

# Architecture Overview

```
skill.json (Data)
    ↓
SkillFactory (Parse & Validate)
    ↓
SkillDefinition (Model - LOCKED)
    ↓
SkillManager (Manage & Select)
    ↓
SkillExecutor (Execute Actions - LOCKED)
    ↓
10 Action Types (DAMAGE, HEAL, SHIELD, APPLY_EFFECT, ...)
    ↓
FormulaEngine (Calculate)
EffectEngine (Apply Buffs)
    ↓
Battle Result
```

---

# Key Components

## 1. SkillDefinition (Model)

**Status:** 🔒 LOCKED

Structure:
- id, code, name, description
- activation (ACTIVE/PASSIVE/TRIGGER)
- actions (array of Actions)
- tags, metadata

Cannot contain: Weight, Cooldown, Mana, Damage calculations, AI

---

## 2. SkillAction

**Status:** ✅ Complete

10 Supported Types:
1. DAMAGE - Cause damage
2. HEAL - Restore HP
3. SHIELD - Add shield
4. APPLY_EFFECT - Add buff/debuff
5. REMOVE_EFFECT - Remove buff/debuff
6. DISPEL - Remove all buffs
7. PURIFY - Remove all debuffs
8. REVIVE - Resurrect target
9. SUMMON - Summon entity
10. CHANGE_ATTRIBUTE - Modify stat temporarily

Each Action has:
- type, target, params, conditions, metadata

---

## 3. SkillTargeting

**Status:** ✅ Complete

16 Target Types:
- SELF, ALLY, ENEMY
- ALL_ALLY, ALL_ENEMY
- RANDOM_ALLY, RANDOM_ENEMY
- LOWEST_HP_ALLY, LOWEST_HP_ENEMY
- HIGHEST_HP_ALLY, HIGHEST_HP_ENEMY
- HIGHEST_ATK_ALLY, HIGHEST_ATK_ENEMY
- LOWEST_ATK_ALLY, LOWEST_ATK_ENEMY
- DEAD_ALLY (for revive)

Features:
- Alive filter by default
- Empty target handling (skip action)
- Extensible for future targets

---

## 4. SkillTrigger

**Status:** ✅ Complete

22 Battle Events Supported:
- BATTLE_START, ROUND_START, TURN_START, TURN_END
- BEFORE_ATTACK, AFTER_ATTACK
- BEFORE_DAMAGE, AFTER_DAMAGE
- RECEIVE_DAMAGE, RECEIVE_CRITICAL
- KILL_TARGET, ALLY_DEAD, SELF_DEAD
- HP_BELOW, HP_ABOVE
- SHIELD_BROKEN, EFFECT_APPLIED
- ... (extensible)

Trigger Frequency:
- ALWAYS
- ONCE_PER_BATTLE
- ONCE_PER_ROUND
- ONCE_PER_TURN

Features:
- Multiple triggers per skill
- Trigger conditions (HP %, Effect status, ...)
- Loop protection
- Priority handling

---

## 5. SkillManager

**Status:** ✅ Complete

Responsibilities:
- Manage skill list (learn, forget, replace)
- Select active skill (roll weight)
- Check trigger skills
- Manage passive skills

Skill Set per Entity:
- Basic Attack (default)
- Active Skills (user can choose)
- Passive Skills (always active)
- Trigger Skills (auto-activate)

Public API:
- learn(skill)
- forget(skillId)
- getSkill(skillId)
- rollActiveSkill() → returns selected skill
- checkTrigger(event) → returns triggered skills
- getPassiveSkills() → list of passives

---

## 6. SkillFactory

**Status:** ✅ NEW (Complete)

Responsibilities:
- Parse JSON to SkillDefinition
- Validate schema
- Validate required fields
- Validate action types & targets
- Validate params by action type
- Create SkillDefinition

Validation:
- Schema validation (required fields)
- Type validation (ACTIVE/PASSIVE/TRIGGER)
- Action validation (type, target, params)
- Target validation (16 types)
- Params validation (per action type)

Features:
- Error handling (ValidationError)
- Caching support
- Registry pattern (batch register)
- Metadata pass-through

---

## 7. JSON Specification

**Status:** ✅ NEW (Complete)

Format:

```json
{
  "id": 10001,
  "code": "SKILL_CODE",
  "name": "Skill Name",
  "description": "Description",
  "activation": "ACTIVE|PASSIVE|TRIGGER",
  "actions": [
    {
      "type": "ACTION_TYPE",
      "target": "TARGET_TYPE",
      "params": {...},
      "conditions": [],
      "metadata": {}
    }
  ],
  "tags": ["tag1", "tag2"],
  "metadata": {}
}
```

Features:
- Complete params specification for each action type
- JSON examples for 3 skill types
- Versioning support
- Extensible structure

---

# Design Principles Enforced

✅ Data Driven
- No hardcode skills
- All skills defined in JSON
- Reusable by Player/Monster/Boss

✅ Single Responsibility
- SkillFactory: Parse & Validate
- SkillManager: Manage & Select
- SkillExecutor: Execute
- FormulaEngine: Calculate
- EffectEngine: Apply buffs

✅ Separation of Concerns
- Skill = Data (model)
- Weight = BattleEntity property
- Target = Action property
- Damage = FormulaEngine responsibility
- Buff = EffectEngine responsibility

✅ Extensibility
- New Action types (add handler)
- New Target types (add selector)
- New Trigger events (add listener)
- No need to modify SkillExecutor

✅ AI Rules Compliance
- No class per skill (ADR-007)
- SkillManager decides (ADR-012)
- SkillExecutor executes (ADR-012)
- BattleEntity stores state (ADR-011)

---

# Code Structure Support

Framework enables:

```
src/engine/
├── skill/
│   ├── SkillDefinition.js
│   ├── SkillFactory.js
│   ├── SkillManager.js
│   └── actions/
│       ├── DamageAction.js
│       ├── HealAction.js
│       ├── ShieldAction.js
│       └── ... (10 total)
│
├── battle/
│   ├── SkillExecutor.js
│   ├── BattleEngine.js
│   └── ...
│
└── ...
```

---

# Phase 3 Deliverables

✅ SkillDefinition spec (locked, ready for code)
✅ 10 Action types defined
✅ 16 Target types defined
✅ 22+ Battle events defined
✅ SkillManager design
✅ SkillFactory design
✅ JSON format specification with examples
✅ Complete workflow diagram
✅ AI rules enforcement
✅ Extensibility patterns

---

# Dependencies

Phase 3 depends on:
- ✅ Phase 0: Foundation (LOCKED)
- ✅ Phase 1: Gameplay Rule (LOCKED)
- ✅ Phase 2: Battle Framework (REVIEW)

Phase 3 enables:
- Phase 4: Effect Framework (depends on SkillExecutor)
- Phase 5: Monster Framework (uses skills)
- Phase 6: Player Framework (uses skills)

---

# Ready for Code Implementation

✅ Architecture clear
✅ Specs complete
✅ Examples provided
✅ Validation rules defined
✅ Error handling specified
✅ Extensibility patterns documented
✅ AI rules compliance verified

---

# Next Phase

Phase 4: Effect Framework (040-049)

Documents needed:
- 040 Effect Overview
- 041 Effect Definition
- 042 Buff System
- 043 Debuff System
- 044 DOT System
- 045 HOT System
- 046 Control Effect
- 047 Effect Engine
- 048 Effect Factory
- 049 Effect JSON Spec

---

# Lock Summary

**Phase 3 - Skill Framework is COMPLETE and LOCKED.**

- All 8 documents finalized
- Architecture verified
- Rules compliance checked
- Ready for code implementation
- No more changes to Phase 3 specs

Cannot change without Phase Unlock.

---

Date Locked: 2026-07-11

Next: Phase 4 - Effect Framework

---

End Of File
