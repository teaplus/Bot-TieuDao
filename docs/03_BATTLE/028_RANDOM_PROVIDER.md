# 028_RANDOM_PROVIDER.md

# Random Provider

Version: 1.0.0

---

# 1. Purpose

RandomProvider là nguồn Random duy nhất của Battle.

---

# 2. Responsibility

RandomProvider hỗ trợ

Float

Integer

Percentage

Weight

Shuffle

---

# 3. Seed

Battle chỉ có

Một Seed.

Replay phải sử dụng cùng Seed.

---

# 4. Public API

nextFloat()

nextInt()

roll()

weight()

shuffle()

---

# 5. Rule

Không được sử dụng

Math.random()

---

# 6. AI Instruction

Mọi Gameplay Random đều thông qua RandomProvider.

---

# End Of File