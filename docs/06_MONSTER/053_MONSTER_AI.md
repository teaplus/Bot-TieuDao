# Monster AI

Version: 1.0.0

---

# 1. Purpose

MonsterAI định nghĩa hành vi AI của Monster.

MonsterAI quyết định:

- Chọn Skill nào
- Tấn công Target nào
- Khi nào retreat

---

# 2. Design Philosophy

AI không hardcode.

AI dựa vào

```
Monster Class

AI Profile

Monster State

Battle State

Condition Check
```

---

# 3. AI Profile

Mỗi Monster có AI Profile.

```
AGGRESSIVE

DEFENSIVE

BALANCED

TACTICAL

SUPPORT

PASSIVE
```

---

## Aggressive

Tấn công liên tục.

```
Priority: Damage > Defense

Action:

1. Check skill available

2. Choose highest damage skill

3. Select weakest enemy

4. Cast skill
```

---

## Defensive

Phòng thủ trước.

```
Priority: Defense > Damage

Action:

1. Check HP < 50%

   → Use shield/heal

2. Check debuff

   → Use cleanse

3. Check buff

   → Use buff

4. Attack
```

---

## Balanced

Cân bằng.

```
Priority: Balanced

Action:

1. Check ally HP

   → Heal if low

2. Check enemy HP

   → Attack if low

3. Buff/Debuff

4. Basic attack
```

---

## Tactical

Chiến thuật.

```
Priority: Strategy

Action:

1. Analyze battle state

2. Find optimal move

3. Consider long-term

4. Execute best action
```

---

# 4. Behavior Tree

AI sử dụng Behavior Tree.

```
Root

├── Check Health
│   ├── HP < 30% → Escape/Heal
│   ├── HP < 50% → Defensive
│   └── HP > 50% → Aggressive

├── Check Buff
│   ├── No buff → Buff self
│   └── Buffed → Continue

├── Check Condition
│   ├── Can attack → Attack
│   ├── Can heal → Heal
│   └── Can skill → Skill

└── Default
    └── Basic attack
```

---

# 5. Decision Making

AI flow:

```
Turn Start

↓

Check Trigger (passive skill trigger?)

↓

Decision Phase:

1. Evaluate situation
2. Get available skills
3. Rate each skill
4. Select best skill
5. Choose target
6. Execute skill

↓

Turn End
```

---

# 6. Skill Selection

AI chọn Skill.

```
Available Skills:

- Basic Attack (priority 1)
- Damage Skill A (priority 5)
- Damage Skill B (priority 4)
- Heal (priority 3)
- Buff (priority 2)

Conditions:

- Damage Skill A: Needs < 30% crit chance
- Heal: Needs < 50% HP
- Buff: Needs no buff active

Filter by condition → Evaluate priority → Select best
```

---

# 7. Target Selection

AI chọn Target.

```
Possible targets:

- Enemy 1 (HP: 100/100)
- Enemy 2 (HP: 50/100)
- Enemy 3 (HP: 10/100)

Skill: AOE Damage

Target: ALL_ENEMY

---

Skill: Single Damage

Target: LOWEST_HP_ENEMY → Enemy 3

---

Skill: Heal Ally

Target: LOWEST_HP_ALLY → Ally with 50/100 HP
```

---

# 8. Condition Check

AI check điều kiện.

```
Can use skill?

1. Skill available? (no cooldown)

2. Resource available? (MP/Qi)

3. Target exist? (alive, in range)

4. Condition meet? (custom condition)

All → Can use

Any fail → Cannot use
```

---

# 9. State Evaluation

AI evaluate trạng thái.

```
Battle State:

- Allies alive: 2/3
- Enemies alive: 1/1
- Ally HP average: 60%
- Enemy HP average: 50%

Decision: Attack or Defend?

→ 1 enemy vs 2 allies → Aggressive

→ Ally HP low → Defensive

→ Balanced outcome → Tactical
```

---

# 10. Learning (Optional)

AI có thể learn từ battle.

```
Track:

- What skill work?
- What skill fail?
- What target priority?
- What pattern win?

Adjust:

- Increase priority of winning skill
- Decrease priority of failing skill
- Change target selection

Note: Disable cho đơn giản (không implement V1)
```

---

# 11. Integration

MonsterAI integrate với:

```
SkillManager (get skills)

TargetSelector (select target)

FormulaEngine (evaluate damage)

BattleEntity (get state)

TurnManager (execute action)
```

---

# 12. Example: Skeleton AI

```
Profile: AGGRESSIVE

Behavior:

1. Check HP < 30% → Escape

2. Get available skills:
   - SLASH (damage 80)
   - HEAVY_BLOW (damage 120, AOE)

3. Check condition:
   - HEAVY_BLOW: need 2+ enemies ✓
   - SLASH: anytime ✓

4. Evaluate:
   - Enemy count: 1
   - HEAVY_BLOW better for 2+ enemies
   - SLASH for single enemy
   - Select: SLASH

5. Choose target:
   - LOWEST_HP_ENEMY → Enemy with lowest HP

6. Execute SLASH on target
```

---

End Of File
