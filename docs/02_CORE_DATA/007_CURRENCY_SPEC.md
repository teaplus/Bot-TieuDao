# CURRENCY_SPEC

Module: Core Data

Version: 1.0

Status: LOCKED

---

# Purpose

Định nghĩa toàn bộ đơn vị tiền tệ.

Currency không phải Item.

---

# Data Source

currencies.json

---

# Responsibilities

Currency chỉ định nghĩa:

- id
- displayName
- description

---

# Runtime

Player

↓

Currency Wallet

↓

Amount

---

# Used By

Reward

Shop

Craft

Exchange

Gameplay

---

# Must NOT

Không Runtime Amount.

Không Shop Logic.

---

# End