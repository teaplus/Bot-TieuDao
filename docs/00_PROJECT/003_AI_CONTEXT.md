# AI_CONTEXT.md

Project: Discord Tu Tiên RPG

Version: 1.0

Status: LOCKED

---

# Project Overview

Discord Tu Tiên RPG là game nhập vai tu tiên theo lượt được phát triển trên nền tảng Discord.

Gameplay được xây dựng hoàn toàn theo mô hình Data Driven.

Mọi dữ liệu gameplay đều được định nghĩa bằng JSON.

Source Code chỉ chịu trách nhiệm đọc dữ liệu và thực thi.

---

# Project Goal

Mục tiêu của Version 1:

- Hoàn thành toàn bộ Data Schema.
- Hoàn thành Documentation.
- Sinh Source Code.
- Hoàn thành Gameplay cơ bản.
- Hoàn thành Battle Engine.
- Triển khai Discord Bot.

---

# Core Principles

Project sử dụng các nguyên tắc sau:

- Data First
- Data Driven
- Single Source Of Truth
- Module Independence
- Runtime In Memory

---

# Architecture Overview

```
Game Data (JSON)

        ↓

GameData Manager

        ↓

Gameplay

        ↓

Battle

        ↓

Discord
```

Gameplay không phụ thuộc Discord.

Battle không phụ thuộc Database.

Battle không đọc JSON.

---

# Project Modules

Project được chia thành các module:

- Foundation
- Core Data
- Item
- Equipment
- Skill
- Effect
- Monster
- Gameplay
- Battle
- Discord

Mỗi module có Specification riêng.

---

# Current Status

Architecture: LOCKED

Data Schema: LOCKED

Current Phase:

Documentation

---

# Development Process

Design

↓

JSON

↓

Specification

↓

Implementation

↓

Testing

↓

Release

---

# AI Responsibility

AI hỗ trợ:

- Review Data
- Generate Documentation
- Generate Source Code
- Validate Runtime

AI không tự thay đổi Architecture.

---

# End Of File