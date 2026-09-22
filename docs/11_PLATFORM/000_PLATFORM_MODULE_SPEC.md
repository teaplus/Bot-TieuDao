# PLATFORM_MODULE_SPEC

Module: Platform

Version: 1.0

Status: LOCKED

---

# Purpose

Platform Module cung cấp toàn bộ hạ tầng chung cho trò chơi.

Platform không chứa Gameplay.

Platform không chứa Battle.

Platform không chứa Business Rule.

Platform chỉ cung cấp dịch vụ nền tảng.

---

# Responsibilities

Platform quản lý

- Configuration
- Logger
- Database
- Cache
- Event Bus
- Scheduler
- Random Provider
- Time Provider
- ID Generator
- Transaction
- Save Pipeline

---

# Design Principles

Platform là Infrastructure Abstraction.

Gameplay không phụ thuộc Framework.

Battle không phụ thuộc Framework.

---

# Used By

Application

Gameplay

Battle

Repository

---

# Must NOT

Không Gameplay

Không Battle Logic

Không Reward

---

# End