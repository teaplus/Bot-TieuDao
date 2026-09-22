# 036_SKILL_TRIGGER.md

# Skill Trigger

Version: 1.0.0

---

# 1. Purpose

Trigger Skill là Skill tự động kích hoạt khi xảy ra Battle Event.

Trigger không chiếm lượt.

Không cần người chơi lựa chọn.

---

# 2. Design Philosophy

Battle Event

↓

Trigger Check

↓

Skill Trigger

↓

SkillExecutor

---

# 3. Trigger Event

Framework hỗ trợ

```
BATTLE_START

ROUND_START

TURN_START

TURN_END

BEFORE_ATTACK

AFTER_ATTACK

BEFORE_DAMAGE

AFTER_DAMAGE

RECEIVE_DAMAGE

AFTER_RECEIVE_ATTACK

RECEIVE_CRITICAL

KILL_TARGET

ALLY_DEAD

SELF_DEAD

HP_BELOW

HP_ABOVE

SHIELD_BROKEN

EFFECT_APPLIED
```

---

# 4. Trigger Condition

Trigger có thể kèm điều kiện.

Ví dụ

```
HP < 30%

HP > 80%

Burning

Shield > 0

Target Alive
```

---

# 5. Trigger Frequency

Framework hỗ trợ

```
ALWAYS

ONCE_PER_BATTLE

ONCE_PER_ROUND

ONCE_PER_TURN
```

---

# 6. Multiple Trigger

Một Skill có thể có nhiều Trigger.

Ví dụ

```
HP_BELOW

+

AFTER_RECEIVE_ATTACK

```

Gợi ý:

- `RECEIVE_DAMAGE`: kích hoạt khi nhận sát thương thực tế.
- `AFTER_RECEIVE_ATTACK`: kích hoạt ngay sau khi bị tấn công, kể cả khi sát thương cuối cùng bằng 0 do khiên / miễn thương.

Chỉ cần một Trigger hợp lệ là Skill được kích hoạt.

---

# 7. Trigger Priority

Nếu nhiều Trigger cùng hợp lệ

↓

SkillManager quyết định thứ tự.

---

# 8. Loop Protection

Trigger Skill không được kích hoạt vô hạn.

Ví dụ

```
Receive Damage

↓

Heal

↓

Receive Heal

↓

Receive Damage

...
```

Framework phải chặn vòng lặp.

---

# 9. AI Instruction

Trigger chỉ quyết định

"Khi nào"

không quyết định

"Làm gì"

---

# End Of File
