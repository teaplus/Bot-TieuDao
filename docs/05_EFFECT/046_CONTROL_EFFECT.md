# Control Effect

Version: 1.0.0

---

# 1. Purpose

Control Effect System định nghĩa các Effect kiểm soát hành động Entity.

Control Effect là loại Debuff đặc biệt.

EffectEngine quản lý Control logic.

TurnManager kiểm tra Control khi thực thi Turn.

---

# 2. Design Philosophy

Control Effect không gây sát thương trực tiếp.

Control Effect thay đổi hành vi Entity.

Entity bị Control sẽ

- Không hành động
- Hoặc hành động bị hạn chế
- Hoặc không thể sử dụng Skill

---

# 3. Control Types

Framework hỗ trợ các loại Control.

## Stun

Không thể hành động.

```
Entity Turn Start

Check Stun?

→ Yes → Skip Turn → Turn End

→ No → Normal Action
```

---

## Freeze

Không thể di chuyển / hạn chế hành động.

```
Movement action?

Check Freeze?

→ Yes → Movement denied → Only Attack/Skill

→ No → Any action allowed
```

---

## Silence

Không thể sử dụng Skill.

```
Skill Selection

Check Silence?

→ Yes → Only Basic Attack

→ No → Active Skill or Basic Attack
```

---

## Sleep

Yên tĩnh, không hành động.

```
Entity Turn Start

Check Sleep?

→ Yes → Sleep (wait for wake trigger)

→ No → Normal Action
```

Khi Sleep kết thúc → Entity wake up.

---

## Charm

Kiểm soát hành động.

```
Skill Selection

Check Charm?

→ Yes → Use pre-defined Charm action

→ No → Entity controlled action
```

---

## Disarm

Không thể sử dụng vũ khí.

```
Skill/Attack

Check Disarm?

→ Yes → Basic Attack only

→ No → Full Skill access
```

---

# 4. Control Duration

Control Effect có Duration.

Khi Duration hết

↓

Entity thoát Control.

```
Turn 1: Stun Active, Duration = 2
Turn 2: Stun Active, Duration = 1
Turn 3: Stun Active, Duration = 0 → Wake up
```

---

# 5. Control Resistance

Entity có thể kháng Control.

```
CCR (Crowd Control Resistance): 30%

Stun chance: 100%

Actual: 100% - 30% = 70%
```

---

## Immunity

Nếu có Control Immunity Buff

↓

Control Effect không được áp dụng.

```
Entity has: Stun Immunity

Apply Stun

↓

Stun rejected

↓

Immunity remove (if configured)
```

---

# 6. Control Stacking

Khi apply Control mà Entity đã có Control.

```
Option 1: Replace

Old: Stun 2 turn

New: Freeze 3 turn

Result: Freeze 3 turn (replace)

---

Option 2: Stack

Old: Stun 2 turn

New: Silence 3 turn

Result: Stun 2 turn + Silence 3 turn (both active)
```

Stack Mode được định nghĩa trong EffectDefinition.

---

# 7. Control Removal

Control có thể bị remove bằng

```
Duration Expire

Manual Remove

Purify (PURIFY Action)

Cleanse Control (specific action)

Replace by new Control

Break Control (counter)
```

---

# 8. Control Cascade

Khi apply Control

↓

Có thể trigger Event.

Ví dụ

```
Apply Stun

↓

Trigger "Stunned" Event

↓

Passive Skill trigger counter
```

---

# 9. Control Priority

Khi nhiều Control cùng active.

```
Priority:

1. Stun (highest - stop all action)
2. Sleep
3. Charm
4. Silence
5. Freeze (lowest)

Effect with higher priority wins.
```

---

# 10. Combat Flow with Control

```
Battle Tick:

Each Entity Turn:

1. Check Stun?
   Yes → Skip turn → Done
   No → Continue

2. Check Sleep?
   Yes → Wait for wake → Done
   No → Continue

3. Check Charm?
   Yes → Execute Charm action → Done
   No → Continue

4. Check Silence?
   Yes → Basic Attack only
   No → Can use Skill

5. Check Freeze?
   Yes → Limited actions
   No → Full actions

6. Execute Action

7. Apply Effects
```

---

# 11. Example: Stun Flow

```
Skill: Stunning Blow

↓

Action 1: DAMAGE (1.2x ATK)

Action 2: APPLY_EFFECT (Stun, 50% chance)

↓

Chance check: 50%

Roll: 45 → success

↓

EffectFactory.create()

↓

EffectDefinition {
  id: 20301,
  code: "STUN",
  type: "CONTROL",
  duration: {value: 1},
  properties: {potency: 100}
}

↓

Target CCR check: 20%

Actual chance: 50% - 20% = 30%

Roll: 25 → success

↓

EffectEngine.apply(STUN to Target)

↓

Next Turn:

Target Turn Start

Check Stun?

→ Yes → Skip Turn

→ Stun Duration: 1 → 0 → Remove

↓

Turn After:

Target can act normally
```

---

# 12. Example: Silence Flow

```
Skill: Silence Curse

↓

Action: APPLY_EFFECT (Silence)

↓

EffectFactory.create()

↓

EffectDefinition {
  id: 20401,
  code: "SILENCE",
  type: "CONTROL",
  duration: {value: 3}
}

↓

EffectEngine.apply(SILENCE to Target)

↓

Battle Tick:

Turn 1:
- Skill Selection
- Check Silence? → Yes
- Result: Only Basic Attack allowed
- Duration: 3 → 2

Turn 2:
- Same: Only Basic Attack
- Duration: 2 → 1

Turn 3:
- Same: Only Basic Attack
- Duration: 1 → 0 → Remove

Turn 4:
- Check Silence? → No
- Can use Skill again
```

---

# 13. Control Interaction

Một số Control có tương tác.

```
Stun + Silence?

→ Stun wins (higher priority)
→ Entity cannot act

Sleep + Charm?

→ Sleep wins
→ Entity sleeps

Freeze + Silence?

→ Both active
→ Limited actions + no skill
```

---

# 14. Wake Triggers

Control có thể thoát sớm.

```
Sleep Effect:

Wake Triggers:
- Duration expire
- Receive damage (wake up)
- Ally call (if supported)

Check Wake Condition?

→ Yes → Wake

→ No → Continue sleeping
```

---

# 15. Control Limit

Có thể giới hạn số Control.

```
Entity can have max 3 Control Effects.

If exceed:

→ Oldest Control removed

hoặc

→ New Control not applied
```

---

# 16. AI Instruction

Control Effect định nghĩa

"Control làm gì" (không hành động, hạn chế hành động, ...)

không định nghĩa

"Khi nào apply Control" (Skill/AI)

"Logic kiểm tra Control" (TurnManager - do Engine xử lý)

---

# End Of File
