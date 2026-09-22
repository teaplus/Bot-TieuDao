# World Boss

Version: 1.0.0

---

# 1. Purpose

World Boss Framework định nghĩa hệ thống World Boss.

World Boss là quái cực mạnh.

World Boss cần team để defeat.

---

# 2. World Boss Definition

World Boss:

```
Cực cao HP (1M+)

Cực cao ATK/DEF

Unique mechanic

Multi-phase (nhất định)

Extreme loot

Public (toàn server)
```

---

# 3. World Boss Type

Có nhiều World Boss.

```
Land Boss

Air Boss

Aquatic Boss

Realm Boss

Chaos Boss
```

---

# 4. HP Scaling

World Boss HP scale theo player.

```
Base HP: 1000000

For each player:

Total HP = Base HP × (1 + 0.3 × playerCount)

Example:

1 player: 1000000

3 players: 1900000

5 players: 2500000
```

---

# 5. Phase System

World Boss có nhiều Phase.

```
Phase 1: 0-100% HP

Phase 2: 70% HP trigger → Different pattern

Phase 3: 40% HP trigger → New mechanics

Phase 4: 20% HP trigger → Desperate attacks

Final Phase: 10% HP trigger → Ultimate attack
```

---

## Phase Effect

```
Each phase:

- New skill unlock
- Stats change (ATK up, DEF down)
- Pattern change
- Mechanic introduce

Phase transition:

- Animation
- Temporary invincible
- Reset position

Defeat within phase:

- Loot
- Victory
```

---

# 6. Enrage System

World Boss enrage.

```
Trigger:

- After 30 turn
- Player heal > X amount
- Player buff too many

Effect:

- ATK +100%
- SPD +100%
- New skill pattern

Duration:

- Until defeat

Warning:

- Message before enrage
- Animation

Desperation:

- Final move (10% HP left)
- Extremely strong
- One-shot potential
```

---

# 7. Mechanic

World Boss có Mechanic.

```
Example Mechanic 1: Phase Beam

Every 10 turn:

- Charge
- All player take damage
- Position change

Example Mechanic 2: Add Spawn

At 50% HP:

- Spawn minion
- Distract player
- Additional damage

Example Mechanic 3: Player Buff

At 75% HP:

- Grant random buff
- Strategic play
```

---

# 8. Loot Distribution

Loot distribute công bằng.

```
Damage dealer: 50% loot

Support player: 30% loot

Tank player: 20% loot

Or

Equal distribution (custom option)

Or

Contribution-based
```

---

# 9. Respawn

World Boss respawn.

```
Respawn time:

- After defeat: 24 hour
- Or scheduled: Tuesday/Friday 20:00

Announcement:

- Before spawn
- At spawn location
- World notification

Death tracking:

- Who killed
- When
- Reward claim
```

---

# 10. Ranking

World Boss ranking.

```
Fastest kill

Most damage

Least death

Guild ranking

Server ranking
```

---

# 11. Server Event

World Boss là Server Event.

```
All player can see

Notification on spawn

Broadcast on defeat

Guild competition

Reward for guild
```

---

# 12. Loot Guarantee

World Boss loot cao.

```
Always drop:

- 100k gold+
- 10k exp+
- Rare item
- Boss mark

Chance drop:

- Legend item (10%)
- Unique item (5%)
- Title (1%)
```

---

# 13. Solo vs Team

World Boss có thể solo nhưng khó.

```
Solo:

- 1x HP
- No scaling
- All loot to player
- High risk

Team:

- Scaled HP
- Share risk
- Distribute loot
- Coordination needed
```

---

End Of File
