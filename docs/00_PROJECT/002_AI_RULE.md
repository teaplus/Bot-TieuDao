# AI_RULE.md

Project: Discord Tu Tiên RPG

Version: 1.0

Status: LOCKED

---

# Architecture Rules

Không thay đổi Architecture đã khóa.

Không tự tạo Architecture mới.

Không Refactor nếu chưa được yêu cầu.

---

# Data Rules

Không đổi:

- File Name
- JSON Structure
- JSON ID
- Enum
- Naming Convention

trừ khi User yêu cầu.

---

# Gameplay Rules

Không tự:

- thêm Gameplay.
- sửa Gameplay.
- cân bằng Gameplay.

Gameplay luôn lấy từ JSON.

---

# Documentation Rules

Không sửa Markdown nếu User không yêu cầu.

Markdown chỉ mô tả:

- Structure
- Rule
- Runtime

Không mô tả Gameplay ngoài JSON.

---

# Coding Rules

Không Hardcode:

- Skill
- Monster
- Equipment
- Item
- Reward

Gameplay phải đọc từ GameData.

---

# Review Rules

Khi Review Data.

Chỉ kiểm tra:

- Missing Reference
- Invalid Enum
- Invalid ID
- Invalid Logic
- Runtime Risk

Không tự:

- chuẩn hóa.
- tối ưu.
- đổi tên.

---

# Scope Rules

Chỉ thực hiện Task trong PROJECT_TODO.md.

Không làm trước Sprint.

Không triển khai Future Feature.

---

# Lock Rules

Sau khi Module được LOCKED.

Không thay đổi.

Nếu cần thay đổi.

↓

Tạo Version mới.

---

# Response Rules

Nếu có nhiều giải pháp.

↓

Chọn phương án:

- Đơn giản nhất.
- Ít thay đổi nhất.
- Phù hợp Architecture hiện tại nhất.

Không chọn phương án phức tạp nếu Version 1 chưa cần.

---

# End Of File