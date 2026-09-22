# DEVELOPMENT_OVERVIEW

Module: Development Standard

Version: 1.0

Status: LOCKED

---

# Purpose

Định nghĩa toàn bộ tiêu chuẩn phát triển dự án.

Tài liệu này không mô tả Gameplay.

Không mô tả Battle.

Không mô tả Database.

Tài liệu này chỉ định nghĩa cách AI sinh Source Code.

---

# Objectives

Toàn bộ Source Code phải:

- Dễ đọc.
- Dễ bảo trì.
- Data Driven.
- Single Responsibility.
- Không Hardcode Gameplay.

---

# Read Order

AI phải đọc theo thứ tự:

00_PROJECT

↓

01_FOUNDATION

↓

02_CORE_DATA

↓

...

↓

11_PLATFORM

↓

12_DEVELOPMENT_STANDARD

Sau khi đọc đầy đủ.

↓

Mới được sinh Source Code.

---

# Architecture

Project sử dụng

Layered Architecture.

Data Driven.

Clean Dependency.

---

# Design Principles

Single Responsibility

Dependency Injection

Data First

Read Only Template

Runtime Separation

---

# Rules

Gameplay không đọc JSON.

Battle không đọc Database.

Repository không chứa Gameplay.

Application không chứa Battle.

---

# End