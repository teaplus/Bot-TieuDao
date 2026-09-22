# 009_GLOSSARY.md

# Project Glossary

Version: 1.0.0

---

# 1. Mục tiêu

Tài liệu này định nghĩa toàn bộ thuật ngữ của Framework.

AI phải luôn sử dụng đúng thuật ngữ trong tài liệu này.

Không tự ý đổi tên.

Ví dụ

Không dùng

```
Health
```

lúc khác lại dùng

```
HP
```

Chỉ chọn một.

---

# 2. Battle Terms

## Battle

Một trận chiến.

Một Battle có

- 2 Team
- nhiều Turn
- nhiều Round

---

## Team

Một phe.

Ví dụ

```
Player Team

Monster Team
```

---

## Entity

Đối tượng tham gia Battle.

Entity có thể là

- Player
- Monster
- Pet
- Clone
- Summon

Battle Engine chỉ làm việc với Entity.

---

## Target

Đối tượng được chọn.

Ví dụ

```
Single Target

Multiple Target

Random Target
```

---

# 3. Turn Terms

## Round

Một vòng chiến đấu.

Ví dụ

```
Player A

↓

Monster A

↓

Monster B

↓

Round End
```

---

## Turn

Lượt hành động của một Entity.

Một Round có nhiều Turn.

---

## Action

Một hành động trong Turn.

Ví dụ

```
Attack

Skill

Defend

Use Item

Skip
```

---

# 4. Combat Terms

## Damage

Lượng sát thương gây ra.

Không bao gồm

- Heal
- Shield

---

## Base Damage

Sát thương trước khi tính

- DEF
- PEN
- CRIT

---

## Final Damage

Sát thương cuối cùng.

Đây là Damage trừ HP.

---

## Critical

Đòn đánh chí mạng.

Viết tắt

```
CRIT
```

---

## Critical Damage

Sát thương chí mạng.

Viết tắt

```
CDMG
```

---

## Penetration

Xuyên giáp.

Viết tắt

```
PEN
```

---

## Defense

Phòng thủ.

Viết tắt

```
DEF
```

---

## Attack

Tấn công.

Viết tắt

```
ATK
```

---

## Speed

Tốc độ.

Viết tắt

```
SPD
```

---

## Lifesteal

Hút máu.

Viết tắt

```
LS
```

---

## Skill Damage

Tăng sát thương kỹ năng.

Viết tắt

```
SKD
```

---

# 5. Defensive Terms

## Shield

Lá chắn.

Hấp thụ Damage trước HP.

---

## Heal

Hồi máu.

Không vượt quá Max HP.

---

## Regeneration

Hồi máu theo thời gian.

Viết tắt

```
REG
```

---

## Block

Chặn sát thương.

Khác với Shield.

---

## Dodge

Né tránh.

Damage bằng 0.

---

# 6. Effect Terms

## Buff

Hiệu ứng có lợi.

Ví dụ

```
Increase Attack

Increase Shield

Increase Speed
```

---

## Debuff

Hiệu ứng bất lợi.

Ví dụ

```
Burn

Freeze

Poison

Bleed
```

---

## Crowd Control

Khống chế.

Viết tắt

```
CC
```

---

## Control Resistance

Kháng khống chế.

Viết tắt

```
TEN
```

Lưu ý:

- `CCR` nên dùng cho `Crowd Control Rate` nếu tài liệu / hệ thống đang nói về tỷ lệ gây khống chế.
- `TEN` dùng cho kháng khống chế để tránh nhập nhằng.

---

## Luck

May mắn.

Viết tắt

```
LUK
```

---

## Duration

Số Turn tồn tại.

---

## Stack

Số tầng Effect.

Ví dụ

Burn

```
Max Stack = 3
```

---

# 7. Gameplay Terms

## Cultivation

Cảnh giới.

Ví dụ

```
Luyện Khí

↓

Trúc Cơ

↓

Kết Đan
```

---

## Stage

Tầng trong một Cảnh giới.

Ví dụ

```
Luyện Khí tầng 5
```

---

## Breakthrough

Đột phá Cảnh giới.

---

## Sect

Môn phái.

---

## Spirit Root

Linh căn.

---

## Talent

Thiên phú.

---

## Equipment

Trang bị.

---

## Skill

Công pháp / Kỹ năng.

---

## Passive Skill

Kỹ năng bị động.

---

## Active Skill

Kỹ năng chủ động.

---

## Cooldown

Số Turn chờ.

---

# 8. Dungeon Terms

## Dungeon

Bí cảnh.

---

## Stage

Một ải.

---

## Elite

Tinh Anh.

---

## Boss

Boss cuối.

---

## World Boss

Boss toàn Server.

---

# 9. Reward Terms

## Drop

Vật phẩm rơi.

---

## Loot

Vật phẩm nhận được.

---

## Reward

Phần thưởng.

---

## Experience

Kinh nghiệm.

Viết tắt

```
EXP
```

---

## Cultivation Experience

Tu vi.

Viết tắt

```
CXP
```

---

# 10. AI Terms

## Aggressive

Ưu tiên tấn công.

---

## Defensive

Ưu tiên phòng thủ.

---

## Support

Ưu tiên Buff / Heal.

---

## Target Strategy

Thuật toán chọn mục tiêu.

---

# 11. Technical Terms

## BattleContext

Toàn bộ dữ liệu trận đấu.

---

## BattleEntity

Đối tượng chiến đấu.

---

## BattleEngine

Bộ xử lý Battle.

---

## EffectManager

Quản lý Buff/Debuff.

---

## DamageCalculator

Tính Damage.

---

## EventBus

Hệ thống Event.

---

## Repository

Lớp truy cập Database.

---

## Service

Lớp xử lý nghiệp vụ.

---

## Factory

Lớp tạo Object.

---

# 12. Naming Rules

AI phải luôn sử dụng

```
BattleEntity
```

Không dùng

```
CharacterEntity
```

---

Luôn sử dụng

```
DamageCalculator
```

Không dùng

```
BattleCalculator
```

---

Luôn sử dụng

```
BattleContext
```

Không dùng

```
CombatContext
```

---

# 13. Reserved Words

Các tên sau được xem là chuẩn của dự án

```
Battle

Entity

Effect

Damage

Shield

Heal

Skill

Player

Monster

Dungeon

Boss

SpiritRoot

Talent

Sect

Equipment

Repository

Service

Factory

EventBus
```

Không tự ý đổi tên.

---

# 14. AI Instruction

Trước khi sinh source code

AI phải đối chiếu tên Class, Method, Property với tài liệu này.

Nếu phát hiện tên khác

↓

Đổi về đúng Glossary.

Glossary là nguồn chuẩn cho toàn bộ Framework.

---

# End of File
