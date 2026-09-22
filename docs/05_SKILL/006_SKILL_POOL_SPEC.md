# SKILL_POOL_SPEC

Purpose

Skill Pool định nghĩa tập Skill có thể được lựa chọn.

---

Data Source

skill_pools.json

---

Pool

Element

↓

Category

↓

Grade

↓

Candidate

---

Runtime

Gameplay

↓

Filter Pool

↓

RandomSystem

↓

Skill

---

Rules

Gameplay luôn Filter trước.

RandomSystem chỉ Random.

---

Ví dụ

Element

↓

FIRE

Category

↓

ATTACK

Grade

↓

LOW

↓

Candidate List

↓

Random

---

Must NOT

Không Query Database.

Không Query JSON.

---

End