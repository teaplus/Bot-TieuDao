# AI_RULE.md

# AI Development Rules

Version 2.0.0

---

# Rule 1

Không redesign Framework.

---

# Rule 2

Không sửa file đã LOCK.

---

# Rule 3

Nếu phát sinh ý tưởng

↓

Đưa vào

Future Backlog.

Không triển khai.

---

# Rule 4

Không tự ý thêm Gameplay.

---

# Rule 5

Chỉ thực hiện Task nằm trong PROJECT_TODO.

---

# Rule 6

Mọi Gameplay đều Data Driven.

---

# Rule 7

Không tạo class riêng cho

FireBall

IceSword

Monster

Boss Skill

Equipment

...

---

# Rule 8

BattleEngine chỉ điều phối.

---

# Rule 9

FormulaEngine chỉ tính toán.

---

# Rule 10

EffectEngine chỉ quản lý Effect.

---

# Rule 11

BattleEntity chỉ lưu Runtime State.

---

# Rule 12

SkillManager quyết định Skill.

SkillExecutor thực thi Skill.

---

# Rule 13

Gameplay phải được mô tả bằng JSON.

Không Hardcode Gameplay.

---

# Rule 14

Không Query Database trong Battle.

---

# Rule 15

Không gọi Discord API trong Battle.

---

# Rule 16

Nếu thay đổi Architecture

↓

Update

- DESIGN_DECISION.md
- CHANGELOG.md
- AI_CONTEXT.md

---

# Rule 17

Khi hoàn thành một Phase

↓

LOCK

↓

Không sửa lại.

---

# Rule 18

Gameplay chỉ được thay đổi trong JSON.

Không sửa Gameplay trực tiếp trong Markdown.

---

# Rule 19

Nếu JSON và Markdown khác nhau.

↓

JSON luôn đúng.

↓

Markdown phải Regenerate.

---

# Rule 20

Markdown chỉ dùng để

- Giải thích Data
- Giải thích Architecture
- Hướng dẫn Developer

Markdown không phải nguồn Gameplay.

---

# Rule 21

Gameplay Data và Runtime Data phải tách biệt.

Gameplay Data

↓

JSON

Runtime Data

↓

Database

Không trộn hai loại dữ liệu.

---

# Rule 22

AI chỉ Review Data.

Không tự chuẩn hóa Data nếu không được yêu cầu.

Không đổi tên.

Không đổi ID.

Không đổi Structure.

Chỉ báo lỗi khi

- Sai Logic
- Sai Reference
- Thiếu Data
- Không thể Runtime

---

# Rule 23

Framework chỉ đọc GameDataRepository.

Không đọc JSON trực tiếp.

Battle không tự Load Data.

---

# Rule 24

Nếu User upload Game Data.

AI phải

↓

Review Data

↓

Kiểm tra Reference

↓

Kiểm tra Logic

↓

Đề xuất lỗi (nếu có)

Không tự tối ưu.

Không tự Refactor.

---

# Rule 25

Ưu tiên

Data

↓

Documentation

↓

Source Code

Không thiết kế Gameplay trong Source Code.

---

# End Of File