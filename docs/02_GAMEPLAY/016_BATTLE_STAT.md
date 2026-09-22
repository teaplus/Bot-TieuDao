# 016_BATTLE_STAT.md

# Battle Stat

Version: 1.0.0

---

# 1. Mục tiêu

BattleStat là tập hợp các chỉ số cuối cùng của một Entity sau khi áp dụng toàn bộ Modifier.

Battle Engine chỉ đọc BattleStat.

Battle Engine không được tự tính Attribute.

BattleStat là Immutable Object.

---

# 2. Triết lý

```
Base Stat

↓

Modifier Pipeline

↓

Battle Stat

↓

Battle Engine
```

BattleStat không biết

- Player
- Monster
- Skill
- Buff

BattleStat chỉ là dữ liệu.

---

# 3. BattleStat Lifecycle

```
Create

↓

Pipeline

↓

Cache

↓

Read

↓

Discard
```

BattleStat chỉ được tạo bởi Attribute Pipeline.

---

# 4. BattleStat Responsibility

BattleStat chỉ lưu

```
Final HP

Final ATK

Final DEF

Final SPD

Final CRIT

Final CDMG

Final PEN

Final SKD

Final LS

Final REF

Final CCR
```

Không lưu Gameplay State.

---

# 5. Không lưu trong BattleStat

Các dữ liệu sau KHÔNG thuộc BattleStat.

```
Current HP

Current Shield

Cooldown

Buff List

Debuff List

Turn

Alive

Target
```

Các dữ liệu này thuộc BattleEntity.

---

# 6. Immutable Rule

BattleStat không có Setter.

Sai

```javascript
battleStat.atk +=100
```

Đúng

```
Modifier

↓

Pipeline

↓

BattleStat mới
```

---

# 7. Read API

Battle Engine chỉ được đọc.

Ví dụ

```
get("ATK")

get("DEF")

get("SPD")

get("CRIT")
```

Không được sửa.

---

# 8. BattleStat Structure

BattleStat gồm

```
HP

ATK

DEF

SPD

CRIT

CDMG

PEN

SKD

LS

REF

CCR

SHD

REG
```

Có thể mở rộng thêm Attribute mới.

---

# 9. Snapshot

BattleStat là Snapshot.

Trong cùng một thời điểm.

Ví dụ

```
Player Buff

↓

Pipeline

↓

BattleStat A
```

Sau đó

```
Player nhận Buff mới

↓

Pipeline

↓

BattleStat B
```

BattleStat A không thay đổi.

---

# 10. Dirty Flag

Mỗi BattleEntity có Dirty Flag.

Nếu

```
Modifier thay đổi
```

↓

Dirty = true

↓

Recalculate BattleStat.

---

# 11. Cache

BattleStat luôn được Cache.

Battle Engine không Recalculate mỗi Attack.

---

# 12. Clone Rule

BattleStat có thể Clone.

Ví dụ

```
BattleStat

↓

Clone

↓

Simulation
```

Không ảnh hưởng bản gốc.

---

# 13. Compare Rule

Hai BattleStat có thể so sánh.

Ví dụ

```
Old

↓

New
```

Để biết

```
ATK +100

DEF -50

CRIT +10%
```

Phục vụ Log hoặc Replay.

---

# 14. Serialization

BattleStat hỗ trợ

```
JSON

Binary
```

Không lưu Database.

Chỉ phục vụ

- Replay
- Debug
- Battle Log

---

# 15. Performance

BattleStat phải

```
Read Only

Immutable

Cache Friendly
```

Không cấp phát mới liên tục.

---

# 16. Extension

Có thể mở rộng thêm

```
Fire Damage

Water Damage

Sword Damage

Boss Damage

PvP Damage
```

Không sửa Battle Engine.

---

# 17. BattleEntity Relationship

```
BattleEntity

├── BaseStat

├── ModifierPipeline

├── BattleStat

├── CurrentHP

├── CurrentShield

├── BuffContainer

├── SkillContainer
```

BattleStat chỉ là một thành phần.

---

# 18. AI Instruction

Battle Engine

↓

Chỉ đọc BattleStat.

Gameplay

↓

Không sửa BattleStat.

Modifier Pipeline

↓

Là nơi duy nhất tạo BattleStat.

Nếu BattleStat thay đổi

↓

Tạo BattleStat mới.

---

# 19. Example

Equipment

```
ATK +150
```

↓

Modifier

↓

Pipeline

↓

BattleStat

↓

ATK = 1350

Battle Engine

↓

calculateDamage(
    attacker.battleStat,
    defender.battleStat
)

---

# End Of File