# Event Bus và Transactional Outbox Implementation

Status: Phase 7 foundation  
Delivery: at-least-once

## Producer contract

- Producer gọi `OutboxRepository.enqueue(client, event)` bằng cùng transaction client với domain mutation.
- Event bắt buộc có aggregate type/ID, event type và object payload.
- Không publish in-memory trước khi transaction commit.

## Worker contract

- Scheduler chỉ trigger `OutboxWorker.processBatch()`; worker không chứa gameplay scheduling rule.
- Claim chạy trong transaction ngắn bằng `FOR UPDATE SKIP LOCKED`, sau đó ghi owner lease và commit.
- Handler chạy ngoài database transaction của claim.
- Ack hoặc fail chạy trong transaction ngắn riêng và chỉ thành công khi `locked_by` vẫn thuộc worker.
- Event envelope và payload được deep-freeze. `event.id` là idempotency key bắt buộc của subscriber.

## Approved delivery policy

- Lease: 60 giây.
- Delivery: at-least-once; duplicate delivery là hợp lệ sau crash hoặc lease expiry.
- Retry: exponential từ 5 giây, tối đa 900 giây.
- Attempt thứ 10 thất bại chuyển `dead_lettered_at` và không còn dispatch tự động.
- Handler dự kiến chạy lâu hơn lease phải gọi `context.renewLease()`; lease mất trả trạng thái `LEASE_LOST` và worker không được ack/fail event thuộc owner khác.
- Poll interval và batch scheduling thuộc deployment/Scheduler configuration, không phải gameplay rule.
- Policy MVP đã duyệt: entrypoint `worker:outbox` chạy process riêng, poll 1 giây, batch 100 và tối đa một batch/tick. Timer giữ process sống; `SIGINT/SIGTERM` dừng scheduler rồi đóng pool.
- Discord gateway không chạy Outbox polling. Chỉ tăng worker/drain rate khi outbox dispatch-lag telemetry chứng minh cần.
- Handler registry trong entrypoint hiện rỗng vì chưa có subscriber domain cụ thể; producer/subscriber mới phải đăng ký idempotent handler trước khi phát event tương ứng.

## Correctness rules

- Subscriber phải idempotent theo outbox event ID trước khi tạo side effect.
- Không tuyên bố exactly-once cho external systems.
- Advisory lock không dùng cho row-owned outbox work.
- Dead-letter replay là thao tác vận hành riêng; chưa tự động replay.
