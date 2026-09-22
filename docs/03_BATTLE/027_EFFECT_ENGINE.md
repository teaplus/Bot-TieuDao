# 027_EFFECT_ENGINE.md

# Effect Engine

Version: 1.0.0

---

# 1. Purpose

EffectEngine quản lý toàn bộ Buff và Debuff.

BattleEngine không biết Burn.

BattleEngine không biết Freeze.

BattleEngine chỉ gọi

EffectEngine.

---

# 2. Responsibility

EffectEngine

- Apply Effect

- Remove Effect

- Tick Effect

- Trigger Effect

- Expire Effect

---

# 3. Effect Lifecycle

Apply

↓

Active

↓

Trigger

↓

Tick

↓

Expire

↓

Remove

---

# 4. Trigger Timing

Framework hỗ trợ

On Battle Start

On Round Start

On Turn Start

Before Skill

After Skill

Before Damage

After Damage

Turn End

On Death

---

# 5. Effect Stack

Effect hỗ trợ

No Stack

Stack

Refresh

Replace

Theo Effect định nghĩa.

---

# 6. Duration

Đơn vị

Turn

Mỗi Turn

↓

Duration--

↓

0

↓

Remove

---

# 7. Effect Category

Buff

Debuff

DOT

HOT

Control

Special

---

# 8. Apply Rule

Effect chỉ được Apply thông qua

EffectEngine.

Không tự thêm vào Entity.

---

# 9. Remove Rule

Có thể Remove bởi

Dispel

Expire

Death

Skill

---

# 10. Public API

apply()

remove()

tick()

trigger()

clear()

---

# 11. AI Instruction

EffectEngine không tính Damage.

EffectEngine không tính Heal.

EffectEngine chỉ quản lý Effect.

---

# End Of File