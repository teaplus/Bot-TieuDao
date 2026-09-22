# 034_SKILL_ACTION.md

# Skill Action

Version: 1.0.0

---

# 1. Purpose

Action là đơn vị nhỏ nhất của một Skill.

Skill không trực tiếp gây Damage.

Skill chỉ là tập hợp nhiều Action.

SkillExecutor sẽ thực hiện từng Action theo đúng thứ tự.

---

# 2. Design Philosophy

```
Skill

↓

Action 1

↓

Action 2

↓

Action 3

↓

...

↓

Finish
```

Một Action chỉ thực hiện đúng một nhiệm vụ.

Không có Action làm nhiều việc.

---

# 3. Action Structure

Mỗi Action gồm

```
Action

├── type

├── target

├── params

├── conditions

└── metadata
```

---

# 4. type

Xác định Action làm gì.

Ví dụ

```
DAMAGE

HEAL

SHIELD

APPLY_EFFECT

REMOVE_EFFECT

DISPEL

PURIFY

REVIVE

SUMMON

CHANGE_ATTRIBUTE
```

Framework có thể mở rộng thêm Action mới.

---

# 5. target

Target chỉ áp dụng cho Action hiện tại.

Ví dụ

```
SELF

ALLY

ENEMY

ALL_ALLY

ALL_ENEMY

RANDOM_ENEMY

LOWEST_HP_ALLY

HIGHEST_ATK_ENEMY
```

Một Skill có thể có nhiều Target khác nhau.

Ví dụ

```
Action 1

↓

ENEMY

Action 2

↓

SELF

Action 3

↓

ALL_ENEMY
```

---

# 6. params

Mỗi Action có tham số riêng.

Ví dụ

Damage

```
multiplier

formula

element
```

Heal

```
multiplier
```

Shield

```
multiplier

duration
```

Apply Effect

```
effectId

chance

duration

stack
```

---

# 7. conditions

Action có thể chỉ thực hiện khi đủ điều kiện.

Ví dụ

```
Target HP < 30%

Caster HP > 50%

Critical Hit

Target Burning
```

Nếu điều kiện không thỏa

↓

Bỏ qua Action.

Skill vẫn tiếp tục Action kế tiếp.

---

# 8. metadata

Không ảnh hưởng Gameplay.

Ví dụ

```
animation

sound

icon

comment
```

---

# 9. Action Execution

SkillExecutor luôn thực hiện theo thứ tự.

Ví dụ

```
Damage

↓

Burn

↓

Heal

↓

Shield
```

Không thay đổi thứ tự.

---

# 10. Action Result

Mỗi Action tạo ra một ActionResult.

Ví dụ

```
Damage = 1250

Critical = true

Target = Monster A
```

SkillExecutor tổng hợp thành CombatResult.

---

# 11. Supported Action Types

Framework định nghĩa các Action chuẩn.

## DAMAGE

Gây sát thương.

↓

FormulaEngine.damage()

Params

```
multiplier (required)
formula (optional)
element (optional)
penetration (optional)
```

---

## HEAL

Hồi máu.

↓

FormulaEngine.heal()

Params

```
multiplier (required)
formula (optional)
```

---

## SHIELD

Tạo khiên.

↓

EffectEngine.applyEffect('SHIELD')

Params

```
multiplier (required)
duration (optional)
stackable (optional)
```

---

## APPLY_EFFECT

Áp dụng Buff/Debuff theo `effectId`.

↓

EffectEngine.apply()

Params

```
effectId (required)
chance (optional, 0-100)
duration (optional)
stack (optional)
potency (optional)
```

---

## REMOVE_EFFECT

Loại bỏ Buff/Debuff.

↓

EffectEngine.remove()

Params

```
effect (required)
count (optional)
```

---

## DISPEL

Loại bỏ tất cả Buff.

↓

EffectEngine.dispel()

Params

```
count (optional, default: all)
```

---

## PURIFY

Loại bỏ tất cả Debuff.

↓

EffectEngine.purify()

Params

```
count (optional, default: all)
```

---

## REVIVE

Hồi sinh.

↓

EffectEngine.revive()

Params

```
hpPercent (optional, default: 50)
```

---

## SUMMON

Triệu hồi thêm Entity.

↓

BattleEngine.summon()

Params

```
monsterCode (required)
count (optional, default: 1)
duration (optional)
```

---

## CHANGE_ATTRIBUTE

Thay đổi thuộc tính tạm.

↓

EffectEngine.applyModifier()

Params

```
attribute (required)
value (required)
duration (optional)
isPercentage (optional, default: false)
```

---

# 12. JSON Example

```json
{
  "actions": [
    {
      "type": "DAMAGE",
      "target": "ENEMY",
      "params": {
        "multiplier": 1.5,
        "element": "fire"
      }
    },
    {
      "type": "APPLY_EFFECT",
      "target": "ENEMY",
      "params": {
        "effectId": "BURN",
        "chance": 60
      }
    },
    {
      "type": "HEAL",
      "target": "SELF",
      "params": {
        "multiplier": 0.5
      }
    }
  ]
}
```

---

# 13. Extension

Framework hỗ trợ thêm Action mới.

Yêu cầu

- Định nghĩa Action type
- Implement ActionExecutor
- Update SkillFactory
- Document params

Không cần sửa SkillExecutor.

---

End Of File

---

## HEAL

Hồi máu.

↓

FormulaEngine.heal()

---

## SHIELD

Tạo khiên.

↓

FormulaEngine.shield()

---

## APPLY_EFFECT

Thêm Buff hoặc Debuff.

↓

EffectEngine.apply()

---

## REMOVE_EFFECT

Xóa một Effect.

---

## PURIFY

Loại bỏ Debuff.

---

## DISPEL

Loại bỏ Buff.

---

## REVIVE

Hồi sinh mục tiêu.

---

## SUMMON

Triệu hồi BattleEntity.

---

## CHANGE_ATTRIBUTE

Tăng hoặc giảm chỉ số.

Ví dụ

```
ATK

DEF

SPD

CRIT
```

---

# 12. Multi Action Example

Ví dụ

```
Damage

↓

Apply Burn

↓

Heal Self

↓

Add Shield
```

Executor sẽ chạy đủ 4 Action.

---

# 13. Complex Example

Một Skill

```
Đánh 180%

↓

Nếu Crit

↓

Gây Burn

↓

Hồi máu bản thân

↓

Nếu HP dưới 30%

↓

Tạo Khiên
```

Không cần viết code riêng.

Chỉ cần Action.

---

# 14. Rule

Một Action

↓

Một Responsibility.

Không viết Action

```
DamageAndHealAndShield
```

Sai.

Phải tách

```
Damage

↓

Heal

↓

Shield
```

---

# 15. Extension

Framework cho phép thêm

```
STEAL_ATTRIBUTE

COPY_EFFECT

SWAP_HP

CHANGE_ELEMENT

CHANGE_TARGET

RESET_COOLDOWN

REDUCE_WEIGHT

INCREASE_WEIGHT
```

Không cần sửa SkillExecutor.

---

# 16. JSON Example

```json
{
    "actions": [

        {
            "type": "DAMAGE",

            "target": "ENEMY",

            "params": {

                "formula": "SKILL",

                "multiplier": 1.8
            }
        },

        {
            "type": "APPLY_EFFECT",

            "target": "ENEMY",

            "params": {

                "effectId": "BURN",

                "chance": 30
            }
        },

        {
            "type": "HEAL",

            "target": "SELF",

            "params": {

                "multiplier": 0.2
            }
        }
    ]
}
```

---

# 17. AI Instruction

SkillExecutor không biết Fire Ball.

SkillExecutor không biết Kiếm Trảm.

SkillExecutor chỉ duyệt

```
actions[]
```

Mỗi Action sẽ được chuyển đến Engine tương ứng.

Ví dụ

```
DAMAGE

↓

FormulaEngine

HEAL

↓

FormulaEngine

APPLY_EFFECT

↓

EffectEngine

SHIELD

↓

FormulaEngine

REMOVE_EFFECT

↓

EffectEngine
```

Không Hardcode tên Skill.

---

# End Of File
