# BATTLE_ENTITY_FACTORY_SPEC

Module: Runtime

Version: 1.0

Status: LOCKED

---

# Purpose

BattleEntityFactory chuyển Runtime Object thành BattleEntity.

Battle không biết Player hay Monster.

Battle chỉ nhận BattleEntity.

---

# Input

Runtime Player

Runtime Monster

---

# Pipeline

Runtime Object

↓

Resolve Template

↓

Resolve Equipment

↓

Resolve Skill

↓

Resolve Effect

↓

Calculate Battle Stat

↓

BattleEntity

---

# Responsibilities

Factory chịu trách nhiệm

- Resolve Template
- Resolve Equipment
- Resolve Skill
- Resolve Effect
- Build Battle Stat

---

# Output

BattleEntity

---

# Rules

BattleEntity là immutable trong quá trình khởi tạo.

Sau khi khởi tạo xong.

Battle Engine mới thay đổi HP, Shield, Effect...

---

# Dependencies

GameDataManager

Runtime Repository

Formula Engine

---

# Must NOT

Không Battle Logic.

Không Gameplay.

Không Database.

---

# Design Principles

BattleEntityFactory là cầu nối duy nhất giữa Runtime và Battle.

Battle không được đọc Runtime Object trực tiếp.

Gameplay không được tự Build BattleEntity.

---

# End