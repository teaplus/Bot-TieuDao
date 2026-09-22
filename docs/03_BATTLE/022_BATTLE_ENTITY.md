# 022_BATTLE_ENTITY.md

# Battle Entity

Version: 1.0.0

---

# 1. Purpose

BattleEntity là đại diện của mọi đối tượng tham gia Battle.

BattleEngine chỉ làm việc với BattleEntity.

Không quan tâm

Player

Monster

Boss

Pet

Summon

---

# 2. Design Philosophy

BattleEntity chỉ lưu trạng thái.

Không xử lý Gameplay.

Không tính Damage.

Không xử lý Buff.

---

# 3. Structure

BattleEntity

├── id

├── type

├── name

├── battleStat

├── currentHp

├── currentShield

├── skills

├── effects

├── cooldowns

├── tags

└── metadata

---

# 4. Type

Hỗ trợ

```
PLAYER

MONSTER

BOSS

PET

SUMMON
```

---

# 5. BattleStat

BattleStat là Read Only.

Muốn thay đổi

↓

Modifier Pipeline.

---

# 6. Current HP

HP hiện tại.

Có thể nhỏ hơn Max HP.

Nếu

```
Current HP <= 0
```

↓

Entity chết.

---

# 7. Current Shield

Shield hiện tại.

Damage luôn trừ Shield trước.

---

# 8. Skills

Danh sách Skill.

BattleEntity không biết Skill hoạt động thế nào.

SkillExecutor xử lý.

---

# 9. Effects

Danh sách Buff / Debuff.

Ví dụ

Burn

Freeze

Shield

Poison

Bleed

---

# 10. Cooldowns

Cooldown theo Skill.

Đơn vị

Turn.

---

# 11. Tags

Ví dụ

```
FIRE

WATER

WOOD

EARTH

METAL

LIGHTNING

ICE

SWORD

BOSS

ELITE
```

TargetSelector và Skill có thể dùng.

---

# 12. Metadata

Cho phép mở rộng.

Ví dụ

Realm

MonsterId

PlayerId

GuildId

SkinId

---

# 13. Public API

```
takeDamage()

heal()

addShield()

addEffect()

removeEffect()

hasTag()

isDead()
```

---

# 14. Rule

BattleEntity không được

- tính Damage
- tính Heal
- tính Burn

Chỉ cập nhật trạng thái.

---

# 15. AI Instruction

BattleEntity phải luôn nhẹ.

Gameplay phải chuyển sang

FormulaEngine

EffectEngine

SkillExecutor

---

# End Of File