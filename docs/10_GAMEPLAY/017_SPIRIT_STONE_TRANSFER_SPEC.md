# CHUYỂN LINH THẠCH — BẢN PHÂN TÍCH TRIỂN KHAI

Module: Economy / Social Transfer

Version: 1.1

Status: ACTIVE

---

## 1. Mục tiêu

Cung cấp slash command để một Player gửi Linh Thạch cho một Discord user khác. Business logic
không phụ thuộc Discord.js và PostgreSQL là nguồn chuẩn duy nhất.

Contract UI dự kiến:

```text
/give nguoinhan:@DiscordUser soluong:1000
```

Tên slash command chuẩn được chủ dự án khóa là `/give`. Discord adapter chỉ parse user/amount,
hiển thị xác nhận và tạo operation ID. Service chịu toàn
bộ validation, debit/credit, ledger và idempotency.

## 2. Transaction contract

Trong đúng một PostgreSQL transaction:

1. từ chối gửi cho chính mình hoặc bot;
2. resolve eligibility của sender/recipient theo policy đã duyệt;
3. khóa hai row Player theo thứ tự ID tăng dần, không khóa theo hướng sender → recipient;
4. reserve operation ID và request hash chứa sender/recipient/amount/policy revision;
5. kiểm tra amount, balance, fee/limit nếu có;
6. debit sender và credit recipient;
7. ghi hai `resource_ledger` entry có cùng transfer reference/operation ID;
8. persist immutable transfer record;
9. complete idempotency response rồi commit.

Thứ tự lock cố định ngăn deadlock khi A gửi B cùng lúc B gửi A. Debit và credit không bao giờ
được commit riêng; lỗi ở bất kỳ bước nào rollback toàn bộ.

## 3. Persistence

Không dùng ledger làm bảng nghiệp vụ duy nhất. Migration dự kiến thêm `spirit_stone_transfers`:

- `id`, `operation_id UNIQUE`, `sender_player_id`, `recipient_player_id`;
- `gross_amount`, `fee_amount`, `received_amount` dạng `NUMERIC(30,0)`;
- `policy_revision`, `status`, `created_at`;
- check amount dương, fee không âm, received = gross - fee;
- index lịch sử sender và recipient theo `(player_id, created_at DESC, id DESC)`.

Ledger dùng reference type `SPIRIT_STONE_TRANSFER`, cùng transfer ID nhưng reason riêng
`SPIRIT_STONE_TRANSFER_SENT` và `SPIRIT_STONE_TRANSFER_RECEIVED`.

## 4. Discord UX

- slash option người nhận dùng kiểu Discord User, số lượng dùng integer/string amount contract;
- không công khai số dư sender/recipient;
- lỗi insufficient/min/max là UI outcome rõ ràng, không dùng raw database error;
- nếu có confirmation, button owner-only và hết hạn không được debit;
- success receipt hiển thị người gửi, người nhận, amount thực nhận và mã giao dịch.

## 5. Policy đã duyệt

Baseline `Q-ECONOMY-016 = A` đã được cập nhật bởi `Q-ECONOMY-017 = A`:

- sender phải `REGISTERED`;
- recipient có thể `REGISTERED`, `GUEST` hoặc chưa có account;
- preview không tạo state; confirm tự tạo Guest Account/Wallet nếu recipient chưa có;
- recipient giữ số dư Guest Wallet khi dùng `/start` về sau;
- min 1, max sender balance, không phí/cap;
- owner-only confirmation 60 giây; timeout/hủy không debit; receipt public không có số dư.

## 6. Trạng thái triển khai

- GameData `SPIRIT_STONE_TRANSFER_V2_GUEST_RECIPIENT` ACTIVE.
- Migration 042 tạo `spirit_stone_transfers` và index history hai chiều.
- `/give nguoinhan:@User soluong:<amount>` ACTIVE với confirmation/cancel buttons.
- Service khóa hai Player theo ID tăng dần, reserve idempotency, debit/credit, transfer row và hai
  ledger entry trong một transaction.
- PostgreSQL rollback integration PASS cho REGISTERED recipient, existing Guest, auto-created Guest,
  preview read-only, replay, self, Guest sender và insufficient balance.

---

End
