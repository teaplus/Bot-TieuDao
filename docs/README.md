# Discord Tu Tiên RPG

Version 1.0.0

---

# Introduction

Discord Tu Tiên RPG là một game nhập vai tu tiên được phát triển trên nền tảng Discord.

Toàn bộ gameplay được thiết kế theo hướng:

- Turn-Based Battle
- Data Driven
- Modular
- Event Driven
- Dễ mở rộng
- Dễ bảo trì

Framework được xây dựng để hỗ trợ hàng trăm kỹ năng, quái vật, trang bị và nội dung gameplay mà không cần thay đổi kiến trúc.

---

# Project Goals

Mục tiêu của dự án:

- Xây dựng Battle Framework ổn định.
- Mọi gameplay đều Data Driven.
- Có thể mở rộng bằng JSON.
- Không Hardcode gameplay.
- Framework đủ đơn giản để maintain lâu dài.

Version 1 ưu tiên:

- Hoàn thành.
- Ổn định.
- Đúng kiến trúc.

Không ưu tiên tối ưu quá sớm.

---

# Technology

Backend

- Node.js LTS
- JavaScript ES2022

Platform

- Discord Bot

Architecture

- Modular
- Data Driven
- Event Driven

---

# Documentation Structure

Hướng dẫn cài đặt và vận hành hiện tại:

```text
docs/RUN_PROJECT_GUIDE.md
```

```
docs/

00_PROJECT/

01_FOUNDATION/

02_GAMEPLAY/

03_BATTLE/

04_SKILL/

05_EFFECT/

06_MONSTER/

07_PLAYER/

08_ITEM/

09_DUNGEON/

10_DISCORD/

11_DATABASE/

12_GAMEPLAY/

13_DEPLOYMENT/

14_TEST/
```

---

# Read Order

Developer hoặc AI nên đọc theo thứ tự sau.

## Step 1

```
00_PROJECT/
```

Bao gồm

- README.md
- AI_CONTEXT.md
- AI_PROMPT.md
- AI_RULE.md
- PROJECT_VISION.md
- PROJECT_ROADMAP.md
- PROJECT_TODO.md
- DESIGN_DECISION.md
- CHANGELOG.md

---

## Step 2

Foundation

```
000 ~ 009
```

---

## Step 3

Gameplay Rule

```
010 ~ 019
```

---

## Step 4

Battle Framework

```
020 ~ 031
```

---

## Step 5

Skill Framework

```
032 ~ 039
```

---

Các Phase còn lại đọc theo PROJECT_ROADMAP.md.

---

# Architecture Overview

Battle Flow

```
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
```

Không thay đổi Flow này trong Version 1.

---

# Core Design Principles

BattleEngine chỉ điều phối.

BattleEntity chỉ lưu State.

FormulaEngine chỉ tính toán.

EffectEngine chỉ xử lý Effect.

SkillManager quyết định Skill.

SkillExecutor thực thi Skill.

SkillDefinition chỉ là Data.

Gameplay được mô tả bằng JSON.

---

# Development Workflow

Khi phát triển tính năng mới.

1.

Đọc PROJECT_TODO.md.

2.

Xác định Current Sprint.

3.

Chỉ làm Task đang được giao.

4.

Không tự ý redesign.

5.

Nếu có ý tưởng mới.

↓

Future Backlog.

---

# Version Policy

Version 1

- Hoàn thành Framework.
- Không thêm Feature ngoài Roadmap.
- Không Over Engineering.
- Ưu tiên kiến trúc ổn định.

Version 2

- Tối ưu.
- Mở rộng Gameplay.
- Triển khai Future Backlog.

---

# AI Workflow

Nếu sử dụng AI (ChatGPT, Cursor, Claude Code...)

Luôn đọc theo thứ tự:

1. AI_RULE.md

2. AI_CONTEXT.md

3. PROJECT_ROADMAP.md

4. PROJECT_TODO.md

5. DESIGN_DECISION.md

6. CHANGELOG.md

Sau đó mới bắt đầu sinh code hoặc tài liệu.

---

# Roadmap

Toàn bộ Roadmap nằm tại

```
PROJECT_ROADMAP.md
```

Tiến độ hiện tại nằm tại

```
PROJECT_TODO.md
```

---

# Current Status

Current Version

```
Version 1
```

Current Goal

```
Hoàn thành Framework
```

Current Sprint

Đọc

```
PROJECT_TODO.md
```

---

# Contribution Rules

Mọi thay đổi kiến trúc phải cập nhật:

- DESIGN_DECISION.md
- CHANGELOG.md
- AI_CONTEXT.md

Nếu thay đổi Roadmap.

↓

Cập nhật PROJECT_ROADMAP.md.

Nếu thay đổi Sprint.

↓

Cập nhật PROJECT_TODO.md.

---

# Project Philosophy

Đơn giản hơn thông minh.

Ổn định hơn phức tạp.

Data quan trọng hơn Hardcode.

Framework quan trọng hơn Feature.

Hoàn thành quan trọng hơn hoàn hảo.

---

# End Of File
