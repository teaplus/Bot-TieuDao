# Keyset Pagination Contract

## Baseline

- Page size mặc định 20, tối đa 100 và chỉ nhận positive safe integer.
- Hot hoặc unbounded list dùng keyset `(sortValue, id)`; không dùng OFFSET.
- Cursor là Base64URL opaque payload, version 1, mang direction `NEXT`/`PREVIOUS`, sort value, ID tie-breaker và context tùy chọn.
- Cursor không chứa SQL. Invalid version/payload bị từ chối bằng `PAGINATION_CURSOR_INVALID`.
- Endpoint bounded muốn dùng pagination khác phải có ngoại lệ được ghi rõ.

Cursor chỉ opaque, không phải secret. Không đưa credential, PII nhạy cảm hoặc authorization decision vào cursor.

Read model có revision/snapshot nên đặt revision trong cursor context. Nếu snapshot đã đổi, endpoint phải từ chối cursor stale thay vì âm thầm trả trang không nhất quán.

## Verification

Chạy `npm run audit:keyset-pagination`.
