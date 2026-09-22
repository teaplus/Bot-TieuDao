# 002_TECH_STACK.md

# Technology Stack

Version: 1.0.0

---

# 1. Mục tiêu

Tài liệu này định nghĩa toàn bộ công nghệ được phép sử dụng trong dự án.

Đây là tài liệu duy nhất quyết định Tech Stack.

AI không được tự ý:

- Thêm Framework
- Thêm ORM
- Thêm Package
- Đổi Runtime
- Đổi Database

Nếu muốn thay đổi phải cập nhật tài liệu này trước.

---

# 2. Design Philosophy

Framework hướng tới

- Hiệu năng cao
- Ít Dependency
- Dễ Debug
- Dễ Mở Rộng
- Không phụ thuộc Framework

Mọi Gameplay phải do Game Engine xử lý.

Không để Framework quyết định kiến trúc.

---

# 3. Runtime

Runtime chính

```
Node.js
```

Yêu cầu

```
>= 22 LTS
```

Không hỗ trợ

- Bun
- Deno

---

# 4. Programming Language

Ngôn ngữ

```
JavaScript
```

Chuẩn

```
ECMAScript 2022
```

Không sử dụng

```
TypeScript
```

Lý do

- Dự án Discord Bot
- Code sinh nhanh
- Không cần bước Build

---

# 5. Module System

Sử dụng

```
ES Module (ESM)
```

Ví dụ

```javascript
import BattleEngine from "./BattleEngine.js";

export default BattleEngine;
```

Không sử dụng

```
CommonJS

require()

module.exports
```

Lý do

- Chuẩn JavaScript hiện đại
- Hỗ trợ tốt hơn trong IDE
- Dễ chuyển sang TypeScript sau này
- Tree Shaking
- Chuẩn Node.js mới

package.json

```json
{
    "type":"module"
}
```

---

# 6. Package Manager

Sử dụng

```
npm
```

Không sử dụng

- Yarn
- pnpm

---

# 7. Discord SDK

Sử dụng

```
discord.js

v14
```

Cho phép

- Slash Command
- EmbedBuilder
- ButtonBuilder
- ModalBuilder
- SelectMenuBuilder
- Collector

Không sử dụng

- discord-akairo
- sapphire
- eris

---

# 8. Database

Database chính

```
PostgreSQL
```

Version

```
16+
```

Driver

```
pg
```

Không sử dụng ORM.

Không sử dụng

- Prisma
- Sequelize
- TypeORM
- MikroORM

Lý do

- Query tối ưu
- Dễ Debug
- Chủ động Index
- Chủ động Transaction

---

# 9. Cache

Sử dụng

```
Redis
```

Library

```
ioredis
```

Redis chỉ lưu

- Cache
- Session
- Cooldown
- World Boss
- Online Player
- Ranking

Redis không lưu dữ liệu vĩnh viễn.

---

# 10. Logger

Library

```
winston
```

Log Level

```
info

warn

error

debug
```

Không sử dụng

```
console.log()
```

ngoại trừ Development.

---

# 11. Environment

Library

```
dotenv
```

Biến môi trường

```
.env
```

Không commit

```
.env
```

lên Git.

---

# 12. UUID

Library

```
uuid
```

Sử dụng

```
UUID v4
```

Không tự sinh ID.

---

# 13. Scheduler

Library

```
node-cron
```

Sử dụng cho

- Reset Dungeon
- World Boss Spawn
- Daily Quest
- Weekly Quest
- Mail Cleanup

Không dùng

```
setInterval
```

cho tác vụ dài hạn.

---

# 14. Validation

Validation viết thủ công.

Không sử dụng

- Joi
- Zod
- Yup

Lý do

Project không có REST API công khai.

---

# 15. HTTP Server

Hiện tại

Không triển khai.

Nếu cần API

Sử dụng

```
Fastify
```

Không sử dụng

```
Express
```

---

# 16. JSON Configuration

Gameplay phải đọc từ

```
JSON

hoặc

Database
```

Ví dụ

```
skills.json

effects.json

monsters.json

items.json

cultivation.json
```

Không Hardcode.

---

# 17. Testing

Framework

```
Jest
```

Bắt buộc Test

- Battle
- Damage
- Skill
- Effect
- Calculator

---

# 18. Docker

Hỗ trợ

```
Docker Compose
```

Services

```
Bot

PostgreSQL

Redis
```

Không bắt buộc.

---

# 19. Source Control

Git

Branch

```
main

develop

feature/*
```

Không commit

```
node_modules

.env

logs
```

---

# 20. Dependency List

Production

```
discord.js

dotenv

pg

ioredis

uuid

winston

node-cron
```

Development

```
nodemon

jest

eslint

prettier
```

Không cài thêm Package nếu chưa có lý do rõ ràng.

---

# 21. Performance Guidelines

Ưu tiên

- O(1)
- O(log n)

Hạn chế

- O(n²)
- O(n³)

Battle Engine không được phép query Database.

Battle Engine chỉ làm việc trên Memory.

---

# 22. Security

Không ghi Token trong Source Code.

Không ghi Password trong Git.

Không Trust dữ liệu từ Discord.

Mọi dữ liệu phải Validate.

---

# 23. Future Upgrade

Cho phép mở rộng

- RabbitMQ
- Kafka
- ElasticSearch
- Prometheus
- Grafana

Hiện tại

Không triển khai.

---

# 24. Technology Decision Summary

| Thành phần | Công nghệ |
|------------|-----------|
| Runtime | Node.js 22 |
| Language | JavaScript ES2022 |
| Module | ES Module |
| Database | PostgreSQL |
| Cache | Redis |
| Discord | discord.js v14 |
| Logger | winston |
| Environment | dotenv |
| Scheduler | node-cron |
| Testing | Jest |
| Package Manager | npm |

---

# 25. AI Instruction

Khi sinh source code

AI phải luôn tuân thủ tài liệu này.

Không tự ý:

- đổi package
- đổi framework
- đổi module system
- thêm dependency

Nếu có xung đột

Tài liệu này có ưu tiên cao hơn source code.

---

# End of File