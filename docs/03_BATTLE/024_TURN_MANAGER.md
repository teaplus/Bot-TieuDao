# 024_TURN_MANAGER.md

# Turn Manager

Version: 1.0.0

---

# 1. Purpose

TurnManager chịu trách nhiệm xác định thứ tự hành động của các BattleEntity.

TurnManager không xử lý Skill.

Không xử lý Damage.

Không xử lý Buff.

---

# 2. Responsibility

TurnManager chỉ chịu trách nhiệm

- Sinh Turn Order
- Chuyển Turn
- Chuyển Round
- Bỏ qua Entity đã chết
- Kiểm tra Entity có thể hành động

---

# 3. Turn Order

Thứ tự được tính theo

SPD giảm dần.

Ví dụ

```
Player A   SPD 120

Monster A  SPD 95

Monster B  SPD 80
```

↓

```
Player A

Monster A

Monster B
```

---

# 4. Tie Rule

Nếu SPD bằng nhau

↓

RandomProvider quyết định.

---

# 5. Turn Lifecycle

```
Round Start

↓

Build Turn Order

↓

Turn Start

↓

Execute

↓

Turn End

↓

Next Turn
```

---

# 6. Skip Rule

Entity sẽ bị bỏ lượt nếu

- Dead
- Freeze
- Stun

Không tạo Turn mới.

---

# 7. New Round

Khi tất cả Entity hoàn thành lượt

↓

Round++

↓

Rebuild Turn Order

---

# 8. Speed Update

Nếu SPD thay đổi trong Battle

↓

Không cập nhật ngay.

↓

Áp dụng từ Round tiếp theo.

Mục đích

- Tránh thay đổi Turn giữa chừng.
- Đơn giản hóa Battle.

---

# 9. Public API

```
buildTurnOrder()

getCurrent()

nextTurn()

nextRound()

isRoundFinished()
```

---

# 10. AI Instruction

TurnManager chỉ quản lý thứ tự lượt.

Không xử lý Gameplay.

---

# End Of File