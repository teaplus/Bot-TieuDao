# REALM_SPEC

Module: Core Data

Version: 1.0

Status: LOCKED

---

# Purpose

Định nghĩa hệ thống Cảnh Giới.

Realm là Core Definition.

---

# Data Source

realms.json

---

# Responsibilities

Realm chỉ định nghĩa:

- id
- displayName
- order
- nextRealmId

Gameplay quyết định:

- Breakthrough
- Unlock

---

# Used By

Player

Monster

Equipment

Skill

Sect

Dungeon

Shop

Craft

---

# Rules

So sánh Realm bằng order.

Không so sánh bằng tên.

---

# Must NOT

Không Gameplay.

Không Battle.

---

# End