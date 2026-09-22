# 010_GAME_RULE.md

# Game Rule

Version: 1.0.0

---

# 1. Mục tiêu

Tài liệu này định nghĩa toàn bộ luật của trò chơi.

Battle Engine phải tuân thủ tuyệt đối.

Calculator không được tự ý thay đổi công thức.

Gameplay Module không được tự ý thay đổi Rule.

Nếu có thay đổi Gameplay thì phải cập nhật tài liệu này trước.

---

# 2. Battle Philosophy

Game là Turn-Based RPG.

Không có thời gian thực.

Mọi hành động đều diễn ra theo Turn.

Battle Engine chỉ xử lý:

- Turn
- Damage
- Effect
- Skill
- Victory

Không xử lý Database.

Không xử lý Discord.

---

# 3. Turn Flow

Một Battle gồm nhiều Round.

Một Round gồm nhiều Turn.

```

Battle Start

↓

Round Start

↓

Entity Turn

↓

Round End

↓

Battle End

```

---

# 4. Turn Order

Thứ tự hành động được quyết định bởi

```
SPD
```

Entity có SPD cao hơn sẽ hành động trước.

Nếu bằng SPD

↓

Random.

SPD chỉ ảnh hưởng thứ tự hành động.

Không ảnh hưởng Damage.

---

# 5. Target Rule

Skill có thể chọn

```
SELF

SINGLE

MULTI

ALL_ENEMY

ALL_ALLY

RANDOM
```

Target được xác định trước khi tính Damage.

---

# 6. Attack Type

Có hai loại Damage

```
Normal Attack

Skill Attack
```

Không có Magic Damage hoặc Physical Damage.

Toàn bộ Damage dùng cùng một công thức.
Current ATK
=
ATK sau khi tính Buff/Debuff

Current DEF
=
DEF sau khi tính Buff/Debuff
---

# 7. Normal Damage Formula

Base Damage

```
Current ATK

-

Current DEF × (1 - PEN /100)
```

Nếu

```
Base Damage < 1
```

↓

```
Base Damage = 1
```

Sau đó

```
Final Damage

=

Base Damage

×

Random(0.80 ~ 1.00)
```

---

# 8. Skill Damage Formula

Skill có

```
SkillMultiplier
```

Ví dụ

```
1.2

1.5

2.0

3.5
```

Damage

```
BaseDamage

=

Current ATK

-

Current DEF × (1-PEN/100)
```

↓

```
SkillDamage

=

BaseDamage

×

SkillMultiplier

×

(1+SKD/100)

×

Random(0.80~1.00)
```

---

# 9. Critical Rule

CRIT là xác suất.

Ví dụ

```
CRIT = 35%
```

Nếu

```
Random <= CRIT
```

↓

```
Critical Hit
```

Damage

```
Damage

×

(1+CDMG/100)
```

Ví dụ

```
Damage = 1000

CDMG = 150

↓

2500
```

Critical chỉ xảy ra một lần.

Không Critical lồng nhau.

---

# 10. Damage Order

Battle Engine phải tính Damage theo đúng thứ tự.

```
ATK

↓

DEF

↓

PEN

↓

SkillMultiplier

↓

SKD

↓

Random

↓

Critical

↓

Shield

↓

HP
```

Không thay đổi thứ tự.

---

# 11. Lifesteal

Lifesteal tính trên

```
Final Damage gây lên HP
```

Không tính trên lượng Damage bị Shield hấp thụ.

Heal

```
Final Damage

×

LS%
```

Heal không vượt quá

```
Max HP
```

---

# 12. Reflection

Nếu mục tiêu có Reflection

```
Reflection Damage

=

Final Damage

×

REF%
```

Reflection không thể Critical.

Reflection không kích hoạt Lifesteal.

Reflection không tạo Reflection mới.

---

# 13. Shield

Shield hấp thụ Damage trước HP.

```
Damage

↓

Shield

↓

HP
```

Shield được cộng dồn.

Ví dụ

```
1000

+

500

=

1500
```

Shield tồn tại

```
Shield có Duration
```

Đầu Turn của chủ sở hữu:

- Giảm thời gian tồn tại.
- Nếu hết thời gian thì xóa toàn bộ Shield.

---

# 14. Heal

Heal

↓

HP

Không vượt quá

```
Max HP
```

Heal không hồi Shield.

---

# 15. Burn

Burn là Debuff.

Burn Damage

```
Current ATK

×

BurnMultiplier
```

Ví dụ

```
BurnMultiplier

=

30%
```

Burn xảy ra

```
Đầu Turn
```

Burn không Critical.

Burn bỏ qua Random.

Burn có thể cộng dồn.

---

# 16. Crowd Control

CC luôn có xác suất.

Ví dụ

```
Freeze

40%
```

Nếu mục tiêu có

```
CCR
```

↓

```
Final Chance

=

CC

×

(1-CCR/100)
```

Ví dụ

```
CC

40%

CCR

25%

↓

30%
```

Nếu Roll thành công

↓

Apply Effect.

---

# 17. Effect Stack

Hiệu ứng được phép cộng dồn.

Có hai loại.

## Value Stack

Ví dụ

```
Burn

30

+

30

+

30

=

90
```

---

## Chance Stack

Ví dụ

```
Freeze

10%

+

15%

=

25%
```

Không giới hạn Stack trừ khi Effect định nghĩa.

---

# 18. Effect Duration

Mỗi Effect có

```
Duration
```

Đơn vị

```
Turn
```

Đầu Turn

↓

Duration--

Nếu

```
Duration == 0
```

↓

Remove.

---

# 19. Death Rule

Nếu

```
HP <= 0
```

↓

Entity chết.

Entity chết

- Không hành động.
- Không nhận Heal.
- Không nhận Buff.

BattleEntity phải đánh dấu

```
Alive = false
```

---

# 20. Victory Rule

Battle kết thúc khi

```
Một Team không còn Entity sống.
```

Kết quả

```
Victory

Defeat
```

Không có Draw.

---

# 21. Random Rule

Battle Engine chỉ sử dụng một Random Provider.

Random

```
0.80

~

1.00
```

Làm tròn

```
2 chữ số thập phân.
```

Không sử dụng Math.random() trực tiếp trong gameplay.

Toàn bộ Random phải thông qua RandomService.

---

# 22. Rule Priority

Nếu nhiều Rule cùng áp dụng.

Thứ tự

```
Game Rule

↓

Skill

↓

Effect

↓

Talent

↓

Spirit Root

↓

Equipment
```

Rule có độ ưu tiên cao hơn sẽ được xử lý trước.

# 23. True Damage---

True Damage

↓

Không chịu DEF

Không chịu PEN

Không Crit

Không Random

↓

Chỉ đi qua Shield

↓

HP

---

# 24. Forbidden Rules

Không được

- Damage âm.
- Heal vượt Max HP.
- Shield âm.
- Critical nhiều lần.
- Reflection tạo Reflection.
- Burn Critical.
- Burn Lifesteal.
- Damage bằng 0.

---

# 25. AI Instruction

Battle Engine phải tuân thủ tuyệt đối tài liệu này.

Không tự ý thay đổi công thức.

Không Hardcode Gameplay.

Nếu có thay đổi Rule

↓

Cập nhật tài liệu trước.

---

# End of File