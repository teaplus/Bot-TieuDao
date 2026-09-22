# PROJECT_VISION.md

# Project Vision

Version 2.0.0

---

# Project Name

Discord Tu Tiên RPG

---

# Vision

Xây dựng một game Discord RPG theo chủ đề Tu Tiên.

Gameplay tập trung vào

- Chiến đấu theo lượt
- Thu thập
- Phát triển nhân vật
- PvE dài hạn
- Data Driven
- Dễ mở rộng

Mục tiêu không phải tạo game phức tạp.

Mục tiêu là xây dựng một Framework ổn định,
mọi Gameplay đều được mô tả bằng dữ liệu.

---

# Core Philosophy

Nguyên tắc cao nhất của dự án.

```
Đơn giản

↓

Ổn định

↓

Data Driven

↓

Single Source Of Truth

↓

Dễ mở rộng
```

Không tối ưu quá sớm.

Không Over Engineering.

Không Hardcode Gameplay.

---

# Single Source Of Truth

Toàn bộ Gameplay chỉ tồn tại dưới dạng Data.

JSON là nguồn dữ liệu duy nhất.

Markdown không phải Gameplay.

Markdown chỉ là tài liệu sinh ra từ JSON.

Nếu Gameplay thay đổi

↓

Update JSON

↓

Regenerate Markdown

Không sửa Gameplay trực tiếp trong Markdown.

---

# Design Goal

Framework phải đủ để hỗ trợ

- 1000+ Skill
- 500+ Monster
- 100+ Boss
- 1000+ Equipment
- Hàng nghìn Item

mà không cần thay đổi kiến trúc.

---

# Data Goal

Gameplay được mô tả hoàn toàn bằng JSON.

Ví dụ

- Attribute
- Modifier
- Effect
- Realm
- Talent
- Skill
- Equipment
- Sect
- Monster
- Dungeon

Framework chỉ đọc Data.

Framework không chứa Gameplay.

---

# Runtime Goal

Runtime chỉ quản lý trạng thái trò chơi.

Ví dụ

- Player
- Inventory
- Currency
- Progress
- Quest
- Mail
- Cooldown
- Dungeon Progress

Runtime Data được lưu Database.

Gameplay Data không lưu Database.

---

# Gameplay Goal

Gameplay hướng tới

- Build nhân vật
- Linh căn
- Thiên phú
- Công pháp
- Kỹ năng
- Trang bị
- Môn phái
- Bí cảnh
- Boss

Không hướng tới thao tác phức tạp.

Người chơi tập trung vào

```
Chiến thuật

↓

Build

↓

Phát triển
```

---

# Battle Goal

Battle phải

- Nhanh
- Dễ đọc
- Replay được
- Test được
- Deterministic
- Chạy hoàn toàn trên Memory

Battle không phụ thuộc

- Discord
- Database
- Network

---

# Technical Goal

Source Code phải

- Clean
- Modular
- Testable
- Data Driven
- Low Coupling
- High Cohesion

Không Over Engineering.

---

# Architecture Goal

BattleEngine

↓

TurnManager

↓

SkillManager

↓

SkillExecutor

↓

FormulaEngine

↓

CombatResult

↓

BattleEntity.applyCombatResult()

↓

EffectEngine

↓

BattleResult

Version 1 không thay đổi Pipeline này.

---

# Gameplay Data

Gameplay được chia thành các nhóm dữ liệu.

Attributes

↓

Elements

↓

Modifiers

↓

Effects

↓

Realms

↓

Talents

↓

Skills

↓

Equipment

↓

Sect

↓

Monster

↓

Dungeon

↓

Items

Mỗi nhóm đều độc lập.

Không phụ thuộc Source Code.

---

# Runtime Data

Runtime được lưu Database.

Ví dụ

Player

↓

Equipment đang mặc

↓

Inventory

↓

Currency

↓

Quest

↓

Mail

↓

Cooldown

↓

Dungeon Progress

↓

Statistics

Không lưu Gameplay trong Database.

---

# Documentation Goal

Markdown không phải nơi thiết kế Gameplay.

Markdown chỉ dùng để

- Giải thích JSON
- Giải thích Structure
- Giải thích Rule
- Hướng dẫn Developer

Gameplay luôn đọc từ JSON.

---

# AI Development Goal

AI là thành viên của dự án.

AI không được

- Redesign Framework
- Thay đổi Architecture
- Thêm Gameplay
- Hardcode Rule

AI chỉ được

- Hoàn thiện Data
- Sinh Markdown từ Data
- Sinh Source Code từ Data
- Validate Data

Nếu phát hiện ý tưởng mới

↓

Future Backlog

Không triển khai trong Version 1.

---

# Version Goal

## Version 1

Ưu tiên

- Hoàn thành Data
- Hoàn thành Framework
- Hoàn thành Runtime
- Hoàn thành Documentation

Không tối ưu.

Không mở rộng Gameplay.

---

## Version 2

Cho phép

- Gameplay mới
- Event
- PvP
- Ranking
- Plugin
- Script
- Performance Optimization

---

# Success Criteria

Dự án thành công khi

✓ Gameplay hoàn toàn mô tả bằng JSON.

✓ Framework không chứa Gameplay.

✓ Runtime chỉ quản lý State.

✓ Markdown luôn regenerate từ JSON.

✓ Có thể thêm hàng trăm Skill mà không sửa Source Code.

✓ Có thể thêm hàng nghìn Monster chỉ bằng Data.

✓ AI có thể tiếp tục phát triển dự án chỉ bằng Data.

---

# Non Goal

Version 1 không hướng tới

- Smart AI
- PvP Ranking
- Weather
- Terrain
- Combo Skill
- Script Engine
- Lua
- Plugin System

Các tính năng trên thuộc Version 2.

---

# End Of File