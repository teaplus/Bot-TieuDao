# 014_MODIFIER_PROVIDER.md

# Modifier Provider

Version: 1.0.0

---

# 1. Mục tiêu

Modifier Provider chịu trách nhiệm tạo Modifier.

Provider KHÔNG tính Battle Stat.

Provider KHÔNG biết Damage.

Provider KHÔNG biết Battle Engine.

Provider chỉ trả về

```
List<Modifier>
```

---

# 2. Triết lý

Gameplay

không sửa Battle Stat.

Gameplay

↓

Modifier Provider

↓

Modifier

↓

Modifier Pipeline

↓

Battle Stat

---

# 3. Provider Flow

```
Player

↓

Equipment Provider

↓

Modifier

↓

Pipeline
```

```
Player

↓

Talent Provider

↓

Modifier

↓

Pipeline
```

```
Player

↓

Spirit Root Provider

↓

Modifier

↓

Pipeline
```

Battle Engine

không biết

Modifier đến từ đâu.

---

# 4. Provider Interface

Mọi Provider đều implement

```
ModifierProvider
```

Provider phải có

```
collect()

isEnabled()

priority()
```

---

# 5. Equipment Provider

Nguồn

```
Weapon

Armor

Ring

Accessory
```

Ví dụ

```
Weapon

ATK +150
```

↓

Modifier

```
ATK +150
```

---

# 6. Talent Provider

Ví dụ

```
Blood Thirst

ATK +10%
```

↓

Modifier

```
ATK +10%
```

---

# 7. Spirit Root Provider

Ví dụ

```
Fire Root

Skill Damage +20%
```

↓

Modifier

```
SKD +20%
```

---

# 8. Sect Provider

Ví dụ

```
Kiếm Tông

Sword Damage +15%
```

↓

Modifier

---

# 9. Title Provider

Ví dụ

```
Thiên Kiêu

HP +500
```

↓

Modifier

---

# 10. Buff Provider

Ví dụ

```
ATK Buff

+30%

Duration 2 Turn
```

↓

Modifier

---

# 11. Debuff Provider

Ví dụ

```
ATK Down

-20%

Duration 3 Turn
```

↓

Modifier

---

# 12. Pet Provider

Ví dụ

```
Fire Fox

ATK +5%
```

↓

Modifier

Không ảnh hưởng Battle Engine.

---

# 13. Formation Provider

Ví dụ

```
Tam Tài Trận

DEF +15%
```

↓

Modifier

---

# 14. Guild Provider

Ví dụ

```
Guild Technology

HP +10%
```

↓

Modifier

---

# 15. Weather Provider

Ví dụ

```
Rain

Water Skill +20%

Fire Skill -20%
```

↓

Modifier

---

# 16. Dungeon Provider

Ví dụ

```
Dungeon Buff

Critical +10%
```

↓

Modifier

---

# 17. Provider Priority

Thứ tự

```
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

Title

↓

Pet

↓

Formation

↓

Guild

↓

Weather

↓

Dungeon

↓

Buff

↓

Debuff
```

Không thay đổi.

---

# 18. Provider Lifecycle

Battle Start

↓

Provider Collect

↓

Modifier

↓

Pipeline

↓

Battle Stat

Sau đó

Battle Engine

chỉ đọc Battle Stat.

---

# 19. Battle Update

Nếu

```
Buff

Debuff

Equipment

Title
```

thay đổi

↓

Provider

↓

Collect

↓

Pipeline

↓

Battle Stat

Không sửa trực tiếp.

---

# 20. Future Provider

Framework hỗ trợ

```
Artifact

Wing

Relic

Mount

Skin

Achievement

Season

VIP

Event
```

Không sửa Battle Engine.

---

# 21. AI Instruction

Gameplay

không được

sửa Battle Stat.

Gameplay

chỉ tạo

Modifier Provider.

Provider

chỉ tạo Modifier.

Pipeline

chịu trách nhiệm tính toán.

---

# End Of File