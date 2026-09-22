# APPLICATION_MODULE_SPEC

Module: Application

Version: 1.0

Status: LOCKED

---

# Purpose

Application Layer là lớp giao tiếp giữa User và Gameplay.

Application không chứa Gameplay.

Application không chứa Battle.

Application chỉ:

- Nhận Request
- Validate
- Gọi Gameplay
- Render Response

---

# Responsibilities

- Command
- Session
- Message
- Interaction
- Scheduler
- Error Handler

---

# Runtime Pipeline

User

↓

Application

↓

Gameplay

↓

Battle (optional)

↓

Gameplay

↓

Application

↓

User

---

# Dependencies

Gameplay

---

# Must NOT

Không Formula

Không Damage

Không Reward

Không Inventory Logic

---

# End