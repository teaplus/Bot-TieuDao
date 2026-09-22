# 012_STAT_SYSTEM.md

# Stat System

Version: 1.0.0

---

# 1. Mục tiêu

Tài liệu này định nghĩa cách Framework quản lý toàn bộ chỉ số của Entity.

Battle Engine không làm việc trực tiếp với Base Stat.

Battle Engine chỉ làm việc với Battle Stat.

---

# 2. Triết lý

Mỗi Entity chỉ có một Stat Container.

```

Player

↓

StatContainer

↓

Battle Engine

```

Không tồn tại

```
player.atk

player.def

player.hp
```

trực tiếp trong Battle Engine.

---

# 3. Stat Layer

Stat được chia thành nhiều tầng.

```
Base Stat

↓

Flat Bonus

↓

Percent Bonus

↓

Temporary Buff

↓

Temporary Debuff

↓

Battle Stat
```

Battle Engine chỉ đọc Battle Stat.

---

# 4. Base Stat

Đây là chỉ số gốc.

Ví dụ

```
HP

ATK

DEF

SPD
```

Base Stat không thay đổi trong Battle.

---

# 5. Flat Bonus

Flat Bonus cộng trực tiếp.

Ví dụ

```
ATK +100

HP +500

DEF +80
```

Nguồn

- Equipment
- Talent
- Cultivation
- Title

---

# 6. Percent Bonus

Buff theo %

Ví dụ

```
ATK +20%

HP +15%

DEF +30%
```

Không cộng trực tiếp.

---

# 7. Temporary Buff

Buff chỉ tồn tại trong Battle.

Ví dụ

```
ATK +30%

SPD +20%

CRIT +15%
```

Có Duration.

---

# 8. Temporary Debuff

Ví dụ

```
ATK -30%

DEF -40%

SPD -50%
```

Có Duration.

---

# 9. Battle Stat

Battle Stat

=

Base

+

Flat

×

Percent

+

Buff

-

Debuff

Battle Engine chỉ đọc

Battle Stat.

---

# 10. Stat Container

Mỗi Entity có

```
StatContainer
```

Ví dụ

```javascript

stats

{

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

}
```

Không được

```
entity.atk
```

---

# 11. Read Only Rule

Battle Engine

↓

Read

```
stats.get("ATK")
```

Không

```
stats.atk +=100
```

---

# 12. Update Rule

Muốn thay đổi

↓

Modifier.

Ví dụ

```
Buff

↓

Modifier

↓

Recalculate

↓

Battle Stat
```

---

# 13. Modifier

Mọi thay đổi đều thông qua Modifier.

Ví dụ

```
Equipment

↓

Modifier

ATK +100
```

```
Talent

↓

Modifier

ATK +20%
```

```
Burn

↓

Modifier

ATK -10%
```

---

# 14. Modifier Type

Có hai loại.

```
Flat

Percent
```

Ví dụ

```
+100 ATK

+30%
```

---

# 15. Modifier Priority

Thứ tự

```
Base

↓

Equipment

↓

Cultivation

↓

Spirit Root

↓

Talent

↓

Sect

↓

Buff

↓

Debuff

↓

Battle Stat
```

Không thay đổi.

---

# 16. Dynamic Stat

Các Stat sau được phép thay đổi.

```
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
```

---

# 17. Static Stat

Không đổi trong Battle.

```
Level

Cultivation

Sect

Spirit Root
```

---

# 18. Current Value

Có các Current Value

```
Current HP

Current Shield

Current AP
```

Không lưu trong StatContainer.

---

# 19. Derived Stat

Derived Stat

được tính từ

Battle Stat.

Ví dụ

```
Damage

Burn

Heal

Shield
```

Không lưu.

---

# 20. Recalculate

Khi có

```
Equipment

Buff

Debuff

Talent

Sect
```

↓

Recalculate Battle Stat.

---

# 21. Cache

Battle Stat được Cache.

Không tính lại mỗi lần Attack.

Chỉ Recalculate khi Modifier thay đổi.

---

# 22. Immutable Rule

Không được

```javascript
stats.atk +=100
```

Luôn

```
Modifier

↓

Recalculate
```

---

# 23. Future Extension

Cho phép thêm

```
Holy Damage

Fire Damage

Dark Damage

Wind Damage

Water Damage
```

Không sửa Battle Engine.

---

# 24. AI Instruction

Battle Engine

không đọc

Base Stat.

Battle Engine

không sửa

Battle Stat.

Battle Engine

chỉ đọc

StatContainer.

---

# End of File