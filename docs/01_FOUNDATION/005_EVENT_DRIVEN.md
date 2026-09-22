# 005_EVENT_DRIVEN.md

# Event Driven Architecture

Version: 1.0.0

---

# 1. Mục tiêu

Toàn bộ gameplay phải giao tiếp thông qua EventBus.

Không cho phép các Module gọi trực tiếp nhau.

Ví dụ

Sai

```
FireSpiritRoot

↓

BurnEffect
```

Đúng

```
OnAttack

↓

EventBus

↓

FireSpiritRoot

↓

Apply Burn
```

---

# 2. Mục đích

Event Driven giúp

- Giảm Coupling
- Dễ mở rộng
- Không sửa Battle Engine
- Dễ thêm Gameplay

Ví dụ

Thêm

Pet

↓

Không sửa BattleEngine.

Pet chỉ cần lắng nghe Event.

---

# 3. EventBus

Framework sử dụng

```
EventBus
```

Singleton.

Chỉ có một EventBus.

Không tạo nhiều EventBus.

---

# 4. Event Flow

```
BattleEngine

↓

Publish Event

↓

EventBus

↓

Listener

↓

Gameplay Module

↓

Complete
```

BattleEngine không biết ai đang lắng nghe.

---

# 5. Event Lifecycle

```
Publish

↓

Listener

↓

Execute

↓

Finish
```

Listener không được

- Query Database
- Discord API

Listener chỉ xử lý Gameplay.

---

# 6. Battle Events

Battle Engine phát các Event sau

```
OnBattleCreate

OnBattleStart

OnRoundStart

OnRoundEnd

OnBattleEnd
```

---

# 7. Turn Events

```
OnTurnStart

OnTurnEnd

OnSkipTurn
```

---

# 8. Attack Events

```
OnBeforeAttack

OnAttack

OnAfterAttack
```

OnBeforeAttack

↓

Cho phép

- Buff Damage
- Debuff Damage
- Dodge
- Block

---

# 9. Damage Events

```
OnBeforeDamage

OnDamage

OnAfterDamage
```

Ví dụ

Shield

↓

OnBeforeDamage

Burn

↓

OnAfterDamage

---

# 10. Critical Events

```
OnCritical
```

Ví dụ

Talent

```
Critical Heal
```

↓

Lắng nghe

```
OnCritical
```

---

# 11. Heal Events

```
OnBeforeHeal

OnHeal

OnAfterHeal
```

---

# 12. Death Events

```
OnDeath

OnKill
```

Ví dụ

Talent

```
Killing Frenzy
```

↓

OnKill

---

# 13. Effect Events

```
OnEffectApply

OnEffectTick

OnEffectRemove
```

Ví dụ

Burn

```
OnEffectTick
```

↓

Damage

---

# 14. Shield Events

```
OnShieldCreate

OnShieldBreak
```

---

# 15. Skill Events

```
OnSkillCast

OnSkillHit

OnSkillMiss

OnSkillCooldown
```

---

# 16. Equipment Events

Trang bị

Không tự chạy.

Chỉ lắng nghe Event.

Ví dụ

```
OnAttack
```

↓

Weapon Passive

---

# 17. Spirit Root Events

Ví dụ

Fire

```
OnAttack

↓

20%

↓

Burn
```

BattleEngine không biết Fire Spirit Root.

---

# 18. Talent Events

Ví dụ

Blood Thirst

```
OnKill

↓

Heal
```

Không sửa BattleEngine.

---

# 19. Sect Events

Ví dụ

Kiếm Tông

```
OnSkillCast

↓

Increase Sword Damage
```

---

# 20. Monster AI Events

AI cũng dùng Event.

Ví dụ

Boss

```
HP < 30%

↓

OnHpThreshold

↓

Ultimate
```

---

# 21. Dungeon Events

```
OnStageClear

OnBossSpawn

OnDungeonComplete
```

---

# 22. World Boss Events

```
OnWorldBossSpawn

OnWorldBossDeath

OnRankingReward
```

---

# 23. Guild Events

```
OnGuildCreate

OnGuildJoin

OnGuildBossKill
```

---

# 24. Event Priority

Có 3 mức

```
HIGH

NORMAL

LOW
```

Ví dụ

Shield

↓

HIGH

Burn

↓

LOW

---

# 25. Event Cancel

Listener có quyền

```
Cancel Event
```

Ví dụ

```
OnAttack
```

↓

Freeze

↓

Cancel

↓

Không đánh.

---

# 26. Event Context

Mỗi Event luôn mang

```
BattleContext

Attacker

Target

Skill

Damage

Round

Random
```

Không truyền nhiều tham số.

Chỉ truyền

```
EventContext
```

---

# 27. Event Rule

Listener

Không được

- Query SQL
- Discord API
- HTTP Request

Chỉ Gameplay.

---

# 28. Event Order

```
BattleStart

↓

RoundStart

↓

TurnStart

↓

BeforeAttack

↓

Attack

↓

BeforeDamage

↓

Damage

↓

AfterDamage

↓

AfterAttack

↓

TurnEnd

↓

RoundEnd

↓

BattleEnd
```

Không thay đổi thứ tự.

---

# 29. Future Events

Cho phép mở rộng

```
Pet

Mount

Artifact

Guild Buff

Formation

Weather

Map Effect
```

Không cần sửa EventBus.

---

# 30. AI Instruction

Khi sinh source code

AI phải

✓ Gameplay dùng EventBus.

✓ Không gọi trực tiếp Module khác.

✓ Không Hardcode Gameplay.

✓ Listener chỉ xử lý Gameplay.

Nếu có xung đột

↓

Tài liệu này ưu tiên.

---

# End of File