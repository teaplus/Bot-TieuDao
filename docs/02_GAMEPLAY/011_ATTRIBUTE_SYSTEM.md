# 011_ATTRIBUTE_SYSTEM.md

# Attribute System

Version: 1.0.0

---

# 1. Mục tiêu

Tài liệu này định nghĩa toàn bộ hệ thống chỉ số (Attribute System) của trò chơi.

Battle Engine chỉ được phép sử dụng các thuộc tính được định nghĩa tại đây.

Không được tự ý thêm hoặc đổi tên Attribute.

---

# 2. Attribute Categories

Thuộc tính được chia thành các nhóm sau

```
Core Attribute

Combat Attribute

Defense Attribute

Effect Attribute

Growth Attribute

Special Attribute
```

---

# 3. Core Attribute

Đây là các chỉ số cơ bản của Entity.

| Thuộc tính | Viết tắt | Đơn vị | Mô tả |
|------------|----------|--------|-------|
| HP | HP | Điểm | Máu tối đa |
| Attack | ATK | Điểm | Công |
| Defense | DEF | Điểm | Thủ |
| Speed | SPD | Điểm | Quyết định thứ tự hành động |

---

# 4. Combat Attribute

Các chỉ số ảnh hưởng trực tiếp tới sát thương.

| Thuộc tính | Viết tắt | Đơn vị |
|------------|----------|--------|
| Critical Rate | CRIT | % |
| Critical Damage | CDMG | % |
| Penetration | PEN | % |
| Skill Damage | SKD | % |
| Lifesteal | LS | % |
| Reflection | REF | % |

---

# 5. Defense Attribute

| Thuộc tính | Viết tắt | Đơn vị |
|------------|----------|--------|
| Shield Power | SHD | % |
| Healing Bonus | REG | % |
| Crowd Control Resistance | TEN | % |

---

# 6. Effect Attribute

| Thuộc tính | Viết tắt | Đơn vị |
|------------|----------|--------|
| Crowd Control Chance | CCR | % |
| Burn Power | BRN | % |
| Freeze Chance | FRZ | % |
| Poison Power | PSN | % |
| Bleed Power | BLD | % |

Lưu ý

Các Effect này không nhất thiết phải xuất hiện trên Player.

Chúng chủ yếu đến từ

- Skill
- Talent
- Spirit Root
- Equipment

---

# 7. Growth Attribute

Các chỉ số phát triển.

| Thuộc tính | Viết tắt |
|------------|----------|
| Cultivation Bonus | CUL |
| Luck | LUK |
| Experience Bonus | EXPB |
| Drop Rate | DROP |

---

# 8. Special Attribute

Các chỉ số đặc biệt.

| Thuộc tính | Viết tắt |
|------------|----------|
| Action Point | AP |
| Taunt Chance | TAUNT |
| Ignore Death | REVIVE |
| True Damage | TRUE |

---

# 9. Attribute Source

Một Attribute có thể đến từ nhiều nguồn.

```
Base Stat

↓

Cultivation

↓

Spirit Root

↓

Talent

↓

Sect

↓

Equipment

↓

Buff

↓

Debuff

↓

Battle Stat
```

Battle Engine chỉ sử dụng Battle Stat.

---

# 10. Battle Stat

Battle Stat là kết quả cuối cùng sau khi cộng toàn bộ nguồn.

Ví dụ

```
ATK

=

Base

+

Equipment

+

Talent

+

Buff
```

Không đọc Base Stat trực tiếp.

---

# 11. Flat Attribute

Flat Attribute là chỉ số cộng trực tiếp.

Ví dụ

```
ATK +100

HP +500

DEF +30
```

---

# 12. Percentage Attribute

Percentage Attribute nhân lên tổng Flat.

Ví dụ

```
ATK +20%

HP +50%

DEF +15%
```

---

# 13. Attribute Calculation Order

```
Base

↓

Flat Bonus

↓

Percentage Bonus

↓

Buff

↓

Debuff

↓

Battle Stat
```

Không đổi thứ tự.

---

# 14. Attribute Limit

Giới hạn mặc định

| Thuộc tính | Min | Max |
|------------|-----|-----|
| CRIT | 0% | 100% |
| PEN | 0% | 100% |
| CCR | 0% | 90% |
| LS | 0% | 100% |
| REF | 0% | 100% |

Một số Attribute có thể vượt giới hạn nếu được Rule đặc biệt cho phép.

---

# 15. Attribute Priority

Nếu nhiều Buff cùng tác động

```
Base

↓

Equipment

↓

Spirit Root

↓

Talent

↓

Sect

↓

Buff

↓

Debuff
```

---

# 16. Dynamic Attribute

Các Attribute sau có thể thay đổi trong Battle.

```
ATK

DEF

SPD

CRIT

CDMG

PEN

SKD

LS

REF

CCR
```

---

# 17. Static Attribute

Các Attribute sau không thay đổi trong Battle.

```
Level

Cultivation

Spirit Root

Sect
```

---

# 18. Battle Only Attribute

Chỉ tồn tại trong Battle.

```
Current HP

Current Shield

Effect Stack

Cooldown

Action Point
```

Không lưu Database.

---

# 19. Naming Convention

Luôn sử dụng

```
HP

ATK

DEF

SPD

CRIT

CDMG

PEN

SKD

LS

REF

SHD

REG

CCR
```

Không sử dụng tên khác.

---

# 20. Future Attribute

Framework cho phép mở rộng.

Ví dụ

```
Holy Damage

Dark Damage

Fire Damage

Water Damage

Earth Damage

Wind Damage
```

Không cần sửa Battle Engine.

---

# 21. AI Instruction

AI phải:

- Không tự ý thêm Attribute.
- Không đổi tên viết tắt.
- Battle Engine chỉ đọc Battle Stat.
- Mọi Buff/Debuff chỉ thay đổi Battle Stat.
- Database lưu Base Stat.

---

# End of File
