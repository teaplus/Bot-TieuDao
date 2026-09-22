# SQL Migration Specification

Version: 2.0  
Status: LOCKED

## Rules

- Migration là SQL file immutable trong `src/database/migrations`.
- Tên file theo mẫu `NNN_description.sql` và chạy theo thứ tự lexical.
- `schema_migrations` lưu version, SHA-256 checksum và thời điểm áp dụng.
- Applied migration bị sửa phải làm startup thất bại.
- Runner dùng PostgreSQL advisory lock để chỉ một instance migrate tại một thời điểm.
- Mỗi migration chạy trong transaction riêng.
- Bootstrap gọi migration runner; không chứa DDL gameplay rải rác.
