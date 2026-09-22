# CULTIVATION_SPEC

Version: 2.0  
Status: LOCKED

Purpose

Quản lý Tu Vi.

---

Pipeline

Player

↓

Gain Cultivation

↓

Check Realm

↓

Breakthrough

---

Gameplay

↓

Item

↓

Battle

↓

Quest

↓

Cultivation

---

Không Battle.

---

## Idle rate canonical

- Base: `60 tu vi/phút`, tương đương `1 tu vi/giây` trước modifier.
- Đơn vị cấu hình canonical là `MINUTE`; UI hiển thị effective `gainPerMinute`.
- Công thức lazy evaluation: `elapsedSeconds / 60 × 60 × ALL_VALID_CULTIVATION_MODIFIERS`.
- Tính liên tục theo giây; không yêu cầu đủ một phút mới phát sinh tu vi.
- Công pháp, cảnh giới, Linh Căn và các Effect hợp lệ nhân trên base 60; không thay base trong Discord command.
- Preview không ghi database. Collect tiếp tục dùng transaction/idempotency và settle timestamp canonical.

---

End
