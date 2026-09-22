# Character Creation Flow Proposal

Module: Application / Player / Discord UI

Status: IMPLEMENTED — `Q-START-001/002` RESOLVED.

## Quyết định đã áp dụng

- Đạo hiệu nhập qua Modal, dài 2–24 ký tự Unicode chữ/số/khoảng trắng và không unique toàn cục.
- Người chơi có một lượt roll đầu cùng tối đa 5 lượt reroll; mỗi lượt thay cả loại và phẩm cấp.
- Preview chỉ nằm trong memory. Hủy, timeout hoặc restart trước confirm không tạo Player.
- Confirm dùng đúng snapshot đang hiển thị, không roll lại; transaction tạo Player lưu thêm số reroll đã dùng và revision quy tắc.
- RNG mặc định lấy secure seed rồi dùng seeded random; audit có thể inject random deterministic.

## Mục tiêu

Thay `/start` tạo ngay bằng một phiên Thiên Mệnh có chủ sở hữu:

1. nhập Đạo hiệu;
2. roll Linh Căn và phẩm cấp;
3. có giới hạn tái tạo;
4. chỉ tạo Player khi xác nhận Nhập Đạo.

Toàn bộ giao diện dùng message content và button, không dùng Embed.

## Flow đề xuất

### 1. Nhập Đạo hiệu

`/start` mở Modal `Đặt Đạo hiệu`. Sau khi submit hợp lệ, bot gửi ephemeral message:

```text
☯ THIÊN MỆNH SƠ KHAI

Đạo hiệu: Vân Tiêu
Linh Căn: Hỏa Linh Căn
Phẩm cấp: Thượng Phẩm

Tốc độ tu luyện: +10%
Sát thương Kỹ Năng Hỏa: +4%

Số lần tái tạo còn lại: 5/5
Kết quả chỉ được ghi nhận khi đạo hữu chọn Nhập Đạo.
```

Không hiển thị raw ID, decimal `0.xx` hoặc dữ liệu kỹ thuật.

### 2. Button

Một action row tối đa năm nút:

- `🎲 Tái tạo (5)` — roll lại và edit message hiện tại;
- `✅ Nhập Đạo` — persist final snapshot trong transaction;
- `📊 Xem tỷ lệ` — thay/khôi phục phần content về bảng tỷ lệ đời 0;
- `✏️ Đổi Đạo hiệu` — mở lại Modal trong cùng session;
- `Hủy` — đóng session, không ghi database.

Khi hết lượt, nút Tái tạo bị disabled. Trong lúc xử lý một button, interaction phải
được acknowledge và state không được cho phép hai lần click cùng tiêu một lượt.

### 3. Confirm

Confirm phải:

1. kiểm tra owner/session/TTL;
2. kiểm tra Player chưa tồn tại;
3. validate lại Đạo hiệu;
4. dùng đúng final Spirit Root/quality snapshot đang hiển thị;
5. tạo Player, starter inventory, map state và Công Pháp trong một transaction;
6. trả message hoàn tất, disable toàn bộ button.

Unique `players.id` vẫn là guard cuối cho hai confirm đồng thời. Không roll lại bên
trong `startPlayer`, nếu không preview và kết quả persist có thể khác nhau.

## Đề xuất bổ sung

- Đưa `maxRerolls`, TTL và pool revision vào GameData, không hardcode trong command.
- Hiển thị Effect Linh Căn bằng presenter hiện hữu để `%` nhất quán với `/linhcan`.
- Có nút xem tỷ lệ để người chơi hiểu phẩm hiếm nhưng không lộ RNG seed.
- Không lưu các preview bị bỏ để tránh tạo dữ liệu rác; final snapshot có thể lưu
  `rerollsUsed` và rule revision để audit/balance telemetry.
- Khi bot restart hoặc session hết hạn, người chơi dùng lại `/start`; vì chưa có
  Player nên không mất tài nguyên hay trạng thái.
- Sau confirm, hướng dẫn ba bước kế tiếp bằng content:
  `/nhanvat` → `/congphap` → `/thamhiem`.

## Công Pháp/Kỹ Năng select

UI loadout hoàn chỉnh nên có hai thanh tách biệt:

- select đơn `Công Pháp tu luyện`;
- multi-select `Kỹ Năng chiến đấu`, `maxValues` lấy từ capacity theo Realm.

Multi-select giúp capacity tăng dynamic mà không vượt giới hạn năm action row của
Discord. Preview hiển thị loadout mới; mutation chỉ chạy khi bấm Xác nhận.
