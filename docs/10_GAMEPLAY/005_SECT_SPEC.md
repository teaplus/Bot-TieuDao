# SECT_SPEC

Purpose

Quản lý Môn Phái.

---

Sect gồm

Element

Passive Buff

Skill Pool

Exchange

---

Gameplay

↓

Filter Skill Pool

↓

Choose Grade

↓

Random

↓

Runtime Skill

---

Battle chỉ đọc Passive.

---

## Truyền thừa đặc hữu trong Shop Tông Môn

Yêu cầu nội dung mới là mỗi Tông Môn sở hữu Công Pháp, Kỹ Năng công và Kỹ Năng thủ đặc hữu
theo Element/lore của chính Tông Môn. Mọi entry dùng `SECT_POINT`, có Realm gate và Grade
explicit; Discord chỉ trình bày application view, không sở hữu logic lọc/mua.

Foundation hiện hành đã có 18 rule cho ba category tại sáu phẩm và các mức mở khóa:

| Phẩm | Cảnh giới mở | Công Pháp | Kỹ Năng |
| --- | --- | ---: | ---: |
| Hoàng | Luyện Khí | 100 | 120 |
| Huyền | Kết Đan | 500 | 600 |
| Địa | Luyện Hư | 2.500 | 3.000 |
| Thiên | Chân Tiên | 10.000 | 12.000 |
| Thánh | Đại La | 50.000 | 60.000 |
| Thần | Đạo Tổ | 200.000 | 240.000 |

Các số trên là giá Điểm Cống Hiến data-driven hiện hành. Runtime dùng transaction idempotent,
resource ledger và cấp bí kíp vào túi; Discord command không tạo đường grant/học riêng.

### Truyền thừa đặc hữu đã triển khai

- 10 Tông Môn × 6 phẩm × 3 nhóm = 180 truyền thừa độc quyền trong
  `sect_inheritance_templates.json`: 60 Công Pháp, 60 Kỹ Năng công, 60 Kỹ Năng thủ.
- Hệ canonical: bảy hệ cũ giữ nguyên; Lưỡng Nghi dùng Hỗn Độn, Sát Thần dùng Bóng Tối,
  Trường Sinh dùng Mộc.
- Mechanics/cooldown kế thừa công thức chuẩn hiện hành theo phẩm; content mới thay ID, tên,
  hệ và lore Tông Môn để không tự thay đổi đường cân bằng lõi.
- Mỗi exchange rule trỏ đúng một bí kíp. UI preview chính xác nội dung trước khi đổi.
- `DENY_OWNED` khóa đổi nếu sách đang trong túi hoặc nội dung đã học. Kiểm tra lại diễn ra
  bên trong transaction đã khóa Player, rồi mới trừ Điểm Cống Hiến và cấp sách atomically.

### Trạng thái

`Q-SECT-007..009` đã `RESOLVED`; ma trận truyền thừa đặc hữu và exchange runtime đã hoàn tất.
Generator và audit giữ dữ liệu có thể mở rộng mà không sửa logic `SectService`.

---

End
