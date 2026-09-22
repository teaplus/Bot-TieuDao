# RANDOM_SYSTEM_SPEC

Module: Foundation

Version: 1.0

Status: LOCKED

---

# Purpose

Cung cấp hệ thống Random thống nhất cho toàn bộ Runtime.

---

# Responsibilities

- Weight Random
- Percent Random
- Range Random
- Shuffle

---

# Runtime Flow

Gameplay

↓

Candidate List

↓

RandomSystem

↓

Selected Result

---

# Supported Types

Weight

Percent

Range

Shuffle

Boolean

---

# Rules

Weight = 0

↓

Không được chọn.

Percent

0~100

Range

min <= max

---

# Dependencies

Không.

---

# Used By

Gameplay

Battle

Reward

Craft

Drop

---

# Must NOT

Không đọc GameData.

Không Gameplay.

Không Battle Logic.

---

# Notes

Candidate luôn do Gameplay chuẩn bị.

RandomSystem chỉ Random.

---

# End