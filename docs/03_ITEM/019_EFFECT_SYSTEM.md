# 019_EFFECT_SYSTEM.md

# Effect System

Version: 1.0.0

---

# 1. Mục tiêu

Toàn bộ Buff và Debuff sử dụng Effect System.

Battle Engine không xử lý từng Effect.

---

# 2. Triết lý

Skill

↓

Effect

↓

Effect Engine

↓

Battle

---

# 3. Effect Category

Buff

Debuff

Control

DOT

HOT

Special

---

# 4. Buff

Ví dụ

ATK Up

DEF Up

SPD Up

Shield

Heal Over Time

---

# 5. Debuff

Ví dụ

ATK Down

DEF Down

SPD Down

Burn

Poison

Bleed

---

# 6. Crowd Control

Freeze

Stun

Taunt

Silence

Sleep

Fear

Root

---

# 7. DOT

Damage mỗi Turn.

Ví dụ

Burn

Poison

Bleed

---

# 8. HOT

Heal mỗi Turn.

Ví dụ

Regeneration

---

# 9. Duration

Đơn vị

Turn

---

# 10. Stack

Effect có thể

Stack

Refresh

Replace

Theo định nghĩa từng Effect.

---

# 11. Trigger

On Battle Start

On Round Start

On Turn Start

On Before Attack

On Attack

On Before Damage

On Damage

On After Damage

On Turn End

On Death

---

# 12. Effect Lifecycle

Apply

↓

Trigger

↓

Tick

↓

Expire

↓

Remove

---

# 13. Priority

Passive

↓

Buff

↓

Debuff

↓

DOT

↓

Death Check

---

# 14. Remove Rule

Effect tự Remove khi

Duration = 0

Hoặc

Dispel

---

# 15. Effect Container

BattleEntity chứa

EffectContainer

Không chứa từng Burn riêng.

---

# 16. Future

Aura

Weather

Map Effect

Guild Aura

Artifact Aura

---

# 17. AI Rule

Battle Engine không viết logic Burn.

Battle Engine không viết logic Freeze.

Battle Engine chỉ gọi Effect Engine.

---

# End