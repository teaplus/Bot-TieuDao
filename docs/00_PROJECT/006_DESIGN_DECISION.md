# 006_DESIGN_DECISION.md

Project: Discord Tu Tiên RPG

Version: 1.0

Status: LOCKED

---

# Purpose

Lưu lại các quyết định thiết kế của dự án.

Tài liệu này giải thích **vì sao** một kiến trúc được lựa chọn.

Không mô tả Gameplay.

Không mô tả Source Code.

---

# Decision 001

Title

Data First Architecture

Status

LOCKED

Decision

Gameplay được mô tả hoàn toàn bằng JSON.

Source Code không chứa Gameplay.

Reason

- Dễ cân bằng game.
- Không cần build lại khi thay đổi gameplay.
- AI có thể sinh code từ dữ liệu.

---

# Decision 002

Title

Single Source Of Truth

Status

LOCKED

Decision

Một loại dữ liệu chỉ được định nghĩa tại một nơi.

Ví dụ

Realm

↓

realms.json

Modifier

↓

modifiers.json

Reward

↓

reward_tables.json

Reason

Tránh dữ liệu trùng lặp.

---

# Decision 003

Title

Battle Runs In Memory

Status

LOCKED

Decision

Battle không đọc Database.

Battle không đọc JSON.

Battle chỉ sử dụng Runtime Data.

Reason

- Hiệu năng.
- Dễ Test.
- Dễ Simulation.

---

# Decision 004

Title

Reward Table

Status

LOCKED

Decision

Toàn bộ Reward sử dụng reward_tables.json.

Áp dụng cho

- Monster
- Gathering
- Quest
- Chest
- Event

Reason

Một hệ thống Reward duy nhất.

---

# Decision 005

Title

Currency

Status

LOCKED

Decision

Currency không phải Item.

Reason

Currency có vòng đời và cách xử lý khác Item.

---

# Decision 006

Title

Monster

Status

LOCKED

Decision

Monster chỉ có

- Realm
- Element
- Variant
- AI
- Skill

Monster không có

- Grade
- Quality

Reason

Grade và Quality chỉ áp dụng cho Equipment và Skill.

---

# Decision 007

Title

Sect

Status

LOCKED

Decision

Sect chỉ mô tả

- Tên
- Hệ
- Passive Effect

Gameplay đổi kỹ năng thuộc Gameplay Module.

Reason

Tách dữ liệu và gameplay.

---

# Decision 008

Title

Gameplay Runtime

Status

LOCKED

Decision

Gameplay sử dụng GameData đã được load.

Không truy vấn JSON trong Runtime.

Reason

Giảm I/O và thống nhất kiến trúc.

---

# Decision 009

Title

Documentation

Status

LOCKED

Decision

Markdown chỉ mô tả

- Rule
- Structure
- Runtime

Gameplay luôn lấy từ JSON.

Reason

JSON là nguồn dữ liệu chuẩn.

---

# Future Decisions

Các quyết định mới chỉ được thêm khi:

- Có thay đổi Architecture.
- Có Design Review.
- Có Version mới.

Không sửa các Decision đã LOCKED.

---

# End Of File