# Unit Of Work Specification

Version: 2.0  
Status: LOCKED

## Purpose

UnitOfWork cung cấp transaction boundary cho một application use case mà không để business service phụ thuộc `pg`.

## Contract

```text
unitOfWork.execute(async transactionContext => result)
```

- PostgreSQL adapter thực hiện `BEGIN`, `COMMIT`, `ROLLBACK` và release connection.
- Repository adapter nhận transaction context khi nhiều aggregate phải commit atomically.
- Legacy `runInTransaction` là compatibility wrapper trên UnitOfWork.
- Battle và Discord renderer không được mở transaction.

## Failure Rule

Mọi exception trong work callback phải rollback và được propagate. Connection luôn được release trong `finally`.
