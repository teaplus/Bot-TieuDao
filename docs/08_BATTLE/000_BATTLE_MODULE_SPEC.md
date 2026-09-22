# BATTLE_MODULE_SPEC

Module: Battle

Version: 2.0

Status: LOCKED

---

# Purpose

Battle Module mô phỏng toàn bộ trận đấu.

Battle chỉ nhận BattleEntity.

Battle không đọc Runtime Object.

Battle không đọc Repository.

Battle không đọc JSON.

---

# Scope

Battle gồm

- Battle Engine
- Battle Context
- Turn Manager
- Skill Manager
- Formula Engine
- Effect Engine
- Battle Result

---

# Input

BattleEntity Team A

BattleEntity Team B

---

# Output

BattleResult

---

# Responsibilities

Battle chỉ:

- Battle Simulation
- Event Generation
- Combat Log

---

# Must NOT

Không Gameplay

Không Reward

Không Inventory

Không Discord

Không Database

---

# Runtime Enforcement

- Battle source không được import `discord.js`, Node filesystem, database adapter hoặc repository.
- Gameplay/runtime tạo battle snapshot qua `BattleEntityFactory`; không khởi tạo `BattleEntity` trực tiếp.
- Randomness được inject dưới contract function trả số trong `[0, 1)`. Simulation/replay dùng shared seeded Random Provider; production có thể inject provider khác mà không đổi battle logic.
- `npm run audit:architecture-boundaries` kiểm tra các dependency boundary và factory gate trên source hiện tại.

---

# End
