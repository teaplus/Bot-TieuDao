# 037_SKILL_MANAGER.md

# Skill Manager

Version: 1.0.0

---

# 1. Purpose

SkillManager quản lý toàn bộ Skill của BattleEntity.

BattleEngine không trực tiếp thao tác với Skill.

---

# 2. Responsibility

SkillManager chịu trách nhiệm

- Quản lý danh sách Skill
- Chọn Active Skill
- Kiểm tra Trigger Skill
- Quản lý Passive Skill

---

# 3. Skill Set

BattleEntity gồm

```
Basic Attack

Active Skills

Passive Skills

Trigger Skills
```

---

# 4. Active Skill

Đến lượt hành động

↓

Random giữa

```
Basic Attack

+

Active Skills
```

Theo Weight.

Weight thuộc BattleEntity.

Không thuộc Skill.

---

# 5. Passive Skill

Passive luôn có hiệu lực.

Không cần kích hoạt.

---

# 6. Trigger Skill

SkillManager lắng nghe Battle Event.

Nếu Trigger hợp lệ

↓

Gọi SkillExecutor.

---

# 7. Skill Selection

Quy trình

```
Trigger Check

↓

Nếu có Trigger

↓

Cast Trigger

↓

Nếu không

↓

Roll Weight

↓

Basic Attack hoặc Active Skill
```

---

# 8. Weight Rule

Ví dụ

```
Đánh thường

40

Hỏa Cầu

30

Kiếm Trảm

20

Lôi Phạt

10
```

SkillManager Random.

---

# 9. Learn Skill

BattleEntity có thể

```
Learn

Forget

Replace
```

Skill.

---

# 10. Public API

```
learn()

forget()

getSkill()

rollActiveSkill()

checkTrigger()

getPassiveSkills()
```

---

# 11. AI Instruction

SkillManager chỉ quyết định

"Sử dụng Skill nào"

Không thực thi Skill.

---

# End Of File