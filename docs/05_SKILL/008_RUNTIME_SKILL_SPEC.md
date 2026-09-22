# 008_RUNTIME_SKILL_SPEC.md

# Runtime Skill Specification

## Overview

Runtime Skill là đối tượng tạm thời được tạo khi Skill được thi triển.

Runtime Skill không ghi ngược vào dữ liệu gốc.

Skill definition mang `cooldownTurns`; state còn lại thuộc BattleEntity/Battle Context và reset khi tạo battle mới. Cooldown không được ghi vào GameData hoặc Player persistence.

Theo `Q-COMBAT-016` phương án A:

- `SkillManager` chỉ chọn trong các Active Skill đã sẵn sàng.
- Dùng Skill có cooldown `N` khiến Skill đó không thể dùng trong đúng `N` lượt hành động tiếp theo của chính entity.
- Cooldown mới bắt đầu không giảm ngay trong lượt thi triển.
- Nếu còn Skill khác sẵn sàng thì entity dùng Skill đó; chỉ Đánh Thường khi toàn bộ Active Skill phù hợp trigger đang hồi.
- Lượt bị STUN, lượt bị SILENCE chuyển thành Đánh Thường và lượt Đánh Thường đều giảm cooldown ở cuối lượt.
- Runtime phát các event `SKILL_COOLDOWN_STARTED`, `SKILL_COOLDOWN_TICK`, `SKILL_COOLDOWN_READY` phục vụ replay/audit.
- State reset khi tạo battle/wave mới; không persist sang PostgreSQL.

Giá trị `cooldownTurns = 0` hiện vẫn là compatibility cho Skill chưa được author số lượt. `Q-COMBAT-017` chặn riêng việc kích hoạt balance trên 49 Active Skill, không chặn runtime.

## Ưu tiên Skill tự duy trì

Ngưỡng được cấu hình tại `skill_rules.json`:

```json
{
  "activeSkillSelection": {
    "selfSustainPriorityBelowHpPercent": 50
  }
}
```

Sau khi lọc trigger và cooldown, nếu HP hiện tại thấp hơn ngưỡng, `SkillManager` ưu tiên pool Active Skill có action `HEAL`, `ADD_SHIELD` hoặc `SHIELD` nhắm vào `SELF`. Nếu pool này rỗng hoặc toàn bộ Skill tự duy trì đang cooldown, runtime quay lại pool Skill sẵn sàng thông thường. Đúng bằng ngưỡng không kích hoạt ưu tiên.

Quy tắc này chỉ điều khiển Active Skill selection. Passive Defense Skill vẫn tuân theo trigger và condition riêng của Passive Skill.

---

# Runtime Model

```
Runtime Skill
        │
        ▼
Runtime Action[]
        │
        ▼
Execution
        │
        ▼
Destroy
```

---

# Runtime Action

```
Action

Resolved Targets

Formula Result

Action Result
```

---

# Lifecycle

```
Create Runtime Skill

↓

Execute Action

↓

Collect Result

↓

Destroy Runtime Skill
```

---

# Design Rule

Runtime Object:

- Immutable khi có thể
- Chỉ tồn tại trong một lần thi triển Skill
- Không sửa dữ liệu JSON
- Không lưu trạng thái lâu dài
