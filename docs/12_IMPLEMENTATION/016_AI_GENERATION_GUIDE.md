# AI_GENERATION_GUIDE

Purpose

Quy định cách AI sinh code.

---

AI phải sinh theo thứ tự:

Template

↓

DTO

↓

Repository

↓

Factory

↓

Runtime

↓

Service

↓

Battle

↓

Gameplay

↓

Application

---

Không sinh Gameplay trước Runtime.

Không sinh Battle trước Factory.

Không sinh Repository sau Gameplay.

---

Nếu thiếu dữ liệu.

↓

Báo lỗi.

Không tự suy luận.

---

Nếu JSON và SPEC khác nhau.

↓

JSON là nguồn dữ liệu.

SPEC chỉ giải thích.

---

Không tự tạo Gameplay.

Không tự đổi Architecture.

Không tự đổi Folder.

Không tự đổi JSON.

---

Sau mỗi Module.

↓

Chờ User xác nhận.

↓

Mới sinh Module tiếp theo.

---

End