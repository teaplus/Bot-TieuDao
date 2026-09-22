# Idempotency Specification

Version: 1.0  
Status: LOCKED

## Contract

- Application adapter cung cấp `operationId` trung lập; Discord adapter dùng interaction ID.
- `operation_id` là unique key ở PostgreSQL.
- Cùng operation ID và cùng request hash trả response đã hoàn tất.
- Cùng operation ID nhưng khác request hash trả conflict.
- Reward/balance/checkpoint và idempotency result phải commit cùng transaction.
- Retention/cleanup chờ `Q-IDEMPOTENCY-002`; business unique key một lần không phụ thuộc cleanup response.
