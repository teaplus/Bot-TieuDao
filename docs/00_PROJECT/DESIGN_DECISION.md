# DESIGN_DECISION.md

# Architecture Decision Record

Version 2.0.0

---

# ADR-001

Title

BattleEngine chỉ điều phối.

Status

🔒 Accepted

Decision

BattleEngine không chứa Gameplay Logic.

Reason

Giảm Coupling.

---

# ADR-002

Title

Skill là Data.

Status

🔒 Accepted

Decision

Không tạo class cho từng Skill.

Reason

Dễ mở rộng bằng JSON.

---

# ADR-003

Title

Weight thuộc BattleEntity.

Status

🔒 Accepted

Decision

Skill không quyết định cách được sử dụng.

BattleEntity quyết định.

Reason

Một Skill có thể được nhiều Player hoặc Monster sử dụng với chiến thuật khác nhau.

---

# ADR-004

Title

Bỏ Cooldown.

Status

🔒 Accepted

Decision

Skill không có Cooldown.

Reason

Gameplay sử dụng Random Weight.

---

# ADR-005

Title

Bỏ Mana.

Status

🔒 Accepted

Decision

Không dùng Mana hoặc Qi Cost.

Reason

Gameplay Version 1 không yêu cầu.

---

# ADR-006

Title

Target thuộc Action.

Status

🔒 Accepted

Decision

Target không nằm ở Skill.

Target thuộc Action.

Reason

Một Skill có thể tác động nhiều mục tiêu khác nhau.

---

# ADR-007

Title

Trigger Skill.

Status

🔒 Accepted

Decision

Skill Trigger kích hoạt bằng Battle Event.

Reason

Hỗ trợ Auto Skill.

Ví dụ

- HP thấp
- Đầu lượt
- Cuối lượt
- Bị đánh

---

# ADR-008

Title

BattleEntity.

Status

🔒 Accepted

Decision

BattleEntity chỉ lưu Runtime State.

Reason

Gameplay được chuyển sang Engine.

---

# ADR-009

Title

FormulaEngine.

Status

🔒 Accepted

Decision

FormulaEngine chỉ tính toán.

Reason

Pure Function.

---

# ADR-010

Title

Version Lock.

Status

🔒 Accepted

Decision

Sau khi hoàn thành một Phase.

↓

LOCK.

Reason

Tránh Redesign liên tục.

---

# ADR-011

Title

Realm Growth Model

Status

🔒 Accepted

Decision

Không lưu chỉ số từng tầng.

Realm chỉ lưu

- Base Attribute
- Growth

Battle tính Runtime.

Formula

Stage Attribute

=

Base

×

Growth^(Stage-1)

Reason

Giảm dữ liệu lặp.

---

# ADR-012

Title

Unified Attribute Structure

Status

🔒 Accepted

Decision

Toàn bộ hệ thống dùng chung cấu trúc Attribute.

Ví dụ

```json
{
    "attributes": {
        "HP": {
            "base": 200,
            "growth": 1.05
        }
    }
}
```

Reason

Một Attribute Parser.

Một Modifier Engine.

Một Formula Engine.

---

# ADR-013

Title

Runtime Attribute Calculation

Status

🔒 Accepted

Decision

Battle luôn tính Runtime.

Không lưu Battle Stat.

Battle Stat

=

Realm

+

Equipment

+

Talent

+

Sect

+

Buff

+

Modifier

↓

Formula Engine

↓

BattleEntity

Reason

Không lưu dữ liệu trung gian.

---

# ADR-014

Title

Single Source Of Truth

Status

🔒 Accepted

Decision

Gameplay chỉ tồn tại dưới dạng JSON.

Excel chỉ phục vụ Designer.

Markdown chỉ phục vụ Documentation.

Battle chỉ đọc JSON.

Reason

Tránh dữ liệu sai khác.

---

# ADR-015

Title

Gameplay Data Normalization

Status

🔒 Accepted

Decision

Không convert Excel 1:1.

Quy trình

Excel

↓

Normalize

↓

JSON

↓

Repository

↓

Battle

Reason

Giảm dữ liệu dư thừa.

---

# ADR-016

Title

Shared Modifier Model

Status

🔒 Accepted

Decision

Talent

Equipment

Sect

Effect

đều sinh Modifier.

Battle chỉ xử lý Modifier.

Reason

Chỉ có một Modifier Engine.

---

# ADR-017

Title

Game Data Repository

Status

🔒 Accepted

Decision

Engine không đọc JSON trực tiếp.

Gameplay

↓

GameDataLoader

↓

GameDataRepository

↓

Engine

Reason

- Cache
- Validate
- Hot Reload
- Thay nguồn dữ liệu trong tương lai

---

# ADR-018

Title

Data First

Status

🔒 Accepted

Decision

Gameplay được thiết kế trên Data trước.

Không thiết kế Gameplay trong Markdown.

Reason

Gameplay là Data.

Documentation chỉ mô tả Data.

---

# ADR-019

Title

Gameplay And Runtime Separation

Status

🔒 Accepted

Decision

Gameplay Data và Runtime Data tách biệt.

Gameplay Data

↓

JSON

Runtime Data

↓

Database

Gameplay Data bao gồm

- Attribute
- Element
- Modifier
- Effect
- Realm
- Talent
- Skill
- Equipment
- Sect
- Monster
- Dungeon
- Item

Runtime Data bao gồm

- Player
- Inventory
- Currency
- Mail
- Quest
- Cooldown
- Dungeon Progress
- Statistics

Reason

Gameplay ít thay đổi.

Runtime thay đổi liên tục.

---

# ADR-020

Title

Markdown Generated From Data

Status

🔒 Accepted

Decision

Markdown không phải nguồn dữ liệu.

Markdown được regenerate từ JSON.

Quy trình

Gameplay

↓

JSON

↓

Markdown

↓

Developer

Reason

Không để Documentation lệch Gameplay.

---

# ADR-021

Title

Monster Model

Status

🔒 Accepted

Decision

Monster không có

- Grade
- Quality

Monster chỉ có

- Realm
- Element
- Variant
- Skills
- AI

Reason

Grade và Quality chỉ áp dụng cho

- Skill
- Equipment

---

# ADR-022

Title

Equipment Model

Status

🔒 Accepted

Decision

Equipment gồm

- Type
- Grade
- Quality
- Required Realm
- Base Attribute
- Random Affix

Gameplay không tạo Weapon Class.

Reason

Equipment hoàn toàn Data Driven.

---

# ADR-023

Title

Skill Selection

Status

🔒 Accepted

Decision

Skill được chọn bằng Weight.

Weight thuộc BattleEntity.

Skill không chứa AI.

Reason

Player và Monster dùng chung Skill.

---

# ADR-024

Title

Monster Drop

Status

🔒 Accepted

Decision

Monster Drop được cấu hình bằng Data.

Bao gồm

- Spirit Stone
- Equipment
- Item

Equipment sử dụng Realm Offset.

Item tự chứa Drop Rate.

Variant chỉ nhân Drop Rate.

Reason

Không cần DropTable riêng cho từng Monster.

---

# ADR-025

Title

Version 1 Boundary

Status

🔒 Accepted

Decision

Version 1 chỉ hoàn thành Framework.

Không mở rộng Gameplay ngoài JSON hiện có.

Nếu phát sinh ý tưởng

↓

Future Backlog

Không triển khai.

Reason

Giữ kiến trúc ổn định.

---

# End Of File