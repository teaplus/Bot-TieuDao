# Cache Adapter Implementation

Status: Phase 7 foundation  
Source of truth: PostgreSQL

## Contract

- Cache là tối ưu tùy chọn; cache miss hoặc cache unavailable phải đọc lại source of truth.
- Adapter mặc định là `NoOpCacheAdapter`; ứng dụng hiện không kết nối Redis.
- Namespace được giới hạn ở `GAME_DATA`, `PLAYER`, `INVENTORY`, `GUILD`, `SESSION` theo `CACHE_SPEC`.
- Key có dạng `<NAMESPACE>:<VERSION>:<IDENTITY>`. Version/revision là cơ chế invalidation chính; TTL chỉ là lớp phụ của adapter.
- Cache adapter error được báo qua callback quan sát nhưng không thay thế hoặc làm sai kết quả loader.
- Không cache mutation result để quyết định idempotency, reward, wallet, inventory capacity, cooldown hoặc lock ownership.

## Cache-aside flow

1. Tạo versioned key từ namespace, identity và revision.
2. Đọc adapter.
3. Hit hợp lệ trả read model cache.
4. Miss/lỗi adapter gọi loader PostgreSQL hoặc immutable GameData source.
5. Ghi best-effort vào adapter; lỗi ghi không làm request thất bại.

## Cutover gate cho Redis

- Có workload metric chứng minh read bottleneck.
- Có owner/version cho từng cached read model.
- Có invalidation event hoặc revision rõ ràng.
- Test cache unavailable và stale-entry không làm sai correctness.
- PostgreSQL vẫn là source of truth và transaction/idempotency không phụ thuộc Redis.
