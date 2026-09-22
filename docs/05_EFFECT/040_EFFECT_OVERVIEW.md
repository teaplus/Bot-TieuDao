# Effect Framework Overview

Version: 1.0.0

---

# 1. Purpose

Effect Framework định nghĩa toàn bộ hệ thống Buff, Debuff, DOT, HOT trong Battle.

Effect Framework được thiết kế theo hướng Data Driven.

Effect chỉ là dữ liệu.

EffectEngine chịu trách nhiệm quản lý.

SkillExecutor không trực tiếp quản lý Effect.

---

# 2. Design Philosophy

Effect không chứa code.

Effect chỉ mô tả:

- Effect làm gì
- Khi nào được áp dụng
- Tác động như thế nào

EffectEngine chỉ điều phối.

ActionExecutor tạo Effect.

EffectEngine áp dụng & tick.

---

# 3. Effect Architecture

```
SkillAction (APPLY_EFFECT)

↓

EffectFactory (Parse & Validate)

↓

EffectDefinition (Model)

↓

EffectEngine (Apply, Tick, Remove)

↓

BattleEntity (State)

↓

Battle Result
```

---

# 4. Effect Categories

Framework chia Effect thành 3 nhóm.

## Buff

Tác động tích cực.

Ví dụ

- Tăng Công
- Tăng Máu
- Tăng Crit
- Bảo vệ

Buff được lắng nghe từ SkillAction.

---

## Debuff

Tác động tiêu cực.

Ví dụ

- Giảm Công
- Giảm Máu
- Burn
- Freeze
- Stun

Debuff được lắng nghe từ SkillAction.

---

## Passive Effect

Luôn có hiệu lực.

Ví dụ

- Immunity
- Reflection
- Lifesteal

Passive được áp dụng khi Battle bắt đầu.

---

# 5. Effect Types

Framework hỗ trợ các loại Effect.

## Instant Effect

Áp dụng ngay.

Ví dụ

- Tăng Công +20
- Giảm Máu 30%

Không có Duration.

---

## Duration Effect

Có thời gian sống.

Ví dụ

- Burn 3 turn
- Freeze 2 turn

Mỗi turn sẽ tick.

---

## DOT (Damage Over Time)

Gây sát thương mỗi turn.

Ví dụ

- Burn: 10% ATK/turn
- Bleeding: 5% ATK/turn

Tick mỗi turn end.

---

## HOT (Heal Over Time)

Hồi máu mỗi turn.

Ví dụ

- Regeneration: 5% Max HP/turn

Tick mỗi turn end.

---

## Control Effect

Kiểm soát Entity.

Ví dụ

- Stun (không thể hành động)
- Freeze (không thể di chuyển)
- Silence (không thể sử dụng skill)

Control thay đổi hành vi.

---

# 6. Effect Stack

Một Effect có thể stack.

Ví dụ

```
Burn 1 (10% ATK)

+

Burn 2 (10% ATK)

=

Burn 2 (20% ATK)
```

Hoặc

```
Burn 1 (10% ATK, 3 turn)

+

Burn 2 (10% ATK, 2 turn)

=

Burn 1 + Burn 2 (2 stack)
```

Stack Rule được định nghĩa trong EffectDefinition.

---

# 7. Effect Duration

Effect có thời gian sống (tính bằng turn).

Khi duration hết

↓

Effect bị remove.

EffectEngine tự động handle.

---

# 8. Effect Tick

Mỗi turn end

↓

EffectEngine tick tất cả Duration Effect.

↓

Duration - 1.

↓

Nếu duration = 0 → remove.

---

# 9. Effect Cascade

Khi apply Effect

↓

Có thể trigger Passive Effect.

Ví dụ

```
Apply Burn

↓

Trigger Immunity

↓

Burn không được áp dụng

↓

Immunity remove
```

---

# 10. Effect Removal

Effect có thể bị remove bằng

```
Manual Remove (REMOVE_EFFECT Action)

↓

Cleanse (DISPEL Action)

↓

Purify (PURIFY Action)

↓

Duration Expire

↓

Replace by new Effect
```

---

# 11. Passive Skill Effect

Passive Skill có thể apply Passive Effect.

Ví dụ

```
Bloodlust Passive

↓

Apply Passive Effect

↓

+20% ATK when HP < 50%

↓

Always Active
```

Passive Effect không tick.

---

# 12. Effect Priority

Nếu nhiều Effect cùng trigger

↓

EffectEngine quyết định thứ tự.

---

# 13. Effect Condition

Effect có thể chỉ áp dụng khi đủ điều kiện.

Ví dụ

```
HP > 50%

Không bị Debuff

Shield Active
```

Nếu điều kiện không thỏa

↓

Effect không được áp dụng.

---

# 14. Data Driven

Không tạo class riêng cho từng Effect.

Mọi Effect được định nghĩa bằng JSON.

EffectFactory parse JSON.

EffectEngine thực thi.

---

# 15. Complete Workflow

```
SkillAction (APPLY_EFFECT with effect code)

↓

EffectFactory (Lookup & Create)

↓

EffectDefinition (Model)

↓

EffectEngine.apply()

↓

Check Condition

↓

Check Resistance

↓

Apply to Target

↓

Add to BattleEntity.effects[]

↓

Tick mỗi Turn End

↓

Remove khi Duration expire
```

---

End Of File
