# HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY DISCORD TU TIÊN RPG

Version: 1.0  
Cập nhật: 2026-08-11  
Phạm vi: chạy local, server thử nghiệm và production cơ bản

---

## 1. Tổng quan runtime

Dự án sử dụng:

- Node.js `>= 20.19.0`;
- Discord.js `14.x`;
- PostgreSQL làm database duy nhất;
- JavaScript ES Module (`"type": "module"`);
- JSON trong `src/data` làm nguồn GameData;
- cơ chế idle theo Lazy Evaluation, không cần tiến trình ghi database mỗi giây;
- slash command và message command prefix, mặc định là `!`.

Bot phải được chạy từ thư mục gốc dự án vì command loader đọc đường dẫn tương đối
`./src/commands` và `./src/message-commands`.

## 2. Thành phần cần chuẩn bị

### 2.1. Phần mềm

Cần cài:

1. Node.js phiên bản `20.19.0` trở lên.
2. npm đi kèm Node.js.
3. PostgreSQL và một công cụ quản trị như `psql` hoặc pgAdmin.
4. Một Discord Application có Bot user.

Kiểm tra môi trường:

```powershell
node --version
npm --version
psql --version
```

Nếu `node --version` thấp hơn `20.19.0`, cần đổi Node.js trước khi cài dependency.

### 2.2. Discord Application

Trong Discord Developer Portal:

1. Tạo hoặc mở Application dùng cho dự án.
2. Tạo Bot user và lấy Bot Token.
3. Không đưa token vào source code, tài liệu, ảnh chụp hoặc commit.
4. Bật **Message Content Intent** ở phần Bot vì dự án có các lệnh message như
   `!balance`, `!daily`, `!work`, `!slot`, `!highlow`, `!noitu` và `!bj`.
5. Tạo installation/invite với hai scope:
   - `bot`;
   - `applications.commands`.
6. Cấp cho bot quyền phù hợp tại các channel chơi game, tối thiểu gồm khả năng xem channel,
   gửi message, gửi embed/file, đọc message history và thêm reaction.

Code hiện khai báo các Gateway Intent:

- `Guilds`;
- `GuildMessages`;
- `MessageContent`.

Theo tài liệu Discord, Message Content là privileged intent và phải được bật cho Application;
Application đủ điều kiện verification còn phải được Discord phê duyệt trước khi sử dụng. Xem
[Gateway Intents](https://docs.discord.com/developers/events/gateway) và
[OAuth2/Application Commands](https://docs.discord.com/developers/platform/oauth2-and-permissions).

## 3. Cài dependency

Mở PowerShell tại thư mục gốc dự án:

```powershell
cd D:\Tools\HGAC\TieuDao
npm install
```

Không chạy bot từ thư mục `src`.

Sau khi cài xong, có thể xác nhận Node đọc được project:

```powershell
node --check src/index.js
```

## 4. Tạo PostgreSQL database

Ví dụ dưới đây tạo một role riêng và để role đó sở hữu database. Thay password mẫu bằng password
mạnh của riêng môi trường:

```sql
CREATE ROLE tieudao_app WITH LOGIN PASSWORD 'THAY_PASSWORD_MOI';
CREATE DATABASE tieudao OWNER tieudao_app ENCODING 'UTF8';
```

Nếu database đã tồn tại thì không cần tạo lại. User trong `DATABASE_URL` phải có quyền:

- kết nối database;
- tạo và thay đổi table/index/constraint/trigger/function trong schema ứng dụng;
- đọc và ghi dữ liệu runtime;
- tạo bảng `schema_migrations`.

Không dùng chung database production cho integration test. Database test phải có URL riêng.

## 5. Tạo file `.env`

Sao chép file mẫu:

```powershell
Copy-Item .env.example .env
```

Không ghi đè `.env` nếu file này đã chứa cấu hình đang chạy.

Cấu hình tối thiểu:

```dotenv
DISCORD_TOKEN=BOT_TOKEN_CUA_BAN
GUILD_ID=SERVER_ID_DUNG_DE_TEST
SLASH_COMMAND_SCOPE=GLOBAL
DATABASE_URL=postgresql://tieudao_app:PASSWORD@localhost:5432/tieudao
NODE_ENV=development
MESSAGE_COMMAND_PREFIX=!

DB_POOL_MAX=5
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECT_TIMEOUT_MS=10000
DB_STATEMENT_TIMEOUT_MS=15000
DB_QUERY_TIMEOUT_MS=20000
DB_SLOW_QUERY_MS=250
```

### 5.1. Ý nghĩa biến chính

| Biến | Bắt buộc | Ý nghĩa |
| --- | --- | --- |
| `DISCORD_TOKEN` | Có | Bot Token của Discord Application. |
| `DATABASE_URL` | Có để chạy game | PostgreSQL connection string. |
| `SLASH_COMMAND_SCOPE` | Không | `GLOBAL` mặc định hoặc `GUILD`. |
| `GUILD_ID` | Khi dùng `GUILD` | Server nhận guild command; ở `GLOBAL` còn dùng để dọn override cũ. |
| `MESSAGE_COMMAND_PREFIX` | Không | Prefix message command, mặc định `!`. |
| `NODE_ENV` | Không | `development` hoặc `production`. |
| `DB_POOL_MAX` | Có ở production | Số connection tối đa của mỗi process. |
| `OUTBOX_WORKER_ID` | Không | ID ổn định nếu chạy outbox worker riêng. |

`DATABASE_URL` chứa ký tự đặc biệt trong username/password phải được URL-encode. Không in toàn bộ
URL này ra log hoặc gửi vào Discord.

### 5.2. Phạm vi slash command

Chạy public/multi-server:

```dotenv
SLASH_COMMAND_SCOPE=GLOBAL
```

Global command được Discord cung cấp cho mọi guild đã cài Application. Đây là cấu hình hiện tại
của dự án.

Chạy thử nhanh trên đúng một server:

```dotenv
SLASH_COMMAND_SCOPE=GUILD
GUILD_ID=ID_SERVER_TEST
```

Guild command chỉ tồn tại ở `GUILD_ID`. Discord khuyến nghị guild command cho kiểm thử nhanh và
global command cho bản public. Xem
[Application Commands](https://docs.discord.com/developers/interactions/application-commands).

Khi chuyển từ `GUILD` sang `GLOBAL`, tool của dự án đăng global registry trước rồi xóa guild
override cũ sau khi global PUT thành công.

### 5.3. Cấu hình production

Ví dụ:

```dotenv
NODE_ENV=production
DB_POOL_MAX=10
```

`DB_POOL_MAX` bắt buộc khi `NODE_ENV=production`. Giá trị đúng phải dựa trên connection budget
của PostgreSQL và tổng số bot/worker process, không nhân mặc định `10` cho mọi process.

Công thức tham khảo trong kiến trúc hiện tại:

```text
pool mỗi process = floor((tổng connection cho ứng dụng - phần dự phòng) / số process)
```

## 6. Chạy migration

Chạy migration trước khi khởi động bot:

```powershell
npm run db:migrate
```

Kết quả thành công có dạng:

```json
{
  "status": "PASS",
  "applied": []
}
```

`applied` rỗng nghĩa là database đã ở phiên bản mới nhất. Nếu có tên file, các migration đó vừa
được áp dụng.

Migration runner:

- dùng PostgreSQL advisory lock để chỉ một process migrate tại một thời điểm;
- chạy mỗi migration mới trong transaction riêng;
- lưu version và SHA-256 checksum trong `schema_migrations`;
- từ chối chạy nếu một migration đã áp dụng bị sửa nội dung.

Không chỉnh sửa file migration đã chạy trên database. Khi cần thay đổi schema, tạo migration mới
với số thứ tự tiếp theo.

Bot cũng gọi migration khi startup. Tuy vậy, chạy `npm run db:migrate` riêng trước giúp phân biệt
lỗi database với lỗi Discord bootstrap.

## 7. Đồng bộ slash command

Sau khi thêm, xóa hoặc đổi cấu trúc slash command, chạy:

```powershell
npm run sync:slash-commands
```

Kết quả hiện tại mong đợi:

```text
Đã nạp thành công 27 Slash Commands.
Đã đồng bộ 27 Slash Commands ở phạm vi GLOBAL.
```

Tool này:

1. đọc `DISCORD_TOKEN` và cấu hình scope;
2. lấy Application ID từ Discord;
3. nạp đúng command registry mà bot runtime sử dụng;
4. bulk overwrite command theo `GLOBAL` hoặc `GUILD`;
5. xóa guild override cũ khi đang chuyển sang global.

Không cần nhập Application ID thủ công.

Bot cũng tự đồng bộ command khi event `ClientReady` chạy. Tool độc lập vẫn nên được dùng trong
quy trình deploy vì nó báo lỗi Discord API rõ ràng mà không cần mở thêm bot process.

## 8. Khởi động bot

Chạy foreground:

```powershell
npm start
```

Bootstrap thành công sẽ thực hiện theo thứ tự:

1. kiểm tra cấu hình;
2. bootstrap toàn bộ GameData JSON;
3. kết nối PostgreSQL và chạy migration còn thiếu;
4. hydrate Nối Từ runtime từ database;
5. bật scheduler leaderboard;
6. nạp slash command và message command;
7. login Discord;
8. đồng bộ slash command theo scope cấu hình.

Giữ terminal mở khi chạy local. Dùng `Ctrl+C` để dừng. Không chạy nhiều instance bot ngoài ý
muốn vì mỗi instance có pool PostgreSQL và scheduler riêng.

Trong production, dùng process supervisor/container do môi trường triển khai quản lý, truyền `.env`
qua secret manager và cấu hình restart khi process lỗi. Không đưa Bot Token vào image hoặc source.

## 9. Outbox worker

Dự án có process outbox riêng:

```powershell
npm run worker:outbox
```

Worker dùng cùng `DATABASE_URL`, chạy migration và polling outbox mỗi giây. Chỉ bật worker khi
deployment thực sự sử dụng handler outbox; mỗi worker làm tăng tổng connection budget. Có thể đặt:

```dotenv
OUTBOX_WORKER_ID=production-worker-01
```

## 10. Kiểm tra nhanh sau khi chạy

### 10.1. Kiểm tra terminal

Không được có các lỗi:

- `CONFIG_MISSING_ENV`;
- `CONFIG_INVALID_ENV`;
- `DB_POOL_MAX_REQUIRED_IN_PRODUCTION`;
- lỗi authentication/timeout PostgreSQL;
- lỗi Discord login hoặc slash registration;
- lỗi GameData validation.

### 10.2. Kiểm tra trên Discord

Thử theo thứ tự:

1. `/trogiup` — kiểm tra command registry và danh sách lệnh.
2. `/start` — tạo nhân vật.
3. `/nhanvat` — mở dashboard nhân vật.
4. `/tuido` — kiểm tra inventory UI.
5. `!help` — kiểm tra message router.
6. `!balance` — kiểm tra số Linh Thạch và Guest Economy; `!daily` — kiểm tra nhận thưởng và
   Message Content Intent.

Nếu dùng một tài khoản test đã có nhân vật, không cần chạy lại `/start`.

### 10.3. Audit không ghi dữ liệu gameplay

Chạy các audit nền tảng:

```powershell
npm run audit:data-schema-alignment
npm run audit:database-foundation
npm run audit:slash-command-registration
npm run audit:command-help
npm run audit:architecture-boundaries
```

Mỗi lệnh phải trả `"status": "PASS"`.

## 11. Database test và integration test

Các harness PostgreSQL cần database test riêng. Có thể bổ sung vào `.env`:

```dotenv
PROGRESSION_TEST_DATABASE_URL=postgresql://user:password@localhost:5432/tieudao_progression_test
ACTIVITY_TEST_DATABASE_URL=postgresql://user:password@localhost:5432/tieudao_activity_test
PHASE7_TEST_DATABASE_URL=postgresql://user:password@localhost:5432/tieudao_phase7_test
```

Ba URL này không được trỏ tới `DATABASE_URL` production.

Các bài kiểm tra chính:

```powershell
npm run verify:progression:postgres
npm run verify:activity:postgres
npm run verify:phase7:postgres
npm run verify:word-chain:postgres
npm run verify:blackjack:postgres
npm run verify:spirit-stone-transfer:postgres
npm run verify:character-reset:postgres
```

Đọc output từng tool trước khi dùng trên môi trường quan trọng. Một số integration tool chạy
transaction rollback, nhưng database URL vẫn phải được kiểm tra chính xác trước khi thực thi.

## 12. Import từ điển Nối Từ

Để import bảng `words` từ database nguồn:

```dotenv
WORD_DICTIONARY_SOURCE_DATABASE_URL=postgresql://user:password@host:5432/database_nguon
```

Sau đó chạy:

```powershell
npm run db:import:vi-words
```

Database nguồn phải khác `DATABASE_URL` và có bảng `public.words` đúng contract import. Không chạy
import khi chưa kiểm tra URL nguồn/đích.

## 13. Application Emoji và asset UI

Ảnh map, portrait, banner và icon bitmap đã nằm trong `src/assets/ui`. Application Emoji là tài
nguyên thuộc từng Discord Application. Nếu đổi sang Application/Bot mới, cần sync emoji cho app mới:

```powershell
npm run sync:equipment-application-emojis
npm run sync:battle-semantic-application-emojis
npm run sync:item-resource-application-emojis
npm run sync:shop-area-application-emojis
```

Các tool trên thay đổi tài nguyên Discord bên ngoài dự án. Chỉ chạy khi `DISCORD_TOKEN` trỏ đúng
Application. Nếu mapping emoji chưa có, presentation layer có Unicode fallback và gameplay vẫn chạy.

## 14. Xử lý lỗi thường gặp

### 14.1. Slash command không xuất hiện ở server mới

Kiểm tra:

```dotenv
SLASH_COMMAND_SCOPE=GLOBAL
```

Sau đó chạy:

```powershell
npm run sync:slash-commands
```

Đảm bảo server đã cài đúng Application với scope `applications.commands`, Bot Token thuộc cùng
Application và command không bị guild permission/channel permission chặn. Reload Discord client
sau khi sync nếu danh sách command cục bộ chưa cập nhật.

### 14.2. Chỉ một vài command xuất hiện

Chạy:

```powershell
npm run audit:command-help
npm run sync:slash-commands
```

Global sync bulk overwrite toàn bộ registry. Khi có `GUILD_ID`, tool cũng xóa override cũ sau khi
global sync thành công.

### 14.3. Prefix command không phản hồi

Kiểm tra:

- Message Content Intent đã bật trong Developer Portal;
- bot có quyền xem và gửi message tại channel;
- prefix đúng với `MESSAGE_COMMAND_PREFIX`;
- terminal không có Gateway close code `4013` hoặc `4014`.

Discord có thể trả message content rỗng nếu Application không có Message Content Intent. Tham khảo
[Message Content Intent](https://docs.discord.com/developers/events/gateway#message-content-intent).

### 14.4. `Ứng dụng không phản hồi`

Kiểm tra terminal tại đúng thời điểm dùng lệnh. Các nguyên nhân thường gặp trong dự án:

- process bot đã dừng;
- Discord token sai/hết hiệu lực;
- database mất kết nối hoặc query timeout;
- migration/GameData bootstrap thất bại;
- bot thiếu permission tại channel;
- đang chạy code cũ nhưng command schema đã được sync từ code mới.

Sau khi sửa cấu hình, restart bot và thử `/trogiup` trước.

### 14.5. PostgreSQL authentication hoặc timeout

Kiểm tra:

```powershell
psql "$env:DATABASE_URL" -c "SELECT CURRENT_TIMESTAMP;"
```

Sau đó chạy:

```powershell
npm run db:migrate
```

Không dán `DATABASE_URL` thật vào log hỗ trợ công khai.

### 14.6. `DATABASE_MIGRATION_CHECKSUM_MISMATCH`

Một migration đã áp dụng bị sửa nội dung. Không sửa checksum trong database và không sửa tiếp file
cũ để vượt guard. Khôi phục đúng nội dung migration đã áp dụng, sau đó tạo migration mới cho thay đổi.

### 14.7. Production báo thiếu `DB_POOL_MAX`

Khi `NODE_ENV=production`, khai báo `DB_POOL_MAX` là bắt buộc:

```dotenv
DB_POOL_MAX=10
```

Phải tính lại giá trị theo số process và giới hạn PostgreSQL thực tế.

## 15. Quy trình cập nhật phiên bản vận hành

Quy trình đề xuất cho mỗi lần cập nhật code/data:

1. Sao lưu database theo chính sách môi trường.
2. Dừng bot process cũ nếu deployment không hỗ trợ rolling update an toàn.
3. Cài dependency theo `package.json`.
4. Chạy các audit liên quan.
5. Chạy `npm run db:migrate`.
6. Chạy `npm run sync:slash-commands` nếu command schema thay đổi.
7. Khởi động bot bằng `npm start` hoặc process supervisor.
8. Smoke test `/trogiup`, `/nhanvat`, `/tuido` và `!help`.
9. Theo dõi error/slow-query log sau deploy.

Không sửa migration cũ, không dùng database test làm production và không khởi động nhiều scheduler
ngoài chủ ý.

## 16. Lệnh vận hành tóm tắt

```powershell
# Cài dependency
npm install

# Migrate database
npm run db:migrate

# Kiểm tra slash registry
npm run audit:slash-command-registration
npm run audit:command-help

# Đồng bộ slash command lên Discord
npm run sync:slash-commands

# Chạy bot
npm start

# Worker tùy chọn
npm run worker:outbox
```

---

Nguồn cấu hình chuẩn:

- `.env.example`;
- `package.json`;
- `src/platform/config/loadAppConfig.js`;
- `src/platform/database/loadPostgresPoolConfig.js`;
- `src/platform/database/runMigrations.js`;
- `src/tools/syncSlashCommands.js`.

End
