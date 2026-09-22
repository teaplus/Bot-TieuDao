# Summon System

Version: 1.0.0

---

# 1. Purpose

Summon System định nghĩa cơ chế triệu hồi Monster.

Summon là Monster tạm thời.

Summon tuân lệnh Caster.

---

# 2. Summon Source

Summon có thể từ:

```
Skill Action (SUMMON)

Passive Skill

Trigger Skill

Item

Ritual
```

---

# 3. Summon Type

Có loại Summon.

```
Temporary Summon (Duration)

Permanent Summon (no duration)

Pet Summon (controllable)

Auto Summon (NPC)

Ritual Summon (event)
```

---

# 4. Summon Definition

Summon có:

```
Monster definition

Duration (turn)

Loyalty (listen to caster)

AI mode (follow caster)

Benefit (bonus from caster)
```

---

# 5. Summon Mechanics

Summon mechanics:

```
On Summon:

- Add to battle
- Join caster team
- Get caster buff (optional)

During Battle:

- Act as team member
- Share team turn

On Duration Expire:

- Remove from battle
- Leave loot (optional)

On Caster Defeat:

- May unsummon
- Or continue fight
```

---

# 6. Summon AI

Summon AI:

```
Follow Caster Strategy

Protect Caster

Assist Caster

Or

Independent (own AI)

Or

Controllable (player control)
```

---

# 7. Summon Benefit

Summon có thể nhận Buff từ Caster.

```
Inherit Stat:

- ATK +20% from caster
- DEF +20% from caster

Inherit Effect:

- Copy Buff
- Copy Resistance

Skill Share:

- Learn caster skill (optional)
- Share cooldown (optional)
```

---

# 8. Summon Limit

Có giới hạn Summon.

```
Max Summon per player:

- 1 summon
- Or 3 summon
- Or unlimited (depends design)

Max Summon total:

- 10 summon in battle

Exceed limit:

- Oldest unsummon
- Or new fail
```

---

# 9. Summon Death

Khi Summon chết:

```
Option 1: Unsummon

- Remove from battle
- Leave loot

Option 2: Revive

- Caster can revive (if skill)
- Cost resource

Option 3: Persistent

- Continue count duration
- Treat as defeated
```

---

# 10. Summon Loot

Summon loot:

```
Option 1: No loot

- Summon give nothing

Option 2: Shared loot

- Loot go to caster

Option 3: Independent

- Summon have own loot
- Distribute separately
```

---

# 11. Summon Communication

Summon & Caster:

```
Caster can command:

- Attack
- Defend
- Stay
- Follow

Summon respond:

- Immediate
- Next turn
```

---

# 12. Special Summon

Special Summon:

```
Berserk Summon:

- Uncontrollable
- High damage
- Attack anyone

Ephemeral Summon:

- 1 turn only
- Very powerful

Soul Link Summon:

- Linked to caster
- Share HP pool
- Share buff
```

---

# 13. Summon in PvP

Summon in PvP:

```
Allowed: Yes/No (depends balance)

If allowed:

- Summon take turn
- Counted as team member
- Can be targeted

Restriction:

- Max summon lower
- Summon weaker
- Limited skill
```

---

End Of File
