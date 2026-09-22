# 035_SKILL_TARGETING.md

# Skill Targeting

Version: 1.0.0

---

# 1. Purpose

SkillTargeting định nghĩa cách một Action chọn mục tiêu.

SkillExecutor không tự tìm mục tiêu.

TargetSelector chịu trách nhiệm trả về danh sách BattleEntity phù hợp.

---

# 2. Design Philosophy

Một Action

↓

Một Target

↓

Một danh sách BattleEntity

SkillExecutor luôn làm việc với List<BattleEntity>.

Ngay cả khi chỉ có một mục tiêu.

---

# 3. Target Types

Framework hỗ trợ các Target sau

```
SELF

ALLY

ENEMY

ALL_ALLY

ALL_ENEMY

RANDOM_ALLY

RANDOM_ENEMY

LOWEST_HP_ALLY

LOWEST_HP_ENEMY

HIGHEST_HP_ALLY

HIGHEST_HP_ENEMY

HIGHEST_ATK_ALLY

HIGHEST_ATK_ENEMY

LOWEST_ATK_ALLY

LOWEST_ATK_ENEMY
```

---

# 4. Alive Filter

Mặc định

Target chỉ chọn Entity còn sống.

Nếu Action cần hồi sinh

↓

Target phải cho phép

```
DEAD_ALLY
```

---

# 5. Ignore Self

Một số Target không bao gồm bản thân.

Ví dụ

```
ALLY

↓

Không gồm SELF
```

---

# 6. Target Result

TargetSelector luôn trả về

```
List<BattleEntity>
```

Ví dụ

```
SELF

↓

[Player]

ALL_ENEMY

↓

[Monster1, Monster2, Monster3]
```

---

# 7. Empty Target

Nếu không có mục tiêu hợp lệ

↓

Action bị bỏ qua.

Skill vẫn tiếp tục Action tiếp theo.

---

# 8. Future Extension

Có thể mở rộng

```
LOWEST_DEF

HIGHEST_DEF

BURNING_TARGET

FROZEN_TARGET

TAG_FILTER
```

Không cần sửa SkillExecutor.

---

# 9. AI Instruction

TargetSelector chỉ chọn mục tiêu.

Không tính Damage.

Không Apply Effect.

---

# End Of File