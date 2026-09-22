# SHOP_RUNTIME_SPEC

Module: Gameplay

Version: 2.0

Status: IMPLEMENTED

---

## Mục tiêu

Shop runtime cung cấp một application boundary để xem và mua hàng, trong khi nguồn hàng,
giá, giới hạn và điều kiện mở khóa đều đến từ GameData hoặc immutable shop-session snapshot.
Business logic không phụ thuộc Discord.js.

## Các bounded context

| Khu vực | Nguồn hàng | Currency | Runtime sở hữu giao dịch |
| --- | --- | --- | --- |
| Shop Theo Map | Catalog của map Player đang đứng | `SPIRIT_STONE` | `ShopService` |
| Shop Đặc Biệt | Pool/rotation đặc biệt | `SPIRIT_STONE` | `ShopService` |
| Shop Tông Môn | Reward pool của Tông Môn Player | `SECT_POINT` hiện hành | `SectService` |
| Shop Kỳ Ngộ | Snapshot phiên merchant phát sinh từ thám hiểm | `SPIRIT_STONE` | `ShopService` + session repository |

Theo `Q-SHOP-001` phương án A, `/shop` dùng một panel gồm Phường Thị, Trân Các, Tông Môn
và Kỳ Ngộ; `/tongmon` vẫn giữ lối tắt hiện hành. Shop Tông Môn chỉ dùng chung presentation,
không chuyển nghiệp vụ điểm cống hiến sang repository shop thường.

## Product contract dự kiến

Theo `Q-SHOP-002` phương án A, một entry mô tả `product` bằng discriminated union thay vì
mặc định mọi hàng hóa là stackable item.

```text
ShopEntry
  id
  product { kind, templateId, quantity, snapshot? }
  costs[] { currencyId, amount }
  unlockConditions[]
  purchaseLimit?
  stock?
```

GameData chỉ mô tả catalog/pool. Với shop động, kết quả roll phải được đóng băng thành entry
snapshot trước khi hiển thị. Preview và purchase luôn đọc cùng snapshot; không roll lại chỉ số
trang bị sau khi Player bấm mua.

## Lazy evaluation và refresh

- Không dùng tick để refresh shop hoặc xóa merchant session.
- Rotation được định danh bằng `period_type + period_key`; period key lấy timezone economy.
- Khi mở shop, runtime resolve period hiện tại và tạo snapshot một lần nếu chưa tồn tại.
- Merchant session lưu `created_at`, `expires_at` và trạng thái; request đọc coi phiên hết hạn
  khi `now >= expires_at`, không cần job xóa ngay.
- Cleanup chỉ là maintenance, không quyết định correctness.

Trân Các refresh tuần. Tỷ lệ encounter `90/5/5`, bốn slot Kỳ Ngộ, stock 1 và TTL 15 phút
được khai báo trong `shop_rules.json`; không hard-code trong Discord command.

## Purchase transaction

Mọi thao tác mua bắt buộc có `operationId`, request hash và một transaction PostgreSQL:

```text
reserve idempotency
  -> lock Player/wallet
  -> lock shop session/stock nếu là hàng động
  -> validate expiry, unlock, ownership và stock nếu là phiên động
  -> decrement stock nếu là hàng Kỳ Ngộ
  -> debit mọi currency cost
  -> grant product theo kind
  -> ghi purchase log + resource ledger
  -> complete idempotency response
  -> commit
```

Hai request đồng thời mua slot cuối chỉ một request được thành công. Replay cùng operation ID
trả lại kết quả đã lưu và không trừ tiền/cộng hàng lần hai.

## Exploration integration

Encounter không được roll ở Discord command. `ExplorationService` phải dispatch encounter trước
battle bằng registry có trọng số; `MONSTER` chạy battle hiện hành, còn `MYSTERY_MERCHANT` và
`FORTUNE_REWARD` hoàn tất activity không cần đánh. Seed và kết quả được persist để retry/restart
không đổi loại encounter; merchant và kỳ ngộ đều thay thế trận đánh của lượt tương ứng.

## Discord presentation

- Một panel chỉ render tối đa số option Discord cho phép và có pagination khi cần.
- Select entry luôn dùng opaque entry/session ID; không tin price hoặc product từ `customId`.
- Khi Player chọn hàng, UI hiển thị tên, loại, phẩm, hiệu ứng/chỉ số, giá, stock và giới hạn.
- Button mua gửi operation ID mới; sau thành công panel reload balance/stock nhưng giữ preview.
- Mọi error nghiệp vụ được map sang câu tiếng Việt có dấu; không hiển thị raw error code.

Routing đã khóa theo `Q-SHOP-001` phương án A.

## Data validation bắt buộc khi contract được duyệt

- Mọi template/currency/map/realm/grade tham chiếu phải tồn tại.
- Giá là canonical integer string không âm; không chuyển qua JavaScript `Number`.
- Entry động phải có snapshot revision và source pool ID.
- Pool không được rỗng sau khi áp dụng unlock/filter cho một tier đã công bố ACTIVE.
- Hàng trang bị phải có đủ equipment type và dữ liệu preview trước purchase.
- Không cho một `entry.id` trùng trong cùng shop snapshot.

## Trạng thái triển khai

- **Đã có:** product union, catalog đủ 15 map, Trân Các deterministic theo map/tuần,
  merchant session immutable, lazy expiry, stock atomic, purchase log,
  resource ledger, exploration dispatcher và panel `/shop` thống nhất.
- **Đã khóa nội dung:** Merchant dùng trọng số Item/Công Pháp/Kỹ Năng/Trang Bị
  `60/12,5/12,5/15`; Phù Lục giữ `CONTENT_PENDING` tới khi gameplay Phù Sư được duyệt.
- **Chính sách mua hiện hành:** Phường Thị và Trân Các không giới hạn số lượt mua theo
  ngày/tuần. Merchant vẫn dùng stock của immutable session; Kho Tông Môn tiếp tục theo
  exchange rule riêng, không bị đồng nhất vào purchase-limit của shop Linh Thạch.
- **Kiểm chứng:** audit GameData/catalog và PostgreSQL race test bảo đảm hai request mua slot
  cuối chỉ có một giao dịch thành công.

---

# End
