# 015_ATTRIBUTE_PIPELINE.md

# Attribute Pipeline

Version: 1.0.0

---

# 1. Mục tiêu

Attribute Pipeline chịu trách nhiệm tính toán Battle Stat.

Pipeline là nơi duy nhất được phép kết hợp các Modifier.

Battle Engine không được tính chỉ số.

Modifier Provider không được tính chỉ số.

Stat Container không được tính chỉ số.

---

# 2. Triết lý

Gameplay

↓

Modifier Provider

↓

Modifier Set

↓

Attribute Pipeline

↓

Battle Stat

↓

Battle Engine

Pipeline là nơi duy nhất sinh ra Battle Stat.

---

# 3. Attribute Flow

```
                 Base Stat
                     │
                     ▼
          Equipment Modifier
                     │
                     ▼
         Cultivation Modifier
                     │
                     ▼
         Spirit Root Modifier
                     │
                     ▼
            Talent Modifier
                     │
                     ▼
             Sect Modifier
                     │
                     ▼
            Title Modifier
                     │
                     ▼
              Pet Modifier
                     │
                     ▼
         Formation Modifier
                     │
                     ▼
             Guild Modifier
                     │
                     ▼
              Buff Modifier
                     │
                     ▼
            Debuff Modifier
                     │
                     ▼
            Attribute Pipeline
                     │
                     ▼
               Battle Stat
```

Pipeline không biết nguồn Modifier.

Pipeline chỉ biết Modifier.

---

# 4. Pipeline Input

Pipeline nhận

```
Base Stat

Modifier Set
```

Không nhận

Player

Monster

Discord

Repository

---

# 5. Pipeline Output

Pipeline trả về

```
BattleStat
```

Battle Engine chỉ đọc BattleStat.

---

# 6. Pipeline Stage

Pipeline gồm nhiều Stage.

```
Stage 1

Base Stat

↓

Stage 2

Flat Modifier

↓

Stage 3

Percent Modifier

↓

Stage 4

Override Modifier

↓

Stage 5

Clamp

↓

Battle Stat
```

Không thay đổi thứ tự.

---

# 7. Stage 1

Khởi tạo

```
BattleStat

=

BaseStat
```

---

# 8. Stage 2

Áp dụng

Flat Modifier

Ví dụ

```
ATK +100

HP +500

DEF +80
```

---

# 9. Stage 3

Áp dụng

Percent Modifier

Ví dụ

```
ATK +20%

HP +15%

DEF +30%
```

Áp dụng sau Flat.

---

# 10. Stage 4

Override Modifier

Ví dụ

```
SPD = 0

Freeze
```

Hoặc

```
Cannot Heal

Silence

Invincible
```

Override luôn xử lý sau cùng.

---

# 11. Stage 5

Clamp

Đảm bảo Attribute hợp lệ.

Ví dụ

```
CRIT

0~100
```

```
PEN

0~100
```

```
CCR

0~90
```

Không cho phép vượt giới hạn.

---

# 12. Modifier Merge

Nếu nhiều Modifier cùng Attribute

↓

Merge

Ví dụ

```
ATK +100

+

ATK +50

=

ATK +150
```

---

# 13. Percent Merge

```
ATK +20%

+

ATK +10%

=

ATK +30%
```

---

# 14. Override Merge

Nếu nhiều Override

↓

Priority cao hơn thắng.

Ví dụ

```
SPD = 0

Priority 1000
```

```
SPD = 50

Priority 500
```

↓

SPD = 0

---

# 15. Immutable

BattleStat là Read Only.

Không được

```
BattleStat.atk +=100
```

Muốn thay đổi

↓

Modifier

↓

Pipeline

↓

BattleStat mới.

---

# 16. Recalculate

Pipeline chỉ chạy khi

```
Battle Start

Modifier Added

Modifier Removed

Modifier Updated
```

Không chạy mỗi Attack.

---

# 17. Cache

BattleStat được Cache.

Nếu Modifier không đổi

↓

Không Recalculate.

---

# 18. Dirty Flag

Mỗi Entity có

```
Dirty Flag
```

Ví dụ

```
Equipment Change

↓

Dirty

↓

Pipeline

↓

Clean
```

---

# 19. Attribute Dependency

Một số Attribute phụ thuộc nhau.

Ví dụ

```
ATK

↓

Burn Damage
```

```
HP

↓

Shield Value
```

Pipeline chỉ tính Attribute.

Derived Stat được tính sau.

---

# 20. Derived Attribute

Không lưu

```
Damage

Heal

Burn

Shield
```

Pipeline chỉ lưu

Battle Stat.

---

# 21. Snapshot

BattleStat là Snapshot.

Trong một Turn

↓

Không đổi.

Nếu có Buff giữa Turn

↓

Đánh dấu Dirty.

↓

Recalculate trước hành động kế tiếp.

---

# 22. Performance

Pipeline phải

```
O(n)
```

Theo số Modifier.

Không được

```
O(n²)
```

---

# 23. Future Extension

Pipeline cho phép thêm

```
Element Damage

Holy Damage

Dark Damage

PvP Modifier

Boss Modifier
```

Không sửa Battle Engine.

---

# 24. AI Instruction

Battle Engine

↓

Không tính Attribute.

Modifier Provider

↓

Không tính BattleStat.

Pipeline

↓

Là nơi duy nhất tính BattleStat.

---

# 25. Sequence Diagram

```
Battle Start

↓

Collect Modifier

↓

Merge Modifier

↓

Flat

↓

Percent

↓

Override

↓

Clamp

↓

BattleStat

↓

Cache

↓

Battle Engine
```

---

# End Of File