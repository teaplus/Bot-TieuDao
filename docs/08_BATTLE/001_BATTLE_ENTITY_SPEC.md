# BATTLE_ENTITY_SPEC

Purpose

BattleEntity là Runtime Object nội bộ của Battle.

---

BattleEntity gồm

id

team

battleStat

currentHP

currentShield

effects

skills

alive

---

Không chứa

Inventory

Currency

Quest

Progress

---

Battle chỉ thao tác BattleEntity.

---

Battle Stat runtime dùng percentage-point canonical cho các stat phần trăm:

- `CRIT = 15` nghĩa là tỷ lệ chí mạng 15%.
- `CDMG = 60` nghĩa là bonus sát thương chí mạng 60%, multiplier tại Formula boundary là `1.6`.
- PEN/SKD/LS/SHD/CCR/TEN/FINAL_DAMAGE/FINAL_DEFENSE/HIT_RATE/CONTROL_IMMUNITY cũng giữ percentage point.

Attribute Registry là nguồn `defaultValue`, `min`, `max` và kiểu INTEGER/DECIMAL. `BattleEntityFactory` phải materialize đầy đủ 19 battle stat; Formula/Effect boundary chịu trách nhiệm convert percentage point sang rate/probability khi sử dụng.

---

End
