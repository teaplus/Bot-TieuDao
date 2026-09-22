# 032_SKILL_OVERVIEW.md

# Skill Framework Overview

Version: 2.0.0

---

# 1. Purpose

Skill Framework định nghĩa toàn bộ cơ chế kỹ năng trong Battle.

Skill Framework được thiết kế theo hướng Data Driven.

Skill chỉ là dữ liệu.

SkillExecutor chịu trách nhiệm thực thi.

BattleEngine không biết nội dung của từng Skill.

---

# 2. Design Philosophy

Skill không chứa code.

Skill chỉ mô tả:

- Kỹ năng làm gì
- Khi nào được kích hoạt
- Tác động lên mục tiêu như thế nào

BattleEngine chỉ điều phối.

SkillExecutor đọc Skill Definition và thực thi.

---

# 3. Skill Flow

```
Skill Definition

↓

Skill Manager

↓

Skill Executor

↓

Formula Engine

↓

Combat Result

↓

Effect Engine

↓

Battle Result
```

---

# 4. Skill Categories

Framework chia Skill thành 3 nhóm.

## Active Skill

Được sử dụng khi tới lượt hành động.

BattleEntity sẽ random giữa:

- Đánh thường
- Active Skill

theo Weight.

---

## Passive Skill

Luôn có hiệu lực.

Ví dụ

- Tăng Công
- Tăng Máu
- Tăng Burn Damage
- Tăng Crit Damage

Passive được áp dụng ngay khi Battle bắt đầu.

---

## Trigger Skill

Tự động kích hoạt khi xảy ra điều kiện.

Không chiếm lượt.

Không cần chọn thủ công.

---

# 5. Trigger Skill

Trigger Skill được kích hoạt thông qua Battle Event.

Ví dụ

```
Battle Start

Round Start

Turn Start

Turn End

Before Attack

After Attack

Before Damage

After Damage

Receive Damage

Receive Critical

Kill Enemy

Ally Dead

Self Dead

HP Below %

HP Above %

Shield Broken

Effect Applied

Effect Removed
```

Framework cho phép mở rộng Trigger Event.

---

# 6. Skill Definition

Mỗi Skill chỉ mô tả dữ liệu.

Bao gồm

```
Basic Information

↓

Activation

↓

Target

↓

Actions

↓

Tags

↓

Metadata
```

Skill không chứa Gameplay Logic.

---

# 7. Skill Execution

SkillExecutor chỉ đọc Skill.

SkillExecutor không biết

- Fire Ball
- Kiếm Trảm
- Lôi Kiếp

Executor chỉ thực thi Action.

---

# 8. Skill Action

Một Skill có thể gồm nhiều Action.

Ví dụ

```
Damage

↓

Apply Burn

↓

Heal Self

↓

Add Shield

↓

Remove Buff
```

Action luôn được thực hiện theo đúng thứ tự.

---

# 9. Weight System

Weight không thuộc Skill.

Weight thuộc BattleEntity.

Ví dụ

```
Đánh thường      40

Hỏa Cầu          30

Hỏa Long         20

Hỏa Liên         10
```

Skill Definition không biết cách BattleEntity lựa chọn Skill.

---

# 10. Target

Target được định nghĩa trong Skill.

TargetSelector chịu trách nhiệm chọn mục tiêu.

SkillExecutor không tự tìm Target.

---

# 11. Formula

Skill không chứa công thức.

Skill chỉ định nghĩa

- Multiplier
- Formula Type

FormulaEngine chịu trách nhiệm tính toán.

---

# 12. Effect

Skill không trực tiếp thêm Buff.

Skill chỉ định nghĩa Effect.

EffectEngine chịu trách nhiệm:

- Apply
- Tick
- Remove

---

# 13. Data Driven

Không tạo class riêng cho từng Skill.

---

# 14. Skill Factory

Mọi Skill được tạo thông qua SkillFactory.

SkillFactory parse JSON định dạng chuẩn.

SkillFactory validate Structure.

SkillFactory tạo SkillDefinition.

```
skill.json

↓

SkillFactory.create()

↓

SkillDefinition

↓

SkillManager
```

---

# 15. Skill JSON Format

Mỗi Skill được định nghĩa bằng JSON.

```json
{
  "id": 10001,
  "code": "FIREBALL",
  "name": "Hỏa Diễm Quyết",
  "activation": "ACTIVE",
  "actions": [
    { "type": "DAMAGE", ... },
    { "type": "APPLY_EFFECT", ... }
  ],
  "tags": ["fire", "damage"],
  "metadata": {}
}
```

JSON Format được định nghĩa tại 039_SKILL_JSON_SPEC.md

---

# 16. Complete Workflow

```
skill.json (Data)

↓

SkillFactory (Parse & Validate)

↓

SkillDefinition (Model)

↓

SkillManager (Manage & Select)

↓

SkillExecutor (Execute Actions)

↓

FormulaEngine (Calculate Damage)

↓

EffectEngine (Manage Buffs)

↓

Battle Result
```

---

End Of File

Sai

```
FireBallSkill

IceSwordSkill

ThunderStrikeSkill
```

Đúng

```
skill.json

↓

SkillDefinition

↓

SkillExecutor
```

---

# 14. Design Principles

Skill Framework phải đảm bảo

✓ Data Driven

✓ Không Hardcode

✓ Không phụ thuộc BattleEngine

✓ Có thể mở rộng bằng JSON

✓ Không cần sửa source khi thêm Skill mới

---

# 15. Future Extension

Framework hỗ trợ mở rộng

- Combo Skill
- Chain Skill
- Counter Attack
- Follow Up Attack
- Domain Skill
- Transformation Skill

không cần sửa BattleEngine.

---

# 16. AI Instruction

Khi sinh source code.

- Skill là dữ liệu.
- SkillManager quyết định Skill nào sẽ được sử dụng.
- SkillExecutor thực thi Skill.
- FormulaEngine tính toán.
- EffectEngine xử lý Buff và Debuff.
- BattleEngine chỉ điều phối.

Không tạo class riêng cho từng Skill.

---

# End Of File