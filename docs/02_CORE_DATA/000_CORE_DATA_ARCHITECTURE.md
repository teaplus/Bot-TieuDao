# Core Data Architecture

Version: 2.0

---

# 1. Overview

Core Data là nền tảng của toàn bộ Gameplay.

Mọi hệ thống trong game đều phải được xây dựng dựa trên Core Data.

Bao gồm:

- Skill
- Monster
- Equipment
- Talent
- Battle
- AI
- Shop
- Craft
- Reward

Core Data không phụ thuộc vào Runtime.

Core Data không phụ thuộc vào Engine.

Core Data chỉ mô tả Domain.

---

# 2. Design Philosophy

Core Data được thiết kế theo các nguyên tắc:

- Data First
- Data Driven
- Immutable
- Reference Based
- Schema Validated
- Engine Agnostic

Gameplay được mô tả bằng Data.

Engine chỉ đọc Data.

# 2.x. Quy tắc tương thích dữ liệu

Core Data hiện tại được xem là đã khóa.

Mọi thay đổi trong Implementation phải tương thích với Core Data hiện có.

Không sửa Core Data để phù hợp với Code.

Luôn sửa Code để phù hợp với Core Data.

Khả năng tương thích ngược (Backward Compatibility) là bắt buộc.
---

# 3. Dependency Rule

Core Data

↓

Runtime

↓

Battle Engine

↓

Application

Không được phụ thuộc ngược.

---

# 4. Domain Model

Core Data được chia thành các Domain độc lập.

```
Attributes

Elements

Targets

Conditions

Effects

Formulas

Modifiers

↓

Actions

↓

Skills

↓

Monsters

Equipment

Talents
```

Domain phía trên không được tham chiếu Domain phía dưới.

Ví dụ

Effect không được biết Skill.

Formula không được biết Monster.

Modifier không được biết Equipment.

---

# 5. Foundation Domain

Foundation Domain bao gồm:

- Attributes
- Elements
- Targets
- Conditions
- Effects
- Formulas
- Modifiers

Đây là DSL (Domain Specific Language) của game.

Mọi Gameplay đều được xây dựng từ các Domain này.

---

# 6. Reference Rule

Core Data luôn sử dụng Reference.

Ví dụ

GOOD

```json
{
    "formula":"physical_damage"
}
```

BAD

```json
{
    "formula":{
        ...
    }
}
```

Không embed object.

---

# 7. Runtime Rule

Core Data không lưu Runtime State.

Không lưu:

- currentHp
- currentShield
- currentTurn
- cooldown
- stack
- battleStatus

Runtime thuộc Runtime Model.

---

# 8. Single Responsibility Rule

Một Domain chỉ mô tả một khái niệm.

Ví dụ

Effects

↓

chỉ mô tả Effect.

Không mô tả Formula.

Không mô tả Target.

Không mô tả Skill.

---

# 9. Validation Rule

Mọi JSON phải trải qua Pipeline:

```
Load

↓

Schema Validation

↓

Reference Validation

↓

Registry

↓

Ready
```

Không sử dụng trực tiếp JSON sau khi Load.

---

# 10. Naming Convention

ID sử dụng:

UPPER_SNAKE_CASE

Ví dụ

HP

ATK

FIRE

ENEMY_SINGLE

ADD_MODIFIER

REMOVE_MODIFIER

PHYSICAL_DAMAGE

Không sử dụng khoảng trắng.

Không sử dụng tiếng Việt.

---

# 11. File Organization

```
attributes/

elements/

targets/

conditions/

effects/

formulas/

modifiers/

skills/

monsters/

equipment/

talents/
```

Mỗi thư mục chỉ chứa một Domain.

---

# 12. Extension Rule

Khi cần mở rộng Gameplay:

Ưu tiên:

- Mở rộng Core Data.
- Mở rộng Runtime khi thật sự cần.
- Chỉ mở rộng Engine khi Core Data không thể biểu diễn được Gameplay.

Không sửa Core Data hiện có nếu không phải lỗi nghiêm trọng.

Ưu tiên bổ sung thay vì thay thế.

Ví dụ

Thêm Skill

↓

skills/

Thêm Formula

↓

formulas/

Thêm Effect

↓

effects/

Battle Engine không thay đổi.

---

# 13. Design Goals

Core Data phải đảm bảo:

✓ Có thể validate

✓ Có thể serialize

✓ Có thể version

✓ Có thể mở rộng

✓ Không phụ thuộc Runtime

✓ Không phụ thuộc Battle

✓ Không phụ thuộc UI

---

# 14. Summary

Core Data là nguồn dữ liệu duy nhất của Gameplay.

Gameplay không được hardcode.

Battle Engine không chứa Gameplay Logic.

Runtime không ghi ngược vào Core Data.

Core Data là nền tảng của toàn bộ Framework.