# 013_MODIFIER_SYSTEM.md

# Modifier System

Version: 1.0.0

---

# 1. Mục tiêu

Toàn bộ thay đổi Attribute trong game phải đi qua Modifier System.

Không được phép thay đổi trực tiếp Battle Stat.

Ví dụ

❌ Sai

```js
player.stats.atk += 100;
```

Đúng

```js
modifierPipeline.addModifier(
    new FlatModifier("ATK",100)
);
```

Battle Engine chỉ đọc Final Battle Stat.

---

# 2. Design Philosophy

Gameplay không chỉnh sửa chỉ số.

Gameplay chỉ tạo Modifier.

Modifier Pipeline chịu trách nhiệm tính toán.

```
Equipment

↓

Modifier

↓

Pipeline

↓

Battle Stat
```

Battle Engine không biết Modifier đến từ đâu.

---

# 3. Modifier Definition

Modifier là một đối tượng mô tả sự thay đổi của Attribute.

Modifier KHÔNG chứa Gameplay.

Modifier KHÔNG chứa Battle Logic.

Modifier chỉ chứa

```
Attribute

Operation

Value

Priority

Duration

Source
```

---

# 4. Modifier Structure

Một Modifier gồm

| Thuộc tính | Ý nghĩa |
|------------|----------|
| id | UUID |
| source | Equipment, Buff... |
| attribute | ATK, DEF... |
| operation | ADD, MULTIPLY... |
| value | Giá trị |
| priority | Thứ tự áp dụng |
| duration | Số Turn |
| stackable | Có cộng dồn không |

---

# 5. Modifier Source

Modifier có thể đến từ

```
Base Stat

Equipment

Cultivation

Spirit Root

Talent

Sect

Title

Pet

Artifact

Formation

Guild Buff

Battle Buff

Battle Debuff

Dungeon

Map

Weather

Event
```

Battle Engine không cần biết nguồn.

---

# 6. Modifier Operation

Framework hỗ trợ

```
SET

ADD

SUBTRACT

MULTIPLY

DIVIDE

OVERRIDE
```

Ví dụ

```
ATK +100

↓

ADD
```

```
ATK +20%

↓

MULTIPLY
```

```
SPD = 0

↓

SET
```

---

# 7. Modifier Priority

Priority càng nhỏ

↓

Áp dụng trước.

```
100

Base

↓

200

Equipment

↓

300

Cultivation

↓

400

Spirit Root

↓

500

Talent

↓

600

Sect

↓

700

Title

↓

800

Buff

↓

900

Debuff
```

Không thay đổi.

---

# 8. Flat Modifier

Ví dụ

```
ATK +100

HP +500

DEF +80
```

Áp dụng trước Percent.

---

# 9. Percent Modifier

Ví dụ

```
ATK +20%

DEF +15%

HP +50%
```

Áp dụng sau Flat.

---

# 10. Override Modifier

Ví dụ

```
SPD = 0
```

Ví dụ

Freeze.

Override luôn có Priority cao nhất.

---

# 11. Modifier Duration

Modifier có

```
Permanent

Temporary
```

Permanent

Ví dụ

Equipment

Talent

Cultivation

Temporary

Ví dụ

Buff

Debuff

---

# 12. Stack Rule

Modifier có thể

```
Stackable

Non Stackable
```

Nếu Stackable

↓

Cộng Value.

Ví dụ

```
ATK +100

+

ATK +50

=

ATK +150
```

---

# 13. Refresh Rule

Modifier có

```
Refresh Duration
```

Ví dụ

Burn

3 Turn

↓

Apply tiếp

↓

Refresh về 3 Turn.

Hoặc

↓

Stack

tùy Effect định nghĩa.

---

# 14. Modifier Pipeline

Pipeline luôn tính theo thứ tự

```
Base

↓

Flat

↓

Percent

↓

Override

↓

Battle Stat
```

Không đổi.

---

# 15. Recalculate

Battle Stat chỉ được Recalculate khi

```
Modifier Added

Modifier Removed

Modifier Updated

Battle Start

Battle End
```

Không tính lại mỗi Attack.

---

# 16. Modifier Cache

Pipeline phải Cache.

Ví dụ

```
ATK

↓

Cache
```

Khi Modifier không đổi

↓

Không Recalculate.

---

# 17. Modifier Group

Modifier được nhóm theo

```
Equipment

Buff

Debuff

Talent

Spirit Root

Sect
```

Không trộn.

---

# 18. Modifier Conflict

Nếu hai Modifier cùng

```
SET
```

↓

Modifier Priority cao hơn thắng.

Ví dụ

```
SPD = 0

↓

Freeze

Priority 1000
```

```
SPD = 50

↓

Buff

Priority 500
```

↓

Freeze thắng.

---

# 19. Immutable Rule

Battle Stat

↓

Read Only

Gameplay

không sửa.

Gameplay chỉ

```
Add Modifier

Remove Modifier
```

---

# 20. Modifier Lifecycle

```
Create

↓

Register

↓

Pipeline

↓

Battle Stat

↓

Expire

↓

Remove
```

---

# 21. Attribute Rebuild

Khi Modifier thay đổi

↓

Pipeline

↓

Rebuild

↓

Battle Stat

Không sửa từng Stat.

---

# 22. Future Extension

Framework cho phép

```
Aura

Weather

Map Effect

Formation

Guild Skill

Artifact

Pet

Relic
```

Không sửa Pipeline.

Chỉ tạo Modifier mới.

---

# 23. AI Instruction

AI phải

✓ Không sửa Battle Stat trực tiếp.

✓ Gameplay luôn tạo Modifier.

✓ Battle Engine chỉ đọc Battle Stat.

✓ Modifier là nguồn duy nhất thay đổi Attribute.

Nếu có xung đột

↓

Modifier System ưu tiên.

---

# 24. Example

Equipment

```
ATK +150
```

↓

FlatModifier

↓

Pipeline

↓

Battle Stat

Buff

```
ATK +20%
```

↓

PercentModifier

↓

Pipeline

↓

Battle Stat

Battle Engine

↓

stats.getFinal("ATK")

---

# End of File