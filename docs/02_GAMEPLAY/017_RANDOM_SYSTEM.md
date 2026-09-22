# 017_RANDOM_SYSTEM.md

# Random System

Version: 1.0.0

---

# 1. Mục tiêu

Toàn bộ gameplay chỉ sử dụng một hệ thống Random duy nhất.

Không được gọi Math.random() trực tiếp.

---

# 2. Triết lý

Gameplay

↓

RandomProvider

↓

RandomResult

↓

Gameplay

Không module nào tự sinh Random.

---

# 3. Các loại Random

Framework hỗ trợ

- Float
- Integer
- Boolean
- Percentage
- Weight
- Shuffle

---

# 4. Random Float

Ví dụ

0.80 ~ 1.00

Áp dụng

- Damage Variance

---

# 5. Random Integer

Ví dụ

1 ~ 100

Áp dụng

- Loot
- Dungeon
- Monster

---

# 6. Percentage Roll

Ví dụ

CRIT

Burn

Freeze

Poison

Drop

Tất cả đều dùng

roll(percent)

---

# 7. Weighted Random

Ví dụ

Drop Item

Skill AI

Monster Spawn

---

# 8. Seed

Battle có một Seed.

Toàn bộ Random trong Battle sử dụng Seed này.

Giúp

- Replay
- Debug
- Test

---

# 9. Replay

Replay Battle phải sinh kết quả giống hệt.

Không phụ thuộc thời gian hệ thống.

---

# 10. AI Rule

Không sử dụng

Math.random()

Mọi Random phải thông qua

RandomProvider.

---

# End