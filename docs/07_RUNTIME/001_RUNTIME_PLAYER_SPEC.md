# RUNTIME_PLAYER_SPEC

Module: Runtime

Version: 1.0

Status: LOCKED

---

# Purpose

Runtime Player lưu toàn bộ trạng thái của người chơi.

---

# Runtime Object

Runtime Player gồm

- playerId
- realmId
- cultivation
- currencies
- inventoryId
- equipmentIds
- skillIds
- activeEffects
- progress

---

# Rules

Không lưu

displayName của Realm

Skill Data

Equipment Template

Item Template

---

# Runtime Flow

Repository

↓

Runtime Player

↓

Gameplay

↓

BattleEntityFactory

---

# Must NOT

Không Battle Logic.

Không Gameplay Logic.

---

# End