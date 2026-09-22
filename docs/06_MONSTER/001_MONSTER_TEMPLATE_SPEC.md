# MONSTER_TEMPLATE_SPEC

Purpose

Định nghĩa Monster Template.

---

# Data Source

monster_templates.json

---

# Responsibilities

Monster gồm

- id
- displayName
- realmId
- elementId
- baseAttributes
- skillIds
- aiId
- rewardTableId
- variant

---

# Runtime

Monster Template

↓

Runtime Monster

---

# Base Attribute

Base Attribute luôn lấy theo Realm tầng 1.

Monster chỉ cộng Modifier nếu Data yêu cầu.

---

# Reward

Monster không chứa Drop.

Monster chỉ tham chiếu

rewardTableId

`rewardTableId` có thể là reward table ID trực tiếp hoặc alias được khai báo tại `monster_rules.json`.

Alias `BY_REALM_ORDER` phải chứa mapping tường minh từ `realm.order` sang reward table ID.
Với `BASIC_MONSTER_DROP`, mapping và Reward Table được sinh từ
`monster/monster_reward_scaling.json`; `monster_rules.json` chỉ khai báo alias identity,
strategy và source config.

Runtime Monster lưu ID đã resolve, không lưu alias. Không được ghép tên reward table hoặc
so sánh tên cảnh giới trong gameplay service.

Validator phải từ chối alias thiếu mapping cho realm của template hoặc mapping tới reward table không tồn tại.

Chi tiết generator và currency formula: `004_MONSTER_REWARD_SCALING_SPEC.md`.

---

# Used By

Battle

Dungeon

Reward

---

# Must NOT

Không Grade

Không Quality

Không Runtime State

---

# End
