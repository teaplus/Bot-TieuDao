# Effect Engine

Version: 1.0.0

---

# 1. Purpose

EffectEngine chịu trách nhiệm quản lý vòng đời Effect.

EffectEngine không chứa Gameplay Logic.

EffectEngine chỉ điều phối Effect.

---

# 2. Responsibility

EffectEngine chịu trách nhiệm

- Apply Effect
- Manage Duration
- Tick Effect (DOT/HOT)
- Remove Effect
- Check Condition
- Check Resistance
- Handle Stacking
- Trigger Events

EffectEngine không

- Tính Damage (FormulaEngine)
- Chọn Target (TargetSelector)
- Quyết định Skill (SkillManager)
- Định nghĩa Effect (EffectDefinition)

---

# 3. Dependency

EffectEngine sử dụng

```
EffectDefinition (model)

BattleEntity (state)

CombatContext (context)

FormulaEngine (calculate DOT/HOT)

RandomProvider (roll chance)
```

EffectEngine không phụ thuộc

```
BattleEngine (not orchestrate)

Discord

Database

Repository
```

---

# 4. Public API

```
apply(target, effectCode, params)
  → Apply Effect to target

remove(target, effectCode)
  → Remove specific Effect

removeAll(target)
  → Remove all Effects

tick(target)
  → Tick all Duration Effects on target

clean()
  → Clean expired Effects
```

---

# 5. Apply Effect

```
EffectEngine.apply(target, effectCode, params)

↓

EffectFactory.get(effectCode)

↓

Check Condition

↓

Check Resistance

↓

Check Immunity Buff

↓

Stack Check

↓

Add to target.effects[]

↓

Trigger Event

↓

Return EffectApplyResult
```

---

# 6. Effect Condition

Kiểm tra điều kiện.

```
Effect has conditions:

- HP_ABOVE 50%
- HAS_EFFECT(BURN)
- NO_DEBUFF

Check all conditions

If any fail → Effect not applied

If all pass → Continue to Resistance
```

---

# 7. Resistance Check

Kiểm tra kháng cự.

```
Effect has resistance type: PHYSICAL, ELEMENTAL, ...

Target has resistance stat

Roll chance:

actualChance = effectChance - targetResistance

Roll(0-100) < actualChance

→ Apply

→ Not Apply
```

---

# 8. Immunity Check

Kiểm tra miễn dịch.

```
Target has Immunity Buff?

Example: Burn Immunity

If Effect = Burn

→ Effect not applied

Immunity Buff remove (if configured)
```

---

# 9. Stack Handling

Xử lý stacking.

```
New Effect apply

Check existing Effect of same code

stackable = true?

→ maxStack reached?
  → Remove oldest
  → Add new

→ Add both

refreshDuration?

→ true: Reset duration of old
→ false: Keep duration
```

---

# 10. Tick Logic

Mỗi turn end, tick tất cả Effects.

```
EffectEngine.tick(target)

↓

For each Effect in target.effects:

  If Duration Effect:
    - Tick (DOT/HOT)
    - Duration - 1
    - If Duration = 0 → Mark for removal
    - Trigger Event

↓

Remove marked Effects

↓

Return TickResult
```

---

# 11. Remove Effect

Remove Effect.

```
EffectEngine.remove(target, effectCode)

↓

Find Effect in target.effects[]

If found:

  Remove

  Trigger Event

  Return true

Else:

  Return false
```

---

# 12. Removal Triggers

Các lý do Effect bị remove.

```
1. Duration Expire (automatic tick)
2. Manual Remove (REMOVE_EFFECT Action)
3. Cleanse (DISPEL Action)
4. Purify (PURIFY Action)
5. Replace (new Effect replaces)
6. Immunity reflect (Immunity Buff)
7. Battle End
```

---

# 13. Event Cascade

Khi apply Effect, trigger Event.

```
Apply Buff: ATK +20

↓

Trigger Event: "BUFF_APPLIED"

↓

Passive Skill listen Event

↓

If Passive condition match

→ Trigger Passive Skill
```

---

# 14. State Management

EffectEngine quản lý Effect State.

```
BattleEntity.effects = [
  {
    effectCode: "BURN",
    duration: 2,
    stackCount: 2,
    appliedAt: turn 3,
    ...
  },
  {
    effectCode: "ATK_BUFF",
    duration: 5,
    ...
  },
  ...
]
```

---

# 15. Effect Query

Query Effect từ Entity.

```
hasEffect(target, effectCode)
  → true/false

getEffect(target, effectCode)
  → EffectInstance | null

getEffectsByType(target, type)
  → EffectInstance[]

getActiveEffects(target)
  → EffectInstance[]

getExpiredEffects(target)
  → EffectInstance[]
```

---

# 16. Performance

EffectEngine tối ưu:

- Cache EffectDefinition
- Lazy evaluate Condition
- Batch tick operations
- Index by effectCode

---

# 17. Error Handling

Error case:

```
Effect not found
  → Log warning, return false

Invalid target
  → Throw error

Circular dependency (Trigger loop)
  → Catch and prevent

Resistance type unknown
  → Default to 0 resistance
```

---

# 18. Integration Points

EffectEngine integrate với:

```
SkillExecutor (when APPLY_EFFECT Action)
  ↓
EffectEngine.apply()

TurnManager (tick at turn end)
  ↓
EffectEngine.tick()

BattleEngine (battle end cleanup)
  ↓
EffectEngine.clean()
```

---

# 19. Example: Complete Apply Flow

```
SkillExecutor execute APPLY_EFFECT Action

↓

EffectEngine.apply(target, "BURN", {chance: 60})

↓

EffectFactory.get("BURN")

↓

EffectDefinition {
  type: DOT,
  duration: {value: 3},
  tick: {damage: {multiplier: 0.1}}
}

↓

Check Condition → PASS

Check Resistance (Fire Resistance 30%) → Roll success (60% > 30%)

Check Immunity → No Burn Immunity

Check Stack → stackable=true, maxStack=5, not reached

Add to target.effects[]

Trigger Event: "EFFECT_APPLIED"

Return {success: true, effect: BURN}

↓

Passive Skill listen Event

↓

Check counter condition → trigger counter if match
```

---

# End Of File
