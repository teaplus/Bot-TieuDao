# DAILY, WORK VÀ MINI GAME SPECIFICATION

Module: Economy / Activity / Mini Game

Version: 0.5

Status: DAILY/WORK/SLOT/HIGH LOW/BLACKJACK/WORD CHAIN ACTIVE

---

## Mục tiêu

Bổ sung nguồn tương tác ngắn để kiếm Linh Thạch hằng ngày và nhóm Mini Game có thể cược
Linh Thạch. Business logic độc lập Discord.js, data-driven và dùng PostgreSQL làm nguồn sự
thật duy nhất.

## Phạm vi dự kiến

- Daily claim theo period key của game.
- Work có cooldown và giới hạn theo ngày.
- Mini Game registry cho phép thêm game mà không sửa transaction core.
- Message command chỉ điều phối parsing, preview, lựa chọn và operation ID.
- Không Redis, scheduler tick hoặc ghi database theo giây.

## Guest economy trước `/start`

- Discord user chưa tạo nhân vật được tự tạo identity `GUEST` khi gọi
  Daily/Work/Slot/Cao Thấp hoặc tham gia Nối Từ.
- Guest dùng wallet, ledger, idempotency, period counter và Mini Game round giống registered
  Player; vị trí economy mặc định là map khởi đầu Thanh Vân Sơn Mạch.
- Repository gameplay mặc định chỉ trả `REGISTERED`; chỉ Economy Service được dùng
  `includeGuest`, nên guest không thể truy cập tiến trình nhân vật.
- `/start` atomically nâng cùng row thành `REGISTERED`, giữ toàn bộ wallet/lịch sử và cộng quà
  khởi đầu 100 Linh Thạch. Không tạo identity/wallet thứ hai.

## Quyết định đã khóa

- `Q-ECONOMY-004/008`: message command, prefix cấu hình mặc định `!`.
- `Q-ECONOMY-005`: Daily/Work scale theo giá cơ sở map, không streak.
- `Q-ECONOMY-006`: Slot + Cao Thấp cho V1.
- `Q-ECONOMY-007`: không giới hạn lượt, cược tối đa bằng wallet.
- `Q-ECONOMY-009`: Slot dùng ba cuộn, chỉ bộ ba trả thưởng; RTP `90,4606%`.
- `Q-ECONOMY-011`: Cao Thấp dùng private roll `1..101`, mốc 51; Cao thắng `52..101`, Thấp
  thắng `1..50`, đúng 51 mất cược; đúng nhận tổng `2×`. Không hiển thị RTP trên UI.
- `Q-ECONOMY-010`: phiên Cao Thấp hết hạn sau 120 giây và lazy-refund toàn bộ wager.

Daily/Work/Slot/Cao Thấp/Blackjack và Nối Từ đã author theo quyết định. Nối Từ là Mini Game cộng đồng
không đặt cược; reward winner dùng wallet/ledger và cap ngày giống Economy source khác.

## Kiến trúc module

```text
Message command / optional components
→ EconomyActivityService hoặc MiniGameService
→ Policy / Calculator / Resolver thuần JavaScript
→ IdempotentOperationExecutor
→ PostgreSQL transaction
   → khóa Player
   → period counter / validate wager
   → wallet debit và credit
   → reward claim hoặc mini-game round snapshot
   → resource ledger
→ immutable result DTO
→ Discord presentation
```

### Ranh giới trách nhiệm

- `DailyPolicy`: resolve period key và eligibility, không truy cập Discord.
- `WorkPolicy`: resolve cooldown/daily capacity và reward tier.
- `MiniGameRegistry`: resolve game definition, input schema và paytable revision.
- `MiniGameEngine`: nhận seed + wager + choice và trả immutable outcome; không ghi DB.
- Service: orchestration và transaction contract.
- Repository: SQL persistence, locking và constraint; không chứa xác suất gameplay.

## GameData dự kiến

### `economy/earning_activities.json`

Mỗi activity định nghĩa stable ID, loại `DAILY|WORK`, currency, reward scaling policy,
cooldown, period limits, Realm/Map gate và revision.

### `minigames/minigame_rules.json`

Mỗi game định nghĩa stable ID, trạng thái, input schema, bet policy, payout table, target RTP,
tie policy, round TTL nếu có và revision.

Validator phải từ chối:

- currency/reward reference không tồn tại;
- amount, weight hoặc multiplier âm;
- paytable không khớp symbol/outcome registry;
- RTP khai báo không khớp RTP tính từ paytable;
- game active thiếu bet bounds hoặc settlement policy;
- duplicate activity/game ID và revision rỗng.

## Persistence dự kiến

Tái sử dụng `player_wallets`, `player_period_counters`, `reward_claims`, `resource_ledger` và
`idempotency_records`.

Migration 037 đã tạo `player_economy_activity_runs` và `player_minigame_rounds`, trong đó round gồm:

- `id`, `player_id`, `game_id`, `rules_revision`;
- `operation_id UNIQUE`;
- `wager`, `payout`, `net_delta` dạng `NUMERIC(30,0)`;
- `input_snapshot`, `outcome_snapshot`, `rng_snapshot` dạng `JSONB`;
- `status`, `started_at`, `settled_at`, optional `expires_at`;
- check amount không âm và snapshot bắt buộc khi settled.

Game nhiều bước có tối đa một active round cho mỗi Player/game bằng partial unique index.

## Transaction và race condition

### Daily

Trong một transaction: khóa Player, reserve operation ID, tạo reward claim với source ref chứa
Daily period key, credit wallet, ghi ledger và complete response. Unique business key bảo vệ cả
hai request khác operation ID cùng claim một ngày.

### Work

Trong một transaction: khóa Player, kiểm tra cooldown, increment Daily counter trong limit,
roll reward bằng server seed, credit wallet, ghi snapshot/ledger và complete response.

### Mini Game

Game một bước debit wager, resolve outcome, credit payout, ghi round + ledger và complete
idempotency trong cùng transaction. Slot dùng cú pháp `!slot <số tiền>`, ví dụ `!slot 1000`;
mức tối thiểu bằng giá cơ sở map, mức tối đa bằng số dư wallet. Không debit trước rồi chờ một
transaction khác.

Game nhiều bước reserve/debit ở start; choice cuối settle đúng một lần bằng row lock + operation
ID. Timeout được lazy-evaluate khi Player mở hoặc gửi request tiếp theo, không cần scheduler tick.

## RNG và audit

- Seed do server sinh; không nhận seed từ Discord input.
- Persist rules revision, seed/outcome snapshot và paytable entry đã dùng.
- Cùng seed + input + revision phải replay cùng kết quả.
- Không dùng `Math.random()` trực tiếp trong service hoặc command.
- Audit xác suất chạy sample lớn để so target RTP; unit test dùng deterministic seed.

## UI dự kiến

- Hiển thị số dư trước thao tác.
- Daily hiển thị thời điểm nhận tiếp.
- Work hiển thị cooldown, lượt còn lại và reward range.
- Mini Game hiển thị min/max bet, luật/paytable ngắn và cảnh báo có thể mất cược.
- Kết quả hiển thị wager, payout, lời/lỗ và số dư mới; outcome không dùng error làm UI.
- Message command bỏ qua bot/webhook, chống mention abuse và không log nội dung message thô.
- Component phản hồi nếu được dùng phải owner-only và hết hạn an toàn.

## Trạng thái triển khai

Daily/Work/Slot/Cao Thấp/Blackjack/Nối Từ GameData, service, repository, migration và message commands đã hoàn
tất. Slot
lưu revision, seed, ba biểu tượng, wager/payout/net delta và hai ledger entry trong cùng
transaction; paytable có thể chỉnh tại `src/data/minigames/minigame_rules.json`. Cao Thấp đã có
paytable và timeout hoàn cược. Cao Thấp dùng private persisted round theo Player, giữ wager lúc
start, owner-only button settle đúng một lần, và lazy-refund sau 120 giây. Gọi lại
`!highlow <số tiền>` sau restart sẽ khôi phục ván ACTIVE chưa hết hạn; nếu đã hết hạn thì hoàn
ván cũ rồi mới mở ván mới trong cùng transaction.

Blackjack dùng `!blackjack <số tiền>`/`!xidach <số tiền>`, plain text và ba buttons Bốc/Dừng/
Gấp đôi. Một deck 52 lá được xào theo seed và snapshot; dealer đứng mọi 17. Natural/thắng thường
đều tổng `2×`, push hoàn wager. TTL 120 giây lazy auto-Stand; Double atomically giữ thêm một
wager. RTP phụ thuộc chiến thuật nên không hiển thị phần trăm cố định.

Nối Từ dùng `src/data/minigames/word_chain_rules.json`; `!noitu` mở phòng theo channel và đáp
án là message thường đúng hai từ. PostgreSQL giữ session/move, khóa row khi xử lý đồng thời,
failure cộng dồn đến 10 và settlement winner/reward atomically. Không timeout hoặc collector
RAM; `!noitu stop` hủy không thưởng. Dictionary canonical có 40.476 cụm `vi` đã lọc từ database
nguồn và có thể import lại idempotent bằng `db:import:vi-words`.

---

End
