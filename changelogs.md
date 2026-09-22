# Changelog phân tích kiến trúc

## 2026-09-22 - Cập nhật Giao diện Tu vi & Sửa lỗi Luyện Khí

- Sửa lỗi trong realms.json khiến cảnh giới Luyện Khí không tăng yêu cầu tu vi (mãi mãi ở mốc 100). Đã cập nhật hệ số growthPerStage của Luyện Khí thành 1.33, tạo đường cong sức mạnh mượt mà nối tiếp hoàn hảo lên Trúc Cơ.
- Cải tiến giao diện lệnh /tuvi: Hệ thống nay đã hiển thị rõ ràng trạng thái **Bình Cảnh** (Bottleneck) khi người chơi đạt 100% tiến độ. Hiệu ứng hiển thị trực quan (đổi màu đỏ cảnh báo) và thể hiện mức phạt tốc độ hấp thu linh khí giảm xuống chỉ còn 20%.



## 2026-09-21 - Can bang lai Chi so Luc chien Cot loi (Power Scaling Balance)

- Tinh toan va chuan hoa lai toan bo chi so initial cua cac Dai Canh Gioi trong realms.json de khop voi duong cong suc manh cua player.
- Dieu chinh lai he so tang truong bac growthPerStage cua Boss tu 1.5 xuong muc 1.25 (bam sat voi 1.2 cua player).
- Giu nguyen co che Map tinh de dam bao tinh nang Carry.



## 2026-09-21 - Cập nhật cơ chế Effect Động (Dynamic Effect & Khống Chế)

- Sửa lỗi nghiêm trọng trong TurnManager.js: Hủy bỏ cơ chế reset cursor = 0 khi có thực thể chết giữa round. Tránh hiện tượng kẻ địch được cấp lại lượt đánh ngay sau khi vừa hết thời gian bị Choáng/Khống chế (người chơi lầm tưởng khống chế vô tác dụng).
- Xóa bỏ hoàn toàn hiệu ứng SLOW (Làm Chậm) khỏi dự án vì cơ chế Turn Order của game chỉ tính tốc độ ở đầu mỗi Round (khiến hiệu ứng vô dụng ở giữa Round). Cụ thể:
  - Xóa SLOW khỏi danh sách effects.json và modifier tương ứng SLOW_SPD.
  - Loại bỏ các affix liên quan đến Làm chậm khỏi equipment_affixes.json.
  - Thay thế hiệu ứng SLOW bằng STUN và FREEZE trong toàn bộ chiêu thức của quái vật (ví dụ: Vồ Mồi, Dây Leo Khóa) ở file monster_attack_skill_templates.json để đem lại hiệu quả khống chế thực tế.
  - Xóa dòng passive Làm chậm của Tông môn Băng trong sect_effects.json và sect_template.json.



## 2026-08-11 — Gợi ý phần cần nối sau câu sai

- Phản hồi qualified failure nay hiển thị `requiredPart` hiện tại:
  `❌ Sai · Hãy nối cụm từ bắt đầu bằng “<requiredPart> …” · Lỗi x/10`.
- Vẫn không tiết lộ câu sai do ngoài từ điển, nối không khớp hay trùng từ; chỉ gợi ý hướng đi hợp
  lệ tiếp theo. Không thay đổi failure counter, transaction hoặc database.
- Cập nhật audit Word Chain presentation để khóa gợi ý động từ `result.requiredPart`.

## 2026-08-11 — Cải thiện lời nhắc input Nối Từ

- Đổi câu kỹ thuật “Chỉ nhập đúng 2 từ, không dùng dấu câu” thành lời nhắc theo ngữ cảnh:
  `⚠️ Từ không phù hợp · Hãy nối bằng cụm 2 từ bắt đầu với “<requiredPart> …”`.
- Với input sai định dạng, service đọc session hiện tại để trả `requiredPart`; không ghi move,
  không tăng failure và không thay đổi settlement policy.
- Cập nhật audit runtime khóa chính xác nội dung tiếng Việt và required part động.

## 2026-08-11 — Chuẩn hóa phản hồi sai của Nối Từ

- Theo yêu cầu UI, mọi qualified failure — ngoài từ điển, bắt đầu không khớp hoặc dùng lại từ —
  chỉ phản hồi `❌ Sai · Lỗi x/10`; không còn tiết lộ lý do cụ thể cho người chơi.
- Chỉ thay Discord presentation. Runtime vẫn snapshot `failureReason` nội bộ để audit, tăng lỗi
  và settlement ở mốc 10 như trước; không cần migration database.
- Mở rộng audit presentation để ngăn thông báo “không có trong từ điển” hoặc “phải bắt đầu bằng”
  quay lại giao diện.

## 2026-08-11 — Nối Từ tính cụm ngoài từ điển là câu sai

- Chủ dự án làm rõ và ghi đè semantics cũ của `Q-WORD-007`: cụm đúng định dạng hai từ nhưng
  không tồn tại trong dictionary phải là qualified failure, không phải lượt bỏ qua.
- Runtime nay ghi move với reason `NOT_IN_DICTIONARY`, react `❌`, reply lý do, tăng failure và
  settlement bình thường nếu đó là lỗi thứ 10. Người vừa nối đúng vẫn không được tự tạo lỗi ở
  lượt kế tiếp.
- Thêm migration 045 cho phép failure ngoài dictionary có `word_id = NULL`, đồng thời constraint
  vẫn bắt buộc move đúng/sai nối/trùng phải tham chiếu word thật. Raw input chuẩn hóa tiếp tục
  được snapshot để audit.
- Input sai format vẫn không tính lỗi nhằm tránh hội thoại thông thường phá phiên.
- Migration 045 đã áp dụng thành công. `audit:word-chain` và PostgreSQL rollback verifier PASS:
  ngoài dictionary tăng failure, đủ 10 lỗi settlement chính xác, winner/reward/ledger không đổi.

## 2026-08-11 — Sửa Nối Từ im lặng khi không nhận đáp án

- Tái hiện từ luồng code: backend PostgreSQL và dictionary 40.476 cụm đều PASS, nhưng input ngoài
  dictionary cùng invalid input bị handler trả về im lặng nên người chơi tưởng bot không nhận
  message.
- Bản sửa ban đầu phản hồi ngoài dictionary nhưng không tính lỗi theo policy cũ. Chủ dự án sau đó
  làm rõ đây phải là qualified failure; hành vi cuối cùng được ghi tại mục phía trên. Input hai
  phần có dấu câu/ký tự sai vẫn nhận hướng dẫn `⚠️` và không tăng bộ đếm lỗi.
- Tiếp tục bỏ qua hội thoại không giống attempt để tránh bot chiếm toàn bộ channel. Move đúng vẫn
  chỉ react `✅`, sai dictionary-valid vẫn react `❌` và tăng lỗi như trước.
- Mở rộng `audit:word-chain` khóa hai nhánh feedback mới; PostgreSQL verifier tiếp tục kiểm tra
  transaction, nối đúng, 10 qualified failure, winner và reward.

## 2026-08-11 — Message command xem Linh Thạch

- Thêm `!balance` để xem số Linh Thạch hiện có bằng plain message gọn; không đưa số dư trở lại
  UI của Slot, Cao Thấp, Blackjack hoặc Nối Từ.
- Lệnh dùng được cả trước và sau `/start`. `PlayerAccountService` bảo đảm Guest Account và đọc
  wallet `SPIRIT_STONE` trong cùng Unit of Work; command không truy cập PostgreSQL trực tiếp.
- Bổ sung lệnh vào `!help` và tài liệu chạy dự án. Tổng số message command tăng từ 7 lên 8.
- Thêm `audit:balance-command` khóa contract Guest/Registered dùng chung, currency ID, định dạng
  số Việt Nam, plain-message payload và việc không ping người gọi.
- PASS `audit:balance-command`, Guest Economy PostgreSQL rollback, Word Chain command loader và
  architecture boundary; không cần migration database hoặc đồng bộ slash command.
- Audit Economy tổng hợp đồng thời phát hiện Slot runtime đang chọn profile 20% trong khi revision
  và quyết định `Q-ECONOMY-018` vẫn là 15%. Ghi `Q-ECONOMY-019`; không tự sửa phần Slot vì độc
  lập với `!balance` và cần chủ dự án xác nhận profile phát hành.

## 2026-08-11 — Sửa lỗi Slot revision vượt `VARCHAR(80)`

- Tái hiện lỗi production `value too long for type character varying(80)` khi chạy `!slot`.
  Nguyên nhân là Mini Game revision sau khi ghép base config, Slot profile revision và active
  profile dài 88 ký tự; migration 037 giới hạn `player_minigame_rounds.rules_revision` ở 80.
- Không rút gọn/cắt revision vì đây là identity snapshot dùng cho audit/replay và profile tương lai
  có thể tiếp tục dài hơn. Thêm migration 044 mở rộng riêng cột Mini Game revision từ `VARCHAR(80)`
  sang `TEXT`; đây là thay đổi widening, giữ nguyên mọi row hiện hữu.
- Thêm `verify:slot-revision:postgres` để persist thật revision 88 ký tự qua
  `MiniGameRoundRepository`, kiểm tra `information_schema` trả kiểu `text` rồi rollback.
- Mở rộng Slot profile audit để khóa sự tồn tại/nội dung migration và bảo đảm fixture thực sự dài
  hơn giới hạn cũ, tránh bài kiểm tra PASS giả do revision ngắn lại.
- Migration 044 đã áp dụng thành công trên database hiện tại. PostgreSQL integration rollback
  PASS: persist nguyên vẹn revision 88 ký tự, `information_schema` xác nhận cột là `text` và không
  còn lỗi `character varying(80)`.

## 2026-08-11 — Phân tích tăng tỷ lệ trúng Slot

- Tính lại trực tiếp từ paytable đang chạy: ba reel độc lập với weight `35/25/18/12/7/3` cho xác
  suất ba biểu tượng giống nhau `6,643%`, tương đương trung bình 1/15,05 ván; RTP `90,4606%`.
- Không tự tăng riêng weight vì payout hiện lên tới `900×`; khi game không giới hạn lượt, cấu hình
  RTP `>=100%` sẽ tạo nguồn Linh Thạch mất kiểm soát.
- Mở `Q-ECONOMY-018` với ba bảng đã tính exact: khoảng 10%, 15% và 20% hit rate, đều tái cân bằng
  multiplier để RTP nằm khoảng 91–92%. Đề xuất phương án B: `14,896%` hit, 1/6,71 ván và RTP
  `91,8383%`; chưa sửa GameData trước khi chủ dự án chọn.
- Theo yêu cầu cấu hình hóa, tách Slot balance khỏi `minigame_rules.json` sang
  `src/data/minigames/slot_rules.json`. File có `activeProfileId`, hướng dẫn chỉnh và bốn profile
  CURRENT/10%/15%/20%; đổi profile chỉ cần sửa JSON rồi restart bot.
- Normalizer tự materialize profile active vào Mini Game runtime, tự tính hit rate/RTP và ghép
  slot revision/profile ID vào round rules revision. Validator kiểm tra profile, symbol unique,
  tổng weight 100, số dương và RTP dưới 100%; không cần tự tính hoặc nhập lại RTP bằng tay.
- Giữ `CURRENT_6_PERCENT` active vì `Q-ECONOMY-018` chưa có lựa chọn; xác suất/payout runtime chưa
  thay đổi. Thêm `audit:slot-balance-profiles` khóa cả bốn bảng và nguồn cấu hình duy nhất.
- PASS audit bốn Slot profile, Slot engine/runtime, Mini Game presentation, Economy Message
  Commands, Blackjack, toàn bộ GameData alignment và architecture boundary. Runtime resolve đúng
  profile hiện tại với hit `6,6430%`, RTP `90,4606%`; không có migration database.
- Chủ dự án chọn `Q-ECONOMY-018 = B`. Kích hoạt `FRIENDLY_15_PERCENT` và nâng Slot balance
  revision lên `SLOT_BALANCE_PROFILES_V2_FRIENDLY_15`: weight `51/24/13/6/4/2`, payout
  `5,2×/11×/22×/55×/170×/680×`, hit `14,8960%` (trung bình 1/6,71 ván), RTP `91,8383%`.
  Không thay SlotEngine, schema hoặc dữ liệu Player.
- PASS audit profile active, Slot deterministic engine, compact/privacy presentation, Economy
  Message Command, Blackjack revision propagation, toàn bộ GameData alignment và architecture
  boundary. Seed kiểm thử mới tìm được kết quả thắng; ledger vẫn đúng hai entry wager/payout.

## 2026-08-11 — Compact UI Mini Game và ẩn số dư cá nhân

- Theo yêu cầu UI/UX, chuẩn hóa presentation cho Slot, Cao Thấp, Blackjack và Nối Từ; không thay
  engine, wager, payout, cooldown, session persistence, ledger hoặc Guest Economy.
- Xóa toàn bộ số dư cá nhân khỏi màn bắt đầu, kết quả, hoàn cược và thông báo thiếu tiền. Service
  vẫn giữ balance nội bộ để kiểm tra atomic wager/payout và ghi ledger nhưng Discord projection
  chỉ hiển thị Cược, Kết quả/Lời-Lỗ hoặc khoản hoàn/nhận cần thiết.
- Slot còn hai field `Cược/Kết quả`; Cao Thấp rút luật xuống hai câu và hai field; Blackjack plain
  text gộp mỗi bên thành điểm + bài, kết quả thành một dòng; Nối Từ compact lời mở ván, luật,
  failure và settlement.
- Thêm `audit:minigame-presentation` khóa privacy contract không có `Số dư`, `result.balance` hoặc
  `error.balance` trong bốn presentation source. Mở rộng audit riêng từng game để kiểm tra payload
  thực tế không chứa số dư fixture.
- PASS toàn bộ audit presentation, Slot, Cao Thấp, Blackjack, Nối Từ, Economy Message Command,
  Guest Economy, command help và architecture boundary. Search cuối không còn tham chiếu số dư
  trong bốn Mini Game presentation.

## 2026-08-11 — Phân tích `/give` tới người chưa tạo nhân vật

- Đối chiếu ảnh lỗi với runtime và xác nhận đây là policy outcome, không phải lỗi Discord:
  `Q-ECONOMY-016 = A`, GameData và service đều yêu cầu sender/recipient `REGISTERED`.
- Guest Economy đã đủ nền tảng để recipient chưa `/start` có wallet và giữ số dư khi tạo nhân vật,
  nhưng việc tự tạo Guest Account từ `/give` thay đổi eligibility và bề mặt chống farm nên không
  tự áp dụng.
- Mở `Q-ECONOMY-017` với ba hướng. Đề xuất sender vẫn phải REGISTERED, recipient được
  REGISTERED/GUEST và tự tạo Guest khi chưa có row; bot/self bị chặn, transaction/ledger/
  idempotency giữ nguyên. Phần transfer giữa hai Player REGISTERED không bị chặn.
- Chủ dự án chọn A. Nâng transfer GameData lên V2: sender vẫn `REGISTERED_ONLY`, recipient dùng
  `REGISTERED_OR_GUEST_AUTO_CREATE`. Preview chỉ đọc và mô phỏng Lữ Khách; confirm mới
  `ensureGuest`, khóa Player theo ID rồi debit/credit/ledger/idempotency trong cùng transaction.
- `/give` hiển thị thông báo Linh Thạch sẽ nằm trong ví Lữ Khách khi recipient chưa `/start`.
  Daily, Work, Slot, Cao Thấp, Blackjack và Nối Từ tiếp tục tự `ensureGuest` như trước, không đổi
  eligibility hoặc reward policy.
- PostgreSQL rollback integration PASS: transfer REGISTERED → REGISTERED giữ hành vi cũ; Guest
  có sẵn nhận 100; user chưa có account được preview read-only rồi confirm tạo Guest và nhận 50;
  replay idempotent, Guest sender bị chặn và insufficient không làm thay đổi balance. Guest
  Economy cùng Economy Message Command audits cũng PASS.

## 2026-08-11 — Hướng dẫn cài đặt và vận hành dự án

- Ghi nhận slash command global đã được sửa và sync thật với Discord API ở changelog: đủ 27
  command, cleanup guild override cũ và tool trả `PASS`.
- Tạo `docs/RUN_PROJECT_GUIDE.md` version 1.0, mô tả đầy đủ từ Node/PostgreSQL/Discord
  Application, `.env`, migration, global/guild command sync, startup, outbox worker, smoke test,
  audit, integration database, import Nối Từ, Application Emoji đến quy trình cập nhật.
- Hướng dẫn khóa đúng contract runtime hiện tại: chạy từ project root; Node `>=20.19.0`;
  Message Content Intent cho prefix command; `applications.commands` cho slash; production bắt
  buộc `DB_POOL_MAX`; migration có advisory lock/checksum; test URL không được trỏ production.
- Bổ sung `PROGRESSION_TEST_DATABASE_URL` và `ACTIVITY_TEST_DATABASE_URL` vào `.env.example`,
  đồng thời liên kết guide mới từ `docs/README.md`.
- Đối chiếu tài liệu Discord chính thức về Global/Guild Application Commands, OAuth2 scope và
  privileged Message Content Intent; không đưa token, connection string thật hoặc Git History vào
  tài liệu.

## 2026-08-11 — Chuyển slash command sang global cho bot đa server

- Chẩn đoán việc server mới chỉ thấy `/tuido`: `CommandHandler` hard-code
  `applicationGuildCommands` theo một `GUILD_ID`, nên toàn bộ registry chỉ được phát hành ở server
  phát triển; `/tuido` nhìn thấy ở server khác là command global cũ/override ngoài luồng hiện tại.
- Thêm `SLASH_COMMAND_SCOPE=GLOBAL|GUILD`, mặc định `GLOBAL`; cấu hình hiện tại đã đặt `GLOBAL`.
  `GUILD` bắt buộc có `GUILD_ID`, giá trị scope không hợp lệ khiến bootstrap fail-fast.
- Global sync dùng `Routes.applicationCommands` để phát hành toàn bộ command cho mọi server. Sau
  khi global PUT thành công, guild override cũ tại `GUILD_ID` được xóa để không che command mới.
- Truyền config qua `index → ExtendedClient → CommandHandler`, không còn đọc `GUILD_ID` trực tiếp
  trong command registration. Thêm `audit:slash-command-registration` với REST recorder, xác nhận
  global payload đầy đủ, cleanup guild override, chế độ guild tùy chọn và config guard.
- Thêm tool vận hành `sync:slash-commands`: lấy Application ID từ chính Discord token, nạp cùng
  command registry với runtime và thực hiện sync độc lập, không cần khởi chạy thêm bot/database.
  Registration trả result typed; lỗi Discord API được log rồi propagate cho tool, còn startup bot
  bắt lỗi tại Discord boundary để không tạo unhandled rejection.
- Đã chạy sync thật với Discord API thành công: nạp và phát hành đủ 27 command ở phạm vi
  `GLOBAL`, đồng thời xóa guild override cũ. Tool trả `PASS`, `commandCount = 27` và
  `clearedGuildOverride = true`.

## 2026-08-10 — Phát hành `/xoanhanvat`, giữ Linh Thạch

- Chủ dự án chọn policy production-safe của `Q-PLAYER-002`, nhưng yêu cầu cooldown data-driven
  và giá trị ban đầu bằng `0`. Đã resolve câu hỏi và nâng
  `018_CHARACTER_RECREATE_SPEC.md` lên version 1.0 `ACTIVE`.
- Thêm `player/character_reset_rules.json` và đăng ký/normalize/validate trong GameData. Policy
  giữ `SPIRIT_STONE`, không cấp lại 100 Linh Thạch khi recreate, confirmation 60 giây và chặn
  activity/craft/minigame đang active; cooldown có thể đổi bằng JSON mà không sửa service.
- Migration 043 thêm `players.character_reset_count`, `last_character_reset_at` và immutable
  `player_character_reset_history`; migration đã áp dụng thành công trên database hiện tại.
- Thêm `CharacterResetRepository/Service` với lock order Player → active state → wallet,
  idempotency, snapshot trước reset, reset character projection/currency khác và ledger trong
  cùng PostgreSQL transaction. Identity, Linh Thạch, transfer/ledger/idempotency, period counter
  và economy history được giữ lại.
- Điều chỉnh `PlayerRuntimeRepository.createPlayer`: quà khởi đầu 100 Linh Thạch chỉ cộng khi
  `character_reset_count = 0`; `/start` sau reset vẫn cấp lại starter equipment/recipe/công pháp.
- Thêm slash command `/xoanhanvat`, preview ephemeral, Danger confirm owner-only và timeout/hủy
  không mutation; command help đã cập nhật.
- PostgreSQL integration rollback PASS: chặn Blackjack active, giữ 1.000 Linh Thạch, reset 50
  Sect Point về 0 có ledger, xóa character projection, replay operation không reset lần hai và
  recreate không cộng lại 100. Các audit policy, GameData và command help đều PASS.

## 2026-08-10 — Phân tích xóa và tạo lại nhân vật

- Xác nhận runtime chưa có command xóa/reset để chạy lại `/start`. Không thể chỉ chuyển account
  sang GUEST vì inventory/progression cũ còn nguyên và `/start` sẽ cộng thêm quà/starter content.
- Không chọn hard-delete: transfer/Nối Từ dùng foreign key `RESTRICT`, ledger/history cần giữ để
  audit và chống reset farm reward.
- Tạo `docs/10_GAMEPLAY/018_CHARACTER_RECREATE_SPEC.md`; hướng nền tảng là reset toàn bộ character
  projection trong transaction, giữ SPIRIT_STONE cùng immutable economy history rồi chuyển về
  GUEST để `/start` recreate.
- Mở `Q-PLAYER-002` để chốt starter 100, retention economy, cooldown và active-run gate. Đề xuất
  production-safe 30 ngày; chưa tự triển khai.

## 2026-08-10 — Phân tích slash command gửi Linh Thạch

- Kiểm tra code/docs hiện tại: chưa có transfer use case hoặc transfer table; wallet, ledger,
  idempotency và PostgreSQL transaction đã có thể tái sử dụng.
- Tạo `docs/10_GAMEPLAY/017_SPIRIT_STONE_TRANSFER_SPEC.md` version 0.1. Thiết kế atomic debit +
  credit, immutable transfer record, hai ledger entry cùng reference và operation ID.
- Xác định race/deadlock contract: khóa sender/recipient theo ID tăng dần trước khi mutate; không
  khóa theo hướng gửi để hai giao dịch A→B và B→A không chờ vòng.
- Mở `Q-ECONOMY-016` cho eligibility guest/registered, fee/cap, confirmation và receipt. Đề xuất
  V1 chỉ REGISTERED, không phí/cap, owner-only confirmation 60 giây; chưa tự triển khai.
- Chủ dự án khóa tên slash command là `/give`; đồng bộ spec và giữ policy transfer chờ lựa chọn
  tại `Q-ECONOMY-016`.
- Chủ dự án chọn `Q-ECONOMY-016 = A`. Resolve policy: sender/recipient REGISTERED, không fee/cap,
  min 1/max wallet, xác nhận owner-only 60 giây và public receipt không lộ balance.
- Thêm GameData transfer policy, migration 042, `SpiritStoneTransferRepository/Service` và slash
  command `/give nguoinhan soluong`. Hủy/timeout không debit; bot/self/guest bị từ chối.
- Migration 042 đã áp dụng trên PostgreSQL hiện tại. Integration rollback PASS: chuyển 400 làm
  wallet 1.000→600 và 100→500, đúng hai ledger entry; replay idempotent không chuyển lần hai;
  self, guest và insufficient bị chặn. Transfer/command-help/GameData audits PASS.

## 2026-08-10 — Phân tích yêu cầu Blackjack plain-text

- Đọc toàn bộ `docs/GAME MINI/blackjack.md`. Khóa được phần độc lập: UI không embed, biểu diễn
  rank/chất bằng text và emoji, giấu một lá dealer, dùng buttons, edit cùng một message và hiển
  thị kết quả/số dư cuối ván.
- Đối chiếu nền tảng Slot/Cao Thấp: Blackjack phải là persisted multi-step round, debit wager
  atomically khi start, server-seeded deterministic deck, owner-only action, row lock + operation
  ID cho từng button và lazy lifecycle sau restart. Discord message chỉ là projection.
- Tạo `docs/10_GAMEPLAY/016_BLACKJACK_MINIGAME_SPEC.md` version 0.1 ở trạng thái
  `DESIGN BLOCKED`. Chưa thêm game ACTIVE hoặc settlement vì tài liệu thiếu luật có ảnh hưởng
  trực tiếp đến economy.
- Mở `Q-ECONOMY-013` với ba hướng: Blackjack quốc tế MVP, Blackjack đầy đủ có Split, hoặc Xì
  Dách Việt Nam. Đề xuất A nhưng không tự áp dụng. Các điểm chờ chốt gồm action, soft 17,
  natural/push payout, deck, timeout và bet policy.
- Chủ dự án chọn `Q-ECONOMY-013 = A`. Khóa Blackjack quốc tế MVP một deck, Hit/Stand/Double,
  dealer đứng soft 17, natural tổng 2,5×, thắng 2×, push hoàn wager và timeout tự Stand.
- Mở `Q-ECONOMY-014`: wager lẻ tạo nửa Linh Thạch ở payout 3:2 và RTP phụ thuộc chiến thuật.
  Đề xuất chỉ nhận wager chẵn cùng metadata `PLAYER_STRATEGY_DEPENDENT`; chưa tự áp dụng.
- Thêm `BlackjackEngine` thuần JavaScript, không phụ thuộc Discord/database: tạo và xào đủ 52
  lá bằng seeded RNG, tính Ace mềm/cứng, nhận biết natural/bust, dealer đứng mọi 17 và state
  transition deterministic cho Hit/Stand/Double. Engine cố ý từ chối payout có phần lẻ bằng
  `BLACKJACK_FRACTIONAL_PAYOUT_UNRESOLVED` cho đến khi `Q-ECONOMY-014` được chốt.
- `audit:blackjack-engine` PASS: 52 card unique, replay cùng seed chính xác, Ace adjustment,
  Stand/Double settlement và guard phần lẻ đều đúng.
- Chủ dự án thay payout natural 3:2 bằng lời 1:1. Resolve `Q-ECONOMY-014`: natural và thắng
  thường đều tổng `2×`, push `1×`, thua `0`; bỏ hoàn toàn bài toán phần lẻ. RTP giữ metadata
  `PLAYER_STRATEGY_DEPENDENT`, không công bố phần trăm cố định.
- Kích hoạt `BLACKJACK` trong `minigame_rules.json` revision V3. Mở `!blackjack <wager>` với
  alias `!xidach`/`!xi-dach`, UI plain text, 3 owner-only buttons và edit cùng một message.
- Mở rộng `MiniGameService`/`MiniGameRoundRepository`: start debit, ACTIVE deck/hand/action
  snapshot, restore sau restart, row lock action, Double debit wager thứ hai, payout/ledger
  atomically và TTL 120 giây lazy auto-Stand. Không cần migration mới vì schema 037 đã đủ.
- `verify:blackjack:postgres` PASS trong rollback: ba persisted round cho Stand, Double wager
  1.000→2.000 và timeout auto-Stand; không còn ACTIVE row. Các audit GameData, Economy command,
  Word Chain và architecture boundary tiếp tục PASS.
- Bổ sung alias ngắn `!bj` và wager token `all` cho Blackjack. `all` được resolve từ wallet sau
  khi khóa Player trong transaction; số dư sau debit bằng 0 nên nút Double tự disabled.
- PostgreSQL rollback integration PASS với wallet 5.000: `!bj all` giữ đúng 5.000, số dư sau
  debit bằng 0, Double disabled và settlement vẫn atomically.
- Mở `Q-ECONOMY-015` vì `half` trên số dư lẻ thiếu quy tắc làm tròn. Chưa tự chọn floor/ceil;
  numeric wager và `all` vẫn ACTIVE độc lập.
- Chủ dự án chọn `Q-ECONOMY-015 = A`. `!bj half` resolve bằng `floor(balance / 2)` sau wallet
  lock, không tự nâng lên min bet; số dư lẻ luôn để lại nhiều hơn phần cược đúng 1 Linh Thạch.
- PostgreSQL rollback integration PASS: wallet 501 cược `half = 250`, còn 251; wallet 199 tạo
  half 99 dưới min bet 100 bị từ chối và giữ nguyên số dư.

## 2026-08-06 — Ghi nhận scale 50.000 thành viên và phác thảo Mini Game Nối Từ

- Ghi kịch bản vận hành Discord server khoảng 50.000 thành viên, dự kiến vài trăm đến vài
  nghìn người hoạt động đồng thời. Tách rõ online concurrency khỏi request throughput và chưa
  cam kết capacity khi chưa load-test command thật.
- Tạo `docs/11_PLATFORM/018_50000_MEMBER_SCALING_READINESS.md` ở trạng thái `DEFERRED`, lưu các
  hạng mục triển khai sau: stateless High Low component routing, lightweight Economy query,
  tối ưu Guest ensure, rate limit/backpressure, connection budget và multi-process load-test.
- Kiểm tra read-only bảng `public.words` trong PostgreSQL `bot_tu_tien_test`; không migration và
  không thay đổi dữ liệu. Riêng `lang_code = 'vi'` có 70.511 record: 21.636 từ một thành phần,
  40.595 cụm hai thành phần, 8.280 cụm dài hơn; bảng hiện chưa có index.
- Tạo `docs/10_GAMEPLAY/015_WORD_CHAIN_MINIGAME_DRAFT.md` để mô tả luồng, normalization,
  session/move persistence, row lock và lazy timeout. Mở `Q-WORD-001..003` cho mô hình phiên,
  contract “hai từ”, timeout/điểm/reward; chưa tự áp dụng phương án đề xuất hoặc viết runtime.
- Chủ dự án chọn `Q-WORD-001 = A`, `Q-WORD-002 = A`, `Q-WORD-003 = B`. Đã khóa phòng cộng
  đồng theo channel, đáp án bằng message thường, cụm đúng hai thành phần có dấu và cấm dùng
  lại trong session. Hướng reward là thưởng người thắng/chuỗi.
- `Q-WORD-003` giữ `ANSWERED` vì chưa có điều kiện thắng, timeout, công thức/cap thưởng. Mở
  `Q-WORD-004` cho lifecycle/reward và `Q-WORD-005` cho punctuation/content moderation. Spec
  nâng lên 0.2 `DESIGN PARTIALLY APPROVED`; theo yêu cầu hoãn, chưa tạo migration hoặc runtime.
- Chủ dự án tiếp tục chọn `Q-WORD-004 = A`, `Q-WORD-005 = A`: mỗi move gia hạn inactivity
  timeout, người nối hợp lệ cuối là ứng viên thắng; input chỉ gồm hai thành phần chữ cái có
  dấu, punctuation bị loại và denylist có revision. `Q-WORD-005` đã RESOLVED.
- `Q-WORD-004` giữ `ANSWERED` do chưa có timeout, minimum player/move và reward/cap. Mở
  `Q-WORD-006` với ba bộ thông số đối chiếu economy hiện tại; spec nâng lên 0.3. Không thay đổi
  PostgreSQL hoặc runtime.
- Chủ dự án chọn biến thể `Q-WORD-006 = A`: timeout 60 giây, tối thiểu 3 người, reward theo
  base map/chain multiplier, dừng thủ công không thưởng; đổi cap từ 1 thành 10 reward
  claim/Player/ngày và cấm một người tự nối hai lượt liên tiếp.
- Yêu cầu “kết thúc sau 10 lượt hợp lệ mà sai” chưa xác định rõ là 10 đúng hoặc sai, hay chỉ xét
  sai sau mốc 10. Mở `Q-WORD-007` để tránh biến mọi hội thoại/sai format thành hành vi phá ván;
  spec nâng lên 0.4, chưa triển khai database/runtime.
- Chủ dự án làm rõ `Q-WORD-007`: không có timeout; ván kết thúc sau 10 attempt hợp lệ theo
  format/dictionary nhưng nối sai. Loại bỏ rule 60 giây cũ. Message hội thoại, sai format hoặc
  ngoài dictionary không tăng failure; người có move đúng gần nhất là ứng viên thắng.
- Mở `Q-WORD-008` để chọn failure cộng dồn, liên tiếp/reset hay theo unique Player. Spec nâng
  lên 0.5; chưa thay đổi PostgreSQL hoặc runtime theo yêu cầu hoãn triển khai.
- Chủ dự án chọn `Q-WORD-008 = A`: qualified failure cộng dồn toàn session, move đúng không
  reset; failure thứ 10 kết thúc ván. Đồng bộ `Q-WORD-003/004/006/007/008` thành `RESOLVED`.
- Spec Nối Từ nâng lên 1.0 `READY FOR IMPLEMENTATION — DEFERRED`. Toàn bộ contract về channel,
  dictionary, failure, winner, reward và anti-farm đã đủ để triển khai sau; lượt này vẫn không
  tạo migration, GameData hoặc runtime theo yêu cầu tạm hoãn.
- Chủ dự án yêu cầu tiếp tục triển khai và cho phép chuyển dictionary test sang database chính.
  Thêm `word_chain_rules.json` revision `WORD_CHAIN_V1`, registry/normalizer/validator và các
  module `WordChainNormalizer`, repository, service, Discord presentation/message handler.
- Phát hành message command `!noitu`, `!noitu status`, `!noitu stop`; đáp án thường chỉ chạy sau
  khi command router bỏ qua. Sai shape hoặc ngoài dictionary không tạo Guest/move; attempt hợp
  lệ dùng session row lock và operation ID. UI tiếng Việt hiển thị từ cần nối, lỗi `x/10`, số
  người, winner và reward.
- Migration 039 tạo `words`, `word_chain_sessions`, `word_chain_moves`, partial unique active
  channel, used-word/index/constraint và persistence settlement. Integration lần đầu phát hiện
  fixture Discord ID vượt độ dài và truy vấn count ứng viên mở đầu khoảng 0,5 giây; sửa fixture,
  thêm migration 040 cùng thuật toán chọn theo ID range/revision, không sửa checksum migration
  đã áp dụng.
- Migration 039–040 PASS trên `bot_tu_tien`. Import idempotent đọc 70.511 record `vi` từ
  `bot_tu_tien_test`, đưa 40.476 cụm đúng hai từ/chỉ chữ vào `bot_tu_tien` và loại 30.035 record
  ngoài contract. Chạy import lần hai vẫn đúng 40.476 row, không nhân đôi.
- `verify:word-chain:postgres` PASS trong transaction rollback: 3 Player, 2 move đúng, 10
  qualified failure cộng dồn, winner đúng, reward map đầu 100 Linh Thạch, một ledger entry.
  PASS thêm `audit:word-chain`, Economy message commands, Guest Economy, GameData alignment và
  architecture boundaries. Spec nâng 1.1 `ACTIVE`.
- Cải thiện UX Nối Từ theo yêu cầu: bỏ reply cho từng attempt; đúng chỉ react `✅`, sai hợp lệ
  chỉ react `❌`, người vừa nối đúng bị chặn react `⏳`. Failure thứ 10 react `❌` và gửi embed
  kết quả bằng channel message độc lập. Không thay đổi state machine, reward hoặc PostgreSQL.
- Điều chỉnh tiếp UX câu sai: vẫn react `❌` nhưng reply bằng text thường `Sai` kèm lý do và
  bộ đếm `x/10`. Failure thứ 10 gộp kết quả, winner và reward vào cùng tin nhắn text; không còn
  dùng embed kết quả Nối Từ. Câu đúng tiếp tục chỉ react `✅`.
- Tối ưu scope phiên theo yêu cầu: migration 041 thay partial unique index active theo channel
  bằng invariant tối đa một phiên `ACTIVE` trên mỗi guild; start dùng advisory lock theo guild
  nên hai channel mở đồng thời không thể tạo hai ván. Lệnh gọi từ channel khác hiển thị mention
  channel đang chơi.
- `WordChainMessageHandler` giữ registry nhẹ `guildId → channelId`, hydrate từ PostgreSQL khi bot
  bootstrap và cập nhật khi start/status/stop/settlement. Message ngoài channel active được loại
  trước service/transaction; registry không thay thế PostgreSQL và restart không làm mất state.
- Mở `Q-WORD-009` vì đề xuất cooldown “2–3 giây” chưa có giá trị được duyệt. Chưa tự áp dụng rate
  limit; phần invariant/registry độc lập vẫn được triển khai.
- Migration 041 đã áp dụng trên PostgreSQL cấu hình hiện tại. `audit:word-chain` PASS; integration
  rollback PASS với 40.476 từ, xác nhận start cạnh tranh ở channel thứ hai trả về phiên của
  channel đầu, rồi hoàn tất 2 move đúng/10 lỗi/3 người/reward 100 đúng một lần.

## 2026-08-05 — Guest economy trước `/start`

- Resolve `Q-ECONOMY-012`: user chưa tạo nhân vật vẫn dùng được `!daily`, `!work`, `!slot` và
  `!highlow`. Thêm `PlayerAccountService.ensureGuest`; bốn adapter gọi ensure trước use case.
- Migration 038 thêm `players.account_status = GUEST|REGISTERED` và
  `character_registered_at`; backfill toàn bộ Player hiện hữu thành REGISTERED. Migration đã áp
  dụng thành công trên PostgreSQL cấu hình hiện tại.
- `PlayerRuntimeRepository.findById` mặc định chỉ thấy REGISTERED; Economy Activity/Mini Game
  phải opt-in `includeGuest`. Guest vì vậy có wallet/map khởi đầu nhưng không được xem như nhân
  vật trong tu luyện, battle, inventory hoặc các gameplay khác.
- `createPlayer` chuyển thành atomic upsert: row GUEST được nâng cấp, giữ số dư/lịch sử rồi cộng
  quà `/start` 100 Linh Thạch; REGISTERED duplicate bị chặn. Kết quả `/start` hiển thị số dư thật
  sau nâng cấp thay vì luôn ghi 100.
- `audit:guest-economy-account` PASS trực tiếp trên PostgreSQL trong transaction rollback: guest
  bị ẩn khỏi gameplay, wallet `0 → 500`, nâng cấp thành registered giữ `500 + 100 = 600`, ensure
  lại không downgrade và đăng ký trùng bị chặn.

## 2026-08-05 — Phát hành private `!highlow <số tiền>`

- Resolve `Q-ECONOMY-011 = A`: mỗi round sinh deterministic hidden number riêng trong `1..101`,
  UI dùng mốc 51; Cao thắng `52..101`, Thấp thắng `1..50`, đúng 51 mất wager. Đúng nhận tổng
  `2×`, RTP audit `99,0099%` và không hiển thị RTP cho Player.
- Cao Thấp chuyển `ACTIVE`; GameData revision `MINIGAME_V2_HIGH_LOW_PRIVATE_101`, settlement
  `PERSISTED_TWO_STEP`, TTL 120 giây và `LAZY_REFUND_WAGER`.
- Mở rộng `MiniGameRoundRepository` với active lookup/player-scoped lock, insert ACTIVE, settle
  và expire. `HighLowEngine` thuần deterministic, không truy cập Discord hay database.
- `MiniGameService.startHighLow/chooseHighLow/expireHighLow` dùng Player-first row lock và
  idempotency. Start debit wager + ledger; thắng credit tổng `2×`; thua chỉ đóng round; timeout
  expire + hoàn wager + ledger. Gọi lại command khôi phục ván còn hạn hoặc atomically hoàn ván
  hết hạn trước khi mở ván mới.
- Thay placeholder bằng panel `!highlow 1000` có button Cao/Thấp, owner-only collector, kết quả
  thiên số, wager, lời/lỗ và balance. Một Player tối đa một ACTIVE round; Player khác không thể
  đọc hoặc settle round không thuộc sở hữu.
- `audit:minigame-high-low` PASS deterministic high/low/tie, payout `2×`, private round isolation,
  active recovery, cross-player rejection, lazy refund và parsing/component operation ID. Slot,
  economy message commands và architecture boundaries tiếp tục PASS.

## 2026-08-05 — Làm rõ private round Cao Thấp và tham khảo Discord bot

- Chủ dự án khóa isolation: mỗi Player có process/round Cao Thấp riêng, không tác động Player
  khác. Contract khớp partial unique `(player_id, game_id) WHERE status = 'ACTIVE'`, owner-only
  component và transaction khóa Player/round.
- Tham khảo Highlow phổ biến trên Discord: hint riêng + button Higher/Lower/Exact. Không sao chép
  reward model vì bot tham khảo không mất wager khi sai, khác contract cược `2×` của dự án.
- Cập nhật `Q-ECONOMY-011` còn hai lựa chọn cân bằng: private midpoint `1..101` (RTP audit
  `99,0099%`) hoặc private rank `1..13` mốc 7 (RTP audit `92,3077%`). Cả hai đều hòa mất cược,
  không hiển thị RTP trong UI và không cho Player chọn phía có xác suất vượt trội.

## 2026-08-05 — Thay payout Cao Thấp bằng tổng thưởng `2×`

- Chủ dự án thay yêu cầu payout Cao Thấp cũ: Player cược amount tùy ý; đoán đúng nhận tổng đúng
  `2 × wager`, đoán sai mất wager; không dùng tỷ lệ phần trăm hoặc tổng `1,9×`.
- Cập nhật GameData thành multiplier basis points `20000`; loại bỏ RTP/payback cũ và đánh dấu
  tie settlement `PENDING_Q_ECONOMY_011`. Revision tăng thành
  `MINIGAME_V2_HIGH_LOW_2X_PENDING` để round audit không nhận nhầm policy.
- Tính lại rủi ro: lá mốc 7 + hòa mất cược cho RTP `92,3077%`; lá mốc ngẫu nhiên được nhìn trước
  cho RTP tối ưu tối thiểu `142,0118%`. Cập nhật `Q-ECONOMY-011` để chỉ còn chọn deal order và
  tie settlement; đề xuất lá mốc 7, hòa mất cược.
- Chưa debit wager hoặc phát hành button trong lúc câu hỏi còn OPEN. RTP chỉ dùng audit nội bộ,
  không phải chỉ số hiển thị cho người chơi.

## 2026-08-05 — Khóa timeout Cao Thấp và phát hiện xung đột RTP

- Resolve `Q-ECONOMY-010 = C`: phiên Cao Thấp có TTL 120 giây; request tiếp theo sẽ
  lazy-expire và hoàn 100% wager atomically, component chỉ dành cho chủ phiên.
- Ghi policy vào `minigame_rules.json` và mở rộng validator để khóa đúng TTL, settlement
  `LAZY_REFUND_WAGER` cùng ownership `PLAYER_ONLY`.
- Trong phân tích deal engine, xác định payout `1,9×` đạt RTP `95,3846%` chỉ khi lựa chọn không
  tận dụng lá mốc. Nếu lật một trong 13 hạng trước rồi Player chọn phía có nhiều kết quả hơn, RTP
  tối ưu tăng thành khoảng `142,6036%`, trái `Q-ECONOMY-007` và tạo exploit kinh tế.
- Mở `Q-ECONOMY-011` với ba phương án: lá mốc cố định 7, chọn trước khi lật, hoặc payout động.
  High Low chuyển sang `GAMEPLAY_BLOCKED`; command thông báo trạng thái và tuyệt đối chưa debit.

## 2026-08-05 — Kích hoạt `!slot <số tiền>`

- Resolve `Q-ECONOMY-009 = A`; cú pháp chính thức là `!slot <số tiền>`, ví dụ `!slot 1000`.
  Paytable chuyển hoàn toàn vào `src/data/minigames/minigame_rules.json`: weight
  `35/25/18/12/7/3`, bộ ba trả tổng `7×/14×/28×/70×/225×/900×`, RTP `90,4606%`.
- Thêm `SlotEngine` thuần deterministic, weighted roll từ server seed và payout integer làm tròn
  xuống. Validator tự tính lại RTP từ paytable, từ chối RTP `>= 100%`, symbol sai hoặc settlement
  không phải `ATOMIC_SINGLE_REQUEST`.
- Thêm `MiniGameService` và `MiniGameRoundRepository`: khóa Player bằng idempotent transaction,
  kiểm tra cược tối thiểu theo base map/tối đa theo wallet, debit cược, persist round + RNG
  snapshot, credit payout và ghi ledger. Thêm guard giới hạn `NUMERIC(30,0)` trước mutation.
- Thay placeholder Slot bằng UI kết quả ba cuộn, tiền cược, lời/lỗ và số dư; `!help` hiển thị cú
  pháp cùng ví dụ. Inject service độc lập Discord.js vào `ExtendedClient`.
- Paytable Cao Thấp đã khóa theo Q009 nhưng còn thiếu quy tắc khi Player bỏ dở. Mở
  `Q-ECONOMY-010`; riêng `!highlow` giữ `SESSION_BLOCKED`, không debit tiền trước khi được trả lời.
- `audit:minigame-slot`, economy message commands, schema alignment và architecture boundaries
  đều PASS; audit xác nhận RTP `904606 ppm`, deterministic replay, min/max wager, round snapshot,
  hai ledger entry và parsing chính xác `!slot 1000`.

## 2026-08-05 — Phát hành message command Daily/Work và nền tảng Mini Game

- Resolve `Q-ECONOMY-004/005/006/007/008`: dùng prefix cấu hình mặc định `!`, Daily/Work scale
  theo giá cơ sở map, V1 chọn Slot + Cao Thấp, cược tiền ảo không giới hạn lượt và tối đa wallet.
- Thêm GameData `earning_activities.json`: `!daily` nhận `5× base` mỗi ngày; `!work` cooldown
  60 phút, tám lần/ngày, roll `0,8–1,2× base` cùng năm nội dung việc làm tu tiên.
- Thêm message command infrastructure tách khỏi slash registry, bật `GuildMessages` và
  `MessageContent`, bỏ qua message của bot, hỗ trợ alias và prefix `MESSAGE_COMMAND_PREFIX`.
  Đăng ký `daily/hangngay`, `work/lamviec`, `help/commands`, `slot/xeng`, `highlow/caothap`.
- `EconomyActivityService` khóa Player trong idempotent transaction; Daily dùng reward claim
  business key theo ngày, Work dùng cooldown + period counter; wallet credit và resource ledger
  commit atomically. Reward Work lưu seed, map, range và outcome snapshot để replay/audit.
- Migration 037 tạo append-only `player_economy_activity_runs` và nền tảng
  `player_minigame_rounds`, unique operation ID cùng partial unique active round. Migration đã
  áp dụng thành công lên PostgreSQL cấu hình hiện tại.
- Lựa chọn `Q-ECONOMY-007 = B` chỉ chốt RTP dưới 100%, chưa có exact paytable. Mở
  `Q-ECONOMY-009`; Slot/Cao Thấp giữ `BALANCE_BLOCKED`, command chỉ thông báo trạng thái và tuyệt
  đối chưa debit wager.
- Audit GameData, message router/alias, Daily duplicate guard, Work cooldown/range, ledger,
  migration contract, architecture boundaries và schema alignment đều PASS.

## 2026-08-04 — Phân tích Daily, Work và Mini Game Linh Thạch

- Chủ dự án bổ sung rằng tính năng dùng lệnh tin nhắn thường, không phải slash command. Đánh dấu
  `Q-ECONOMY-004` là `ANSWERED`, loại bỏ slash dashboard khỏi hướng triển khai.
- Kiểm tra `ExtendedClient` xác nhận hiện chỉ bật `Guilds`, chỉ route `interactionCreate` và chưa
  có message command infrastructure. Mở `Q-ECONOMY-008` để chốt prefix/tên lệnh, Message Content
  Intent và việc dùng component cho game nhiều bước; không tự bật privileged intent.
- Kiểm kê xác nhận chưa có spec, command hoặc GameData Daily/Work/Mini Game. Foundation có thể
  tái sử dụng gồm wallet `NUMERIC(30,0)`, Player row lock, idempotency, period counter theo
  `Asia/Ho_Chi_Minh`, reward claim business key và resource ledger.
- Các quyết định ảnh hưởng economy còn thiếu gồm cú pháp message command, công thức reward/cooldown/
  streak, game bài cụ thể, wager cap/RTP và quan hệ Linh Thạch với tiền thật. Không tự author
  xác suất hay lượng Linh Thạch vì có thể gây lạm phát hoặc mất wallet ngoài ý muốn.
- Sau cập nhật, các lựa chọn còn mở là `Q-ECONOMY-005..008`: đề xuất prefix cấu hình,
  Daily/Work scale theo giá cơ sở map, Slot + Cao Thấp cho V1 và tiền ảo thuần túy với
  wager/round cap.
- Thêm `014_DAILY_WORK_MINIGAME_SPEC.md`: thiết kế ranh giới module độc lập Discord, GameData,
  schema round append-only, lazy timeout, RNG replay, atomic debit/payout và concurrency guard.
  Phần triển khai phụ thuộc giữ `BLOCKED`; foundation economy hiện hữu không bị thay đổi.

## 2026-08-04 — Hoàn tất 180 truyền thừa đặc hữu cho Shop Tông Môn

- Resolve `Q-SECT-007 = A`, `Q-SECT-008 = B`, `Q-SECT-009 = A`: triển khai sáu phẩm tại sáu
  Realm gate; Lưỡng Nghi dùng Hỗn Độn, Sát Thần dùng Bóng Tối, Trường Sinh dùng Mộc; mỗi rule
  bán một truyền thừa cố định và chặn duplicate.
- Thêm `sect_inheritance_templates.json` gồm 60 Công Pháp, 60 Kỹ Năng công và 60 Kỹ Năng thủ
  độc quyền. Tên/lore riêng theo từng Tông Môn; action, công thức và cooldown kế thừa contract
  chuẩn theo phẩm để không tự ý tạo một curve sức mạnh mới. Registry/normalizer hợp nhất content
  Sect với catalog hiện hành; sách Kỹ Năng dùng nhãn tiếng Việt.
- Thay 510 entry phổ thông bằng 180 pool một-entry `DENY_OWNED`. Generator đồng thời khóa ma
  trận tên/hệ/ID, cập nhật hệ canonical của ba Tông Môn và có compatibility entry point cũ.
- `SectService` trả exact reward preview và khóa đổi khi bí kíp đang trong Inventory, Công Pháp
  đã học hoặc Kỹ Năng đã học. Validation được chạy lại trong idempotent transaction sau khi khóa
  Player, trước atomic debit Điểm Cống Hiến/grant/log nên hai request đồng thời không thể nhận trùng.
- `/shop` và `/tongmon` hiển thị tên, loại, hệ, phẩm, mô tả, cảnh giới yêu cầu, giá và trạng thái
  ownership; bỏ mô tả random/nhận trùng cũ. Bổ sung icon canonical cho Ánh Sáng, Bóng Tối và
  Hỗn Độn trong `elements.json`.
- Thêm audit ma trận 180 content, liên kết pool/item/hệ/phẩm và ba nhánh duplicate guard. Schema
  alignment, Sect command và Sect inheritance audit đều PASS.

## 2026-08-04 — Phân tích truyền thừa đặc hữu cho Shop Tông Môn

- Kiểm kê runtime hiện hành: 10 Tông Môn × 18 rule tạo 180 pool và 510 entry; bảy Tông Môn
  có hệ đang tái sử dụng content phổ thông, ba Tông Môn `element: null` nhận pool trộn mọi hệ.
  Có 12 pool Kỹ Năng công Thánh/Thần của Hỏa/Mộc/Thổ/Thủy/Kim/Băng đang rỗng vì catalog chỉ
  có Phong/Lôi tại hai phẩm này. Vì vậy dữ liệu hiện tại chưa đáp ứng “đặc hữu, đủ phẩm”.
- Xác nhận nền tảng độc lập đã đủ: sáu Realm gate, sáu mức giá Công Pháp và Kỹ Năng bằng
  `SECT_POINT`, weighted pool, transaction/idempotency và UI shop Tông Môn đã có thể tái sử dụng.
- Mở `Q-SECT-007..009` để chủ dự án quyết định độ phủ 6 phẩm hay 15 cảnh giới, hệ của Lưỡng
  Nghi/Sát Thần/Trường Sinh, cùng semantics cố định/random và duplicate. Không author tên/effect
  hoặc đổi affinity khi các lựa chọn ảnh hưởng trực tiếp lore, balance và số lượng content.

## 2026-08-04 — Bỏ giới hạn mua và nâng cấp hình ảnh Shop

- Theo yêu cầu mới của chủ dự án, gỡ toàn bộ purchase limit khỏi Phường Thị và Trân Các;
  `dailyLimit` của shop legacy về 0. Rotation Trân Các vẫn refresh tuần nhưng mỗi Player có
  thể mua lặp nếu đủ Linh Thạch. Stock 1 của Merchant Kỳ Ngộ vẫn là tồn kho session và Kho
  Tông Môn vẫn thuộc exchange contract riêng.
- Dùng skill `imagegen` tạo bốn master pixel-art tu tiên 1254×1254 cho Phường Thị, Trân Các,
  Tông Môn và Merchant Kỳ Ngộ; xử lý chroma-key thành alpha, kiểm tra trực quan và xuất nguồn
  Application Emoji 128×128. Thêm `shopAreaIconPolicy`, resolver có Unicode fallback và mapping
  ở trạng thái `READY_TO_SYNC`.
- `/shop` dùng icon khu vực làm thumbnail ngay khi chưa sync Application Emoji; menu khu vực
  dùng semantic emoji resolver. Panel bổ sung mô tả khu vực, số dư, trạng thái tồn kho, footer
  vị trí mặt hàng và giữ preview hiệu ứng trang bị theo phần trăm.
- Thêm generator/audit icon shop và cập nhật shop runtime audit để khóa chính sách không có
  purchase limit. Audit icon, catalog 15 map, schema alignment, command help và shop rules PASS.

## 2026-08-04 — Hoàn tất hệ thống shop nhiều khu vực và Kỳ Ngộ

- Chuyển pattern sáu slot Trân Các vào `shop_rules.json`; validator bắt số phần tử đúng
  `slotCount` và chỉ nhận product kind được hỗ trợ. Catalog không còn fallback sinh trùng
  template khi pool unique cạn.
- UI preview hàng trang bị hiển thị fixed effect/affix bằng `EffectFormatter`, gồm phần trăm
  canonical thay vì số thập phân; nhãn nhóm đổi thưởng Tông Môn được Việt hóa.
- `Q-SHOP-008` chọn A; merchant roll bốn slot theo `60/12,5/12,5/15`, không trùng template,
  equipment là grade cao nhất map `HIGH/LEGENDARY`. Phù Lục giữ `CONTENT_PENDING` vì chưa
  có contract effect/stack/duration.
- Thêm `MysteryMerchantService`, session projection và trusted purchase path. Repository khóa
  wallet → session/entry, xác thực owner/expiry/stock, lấy lại product/cost từ DB, giảm stock,
  debit, grant, purchase log và ledger trong một transaction idempotent.
- Migration 035 nối purchase với merchant session; migration 036 thêm encounter projection
  cho exploration log. Dispatcher 90/5/5 chạy trước battle; event merchant/fortune không tạo
  battle giả. `/thamhiem` có UI riêng cho hai kỳ ngộ.
- Thay `/shop xem|mua` bằng một panel ephemeral: khu vực, mặt hàng, preview, mua/đổi, refresh
  và close. Panel gồm Phường Thị, Trân Các, Tông Môn, thêm Merchant chỉ khi có session active;
  `/tongmon` vẫn hoạt động như shortcut.
- Thêm `auditShopRuntime`: phủ đủ 15 map, replay rotation tuần deterministic, sáu slot Trân
  Các và bốn slot Merchant không trùng. PostgreSQL verification trên schema cô lập với đủ 36
  migration đã PASS race mua slot cuối, atomic purchase/ledger và lazy expiry. Các audit
  shop rules, product contract, command help, schema alignment, architecture và database
  foundation cùng mô phỏng shop/thám hiểm đều PASS trên Node.js `20.19.2`.

## 2026-08-04 — Khóa trọng số Kỳ Ngộ và curve giá Shop 15 map

- `Q-SHOP-005` chọn A: encounter Thám Hiểm `MONSTER 90 / MYSTERY_MERCHANT 5 /
  FORTUNE_REWARD 5`; merchant có 4 slot stock 1, TTL 15 phút và tối đa một phiên active.
- `Q-SHOP-006` chọn A: thêm đủ 15 base price từ `100` đến `30.000.000` Linh Thạch, product
  multiplier và shop multiplier `MAP 1 / SPECIAL 3 / MYSTERY 1,5`.
- Thêm `shops/shop_rules.json` version 2, registry/normalizer immutable, validator bắt đủ 15
  map, currency, decimal multiplier, tổng encounter weight 100 và các số slot/TTL hợp lệ.
- Thêm `ShopPriceService` nhân/làm tròn bằng BigInt, không ép giá late-game sang Number.
- Mở `Q-SHOP-007` vì scope rotation và limit mua Theo Map chưa được quyết định trong các lựa
  chọn trước; phần snapshot/period counter phụ thuộc tạm dừng, price/encounter config độc lập
  đã hoàn tất.
- `Q-SHOP-007` sau đó chọn A: rotation Trân Các chung theo map/tuần, limit riêng Player;
  resource thường 20/ngày và hiếm 5/ngày. Đã thêm deterministic `ShopCatalogService` cho
  shop Theo Map và Trân Các, product snapshot trang bị được roll một lần theo seed.
- Thêm migration 034 và `ShopSessionRepository` làm nền tảng merchant session lazy-expiry,
  entry snapshot và stock. Mở `Q-SHOP-008` vì tỷ trọng loại hàng và Phù Lục usable chưa có
  trong tài liệu; schema/session và encounter selector tiếp tục độc lập.

## 2026-08-04 — Ghi nhận lựa chọn kiến trúc shop và encounter động

- `Q-SHOP-001`: chọn một panel `/shop` gồm Phường Thị, Trân Các, Tông Môn và Kỳ Ngộ;
  vẫn giữ shortcut đổi thưởng trong `/tongmon`.
- `Q-SHOP-002`: chọn product descriptor; Item cộng stack, Công Pháp/Kỹ Năng nhận bí kíp để
  tự học, trang bị nhận instance từ snapshot đã preview. Bí kíp đã học/đã sở hữu bị khóa mua.
- `Q-SHOP-003`: chủ dự án thay phương án đề xuất bằng encounter registry data-driven.
  Thám Hiểm roll encounter trước; quái chiếm đa số, merchant/event hiếm thay thế trận đánh;
  tương lai thêm event/reward bằng data mà không sửa pipeline lõi.
- `Q-SHOP-004`: chọn bảng giá JSON theo realm/category/grade, Linh Thạch cho ba shop thường
  và Điểm Tông Môn giữ nguyên cho shop Tông Môn.
- Mở `Q-SHOP-005` và `Q-SHOP-006` vì tỷ lệ/TTL/slot cùng giá tuyệt đối chưa có con số.
  Đưa ba bộ số cụ thể cho mỗi câu hỏi; không tự phát hành một economy curve từ mô tả định tính.
- Hoàn tất phần độc lập của `Q-SHOP-002`: normalizer hỗ trợ product descriptor và legacy
  `itemId`; Shop projection expose loại/mô tả/snapshot; repository grant stack hoặc equipment
  instance, kiểm tra capacity và khóa duplicate bí kíp trong transaction.
- Migration 033 thêm `product_kind`, `product_snapshot` và index audit vào purchase log; đã
  áp dụng thành công cùng migration 032 lên database cấu hình trong `.env`.

## 2026-08-04 — Hoàn tất affinity Công Pháp và phân tích hệ thống nhiều shop

### Q-CULT-004 đã triển khai

- Áp dụng phương án A do chủ dự án chọn: thêm `Dẫn Khí Quyết` vô hệ +20% làm Công Pháp
  khởi đầu và bootstrap sau Luân Hồi; không còn tặng sách hệ Mộc không liên quan.
- Công Pháp có hệ chỉ cộng tốc độ tu luyện khi tương hợp Linh Căn theo curve data-driven
  Hoàng/Huyền/Địa/Thiên/Thánh/Thần `20/25/30/35/40/50%`; lệch hệ +0%. Ngũ Hành khớp
  năm hệ cơ bản, Thiên Linh Căn và Hỗn Độn khớp mọi hệ không trung tính.
- Thêm `CultivationArtAffinityResolver`, projection UI và validation/audit. Migration 032
  cấp quyền sở hữu Dẫn Khí Quyết cho Player cũ nhưng không tự thay Công Pháp đang active.
- PASS Node `20.19.2`: `audit:cultivation-art-affinity`, `audit:data-schema-alignment`,
  `audit:rebirth-foundation`, `audit:rebirth-runtime`, `audit:approved-policies`,
  `audit:character-creation-flow` và `audit:cultivation-loadout-ui`.

### Phân tích shop

- Shop thường hiện đã có idempotency, khóa ví, period counter, resource ledger và mutation
  inventory trong cùng transaction; có thể tái sử dụng cho hàng stackable. Shop Tông Môn
  đã có service/transaction riêng bằng điểm cống hiến và không nên bị ép vào repository shop
  thường chỉ để dùng chung giao diện.
- Contract hiện tại chưa đủ cho yêu cầu mới: `ShopService` chỉ chấp nhận `itemTemplates` và
  `purchaseShopEntry` luôn cộng stack; chưa thể bán bí kíp Công Pháp, bí kíp Kỹ Năng hoặc
  trang bị instance có affix/effect. Exploration cũng chưa có persisted encounter/session.
- Mở `Q-SHOP-001..004` để khóa routing một slash, product lifecycle, refresh/session kỳ ngộ
  và curve giá/phẩm theo 15 map. Không tự chọn tỷ lệ gặp, giá, stock hoặc semantics nhận bí
  kíp vì các lựa chọn này tác động trực tiếp tới economy và schema lưu trữ.
- Phần độc lập đã xác nhận: tiếp tục dùng integer string cho giá, transaction + idempotency,
  snapshot hàng động, row lock khi mua và JSON làm nguồn config. Nội dung/shop session phụ
  thuộc các câu hỏi nên tạm giữ `BLOCKED` theo quy tắc dự án.

## 2026-08-04 — Giảm overflow tu vi và phân tích affinity Công Pháp/Linh Căn

### Phân tích và quyết định

- Chủ dự án thay mức hiệu suất tu luyện sau ngưỡng đột phá từ 30% xuống 20%. Đây là
  thay đổi balance explicit, không đổi thuật toán lazy evaluation: raw gain vẫn được chia
  tại `requiredCultivation`, phần trước ngưỡng nhận 100%, phần sau ngưỡng nhân hệ số data.
- Rà soát phát hiện starter hiện không vô hệ: active art bị hard-code `CP_FIRE_HOANG`
  (+25%) và payload còn tặng sách `CP_WOOD_HOANG`. Curve Công Pháp hiện là
  `25/45/65/90/115/130%`, vượt xa khoảng affinity 20–50% mới và chưa xét Element Linh Căn.
- Mở `Q-CULT-004` vì tên/bonus Công Pháp vô hệ, curve sáu phẩm, semantics cộng hay thay thế,
  cách xét Thiên/Ngũ Hành/Hỗn Độn và migration Player đều là quyết định progression lớn.
  Đề xuất A nhưng chưa áp dụng phần phụ thuộc.

### Nội dung và triển khai độc lập

- Nâng `cultivation_rules.json` lên version 3 và đổi
  `cultivationOverflow.efficiencyMultiplier` thành decimal string `0.20`; không hard-code
  hệ số trong `Player.calculateOfflineCultivation()`.
- Đồng bộ `GameDataValidator`, policy audit, ADR hiện hành, roadmap và quyết định
  `Q-IDLE-003`. Trường hợp đã đủ ngưỡng hoặc không còn transition tiếp theo cũng nhận 20%
  theo policy hiện hành.
- Cập nhật expected preview: base 60/phút + starter art hiện tại 25% vẫn tạo raw 750 sau
  10 phút; từ cultivation 0 với threshold 100, thực nhận nay là `100 + 650 × 20% = 230`.
- Phần Công Pháp starter/affinity tạm dừng tại question; không đổi catalog, save hoặc
  migration khi chưa có câu trả lời.
- PASS Node `20.19.2`: JSON/syntax, `audit:approved-policies`,
  `audit:data-schema-alignment` và `audit:architecture-boundaries`.

## 2026-08-03 — Icon vật phẩm/nguyên liệu cho túi đồ, reward và nghề nghiệp

### Phân tích và quyết định

- Đối chiếu Item, Craft, Currency và Gathering registry: content runtime hiện có năm stack
  item cần nhận diện riêng, một tiền tệ chính, đan phương và 60 nguyên liệu chia đều trên
  15 map theo bốn tổ hợp `HERB/ORE × PRIMARY/RARE`.
- Chọn 11 semantic tái sử dụng thay vì 60 icon nguyên liệu riêng. Đây là quyết định
  presentation: resource tier, tên và rarity tiếp tục lấy từ GameData; thêm resource mới
  trong bốn tổ hợp hiện hành không buộc thay đổi resolver hoặc command.
- Icon Application Emoji là enhancement có fallback Unicode. Không tự upload lên Discord
  Application trong bước local; bot không gọi API hoặc đọc file ảnh ở business layer.

### Nội dung và triển khai

- Dùng skill `imagegen` ở built-in mode tạo 11 master pixel-art 1254×1254: Phá Chướng Đan,
  Tu Vi Đan, Tụ Linh Đan, Cuồng Bạo Đan, Vé Bí Cảnh, Linh Thạch, Đan Phương, linh thảo
  thường/hiếm và linh khoáng thường/hiếm. Prompt thống nhất: xianxia RPG, silhouette rõ ở
  32px, jade/gold, không chữ/logo/watermark/frame.
- Kết quả ImageGen chứa checkerboard RGB thay vì alpha thật. Tool generate dùng flood-fill
  từ biên để chỉ loại vùng nền xám gần trung tính nối với canvas, giữ highlight nằm trong
  silhouette, rồi xuất 11 nguồn alpha 128×128. Visual QA contact sheet xác nhận icon không
  thủng; toàn bộ nguồn nhỏ hơn 23 KiB.
- Nâng `ui_assets.json` lên revision 10, thêm `itemResourceIconPolicy`, mapping item/currency,
  Unicode fallback và mapping file `READY_TO_SYNC`.
- Thêm `ItemResourceEmojiResolver` với thứ tự exact semantic/item/currency → `family + role`
  → category/Unicode fallback. Tích hợp vào `/tuido`, select dùng vật phẩm,
  `RewardTextFormatter` và `/nghenghiep`; profession view expose `resourceFamily/resourceRole`
  từ Item GameData nhưng không thay đổi nghiệp vụ chế tạo.
- Thêm generator, sync idempotent và `audit:item-resource-icons`. Sync chỉ tạo emoji còn thiếu,
  tái sử dụng tên hiện hữu và ghi mapping atomically; không chạy tự động khi bot startup.
- PASS Node `20.19.2`: syntax checks, `audit:item-resource-icons` (11 semantic, coverage 60),
  `audit:inventory-presentation`, `audit:profession-foundation`, `simulate:reward-runtime`,
  `audit:architecture-boundaries` và `audit:ui-assets`.

## 2026-08-03 — Bộ 12 icon semantic cho Skill/Effect và inline Discord UI

### Phân tích và quyết định

- Đối chiếu Action registry, Effect registry, `BattleLogAnimator` và `/congphap`: tạo icon theo
  từng tên Skill sẽ nhân bản artwork và buộc sửa UI mỗi khi thêm content. Chọn semantic ID theo
  primitive executable để Skill mới tự kế thừa icon từ Action/Effect hiện hữu.
- Phạm vi MVP gồm 12 semantic xuất hiện trực tiếp trong combat/read UI: `DAMAGE`, `HEAL`,
  `SHIELD`, `CRITICAL`, `BURN`, `FREEZE`, `STUN`, `SILENCE`, `SLOW`, `HEAL_BLOCK`, `PURIFY`,
  `CHAIN_DAMAGE`. Không thêm mechanic hoặc thay đổi trị số gameplay.
- Dùng Application Emoji để ảnh có thể xuất hiện inline trong text và String Select; mỗi semantic
  có Unicode fallback nên correctness/UI không phụ thuộc việc upload emoji thành công.
- Không tự chạy sync lên Discord Application trong bước triển khai local. Sync là thao tác external
  explicit bằng script; resolver sẽ đọc mapping sau khi bot restart.

### Nội dung và triển khai

- Tạo 12 master icon xianxia 1254×1254 bằng built-in ImageGen tại
  `src/assets/ui/battle-semantics/masters/` và 12 nguồn upload 128×128 tại `emoji-sources/`.
- Nâng `ui_assets.json` lên revision 9 và thêm `battleSemanticIconPolicy`: display name tiếng Việt,
  Unicode fallback, file/name pattern và mapping file revision 1.
- Thêm `BattleSemanticEmojiResolver`: validate Snowflake/name, resolve inline/component emoji và
  suy luận Skill semantic theo priority từ Action/Effect (`CHAIN_DAMAGE/control` trước damage chung).
- Battle summary expose `actionTypes` canonical để presentation nhận đúng Sét lan mà không đọc
  GameData hoặc suy luận từ tên Skill. Battle log dùng resolver cho damage, critical, heal/block,
  shield, control, effect tick và purify.
- `/congphap` hiển thị semantic icon trong danh sách Skill đang học/đang trang bị và String Select;
  Công Pháp tu luyện không bị ép gán battle semantic không phù hợp.
- Thêm script generate/sync, `auditBattleSemanticIcons.js` và package scripts tương ứng. Audit khóa
  đủ 12 master/source, kích thước, giới hạn 256 KiB, inference, fallback và hai integration UI.
- Khi chạy regression, phát hiện `auditSkillCooldownFoundation.js` còn hard-code catalog cũ
  `35/14` dù content hiện có `73/42`. Thay expectation theo rule đã duyệt: Active thuần sát thương
  cooldown 2; hồi máu/khiên/khống chế hoặc utility không gây damage cooldown 3; vẫn cấm cooldown 0.

## 2026-08-03 — Emblem riêng cho 10 Tông Môn và tích hợp `/tongmon`

### Phân tích và quyết định

- Đối chiếu `sect_template.json`, `sect_effects.json` và presentation `/tongmon`: catalog đã cố
  định đủ 10 Tông Môn; tên, hệ và nội tại cung cấp đủ identity để thiết kế presentation asset,
  không phát sinh quyết định gameplay cần mở câu hỏi.
- Chọn một emblem riêng cho mỗi `sect.id`, thay vì chỉ tái sử dụng icon Element. Ba Tông vô hệ
  dùng biểu tượng gameplay riêng: Lưỡng Nghi, Sát Đạo và Trường Sinh.
- Giữ ảnh hoàn toàn trong Discord presentation layer. Resolver trả `null` an toàn khi thiếu file;
  `/tongmon` rơi về avatar người chơi và không ảnh hưởng logic gia nhập, nội tại hoặc đổi thưởng.
- Mỗi lần render chỉ upload emblem của Tông đang chọn và xóa attachment cũ, tránh tải đồng thời
  cả 10 ảnh trong một panel ephemeral.

### Nội dung và triển khai

- Tạo 10 emblem xianxia vuông 1254×1254 bằng built-in ImageGen, lưu tại
  `src/assets/ui/sects/`; mỗi file có tên ổn định theo Tông Môn và nhỏ hơn 10 MiB.
- Nâng `ui_assets.json` lên revision 8, thêm `sectEmblemPolicy` ánh xạ explicit đủ 10 `sect.id`.
- Mở rộng `UiAssetResolver` với `resolveSectEmblem`, `createSectEmblemAttachment` và
  `getSectEmblemPolicy`.
- Cập nhật `SectPresentation`: thumbnail dùng emblem Tông đang xem, avatar là fallback;
  payload quản lý `attachments/files` để select mới thay đúng ảnh.
- Thêm `auditSectEmblemAssets.js` và script `audit:sect-emblem-assets` để khóa coverage catalog,
  ID/attachment duy nhất, PNG 1254×1254, giới hạn 10 MiB, resolver fallback và integration UI.
- Cập nhật `docs/09_APPLICATION/011_UI_ICON_PACK_PROPOSAL.md` với policy và lifecycle asset.

## 2026-07-15 — Phân tích roadmap, PostgreSQL và Lazy Evaluation

### Phạm vi đã đọc

- Toàn bộ file Markdown trong `docs/`, theo từng module từ `00_PROJECT` đến `12_IMPLEMENTATION` và `docs/README.md`.
- Source/config hiện tại cần thiết để đối chiếu: package, database bootstrap, PostgreSQL pool/transaction helper, repositories, player/cultivation/breakthrough/start services, runtime Player và toàn bộ shape JSON game data.
- Không đọc Git history, `.git`, dependency/build/cache/log/coverage/lock files theo ràng buộc.

### Phân tích chính

- Xác nhận kiến trúc đã khóa: JSON là nguồn game content; GameData immutable; runtime tách template; battle in-memory; Discord không chứa business logic; PostgreSQL lưu runtime.
- Xác nhận Core Data v2.1 hướng tới Effect-driven DSL, nhưng Skill/Battle spec v1 vẫn còn contract action-driven.
- Xác nhận schema hiện tại tạo DDL ở startup, dùng bảng `players` rộng và `player_items` polymorphic.
- Xác nhận currency persistence hardcode bốn cột dù currency content là data-driven.
- Xác nhận transaction/row lock đã xuất hiện ở purchase/craft/exchange, nhưng chưa có idempotency record chung.
- Xác nhận cultivation offline hiện dùng số giây không cap, khác `cultivation_rules.json` (base theo phút, cap 12 giờ, multiplier).
- Xác nhận collect cultivation đọc rồi update không khóa row, có nguy cơ hai request tính cùng checkpoint và ghi đè/nhận sai.
- Xác nhận realm data có 10 stage nhưng runtime chỉ lưu realm ID.
- Xác nhận Linh căn chưa có spec/data domain và đang roll hardcode trong `PlayerStartService`.

### Technical decisions đã áp dụng trong tài liệu

Các quyết định dưới đây chỉ là quyết định về cách trình bày/an toàn của bản phân tích, không phải thay đổi gameplay/architecture đã khóa:

- Không sửa roadmap LOCKED; tạo `docs/ROADMAP_DATABASE_ARCHITECTURE.md` ở trạng thái `PROPOSED` và mở `Q-ROADMAP-001`.
- Giữ JSON static content và PostgreSQL runtime như ranh giới đã được tài liệu hiện tại khóa.
- Thiết kế lazy evaluation bằng timestamp/checkpoint, transaction, row lock, idempotency và ledger; không dùng per-second tick.
- Đánh dấu mọi lựa chọn lớn chưa được phê duyệt là `OPEN` và giữ phần triển khai phụ thuộc ở trạng thái `BLOCKED`.
- Không triển khai code/migration vì yêu cầu hiện tại là phân tích, roadmap và ER design; các câu hỏi gameplay/schema còn mở.

### File đã thêm

- `docs/questions.md`: registry câu hỏi có ID, bối cảnh, lựa chọn, ưu/nhược điểm, đề xuất không tự áp dụng, trạng thái và phần bị chặn.
- `docs/ROADMAP_DATABASE_ARCHITECTURE.md`: phân tích hiện trạng, module boundaries, lazy evaluation, PostgreSQL ER, transaction patterns và roadmap 7 phase.
- `changelogs.md`: nhật ký chi tiết của phiên phân tích này theo yêu cầu.

### Câu hỏi và blockers được ghi nhận

- Quan hệ giữa roadmap mới và roadmap LOCKED.
- Tool migration PostgreSQL.
- Kiểu ID runtime, numeric precision và mapping Node.js.
- Chủ sở hữu transaction boundary giữa repository và UnitOfWork/use case.
- Domain Linh căn.
- Realm stage và progression.
- Formula/cap/rounding tu luyện offline.
- Penalty đột phá thất bại.
- Contract Skill action-driven/effect-driven.
- Tách inventory stack/equipment instance.
- Wallet chuẩn hóa/currency columns.
- Phạm vi idle source và semantics preview/claim.
- Idempotency key trung lập với Discord.
- Timezone/period reset.
- Atomic/partial reward claim.
- Phạm vi Sect/PvE/PvP/World Boss.
- Quyền sử dụng Redis ở phase scaling.

### Trạng thái tiến độ

- Phân tích tài liệu: COMPLETE.
- Roadmap đề xuất: COMPLETE, chưa được phê duyệt làm roadmap chính thức.
- PostgreSQL ER/lazy/concurrency design: COMPLETE ở mức proposal.
- Gameplay/schema decisions trong `docs/questions.md`: OPEN.
- Source code/migration implementation: NOT STARTED và bị chặn theo từng câu hỏi liên quan.

## 2026-07-15 — Áp dụng câu trả lời và bắt đầu Phase 1

### Câu trả lời đã xử lý

- Chuẩn hóa đủ 18 lựa chọn của chủ dự án; xóa các dòng trả lời tự do và ghi lại `Câu trả lời`, `Kết quả`, `Trạng thái` theo từng ID.
- Tạo `docs/00_PROJECT/008_ARCHITECTURE_DECISIONS_V2.md` với ADR2-001 đến ADR2-018.
- Chuyển roadmap chi tiết thành `APPROVED SUPPLEMENT`; không thay roadmap LOCKED.
- Mở 5 follow-up cục bộ cho thông số chưa có: `Q-DB-003`, `Q-BREAK-002`, `Q-IDEMPOTENCY-002`, `Q-ECONOMY-002`, `Q-REWARD-002`.

### JSON được define trước implementation

- Thêm `spirit-roots/spirit_roots.json`, chuyển nguyên trạng phân phối hardcode hiện tại thành 10 entry/100 weight; chưa thêm bonus gameplay mới.
- Thêm `idle/idle_sources.json`; MVP chỉ có `CULTIVATION`, policy profile preview/collect explicit/breakthrough atomic settle.
- Thêm `realms/progression_rules.json`; Realm + Stage là progression contract.
- Bổ sung calculation mode/rate unit/cap order vào `cultivation_rules.json`; precision vẫn chờ `Q-DB-003`.
- Thêm `economy/economy_rules.json` với timezone `Asia/Ho_Chi_Minh`; weekly boundary vẫn chờ `Q-ECONOMY-002`.
- Thêm `rewards/reward_runtime_rules.json` với apply mode `ALL_OR_NOTHING`; overflow vẫn chờ `Q-REWARD-002`.

### GameData và Player Start

- Đăng ký, normalize, validate và expose Spirit Root/Idle/Progression/Economy/Reward runtime rules qua GameDataManager.
- `PlayerStartService` không còn hardcode danh sách/xác suất Linh căn; weighted roll đọc từ GameData.
- Giữ `legacyValue` để tương thích display/database hiện tại, đồng thời lưu `spirit_root_id` mới.
- Runtime Player bắt đầu mang `spiritRootId` và `realmStage` song song compatibility fields.
- Sửa registry trỏ tới file Effect/Modifier version 2 đang thực sự tồn tại thay vì tên `_v2` bị thiếu.
- Bổ sung compatibility cho monster JSON shape `monsterTemplates` và nested `combat/scalingRule`.

### PostgreSQL Phase 1 foundation

- Chuyển toàn bộ DDL bootstrap cũ thành `001_legacy_baseline.sql`.
- Thêm `002_runtime_foundation.sql` cho `spirit_root_id`, `realm_stage`, idempotency và outbox.
- Migration foundation backfill `spirit_root_id` từ toàn bộ legacy string hiện có, gồm cả `Tap Can` và default cũ `Tạp Căn`.
- Thêm SQL migration runner: lexical ordering, `schema_migrations`, SHA-256 checksum, per-migration transaction và PostgreSQL advisory lock.
- `initializeDatabase()` hiện gọi migration runner; thêm script `npm run db:migrate`.
- Thêm `PostgresUnitOfWork`; `runInTransaction` trở thành compatibility wrapper.
- Thêm UnitOfWork, Migration và Idempotency specifications trong Platform docs.

### Kiểm thử và audit

- `npm run audit:data-schema-alignment`: PASS.
- Kết quả data audit: 10 Spirit Roots, 1 Idle source, 7 Elements, 93 Core Effects, 70 Skill Definitions.
- `npm run audit:database-foundation`: PASS.
- Database foundation audit xác nhận commit, rollback, migration discovery và advisory lock.
- `node --check` PASS cho normalizer, validator, PlayerStartService, UnitOfWork, migration runner và repository đã sửa.

### Trạng thái mới

- Roadmap supplement: APPROVED.
- JSON-first contracts cho Spirit Root/Idle/Progression/Economy/Reward policy: COMPLETE trong phạm vi thông số đã duyệt.
- Phase 1 migration/UnitOfWork foundation: COMPLETE ở mức source + audit giả lập; chưa chạy migration trên PostgreSQL thật vì không có yêu cầu/connection execution trong phiên này.
- Lazy cultivation persistence: BLOCKED bởi `Q-DB-003`.
- Breakthrough failure penalty: BLOCKED bởi `Q-BREAK-002`.
- Weekly counter và reward overflow: BLOCKED cục bộ bởi các follow-up tương ứng.

## 2026-07-16 — Áp dụng follow-up parameters

### Decisions resolved

- `Q-DB-003`: resource numeric theo loại; cultivation `NUMERIC(30,6)`, currency/resource `NUMERIC(30,0)`, config rate `NUMERIC(18,8)`, item quantity ưu tiên BIGINT.
- `Q-BREAK-002`: mỗi transition khai báo 25% loss trên required cultivation; loss clamp theo current cultivation.
- `Q-IDEMPOTENCY-002`: cached response 30 ngày; one-time business key giữ vĩnh viễn.
- `Q-ECONOMY-002`: tuần bắt đầu Thứ Hai 00:00 theo `Asia/Ho_Chi_Minh`.
- `Q-REWARD-002`: inventory full rollback toàn transaction và claim giữ retryable.

### Data-first updates

- Bổ sung storage precision/rounding vào `cultivation_rules.json`.
- Bổ sung `failureCultivationLossPercent: 25` vào toàn bộ 14 breakthrough transitions.
- Bổ sung weekly boundary vào `economy_rules.json`.
- Bổ sung `ROLLBACK_RETRYABLE` vào reward runtime rules.
- Thêm `platform/idempotency_rules.json` và GameData validation.

### Runtime and database updates

- Thêm migration `003_approved_runtime_parameters.sql` cho cultivation/currency/item quantity và idempotency retention/business key schema.
- Thêm `IdempotencyRepository` với reserve, request-hash conflict protection, complete và cleanup theo retention class.
- Thêm `PeriodKeyService`; weekly/daily period key tính theo timezone game, không cần reset hàng loạt.
- Sửa breakthrough failure từ mất toàn bộ required cultivation sang 25% data-driven và clamp không âm.
- Reward apply khóa Player/inventory, kiểm tra capacity trước mọi mutation và ném `INVENTORY_FULL` retryable để transaction rollback.
- Tách `InventoryCapacityPolicy` để test độc lập và tránh hardcode capacity trong repository.

### New local questions

- `Q-CULT-003`: minor breakthrough roll/rounding/stat growth theo Stage chưa được quy định.
- `Q-IDLE-003`: offline time vượt cap bị discard hay preserve chưa được quy định.
- Chỉ các phần phụ thuộc hai semantics này tạm dừng; policy khác tiếp tục độc lập.

### Verification

- `audit:data-schema-alignment`: PASS.
- `audit:database-foundation`: PASS.
- `audit:approved-policies`: PASS cho numeric, breakthrough penalty, idempotency retention, weekly boundary và inventory overflow.
- `node --check`: PASS cho PeriodKeyService, IdempotencyRepository, InventoryCapacityPolicy, PlayerRuntimeRepository, BreakthroughService và policy audit.
- Chưa chạy migration trên PostgreSQL thật.

## 2026-07-16 — Hoàn tất Stage progression và lazy cultivation overflow

### Decisions resolved

- `Q-CULT-003`: chọn phương án A; minor breakthrough chắc chắn, major tại Stage tối đa mới roll; required/stat theo Stage dùng công thức growth và `FLOOR`.
- `Q-IDLE-003`: không giới hạn thời gian offline; raw gain áp dụng modifier trước, phần vượt required cultivation chỉ nhận 30%; không có transition tiếp theo thì toàn bộ gain nhận 30%.
- Thay thế nội dung cũ về cap 12 giờ trong ADR2-007 và roadmap; thêm ADR2-019/ADR2-020.

### Data và runtime

- Cập nhật `cultivation_rules.json` với `offlineTimeLimit: NONE`, `cultivationOverflow.efficiencyMultiplier: 0.30` và policy ở max realm.
- Cập nhật `progression_rules.json` với guaranteed minor, major roll source, Stage formula và rounding.
- Player legacy/runtime mang `realmStage`; required cultivation được tính lại theo Stage từ Realm data.
- Thêm fixed-decimal scale 6 dựa trên `BigInt` cho cultivation; loại bỏ ép cultivation PostgreSQL `NUMERIC(30,6)` qua JavaScript `Number` trong runtime progression.
- Lazy cultivation tính rate theo phút, chia full/overflow gain, cập nhật checkpoint về `now`; không giữ thời gian dư.
- Minor breakthrough tăng Stage trong cùng realm; major đổi realm/reset Stage; stat đích lấy từ Realm data theo công thức đã duyệt.
- Cultivation collect và breakthrough dùng injected UnitOfWork, `SELECT ... FOR UPDATE`, cùng PostgreSQL client cho read/calculate/write để chống race condition.
- Breakthrough nhận `operationId` từ Discord interaction, reserve/complete idempotency trong cùng transaction và trả cached response khi interaction bị retry; replay không mutation lần hai.
- Discord command hiển thị Stage, rate theo phút và cultivation fixed-decimal.

### Verification

- `audit:data-schema-alignment`: PASS.
- `audit:database-foundation`: PASS.
- Policy validator/audit được mở rộng cho no-cap, overflow 30%, guaranteed minor và Stage rounding.
- Lần chạy audit đầu sau thay đổi phát hiện test penalty cũ đang đứng ở Stage 1 nên đi nhánh minor; audit đã được điều chỉnh sang Stage 10 và bổ sung case minor/overflow.
- `audit:approved-policies`: mở rộng thêm kiểm tra breakthrough idempotency replay không mutation.
- Lượt xác minh cuối: `audit:data-schema-alignment`, `audit:database-foundation` và `audit:approved-policies` đều PASS; policy audit có 8 nhóm kiểm tra.
- `node --check`: PASS cho bootstrap, Player, hai progression service, repository và ba Discord command liên quan.
- Registry câu hỏi có 25/25 mục `RESOLVED`, không còn `OPEN` hoặc `ANSWERED`.
- Chưa chạy migration hoặc concurrency integration test trên PostgreSQL thật.

## 2026-07-16 — Tiếp tục Phase 2: preview và idle accumulator

### Phân tích rủi ro cục bộ

- Phát hiện equip/unequip trang bị hoặc đổi công pháp trước claim có thể áp modifier mới cho toàn bộ elapsed window.
- Mở `Q-IDLE-004` với ba phương án settle-before-change, current-rate-for-whole-window và rate snapshot/segment; đề xuất settle-before-change nhưng chưa tự áp dụng.
- Registry hiện có 26 câu hỏi: 25 `RESOLVED`, 1 `OPEN` (`Q-IDLE-004`).
- Chỉ tạm dừng mutation phụ thuộc loadout; profile preview, explicit collect, breakthrough và accumulator persistence tiếp tục độc lập.

### Runtime và database

- `PlayerReadService.getProfileView()` tính cultivation preview bằng TimeProvider trên snapshot tạm, không ghi checkpoint hoặc mutation runtime đã load.
- `/hoso` và `/nhanvat` hiển thị rõ cultivation là dự tính/chưa lưu, Stage hiện tại và rate theo phút.
- Thêm migration `004_idle_accumulators.sql`: accumulator typed theo `(player_id, source_id)`, checkpoint `TIMESTAMPTZ`, state JSONB và rules revision; backfill source `CULTIVATION` từ checkpoint legacy.
- `PlayerRuntimeRepository` ưu tiên đọc checkpoint từ accumulator, fallback `players.last_cultivate`; create/collect/breakthrough dual-write accumulator và field legacy trong cùng transaction.
- Mở rộng GameData validator cho Realm ID liên tục, max Stage, HP/ATK/DEF/SPD growth, cultivation growth, success rate và breakthrough chain.

### Verification

- Thêm policy audit cho profile preview read-only và negative clock skew không lùi checkpoint.
- `audit:data-schema-alignment`: PASS.
- `audit:database-foundation`: PASS, gồm discovery migration `004_idle_accumulators.sql`.
- `audit:approved-policies`: PASS với 10 nhóm kiểm tra.
- `node --check`: PASS cho PlayerReadService, profile commands, repository, GameData validator và policy audit.
- Chưa chạy migration hoặc transaction/concurrency integration test trên PostgreSQL thật.

## 2026-07-16 — Bắt đầu Phase 3 foundation

### Inventory migration risk

- Xác nhận `player_items` legacy không đủ dữ liệu để SQL luôn phân biệt unequipped equipment với stack item; discriminator chuẩn nằm trong GameData JSON.
- Mở `Q-INVENTORY-002` cho lựa chọn application migration/maintenance, online dual-write batch hoặc SQL mapping materialized.
- Tạm dừng đúng phần backfill/cutover inventory; không tự suy luận loại row bằng prefix item ID hay JSONB không đầy đủ.

### Wallet foundation

- Thêm migration `005_wallet_foundation.sql` với `player_wallets(player_id, currency_id, amount NUMERIC(30,0))`, khóa chính tổng hợp và invariant amount không âm.
- Migration kiểm tra balance legacy âm trước backfill; null legacy được chuẩn hóa về 0.
- Backfill bốn currency hiện có từ `players`, sau đó trigger đồng bộ một chiều mọi insert/update legacy sang wallet trong giai đoạn chuyển tiếp.
- Player runtime read ưu tiên `player_wallets`, fallback cột legacy; mutation hiện vẫn đi đường legacy và được trigger đồng bộ, tránh hai source bị stale trước khi repository cutover hoàn toàn.
- Database audit được mở rộng để bắt buộc discovery migration 005.
- Registry hiện có 27 câu hỏi: 25 `RESOLVED`, 2 `OPEN` (`Q-IDLE-004`, `Q-INVENTORY-002`).
- Xác minh sau Phase 3 foundation: ba audit đều PASS; repository và validator qua `node --check`. Chưa chạy migration trên PostgreSQL thật.

## 2026-07-16 — Áp dụng Q-IDLE-004 và Q-INVENTORY-002

### Decisions resolved

- `Q-IDLE-004`: chọn settle-before-change; mọi mutation loadout ảnh hưởng cultivation rate phải settle theo loadout cũ trong cùng transaction.
- `Q-INVENTORY-002`: chọn application migration đọc GameData trong maintenance window; không dùng heuristic prefix/JSONB để phân loại legacy row.
- Thêm ADR2-021 và ADR2-022; registry hiện có 27/27 câu hỏi `RESOLVED`.

### Settle-before-change

- `CultivationService` expose settlement dùng lại cùng calculator/checkpoint persistence trên runtime snapshot đã khóa.
- `EquipmentService.equipItem/unequipItem` và `CultivationArtService.learn/equip` chạy injected UnitOfWork, `findById(... FOR UPDATE)`, settle cultivation, rồi mới mutation loadout bằng cùng PostgreSQL client.
- Repository mutation equipment/art nhận transaction client từ use case; compatibility path vẫn tự mở transaction khi được gọi độc lập.
- Policy audit xác minh thứ tự `SETTLE_OLD_LOADOUT` trước `MUTATE_LOADOUT` và player lock bắt buộc.

### Inventory split application migration

- Migration `006_inventory_split_foundation.sql` tạo `inventory_stacks` và `equipment_instances`, legacy mapping ID, indexes và unique equipped slot.
- Thêm `db:backfill:inventory`; script từ chối chạy nếu thiếu `INVENTORY_MAINTENANCE_MODE=true`.
- Backfill khóa `player_items`, phân loại `item_id` bằng normalized GameData, từ chối unknown template, từ chối equipment quantity khác 1 và phát hiện classification conflict khi rerun.
- Backfill idempotent theo `legacy_item_id`, reconciliation tổng số row bắt buộc, trả trạng thái `BACKFILLED_NOT_CUT_OVER`; không xóa hoặc cutover schema legacy.

### Verification

- `audit:data-schema-alignment`: PASS.
- `audit:database-foundation`: PASS với inventory-backfill guard/classification/reconciliation audit.
- `audit:approved-policies`: PASS với 11 nhóm, gồm settle-before-change.
- `node --check`: PASS cho services, repository, backfill và audit đã sửa.
- Chưa chạy migration/backfill trên PostgreSQL thật; cutover production vẫn là bước riêng sau reconciliation thực tế.

## 2026-07-16 — Phase 3 currency precision hardening

### Numeric contract

- Thêm `IntegerAmount` dựa trên `BigInt`: normalize canonical string, exact comparison, positive check và locale formatting.
- Reject mọi currency truyền vào dưới dạng JavaScript `Number` vượt `MAX_SAFE_INTEGER`; không chấp nhận giá trị đã mất precision.
- Runtime Player và legacy Player giữ `spiritStones`, `sectPoints`, `honor`, `eventPoints` dưới dạng integer string thay vì `Number`.
- GameData normalizer giữ shop price, craft currency cost và exchange currency amount dưới dạng integer string.

### Economy paths migrated

- Shop, craft, exchange và sect availability dùng exact integer comparison.
- Repository purchase/craft/exchange chuẩn hóa debit/credit parameters thành integer string trước PostgreSQL mutation.
- RewardApply và currency reward persistence không còn ép amount qua Number.
- Profile/shop/treasure reward formatter dùng BigInt-safe formatting; tổng currency reward cộng bằng BigInt.

### Verification

- Thêm audit với balance lớn hơn `MAX_SAFE_INTEGER`, exact comparison và runtime preservation; unsafe Number bị reject.
- Ba audit đều PASS; approved policy audit hiện có 12 nhóm.
- `simulate:shop`, `simulate:craft`, `simulate:exchange`, `simulate:sect`, `simulate:reward-runtime`: PASS với currency string contract.
- `node --check`: PASS cho numeric utility, runtime/player, repository, normalizer và economy services liên quan.

## 2026-07-16 — Phase 3 PlayerWalletRepository cutover

### Wallet adapter

- Thêm `PlayerWalletRepository` với ensure wallet, player row lock, exact balance read/list, atomic guarded debit và credit trên `player_wallets`.
- Debit dùng một câu `UPDATE ... WHERE amount >= cost RETURNING amount`; insufficient balance không thể tạo số âm dù có request đồng thời.
- Amount giữ canonical integer string toàn pipeline; wallet audit dùng số vượt xa `MAX_SAFE_INTEGER` và xác minh kết quả chính xác.
- Currency ngoài bốn loại legacy được lưu trực tiếp trong wallet và không yêu cầu sửa column mapping.

### Compatibility và runtime

- Bốn currency hiện hữu sau mutation được sync về column legacy; trigger migration 005 giữ hai representation nhất quán trong giai đoạn chuyển tiếp.
- `PlayerRuntimeRepository.findById()` đọc toàn bộ wallet map; `RuntimePlayer.currencies` expose cả key `currency_id` data-driven và compatibility aliases cũ.
- Shop/craft/sect/exchange validation đọc balance theo currency ID; bỏ chặn hardcode currency ở mutation repository.

### Mutation paths migrated

- Reward currency apply dùng wallet credit.
- Shop purchase và craft dùng wallet debit.
- Exchange currency costs/rewards dùng wallet debit/credit cho mọi currency được GameData khai báo.
- Player lock và toàn bộ wallet/inventory/log mutation vẫn nằm trong cùng transaction hiện hữu.

### Verification

- `audit:approved-policies`: PASS với 13 nhóm, thêm wallet mutation precision và guarded insufficient debit.
- `audit:data-schema-alignment`, `audit:database-foundation`: PASS.
- Shop/craft/exchange/sect/reward simulations: PASS.
- `node --check`: PASS cho wallet/runtime repositories, runtime factory và economy services.
- Chưa chạy migration trên PostgreSQL thật; legacy currency columns chưa được drop.

## 2026-07-16 — Inventory cutover state foundation

### Cutover state model

- Thêm migration `007_persistence_cutover_state.sql` và bảng `persistence_cutovers` với state `LEGACY`, `BACKFILLED`, `ACTIVE`.
- Thêm `PersistenceCutoverRepository` cho read/lock state, mark backfilled và mark active.
- State giữ `source_revision`, reconciliation details và timestamp backfill/activation.

### Backfill hardening

- Inventory backfill tính SHA-256 trên canonical mapping `item_id -> persistence kind` lấy từ normalized GameData.
- Sau khi row-count reconciliation thành công, backfill atomically ghi state `BACKFILLED`, counts và source revision trong cùng transaction.
- Rerun backfill bị từ chối nếu domain đã `ACTIVE`; không thể vô tình downgrade production cutover.
- Activation API từ chối state chưa backfilled và từ chối GameData revision khác revision đã dùng để backfill.
- Chưa cung cấp activation command và runtime chưa switch schema; điều này cố ý ngăn cutover khi mutation router chưa hoàn thiện.

### Verification

- `audit:database-foundation`: PASS với 6 nhóm, gồm inventory backfill và cutover state guards.
- `audit:data-schema-alignment`, `audit:approved-policies`: PASS.
- `node --check`: PASS cho cutover repository, backfill và database audit.
- Chưa chạy migration/backfill trên PostgreSQL thật.

## 2026-07-16 — Inventory persistence router, phần lõi

### Router contract

- Thêm `PlayerInventoryRepository`; mode `LEGACY` và `BACKFILLED` tiếp tục dùng `player_items`, chỉ `ACTIVE` dùng `inventory_stacks`/`equipment_instances`.
- Active runtime ID có namespace `S:<id>` cho stack và `E:<id>` cho equipment, tránh collision giữa hai identity sequence.
- Router cung cấp list entries, capacity rows với lock, owned-entry lock, list/find stack, insert stack/equipment, increment/consume stack và equip/unequip.
- Stack quantity active dùng BIGINT trong persistence; consume kiểm tra bằng BigInt và update/delete atomically trong transaction.

### Runtime paths migrated

- `PlayerRuntimeRepository.findById()` đọc inventory qua router.
- Player creation ghi starter equipment và cultivation-art book qua router.
- Learn cultivation art, learn skill, equip và unequip dùng typed ID/lock/consume router.
- Reward capacity check, currency/item/equipment reward apply và consume-item-by-template dùng router.
- `BACKFILLED` vẫn dùng legacy IDs và legacy table, ngăn switch sớm trước activation.

### Remaining before ACTIVE

- Shop purchase item insert/stack increment.
- Craft material consume và result insert.
- Exchange item costs/rewards.
- Activation command và full runtime integration audit chỉ được thêm sau khi ba nhóm mutation trên qua router.

### Verification

- `audit:database-foundation`: PASS với 7 nhóm, thêm active/legacy inventory persistence router audit.
- `audit:data-schema-alignment`, `audit:approved-policies`: PASS.
- `simulate:player-progress`, `simulate:reward-runtime`: PASS.
- `node --check`: PASS cho inventory router, runtime repository và database audit.

## 2026-07-16 — Hoàn tất inventory router và activation command

### Remaining mutations migrated

- Thêm router primitive `addStackableItem` và `consumeItemAcrossStacks`; quantity aggregation/consume dùng BigInt và hỗ trợ nhiều stack row.
- Shop purchase add/increment item qua router.
- Craft consume toàn bộ material stacks và add result qua router.
- Exchange item costs/rewards qua router.
- `PlayerRuntimeRepository` không còn SQL trực tiếp tới `player_items`; legacy facade `PlayerRepository` delegate về runtime repository/router.

### Controlled activation

- Export canonical inventory classification và SHA-256 revision helper từ backfill module.
- Thêm `db:activate:inventory` và `activateInventoryCutover.js`.
- Activation bắt buộc `INVENTORY_MAINTENANCE_MODE=true`, advisory transaction lock và lock cả ba inventory table.
- Activation yêu cầu state `BACKFILLED`, exact GameData revision, kiểm tra từng source row với target row gồm owner/template/quantity/rarity/slot/instance data, sau đó count reconciliation lần cuối.
- Chỉ sau toàn bộ validation mới atomically ghi state `ACTIVE` cùng runtime router marker; bất kỳ mismatch nào rollback toàn bộ activation.
- Schema/data legacy không bị xóa khi activation, giữ đường rollback vận hành có kiểm soát.

### Verification

- `audit:database-foundation`: PASS với 8 nhóm, thêm inventory activation audit.
- `audit:data-schema-alignment`, `audit:approved-policies`: PASS.
- Shop/craft/exchange/reward simulations: PASS.
- `node --check`: PASS cho router, runtime repository, backfill, activation và database audit.
- Chưa chạy migration/backfill/activation trên PostgreSQL thật.

## 2026-07-16 — Idempotency cho economy mutation và reward apply

### Transaction boundary

- Thêm `IdempotentOperationExecutor` dùng chung: reserve operation, chạy mutation, lưu response và commit trong cùng UnitOfWork.
- Thêm canonical request hashing SHA-256; object key order không làm thay đổi hash và operation type được đưa vào payload hash để tránh dùng nhầm key giữa các mutation.
- Retry của operation đã `COMPLETED` trả cached response với `idempotentReplay: true`; callback mutation không chạy lần hai.
- Operation đang `IN_PROGRESS`, request hash xung đột và thiếu dependency idempotency có error code riêng, không fallback âm thầm sang mutation không bảo vệ.
- `IdempotencyRepository.reserve()` resolve cả conflict theo permanent business key `(player_id, operation_type, business_key)`, phục vụ one-time claim dùng operation ID mới.

### Economy và reward integration

- Shop purchase nhận Discord `interaction.id` làm operation ID.
- Shop, craft, exchange và sect exchange dùng executor chung; validation nằm sau reservation để retry không thất bại vì tài nguyên đã bị lần gọi đầu trừ, trong khi kiểm tra player tồn tại vẫn giữ trước reservation.
- `RewardApplyService` nhận operation context và đặt wallet/item/equipment apply trong cùng transaction với idempotency response; reward hash dựa trên source ổn định nên retry không phụ thuộc kết quả random roll mới.
- Cached reward response giữ cả rolled reward-plan snapshot; `RewardRuntimeService` dùng snapshot này khi replay, không hiển thị một lần roll mới khác phần thưởng đã commit.
- `PlayerRuntimeRepository.applyRewards`, `purchaseShopEntry`, `craftRecipe` và `exchangeTemplate` nhận transaction client tùy chọn; call-site cũ không truyền client vẫn tự mở transaction để giữ tương thích simulator.
- Reward operation ID đã được truyền qua Treasure Hunt, Exploration và Secret Realm. Phạm vi bảo vệ hiện tại là bước reward apply; toàn bộ activity nhiều bước chưa được tuyên bố atomic/idempotent và vẫn thuộc `activity_runs` Phase 6.

### Technical decisions

- Business logic không import Discord; chỉ command adapter ánh xạ interaction ID vào operation context.
- Không đưa timestamp thực thi vào request hash vì retry hợp lệ phải tạo cùng hash.
- Không coi idempotency foundation là hoàn tất Phase 3: resource ledger tổng quát và atomic period counter vẫn còn thiếu.

### Verification

- `audit:approved-policies`: PASS với 15 nhóm, thêm economy idempotency replay, reward-plan replay và canonical hash stability.
- `audit:data-schema-alignment`, `audit:database-foundation`: PASS.
- Shop/craft/exchange/reward/sect/treasure-hunt simulations: PASS.
- Exploration và Secret Realm simulation bị chặn trước reward bởi `src/battle/factory/BattleSkillFactory.js` hiện tự import/khởi tạo chính nó và gây `Maximum call stack size exceeded`; lỗi nằm ngoài thay đổi idempotency, chưa tự ý sửa trong bước này.
- Chưa chạy concurrent integration test trên PostgreSQL thật.

## 2026-07-16 — Resource ledger và atomic period counter

### Database foundation

- Thêm migration `008_economy_audit_foundation.sql` cho `resource_ledger` và `player_period_counters`.
- Ledger lưu resource type/ID, signed delta, balance-after, reason, execution reference, operation ID và timestamp; có index theo player/time, operation và reference.
- Counter có composite primary key `(player_id, counter_type, subject_id, period_type, period_key)`, non-negative value và hỗ trợ DAILY/WEEKLY/MONTHLY/LIFETIME.
- Thêm nullable `operation_id` cùng unique partial index cho shop purchase, craft log và exchange log; dữ liệu legacy không operation ID vẫn hợp lệ.
- Nâng shop price và craft currency cost snapshot từ `BIGINT` lên `NUMERIC(30,0)`; quantity execution log được nâng lên `BIGINT`.

### Runtime integration

- Thêm `PeriodCounterRepository.incrementWithinLimit()` với một conditional upsert; database chỉ tăng khi `current + increment <= limit`, nên hai request đồng thời không thể cùng vượt giới hạn.
- Shop daily limit dùng period key từ `PeriodKeyService` theo timezone trong `economy_rules.json`; bỏ scan `player_shop_purchases` và bỏ phụ thuộc session timezone của `CURRENT_DATE`.
- Thêm `ResourceLedgerRepository`; canonical integer string/BigInt được giữ xuyên suốt, zero delta không tạo ledger noise và negative balance-after bị từ chối.
- `PlayerInventoryRepository.getStackQuantity()` đọc balance stack trên cả schema LEGACY/BACKFILLED và ACTIVE.
- Shop ghi ledger currency cost và item reward; craft ghi currency/material cost và result; exchange/sect exchange ghi toàn bộ currency/item cost/reward. Execution log, resource mutation, counter, ledger và idempotency response cùng commit/rollback.

### Risk handling

- Thêm `Q-ECONOMY-003` trạng thái OPEN vì tài liệu chưa định nghĩa shape JSON, đơn vị đếm và multiplicity của `exchange.limit`.
- Không tự nối exchange limit vào counter; exchange hiện tại có `limit: null` tiếp tục hoạt động. Shop counter và ledger không phụ thuộc câu hỏi này.
- Reward ledger/reward-claim header chưa được gộp vào bước này; cần business reference ổn định thay vì dùng table ID có thể lặp lại.

### Verification

- `audit:database-foundation`: PASS với 11 nhóm, thêm migration discovery 008, atomic period counter, resource ledger và economy mutation audit trail.
- `audit:approved-policies`: PASS với 15 nhóm.
- `audit:data-schema-alignment`: PASS.
- Shop/craft/exchange/sect simulations: PASS.
- `node --check`: PASS cho migration consumers, repositories, economy services và database audit.
- Chưa chạy migration 008 hoặc concurrent transaction test trên PostgreSQL thật.

## 2026-07-16 — Mở khóa Exchange multi-period limit

### Resolved decision

- Chủ dự án chọn phương án B tại `Q-ECONOMY-003`: `exchange.limit` là danh sách `{ periodType, value }`.
- `periodType` hỗ trợ DAILY, WEEKLY, MONTHLY và LIFETIME; `value` được normalize thành canonical positive integer string.
- Đơn vị counter là số lần exchange thành công. Mỗi period type chỉ xuất hiện một lần trong cùng exchange để giữ một counter/constraint duy nhất.
- Cập nhật câu hỏi sang RESOLVED; không tự thêm limit vào exchange data hiện tại vì chưa có con số gameplay cụ thể.

### Runtime và validation

- `GameDataNormalizer` normalize period type và integer-string value; dữ liệu sai container được giữ để validator báo lỗi rõ thay vì crash trước validation.
- `GameDataValidator` từ chối non-array limit, period không hỗ trợ, value không dương và period type trùng lặp.
- `ExchangeService` tạo period key tại application layer: DAILY/WEEKLY/MONTHLY theo `Asia/Ho_Chi_Minh`, LIFETIME dùng key `LIFETIME`.
- `PlayerRuntimeRepository.exchangeTemplate()` increment toàn bộ configured counters sau player lock và trước resource mutation. Bất kỳ counter nào đầy trả `EXCHANGE_LIMIT_REACHED`; transaction rollback cả các counter đã tăng trước đó.
- Exchange không khai báo limit tiếp tục hoạt động với danh sách counter rỗng.

### Verification

- `audit:data-schema-alignment`: PASS, thêm normalize/validate contract DAILY + LIFETIME và duplicate-period rejection.
- `audit:database-foundation`: PASS với 11 nhóm; economy mutation audit xác nhận exchange increment đủ multi-counter.
- `audit:approved-policies`: PASS với 15 nhóm.
- Exchange và sect simulations: PASS.
- Chưa chạy migration 008 hoặc concurrent multi-limit test trên PostgreSQL thật.

## 2026-07-16 — Reward claim header foundation

### Persistence

- Thêm migration `009_reward_claim_foundation.sql` và bảng `reward_claims`.
- Header lưu player, claim type, source reference, operation ID, reward table ID, rolled reward snapshot và claimed timestamp.
- Unique operation ID chống lặp cùng request; unique `(player_id, claim_type, source_ref)` là lớp business dedup độc lập với thời hạn cached idempotency response.
- Không đặt foreign key từ claim sang `idempotency_records`, để audit claim không mất liên kết logic khi DEFAULT idempotency record được cleanup sau retention.
- Thêm `RewardClaimRepository`; từ chối mutation thiếu operation ID, claim type hoặc source ref.

### Risk handling

- Thêm `Q-REWARD-003` trạng thái OPEN: các activity hiện chưa có identity chung đủ ổn định để làm `source_ref`.
- Không dùng `rewardTableId` làm source ref vì một bảng thưởng được nhận hợp lệ nhiều lần.
- Chưa nối claim header/resource ledger vào `RewardApplyService`; phần phụ thuộc tạm dừng, còn migration/repository độc lập đã hoàn thành.
- Đề xuất đưa activity-run header lên sớm để reward, progress, ledger và completion tham chiếu cùng business run ID; chưa tự áp dụng.

### Verification

- `audit:database-foundation`: PASS với 12 nhóm, thêm migration discovery 009 và reward-claim-header contract.
- `audit:data-schema-alignment`: PASS.
- `audit:approved-policies`: PASS với 15 nhóm.
- `node --check`: PASS cho reward claim repository và database audit.
- Chưa chạy migration 009 trên PostgreSQL thật.

## 2026-07-16 — Activity-run identity và atomic reward claim

### Resolved decision

- Chủ dự án chọn phương án B tại `Q-REWARD-003`: activity run ID chung là business `source_ref` của reward claim.
- Cập nhật câu hỏi sang RESOLVED; không dùng reward table ID hoặc Discord operation ID làm business completion identity.

### Activity run foundation

- Thêm migration `010_activity_run_foundation.sql` với player, activity type, content ID, unique operation ID, status, input/result snapshot, reward table và timestamps.
- Thêm nullable unique `activity_run_id` vào `reward_claims`.
- Thêm `ActivityRunRepository.reserve()`: retry cùng operation/payload trả lại run ID cũ; tái sử dụng operation cho activity/content khác bị từ chối.
- Run được reserve bằng transaction ngắn trước reward roll. Claim/reward transaction hoàn tất run; crash trước hoàn tất để lại `IN_PROGRESS` có thể retry bằng operation ID cũ.

### Atomic reward claim và ledger

- `RewardRuntimeService` tạo activity run cho Treasure Hunt, Exploration, Secret Realm và Gathering khi adapter cung cấp operation ID.
- Run ID tạo `source_ref`, permanent business key và retention policy `ONE_TIME_CLAIM`.
- `RewardApplyService` trong một transaction: reserve idempotency, tạo reward claim với normalized rolled snapshot, apply reward, ghi ledger, complete activity run, lưu cached response.
- `PlayerRuntimeRepository.applyRewards()` ghi ledger cho currency, stack item và equipment; mọi entry tham chiếu `REWARD_CLAIM`/claim ID và giữ operation ID.
- Thêm inventory query đếm equipment theo template trên cả persistence mode legacy và active để ghi `balance_after`.
- Replay không roll-visible sai snapshot, không tạo claim/ledger lần hai và không complete run lần hai.

### Scope boundary

- Generic activity run completion và reward correctness đã atomic.
- Cooldown/ticket consumption, battle snapshot và các progress table legacy hiện vẫn ở transaction riêng; hợp nhất toàn bộ activity state vào `activity_runs/activity_run_steps` vẫn thuộc Phase 6.

### Verification

- `audit:approved-policies`: PASS với 15 nhóm; reward replay audit kiểm tra one-time business key, một claim và một run completion.
- `audit:database-foundation`: PASS với 14 nhóm, thêm migration 010, activity-run identity và reward mutation ledger.
- `audit:data-schema-alignment`: PASS.
- Reward-runtime và treasure-hunt simulations: PASS.
- `node --check`: PASS cho activity/reward repositories, services và audits.
- Chưa chạy migration 009/010 hoặc concurrent reward test trên PostgreSQL thật.

## 2026-07-16 — Phase 4 battle skill runtime repair

### Combat runtime

- Thay `BattleSkillFactory` bị hỏng do tự import/khởi tạo đệ quy bằng factory đọc normalized GameData và tạo immutable runtime skill.
- Chuẩn hóa target object `{ team, scope }` thành target strategy (`ENEMY_SINGLE`, `ALLY_*`, `SELF`), giữ action arguments mặc định và sắp xếp action theo `order` để execution deterministic.
- Basic attack dùng cùng target contract `ENEMY_SINGLE`; `BattleEngine.executeTurn()` tự xác định preview target từ skill/action thay vì tham chiếu biến chưa khai báo.
- Cập nhật battle simulator mặc định từ ID legacy `MON_<ELEMENT>_001` sang ID template hiện hành `TPL_MON_<ELEMENT>_001`.
- Mở rộng data-schema audit để kiểm tra factory tạo được `SK_FIRE_HOANG`, bảo toàn effect/formula, thứ tự action, target strategy và tính immutable.

### Risk handling

- Phát hiện toàn bộ monster template normalize `baseRewardId: BASIC_MONSTER_DROP` thành `rewardTableId`, nhưng reward registry không có record tương ứng; validator hiện còn bỏ qua missing reference này.
- Thêm `Q-MONSTER-001` trạng thái OPEN để chủ dự án chọn bảng tĩnh, alias theo cảnh giới hoặc reference trực tiếp. Không tự áp dụng mapping ảnh hưởng economy.
- Tạm dừng sửa validator và nhánh reward settlement phụ thuộc mapping để không làm GameData bootstrap ngừng hoạt động; battle engine thuần in-memory vẫn tiếp tục độc lập.

### Verification

- `node --check`: PASS cho battle skill factory, skill manager, battle engine, data audit và battle simulator.
- `audit:data-schema-alignment`: PASS; audit mới xác nhận `SK_FIRE_HOANG` thành immutable runtime skill với target `ENEMY_SINGLE` và chuỗi action `APPLY_EFFECT -> DAMAGE`.
- Battle simulation: PASS với ID mặc định hiện hành; FIRE thắng `TPL_MON_FIRE_001` sau 3 round ở seed 1. Smoke simulation cho đủ FIRE/WOOD/EARTH/METAL/WATER/LIGHTNING/ICE đều exit code 0 ở seed 7.
- Secret Realm simulation: PASS execution; chạy đủ 3 wave và kết thúc `FAILED` do thua boss theo kết quả battle, không còn lỗi factory/target.
- Exploration đã chạy qua battle và chỉ dừng tại lookup thiếu `rewardTables.BASIC_MONSTER_DROP`, xác nhận blocker nằm ở reward mapping thay vì combat runtime.
- `audit:approved-policies`: PASS với 15 nhóm; `audit:database-foundation`: PASS với 14 nhóm.
- Chưa sửa missing-reference validator hoặc chạy reward settlement phụ thuộc `Q-MONSTER-001`.

## 2026-07-16 — Triển khai lựa chọn B cho Monster reward alias

### Decision và implementation

- Chủ dự án chọn phương án B tại `Q-MONSTER-001`: `BASIC_MONSTER_DROP` resolve theo cảnh giới bằng mapping tường minh trong GameData.
- Nâng `monster_rules.json` lên version 3 và thêm contract `rewardResolution.aliases.<alias>.realmTableIds`; không ghép chuỗi `MONSTER_<REALM_CODE>` trong gameplay logic.
- `MonsterGeneratorService` resolve alias sau khi xác định runtime realm, trả runtime `rewardTableId` cụ thể và xác nhận table đích tồn tại.
- `GameDataValidator` kiểm tra strategy, realm code, target table và mapping cần thiết của từng monster template.
- Data audit bổ sung kiểm tra mapping `LUYEN_KHI -> MONSTER_LUYEN_KHI`, `TRUC_CO -> MONSTER_TRUC_CO` và negative case trỏ tới missing table.
- Cập nhật Monster Template spec với contract alias `BY_REALM` và nguyên tắc runtime chỉ giữ resolved table ID.

### Blocker mới từ dữ liệu

- Strict validation phát hiện `TPL_MON_DRAGON_001` thuộc `NGUYEN_ANH`, nhưng reward registry không có `MONSTER_NGUYEN_ANH` hoặc một fallback đã được phê duyệt.
- Thêm `Q-MONSTER-002` trạng thái OPEN; không tự tạo reward numbers, không tự hạ reward về bảng Trúc Cơ và không tự vô hiệu hóa Dragon.
- `Q-MONSTER-001` chuyển sang ANSWERED, chưa RESOLVED vì mapping chưa bao phủ toàn bộ monster template.

### Verification

- `node --check`: PASS cho resolver, validator và data audit.
- `audit:data-schema-alignment` và Exploration bootstrap hiện FAIL đúng kỳ vọng tại missing mapping `BASIC_MONSTER_DROP/NGUYEN_ANH`; không phát sinh lỗi syntax hoặc lỗi mapping cho Luyện Khí/Trúc Cơ trước validation gate.
- Phần strict validation/reward pipeline phụ thuộc tạm dừng chờ `Q-MONSTER-002`; các phần combat thuần in-memory đã được xác nhận PASS ở bước trước.

## 2026-07-16 — Chọn reward table riêng cho Monster Nguyên Anh

### Decision

- Chủ dự án chọn phương án A tại `Q-MONSTER-002`: tạo reward table riêng `MONSTER_NGUYEN_ANH`, không fallback về Trúc Cơ và không vô hiệu hóa Dragon.
- Chuyển `Q-MONSTER-002` sang ANSWERED; identity/mapping đích đã rõ nhưng chưa RESOLVED vì thiếu reward components cụ thể.

### Missing balance parameters

- Không có reward scaling formula trong tài liệu. Hai điểm dữ liệu Luyện Khí `10–20` và Trúc Cơ `20–40` không xác định duy nhất khoảng Nguyên Anh vì thiếu tier Kết Đan.
- Equipment reward hiện còn dùng hai field khác nhau giữa các bảng (`gradeChances` và `qualityChances`), nên không sao chép ngầm một mẫu làm contract mới.
- Thêm `Q-MONSTER-003` trạng thái OPEN với hai baseline cụ thể (`80–160` extrapolated hoặc `40–80` conservative) và phương án chủ dự án cung cấp bộ số riêng.
- Chưa tạo JSON table giả hoặc tự đặt economy numbers; phần phụ thuộc tiếp tục tạm dừng, code resolver/validator đã triển khai được giữ nguyên.

## 2026-07-16 — Monster reward theo Realm Registry và đánh giá Map foundation

### Monster reward hoàn tất

- Chủ dự án cung cấp baseline riêng cho `MONSTER_NGUYEN_ANH`: một roll, Linh Thạch `80–160`, Equipment `8%`, Pill `3%`, Ticket `1%`, grade quality `70/25/5`.
- Thêm reward table mới và mapping `BASIC_MONSTER_DROP` cho realm order 4.
- Nâng alias strategy thành `BY_REALM_ORDER`; resolver lấy `realm.order` từ Realm Registry và lookup mapping data, không so sánh/hard-code `NGUYEN_ANH` trong service.
- Sửa stage resolver: monster thường tuân theo `scalingRule.fixedStage`/`defaultFixedStage` (hiện là Stage 1); chỉ boss có policy `ADAPTIVE` mới nhận stage runtime. Trước đó default sai sang `realm.max_stage`.
- Validator kiểm tra order tồn tại, target reward table tồn tại và mọi monster template có mapping theo realm order.
- Chuyển `Q-MONSTER-001`, `Q-MONSTER-002`, `Q-MONSTER-003` sang RESOLVED.

### Verification

- JSON parse và `node --check`: PASS.
- `audit:data-schema-alignment`: PASS; mapping order `1/2/4` lần lượt resolve Luyện Khí, Trúc Cơ, Nguyên Anh và missing target bị validator từ chối.
- Exploration Dragon Nguyên Anh: VICTORY, resolved `MONSTER_NGUYEN_ANH`, roll Linh Thạch `134` trong khoảng `80–160`, reward apply và progress record thành công.
- `audit:approved-policies`: PASS 15 nhóm; `audit:database-foundation`: PASS 14 nhóm; Secret Realm execution PASS (kết quả gameplay FAILED do thua boss, không phải lỗi runtime).

### Map review và risk handling

- Đánh giá đề xuất Map -> Spawn Pool là hợp lý với data-driven architecture; Continent nên chỉ nhóm/presentation, Map mới là gameplay area.
- Chưa tự tạo spawn weights hoặc thay Dragon Nguyên Anh cho khoảng trống monster Kết Đan. Thêm `Q-MAP-002` cho initial pool content và `Q-MAP-003` cho persistence map selection.
- Thêm `Q-REWARD-004` vì `realmOffset` đã có trong data nhưng runtime hiện chưa có contract chọn equipment grade pool; currency/item reward không phụ thuộc câu hỏi này.

## 2026-07-16 — Map/Spawn Pool MVP và direct Equipment grade pool

### Approved decisions

- Chọn Map -> Monster Spawn Pool; ba map dùng content hiện hữu, `THIEN_MON` giữ `CONTENT_PENDING`.
- `mapId` là input mỗi Exploration/activity; không persist `current_map_id` và không thêm migration.
- Equipment reward dùng direct `gradePoolId`; không suy diễn `realmOffset` thành grade bằng code.

### GameData và runtime

- Thêm `maps/maps.json` với bốn khu vực hiện hữu và `maps/monster_spawn_pools.json` với ba pool ACTIVE.
- Luyện Khí pool dùng toàn bộ template Luyện Khí với equal weight 1; Hỏa Diệm Sơn chỉ dùng `TPL_MON_FIRE_002`; Thiên Môn không có pool và không selectable.
- GameData registry/normalizer/validator kiểm tra map status, unlock realm order, recommended range, pool reference, monster reference, positive weight, spawn type và realm eligibility.
- Thêm `MapEncounterService`: kiểm tra unlock/activity/status, lọc entry theo player realm order và weighted-select bằng injected random.
- Exploration nhận `mapId`, snapshot `mapId`/`spawnPoolId` vào reward context, progress và activity content ID; nhánh legacy monster/random vẫn giữ tương thích.
- `chuyenmap` bỏ catalog hard-code, đọc Map/Realm từ GameData và chỉ làm Discord presentation adapter.
- Load `equipment_grade_pools.json`; validator kiểm tra grade references/weights và RewardTableService hỗ trợ direct `gradePoolId`.
- Thêm `docs/10_GAMEPLAY/013_MAP_SPAWN_SPEC.md` làm contract runtime MVP.

### Risk handling

- Không tự tạo monster Kết Đan; Thiên Môn báo `CONTENT_PENDING` thay vì dùng Dragon Nguyên Anh ngầm.
- Chưa tự gán grade pool cho `MONSTER_NGUYEN_ANH`; thêm `Q-REWARD-005` vì lựa chọn B tại `Q-REWARD-004` chưa xác định ID pool cụ thể.

### Verification

- Syntax và GameData bootstrap/data-schema audit: PASS.
- Exploration `TRUC_LAM`: PASS battle/reward/progress; encounter và progress cùng ghi `TRUC_LAM`/`POOL_TRUC_LAM`.
- Audit map runtime kiểm tra deterministic weighted selection, realm lock, content-pending rejection và direct grade-pool lookup.

## 2026-07-16 — Gán grade pool cho Equipment Nguyên Anh

- Chủ dự án chọn phương án A tại `Q-REWARD-005`: `MONSTER_NGUYEN_ANH` dùng `gradePoolId: MAP_KET_DAN` trong MVP.
- Loại `realmOffset` khỏi equipment entry Nguyên Anh; grade được author bằng direct reference và validator bảo vệ reference.
- Pool hiện phân phối `HUYEN: 40`, `DIA: 60`; grade quality vẫn roll độc lập theo `LOW/MEDIUM/HIGH: 70/25/5`.
- Chuyển `Q-REWARD-004` và `Q-REWARD-005` sang RESOLVED.
- Data audit bổ sung xác nhận reward entry trỏ đúng pool và deterministic roll tại biên thấp chọn `HUYEN`.
- Exploration Dragon seed 1 roll Equipment grade `DIA`, xác nhận reward plan và applied equipment cùng giữ grade từ `MAP_KET_DAN`; không còn fallback `HOANG`.
- Data-schema, 15 approved-policy và 14 database-foundation checks đều PASS.

## 2026-07-16 — Battle executor coverage và deterministic replay audit

### Coverage contract

- `ActionExecutor` công bố immutable `EXECUTABLE_BATTLE_ACTION_TYPES` và `supports()`; danh sách phản ánh đúng các branch runtime hiện có.
- Data audit thu thập action type từ toàn bộ normalized Core Effect và Skill combat actions, thay vì chỉ kiểm tra registry ID tồn tại.
- 12 action type đang được content sử dụng; 8 type có executor trực tiếp/alias và 4 type chưa có semantics hoàn chỉnh: `CHAIN_DAMAGE`, `DISABLE_SKILL`, `SKIP_TURN`, `TRIGGER_ACTION`.
- Guard chỉ cho phép đúng bốn known-pending type; action unsupported mới hoặc allowlist cũ không còn xuất hiện sẽ làm audit fail, tránh silent `UNSUPPORTED_ACTION` debt lan rộng.

### Deterministic replay

- Thêm replay audit tạo fresh BattleEntity/input hai lần với cùng seed `20260716`.
- Deterministic projection gồm winner, round/turn, combat log, event queue và entity end state; loại `durationMs` vì đây là wall-clock metadata.
- Hai lần chạy giống hoàn toàn: winner A, 4 round, 132 event.

### Risk handling

- Thêm `Q-COMBAT-001` cho Freeze/Stun/Silence vì Action spec cấm Action thay đổi battle flow.
- Thêm `Q-COMBAT-002` vì Chain Damage thiếu số jump, target policy và decay.
- Thêm `Q-COMBAT-003` vì Defense Skill trigger 30% HP chưa có condition evaluator và bridge `TRIGGER_ACTION` rỗng trái Action spec.
- Không tự cài gameplay semantics hoặc làm bootstrap fail; các phần combat không phụ thuộc tiếp tục hoạt động và audit hiển thị debt rõ ràng.

### Verification

- `node --check`: PASS cho ActionExecutor và data audit.
- `audit:data-schema-alignment`: PASS, báo rõ executable/pending coverage và deterministic replay summary.

## 2026-07-16 — Hoàn tất Control, Chain Damage và Defense Passive

### Approved decisions

- Resolve `Q-COMBAT-001` theo A: control effect tạo typed directive; BattleEngine resolve theo ưu tiên `SKIP_ACTION > BASIC_ATTACK_ONLY > NORMAL_ACTION`. Stun/Freeze không thực hiện action nhưng vẫn chạy TURN_START/TURN_END, effect tick và expiry; Silence chỉ cho Basic Attack và không chặn passive.
- Resolve `Q-COMBAT-002` theo A: Chain Damage tối đa 3 enemy, không lặp, random without replacement, jump multiplier `1.0/0.7/0.4`.
- Resolve `Q-COMBAT-003` theo A: Defense Skill evaluate sau HP damage, trước ON_DEATH và chỉ khi target còn sống; trigger tối đa một lần mỗi skill/entity/battle. Shield là runtime shield state; `DEFENSE_*` là marker 2 turn.

### Architecture và implementation

- Thêm `ControlDirectiveResolver`; flow control rời khỏi ActionExecutor. Core data bỏ `SKIP_TURN`/`DISABLE_SKILL`, thay bằng `controlDirective` và validator chặn directive không hợp lệ.
- Thêm executor `CHAIN_DAMAGE`; executor chỉ chọn chuỗi target và điều phối các hit DAMAGE độc lập. `LIGHTNING_CHAIN` được author trong `formulas.json`, nhận `PARAM.CHAIN_MULTIPLIER`; không còn bridge formula cho runtime hiện hành.
- Thêm `PassiveSkillEngine` và battle-scoped triggered-skill set trong `BattleContext`. Passive actions được chạy trực tiếp qua ActionExecutor; không gọi nested `TRIGGER_ACTION`.
- Normalizer mặc định target `SELF` cho passive skill và tạo các `DEFENSE_*` bridge reference thành marker thuần, duration 2, không event/action. Validator cho phép marker/control effect không có action nhưng vẫn giữ strict validation cho effect gameplay thông thường.
- Executor coverage allowlist hiện rỗng: normalized GameData không còn action type pending.

### Verification

- JSON parse và `node --check` cho BattleEngine, ActionExecutor, PassiveSkillEngine: PASS.
- `audit:data-schema-alignment`: PASS; fixture control xác nhận lifecycle/Basic Attack, chain deterministic gây `64/44/25` lên ba target duy nhất, defense passive trigger một lần và marker còn 2 turn.
- Deterministic replay seed `20260716`: winner A, 4 round, 139 event và hai projection giống hoàn toàn.

## 2026-07-16 — Hoàn thiện Effect lifecycle foundation

### Phân tích contract

- `003_EFFECT_SPEC` đã chốt bốn loại `PASSIVE`, `STATUS`, `INSTANT`, `TRIGGER`; trong đó `INSTANT` phải thực thi ngay và không đại diện cho runtime state có duration.
- Runtime cũ luôn thêm mọi effect vào `BattleEntity.effects`, khiến `CHAIN_DAMAGE`, `HEAL` hoặc `PURIFY` dạng `INSTANT` không chạy actions tại thời điểm apply và có thể tồn tại sai như status.
- Phần sửa này không chọn thêm gameplay semantics: chỉ thực thi contract Effect đã ở trạng thái Stable. Condition DSL chưa có registry/data nên chưa được tự triển khai.

### Implementation

- `EffectEngine.applyEffect` tách nhánh `INSTANT`: resolve source/owner/target, chạy actions ngay qua `ActionExecutor`, phát `EFFECT_TRIGGERED` và trả transient result; không ghi effect vào entity state.
- `EffectEngine` nhận stateless `TargetSelector` để instant action vẫn hỗ trợ target strategy ngoài `SELF`/`TARGET`/`CASTER`; thiếu selector cho strategy phức tạp sẽ fail rõ thay vì chọn ngầm.
- Bổ sung runtime timing `ON_APPLY`, đồng bộ với event mà normalizer đã tạo cho effect `INSTANT`.
- `GameDataValidator` kiểm tra effect type, duration nguyên dương, `maxStack` nguyên dương khi `stackable=true`, event nằm trong registry contract và chance trong `0..100`. Marker/control directive vẫn dùng ngoại lệ đã phê duyệt trước đó.
- Data audit bổ sung fixture lifecycle: Burn reapply tạo một state với stack 2 và duration refresh 3; effect tồn tại đúng hai lần decrement đầu và expire ở lần thứ ba; Chain Damage instant chạy ba target nhưng không nằm trong `entity.effects`; bốn negative validation case đều bị từ chối.

### Verification

- `audit:data-schema-alignment`: PASS; executor pending rỗng, effect lifecycle PASS, deterministic replay vẫn winner A/4 round/139 event.
- `audit:approved-policies`: PASS 15 nhóm; `audit:database-foundation`: PASS 14 nhóm.
- Battle simulation: PASS, winner A; Exploration simulation: VICTORY, reward APPLIED và progress RECORDED.
- `node --check` cho EffectEngine và GameDataValidator: PASS.

### Blocker cục bộ tiếp theo

- Khi chuẩn bị nối Execution Context/Condition stage, phát hiện spec dùng `conditionId` nhưng không có Condition Core Data, schema predicate, registry hay evaluator trong source.
- Thêm `Q-COMBAT-004` trạng thái OPEN với ba hướng: registry + typed predicate tree, inline object, hoặc code-only ID. Đề xuất kỹ thuật A nhưng chưa áp dụng.
- Tạm dừng riêng Condition Checker và action/trigger có `conditionId`; không dừng các phần Phase 4 độc lập.

## 2026-07-16 — Condition Registry foundation theo lựa chọn A

### Approved contract và implementation

- Chủ dự án chọn A tại `Q-COMBAT-004`, gồm baseline đã đề xuất: Condition Core Data dùng typed tree; predicate `HP_PERCENT`, `HAS_EFFECT`, `IS_ALIVE`; subject `SELF`, `TARGET`; group `ALL`, `ANY`; comparator số `LT/LTE/GT/GTE/EQ`, boolean `IS`; invalid reference/executor fail-fast.
- Thêm `src/data/conditions.json` và đăng ký nguồn trong GameData Registry. Normalizer tạo collection `conditions`; GameDataManager deep-freeze toàn bộ definition/tree.
- Thêm `ConditionEvaluator` không giữ battle state: lookup condition theo ID, resolve subject từ execution input, evaluate recursive group và predicate; missing ID, unavailable subject hoặc unsupported predicate/operator ném error có mã rõ.
- `GameDataValidator` kiểm tra recursive node type, group/operator/children, predicate/subject/operator/value, HP range và `HAS_EFFECT.arguments.effectId`; event/action `conditionId` phải tham chiếu definition tồn tại.
- `BattleActionFactory` giữ `conditionId` thay vì làm mất field khi tạo immutable runtime action; Core Effect normalizer giữ `event.conditionId`.

### Risk handling

- Khi chuẩn bị nối evaluator vào pipeline, phát hiện spec ghi Condition trước Target nhưng contract mới cho phép subject `TARGET`; multi-target Action cũng chưa có semantics filter/gate.
- Thêm `Q-COMBAT-005` OPEN. Không tự chọn per-target filtering, primary-target gate hoặc evaluation scope; integration Action/Trigger tạm dừng, registry/evaluator và content hiện tại tiếp tục độc lập.

### Verification

- `audit:data-schema-alignment`: PASS; 4 Condition definitions được load, ba predicate và composite `ALL` trả kết quả đúng, definition tree deep-immutable, missing ID fail-fast.
- `audit:approved-policies`: PASS 15 nhóm; `audit:database-foundation`: PASS 14 nhóm.
- Battle simulation: PASS, winner A; deterministic replay không đổi: winner A, 4 round, 139 event.
- JSON parse và `node --check` cho ConditionEvaluator, GameDataNormalizer, GameDataValidator: PASS.

## 2026-07-16 — Condition per-target pipeline theo lựa chọn A

### Approved semantics

- Chủ dự án chọn A tại `Q-COMBAT-005`: resolve candidate targets trước, evaluate Condition cho từng `{ SELF, TARGET }`, loại riêng target false và execute phần còn lại.
- Khi tất cả target bị loại, runtime không gọi ActionExecutor và phát `ACTION_SKIPPED_CONDITION`; partial filtering phát `ACTION_TARGETS_FILTERED_CONDITION` kèm target IDs bị loại.
- Trigger/Event condition dùng effect owner làm `SELF`, payload target làm `TARGET`; Condition yêu cầu `TARGET` nhưng event không cung cấp target fail-fast `CONDITION_SUBJECT_UNAVAILABLE:TARGET`.

### Implementation

- Thêm stateless `ConditionTargetFilter` làm cổng dùng chung quanh `ConditionEvaluator`.
- BattleEngine filter từng action sau TargetSelector và trước ActionExecutor.
- EffectEngine áp dụng cùng filter cho tick action và instant effect action; action bị skip không tạo null result trong summary.
- BattleTriggerDispatcher evaluate event condition trước chance/action, sau đó filter target cho từng effect action.
- PassiveSkillEngine filter action của Defense Skill theo cùng contract; không có đường action runtime chính nào tự diễn giải condition riêng.
- Bổ sung Condition composite `ANY` để kiểm chứng cả hai group operator.
- Cập nhật `008_ACTION_SPEC`: `Resolve Target Candidates -> Evaluate Condition per Target -> Execute Action`, thay cho thứ tự cũ không thể cung cấp subject `TARGET`.
- Chuyển `Q-COMBAT-004` và `Q-COMBAT-005` sang RESOLVED.

### Verification

- Data audit chứng minh AOE chỉ damage target HP <= 30%, target HP cao không đổi và filter event chứa đúng rejected ID.
- Trường hợp mọi target fail phát `ACTION_SKIPPED_CONDITION`; Trigger thiếu payload target fail-fast đúng mã.
- Condition audit hiện load 5 definitions, kiểm tra `ALL`, `ANY`, deep immutability và missing ID.

### Regression

- `audit:data-schema-alignment`: PASS; executor pending rỗng, Condition per-target/filter/skip/event fail-fast đều PASS, deterministic replay giữ winner A/4 round/139 event.
- `audit:approved-policies`: PASS 15 nhóm; `audit:database-foundation`: PASS 14 nhóm.
- Exploration simulation: VICTORY, reward APPLIED và progress RECORDED.

## 2026-07-16 — ExecutionContext và BattleActionPipeline

### Architecture

- Thêm immutable `ExecutionContext` theo Stable spec, mỗi instance chỉ đại diện một Action và giữ runtime references: BattleContext, caster, skill, action, resolved targets, action index, current round, Random Provider, Formula Result, Action Result và skip reason.
- Thêm `BattleActionPipeline` làm orchestration duy nhất cho candidate target resolution, per-target Condition filtering, ActionExecutor call và construction của ExecutionContext.
- BattleEngine không còn tự lặp target/condition/execute trong skill loop; chỉ nhận `execution.actionResult` để tổng hợp skill cast.
- EffectEngine, BattleTriggerDispatcher và PassiveSkillEngine chuyển sang `executeResolved()` với candidate targets đặc thù của từng nguồn nhưng dùng chung condition/skip/result contract.
- Giữ fallback cũ trong ba module cho dependency injection độc lập; BattleEngine production wiring luôn inject shared pipeline.

### Audit và regression

- Execution Context audit xác nhận object và targets immutable, giữ đúng runtime references, một context cho một action, Formula/Action Result đúng và skipped context mang `NO_TARGET` không có Action Result.
- Data-schema audit PASS; deterministic replay vẫn lặp lại hoàn toàn với winner A, 4 round, event count mới 135. Giảm 4 event là kết quả loại bỏ skip/condition orchestration trùng giữa các module, không đổi winner/state.
- Approved policies PASS 15 nhóm; database foundation PASS 14 nhóm; battle simulation PASS winner A.
- Secret Realm chạy đủ ba wave; thất bại ở boss là gameplay outcome hợp lệ, reward/progress không apply đúng policy.

## 2026-07-16 — Action Executor Registry

### Implementation

- Thay `switch(action.type)` bằng registry `Map<actionType, handler>` trong ActionExecutor.
- Built-in per-target executors được đăng ký theo alias: Shield, Apply/Add Effect và Purify/Remove Debuff dùng chung handler; Chain Damage dùng action-level handler riêng.
- Thêm API instance `register`, `registerMany`, `supports`; constructor nhận `actionExecutors` để inject plugin executor. Static `ActionExecutor.supports()` tiếp tục chỉ phản ánh built-in contract cho data audit.
- Unknown action vẫn đi qua unsupported handler và sinh kết quả/event tương thích; không silent drop.

### Verification

- Data audit xác nhận toàn bộ normalized action types có built-in executor và pending list rỗng.
- Inject `AUDIT_CUSTOM` executor thành công, instance registry dispatch đúng result, static built-in coverage không bị biến đổi.
- Deterministic replay giữ winner A, 4 round, 135 event; syntax check PASS.

### Blocker cục bộ tiếp theo

- ActionExecutor vẫn đang dispatch action/semantic triggers, trái Stable Action spec. Việc di chuyển cần chốt lifecycle hook theo Action hay Target và semantics riêng của Chain.
- Thêm `Q-COMBAT-006` OPEN với ba phương án; đề xuất one lifecycle per Action nhưng chưa áp dụng.

## 2026-07-16 — Action lifecycle pipeline theo lựa chọn B

### Approved semantics

- Chủ dự án chọn B tại `Q-COMBAT-006`: mỗi Action/ExecutionContext có đúng một `BEFORE_ACTION` và một `AFTER_ACTION`, kể cả Action có nhiều target.
- `BEFORE_ACTION` nhận toàn bộ final target IDs. ActionExecutor mutate và trả ordered aggregate results; pipeline phát semantic hook theo từng result/target; `AFTER_ACTION` nhận aggregate Action Result.
- Ordering được áp dụng: `BEFORE_ACTION -> mutate/collect all results -> semantic trigger theo target order -> reactive Defense cho target còn sống -> ON_DEATH -> AFTER_ACTION`.
- Chain giữ lifecycle action type `CHAIN_DAMAGE`; mỗi jump vẫn phát semantic `ON_HIT`/`ON_DEATH` riêng theo target.

### Architecture và implementation

- Chuyển toàn bộ `BEFORE_ACTION`, `AFTER_ACTION`, `ON_HIT`, `ON_HEAL`, `ON_SHIELD`, `ON_EFFECT_APPLIED`, `ON_DEATH` và reactive Defense orchestration từ ActionExecutor sang `BattleActionPipeline`.
- ActionExecutor trở thành mutation/Action Result boundary: không giữ `triggerDispatcher`, không giữ `passiveSkillEngine`, và custom executor không cần tự biết lifecycle hook.
- Thêm `ChainTargetExpander`: chọn tối đa `maxTargets` enemy còn sống, không lặp, bằng Random Provider. Pipeline mở rộng Chain target trước per-target Condition filtering và trước `BEFORE_ACTION`.
- Chain executor không còn tự resolve target; chỉ áp dụng `jumpMultipliers` lên final targets theo thứ tự đã resolve.
- BattleEngine inject shared TriggerDispatcher và PassiveSkillEngine vào pipeline; EffectEngine, TriggerDispatcher và PassiveSkillEngine tiếp tục chạy action qua cùng pipeline production.
- Cập nhật Stable Action Executor và Trigger System specs, roadmap; chuyển `Q-COMBAT-006` sang RESOLVED.

### Verification

- `node --check` cho BattleActionPipeline, ActionExecutor và data audit: PASS.
- `audit:data-schema-alignment`: PASS. Lifecycle fixture chứng minh Chain phát `BEFORE_ACTION, ON_HIT, ON_HIT, ON_HIT, AFTER_ACTION`; target order trùng aggregate result; mỗi lifecycle hook chỉ xuất hiện một lần; ActionExecutor trigger-independent.
- Regression control/Chain/passive PASS: Chain damage deterministic `64/44/25` trên ba target duy nhất; Defense passive trigger đúng một lần và marker còn 2 turn.
- Deterministic replay seed `20260716`: winner A, 4 round, 135 events và hai projection giống hoàn toàn.

## 2026-07-16 — Shared Random Provider và architecture boundary guard

### Architecture

- Thêm `platform/random/createSeededRandom` làm seeded Random Provider dùng chung. Provider validate seed hữu hạn, chuẩn hóa về integer state và trả function sinh giá trị trong `[0, 1)` theo deterministic sequence.
- Thay bốn bản sao thuật toán RNG trong battle simulator, exploration simulator, Secret Realm simulator và data-schema audit bằng shared provider; BattleEngine và gameplay service tiếp tục nhận dependency dạng function nên không phụ thuộc implementation seeded cụ thể.
- Thêm `auditArchitectureBoundaries`: scan source `.js` trong phạm vi xác định, không đọc Git history/build/dependency output.
- Guard cấm `discord.js` trong `battle/gameplay/runtime/foundation/factories/items/shared`; cấm battle import Discord, Node fs, database adapter hoặc repository.
- Guard kiểm tra gameplay/runtime không bypass `runtime/battle/BattleEntityFactory` bằng cách khởi tạo `BattleEntity` trực tiếp.
- Cập nhật Battle Module spec và thêm script `npm run audit:architecture-boundaries`.

### Verification

- Architecture boundary audit: PASS trên 22 battle files, 7 business roots và BattleEntityFactory gate.
- Seed `20260716` tạo hai sequence 8 phần tử giống hoàn toàn; mọi giá trị thuộc `[0, 1)`.
- `audit:data-schema-alignment`: PASS; deterministic battle replay giữ winner A, 4 round, 135 events.
- Battle simulation: PASS, winner A. Exploration: VICTORY, reward APPLIED, progress RECORDED.
- Secret Realm chạy đủ ba wave; outcome FAILED do thua boss, reward/progress NOT_APPLIED đúng policy hiện hành.

## 2026-07-16 — Element relation schema alignment

### Phân tích và implementation độc lập

- Phát hiện `src/data/elements/element_relations.json` dùng hai mảng `generate`/`counter`, trong khi GameDataNormalizer đọc `elementRelations.relations`; bootstrap không báo lỗi vì collection này chưa nằm trong required collections. Kết quả trước đó là 10 quan hệ hiện hữu bị silent-drop.
- Sửa normalizer để chuyển data hiện hữu thành immutable records có ID deterministic, `relationType: GENERATE | COUNTER`, `from`, `to`; không sửa source JSON và không thêm thông số gameplay.
- Đưa `elementRelations` vào required collection. Validator kiểm tra relation type, hai Element reference tồn tại và cấm self-relation.
- Cập nhật Element Stable spec để mô tả normalized runtime shape và ghi rõ contract cấu trúc chưa đồng nghĩa với multiplier/tác động battle.

### Risk handling

- Không tự áp dụng tương sinh/tương khắc vào damage vì data thiếu hệ số, formula/effect reference, nguồn Element tấn công/phòng thủ và semantics cho mutation Element.
- Thêm `Q-COMBAT-007` OPEN với ba hướng metadata-only, direct multiplier hoặc effect-driven relation; đề xuất C dài hạn nhưng giữ behavior A cho đến khi được duyệt.
- Khi đối chiếu exit criteria, ghi nhận BattleResult Stable spec yêu cầu Statistics/Loser/Survivors nhưng chưa có schema metric và aggregation contract. Thêm `Q-COMBAT-008` OPEN; không tự instrument metric.
- Hai blocker chỉ dừng Element combat resolver và BattleResult statistics; pipeline battle, relation registry và các phần độc lập vẫn hoạt động.

### Verification

- `audit:data-schema-alignment`: PASS; load đủ 7 Elements và 10 relations, gồm 5 GENERATE/5 COUNTER; direction `WATER -> FIRE` được bảo toàn và registry deep-immutable.
- Negative validation bảo vệ unknown relation type, missing Element reference và self-relation.
- Deterministic replay không đổi: winner A, 4 round, 135 events.
- `audit:architecture-boundaries`: PASS trên 22 battle files và toàn bộ boundary guard hiện hành.

## 2026-07-17 — Battle Stat contract audit và dọn target API legacy

### Phân tích

- Đối chiếu `attributes.json`, normalized Modifiers, RuntimePlayer, BattleEntityFactory, BattleEntity và FormulaEngine cho thấy snapshot player chỉ materialize HP/ATK/DEF/SPD/CRIT/CDMG.
- BattleEntity/Formula đã expose thêm PEN, SKD, LS, shield power, control rate/resist, final damage/defense, hit rate, control immunity và luck; modifier cho các stat này có thể được collect nhưng bị bỏ khi factory tạo base battle stat.
- Không tự mở rộng factory vì percent contract đang không thống nhất: Core Data dùng percentage point như CRIT `5`, HIT_RATE `100`, `ADD 10`, còn critical runtime so sánh trực tiếp `random < critRate` và CDMG dùng multiplier `1.5`. Áp dụng ngay sẽ làm thay đổi balance nghiêm trọng.

### Risk handling

- Thêm `Q-COMBAT-009` OPEN với ba hướng fraction canonical, percentage-point canonical hoặc typed stat value. Đề xuất B vì khớp source JSON, nhưng chưa áp dụng.
- Tạm dừng riêng full stat materialization, critical/CDMG conversion và modifier propagation audit; HP/ATK/DEF/SPD hiện hành không bị thay đổi.
- Xác nhận `SkillManager.getTargetStrategy()` không còn caller trong source/docs sau khi BattleActionPipeline sở hữu target resolution; loại bỏ method TODO/compatibility này mà không thay gameplay.

### Verification

- `node --check` SkillManager: PASS.
- `audit:architecture-boundaries`: PASS trên 22 battle files, Discord/DB/fs boundary và BattleEntityFactory gate đều giữ nguyên.
- `audit:data-schema-alignment`: PASS; 7 Elements, 10 Element relations, executor/condition/lifecycle coverage đều PASS.
- Deterministic replay seed `20260716` không đổi: winner A, 4 round, 135 events.

## 2026-07-17 — Resolve Battle Stat và BattleResult metrics

### Approved decisions

- `Q-COMBAT-009` chọn B: percentage-point là canonical unit cho battle percent stats; Attribute registry là nguồn default/min/max/type; conversion chỉ diễn ra tại Formula/Effect usage boundary.
- `Q-COMBAT-008` chọn B và duyệt baseline chi tiết: typed collector thuộc BattleContext, battle + per-entity scope, integer-string amount, mutation boundary là nguồn chuẩn, không derive từ Combat Log/events.
- `Q-COMBAT-007` chọn C: Element relation dài hạn phải Effect-driven. Câu hỏi chuyển ANSWERED, chưa RESOLVED vì source chưa có policy reference/timing/Element source đủ để author behavior; không tự gán multiplier/effect.

### Battle Stat implementation

- Thêm `BattleStatPolicy` định nghĩa 19 stat và helper percentage-point -> rate/probability/CDMG multiplier.
- BattleEntityFactory dùng Attribute registry materialize đầy đủ primary/secondary/growth/special stat cho player và monster; áp min/max, floor INTEGER và hỗ trợ modifier mode `set`.
- Bổ sung mapping SHD -> shieldPower, REG -> regen, REF -> reflect xuyên Normalizer/Factory/Entity.
- BattleEntity defaults đổi sang source-data semantics: CRIT 5 point, CDMG 50 bonus point, HIT_RATE 100 point. Formula fallback critical convert CRIT/100 và CDMG multiplier `1 + CDMG/100`; PEN/SKD/LS formulas vốn đã dùng `/100` tiếp tục nhất quán.

### Metrics và BattleResult implementation

- Thêm typed `BattleMetricsCollector`; per-entity amount fields dùng BigInt nội bộ và string snapshot, counters dùng safe integer.
- Action mutation boundary ghi actual HP damage dealt/taken, shield absorbed, effective healing, shield granted, critical, kill/death và successful non-transient effect application đúng một lần.
- BattleEngine ghi total turns và một action taken/skipped cho mỗi turn action/control outcome; passive/effect nested actions không bị tính thành active action riêng.
- Sửa `receiveDamage` clamp HP damage theo HP còn lại, nên overkill không làm phồng damage metrics.
- BattleResult thêm `outcome`, `loserTeam`, `isDraw`, survivor snapshots và immutable `statistics`; `turns` nay là total executed turns thay vì turn index của round cuối.
- BattleContext phân biệt both-teams-dead DRAW, có `abort()`/ABORTED contract; BattleEngine kết thúc khi battle resolved. TIMEOUT giữ riêng, không tự coi là DRAW.

### Verification

- Stat audit: materialize đủ 19 stat; CRIT 15 point, CDMG 60 point -> critical multiplier 1.6; PEN/SKD/LS/SHD/control/final/HIT_RATE và SET đều không bị drop.
- Metrics fixture: actual HP damage `110`, effective healing `10`, shield absorbed `32`, kill/death, two critical hits, one effect application và survivor snapshot đều đúng; statistics deep-immutable.
- Outcome audit bao phủ `TEAM_A_WIN`, `DRAW`, `TIMEOUT`, `ABORTED`; timeout không mang draw flag.
- `audit:data-schema-alignment`: PASS; deterministic replay giữ winner A, 4 round, 135 events.
- Battle simulation PASS; result turns chuyển từ final round index sang total executed turns theo approved semantics.

## 2026-07-17 — Element relation structural resolver

### Implementation độc lập

- Thêm stateless `ElementRelationResolver` dùng immutable GameData collection để lookup chính xác theo `from`, `to` và optional `relationType`.
- Resolver validate cả hai Element ID bằng registry, trả immutable list, không đảo direction, không tạo relation neutral và không suy diễn mutation Element về parent.
- Data audit xác nhận `WATER -> FIRE` resolve COUNTER, `FIRE -> EARTH` resolve GENERATE, `FIRE -> WATER` neutral trả rỗng và unknown Element fail-fast.

### Risk handling

- `Q-COMBAT-007` vẫn ở ANSWERED: lựa chọn Effect-driven đã chốt, nhưng chưa có content contract để RESOLVED.
- Thêm `Q-COMBAT-010` cho nguồn Element khi resolve (Skill vs entity/action, Player Spirit Root, mutation fallback).
- Thêm `Q-COMBAT-011` cho execution contract (scoped Effect, Formula policy hoặc typed relation event). Không tự thêm `effectId`, multiplier, timing hoặc temporary modifier vào 10 relation hiện hữu.
- Combat pipeline hiện hành không gọi resolver, nên không có thay đổi balance/RNG/outcome.

## 2026-07-17 — Effect-driven Element relation runtime

### Approved decisions

- Resolve `Q-COMBAT-007`, `Q-COMBAT-010` và `Q-COMBAT-011` theo Effect-driven relation; `relationType` chỉ phân loại/lookup, không hard-code multiplier hoặc behavior.
- Offensive Element được snapshot một lần theo `Action explicit -> owning Effect explicit -> Skill -> NEUTRAL`; không fallback innate Element của actor. Defensive Element snapshot riêng từng target theo `runtime Effect override -> metadata.defensiveElement -> NEUTRAL`.
- Lookup giữ đúng chiều authored, không đảo và không fallback `parentElement` cho ICE/LIGHTNING. Player lấy defensive Element từ Spirit Root có một `elementId`; Monster lấy từ template/plan.
- Relation `effectId` là optional trong migration. Effect được tham chiếu phải khai báo capability `scopes: ["ACTION"]`; relation thiếu `effectId` hợp lệ và không tạo gameplay behavior.

### Architecture và implementation

- Mở rộng normalizer để giữ `effectId` trên Element relation, `element` trên Action/Effect và `scopes` trên Core Effect. Validator fail-fast missing Effect, Effect không hỗ trợ ACTION scope, unknown Element và scope không hợp lệ.
- Thêm `ActionScopedElementEffectEngine` vào phase sau một `BEFORE_ACTION` và trước Formula/Action mutation. Mỗi carrier có source/target/relation cùng `ownerExecutionId`, không lưu vào `BattleEntity.effects`, không tick duration/stack và cleanup trong `finally` sau `AFTER_ACTION`.
- `ADD_MODIFIER` của relation carrier được áp bằng modifier policy hiện hành lên bản sao Battle Stat riêng cho cặp Action/target. ActionExecutor chỉ dùng bản sao này tại Formula boundary; base stat, runtime modifier và target khác không bị mutate.
- Các Action khác do carrier sinh ra đi qua shared BattleActionPipeline với ExecutionContext riêng. Runtime truyền shared Random Provider, causal stack và max-depth guard để ngăn recursion vô hạn.
- `ExecutionContext` bổ sung `executionId`, `offensiveElement` và immutable per-target `elementRelations` snapshot. Event `ELEMENT_RELATION_APPLIED` chỉ phục vụ quan sát, phát tối đa một lần cho context + target + relation và không làm Effect chạy lại.
- BattleEntityFactory materialize `metadata.defensiveElement`: Player từ Spirit Root single-element, Monster từ plan/template; Effect runtime có thể cung cấp override theo lifecycle của chính Effect.
- BattleEngine truyền cùng GameDataManager/Random Provider xuyên Formula, Effect, Action, Skill, Target và relation modules; Action/Effect Element được giữ xuyên factory/trigger/tick path.

### Compatibility và verification

- Thêm `audit:element-relation-effects`. Fixture WATER -> FIRE gắn ACTION-scoped `ATK_UP_20`: damage hiện tại tăng `100 -> 120`, nhưng caster ATK thật vẫn `100`, không có runtime modifier/carrier lưu trên entity.
- ExecutionContext snapshot đúng WATER/FIRE/relation/effect; observation event đúng một lần. Scope active trở về 0 sau cả completion bình thường và injected executor failure.
- Validator negative fixture chặn missing Effect và Effect không có ACTION capability. Spirit Root single-element resolve WATER; mixed root resolve NEUTRAL.
- Base data 10 relation chưa có `effectId`: cùng Action gây damage `100`, không có behavior event và deterministic replay tiếp tục winner A/4 round/135 event.
- `audit:data-schema-alignment`, `audit:approved-policies` và `audit:architecture-boundaries`: PASS.

### Blocker cục bộ tiếp theo

- Chủ dự án chọn A tại `Q-COMBAT-012`: mỗi relation sẽ tham chiếu một Effect riêng; câu hỏi chuyển `ANSWERED` vì identity/reference model đã rõ.
- Thêm `Q-COMBAT-013` vì vẫn thiếu Action/Modifier/target/chance và thông số balance cho 10 Effect. Không tự gắn `effectId` rỗng hoặc tạo modifier theo relation type.
- Blocker chỉ áp dụng cho author content tương sinh/tương khắc; scoped runtime, validator và các Phase độc lập tiếp tục triển khai được.

### Audit hardening độc lập

- Mở rộng Element relation audit để chứng minh đầy đủ source priority `Action -> Effect -> Skill -> NEUTRAL`; innate Element của actor không được dùng làm fallback.
- Multi-target fixture chứng minh WATER -> FIRE nhận scoped ATK và damage `120`, trong khi target EARTH cùng Action giữ damage `100`; Formula Context không rò giữa target.
- Khóa phase ordering bằng event sequence `BEFORE_ACTION -> ELEMENT_RELATION_APPLIED -> DAMAGE -> AFTER_ACTION`.
- Supplemental Action cố tự kích hoạt lại cùng relation bị chặn bằng causal key deterministic; toàn bộ nested ACTION scope được cleanup và active scope count trở về 0.
- `audit:element-relation-effects`, `audit:data-schema-alignment` và `audit:architecture-boundaries`: PASS; deterministic replay giữ winner A/4 round/135 event.

## 2026-07-17 — Author Element relation content baseline

### Approved content

- Chủ dự án chọn phương án A tại `Q-COMBAT-013`, hoàn tất quyết định A trước đó tại `Q-COMBAT-012`: mỗi relation có Effect ID riêng nhưng dùng baseline chung theo relation type.
- Năm `GENERATE` dùng `ADD_MODIFIER`, target `SELF`, modifier `ATK_UP_10`, chance 100%.
- Năm `COUNTER` dùng `ADD_MODIFIER`, target `SELF`, modifier `ATK_UP_20`, chance 100%.
- Mỗi Effect khai báo `type: INSTANT`, `scopes: ["ACTION"]`, event metadata `ON_APPLY` và tag `ELEMENT_RELATION` cùng classification tương ứng. Runtime vẫn không hard-code behavior theo `relationType`.

### Data và validation

- Gắn `effectId` tường minh vào đủ 10 record trong `element_relations.json`; ID có shape `EFFECT_ELEMENT_<FROM>_<RELATION_TYPE>_<TO>`.
- Thêm 10 Core Effect definitions vào Element effect data; không tạo modifier mới vì baseline tái sử dụng `ATK_UP_10` và `ATK_UP_20` đã được duyệt.
- Normalizer giữ top-level Action `chance`; validator bảo vệ chance trong `0..100` cùng Effect reference/ACTION scope hiện hành.
- Core Effect registry tăng từ 93 lên 103 definitions. `Q-COMBAT-012` và `Q-COMBAT-013` chuyển RESOLVED; không còn blocker Element relation content baseline.

### Verification

- Content audit xác nhận 10 relation, 10 Effect ID duy nhất, đúng ACTION scope, `ADD_MODIFIER SELF`, chance 100% và modifier mapping theo từng authored record.
- Formula fixture base ATK 100: `GENERATE` tạo damage 110, `COUNTER` tạo damage 120; caster stat thật vẫn 100 và carrier không lưu trên entity.
- Compatibility fixture chủ động bỏ `effectId` vẫn tạo damage 100, không phát behavior event, chứng minh migration contract optional tiếp tục đúng.
- Multi-target WATER Action tạo damage `[120, 100]` trên FIRE/EARTH; modifier của target có relation không rò sang target không relation.
- Full regression PASS: Element relation, data-schema, approved policies, database foundation, architecture boundaries, battle simulation và Exploration reward/progress. Deterministic replay giữ winner A, 4 round, 135 events.

## 2026-07-17 — Gathering structural audit và runtime risk review

### Independent implementation

- Đưa `gatheringTemplates` vào required GameData collections; bootstrap fail nếu collection thiếu/rỗng.
- Thêm `validateGatheringTemplates`: name bắt buộc; `requiredRealm` phải resolve Realm code; `rewardTableId` phải resolve Reward Table; duration là số nguyên dương; stamina cost và daily limit là số nguyên không âm.
- Data audit xác nhận hai template HERB_GATHERING/MINING được normalize đúng và negative fixture chặn đủ name/realm/reward/duration/stamina/daily-limit invalid.

### Runtime risk analysis

- Gathering hiện check daily count bằng `CURRENT_DATE` ngoài transaction, trái period-key/timezone foundation và có race khi daily limit được bật.
- Reward/activity run được commit trước legacy `player_gathering_runs`; crash hoặc retry có thể tạo trạng thái reward/progress không đồng nhất. Stamina cost chỉ được ghi log, không có resource để debit. Duration 30/60 không được runtime thực thi.
- Không tự sửa semantics. Thêm `Q-GATHERING-001` cho atomic completion ownership, `Q-GATHERING-002` cho Stamina và `Q-GATHERING-003` cho duration start/claim/cooldown.
- Blocker chỉ dừng Gathering completion refactor; structural data validation, listing, preview và các module độc lập tiếp tục hoạt động.

### Verification

- `audit:data-schema-alignment`: PASS, Gathering structural contract 2 templates và full deterministic battle replay không đổi.
- `audit:database-foundation`: PASS 14 nhóm, gồm atomic period counter/activity run/reward ledger primitives.
- Gathering simulation: HERB_GATHERING available, MINING realm-locked, reward/progress legacy flow hoàn tất; kết quả này không được dùng để khẳng định concurrency safety.

## 2026-07-17 — Player profile/progression read-model hardening

### Sửa lỗi progression độc lập

- Phát hiện `PlayerProgressService` đọc `realm.req_cul`, là compatibility field chỉ chứa required cultivation của Stage 1, nên profile tiến độ sai từ Stage 2 ở các Realm có growth khác 1.
- Thêm domain utility `RealmStageValue` triển khai đúng ADR2-020: `FLOOR(initial × growthPerStage^(stage-1))`, normalize Stage tối thiểu 1 và clamp theo `maxStage` khi có Realm context.
- Legacy `Player` và `PlayerProgressService` cùng dùng utility này; progress view bổ sung `realm.stage`, required cultivation hiện tại theo đúng Stage, còn `nextRealm.requiredCultivation` biểu diễn Stage 1 của Realm kế tiếp.
- Không thay đổi `/hoso`, `/nhanvat`, visibility hay Discord presenter. Thêm `Q-PROFILE-001` vì lựa chọn canonical query và public/private fields là quyết định sản phẩm/kiến trúc cần chủ dự án duyệt.

### Verification

- `simulate:player-progress` dùng Trúc Cơ Stage 3, bắt buộc required cultivation khác compatibility Stage 1 và khớp resolver dùng chung.
- `audit:approved-policies`, `audit:architecture-boundaries` và `audit:data-schema-alignment`: PASS.
- Gathering completion vẫn bị chặn cục bộ bởi `Q-GATHERING-001..003`; thay đổi Profile không phụ thuộc các câu hỏi này.

## 2026-07-17 — Profile projection và Gathering MVP policy

### Profile canonical query

- Resolve `Q-PROFILE-001` theo phương án A: giữ `/hoso` public và `/nhanvat` ephemeral management, cùng đọc qua canonical `PlayerReadService` query.
- Thêm `getPublicProfileView()` trả immutable allowlist DTO; không expose `RuntimePlayer`, legacy `Player`, repository progress, sect, unlock hoặc activity summary.
- Thêm `getManagementProfileView()` cho màn hình quản lý; giữ `getProfileView()` làm compatibility alias. Hai command Discord đã chuyển sang projection đúng mục đích.
- Approved-policy audit kiểm tra preview vẫn read-only, public DTO không chứa aggregate nội bộ và top-level key khớp chính xác allowlist.

### Gathering decisions và phần độc lập đã áp dụng

- `Q-GATHERING-001` ANSWERED: chọn `GatheringCompletionService` sở hữu transaction và daily counter chỉ tăng trong completion thành công.
- `Q-GATHERING-003` ANSWERED: duration là giây; flow start/claim lazy bằng timestamp, roll/apply reward lúc claim, không scheduler, operation ID riêng cho start/claim.
- Resolve `Q-GATHERING-002`: đặt stamina cost của HERB_GATHERING/MINING về 0; loại stamina khỏi listing, result và legacy progress payload. Validator giữ non-negative field cho schema tương lai.
- Thêm `Q-GATHERING-004` vì số run active đồng thời chưa được chọn. Chưa tạo migration/start/claim hoặc cutover `GatheringCompletionService`; legacy immediate simulation không đại diện cho semantics đích.

### Verification

- Syntax check PASS cho `PlayerReadService`, `/hoso` và `/nhanvat`.
- `audit:approved-policies`, `audit:data-schema-alignment`, `audit:architecture-boundaries`: PASS.
- Gathering simulation PASS cho lookup/realm/reward compatibility và xác nhận response không còn stamina; concurrency/start-claim vẫn pending.

## 2026-07-17 — Gathering lazy start/claim runtime

### Approved policy

- Resolve `Q-GATHERING-004` theo phương án A: mỗi player chỉ có một Gathering active toàn cục trong MVP.
- Hoàn tất `Q-GATHERING-001` và `Q-GATHERING-003`: `GatheringCompletionService` sở hữu transaction; duration theo giây, start/claim lazy, reward roll/apply tại claim và không scheduler.
- Trạng thái `READY` được derive từ `ready_at <= now`; database không cần tick/update để chuyển `IN_PROGRESS -> READY`.

### Database và concurrency

- Migration 011 thêm `activity_runs.ready_at`, partial unique index bảo vệ một active Gathering trên mỗi player và index cho ready lookup.
- Migration preflight fail rõ bằng `GATHERING_ACTIVE_RUN_RECONCILIATION_REQUIRED` nếu dữ liệu cũ có nhiều active Gathering, thay vì âm thầm xóa/chọn run.
- Hai start đồng thời được PostgreSQL unique index phân xử; runtime map constraint violation thành `GATHERING_ACTIVE_RUN_EXISTS`.

### Atomic completion

- `start()` bắt buộc operation ID, validate player/realm/reward reference, snapshot input bất biến và persist `ready_at` trong transaction idempotent.
- `claim()` bắt buộc operation ID riêng, khóa run bằng `FOR UPDATE`, từ chối `GATHERING_NOT_READY`, rồi mới roll reward.
- Daily counter, reward claim, wallet/inventory mutation, resource ledger, activity completion và legacy gathering projection commit/rollback cùng transaction.
- Tách `RewardApplyService.applyInTransaction()` thành typed primitive để orchestration tái sử dụng mutation mà không mở callback gameplay tự do.
- Read-side daily usage chuyển sang `player_period_counters` với period key `Asia/Ho_Chi_Minh`; không còn dựa vào `CURRENT_DATE` legacy.
- API `gather()` immediate bị vô hiệu bằng `GATHERING_START_CLAIM_REQUIRED`; application bootstrap expose `gatheringService.start()` và `claim()`.

### Verification

- Simulator xác nhận run 30 giây, early claim bị từ chối, reward roll đúng một lần tại successful claim và legacy projection nhận cùng transaction client.
- Migration discovery, database foundation, approved policies, data-schema alignment và architecture boundaries đều PASS.
- PostgreSQL integration/concurrency test thật vẫn là exit criterion trước production cutover; không tuyên bố đã kiểm chứng partial unique index chỉ bằng simulator in-memory.

## 2026-07-17 — Phase 6 activity projection foundation và risk review

### Independent persistence hardening

- Migration 012 thêm `activity_run_id` nullable cho `player_exploration_runs`, `player_secret_realm_runs` và `player_gathering_runs`; mỗi bảng có partial unique index để một canonical activity chỉ tạo tối đa một legacy projection.
- `recordExplorationResult`, `recordSecretRealmResult`, `recordGatheringResult` và `consumeItemByTemplate` nhận transaction client được inject, nhưng vẫn giữ fallback transaction/pool cho compatibility.
- Gathering atomic completion truyền run ID vào legacy projection; simulator xác nhận progress trả `activityRunId` đúng và dùng cùng transaction client.
- Database audit gọi cả ba projection qua fake transaction client và kiểm tra đúng vị trí activity identity trong SQL params.

### Phase 6 risk analysis

- Exploration hiện chạy encounter/battle trước khi reserve activity; crash/retry có thể tạo RNG/battle mới và defeat/timeout không có canonical run.
- Secret Realm trừ vé ở transaction riêng trước battle; crash có thể mất vé không có run để recovery. Mỗi wave hiện tái tạo entity từ RuntimePlayer nên HP/effect/cooldown reset hoàn toàn.
- Spec hiện chỉ mô tả pipeline, không chốt các semantics trên. Thêm `Q-ACTIVITY-001`, `Q-SECRET-001`, `Q-SECRET-002`; không tự refactor battle lifecycle, ticket economy hoặc wave attrition.

### Verification

- `audit:database-foundation`, `audit:approved-policies`, `audit:architecture-boundaries`: PASS.
- `simulate:gathering`: PASS với canonical activity projection ID.
- Migration 012 chưa được chạy trên PostgreSQL thật; migration/concurrency integration vẫn là exit criterion.

## 2026-07-17 — Exploration và Secret Realm canonical activity lifecycle

### Approved decisions

- Resolve `Q-ACTIVITY-001` theo reserve-before-battle deterministic activity; DB transaction không được giữ trong lúc Battle Engine chạy.
- Resolve `Q-SECRET-001`: reserve Secret Realm và trừ vé atomically; thất bại vẫn mất vé; completion là transaction riêng theo run identity.
- Resolve `Q-SECRET-002`: chỉ carry HP giữa wave, không hồi tự động; mọi transient battle state reset.

### Snapshot và deterministic retry

- Thêm `BattleEntitySnapshot` serializer; restore đi qua `BattleEntityFactory.createFromSnapshot()` để giữ factory gate.
- Exploration snapshot Player/Monster materialized Battle Stat, effects/skills/metadata, Monster plan, battle ID, max round, battle seed và reward seed.
- Secret Realm snapshot Player, toàn bộ wave/Monster entity, ticket identity, battle/reward seed. Mỗi wave dùng seed dẫn xuất ổn định và Battle Engine riêng.
- Production seed được cấp qua injectable `SecureSeedProvider`; gameplay không gọi crypto trực tiếp. Simulator inject chuỗi seed cố định để replay ổn định.
- Battle và reward dùng seeded provider từ immutable run input. Retry không đọc lại equipment/stat Player hiện tại và không đổi reward sau transaction rollback.

### Atomic reserve/completion

- Exploration operation reserve run trước battle; completion khóa run, ghi progress cho VICTORY/DEFEAT/TIMEOUT, áp reward chỉ khi victory và complete result snapshot trong cùng transaction.
- Secret Realm reserve run rồi consume ticket/ghi item debit ledger trong cùng transaction. Completion ghi mọi outcome/progress; reward chỉ khi CLEARED.
- Completion dùng operation ID dẫn xuất `<startOperationId>:complete` và permanent business key theo run ID; reward claim không tự complete run trước progress projection.
- Legacy unsafe Exploration/Secret settlement paths đã loại bỏ; command Discord hiện hữu đã truyền `interaction.id` nên giữ UX một request.

### Wave state

- Wave sau restore base Player snapshot, carry `currentHP`, reset shield về 0 và tạo Battle Engine/context mới. Static equipment/passive definitions được restore; transient effects/modifiers/cooldowns/once-per-battle state từ wave trước không carry.
- Secret Realm simulator xác nhận HP carry giảm qua wave và failed run vẫn ghi canonical activity progress; ticket/progress nhận đúng injected transaction client.

### Verification

- Exploration và Secret Realm simulators: PASS; victory reward/progress và failed no-reward/progress paths đều hoạt động với activity run ID.
- `audit:database-foundation`, `audit:approved-policies`, `audit:data-schema-alignment`, `audit:architecture-boundaries`: PASS.
- PostgreSQL integration/concurrency thật vẫn pending; đặc biệt cần kiểm chứng ticket rollback, duplicate completion và crash recovery giữa hai transaction.

## 2026-07-17 — Phase 6 Sect foundation và concurrency hardening

### Phân tích và quyết định kỹ thuật độc lập

- Audit Sect xác nhận 10 template và 18 exchange rule đã được normalize, nhưng trước đây hai collection chưa nằm trong required GameData contract và chưa có validator riêng.
- Thêm validation cho Sect name/Element/effect ID structure và cho exchange category/grade/Realm/currency/positive safe-integer cost. Chưa validate `sect.effects` sang Core Effect vì các ID khi đó chưa có định nghĩa; phần này bị chặn đúng phạm vi bởi `Q-SECT-003`. Lần kiểm đếm triển khai sau xác nhận có 15 ID.
- Gia nhập Sect chuyển sang idempotent operation `SECT_JOIN`, bắt buộc operation ID. Membership được đọc và ghi trong cùng transaction; repository conditional-update chỉ cho phép từ `NULL` hoặc cùng Sect, ngăn request đồng thời của hai Sect ghi đè nhau.
- Exchange bắt buộc operation ID và chuyển việc đọc runtime Player vào transaction `SECT_EXCHANGE`, tránh quyết định bằng membership/wallet snapshot cũ trước atomic debit/reward.
- Application bootstrap và Discord client expose cùng canonical `SectService`; business logic không phụ thuộc Discord.js.

### Rủi ro game design được tách cục bộ

- Thêm `Q-SECT-001` cho policy rời/đổi môn phái; chưa tạo API hoặc tự chọn cooldown/chi phí.
- Thêm `Q-SECT-002` vì spec yêu cầu Random nhưng exchange data chưa có reward pool; resolver hiện tại chỉ là compatibility behavior và chưa được coi là contract gameplay cuối.
- Thêm `Q-SECT-003` cho 14 passive effect chưa có Effect/Modifier/Trigger definition; không tự suy diễn công thức hoặc áp dụng vào Battle Entity.

### Verification

- Syntax check cho `GameDataValidator`, `SectService`, Sect simulator và bootstrap: PASS.
- Sect simulator xác nhận join/exchange mutation cùng Player decision read đều nhận đúng idempotent transaction client: PASS.
- Data-schema alignment audit xác nhận 10 Sect, 18 exchange rule và negative structural/cross-reference fixtures: PASS.
- PostgreSQL integration/concurrency thật vẫn là exit criterion trước production cutover, đặc biệt cho hai join khác Sect và retry exchange cùng/khác operation ID.

## 2026-07-17 — Sect architecture choices và refinement gate

### Câu trả lời đã tiếp nhận

- `Q-SECT-001` chọn B: rời/đổi môn phái theo policy data-driven.
- `Q-SECT-002` chọn A: explicit weighted reward pool với deterministic/idempotent roll.
- `Q-SECT-003` chọn A: passive môn phái dùng Core Effect effect-driven.
- Ba câu hỏi được chuyển sang `ANSWERED`, chưa đánh dấu `RESOLVED` vì spec/data vẫn thiếu thông số cần thiết; không tự áp dụng proposal thành gameplay.

### Rà soát nguồn chuẩn

- `SECT_SPEC` chỉ chốt pipeline Filter Pool → Grade → Random và Battle đọc Passive; không định nghĩa leave/change policy, weight/duplicate hoặc behavior/balance effect.
- `sect_exchange_template.json` có 18 rule category/grade/realm/cost nhưng không có reward pool hay entry weight.
- `sect_template.json` chỉ liệt kê effect ID; không có scope, trigger, target, action/modifier, amount, duration hoặc stack. Lần kiểm đếm triển khai sau xác nhận có 15 ID.

### Refinement questions

- Thêm `Q-SECT-004` với các gói thông số cụ thể cho leave/change/cooldown/Sect Point.
- Thêm `Q-SECT-005` để chốt pool content, equal/curated weight, duplicate và thời điểm persist kết quả roll.
- Thêm `Q-SECT-006` với bảng baseline cho toàn bộ 15 effect, bao gồm scope Battle Stat/Battle/Cultivation/Breakthrough; tại thời điểm refinement chưa ghi các giá trị này vào GameData.
- Roadmap phản ánh đúng trạng thái: kiến trúc đã được chọn nhưng ba cutover phụ thuộc vẫn bị khóa cục bộ.

## 2026-07-17 — Sect MVP policy, weighted exchange và effect runtime

### Membership policy

- Resolve `Q-SECT-001/004`: policy `sect-membership-v1` cho phép leave miễn phí, giữ Sect Point và khóa rejoin 604800 giây.
- Migration 013 thêm `sect_rejoin_available_at`, `sect_policy_revision` và partial lookup index. Runtime Player/read repository mang hai field canonical.
- `leaveSect()` bắt buộc operation ID, đọc/ghi membership trong transaction và tính timestamp từ injected time provider. `joinSect()` kiểm tra cooldown ở service lẫn conditional SQL update.

### Explicit weighted exchange

- Resolve `Q-SECT-002/005`: thêm 180 pool tường minh cho 10 Sect × 18 rule, tổng 448 entry, mọi weight bằng 1 và duplicate policy `ALLOW`.
- Generator chỉ là authoring tool; runtime không lọc registry ngầm. Pool rỗng vì content hiện chưa tồn tại được đánh dấu `SECT_REWARD_POOL_EMPTY` thay vì chọn fallback.
- Exchange dùng server seed/injected seed để weighted roll; `rollSeed`, `poolId`, `entryWeight` được persist trong rewards JSON của exchange log và response idempotent.
- Validator bảo vệ toàn bộ Sect/rule/item reference, positive safe-integer weight, duplicate entry/pool key và ma trận 180 pool đầy đủ.

### Sect Effect runtime

- Resolve `Q-SECT-003/006`. Đính chính số lượng từ 14 thành 15 effect ID theo `sect_template.json`; toàn bộ 15 ID có Core Effect definition và scope `ENTITY`, `CULTIVATION` hoặc `BREAKTHROUGH`.
- Battle Entity materialize static CRIT/PEN/REF/ATK/DEF modifier trước battle snapshot. Cultivation đọc +10% multiplier; Breakthrough clamp chance sau delta +10/-10 percentage points.
- Behavioral hooks đọc tham số từ effect data: Burn +1 lượt, Wood heal 3% Max HP cho living allies, Earth phản 30% shield vừa hấp thụ khi shield vỡ tối đa một lần/lượt, Water cleanse một debuff lần đầu TURN_START, Ice slow SPD -10% trong 2 lượt sau Control.
- Sửa Effect Engine tick target resolution để action `ALLY_ALL` thực sự chọn toàn bộ đồng minh thay vì luôn ép owner; thêm lifecycle hết hạn cho timed modifier.

### Verification

- Data audit xác nhận 10 Sect, 18 rule, 180 pool, 448 entry và 15 strict Core Effect reference.
- Executable audit PASS cho static stat materialization và năm behavioral effect; progression resolver PASS cho cultivation +10% và breakthrough ±10pp.
- Sect simulator PASS cho operation ID, injected transaction client, deterministic reward seed, leave timestamp và early-rejoin rejection.
- Migration 013 và concurrency SQL vẫn cần chạy trên PostgreSQL thật trước production cutover.

## 2026-07-17 — Phase 7 optional cache adapter foundation

### Technical decisions applied

- Áp dụng ADR2-018 và `CACHE_SPEC`: PostgreSQL vẫn là source of truth; cache chỉ là tối ưu và không quyết định correctness.
- Thêm năm namespace chuẩn `GAME_DATA`, `PLAYER`, `INVENTORY`, `GUILD`, `SESSION` và key contract `<NAMESPACE>:<VERSION>:<IDENTITY>`.
- `CacheService` triển khai cache-aside: hit trả cache; miss hoặc adapter error gọi source-of-truth loader; set là best-effort. Callback `onAdapterError` giữ lỗi adapter observable mà không làm request correctness thất bại.
- `NoOpCacheAdapter` là adapter mặc định trong application bootstrap. Chưa nối cache vào gameplay/repository read path và chưa thêm Redis dependency.
- Bổ sung implementation supplement mô tả invalidation bằng version/revision, TTL phụ trợ và Redis cutover gate.

### Verification

- Cache contract audit PASS cho no-op luôn đọc source truth, adapter failure fallback, cache hit, namespace invalidation và versioned key validation.
- Architecture audit kiểm tra cache chỉ nằm trong Platform boundary và project không có `redis`, `ioredis` hoặc `@redis/client` dependency.

## 2026-07-17 — Transactional outbox enqueue foundation

### Independent implementation

- Thêm `OutboxRepository.enqueue()` yêu cầu transaction client được inject; repository không tự mở transaction và không cho enqueue ngoài domain unit of work.
- Event envelope yêu cầu `aggregateType`, `aggregateId`, `eventType` và object payload; insert trả canonical outbox ID/timestamp.
- Chưa nối producer tùy ý vào gameplay vì event emission point và consumer behavior phải thuộc use case transaction cụ thể.

### Risk gate

- Thêm `Q-OUTBOX-001` vì `SKIP LOCKED` một mình không định nghĩa crash recovery: cần chốt short lease hay long transaction, at-least-once, backoff, max attempt và dead-letter.
- Worker claim/ack/fail và subscriber runtime bị khóa cục bộ; cache foundation và transactional enqueue không bị ảnh hưởng.

## 2026-07-17 — At-least-once Outbox Worker

### Approved contract

- Resolve `Q-OUTBOX-001` theo phương án A: short claim transaction, lease 60 giây, at-least-once delivery, exponential retry 5 giây đến 900 giây, dead-letter sau attempt thứ 10.
- Subscriber bắt buộc idempotent theo canonical outbox event ID; external delivery không được mô tả là exactly-once.

### Persistence và worker runtime

- Migration 014 thêm `available_at`, `locked_at`, `locked_by`, `last_error`, `dead_lettered_at`; backfill availability từ `occurred_at` và thay pending index bằng dispatchable/lease/dead-letter indexes.
- `claimBatch()` dùng CTE `FOR UPDATE SKIP LOCKED`, atomically ghi owner/timestamp và tăng attempt count.
- `acknowledge()`, `fail()` và `renewLease()` kiểm tra owner lease; lease mất không được mutate event của worker khác.
- `OutboxWorker.processBatch()` commit claim trước khi chạy handler. Mỗi ack/fail/renew là transaction ngắn riêng; handler dài có explicit `renewLease()` callback.
- Handler success nhưng lease đã mất trả `LEASE_LOST`, không bị ghi nhầm thành handler failure. Event envelope/payload được deep-freeze.
- Scheduler chịu trách nhiệm trigger batch; chưa tự đặt poll interval hoặc tự động dead-letter replay.

### Verification

- Worker audit PASS cho transaction boundary ngoài handler, defaults 60/5/900/10, explicit renew và bốn outcome `PROCESSED`, `RETRY_SCHEDULED`, `DEAD_LETTERED`, `LEASE_LOST`.
- Database audit PASS cho `SKIP LOCKED`, bound lease/batch parameters, 5-second first retry, tenth-attempt dead-letter, ack owner check và immutable row mapping.
- PostgreSQL multi-process integration/soak test thật vẫn là exit criterion trước production deployment.

## 2026-07-17 — Database observability foundation và pool-budget gate

### Current-state audit

- PostgreSQL pool hiện chỉ nhận `DATABASE_URL`; max connection, idle/connect timeout và statement/query timeout đều implicit theo `pg`.
- Chưa có số worker, DB connection capacity hoặc latency SLO để tự đặt production pool max an toàn.

### Independent implementation

- Thêm `DatabaseQueryMetrics` đo duration/failure/slow query theo stable operation name; snapshot aggregate count, failure, slow, total, max và average.
- Collector không nhận/lưu SQL text hoặc params, tránh secret/PII và high-cardinality telemetry. Slow threshold bắt buộc inject thay vì hard-code trước approval.
- Audit dùng fake monotonic clock, kiểm tra cả success/failure/slow path và immutable snapshot.

### Risk gate

- Thêm `Q-PERF-001` để chốt connection budget, production fail-fast policy và timeout/slow-query baseline.
- Chưa cutover `postgres.js` hoặc instrument repository query paths cho đến khi policy được trả lời.

## 2026-07-17 — PostgreSQL pool budget và query instrumentation

### Approved policy

- Resolve `Q-PERF-001` theo phương án B. Development mặc định pool max 5; production thiếu `DB_POOL_MAX` fail-fast.
- Baseline idle/connect/statement/query timeout là 30000/10000/15000/20000ms; slow operation threshold 250ms. Mọi giá trị cho phép env override nhưng phải là positive safe integer.

### Runtime cutover

- `postgres.js` tạo raw `pg.Pool` từ validated config rồi bọc bằng `ObservedPostgresPool`.
- Wrapper đo cả pool connect và pool/client query. Query config có thể truyền stable `operationName`; metadata được strip trước khi gọi `pg`.
- Legacy string query được phân loại thành stable operation/table label như `postgres.select.players`; không lưu SQL text hoặc params trong metrics.
- Slow warning chỉ chứa operation name, duration và failure flag. Pool error chỉ log message; sanitized bootstrap config không chứa `DATABASE_URL`.
- Thêm `.env.example` và implementation policy cho connection-budget formula, defaults và correctness boundaries.

### Verification

- Pool-policy audit PASS cho development defaults, production fail-fast, env overrides, invalid-value rejection và sanitized config.
- Observed pool audit PASS cho raw pool/direct client, explicit operation name, legacy stable classification và client release.
- Query metrics audit tiếp tục PASS cho failure/slow aggregation và không có SQL/params.

## 2026-07-17 — Database readiness foundation và Phase 7 decision gates

### Readiness implementation

- Thêm `ObservedPostgresPool.getStatus()` để đọc snapshot `max`, `total`, `idle`, `waiting` từ pool mà không expose raw pool hoặc connection details.
- Thêm `DatabaseHealthService`: chạy `SELECT 1 AS ok` với stable operation name `database.health.check`, đo duration và trả immutable `HEALTHY`/`UNHEALTHY` response.
- Exception database được sanitize thành `DATABASE_UNAVAILABLE`; service không trả SQL, params, credential hoặc error message nội bộ.
- Health chỉ là platform readiness primitive. Chưa tự nối HTTP endpoint, Discord command, dashboard hay alert vì deployment surface và SLO chưa được duyệt.
- Thêm implementation supplement `016_DATABASE_HEALTH.md` và script `audit:database-health`.

### Risk gates mới

- `Q-PERF-002` tách quyết định availability/latency/error/outbox-lag SLO, cửa sổ đo và alert threshold. Slow-query 250ms vẫn chỉ là telemetry threshold, chưa được coi là SLO.
- `Q-PAGINATION-001` tách lựa chọn keyset cursor so với offset, page limit và stable sort/tie-breaker.
- `Q-LEADERBOARD-001` tách phạm vi leaderboard, rank formula, public profile allowlist, top-N và refresh cadence.
- Các phần phụ thuộc giữ BLOCKED cục bộ; query metrics, health readiness, pool policy và gameplay runtime độc lập tiếp tục hoạt động.

### Verification

- Syntax check `DatabaseHealthService`: PASS.
- Database health audit PASS cho healthy/unavailable paths, stable operation name, sanitized/frozen output, pool saturation và query metrics snapshot.
- PostgreSQL pool-policy audit tiếp tục PASS sau khi bổ sung pool status contract.

## 2026-07-17 — SLO, keyset pagination và Cultivation Leaderboard MVP

### Approved choices

- Resolve `Q-PERF-002`, `Q-PAGINATION-001` và `Q-LEADERBOARD-001` theo phương án A.
- SLO MVP dùng revision `operational-slo-mvp-v1`, cửa sổ 30 ngày, loại trừ Discord transport và review lại sau 14 ngày production telemetry.
- Keyset pagination mặc định 20/tối đa 100; leaderboard global không season giữ top 100 và refresh mỗi 5 phút.

### Operational SLO runtime contract

- Thêm immutable policy cho availability 99.5%, interactive p95/p99 2s/5s, mutation p95 3s, internal error rate dưới 1% và outbox lag p95 30s.
- `evaluateOperationalSlo()` đánh giá sáu metric, phân biệt telemetry incomplete với violation và chỉ cho phép alert sau 5 phút vi phạm liên tục.
- Slow DB operation 250ms vẫn là profiling signal, không bị diễn giải thành SLO. Exporter/dashboard/paging integration chưa bị hard-code vào core runtime.

### Shared keyset pagination

- Thêm Base64URL opaque cursor version 1 với direction `NEXT/PREVIOUS`, sort value, ID tie-breaker và optional snapshot context.
- Page limit chỉ nhận number positive safe integer, default 20, max 100; invalid payload/version có stable application error.
- Cursor không chứa SQL hoặc authorization data. Snapshot-aware endpoint có thể từ chối cursor stale thay vì trả dữ liệu xuyên revision.

### Cultivation leaderboard read model

- Migration 015 tạo `cultivation_leaderboard_entries`, singleton refresh state và source/rank indexes.
- Refresh SQL nhận Realm ID/order/name bằng bound parameters từ GameData; không giả định Realm ID bằng order và không hard-code mapping cảnh giới.
- Thứ hạng canonical: Realm order DESC, stage DESC, cultivation DESC, player ID ASC. Legacy cultivation NULL được normalize thành 0 trong projection.
- Row state được lock và toàn bộ snapshot được thay trong một transaction; multi-worker trigger không refresh chồng nhau. Service skip khi chưa đủ 300.000ms.
- Read path dùng `(rank, player_id)` keyset, không OFFSET. Cursor mang `refreshedAt` và bị từ chối khi snapshot đã đổi.
- Public allowlist chỉ trả `rank`, `displayName`, `realmName`, `stage`; player ID/cultivation chỉ phục vụ internal rank/cursor.
- Business service được expose qua application bootstrap nhưng chưa gắn Discord presentation hoặc tự tạo scheduler loop.

### Verification

- Operational SLO audit PASS cho healthy, continuous violation, incomplete telemetry và immutable policy.
- Keyset pagination audit PASS cho opaque/versioned cursor, strict default/max limit và invalid cursor rejection.
- Cultivation leaderboard audit PASS cho data-driven Realm order, deterministic ranking, top 100, refresh 5 phút, no-OFFSET query, stale cursor và public allowlist.
- PostgreSQL thật vẫn cần migration/query-plan/concurrent-refresh integration test trước production cutover.

## 2026-07-18 — Interval Scheduler và Leaderboard refresh activation

### Scheduler platform

- Thêm `IntervalScheduler` với immutable task identity, validated interval, `runOnStart`, explicit `start/stop` và status counters.
- Scheduler chỉ trigger callback; không chứa gameplay rule, SQL hoặc due calculation.
- Chống overlap trong cùng process bằng running guard. Multi-process correctness tiếp tục thuộc PostgreSQL row lock/`SKIP LOCKED`, không dùng memory flag làm distributed lock.
- Failure được cô lập và chỉ báo `taskId/errorCode`; không chuyển raw message/stack sang scheduler telemetry.
- Timer được `unref` khi hỗ trợ và được clear khi Discord client destroy.

### Leaderboard activation

- Application bootstrap đăng ký `cultivation-leaderboard-refresh` on-start và mỗi 300.000ms sau khi migrations hoàn tất.
- Callback chỉ gọi `CultivationLeaderboardService.refreshIfDue()`; service giữ transaction/state-row lock và tự skip nếu snapshot chưa đến hạn.
- Không đăng ký Outbox Worker bằng cadence ngầm và chưa thêm Discord command leaderboard.

### Risk gates

- Thêm `Q-OUTBOX-002` cho poll cadence, batch drain và worker-process topology.
- Thêm `Q-OBS-001` cho backend/aggregation SLO telemetry xuyên process và 30 ngày.
- Thêm `Q-LEADERBOARD-002` cho Discord command, button pagination và stale-cursor UX.

### Verification

- Scheduler audit PASS cho run-on-start, interval 5 phút, overlap protection, sanitized failure, counters và clean stop.
- Cultivation leaderboard và architecture-boundary audit tiếp tục PASS sau runtime activation.

## 2026-07-18 — Dedicated Outbox polling, OpenTelemetry contract và Discord Leaderboard

### Approved choices

- Resolve `Q-OUTBOX-002`, `Q-OBS-001` và `Q-LEADERBOARD-002` theo phương án A.
- Outbox chạy process riêng với fixed 1-second polling, batch 100 và một batch/tick.
- Metrics dùng OpenTelemetry Meter contract, không chọn exporter vendor trong core.
- Discord leaderboard dùng `/bangxephang`, 20 dòng/trang, buttons và session 10 phút.

### Outbox worker process

- Thêm `OutboxPollingRuntime` đăng ký đúng một scheduler task run-on-start, interval 1000ms, `keepProcessAlive` và overlap guard.
- Thêm entrypoint `src/workers/outbox.js`/`npm run worker:outbox`, chạy migrations dưới advisory lock, tạo worker ID từ env hoặc `hostname:pid`, xử lý `SIGINT/SIGTERM` và đóng pool sạch.
- Discord gateway không import/start polling runtime. Scheduler hỗ trợ riêng `keepProcessAlive` để gateway timer vẫn unref còn worker timer giữ process.
- Handler registry hiện rỗng vì chưa có subscriber domain cụ thể. Unknown event tiếp tục theo retry/dead-letter contract; không tự tạo side-effect handler giả.

### OpenTelemetry instrumentation boundary

- Thêm No-Op adapter mặc định, application telemetry singleton và `configureMetricsAdapter()` để deployment inject OpenTelemetry-compatible Meter adapter.
- Adapter tạo một lần bảy Counter/Histogram cho application operation count/failure/duration, database duration/failure và outbox lag/outcome.
- Attributes bị giới hạn ở stable operation/type/event/outcome; không nhận player/event ID, SQL/params hoặc raw error.
- Database query collector, Outbox Worker và Cultivation Leaderboard đã nối telemetry best-effort. Adapter failure bị sanitize và không thay correctness.
- MeterProvider, exporter, histogram views, retention 30 ngày, dashboard và alert routing không được hard-code trong core.

### Discord Cultivation Leaderboard

- Thêm `/bangxephang` hiển thị public projection top 20 mỗi trang, buttons Trước/Sau và cursor do business service cấp.
- Adapter không import repository/SQL hoặc tính rank. Snapshot stale tự reload trang đầu với notice.
- `ComponentSession` chuyển sang absolute TTL: mỗi lần collect chỉ dùng thời gian còn lại, không reset thêm 10 phút. Owner-only filter giữ nguyên; timeout loại bỏ buttons best-effort.

### Verification

- Outbox polling audit PASS cho process separation policy, interval 1 giây, batch 100, một batch/tick và keep-alive lifecycle.
- OpenTelemetry audit PASS cho Meter contract, bảy instrument, histogram latency, low-cardinality attributes và adapter-failure fallback.
- Component/leaderboard command audit PASS cho TTL 600.000ms, owner-only, pagination buttons, stale reload và timeout cleanup.
- Existing Outbox Worker, database observability, Cultivation Leaderboard và architecture audits tiếp tục PASS.
- Chưa chạy migration/concurrency/query plan trên PostgreSQL thật, chưa đăng ký slash command trên Discord thật và chưa cấu hình production MeterProvider/exporter.

## 2026-07-18 — Isolated Phase 7 PostgreSQL verification harness

### Implementation

- Thêm opt-in script `verify:phase7:postgres`; không dùng/import application `DATABASE_URL` pool.
- Loại dependency pool ngầm khỏi `runMigrations` và `CultivationLeaderboardRepository`; application/worker phải inject pool rõ ràng, nên verification harness không khởi tạo primary pool qua module side effect.
- Bắt buộc `PHASE7_TEST_DATABASE_URL`, so connection identity protocol/user/host/port/database để từ chối primary dù URL khác password/query string, và không log connection string/credential/raw DB message.
- Mỗi run tạo schema riêng `phase7_verify_<pid>_<timestamp>`, set `search_path` cho mọi connection, chạy forward migrations rồi cleanup đúng schema prefix trong `finally`.
- Leaderboard integration scenario seed năm Player, chạy hai refresh đồng thời, kiểm tra row-lock serialization, canonical ordering, hai keyset page, five-minute refresh, stale cursor và rank-101 constraint.
- Outbox integration scenario seed 200 event rồi cho hai worker claim đồng thời batch 100; yêu cầu đủ 200 ID duy nhất.
- Capture PostgreSQL query plan cho keyset read nhưng không hard-code latency/plan-node threshold vì môi trường test nhỏ không đại diện production workload.

### Verification status

- Syntax và no-URL safety path có thể audit cục bộ.
- PostgreSQL integration result vẫn là `NOT_RUN` cho đến khi operator cung cấp test URL và chạy script; không tự kết nối database hiện tại.
- Safety-path verification PASS: thiếu test URL trả `SKIP`; URL khác password/query string nhưng cùng protocol/user/host/port/database bị từ chối trước connection attempt.

## 2026-07-18 — Battle Factory deep immutability và Action identity gate

### Current-state finding

- Skill Action spec yêu cầu ID/order, nhưng Attack Action thiếu ID và Defense Action thiếu cả ID/order.
- Compatibility factory đang gán order 999 cho mọi Action thiếu order; Defense Skill chỉ giữ Shield trước Effect nhờ input order/stable sort.
- Nested Action arguments như Chain jump multipliers trước đây chỉ freeze nông; runtime Skill có thể bị code ngoài sửa giữa battle. Basic Attack cũng trả mutable object.

### Independent hardening

- Thêm shared `deepCloneFreeze` và áp dụng tại `BattleActionFactory`, `BattleSkillFactory`, `SkillManager.createBasicAttack()`.
- Runtime object không còn chia sẻ nested arguments, condition hoặc tags với template input.
- Action ID được preserve nếu content cung cấp; không tự sinh ID hoặc thay đổi compatibility order khi chưa có phê duyệt.
- `createMany()` trả immutable Action list; target/type/formula/effect/chance semantics giữ nguyên.

### Risk gate và verification

- Thêm `Q-COMBAT-014` để chọn explicit content migration, generated identity hay giữ compatibility.
- Factory isolation audit kiểm tra source mutation không ảnh hưởng runtime, nested object/array frozen, explicit ID được giữ, target normalization không đổi và Basic Attack immutable.
- Database foundation migration-discovery audit được cập nhật để bắt buộc nhận diện migrations 013, 014 và 015 thay vì dừng ở migration 012.

## 2026-07-18 — Resolve Q-COMBAT-014: canonical Skill Action identity/order

### Decision applied

- Chủ dự án chọn phương án A: content author sở hữu explicit Action `id` và positive integer `order`; runtime không tự phát minh identity.
- Đây là hoàn thiện/hardening contract chiến đấu cốt lõi của Phase 4 trong lúc Phase 7 gần hoàn tất, chưa phải mở rộng gameplay. Mục tiêu là tạo nền ổn định cho content/effect mới và deterministic audit/replay.

### Data migration và validation

- Migrate 70 Skill/140 Action: thêm 140 ID deterministic theo `${skillId}_ACTION_XX`; Attack giữ order hiện hữu, 84 Defense Action nhận order theo array hiện hữu (Shield 1, Effect 2).
- Thêm `data:migrate:skill-actions`; tool kiểm tra Skill/action structure, ID/order hợp lệ và duplicate trong từng Skill. Chạy lại sau migration trả `changedCount: 0`.
- `GameDataValidator` bắt buộc non-empty action list, ID khác rỗng, order positive safe integer, không trùng ID/order trong Skill; đồng thời kiểm tra action type/formula/effect/modifier/condition reference.

### Runtime identity propagation

- `BattleActionFactory` fail-fast với `BATTLE_ACTION_ID_REQUIRED` hoặc `BATTLE_ACTION_ORDER_INVALID:<id>`; loại bỏ compatibility order `999`.
- Normalizer giữ `id/order` ở canonical top-level; không còn nhét order vào executor arguments. Basic Attack có `BASIC_ATTACK_ACTION_01`.
- `BattleActionPipeline` đưa `actionId` vào lifecycle/semantic trigger identity; aggregate `ActionResult` và immutable `ExecutionContext` cũng expose `actionId`.

### Verification

- Thêm `audit:skill-action-identity`: PASS cho 70 Skill/140 Action, raw uniqueness/order, validator rejection, factory preservation/deep-freeze và event identity.
- `audit:battle-factory-isolation`, `audit:data-schema-alignment`, `audit:architecture-boundaries` và `simulate:battle` tiếp tục PASS.
- `Q-COMBAT-014` chuyển `RESOLVED`; không còn phần combat identity bị khóa bởi câu hỏi này.

## 2026-07-18 — Mở câu hỏi Realm vô hạn/Luân hồi và content pack Tu Tiên

- Kiểm tra current contract: `realms.json` có 15 Realm, mỗi Realm `maxStage: 10`; progression lấy `maxStage` từ data và `BreakthroughService` trả `MAX_REALM` khi không còn Realm tiếp theo.
- Không tự bật progression vô hạn hoặc reset Luân hồi vì quyết định này ảnh hưởng persistence, breakthrough, leaderboard, map/monster/reward scaling và cân bằng lâu dài.
- Mở `Q-PROGRESSION-001` với ba hướng: Realm hữu hạn + Luân hồi, Realm procedural vô hạn, hoặc chu kỳ Realm cố định + meta-progression. Chưa thay đổi schema/data/runtime.
- Mở `Q-CONTENT-001` để chốt phạm vi gói Skill/Effect/Monster/Map đầu tiên, Realm mục tiêu và power budget. Có thể tiếp tục các phân tích content độc lập, nhưng chưa ghi thêm gameplay JSON khi chưa có pack contract.

## 2026-07-18 — Chốt hướng Luân hồi và vertical slice content

- Chủ dự án chọn `Q-PROGRESSION-001` phương án A: Realm vẫn hữu hạn, sau Realm cuối mở Luân hồi; không dùng procedural Realm vô hạn.
- Chủ dự án chọn `Q-CONTENT-001` phương án C: gói content tiếp theo là một vertical slice đầy đủ Map → Spawn → Monster → Skill/Effect → Reward → command flow.
- Hai lựa chọn mới chốt hướng nhưng chưa chốt retention/reset/permanent bonus/leaderboard của Luân hồi hoặc Realm/theme/reward budget của vertical slice.
- Tách `Q-PROGRESSION-002` và `Q-CONTENT-002` với baseline cụ thể; giữ phần runtime/data phụ thuộc ở trạng thái blocked, không tự áp dụng.

## 2026-07-19 — Thiên Môn content foundation và Luân hồi follow-up

- `Q-PROGRESSION-002` chọn Luân hồi không giới hạn, reset Realm thấp nhất, tăng base stat trước Effect/Equipment, chỉ giữ Linh Thạch và xóa inventory. Chưa có formula base-stat hoặc retention cho learned/sect/spirit-root nên mở `Q-PROGRESSION-003/004`; chưa tự triển khai schema/runtime.
- `Q-CONTENT-002` chọn hoàn thiện `THIEN_MON` Kết Đan. Thêm bốn Monster Template: Vân Dực Điêu, Kim Giáp Viên, Hộ Sơn Lôi Thú và Thiên Môn Kiếm Khôi.
- Thêm `POOL_THIEN_MON` với spawn weight 40/40/15/5 cho Normal/Normal/Elite/Boss. Validator mới chặn spawn variant không nằm trong `allowedVariants` của Monster Template.
- Thêm reward table `MONSTER_KET_DAN` theo baseline 40–80 Linh Thạch, equipment 10%, Đột Phá Đan 5%, Vé Bí Cảnh 2%; alias `BASIC_MONSTER_DROP` có mapping Realm order 3.
- `THIEN_MON` đã tham chiếu pool nhưng vẫn `CONTENT_PENDING`. Monster runtime hiện chọn skill theo elemental pool thay vì skill riêng; mở `Q-CONTENT-003` trước khi activation.
- Thêm `audit:thien-mon-content`; PASS cho 4 monster, tổng spawn weight 100, variant propagation, reward alias và pending activation gate. Full data-schema audit tiếp tục PASS.

## 2026-07-19 — Basic Attack combat-log display hardening

- Giữ tên gameplay `Đánh Thường` đã được bổ sung trên canonical Basic Attack, cùng `displayName: Basic Attack` cho compatibility.
- `BattleEngine` resolve đúng một `skillName` theo thứ tự `name -> displayName -> id`, dùng cùng giá trị cho cả log message và `details.skillName`; Discord animator không còn có thể nhận `undefined` ở fallback Basic Attack.
- Mở rộng Battle Factory isolation audit để khóa contract ID/name/displayName và deep immutability của Basic Attack.

## 2026-07-19 — Kích hoạt Thiên Môn và đặt nền Luân hồi

### Thiên Môn vertical slice

- Áp dụng `Q-CONTENT-003` phương án B: thêm bốn Skill riêng cho Vân Dực Điêu, Kim Giáp Viên, Hộ Sơn Lôi Thú và Thiên Môn Kiếm Khôi; mọi Action có ID/order explicit và chỉ dùng executor hiện hữu.
- Monster Template có `combat.skillIds`; normalizer giữ danh sách, validator kiểm tra duplicate/reference và Generator ưu tiên assignment explicit trước elemental pool.
- Chuyển `THIEN_MON` sang ACTIVE cho Exploration. `/thamhiem` và `/dungoan` nhận option `map`, truyền `mapId` vào use case và trình bày lỗi map khóa/inactive.
- Cập nhật audit schema cho Realm order 3 và map ACTIVE. `auditThienMonContent`, `auditSkillActionIdentity` và `auditDataSchemaAlignment` PASS với 74 Skill/149 Action.

### Luân hồi foundation

- Áp dụng câu trả lời `Q-PROGRESSION-003`: thêm `REBIRTH_MVP_V1` revision 1 dưới dạng JSON data-driven. Baseline giữ identity/name, linh căn, Linh Thạch, achievement/cosmetic và count; reset currency khác, inventory/equipment, learned skill/công pháp, loadout và tông môn.
- Policy bootstrap lại `CP_FIRE_HOANG` sau reset để thỏa invariant hiện hành của Player/runtime; không giữ công pháp đã học từ đời trước và không cấp starter equipment/item.
- Áp dụng `Q-PROGRESSION-004`: thêm `RebirthStatCalculator` BigInt cho công thức `FLOOR(base × (1 + 0.25 × SQRT(count)))`. Calculator dùng integer square root, không floating point, không mất precision trên `Number.MAX_SAFE_INTEGER` và không compound từ stat đã materialize.
- Thêm migration `016_rebirth_foundation.sql`: `rebirth_count`/base stat dùng PostgreSQL `NUMERIC`, lưu policy revision và `player_rebirth_history`; unique operation ID và `(player, rebirth_number)` là hai hàng rào chống nhận trùng.
- GameData Validator khóa toàn bộ retention/formula/reset contract đã duyệt. Thêm `audit:rebirth-foundation` và cập nhật migration discovery audit.

### Trạng thái cắt chuyển

- Policy/schema/calculator đã sẵn sàng nhưng `BreakthroughService` vẫn trả `MAX_REALM`; transaction Luân hồi, reset/reconciliation, runtime projection, leaderboard ordering và slash command chưa được nối trong bước này.
- Chưa chạy migration 016 trên PostgreSQL thật vì không có test database URL an toàn được cung cấp.
- Khi thiết kế reset transaction, phát hiện activity `IN_PROGRESS`/reward claim có thể vượt qua ranh giới Luân hồi và battle runtime hiện dùng JavaScript `Number`. Mở `Q-PROGRESSION-005/006`; không tự hủy activity, hoàn cost hoặc ép số lớn về Number khi chưa có phê duyệt.
- Chủ dự án chọn `Q-PROGRESSION-005` A (chặn khi còn activity đang dở) và `Q-PROGRESSION-006` A (fixed-point/BigInt toàn battle); hai mục chuyển `ANSWERED` trong lúc triển khai.
- Ghi nhận backlog `Q-SPIRITROOT-001`: cho phép reroll Linh Căn sau Luân hồi và xây tier/effect/pool data-driven. Theo yêu cầu, chưa sửa Spirit Root data/policy/runtime; hạng mục được hoãn đến sau Luân hồi và numeric battle.

## 2026-07-19 — Rebirth transaction và activity race gate

- Thêm `RebirthRepository`/`RebirthService`: yêu cầu operation ID, khóa Player, settle tu vi lazy, kiểm tra viên mãn Realm/Stage cuối, tăng count và tính stat reset từ Realm gốc bằng calculator căn bậc hai.
- Transaction xóa stack/equipment/legacy item, learned skill/công pháp; bootstrap lại `CP_FIRE_HOANG`; reset tông môn và mọi wallet currency ngoài `SPIRIT_STONE`; giữ identity, Linh Căn và Linh Thạch.
- Ghi `player_rebirth_history` với before/after snapshot; currency reset có Resource Ledger; operation idempotency và unique `(player, rebirth_number)` chống nhận trùng.
- Áp dụng `Q-PROGRESSION-005` A bằng activity gate. Exploration, Secret Realm và Gathering start/complete cùng dùng lock ordering `Player → Activity Run`, loại race giữa reserve/claim và Luân hồi.
- Thêm `/luanhoi`, nối service vào Discord-independent application bootstrap và hướng dẫn từ `/dotpha` khi đạt Realm cuối.
- `audit:rebirth-runtime` PASS cho Player lock, activity gate, count `3 → 4`, reset về Realm đầu, giữ Linh Căn/Linh Thạch và stat đời 4 `HP 300 / ATK 60 / DEF 30 / SPD 7`.
- `Q-PROGRESSION-006` chọn fixed-point/BigInt, nhưng scale/rounding/RNG chưa được xác định. Mở `Q-PROGRESSION-007`; không tự thay battle result/replay.

## 2026-07-19 — Fixed-point/BigInt battle cutover

- Áp dụng `Q-PROGRESSION-007` A: scale `10^6`, truncate toward zero ở intermediate, floor output không âm, seeded RNG quantize thành `[0, 999999]`.
- Thêm `BattleFixed`, `BattleExpressionEvaluator` và `BattleStatCalculator`; formula không còn dùng `new Function`/floating-point. Stat, HP, shield, damage/heal và public battle event dùng decimal-string JSON-safe.
- Migrate Battle Entity/Factory, Formula, runtime modifier, Action/Effect relation, chance, Condition/Passive HP%, Target/Turn ordering, metrics, Secret Realm carry HP và Discord HP bar. Counter/round/duration/index vẫn là Number vì không phải resource/stat magnitude.
- `BreakthroughService` materialize stat mọi Stage từ Realm base + `rebirth_count`, không compound stat đời trước.
- Thêm `audit:battle-fixed-point`; PASS với số `900719925474099312345678901234567890`, modifier 10%, expression, damage, HP mutation, turn ordering, RNG `0.824691` và JSON serialization.
- Data schema, Element relation, deterministic replay, Battle factory/action identity, Thiên Môn, architecture và Rebirth runtime audits đều PASS sau cutover.
- Phát hiện hai quyết định còn thiếu: leaderboard giữa các đời (`Q-PROGRESSION-008`) và confirmation cho thao tác phá hủy (`Q-PROGRESSION-009`). `/luanhoi` được giữ disable ở Discord boundary; core service không bị rollback hay thay đổi.

## 2026-07-20 — Mở Luân hồi an toàn và leaderboard đa đời

### Decision applied

- Áp dụng `Q-PROGRESSION-008` phương án A: Cultivation Leaderboard mặc định ưu tiên `rebirth_count DESC`, rồi `realm_order DESC`, `realm_stage DESC`, `cultivation DESC`, `player_id ASC`.
- Áp dụng `Q-PROGRESSION-009` phương án A: `/luanhoi` phải có ephemeral preview và hai nút Xác nhận/Hủy owner-only với TTL tuyệt đối 2 phút. Preview không reserve operation và không mutate dữ liệu.
- Giữ nguyên `Q-SPIRITROOT-001` ở backlog theo yêu cầu: chưa cấp reroll entitlement, chưa thêm tier/effect/pool Linh Căn.

### Leaderboard projection v2

- Thêm migration `017_rebirth_leaderboard_projection.sql`: projection top-100 có `rebirth_count NUMERIC`, constraint số nguyên không âm và source index bắt đầu bằng `rebirth_count DESC`.
- Snapshot refresh materialize thứ tự đa đời canonical. Public service và `/bangxephang` thêm số đời; không lộ cultivation/player ID.
- Keyset vẫn dùng `(rank, player_id)` trong snapshot thay vì nhét BigInt tuple vào cursor: `rank` đã materialize toàn bộ thứ tự canonical và snapshot timestamp tiếp tục chặn cursor stale.

### Luân hồi confirmation contract

- `RebirthService.preview()` tính lazy eligibility, đời kế tiếp, Realm reset và base stat nhưng không ghi cultivation, không reserve idempotency và không mở reset transaction.
- Confirm dùng ID của button interaction làm operation ID và gửi `expectedRebirthCount` cùng policy revision. Core reserve idempotency, khóa Player, kiểm tra activity, settle lazy cultivation, tái kiểm tra Realm/Stage/tu vi và so preview identity trước reset.
- Nếu preview stale, core trả `REBIRTH_PREVIEW_STALE` mà không gọi reset; Discord tải lại preview thay vì tự thực hiện. Hủy/timeout đều xóa destructive buttons; thành công cũng kết thúc session.
- Loại bỏ feature gate `rebirthCommandEnabled`; command chỉ mở sau khi confirmation contract hoàn tất.

### Verification

- `audit:rebirth-runtime` PASS cho read-only preview, identity `policy:revision:current:next`, Player lock, activity gate, stale guard không reset và transaction thành công.
- Thêm `audit:rebirth-command`; PASS cho ephemeral, owner-only, TTL 120 giây, interaction idempotency key, expected count và button cleanup.
- `audit:cultivation-leaderboard`, `audit:leaderboard-command` và `audit:database-foundation` PASS với ordering/projection/migration 017 mới.
- Chưa chạy migration 017 hoặc concurrency test trên PostgreSQL thật vì chưa có test database URL an toàn.

## 2026-07-20 — Mở lại thiết kế Linh Căn hậu Luân hồi

### Current-state analysis

- Điều kiện hoãn đã kết thúc: Luân hồi, Discord confirmation, leaderboard đa đời và fixed-point battle đều hoàn tất/audit PASS.
- Registry hiện có 10 Linh Căn, tổng weight 100. Trường `tier` đang là loại hình `HEAVENLY/MUTATED/ELEMENTAL/MIXED`, không phải thang phẩm cấp; `effectIds` đều rỗng và chưa được runtime materialize.
- Battle chỉ resolve một `elementId` làm defensive Element; template không hệ dùng `NEUTRAL`. Core chưa có generic passive modifier binding xuyên Battle/Cultivation/Breakthrough; Sect đang dùng adapter `sectPolicy` riêng.

### Independent foundation

- Tách `SpiritRootRoller` khỏi `PlayerStartService`. `/start` giữ nguyên weighted distribution và injectable RNG; roller mới có thể tái sử dụng sau này nhưng hiện không cấp/consume reroll entitlement.
- Roller bỏ qua entry weight 0, fail-fast khi registry/total weight/RNG không hợp lệ và không hard-code template/tên/xác suất.
- Tăng structural validation cho `legacyValue`, `tier`, `effectIds` và `tags`, gồm array/duplicate/reference guards; không thêm Effect gameplay.
- Thêm `audit:spirit-root-foundation`; PASS cho 10 roots, tổng weight 100, boundary mapping chính xác, invalid RNG rejection. Data schema và architecture audits tiếp tục PASS.

### Risk gates

- Giữ `Q-SPIRITROOT-001` OPEN cho cơ chế entitlement/reroll. Mở `Q-SPIRITROOT-002..006` cho model archetype-quality, generic Effect contract, power budget, pool theo `rebirth_count` và multi-element defense.
- Chưa thêm migration, command reroll, tier registry hay Effect thật; các phần này ảnh hưởng gameplay/balance lớn và chỉ được triển khai sau khi chủ dự án chọn.

## 2026-07-20 — Spirit Root quality/effect/entitlement foundation

### Approved choices

- `Q-SPIRITROOT-001..006` lần lượt chọn `A/A/A/B/B/A`: reroll tùy chọn một lượt mỗi Luân hồi; tách archetype-quality; generic passive binding; quality chỉ tăng cultivation; pool theo bracket số đời; defensive Element explicit.
- Không tự đặt battle bonus cho archetype. Template `effectIds` hiện vẫn rỗng; chỉ quality tier có cultivation Effect đã được duyệt.

### Data-driven quality và Effect

- Spirit Root schema v2 thay `tier/elementId` bằng `archetype/elementIds/defensiveElementId`. Validator kiểm tra affinity reference, duplicate và defensive Element thuộc affinity list; Battle snapshot expose affinity nhưng matchup chỉ dùng defensive Element canonical.
- Thêm `spirit_root_quality_tiers.json` với Hạ/Trung/Thượng/Cực/Tiên Phẩm, order 1–5 và Effect references. Hạ Phẩm không effect; bốn cấp sau tăng cultivation `5/10/20/35%`.
- Thêm bốn modifier cultivation và bốn Core Effect. `passiveBindings` là contract generic theo scope/modifier, được normalize/validate độc lập với nguồn content.
- Thêm `PassiveEffectBindingResolver` và `SpiritRootEffectResolver`; legacy Player cultivation snapshot materialize quality Effect qua active buff. Player quality null không nhận bonus, bảo toàn balance trước cutover.

### Persistence foundation

- Migration `018_spirit_root_progression_foundation.sql` thêm nullable `players.spirit_root_quality_tier_id`, entitlement state machine AVAILABLE/CONSUMED unique `(player, rebirth_number)` và immutable roll-history foundation với unique operation/entitlement.
- `RebirthRepository.applyReset()` cấp entitlement bằng insert conflict-safe trong chính transaction reset/history/ledger. Không roll RNG trong Luân hồi và không cấp entitlement ngoài commit thành công.
- Runtime Player/repository mang quality ID; Rebirth preview/history snapshot giữ quality hiện tại.

### Remaining risk gates

- `Q-SPIRITROOT-007` yêu cầu weight/milestone cụ thể cho quality bracket. `Q-SPIRITROOT-008` yêu cầu quality của Player mới/backfill và entitlement hồi tố.
- Chưa có QualityRoller, consume transaction, NOT NULL cutover, `/linhcan` command hoặc Discord presenter; không thể triển khai đúng nếu chưa có hai câu trả lời trên.

### Verification

- `audit:spirit-root-foundation` PASS cho 10 template/weight 100, 5 quality tiers, archetype/multi-element contract, cultivation budget `0/0.05/0.10/0.20/0.35` và entitlement DB constraints.
- Data schema, Element relation, Rebirth runtime, migration discovery và architecture audits đều PASS.
- Migration 018 chưa chạy trên PostgreSQL thật vì chưa có test database URL an toàn.

## 2026-07-20 — Spirit Root quality pool và deterministic cutover

### Approved choices

- `Q-SPIRITROOT-007` chọn curve A không hard floor: bốn bracket đời `1–2`, `3–5`, `6–9`, `10+` với quality weights đã duyệt.
- `Q-SPIRITROOT-008` chọn C: Player mới/cũ bắt đầu Hạ Phẩm; Player cũ có Luân hồi nhận tối đa một entitlement hồi tố, không tạo N lượt theo toàn bộ lịch sử.

### Data và runtime

- Thêm `SPIRIT_ROOT_REBIRTH_QUALITY_V1` revision 1. Template roll tiếp tục dùng weight riêng tổng 100; quality roll tách biệt theo bracket, mọi bracket tổng 100 và phủ liên tục từ đời 1 tới vô hạn.
- Thêm `SpiritRootQualityRoller` dùng integer-string/BigInt để resolve bracket, hỗ trợ count vượt `Number.MAX_SAFE_INTEGER`; RNG được inject và fail-fast ngoài `[0,1)`.
- Validator khóa pool revision, source, bracket ID/range liên tục/open-ended, quality reference, duplicate và tổng weight.
- `/start` ghi explicit `LOWER_GRADE` và trả tên Hạ Phẩm. Public profile resolve/hiển thị quality từ GameData; cultivation Effect được materialize từ quality.

### Persistence cutover

- Migration 019 deterministic backfill mọi quality null thành `LOWER_GRADE`, đặt default + NOT NULL.
- Backfill entitlement chỉ insert một row tại `rebirth_count` hiện tại cho Player count > 0; unique `(player, rebirth_number)` và `ON CONFLICT DO NOTHING` bảo vệ retry/case đã được cấp bởi migration 018 runtime.
- Không random trong migration và không cấp entitlement cho Player chưa từng Luân hồi.

### New risk gates

- Entitlement có thể tích lũy nên mở `Q-SPIRITROOT-009`: dùng bracket tại đời cấp hay đời consume/expire.
- Template+quality có thể trùng chính xác trạng thái hiện tại nên mở `Q-SPIRITROOT-010`: tiêu lượt, deterministic reroll-until-different hay upgrade protection.
- Chưa triển khai consume repository/service hoặc slash command cho đến khi hai semantics này được chốt.

### Verification

- Spirit Root foundation audit PASS cho bốn bracket, boundary first/last tier, count cực lớn, Hạ Phẩm cutover và entitlement hồi tố conflict-safe.
- Data schema và database migration discovery audits PASS; migration 019 chưa chạy trên PostgreSQL thật vì chưa có test URL an toàn.

## 2026-07-20 — Spirit Root reroll transactional runtime

### Approved choices

- `Q-SPIRITROOT-009` chọn A: entitlement tích lũy dùng bracket tại đời được cấp và consume oldest-first.
- `Q-SPIRITROOT-010` chọn B: exact duplicate template+quality không consume như kết quả cuối; seeded roller lấy cặp tiếp theo và lưu rejected draws.

### Transaction và concurrency contract

- Thêm `SpiritRootRerollRepository`/`SpiritRootRerollService`. Preview read-only trả current root/quality, entitlement cũ nhất, available count và đúng quality odds của grant-time bracket.
- Confirm bắt buộc operation ID và expected entitlement ID. Idempotency reserve, Player lock, entitlement oldest-first `FOR UPDATE`, stale comparison, settle lazy cultivation, seeded roll, Player mutation, entitlement consumption và roll-history commit cùng transaction.
- Lock order là `Player → Entitlement`; Luân hồi cũng khóa Player trước khi grant. Hai confirm khác operation từ cùng preview không thể tiêu hai lượt: request sau nhận stale/no-entitlement thay vì tự chuyển sang lượt kế tiếp.
- Entitlement update conditional `status = AVAILABLE`; history unique operation/entitlement là DB defense-in-depth.

### Deterministic duplicate protection

- Secure seed được persist trong `roll_snapshot`; template và quality dùng cùng RNG stream. Quality bracket lấy từ `entitlement.rebirth_number`, không từ current Player count.
- Exact duplicate ghi vào `rejectedDraws` rồi lấy cặp kế tiếp. Fail-safe bằng số tổ hợp positive-weight; exhaustion ném lỗi làm rollback cultivation checkpoint, Player root, history và entitlement.
- Vẫn cho phép quality thấp hơn; chỉ exact duplicate được bảo vệ.

### Discord và profile

- Thêm `/linhcan xem` và `/linhcan reroll`. Reroll preview ephemeral hiển thị current root/quality, grant-time đời, bracket odds, số lượt và cảnh báo mất vĩnh viễn/có thể giảm phẩm.
- Confirm/Hủy owner-only TTL 2 phút. Component interaction ID là idempotency key; stale entitlement reload preview; success hiển thị trước/sau, hướng tăng/giảm phẩm và số duplicate bị loại.
- `/start`, `/hoso` và `/nhanvat` hiển thị phẩm cấp Linh Căn.

### Verification

- `audit:spirit-root-reroll-runtime` PASS cho lock order, grant-time bracket, oldest-first, settle-before-change, seeded exact-duplicate rejection, persisted snapshot, stale guard và idempotency identity.
- `audit:spirit-root-command` PASS cho ephemeral owner-only confirmation, TTL 120 giây, expected-entitlement guard, interaction idempotency và lower-quality warning.
- Spirit Root foundation/data schema/Rebirth/architecture audits tiếp tục PASS. PostgreSQL integration/concurrency thật vẫn chưa chạy vì chưa có test URL an toàn.

## 2026-07-20 — Spirit Root reroll final policy alignment

### Public profile contract

- Cập nhật approved-policy audit để đưa `spiritRootQuality` vào allowlist của public profile.
- Khóa payload quality ở đúng ba field công khai `id`, `name`, `order`; không expose registry record, Effect binding hay runtime aggregate.
- Cập nhật profile fixture theo invariant sau migration 019: mọi Player có quality tier `LOWER_GRADE` hoặc cao hơn, không còn trạng thái null trong PostgreSQL.

### Final verification

- PASS: approved policies, data-schema alignment, architecture boundaries, battle fixed-point, battle factory isolation và skill-action identity.
- PASS: Spirit Root foundation, transactional reroll runtime, `/linhcan` command, Rebirth foundation/runtime/`/luanhoi`, database foundation.
- Audit `/luanhoi` được chạy độc lập hai lần và đều PASS. Discord collector audit không được chạy song song vì dùng timer/collector giả lập nhạy với scheduling.
- Chưa chạy migration 018–019 hoặc concurrency integration trên PostgreSQL thật vì chưa có test database URL an toàn.

## 2026-07-20 — PostgreSQL progression verification harness

### Scope và safety

- Thêm opt-in `verify:progression:postgres`; không có `PROGRESSION_TEST_DATABASE_URL` thì trả `SKIP`, không fallback sang `DATABASE_URL`.
- Test URL bị từ chối nếu trỏ cùng PostgreSQL database identity với primary URL. Mỗi lần chạy tạo schema `progression_verify_*`, đặt `search_path` cô lập và chỉ drop schema sau khi qua prefix guard.
- Harness không thay đổi gameplay/balance và không được xem là integration PASS cho đến khi thực sự kết nối PostgreSQL test.

### PostgreSQL assertions

- Chạy toàn bộ forward migration và bắt buộc có migration 016–019.
- Giả lập Player legacy quality null rồi chạy migration 019 hai lần; xác minh backfill `LOWER_GRADE`, đúng một retro entitlement theo `rebirth_count` và NOT NULL được khôi phục.
- Gửi đồng thời hai Luân hồi cùng operation ID để kiểm cached replay; gửi hai operation ID khác nhau trên cùng Player để kiểm Player lock chỉ tạo một lịch sử/reset.
- Xác minh reset Realm/Stage/currency/inventory/equipment/skill/công pháp, giữ Linh Thạch, bootstrap một công pháp, ghi history, entitlement và ledger cho các delta phi-zero với tổng delta đúng trong cùng commit.
- Gửi đồng thời reroll cùng operation ID để kiểm replay; gửi hai operation khác nhau từ cùng expected entitlement để xác minh request sau stale và không tiêu entitlement kế tiếp.

### Verification hiện tại

- `audit:progression-postgres-harness`, database foundation, Rebirth runtime và Spirit Root reroll runtime đều PASS.
- `verify:progression:postgres` trả `SKIP` an toàn do môi trường chưa có `PROGRESSION_TEST_DATABASE_URL`; chưa có tuyên bố PostgreSQL integration PASS.

## 2026-07-20 — PostgreSQL activity lifecycle verification harness

### Scope và safety

- Thêm opt-in `verify:activity:postgres`; chỉ đọc `ACTIVITY_TEST_DATABASE_URL`, từ chối database identity trùng `DATABASE_URL` và trả `SKIP` nếu chưa cấu hình.
- Harness chạy toàn bộ migration trong schema `activity_verify_*` cô lập; cleanup chỉ được thực hiện sau prefix guard.
- Bắt buộc migration 009–012 để kiểm đúng reward claim, canonical activity run, Gathering lazy state và progress projection.

### Activity assertions

- Exploration: hai reserve cùng operation ID tạo đúng một run/cached replay; trạng thái `IN_PROGRESS` tồn tại độc lập với battle CPU; hai completion operation khác nhau cùng business key chỉ ghi một projection và một result.
- Secret Realm rollback: repository test double cố ý ném lỗi sau ticket debit; transaction phải hoàn lại ticket và rollback activity run, ledger lẫn idempotency reservation.
- Secret Realm race: hai start khác operation dùng một vé chỉ có một request thành công; vé và cost ledger commit cùng run `IN_PROGRESS`. Run này có thể được recovery-complete; completion trùng chỉ ghi một projection.
- Gathering: partial unique index chỉ cho một active run mỗi Player; early claim rollback sạch idempotency/reward; hai claim khác operation cùng business key chỉ cộng `7` Linh Thạch, một reward claim, một ledger và một legacy projection.

### Verification hiện tại

- `audit:activity-postgres-harness` PASS; Exploration, Secret Realm và Gathering simulator đều PASS.
- `verify:activity:postgres` trả `SKIP` an toàn vì chưa có `ACTIVITY_TEST_DATABASE_URL`; chưa tuyên bố PostgreSQL activity integration PASS.

## 2026-07-20 — PostgreSQL progression integration PASS và deadlock hardening

### Kết quả chạy thật

- Đã chạy `verify:progression:postgres` hai lần liên tiếp trên `PROGRESSION_TEST_DATABASE_URL`; cả hai lần PASS và cleanup schema tạm thành công.
- Cả 19 forward migration áp dụng được trên schema sạch. Migration 019 backfill quality/retro entitlement đúng và chạy lặp không sinh duplicate.
- Luân hồi cùng operation ID replay đúng; hai operation khác nhau trên cùng Player serialize thành đúng một reset/history; inventory, wallet, ledger và entitlement commit atomic.
- Reroll cùng operation ID replay đúng; hai operation từ cùng preview chỉ consume entitlement cũ một lần và giữ nguyên entitlement kế tiếp.

### Deadlock được phát hiện và sửa

- Lần chạy đầu phát hiện PostgreSQL `40P01` khi hai Luân hồi khác operation ID cạnh tranh cùng Player.
- Nguyên nhân: mỗi transaction insert `idempotency_records` trước, FK giữ `KEY SHARE` trên Player, sau đó cả hai cùng nâng khóa sang `FOR UPDATE`; hai lock upgrade tạo chu kỳ deadlock.
- `IdempotentOperationExecutor` nay khóa canonical Player row trước khi reserve idempotency. Lock order dùng chung là `Player → Idempotency → Domain`; các service khóa lại Player trong work vẫn re-entrant trong cùng transaction.
- Không áp dụng executor này cho tạo Player; toàn bộ caller hiện hữu đều là mutation của Player đã tồn tại. Breakthrough vốn đã dùng đúng thứ tự này.
- Thêm `audit:idempotency-lock-order`; PASS cho mutation và cached replay. Approved policies, database foundation, Rebirth/Spirit Root runtime và architecture audits tiếp tục PASS.

### Harness diagnostics

- Bổ sung `failureStage`, error code/message đã redact URL và assertion details chỉ chứa dữ liệu seed trong schema tạm, giúp chẩn đoán integration failure mà không lộ credential.
- Sửa assertion ledger: `ResourceLedgerRepository.recordMany()` bỏ delta 0, nên reset seed chỉ ghi một entry `HONOR -77`, không phải ba entry cho mọi currency reset.

## 2026-07-20 — PostgreSQL activity integration PASS

### Kết quả chạy thật

- Đã chạy `verify:activity:postgres` hai lần liên tiếp trên `ACTIVITY_TEST_DATABASE_URL`; cả hai lần PASS, áp dụng đủ 19 migration và cleanup schema tạm thành công.
- Exploration: same-operation reserve tạo một run/replay; `IN_PROGRESS` tồn tại bền vững qua khoảng crash giả lập; concurrent completion cùng business key chỉ ghi một result/projection.
- Secret Realm: failure cố ý sau ticket debit rollback sạch ticket, run, ledger và idempotency row. Hai start dùng một vé chỉ một request thành công; committed run giữ đúng ticket cost ledger và recovery completion chỉ ghi một projection.
- Gathering: hai start cạnh tranh chỉ tạo một active run; early claim rollback sạch; hai claim cạnh tranh chỉ tạo một reward claim/projection/ledger và cộng Linh Thạch đúng một lần.

### Regression verification

- `audit:activity-postgres-harness`, `audit:idempotency-lock-order`, approved policies, database foundation, data-schema alignment và architecture boundaries đều PASS sau integration.
- Hai harness PostgreSQL progression/activity hiện đã chứng minh core migration, transaction, rollback và concurrency semantics Phase 6 trên database thật. Load/soak quy mô lớn và failover vẫn là gate vận hành Phase 7.

## 2026-07-20 — PostgreSQL Phase 7 integration PASS

### Kết quả chạy thật

- `verify:phase7:postgres` PASS lặp lại trên PostgreSQL test: đủ 19 migration, concurrent leaderboard refresh, hai trang keyset, stale cursor rejection, top-100 constraint và query-plan capture.
- Hai Outbox worker đồng thời claim đủ 200 event theo batch 100, không có ID trùng (`SKIP LOCKED`).
- Toàn bộ audit Phase 7 liên quan leaderboard, pagination, Outbox worker/polling, scheduler, pool policy, database observability/health, SLO, OpenTelemetry, cache contract và architecture đều PASS.

### Leaderboard refresh bug được phát hiện và sửa

- Refresh snapshot lần hai ban đầu lỗi `23505 cultivation_leaderboard_entries_pkey`.
- Nguyên nhân: repository dùng data-modifying CTE để `DELETE` và `INSERT` lại cùng table trong một statement; unique constraint được kiểm tức thời trong khi old rows vẫn tham gia conflict.
- `replaceSnapshot()` nay chạy `DELETE FROM cultivation_leaderboard_entries` rồi `INSERT` ranked snapshot bằng statement kế tiếp. Hai statement vẫn atomic vì `CultivationLeaderboardService` đã chạy trong UnitOfWork và giữ `cultivation_leaderboard_state FOR UPDATE`.
- Audit leaderboard khóa thứ tự delete-before-insert và cấm quay lại `cleared AS` CTE.

### Deterministic Outbox fixture và harness safety

- Outbox test ban đầu claim 0 event vì seed dùng database current time còn claim dùng fixed time cũ. Seed nay ghi explicit cùng `occurred_at/available_at` với clock claim.
- Phase 7 harness bổ sung failure stage/message đã redact URL, constraint và assertion details để chẩn đoán PostgreSQL thật.
- `verify:phase7:postgres` ưu tiên URL riêng Phase 7, rồi chỉ fallback sang `PROGRESSION_TEST_DATABASE_URL` hoặc `ACTIVITY_TEST_DATABASE_URL`; tuyệt đối không fallback `DATABASE_URL`.
- Thêm `audit:phase7-postgres-harness`; PASS cho test URL safety, prefix-guarded cleanup, repeat refresh và concurrent claim 200 event.

## 2026-07-20 — Primary database migration cutover

### Migration execution

- Theo xác nhận tiếp tục của chủ dự án, chạy migration runner lên `DATABASE_URL` chính.
- `npm run db:migrate` bị Windows sandbox chặn khi npm dò profile và không thực thi migration; chuyển sang gọi cùng entrypoint bằng `node src/database/migrate.js`.
- Migration 016, 017, 018 và 019 áp dụng thành công. Lần chạy thứ hai trả `applied: []`, xác nhận đủ checksum và tính idempotent.

### Read-only production-schema verification

- Database chính kết nối thành công và có 19 migration, latest `019_spirit_root_quality_cutover.sql`.
- Bảng `player_rebirth_history`, `player_spirit_root_reroll_entitlements`, `player_spirit_root_roll_history` đều tồn tại.
- Database hiện có một Player; `null_quality_count = 0`. Player chưa Luân hồi nên `entitlement_count = 0` là đúng policy.
- Audit idempotency lock order, Rebirth runtime, Spirit Root reroll runtime và Cultivation Leaderboard đều PASS sau cutover.

### Offline Discord command smoke check

- Import thành công toàn bộ 22 command module; 22 tên command duy nhất và toàn bộ `getSlashData().toJSON()` serialize hợp lệ.
- Không login Discord hoặc đăng ký guild command trong smoke check; bước network cuối chỉ chạy khi khởi động bot bằng `node src/index.js`/`npm start` ngoài sandbox npm.

## 2026-07-20 — Live Discord startup verification

### Kết quả vận hành

- Khởi động bot thật bằng `node src/index.js` sau khi chủ dự án xác nhận tiếp tục.
- Game data bootstrap thành công với 64 nguồn dữ liệu; PostgreSQL khởi tạo thành công; scheduler chạy với một task; nạp đủ 22 slash command.
- Discord login thành công cho bot `Thánh Sư#4925`; sự kiện client ready được nhận và cấu trúc slash command đã đồng bộ thành công với guild cấu hình.
- Tiến trình bot được giữ chạy sau verification để tiếp tục phục vụ Discord.

### Technical debt được ghi nhận

- discord.js cảnh báo event `ready` sẽ đổi tên thành `clientReady` ở v15. Cảnh báo không ảnh hưởng phiên chạy hiện tại; cần chuyển listener sang hằng event tương thích trước khi nâng major version.
- Lần chạy đầu trong sandbox không có network dừng tại Discord login và logger chỉ ghi `error: ""`; tiến trình thử nghiệm đã được dừng trước khi chạy lại với quyền network. Cần cải thiện serialization cho `AggregateError` để giữ được `name`, `code`, `cause/errors` đã sanitize.

## 2026-07-20 — Equipment loadout theo type và Discord type selects

### Quy tắc loadout

- Chuyển identity ô trang bị từ physical-slot alias sang equipment type canonical trong GameData: `WEAPON`, `ARMOR`, `ROBE`, `RING`.
- Mỗi Player chỉ có tối đa một trang bị đang mặc cho mỗi type. `ARMOR` và `ROBE` không còn cùng bị gộp vào `armor`; người chơi có thể mặc đồng thời một giáp và một pháp y.
- Khi mặc món mới cùng type, repository tháo món cũ rồi mặc món mới trong cùng transaction đã khóa Player và settle cultivation trước mutation. Response cho biết món bị thay thế nếu có.

### Discord UX

- `/trangbi` nay hiển thị select type lấy nhãn từ `equipment_types.json`, sau đó chỉ hiển thị các instance chưa mặc thuộc type đã chọn.
- `/thaotrangbi` chọn type đang mặc trước rồi xác nhận instance thuộc type đó. Component ID gắn interaction ID và vẫn dùng bộ lọc user/time-out hiện hữu.

### Database cutover và verification

- Thêm migration `020_equipment_type_slots.sql`: canonicalize loadout cũ, giữ instance mới nhất nếu dữ liệu lịch sử có duplicate cùng type, cập nhật `instance_data.equipmentType` và tái lập unique partial index cho active/legacy inventory.
- Migration 020 PASS trên schema PostgreSQL test cô lập cùng đủ 20 migration, sau đó áp dụng thành công lên `DATABASE_URL` chính; lần chạy lại trả `applied: []`.
- Primary database hiện có 20 migration, latest `020_equipment_type_slots.sql`, không có assignment trùng `(player_id, equipment_type)`.
- `audit:equipment-type-slots`, approved policies, data-schema alignment và database foundation đều PASS. Audit xác nhận `ARMOR !== ROBE`, service thay đúng món cùng type, không thay type khác, migration/unique-index contract và cả hai Discord type-select flow.
- Trước khi restart, listener Discord được chuyển từ chuỗi event deprecated `ready` sang `Events.ClientReady`; loại bỏ cảnh báo tương thích discord.js v15 đã ghi nhận ở lần khởi động trước.
- Phiên bot dùng code cũ đã được dừng trước database cutover. Yêu cầu quyền network để khởi động lại bot bằng code mới bị từ chối; không retry. Tại thời điểm bàn giao không còn tiến trình Node chạy, nên source/database đã sẵn sàng nhưng bot Discord đang offline cho tới khi chủ dự án tự chạy `node src/index.js` hoặc cho phép khởi động ở lượt sau.

## 2026-07-20 — Phân tích lại UX hiển thị trang bị và effect

- Phát hiện nguyên nhân effect trang bị hiện `0.xx`: `EffectFormatter` tra collection `effects` bằng runtime stat (`atk`, `critRate`), trong khi definition chủ yếu được index bằng modifier ID (`ATK_PERCENT`, ...) hoặc attribute ID (`ATK`, `CRIT`). Lookup thất bại nên formatter mặc định coi hệ số phần trăm là số thường.
- Phân biệt hai semantics cần hiển thị: `add_percent_base` lưu rate (`0.1 = 10%`), còn flat bonus trên thuộc tính phần trăm như chí mạng lưu percentage point (`5 = 5%`). Formatter phải dựa trên mode và attribute metadata, không chỉ nhìn numeric value.
- Chọn hướng UI panel một message: bốn String Select theo type GameData, một action row xác nhận/đóng; chọn instance chỉ preview, xác nhận mới mutation. Preview dùng cùng `Player`/EffectResolver/StatCalculator với runtime để tránh công thức UI lệch battle/profile.
- Mở `Q-EQUIPMENT-001` vì yêu cầu Dây chuyền xung đột với type `ROBE` hiện hữu. Chưa tự đổi content/type; tiếp tục formatter, preview và panel theo bốn type đang cấu hình.

### Kết quả triển khai độc lập

- `EffectFormatter` nay resolve theo `modifierId → effect stat → attribute metadata`, hỗ trợ đúng tên chỉ số và unit. `add_percent_base 0.1` hiển thị `+10%`; flat bonus của chỉ số percentage-point như chí mạng `5` hiển thị `+5%`; `mul_total 1.5` hiển thị `+50% tổng`; số âm không còn dạng `+-20%`.
- `EquipmentService.previewEquipItem()` dựng projected Player không ghi database, tự loại món đang mặc cùng type khỏi projection, rồi tính toàn bộ 19 battle stat bằng calculator canonical. DTO trả current/projected/delta/percentDelta, item thay thế và danh sách effect.
- `/trangbi` nay là panel ephemeral có đúng 4 select row lấy động từ `equipment_types.json` và một action row. Mỗi select hiển thị món đang mặc, rarity và mô tả effect; type chưa có item vẫn hiện ô disabled thay vì biến mất.
- Khi chọn item, embed cập nhật bảng HP/ATK/DEF/SPD, các secondary stat thay đổi, fixed effect/affix và món sẽ bị thay. Nút `Trang bị` bị khóa nếu đang xem chính món đã mặc; confirm thành công refresh toàn panel để tiếp tục quản lý slot khác trong cùng session.
- Sửa regression affix pool do equipment type canonical viết hoa: `ItemGameDataResolver` normalize key lowercase và normalizer khai báo pool `robe`/`necklace`, bảo đảm trang bị roll mới không mất affix.
- `audit:equipment-type-slots` mở rộng và PASS: kiểm tra formatter rate/percentage-point/multiplier/sign, projected DEF `10 → 11`, thay ARMOR không ảnh hưởng ROBE, panel runtime có 4 select + 1 action row, preview embed cập nhật và đóng session disable toàn bộ component. Data-schema alignment, approved policies và ComponentSession audit đều PASS.
- Không đổi database schema/content trong phần này; bot vẫn offline theo trạng thái bàn giao trước đó. Chưa áp dụng `NECKLACE` cho tới khi `Q-EQUIPMENT-001` được trả lời.

## 2026-07-21 — Giữ preview sau khi lưu và hiện effect hiện tại

- Theo yêu cầu chủ dự án, confirm trang bị không còn đặt `preview = null`. Snapshot so sánh trước khi lưu được giữ lại và đánh dấu `applied`, nên bảng `current → projected → delta/%`, item/effect và món bị thay vẫn còn trên message sau transaction thành công.
- Nút `Trang bị` được disable cho preview đã áp dụng để ngăn confirm lặp; bốn select vẫn hoạt động để người chơi tiếp tục xem món khác trong cùng session.
- Panel luôn có field `Hiệu ứng chỉ số hiện tại`, lấy từ `panel.player.effects` sau aggregate canonical. Sau confirm, panel reload Player từ database nên field này phản ánh ngay toàn bộ effect thực tế của loadout mới, trong khi field so sánh vẫn giữ delta trước/sau vừa áp dụng.
- Audit panel được mở rộng với flow `select → confirm → close`: xác nhận field effect hiện ngay từ lần render đầu, preview vẫn tồn tại/được đánh dấu sau confirm và mọi component bị disable khi đóng.

## 2026-07-21 — Đổi contract Exploration sang current-map persistence

- Yêu cầu mới của chủ dự án supersede lựa chọn B tại `Q-MAP-003`: Player phải có map hiện tại persisted; `/thamhiem` dùng duy nhất map này; activity run vẫn snapshot resolved map để retry/replay không bị ảnh hưởng bởi lần di chuyển sau.
- Phân tích race condition: movement và exploration reservation phải cùng khóa canonical Player trước map state/domain row. Nhờ vậy concurrent `/chuyenmap` và `/thamhiem` serialize; encounter luôn thuộc map tại thời điểm transaction reservation commit.
- Không thể tự suy ra `HIGHER/LOWER`: `TRUC_LAM` và `LINH_KHE` cùng Realm order 1, khác continent, còn `maps.json` chưa có route/order. Mở `Q-MAP-004`; đề xuất tuyến explicit `TRUC_LAM → LINH_KHE → HOA_DIEM_SON → THIEN_MON`, chưa áp dụng.

### Persistence foundation đã hoàn tất

- Thêm migration `021_player_map_state.sql` với `player_map_states` (một current map, movement version/timestamp) và `player_map_movements` (from/to/direction, unique operation ID, history index).
- Thêm `PlayerMapStateRepository` hỗ trợ read/`FOR UPDATE`, atomic upsert tăng version và movement history idempotent. Chưa có runtime caller cho tới khi route được trả lời; không seed state bằng giả định.
- `audit:player-map-foundation`, database foundation và `verify:progression:postgres` PASS; PostgreSQL test schema áp đủ 21 migration.
- Migration 021 đã áp dụng lên `DATABASE_URL` chính; lần chạy lại trả `applied: []`. Không tạo state cho Player hiện hữu nên chưa có map khởi đầu bị áp sai trước quyết định `Q-MAP-004`.

## 2026-07-21 — Chốt tuyến 15 map và current-map runtime

- `Q-MAP-004` RESOLVED theo danh sách chủ dự án cung cấp: một map cho mỗi Realm order 1–15, `Thanh Vân Sơn Mạch` là điểm khởi đầu và `LOWER/HIGHER` chỉ đi một map liền kề.
- `maps.json` nâng revision với 15 ID ổn định, `realmCode`, unique `navigationOrder`, đúng một `isStartingMap`; validator kiểm tra toàn bộ invariant. Ba map Luyện Khí/Trúc Cơ/Kết Đan tái sử dụng các spawn pool đã duyệt; 12 map cao hơn giữ `CONTENT_PENDING`, không phát sinh quái/reward chưa được duyệt.
- Thêm `MapNavigationService` và `PlayerMapService`: lazy initialize vị trí cho Player cũ, kiểm tra realm/content, transaction + idempotency cho movement và history. `/chuyenmap` chuyển thành panel vị trí hiện tại với nút map thấp/cao; `/thamhiem` bỏ option map và luôn dùng current map.
- Exploration reservation khóa Player rồi resolve/khóa map state trong cùng transaction, snapshot `mapId`/`mapName` trước battle. Concurrent move/explore được serialize và retry không đổi encounter đã reserve.
- Migration 022 remap state/history từ các ID map cũ sang tuyến mới; movement giữa hai map Luyện Khí cũ bị gộp vẫn giữ audit row với `from_map_id = NULL` để bảo toàn constraint.
- Audit data schema, map foundation, content Kết Đan, database foundation và Exploration simulation đều PASS. Hai PostgreSQL harness progression/activity PASS với 22 migration; activity harness xác nhận lazy init, adjacent-only, idempotent replay và chặn content pending trên PostgreSQL thật. Migration 022 đã áp dụng lên database chính và lần chạy lại trả `applied: []`.

## 2026-07-21 — Monster quality foundation từ danh sách TXT

- Đã đọc `Danh_sach_quai_vat_game_tu_tien.txt`: 20 nhóm chủng tộc, 117 dòng quái thường, 25 boss và ladder 10 phẩm chất. TXT chỉ có tên/nhóm, chưa có mapping map, element, Realm, skill, reward, spawn weight hoặc quality odds; mở `Q-MONSTER-004` và `Q-MONSTER-005`, không tự gán content ảnh hưởng balance.
- Thêm GameData `monster_quality_tiers.json`: Phàm/Linh/Yêu/Huyền/Địa/Thiên/Thánh/Tiên/Thần/Hồng Hoang, order 1–10; policy `ADDITIVE_FROM_ORIGINAL_BASE`, `stepPercent: 15`, tác động HP/ATK/DEF/SPD. Chỉnh một giá trị JSON sẽ đổi bước tăng toàn ladder.
- Normalizer/validator bắt registry không rỗng, unique positive order, default quality hợp lệ, step không âm và đúng stat allowlist. Spawn entry có thể khai báo `qualityId` explicit; validator cấm quality trên entry BOSS.
- `MonsterGeneratorService` resolve Phàm Thú `+0%` làm compatibility default; multiplier mỗi tier là `1 + stepPercent × (order - 1) / 100`. Stat integer dùng fixed multiplier units để tránh lỗi float như `200 × 1.15 = 229.999...` bị floor sai.
- `BOSS`/`WORLD_BOSS` trả `qualityId: null`, multiplier 1 kể cả caller truyền Hồng Hoang Dị Thú. Vì vậy boss Bí Cảnh giữ nguyên stage/variant formula; normal wave dùng quality mặc định. Quality metadata được đưa vào Monster plan, Battle metadata và activity snapshot; Discord hiển thị quality cho quái thường.
- Thêm `audit:monster-quality-runtime` và spec `docs/06_MONSTER/003_MONSTER_QUALITY_SPEC.md`. Audit xác nhận 10 tier, bước 15%, Hồng Hoang `+135%`, boss stat cũ không đổi và boss wave cuối Bí Cảnh không có quality. Data schema, Thiên Môn content và Exploration simulation tiếp tục PASS. Không cần migration PostgreSQL cho thay đổi GameData/runtime này.

## 2026-07-21 — Chuẩn hóa Monster Skill TXT và tách các quyết định content

- Chủ dự án chọn `Q-MONSTER-004` phương án C (ba map ACTIVE trước) và `Q-MONSTER-005` phương án B (Quality Pool theo map/cảnh giới). Hai câu được chuyển `ANSWERED`; chưa `RESOLVED` vì mapping/weights cụ thể chưa được cung cấp.
- Đã đọc `Ky_nang_quai_vat_theo_chung_toc.txt` và thêm `monster_skill_catalog.json`: 20 chủng tộc, 100 Skill thường, 12 Skill boss với stable globally-unique ID; normalizer/validator bắt id/name và chống duplicate.
- Catalog giữ trạng thái `CATALOG_ONLY` và không merge vào `skills`/`skillDefinitions`, vì nhiều tên yêu cầu runtime chưa có như Summon, Revive, Transform, Possession và Heal Lock. Việc giữ catalog tách biệt ngăn Skill placeholder hoặc unsupported action lọt vào Battle.
- 10 elemental semantics được phân loại: Kim/Mộc/Thủy/Hỏa/Thổ/Lôi có registry/primitives hiện hữu; Phong/Quang/Ám/Hỗn Độn giữ `CONTENT_PENDING`, không ánh xạ sai sang nguyên tố khác.
- Mở `Q-MONSTER-006` với mapping đề xuất cụ thể cho Thanh Vân/Huyền Mộc/Đông Hoang và ba boss Bí Cảnh; `Q-MONSTER-007` với weights quality cụ thể; `Q-MONSTER-008` về staged executable-only hay mở rộng Combat Engine.
- Thêm `audit:monster-skill-catalog`; bootstrap và data-schema audit PASS, xác nhận toàn bộ 112 catalog Skill không rò vào executable runtime. Không có database migration.

## 2026-07-21 — Triển khai quái, quality pool và boss Bí Cảnh cho ba map ACTIVE

- Áp dụng `Q-MONSTER-006`: Thanh Vân có 4 quái executable hiện tại, Huyền Mộc 6, Đông Hoang 6; spawn quái thường equal-weight và không còn boss trong Exploration pool. Ba Secret Realm Boss Pool explicit lần lượt dùng Lang Vương, Vạn Niên Thụ Yêu và Bạch Hổ Vương.
- Áp dụng phần weights của `Q-MONSTER-007`: Quality Pool theo Realm/map là `75/20/5`, `55/30/12/3`, `35/35/20/8/2`. Exploration và wave thường Bí Cảnh roll quality qua Random Provider; activity giữ `qualityPoolId`/quality snapshot. Reward bonus chưa áp dụng vì `Q-MONSTER-009` trong file vẫn chưa có câu trả lời/công thức.
- Áp dụng `Q-MONSTER-008`: tạo 16 executable Monster Skill thuộc Beast, Wood Demon và Spirit Creature, chỉ dùng Action được executor hỗ trợ. Skill Book generation loại toàn bộ tag `MONSTER_ONLY`; 96 Skill còn lại tiếp tục catalog-only.
- Bổ sung `Linh Quang` làm direct damage cho Nhân Sâm Tinh/Thạch Linh và `Cắn Xé` cho Lang Vương, bảo đảm mọi quái/boss ACTIVE có ít nhất một offensive Action, tránh AI chỉ heal/buff đến timeout.
- Sửa Bí Cảnh: mode `dungeon` trước đây có thể roll `BOSS` cho wave thường, tạo tên như `Boss Linh Hồ`. Wave trước cuối nay explicit `NORMAL`; chỉ wave cuối dùng Boss Pool và variant `BOSS`. Simulation xác nhận hai wave thường NORMAL thắng, wave cuối là `Boss Lang Vương`; outcome thua boss là kết quả balance hợp lệ, không phải lỗi lifecycle.
- Nâng `audit:thien-mon-content` thành audit chung ba map và thêm alias `audit:three-map-monster-content`. Audit khóa 16 normal monster, equal weight, quality boundaries, Skill executable/offensive, ba boss, boss không quality và cấu trúc wave Bí Cảnh.
- Mở `Q-MONSTER-010`: chưa đưa Phong Lang vào Thanh Vân vì WIND/dodge đang `CONTENT_PENDING`; không tự ánh xạ WIND sang LIGHTNING. Phần còn lại chạy độc lập.
- Verification PASS: monster skill catalog `16 executable/96 pending`, monster quality runtime, three-map content, data-schema alignment, architecture boundaries, Exploration simulation, Secret Realm simulation và PostgreSQL activity harness với đủ 22 migration. Không có migration mới trong gói content này.

## 2026-07-21 — Thiết Giáp Lang và reward-quality policy

- Ghi nhận `Q-MONSTER-009 = B`: reward chance dùng multiplier riêng theo quality, công thức relative và cap 100%; `CURRENCY` không đổi, `ITEM/EQUIPMENT/SKILL/CULTIVATION_ART` là allowlist. Policy nằm trong `monster_quality_tiers.json`, validator khóa formula/allowlist/cap.
- `RewardTableService` resolve effective chance từ `qualityRewardChanceBonusPercent` trong activity snapshot. Exploration truyền đúng bonus của Monster plan; không đổi quantity, grade pool hoặc currency. Runtime đã sẵn sàng nhưng các tier vẫn trả bonus 0 cho tới khi `Q-MONSTER-011` chốt mười giá trị, tránh tự áp balance chưa duyệt.
- Ghi nhận `Q-MONSTER-010 = A`: thêm Thiết Giáp Lang hệ Kim, AI phòng thủ, skill explicit Cắn Xé/Gầm Thét và entry equal-weight vào Thanh Vân. Tổng content ba map là 17 quái thường và 3 boss Bí Cảnh.
- Kiến trúc Element là data-driven đối với ID/reference/content, nhưng mechanic mới vẫn cần primitive runtime. Mở `Q-ELEMENT-001` để chốt WIND chỉ dùng tốc độ hay bổ sung `DODGE_RATE`/hit-miss đầy đủ; không tự thêm parent, relation hoặc dodge formula.
- Audit monster quality, three-map content, data-schema alignment, approved policies, architecture boundaries và Exploration simulation đều PASS. Không có migration PostgreSQL.

## 2026-07-21 — Kích hoạt bonus drop theo phẩm chất và WIND sát thương thuần

- `Q-MONSTER-011` RESOLVED theo A. Mười tier lưu explicit `rewardChanceBonusPercent`: `0/5/10/15/20/30/40/55/75/100`. Validator bắt đủ giá trị không âm; audit xác nhận equipment `8%` ở bonus `100%` thành `16%`, chance `80%` cap thành `100%`, currency `25%` vẫn là `25%`.
- `Q-MONSTER-009` chuyển RESOLVED: Exploration completion lấy bonus từ Monster plan đã reserve, dùng seeded reward RNG và relative multiplier; không đọc lại quality data sau battle cho identity/quality encounter. Quantity, grade pool và currency không bị nhân.
- `Q-ELEMENT-001` RESOLVED theo yêu cầu “Phong hệ là sát thương thuần”. Thêm Element `WIND`, marker `ELEMENT_WIND` và executable Monster Skill `MON_SK_AVIAN_WIND_BLADE`/Phong Nhận với đúng một DAMAGE Action hệ WIND.
- WIND không có mutation parent, generate/counter relation, dodge, speed buff hoặc passive modifier. Exact relation resolver vì vậy coi WIND matchup là neutral; không phát sinh mechanics ngoài câu trả lời.
- Monster Skill catalog hiện có 17 executable và 95 pending; supported elemental semantics tăng lên 7, chỉ LIGHT/DARK/CHAOS còn pending.
- Audit monster quality, monster skill catalog, data-schema alignment, element relation effects, three-map content và architecture boundaries đều PASS. Data bootstrap hiện có 8 Element, 10 authored relation và 91 Skill definition. Không có migration PostgreSQL.

## 2026-07-21 — Khởi động giai đoạn Discord UI

- Audit 22 slash command và phân loại panel có session, response tĩnh và placeholder disabled. Ghi kết quả/invariant/verification vào `docs/09_APPLICATION/010_DISCORD_UI_AUDIT.md`.
- Phát hiện UI hiện tại thiếu shared theme/presenter, tiếng Việt không đồng nhất, navigation bị phân tán và mỗi command tự xử lý empty/error/expired state.
- Giữ nguyên contract đã chốt: `/hoso` public allowlist, management/action ephemeral, owner-only component, mutation có preview/confirm, Discord không chứa business logic.
- Mở `Q-UI-001` để chọn dashboard nhân vật, command rời hay dashboard hành trình. Chưa refactor navigation trước quyết định; foundation token/formatter có thể tiếp tục độc lập.

## 2026-07-21 — Dashboard `/nhanvat` 5 tab

- `Q-UI-001` RESOLVED theo A. `/nhanvat` được nâng từ 4 tab build rời thành dashboard trung tâm gồm Tổng quan, Tu luyện, Trang bị, Hành trình và Kho đồ; 22 slash command hiện hữu vẫn được giữ làm shortcut/deep link.
- Thêm `DiscordUiTheme` dùng chung: domain color tokens, Unicode progress bar, bullet/empty state, text truncation theo giới hạn Discord, base embed và helper disable component.
- Tổng quan hiển thị Realm/Stage, số Luân hồi, Linh Căn/phẩm, Linh Thạch và battle stat. Tu luyện hiển thị lazy preview, progress, tốc độ, công pháp/effect. Trang bị hiển thị loadout/stat/effect. Hành trình hiển thị current map, adjacent access và activity. Kho đồ tổng hợp equipment/stack, kỹ năng và công pháp.
- Dashboard lấy management profile, inventory view và current-map view; không query repository trực tiếp hoặc chứa gameplay. Map query lỗi cục bộ degrade thành empty-state thay vì làm hỏng toàn dashboard.
- Navigation dùng đúng một row 5 button, custom ID `nhanvat:<interactionId>:<tab>`, owner-only qua `ComponentSession`. Tab active bị disable; timeout giữ tab cuối, đổi footer hết hạn và disable toàn bộ button.
- Thêm `audit:character-dashboard`: render đủ 5 tab, kiểm tra unique ID, Discord title/description/field/row limits, initial/timeout command lifecycle và expired state. Component session, architecture boundaries và offline 22-command serialization đều PASS.
- Shell hiện trỏ Node 14 nên không load được dependency Discord hiện tại. Verification được chạy bằng Node 20.19.2 đã cài sẵn; project bổ sung `.nvmrc` và `engines.node >=20.19.0` để khóa runtime hỗ trợ. Không thay dependency hoặc database schema.

## 2026-07-21 — Làm lại tab Tổng quan và Tu luyện

- Lưu đề xuất bộ 30–40 icon MVP tại `docs/09_APPLICATION/011_UI_ICON_PACK_PROPOSAL.md`, trạng thái `DEFERRED`. Chưa tạo registry/placeholder hoặc làm UI phụ thuộc asset chưa tồn tại.
- Sửa semantics read model: trước preview lưu riêng `persistedCultivation`; sau lazy evaluation expose `projectedCultivation`, `earned`, `seconds`, `gainPerMinute`, full-efficiency và overflow gain. Preview không mutate RuntimePlayer/database.
- Tab Tổng quan bỏ bố cục ba field rời khó quét; chuyển thành Đạo cơ, Tài nguyên, Chiến lực, trạng thái tu luyện và subtitle current map. Tu vi được ghi rõ là “dự kiến”, phần chưa nhận hiển thị riêng.
- Tab Tu luyện hiển thị Đã lưu → Chờ nhận → Sau khi nhận, thời gian bế quan, tốc độ thực `tu vi/phút`, phân bổ full/overflow, số còn thiếu và tỷ lệ đột phá. Chỉ Effect cultivation speed xuất hiện trong phần công pháp, không trộn battle Effect.
- `/nhanvat` vẫn read-only; `/tuvi` tiếp tục sở hữu collect và breakthrough mutation. Audit dashboard, approved policies và data-schema alignment PASS sau thay đổi.

## 2026-07-21 — Phân tích thuộc tính cộng thêm trên Tổng quan

- Xác nhận `EffectResolver.aggregateEffects()` hiện đã gộp theo `stat:mode`: additive mode cộng giá trị, `mul_total` nhân multiplier và giữ danh sách source. Equipment chỉ đóng góp khi đang mặc; fixed effect + affix đều đi qua `Equipment.getEffects()`. Công Pháp đang vận hành đi qua `CultivationArt.getEffects()`.
- Không thể dùng thẳng `player.effects` cho yêu cầu mới vì collection này còn chứa Realm, Passive Skill, Tông Môn/Linh Căn và active buff. Lọc sau aggregate cũng không an toàn khi cùng group đã trộn nhiều source.
- Hướng đúng là tạo projection riêng từ raw Equipment + Cultivation Art effects tại application read-model boundary, aggregate bằng `EffectResolver`, rồi Discord chỉ format DTO.
- Mở `Q-UI-002` để chốt chỉ hai nguồn, toàn bộ source, hay tổng kèm breakdown. Chưa thay đổi code trong lượt phân tích.

## 2026-07-21 — Hiển thị tổng effect Trang bị + Công Pháp

- `Q-UI-002` RESOLVED theo A. Thêm `attributeBonuses` vào management read model, lấy duy nhất raw effect của trang bị đang mặc và Công Pháp đang vận hành trước khi aggregate.
- Cộng dồn effect theo canonical key `stat:mode`: additive mode cộng giá trị; `mul_total` nhân multiplier; flat và percent không bị trộn. Projection giữ `sources` để có thể bổ sung breakdown sau này nhưng UI hiện chỉ hiển thị tổng.
- Tab Tổng quan thêm field `Thuộc tính cộng thêm`, format tỷ lệ decimal thành `%` qua `EffectFormatter`. Không dùng `player.effects`, nên Realm, Passive Skill, Tông Môn/Linh Căn, active buff và trang bị chưa mặc không lọt vào phạm vi đã duyệt.
- Public `/hoso` giữ nguyên allowlist; thay đổi chỉ mở rộng management view `/nhanvat`. Không có database migration hoặc mutation.

## 2026-07-21 — Bổ sung effect Linh Căn vào Tổng quan

- Chủ dự án mở rộng `Q-UI-002`: `attributeBonuses` nay gồm trang bị đang mặc, Công Pháp đang vận hành và effect Linh Căn/phẩm chất Linh Căn.
- `PlayerReadService` gọi trực tiếp `SpiritRootEffectResolver.getCultivationEffects(runtimePlayer)` rồi đưa kết quả vào cùng canonical aggregate. Không đọc toàn bộ `activeBuffs`, nhờ đó effect Tông Môn và buff tạm thời vẫn bị loại khỏi field Tổng quan.
- Linh Căn gốc hiện có `effectIds: []`; các tier Trung/Thượng/Cực/Tiên Phẩm đã có bonus tốc độ tu luyện 5%/10%/20%/35% và sẽ được hiển thị. Kiến trúc vẫn data-driven: effect Linh Căn được thêm sau này qua JSON sẽ tự đi vào projection nếu có passive binding scope `CULTIVATION`.
- Audit projection bổ sung trường hợp effect cùng `stat:mode` từ Equipment + Art + Spirit Root cộng dồn, đồng thời tiếp tục loại trang bị chưa mặc, Passive Skill và buff ngoài phạm vi. Không có migration database.

## 2026-07-21 — Mở rộng hệ thống Linh Căn theo scope

- Audit lại toàn bộ `Q-SPIRITROOT-001..010`, spec, GameData, migration 018–019, reroll service/repository và `/linhcan`. Xác nhận entitlement, quality, seeded reroll, persistence và quality cultivation bonus đã hoàn tất; khoảng trống còn lại là battle identity của 10 template có `effectIds: []`.
- Mở `Q-SPIRITROOT-011` với ba lựa chọn cho battle identity. Đề xuất một static `ENTITY` Effect cho mỗi template, độc lập quality, kèm bảng stat/value để chủ dự án duyệt. Không tự author hoặc kích hoạt mười bonus khi chưa có câu trả lời.
- Mở rộng `SpiritRootEffectResolver` thành pipeline generic: resolve definition/effect theo scope `CULTIVATION`, `ENTITY`, `BREAKTHROUGH`; cung cấp attribute projection và DTO effect có scope cho application/UI. Mọi gameplay vẫn đi qua Core Effect `passiveBindings` và Modifier registry.
- `BattleEntityFactory` nhận `SpiritRootEffectResolver`, đưa `ENTITY` binding vào canonical battle-stat calculation và snapshot `spiritRootEffectIds`, quality ID, affinity/defensive Element. Audit injection xác nhận `ATK +10%` từ resolver biến base 100 thành 110 mà không hard-code Effect thật.
- `PlayerReadService` lấy cả Cultivation + Entity attribute effect từ Linh Căn cho Tổng quan. Không lấy Tông Môn/active buff qua đường này.
- `SpiritRootRerollService.describe()` trả Effect projection theo scope. `/linhcan xem`, preview trước reroll và kết quả sau reroll hiển thị Effect bằng `EffectFormatter`; command không đọc GameData hoặc tính stat.
- Đồng bộ `PHONG_LINH_CAN` với Element `WIND` đã duyệt: affinity và defensive Element đều là WIND. Vì WIND không có authored relation, exact relation resolver vẫn cho matchup neutral; không phát sinh dodge/speed/passive ngầm.
- Nâng Spirit Root spec lên 2.1 và ghi rõ phần battle identity đang blocked bởi `Q-SPIRITROOT-011`. Không có database migration; schema hiện tại đã đủ cho data-driven effect content.

## 2026-07-22 — Phân tích thang 8 phẩm và matching-element damage

- Ghi nhận yêu cầu mới supersede bảng static battle identity đề xuất tại `Q-SPIRITROOT-011`: Linh Căn có loại/affinity và 8 phẩm Hạ/Trung/Thượng/Cực/Thiên/Thánh/Tiên/Thần; phẩm cấp tăng tốc tu luyện và sát thương kỹ năng khi offensive Element trùng affinity.
- Chưa thay registry 5 phẩm đang chạy vì thiếu ba nhóm dữ liệu ảnh hưởng balance/runtime: phần trăm của 8 phẩm, weight theo mốc Luân hồi và phạm vi direct/causal damage cùng thứ tự multiplier. Giữ runtime cũ tránh làm sai odds hoặc đổi sức mạnh Player hiện hữu bằng giả định.
- Mở `Q-SPIRITROOT-012` với curve compatibility đề xuất giữ `0/5/10/20/35%` của các tier hiện hữu, thêm ba stable tier ID và bảng matching-damage thận trọng.
- Mở `Q-SPIRITROOT-013` với pool 6 bracket tổng 100, không hard floor, Thần Phẩm bắt đầu ở đời 40; grant-time bracket, oldest-first và seeded snapshot tiếp tục giữ nguyên.
- Mở `Q-SPIRITROOT-014` về damage semantics. Đề xuất MVP chỉ tăng direct `DAMAGE/CHAIN_DAMAGE` Action thuộc Skill, match theo offensive Element từng Action, không áp NEUTRAL/basic/DOT; multiplier chạy hậu Formula một lần và được snapshot cho replay.
- Phân tích xác nhận dùng action-scoped multiplier hậu Formula sẽ bao phủ cả Formula không tham chiếu `SKD`, trong khi cộng stat `SKD` sẽ bỏ sót các Skill như `LIGHTNING_CHAIN`. Chưa sửa Battle pipeline trước khi chủ dự án chọn.
- Không có code, GameData hay database migration được áp dụng trong bước phụ thuộc quyết định này; các hệ thống độc lập tiếp tục giữ trạng thái đã audit PASS.

## 2026-07-22 — Triển khai 8 phẩm Linh Căn và sát thương đồng điệu

- `Q-SPIRITROOT-012/013/014` RESOLVED theo A. Quality registry revision 2 có 8 tier: Hạ/Trung/Thượng/Cực/Thiên/Thánh/Tiên/Thần. Giữ stable ID bốn tier đầu và `IMMORTAL_GRADE`; thêm `HEAVENLY_GRADE`, `SAINT_GRADE`, `DIVINE_GRADE`.
- Author Effect/Modifier data-driven cho cultivation `0/5/10/20/25/30/35/50%` và matching-element Skill damage `0/2/4/7/10/14/18/25%`. ACTION binding khai báo predicate `ACTION_ELEMENT_MATCHES_SOURCE_AFFINITY`; normalizer/resolver/validator bảo toàn và kiểm tra contract, không suy số từ order.
- Pool `SPIRIT_ROOT_REBIRTH_QUALITY_V1` nâng revision 2 với sáu bracket liên tục và đủ 8 entry tổng 100. Grant-time bracket, oldest-first entitlement, seeded RNG, request hash revision và exact-duplicate rejection giữ nguyên. Thần Phẩm chỉ roll từ đời 40 với weight 2%.
- `BattleEntityFactory` snapshot affinity, quality và ACTION effect. `ActionScopedElementEffectEngine` chỉ match direct DAMAGE/CHAIN_DAMAGE thuộc Skill, Element khác NEUTRAL và thuộc root affinity; duplicate affinity không nhân nhiều lần.
- `ActionExecutor` nhân bonus hậu Formula đúng một lần trước khi `receiveDamage`; result giữ before amount/multiplier/effect IDs. `ExecutionContext` và event `SPIRIT_ROOT_AFFINITY_DAMAGE_APPLIED` giữ identity để replay/audit. DOT/status, supplemental Effect, basic attack và mismatch không hưởng.
- `/linhcan` gắn nhãn ACTION là `Kỹ năng cùng hệ`, odds preview tự render đủ 8 phẩm. `/nhanvat` hiển thị conditional affinity bonus riêng trong field thuộc tính, không aggregate nhầm với global Final Damage.
- Phục hồi `THIEN_LINH_CAN` 1% bị thiếu khỏi `spirit_roots.json`; registry trở lại invariant 10 template/tổng weight 100 theo spec khóa. `PHONG_LINH_CAN` tiếp tục dùng WIND.
- Không cần migration PostgreSQL: quality ID được lưu bằng TEXT không có enum/check-list. Spirit Root spec nâng lên 3.0.
- Verification PASS bằng Node 20.19.2: Spirit Root foundation, reroll runtime/idempotency, `/linhcan` command, matching-element/Element Relation integration, `/nhanvat` dashboard, approved policies, data-schema alignment, architecture boundaries, Battle simulation và Player progression simulation.

## 2026-07-22 — Sửa base tu luyện thành 60/phút

- Chủ dự án làm rõ base canonical phải là `60 tu vi/phút`, tương đương `1 tu vi/giây`; cấu hình cũ `baseGainPerMinute = 1` làm tốc độ thấp hơn 60 lần.
- Sửa duy nhất nguồn balance `cultivation_rules.json` lên revision 2/base 60. `Player.calculateOfflineCultivation()` đã đúng công thức `elapsedSeconds / 60 × gainPerMinute`, nên không đổi calculator và không tạo conversion/tick ở Discord.
- Effective rate tiếp tục nhân toàn bộ Effect hợp lệ. Với công pháp khởi đầu +25%, base 60 tạo `75/phút`; 10 phút preview tạo 750 tu vi trước overflow.
- Validator khóa `rateUnit = MINUTE` và `baseGainPerMinute = 60`; approved-policy audit khóa cả effective rate và continuous elapsed calculation. Không cần migration database.
- Verification PASS bằng Node 20.19.2: approved policies, data-schema alignment, character dashboard, Player progression simulation và architecture boundaries.

## 2026-07-22 — Phân tích random phẩm cấp tại `/start`

- Xác nhận `/start` hiện random loại Linh Căn nhưng cố định phẩm cấp `LOWER_GRADE` theo quyết định cũ `Q-SPIRITROOT-008`.
- Yêu cầu mới supersede phần phẩm cấp cố định, nhưng pool hiện không có bracket cho `rebirthCount = 0`; bracket đầu tiên chỉ nhận đời 1–2. Không tự lấy tỷ lệ đời 1 cho tân thủ vì đây là thay đổi balance quan trọng.
- Mở `Q-SPIRITROOT-015` với ba phương án; đề xuất thêm bracket khởi đầu `55/30/12/3/0/0/0/0%`, tái sử dụng `SpiritRootQualityRoller` và hai RNG độc lập cho loại/phẩm. Phần triển khai `/start` tạm dừng chờ chủ dự án chọn.
- Chủ dự án chọn A. Pool tăng revision 3 và bổ sung `REBIRTH_0_START`; validator yêu cầu dải bracket liên tục từ đời 0 đến open-ended.
- `PlayerStartService` bỏ constant Hạ Phẩm, dùng chung `SpiritRootQualityRoller` ở đời 0. Loại và phẩm dùng hai lần gọi RNG độc lập; quality được persist cùng payload tạo Player và embed `/start` hiển thị kết quả thật.
- Audit starter dùng RNG tuần tự để chứng minh loại Mộc và quality Trung Phẩm được roll độc lập. Player hiện hữu/backfill không đổi; không cần migration PostgreSQL.
- Verification PASS bằng Node 20.19.2: Spirit Root foundation, data-schema alignment/starter payload, reroll runtime/idempotency, `/linhcan` command và architecture boundaries.

## 2026-07-22 — Sửa hiển thị tốc độ tu luyện sau đột phá

- Điều tra xác nhận công thức runtime không có nhánh giảm tốc: đột phá tiểu tầng giữ nguyên multiplier, đột phá đại cảnh giới tăng multiplier theo Realm. Persistence đột phá không reset Công Pháp, Linh Căn hoặc trang bị.
- Phát hiện `/tuvi` gắn sai đơn vị: presenter hiển thị `player.cultivationSpeed` (hệ số vô thứ nguyên, ví dụ `1.25`) dưới nhãn `Tu vi / phút`, trong khi `/nhanvat` dùng đúng `gainPerMinute` (ví dụ `75`). Điều này khiến số quan sát giữa các màn hình trông như bị giảm.
- `renderCultivationEmbed()` nay dùng canonical `afkData.gainPerMinute` và `displayDecimal`; không tự nhân lại base hoặc modifier tại Discord boundary.
- Character dashboard audit khóa trường hợp multiplier `1.2` nhưng rate `75/phút`, buộc `/tuvi` hiển thị 75. Approved-policy audit khóa invariant: tiểu tầng không giảm rate và đại cảnh giới phải tăng rate.
- Verification PASS bằng Node 20.19.2: character dashboard/`/tuvi`, approved policies và architecture boundaries. Không cần migration database.

## 2026-07-22 — Sửa chỉ số SPD bị giảm khi đột phá

- Làm rõ báo lỗi nói về battle stat `SPD/Tốc Độ`, không phải cultivation speed. Root cause: `PlayerStartService` không truyền base stats khi tạo Player nên PostgreSQL dùng default legacy `ATK 10 / DEF 10 / HP 100 / SPD 10`; lần đột phá Luyện Khí tầng 1 → tầng 2 tính lại theo GameData thành `40/20/200/5`, khiến riêng SPD giảm 10 → 5.
- `/start` nay resolve Realm có order thấp nhất và toàn bộ base stat tầng 1 bằng `RealmStageValue`, rồi `PlayerRuntimeRepository.createPlayer()` persist explicit `realm_id`, `realm_stage`, `base_atk/def/hp/spd` trong cùng transaction tạo nhân vật. Không còn phụ thuộc default legacy.
- Thêm migration `023_repair_starter_realm_stats.sql` cho Player cũ chưa đột phá: chỉ match chính xác đời 0 + Luyện Khí tầng 1 + nguyên bộ default legacy, rồi đưa về canonical `40/20/200/5`. Player đã tiến triển, đã luân hồi hoặc có stat khác không bị sửa.
- Giữ nguyên bảng tỷ lệ Linh Căn hiện có do chủ dự án đã chỉnh (`1/3/3/3/12/12/12/12/12/30`); cập nhật fixture boundary và Spirit Root spec theo cấu hình hiện tại, không ghi đè GameData.
- Verification PASS bằng Node 20.19.2: data-schema/starter payload, Spirit Root foundation, approved policies, database foundation/migration discovery và architecture boundaries.

## 2026-07-22 — Phân tích chỉ số không tăng khi đột phá

- Xác nhận `BreakthroughService` vẫn tính và persist `newStats`; lỗi quan sát không nằm ở câu SQL update. `RealmStageValue` thực thi đúng ADR2-020: `FLOOR(initial × growthPerStage^(stage-1))`.
- Phát hiện curve Realm không liên tục: Luyện Khí dùng factor 1.0 nên tiểu tầng không tăng; các Realm sau dùng 1.5 cho HP/ATK/DEF nên stage 10 khoảng 38 lần stage 1 nhưng Realm kế chỉ có initial khoảng 2.3 lần, dẫn tới giảm mạnh ở major transition. SPD factor 1.0 nên không tăng theo tầng, và Đạo Tổ nhảy bất thường từ 109 lên 79993.
- Mở `Q-PROGRESSION-010` vì sửa curve là quyết định balance lớn và có nhiều semantics. Đề xuất nội suy hình học giữa các Realm để mọi transition tăng deterministic; chưa thay formula/GameData/migration trước khi chủ dự án chọn và xác nhận final-Realm/SPD Đạo Tổ.
- Chủ dự án cung cấp curve một phần: tiểu tầng ×1.2/major ×1.7, với ngoại lệ ví dụ Luyện Khí minor ×1.1 và Luyện Khí → Trúc Cơ ×1.5. Ghi bổ sung vào `Q-PROGRESSION-010`; chưa áp dụng vì còn phải xác nhận compound hay linear-on-base, phạm vi bốn stat và việc hai hệ số đầu game có phải ngoại lệ duy nhất.
- Chủ dự án xác nhận đầy đủ: compound/FLOOR mỗi transition, áp HP/ATK/DEF/SPD; Luyện Khí minor ×1.1, major đầu ×1.5, từ Trúc Cơ minor ×1.2 và major ×1.7. `Q-PROGRESSION-010` chuyển RESOLVED.
- `progression_rules.json` revision 2 lưu factor bằng rational numerator/denominator. Thêm `RealmStatProgressionCalculator` dùng BigInt, derive từ base Luyện Khí tầng 1 và bỏ authored stat initial của Realm 2–15; required cultivation/gain vẫn dùng `RealmStageValue` cũ.
- Nối calculator vào `/start`, `Player.getStageStats()` cho Breakthrough và reset Luân hồi trước `RebirthStatCalculator`. Mốc khóa: LK1 `200/40/20/5`, LK2 `220/44/22/5`, LK10 `468/89/42/5`, TC1 `702/133/63/7`, TC2 `842/159/75/8`, KĐ1 `6143/1149/537/44`.
- Migration 024 tạo policy revision và recursive stat curve cho 15 Realm × 10 Stage, rồi reconcile HP/ATK/DEF/SPD của mọi Player cùng bonus sqrt-Rebirth; new Player mặc định revision 2.
- Verification PASS bằng Node 20.19.2: Realm stat progression (149 transition), approved policies/minor breakthrough persistence, starter payload, Rebirth runtime, database foundation và architecture boundaries. PostgreSQL progression harness PASS trên schema cô lập với đủ 24 migration, xác nhận migration 024 chạy được trên PostgreSQL thật.

## 2026-07-22 — Chuẩn hóa UI battle PvE theo Hybrid Model

- Đọc toàn bộ `docs/BATTLE_GAMEPLAY.txt` và áp dụng phân tầng UX: Thám hiểm/Du ngoạn không chạy message-edit animation; Bí cảnh chỉ animate wave có `type = BOSS`. Wave thường tiếp tục được tổng kết trực tiếp trong kết quả Bí cảnh.
- `BattleLogAnimator` đổi default delay từ 900ms thành 1300ms để phù hợp rate-limit guidance và default rolling window từ 12 xuống đúng 5 log mới nhất. `limitEntries()` dùng tail slice; dòng thứ 6 tự loại dòng đầu.
- Xóa HP bar khỏi mọi battle action text. Embed battle đặt hai HP field inline `Đạo hữu/Đối thủ` trước field `Diễn biến`, nên thanh máu luôn nằm trên log.
- `BattleEngine` snapshot initial HP/maxHP trong entry `Battle started`. Animator giữ frame HP riêng, áp damage/heal `remainingHP` theo từng log; boss Bí cảnh bắt đầu đúng carried HP từ wave trước và không hiển thị final HP ngay từ frame đầu.
- Kết quả tĩnh Thám hiểm/Du ngoạn vẫn kèm final battle embed với hai HP bar và tối đa 5 diễn biến cuối. Kết quả Bí cảnh sau animation giữ final boss battle embed cùng bảng tổng kết wave/reward.
- Thêm `auditBattlePresentation.js`: khóa HP fields đứng đầu, log không có HP tile, rolling 5 entry, initial/intermediate/final HP frame và routing realtime chỉ cho boss Bí cảnh.
- Verification PASS bằng Node 20.19.2: battle presentation audit, Battle simulation, Exploration simulation, Secret Realm simulation, data-schema alignment và architecture boundaries.

## 2026-07-22 — Việt hóa có dấu giao diện battle PvE

- Chuyển toàn bộ chuỗi hiển thị do `BattleLogAnimator` tạo sang tiếng Việt có dấu: nhãn Đạo hữu/Đối thủ, trạng thái, vòng đấu, hành động gây sát thương, hồi máu, tạo khiên, hiệu ứng, kết thúc trận và phần tổng kết.
- Việt hóa màn hình Thám hiểm, Du ngoạn và Bí cảnh, bao gồm tiêu đề, kết quả, độ khó, tiến trình, chiến lợi phẩm, lựa chọn component và thông báo lỗi cho người chơi.
- Chuẩn hóa mã kết quả nội bộ (`VICTORY`, `DEFEAT`, `CLEARED`, `FAILED`) thành nhãn tiếng Việt tại Discord presentation boundary; không thay đổi contract hoặc business logic của service/battle engine.
- Giữ nguyên slash command, custom ID, enum và protocol log nội bộ ở dạng ASCII/tiếng Anh vì đây là định danh kỹ thuật, không phải nội dung hiển thị.
- Cập nhật audit theo nhãn có dấu. Verification PASS bằng Node 20.19.2: kiểm tra cú pháp bốn file UI, battle presentation audit, Battle simulation, Exploration simulation, Secret Realm simulation và architecture boundaries.

## 2026-07-22 — Bật lại real-time cho toàn bộ battle PvE

- Chủ dự án thay đổi yêu cầu trình bày trước đó: Thám hiểm và Du ngoạn tiếp tục phát diễn biến real-time; Bí cảnh phát tuần tự mọi đợt đã chiến đấu, không còn giới hạn animation ở boss.
- Mỗi trận vẫn dùng hai thanh HP cố định trên cùng và rolling window tối đa 5 diễn biến gần nhất. Delay edit giữ 1300ms để dùng chung cơ chế hạn chế tốc độ cập nhật hiện có.
- Bí cảnh resolve từng `waveResult` với metadata wave tương ứng để hiển thị đúng số đợt, tên yêu thú/boss và HP carried của battle snapshot. Sau animation, embed cuối phản ánh đợt cuối thực sự đã diễn ra, kể cả trường hợp thất bại trước boss.
- Giữ toàn bộ nội dung hiển thị bằng tiếng Việt có dấu; business result enum và slash/custom ID không thay đổi.
- Cập nhật `auditBattlePresentation.js` để khóa routing real-time cho Thám hiểm, Du ngoạn và mọi wave Bí cảnh. Verification PASS bằng Node 20.19.2: syntax, battle presentation audit, Exploration simulation, Secret Realm simulation và architecture boundaries.

## 2026-07-22 — Khôi phục tổng kết chiến lợi phẩm sau real-time battle

- Root cause của phần thưởng không xuất hiện: phiên bản UI battle compact hiện tại đã bỏ `BattleLogAnimator.renderFinalEmbed()`, trong khi ba command PvE vẫn gọi method này sau khi animation kết thúc. Lệnh vì vậy lỗi đúng tại bước dựng tổng kết dù reward đã được service apply thành công.
- Khôi phục compatibility method `renderFinalEmbed()` trên animator compact, tái sử dụng `renderEmbed()` với trạng thái hoàn tất; không thay đổi battle engine hoặc reward transaction.
- Khi Thám hiểm/Du ngoạn chiến thắng hoặc Bí cảnh được clear, embed kết thúc trận nay thêm trực tiếp field `🎁 Thu thập được`. Phần thưởng không còn nằm riêng ở embed phía sau và không bị lặp lại.
- `RewardTextFormatter` được Việt hóa mặc định (`Không có chiến lợi phẩm`, `Linh thạch`). Nếu reward table roll rỗng, UI ghi rõ `Không thu thập được vật phẩm nào.` thay vì bỏ trống.
- Audit được đồng bộ với layout compact hiện tại: HP nằm trước log trong description, tối đa 5 dòng, real-time đủ ba activity và cả ba command có reward summary. Battle presentation và architecture boundary audit PASS.

## 2026-07-22 — Rút gọn kết quả `/thamhiem` còn một embed

- Loại bỏ embed tổng kết “Kết quả Thám Hiểm” thứ hai và các formatter/import chỉ phục vụ embed này.
- Final response của `/thamhiem` nay chỉ có battle embed: thanh HP, diễn biến cuối, trạng thái và field `🎁 Thu thập được` khi chiến thắng.
- Không thay đổi reward apply, battle result hoặc UI Du ngoạn/Bí cảnh. Syntax, battle presentation và architecture boundary audit PASS.

## 2026-07-22 — Audit Đánh Thường của quái và phản hồi Effect khống chế

- Xác nhận `SkillManager.createBasicAttack()` đã tồn tại, nhưng `selectSkill()` chỉ fallback sang Đánh Thường khi không có Active Skill hợp lệ. Monster content đều có `skillIds`, nên quái gần như luôn dùng Skill; `monster_ai.json` được snapshot nhưng chưa điều khiển lựa chọn Skill/Basic Attack.
- Không tự đặt tỷ lệ Basic Attack. Mở `Q-MONSTER-012` với phương án đề xuất thêm `basicAttackChance` theo AI profile trong JSON; phần thay đổi action selection bị chặn chờ chủ dự án chọn.
- Xác nhận control runtime đã hoàn chỉnh theo `Q-COMBAT-001`: `STUN/FREEZE = SKIP_ACTION` một lượt, `SILENCE = BASIC_ATTACK_ONLY`; lượt bị skip vẫn chạy TURN_START/TURN_END và Effect expiry. `Lôi Ngục` đã STUN 20%, `Thiên Môn Kiếm Trận` STUN 15%.
- Không tự gắn Effect/rate hàng loạt vào Skill. Mở `Q-COMBAT-015` để chốt author explicit từng Skill hay curve tự động theo hệ/phẩm; content phụ thuộc giữ BLOCKED.
- Bổ sung metadata Effect (`effectName`, `controlDirective`, `tags`) vào battle log summary. UI compact nay hiện `gây <Effect> thành công/thất bại` cho control và dòng `<entity> bị khống chế và mất lượt` khi `SKIP_ACTION` có hiệu lực.
- Verification PASS bằng Node 20.19.2: syntax, battle presentation/control feedback, data-schema alignment gồm one-turn control lifecycle, Battle simulation và architecture boundaries.

## 2026-07-22 — Hiển thị đầy đủ Effect và Chí mạng trong battle

- Xử lý câu trả lời `Q-COMBAT-015 = A`: giữ contract Effect/chance explicit trên từng Skill. Xác nhận content hiện có gồm Lôi Ngục STUN 20%, Thiên Môn Kiếm Trận STUN 15%, Vồ Mồi SLOW 30%, Rễ Trói SLOW 50% và Hoa Phấn Mê Hoặc SILENCE 25%; không tự gắn Effect vào Skill không có bảng content.
- `Q-MONSTER-012` chuyển `ANSWERED` với câu “giống người chơi”, nhưng chưa RESOLVED: Player hiện cũng luôn dùng Active Skill nếu có, nên áp dụng nguyên trạng không tạo lượt Đánh Thường cho quái có Skill. Tỷ lệ Basic Attack tiếp tục bị chặn chờ xác nhận rõ.
- Battle log compact nay ghi rõ `Chí mạng` bên cạnh lượng damage thay vì chỉ có emoji; mỗi damage line có tên mục tiêu.
- Skill cast hiển thị mọi Effect thực tế ngoại trừ Element marker nội bộ: tên Effect, `thành công/thất bại`, phân biệt khống chế và effect thông thường. Element marker vẫn bị ẩn để log không nhiễu.
- Bổ sung format cho Effect tick (`suffers`), nên Thiêu Đốt và các effect damage/heal theo lượt hiện tên, lượng HP thay đổi và cập nhật thanh máu real-time.
- Audit khóa ba feedback mới: control result, Chí mạng và Effect tick. Battle presentation, data-schema/control lifecycle và architecture boundary audit PASS.

## 2026-07-22 — Phân tích nền tảng Item/Craft cho hệ thống Nghề nghiệp

- Rà soát toàn bộ spec Item/Craft trực tiếp liên quan: Item module/template/category/effect, Craft definition/runtime, command spec, roadmap database; đối chiếu GameData, `CraftService`, repository/migration và recipe hiện hành.
- Xác nhận nền tảng đã có: Item Template/Category; inventory stack; recipe data-driven; material + currency cost; Realm gate; atomic PostgreSQL consume/output; ledger; operation id/idempotency; một recipe `CRAFT_BREAKTHROUGH_PILL`.
- Xác nhận tài liệu chưa hề định nghĩa Profession hoặc năm nghề Luyện Đan Sư, Phù Sư, Luyện Khí Sư, Trận Sư, Khôi Lỗi Sư. Craft hiện deterministic/tức thời, một output Item, chỉ khóa Realm; không có profession state/EXP/grade, recipe ownership, success/quality, job timer, tool/facility hoặc slash command Craft thực tế.
- Formation và Puppet chưa có domain runtime tương ứng. Item category chưa có TALISMAN/FORMATION/PUPPET; `item_effects.json` được spec nhắc tới nhưng file nguồn hiện không tồn tại, Item đang nhúng `actions` trực tiếp.
- Mở `Q-PROFESSION-001..009` để chốt: số nghề được học; progression; ranh giới output năm nghề; recipe unlock; success/quality; lazy job; energy/tool; Luân hồi retention; Discord UX.
- Không sửa code/schema/GameData nghề nghiệp trước khi các câu hỏi cục bộ được trả lời. Craft hiện hữu tiếp tục hoạt động độc lập.

## 2026-07-22 — Chuẩn hóa lựa chọn kiến trúc Nghề nghiệp

- Xử lý đủ câu trả lời `Q-PROFESSION-001..009`: Player học cả năm nghề; chín phẩm độc lập; MVP chạy Luyện Đan/Phù/Luyện Khí; Trận Sư/Khôi Lỗi Sư definition-only; unlock recipe hybrid; craft luôn thành công và roll quality; lazy start/claim; không energy/durability; giữ nghề/công thức qua Luân hồi và chặn khi còn job; dashboard `/nghenghiep`.
- Tạo `docs/03_ITEM/009_PROFESSION_SYSTEM_SPEC.md` trạng thái `APPROVED FOUNDATION — BALANCE BLOCKED`, đăng ký stable ID năm nghề, output tagged union, recipe unlock mode, lazy lifecycle, Rebirth policy, Discord boundary và proposed persistence boundaries.
- Cập nhật Craft spec liên kết sang Profession spec. Không giả lập Formation/Puppet bằng Item consumable; output chưa có executor phải fail rõ.
- Chuyển `Q-PROFESSION-001/003/004/007/008/009` sang RESOLVED vì contract đã được phản ánh trong spec. `002/005/006` giữ ANSWERED do còn thiếu số/representation để triển khai.
- Mở follow-up `Q-PROFESSION-010..013`: bảng EXP/Realm gate; quality representation; thời gian/batch/consume; vertical-slice content cho ba nghề ACTIVE.
- Chưa tạo JSON/DDL/runtime trước khi bốn follow-up được trả lời; Craft tức thời hiện hữu không bị thay đổi.

## 2026-07-23 — Triển khai foundation Nghề nghiệp lazy start/claim

- Chuẩn hóa câu trả lời `Q-PROFESSION-010..013`: progression dùng cumulative EXP `0/100/300/700/1500/3100/6300/12700/25500`, recipe EXP `10/20/40/80/160/320/640/1280/2560`, penalty 25% khi recipe thấp hơn từ hai phẩm; Realm gate đi qua chín Realm Luyện Khí → Độ Kiếp.
- Chốt quality MVP chỉ áp dụng cho Equipment; PILL/TALISMAN giữ potency cố định. Chốt duration theo phẩm `1/3/10/30/90/240/600/1440/2880` phút, batch 1–99 tuyến tính, consume input tại start, một slot mỗi nghề, không cancel/offline cap và claim chủ động.
- `Q-PROFESSION-013` duyệt catalog hai Đan/hai Phù/năm vũ khí ngũ hành nhưng chưa cung cấp balance cụ thể. Mở `Q-PROFESSION-014`; không tự author input/cost/Effect/quality pool. Chỉ recipe Phá Chướng Đan hiện hữu được chuyển sang pipeline mới.
- Nâng `009_PROFESSION_SYSTEM_SPEC.md` lên 0.2 và chuyển trạng thái sang `APPROVED FOUNDATION — CONTENT PARTIALLY BLOCKED`. `READY` được định nghĩa là projection theo `ready_at`, không phải status cần tick/write.
- Thêm GameData `professions.json`, `profession_grades.json`, `profession_rules.json`; đăng ký/normalize/deep-freeze vào GameData Manager. Validator bảo vệ stable profession/output boundary, đủ chín phẩm, EXP tăng, Realm reference, batch/lazy/quality policy, recipe profession/grade/unlock/output/input references.
- Mở rộng `CRAFT_BREAKTHROUGH_PILL` bằng `professionId = ALCHEMIST`, Nhất Phẩm, `AUTO_BY_GRADE` và output union `ITEM`; giữ field result legacy để không phá read path cũ trong giai đoạn chuyển tiếp.
- Thêm migration `025_profession_foundation.sql`: `player_professions`, `player_learned_recipes`, `profession_craft_jobs`; NUMERIC cho EXP, JSONB snapshot, operation identity, check constraint và partial unique index một `IN_PROGRESS` job trên mỗi Player + nghề.
- Thêm `ProfessionRepository` và `ProfessionService`. Start khóa Player/progression, validate recipe, tạo job trước rồi debit currency/consume material và ghi ledger trong cùng transaction. Claim khóa job, kiểm tra timestamp, bảo vệ inventory capacity, phát output, cộng EXP/promote theo Realm gate, complete job và idempotent response atomically.
- Luân hồi tiếp tục giữ progression/công thức do không bị xóa trong reset; `RebirthRepository` nay khóa và từ chối nếu còn profession job `IN_PROGRESS`.
- Nối `professionService` vào application bootstrap để Discord chỉ gọi read model/start/claim, không chứa business mutation.
- Hoàn thiện `/nghenghiep` dạng panel ephemeral owner-only: 5 nghề, select recipe, batch preset 1/5/10/25/50/99, hiển thị EXP/nghề phẩm/input/output/duration/active job và nút start/claim/refresh/close. Component interaction ID được truyền làm operation ID; service reload dashboard sau mọi mutation.
- `ExtendedClient` expose `professionService`; offline command-load xác nhận 23 slash command/23 tên duy nhất và serialize `/nghenghiep` thành công.
- Vô hiệu hóa `CraftService.craft()` tức thời bằng `CRAFT_START_CLAIM_REQUIRED`; không còn application path công khai nhận output ngay và bỏ qua lazy job. Simulator Craft được đổi thành contract smoke check cho start/claim.
- Thêm `audit:profession-foundation`, bao phủ registry 5 nghề/3 ACTIVE, linear batch, snapshot consume-at-start, early-claim guard, output + EXP, Realm promotion, penalty và DDL concurrency/operation identity.
- Verification PASS bằng Node 20.19.2: GameData bootstrap/schema alignment, approved policies, architecture boundaries, database foundation, profession/UI audit và component session. PostgreSQL progression harness áp dụng đủ 25 migration trong isolated schema, kiểm tra replay start, early claim rollback, hai claim đồng thời chỉ phát một reward và hai start đồng thời chỉ tiêu input một lần.
- Migration runner đã áp dụng `025_profession_foundation.sql` thành công lên `DATABASE_URL` hiện tại; primary schema sẵn sàng cho `/nghenghiep`.

## 2026-07-23 — Cảnh báo thiếu tài nguyên trên `/nghenghiep`

- Read model recipe bổ sung số dư currency hiện có; material đã có `owned`. Discord projection nhân cả input theo batch đang chọn và so sánh bằng `BigInt`, không dùng `Number` cho currency.
- Panel hiển thị ✅/❌ cạnh tiền và từng nguyên liệu. Nếu thiếu, field `Không đủ nguyên liệu` ghi chính xác số thiếu cùng tỷ lệ đang có/cần.
- Nút `Bắt đầu` bị khóa khi còn bất kỳ shortage nào. Transaction start vẫn kiểm tra lại và trả thông báo `Không đủ tiền tệ/nguyên liệu` nếu số dư thay đổi đồng thời sau khi panel được render.
- Profession audit bổ sung kiểm tra thiếu đồng thời currency/material và khóa UI; syntax/audit PASS.

## 2026-07-23 — Kiểm tra lại Đánh Thường của Monster

- Xác nhận báo cáo vẫn đúng: `SkillManager.selectSkill()` chỉ trả `BASIC_ATTACK` khi không có Active Skill hợp lệ. Nếu có ít nhất một Skill, hàm luôn random trong danh sách Skill và không roll nhánh Đánh Thường.
- `MonsterGeneratorService` cấp Skill cho đủ 33/33 Monster Plan hiện tại; 24 template khai báo `skillIds` explicit, 9 template còn lại nhận Skill từ pool. Vì vậy fallback “không có Skill” không xảy ra trong content hiện hành.
- Kiểm tra deterministic 100 lần trên `TPL_MON_LIGHTNING_002` cho kết quả 100 Skill/0 Basic Attack.
- `monster_ai.json` chỉ có `attackWeight/defenseWeight`; hai field chưa được `SkillManager` sử dụng. `aiProfile` có trong Monster Plan nhưng `BattleEntityFactory` chưa snapshot vào entity, nên hiện không thể áp tỷ lệ Đánh Thường theo AI profile.
- `SILENCE` vẫn ép `BASIC_ATTACK_ONLY` đúng contract control; đây là trường hợp duy nhất quái có Skill dùng Đánh Thường.
- Không tự thêm tỷ lệ vì `Q-MONSTER-012` vẫn ở `ANSWERED`: câu “giống người chơi” đồng nghĩa cả Player và Monster đều luôn dùng Skill khi có, trái với mục tiêu làm quái thỉnh thoảng Đánh Thường. Phần thay đổi tiếp tục chờ chủ dự án chốt phạm vi và tỷ lệ.

## 2026-07-23 — Phân tích và dựng foundation cooldown Skill

- Yêu cầu mới thay thế hướng xác suất Basic Attack tại `Q-MONSTER-012` bằng cooldown riêng trên từng Skill; Basic Attack sẽ là fallback khi không còn Skill khả dụng.
- Mở `Q-COMBAT-016` vì còn nhiều semantics ảnh hưởng lớn: ready-pool hay khóa cả loadout, tick đầu/cuối lượt, STUN/SILENCE có giảm cooldown và ý nghĩa chính xác của N lượt.
- Mở `Q-COMBAT-017` cho bảng balance `cooldownTurns` của 91 Skill canonical: 49 Active và 42 Passive. Không tự suy cooldown theo phẩm/hệ/tag; Passive/Basic Attack cũng chưa bị gán policy khi chưa duyệt.
- Bổ sung field normalized `cooldownTurns` qua Skill GameData, Skill Definition metadata và immutable `BattleSkillFactory`. Compatibility value hiện là 0 nên chưa thay đổi battle live.
- Validator bảo vệ cooldown là safe integer không âm. Skill spec phân biệt policy tĩnh trong template với remaining state battle-local, không persistence PostgreSQL.
- Thêm `SkillCooldownState`: start/get/isReady/tick/exclude/snapshot deterministic, từ chối số âm và không mutate GameData. State chưa được nối vào `BattleEngine` theo blocker `Q-COMBAT-016`.
- Thêm audit `skill-cooldown-foundation`, dùng ví dụ A=3/B=2 để kiểm tra state transition nhưng đồng thời khóa rằng BattleEngine chưa kích hoạt semantics chưa duyệt.

## 2026-07-23 — Kích hoạt runtime cooldown Skill theo lựa chọn A/A

- Chủ dự án chọn `Q-COMBAT-016` phương án A: ready-pool, đúng N lượt chờ, Skill khác vẫn dùng được và chỉ Đánh Thường khi toàn bộ Active Skill đang hồi. Chủ dự án chọn `Q-COMBAT-017` phương án A: cooldown được author explicit theo từng Active Skill; Passive và Basic Attack không cooldown.
- `BattleEntity` sở hữu `SkillCooldownState` battle-local. `SkillManager` loại Skill đang hồi khỏi candidate pool, bắt đầu cooldown sau khi cast và tạo Basic Attack có `cooldownTurns = 0`.
- `BattleEngine` không tick cooldown vừa bắt đầu trong chính lượt cast; các lượt tiếp theo, kể cả STUN, SILENCE và Basic Attack, tick state ở cuối lượt. Runtime phát `SKILL_COOLDOWN_STARTED`, `SKILL_COOLDOWN_TICK`, `SKILL_COOLDOWN_READY`.
- Battle Result snapshot ghi cooldown còn lại; Battle UI hiển thị số lượt hồi ngay trên dòng thi triển Skill.
- Audit cooldown được chuyển từ foundation-only sang runtime-active và kiểm tra deterministic chuỗi A(3) → B(2) → Đánh Thường → Đánh Thường → A.
- Giữ tương thích cho test/custom adapter `skillManager` cũ chưa triển khai hai method lifecycle: BattleEngine chỉ gọi hook cooldown khi adapter cung cấp method; SkillManager canonical luôn cung cấp đầy đủ.
- Xác minh PASS: cooldown runtime, data schema alignment, battle presentation realtime, battle fixed-point, architecture boundaries và monster skill catalog.
- `Q-COMBAT-016` được RESOLVED. `Q-COMBAT-017` vẫn ANSWERED vì chủ dự án chưa cung cấp bảng số lượt cho 49 Active Skill; các Skill hiện hữu tiếp tục compatibility `cooldownTurns = 0`, vì vậy chưa tự thay đổi balance live.

## 2026-07-23 — Author cooldown theo nhóm hành vi Skill

- Chủ dự án duyệt: Skill sát thương cooldown `2`; Skill hồi máu hoặc khống chế cooldown `3`.
- Author explicit `cooldownTurns` cho 32 Active Skill trong `attack_skill_templates.json`: 30 Skill sát thương dùng `2`, hai Skill Thiên Môn có STUN dùng `3`.
- Author explicit 11/17 Monster Skill: sát thương thuần dùng `2`; Skill có SLOW/SILENCE, HEAL hoặc kết hợp Damage + Heal/Control dùng `3`. Với Skill vừa sát thương vừa Heal/Control, nhóm `3` được ưu tiên theo yêu cầu.
- `Gầm Thét` mang Damage + stat Debuff, không mang tag `CONTROL`, nên áp dụng nhóm sát thương `2`.
- Không tự gán sáu Skill thuần Buff/Debuff/Purify vì yêu cầu chưa bao phủ nhóm này. Mở `Q-COMBAT-018`; sáu Skill tiếp tục compatibility `0` cho tới khi được chọn.

## 2026-07-24 — Ưu tiên Skill tự hồi máu/tạo khiên dưới 50% HP

- Bổ sung config `skillRules.activeSkillSelection.selfSustainPriorityBelowHpPercent = 50`; đưa `skillRules` vào canonical GameData và validator giới hạn ngưỡng trong `(0, 100]`.
- `SkillManager` tiếp tục lọc Active Skill theo trigger và cooldown trước. Khi HP hiện tại thấp hơn 50%, candidate pool ưu tiên Skill có action `HEAL`, `ADD_SHIELD` hoặc `SHIELD` nhắm `SELF`.
- Nếu không có Skill tự duy trì sẵn sàng, runtime dùng pool Skill thông thường; cooldown không bị bypass. Đúng 50% không kích hoạt vì yêu cầu là “dưới 50%”.
- So sánh HP dùng fixed-point basis points, không chuyển chỉ số chiến đấu lớn sang JavaScript Number.
- Passive Defense Skill không đi qua Active Skill selection và tiếp tục dùng trigger/condition riêng hiện hữu.
- Audit cooldown PASS thêm các trường hợp: self-heal ở 49%, không ưu tiên ở đúng 50%, self-shield ở HP thấp và fallback khi Skill hồi máu đang cooldown. Data schema alignment PASS.

## 2026-07-24 — Giới hạn tối đa hai Skill cho quái

- Chủ dự án duyệt mỗi quái có tối đa hai Skill, với các vai trò hồi máu/khiên/khống chế và tấn công.
- Bổ sung policy data-driven `monsterRules.skillSlots.maxSkills = 2`.
- Audit hiện trạng ban đầu trên toàn bộ canonical data: 29/33 Monster Template đã có tối đa hai Skill; bốn template có ba Skill.
- `MON_SPIRIT_GINSENG` được giảm từ `Linh Quang + Linh Khí Trị Liệu + Gia Tốc` thành `Linh Quang + Linh Khí Trị Liệu`.
- `MON_SPIRIT_STONE` được giảm từ `Linh Quang + Tịnh Hóa + Sinh Mệnh Chi Tuyền` thành `Linh Quang + Sinh Mệnh Chi Tuyền`; Skill sau đã gồm Heal + Purify nên không mất khả năng tịnh hóa hoàn toàn.
- Hai boss hệ Thú còn ba Skill gồm buff, debuff và tấn công. Mở `Q-MONSTER-013` để chọn cặp giữ lại; chưa bật validator/hard guard vì làm vậy sẽ khiến GameData hiện tại fail trước khi quyết định boss được duyệt.
- Sau phần độc lập, 31/33 template đạt giới hạn; data schema alignment và monster skill catalog audit PASS. Hai vi phạm còn lại chính xác là hai boss đang chờ `Q-MONSTER-013`.

## 2026-07-24 — Hoàn tất giới hạn hai Skill cho toàn bộ quái

- Chủ dự án chọn `Q-MONSTER-013` phương án A. `MON_BOSS_WOLF_KING` và `MON_BOSS_WHITE_TIGER_KING` cùng giữ `Cắn Xé + Vương Giả Uy Áp`; loại `Cuồng Bạo` khỏi loadout nhưng không xóa Skill definition.
- Toàn bộ 33/33 canonical Monster Template hiện có tối đa hai Skill.
- `GameDataValidator` bắt buộc `monsterRules.skillSlots.maxSkills` là positive safe integer và từ chối template vượt giới hạn.
- `MonsterGeneratorService` áp dụng cùng policy cho cả explicit `skillIds` và pool-generated loadout; fail-fast bằng `MONSTER_SKILL_LIMIT_EXCEEDED` thay vì âm thầm cắt Skill.
- `Q-MONSTER-013` chuyển RESOLVED.
- Xác minh PASS: syntax của Generator/Validator/audit, `auditMonsterSkillCatalog` trên 33 template và `auditDataSchemaAlignment`.

## 2026-07-24 — Hòa sau giới hạn 15 hiệp và UI tiên hiệp

- Chủ dự án thay thế policy `TIMEOUT` cũ: toàn bộ battle có giới hạn canonical 15 hiệp; hết hiệp 15 không có winner được tính `DRAW`.
- Thêm data-driven `battle/battle_rules.json` với `roundLimit = 15`; registry/normalizer/validator bắt buộc positive safe integer.
- `BattleEngine` dừng ngay cuối hiệp 15, không tạo hiệp 16; phát `BATTLE_ROUND_LIMIT_REACHED` thay cho `BATTLE_TIMEOUT`.
- `BattleResult` trả `outcome = DRAW`, `isDraw = true`, `drawReason = ROUND_LIMIT`, không winner/loser và báo đúng `rounds = 15`.
- Exploration và từng wave Secret Realm map kết quả không winner thành `DRAW`; Secret Realm tổng cũng trả `DRAW` nếu wave dừng do hòa. Không trao reward chiến thắng cho kết quả hòa.
- Chuẩn hóa giới hạn Thám Hiểm, Du Ngoạn và mọi độ khó Bí Cảnh về 15 hiệp; simulator mặc định cũng dùng 15.
- UI dùng màu hòa riêng và câu: “Sau 15 hiệp giao tranh, thiên cơ vẫn chưa định, đôi bên bất phân thắng bại.” Không đẩy `TIMEOUT`, error code hoặc technical error ra người chơi.
- Thêm audit `battle-round-limit`: mô phỏng hai entity không thể hạ nhau, xác nhận 15 hiệp/30 lượt hành động, outcome DRAW, event audit và câu UI. Battle presentation và data schema alignment cùng PASS.

## 2026-07-24 — Lời hòa riêng cho Thám Hiểm

- Giữ nguyên outcome `DRAW` và policy 15 hiệp; chỉ tách presentation copy theo activity.
- `BattleLogAnimator` nhận optional `drawMessage`, dùng nhất quán trong realtime frame và final embed.
- `/thamhiem` dùng câu riêng: “Mười lăm hiệp đã qua, sơn lâm mịt mờ, đạo hữu và yêu thú vẫn bất phân cao hạ.”
- Du Ngoạn, Bí Cảnh và battle chung tiếp tục dùng câu “thiên cơ chưa định”.

## 2026-07-24 — Làm lại giao diện Túi Trữ Vật

- Phân tích `/tuido` cũ: chỉ render `items.slice(0, 10)`, mỗi item dùng một embed field, lặp tên/phẩm chất qua `getDisplayString()`, lộ runtime UUID và không báo rằng item sau vị trí 10 đã bị ẩn.
- Tạo `InventoryPresentation` tách khỏi command: summary Linh thạch, usage/capacity, số trang bị/stack; phân trang 5 mục để giữ description an toàn dưới giới hạn Discord.
- Thêm bộ lọc Tất cả/Trang bị/Tiêu hao/Nguyên liệu/Bí kíp bằng button owner-only. Chuyển filter về trang đầu; navigation clamp page; timeout hai phút gỡ components.
- Sorting ưu tiên trang bị đang mặc, sau đó type, rarity order và tên tiếng Việt. Runtime ID không còn xuất hiện trong UI.
- Trang bị hiển thị slot, grade/quality, trạng thái đang mặc và tối đa bốn Effect bằng `EffectFormatter`; phần trăm lưu dạng decimal hiển thị dạng `%`. Stack quantity và Linh thạch dùng locale `vi-VN`.
- `PlayerReadService.getInventoryView()` bổ sung `slotUsage` từ canonical Runtime Inventory và `slotCapacity` từ `itemRules`, không ghi database.
- Thêm `audit:inventory-presentation`; PASS các contract equipped-first, wallet/capacity, percentage, hidden ID, category, pagination và expired cleanup. Architecture, schema, approved policy, character dashboard và component session audit cùng PASS.

## 2026-07-24 — Chọn và trang bị đồng thời nhiều slot

- Xác định lỗi `/trangbi`: command chỉ giữ một biến preview đơn, nên lựa chọn slot sau ghi đè lựa chọn slot trước trên UI.
- `EquipmentService.previewEquipmentLoadout()` nhận một bộ instance ID, bắt buộc tối đa một lựa chọn cho mỗi equipment type và tính lại chỉ số dự kiến từ toàn bộ loadout.
- `EquipmentService.equipLoadout()` khóa Player một lần, settle tu luyện một lần và áp dụng toàn bộ slot đã thay đổi trong cùng Unit of Work/transaction; lỗi ở bất kỳ món nào rollback cả bộ.
- Bốn select menu giữ lựa chọn độc lập theo equipment type. Nút xác nhận đổi thành `Trang bị đã chọn` và chỉ bật khi bộ lựa chọn có thay đổi.
- Embed hiển thị đồng thời các món đang chọn, món bị thay thế, toàn bộ Effect và chênh lệch chỉ số tổng hợp. Sau khi lưu, preview vừa áp dụng vẫn được giữ lại và phần hiệu ứng hiện tại lấy từ Player đã reload.
- Mở rộng `audit:equipment-type-slots` để chọn Vũ khí rồi Giáp, xác nhận lựa chọn đầu không mất và ATK/DEF dự kiến cùng được cộng. Syntax check và audit đều PASS.

## 2026-07-24 — Hợp nhất tháo trang bị vào bảng Trang bị

- Mỗi select menu của `/trangbi` có option `— Tháo [loại] —`; khi slot vốn trống, option hiển thị `[loại] để trống`.
- Chọn option trống tạo một thay đổi loadout chính thức thay vì chỉ thay đổi presentation. Preview loại Effect của món đang mặc và hiển thị phần chỉ số giảm trước khi xác nhận.
- `previewEquipmentLoadout()` và `equipLoadout()` hỗ trợ đồng thời danh sách món cần mặc và danh sách type cần tháo; ngăn cùng một type vừa mặc vừa tháo.
- Thao tác hỗn hợp, ví dụ mặc Vũ khí mới và tháo Giáp, dùng chung Player row lock, một lần settle tu luyện và một Unit of Work/transaction.
- Giữ `/thaotrangbi` làm shortcut tương thích; luồng quản lý chính không còn bắt buộc chuyển sang command khác.
- Audit equipment kiểm tra option `EMPTY_ARMOR`, preview tháo, persistence tháo và việc lựa chọn Vũ khí trước đó vẫn được giữ. Syntax và audit PASS.

## 2026-07-25 — Phân tích mở rộng thu thập tài nguyên theo map

- Xác nhận Gathering lazy runtime hiện đã có transaction/idempotency, start/claim, `ready_at`, Reward System và unique constraint một Gathering active/player; chưa có slash command cho người chơi.
- Dữ liệu hiện chỉ có hai Gathering toàn cục: Linh Thảo mở từ Luyện Khí và Mining mở từ Kết Đan. Chúng chưa tham chiếu map hiện tại.
- Item canonical mới chỉ định nghĩa `SPIRIT_HERB`; Reward Table Gathering còn tham chiếu `MYSTIC_HERB`, `IMMORTAL_HERB`, `SPIRIT_IRON`, `MYSTIC_IRON`, `STAR_IRON` nhưng các Item Template tương ứng chưa tồn tại. Đây là content foundation chưa hoàn chỉnh, không được dùng làm bảng cấp mới.
- Ghi nhận yêu cầu đã xác định: tài nguyên gồm Linh Thảo/Linh Khoáng, có cấp bậc, phụ thuộc map; Thanh Vân Sơn Mạch/Luyện Khí có ít nhất `Tụ Linh Thảo` và `Thanh Tâm Thảo`.
- Chưa tự tạo 58 tên tài nguyên còn thiếu, tỷ lệ, sản lượng, duration hoặc unlock Mining. Mở `Q-GATHERING-005..009` cho mô hình tier, ma trận content 15 map, cách chọn/roll, giao diện start/claim có khả năng khôi phục sau restart và baseline balance.
- Các phần runtime phụ thuộc quyết định mới tạm dừng; Gathering transaction foundation độc lập được giữ nguyên.

## 2026-07-27 — Duyệt kiến trúc Gathering và soạn catalog tài nguyên

- Chủ dự án duyệt toàn bộ phương án A của `Q-GATHERING-005..009`: tier theo map, hai Thảo + hai Khoáng mỗi map, chọn nhóm rồi roll pool, `/thuthap` dashboard start/claim và baseline Thảo 30 giây/Khoáng 60 giây với weight `75/25`, quantity `1–3/1`.
- Cập nhật năm câu hỏi sang `ANSWERED`; chưa đánh dấu `RESOLVED` trước khi code/audit hoàn tất.
- Thêm `docs/03_ITEM/010_GATHERING_RESOURCE_CATALOG_PROPOSAL.md`: catalog đề xuất đủ 60 tài nguyên cho 15 map, gồm immutable ID, tên hiển thị và mô tả/công dụng định hướng.
- Giữ đúng gate của `Q-GATHERING-006`: catalog ở trạng thái `PROPOSED`; chưa author Item Template, Reward Table, recipe hoặc thay đổi inventory live cho tới khi chủ dự án duyệt tên/mô tả.

## 2026-07-27 — Kích hoạt thu thập Linh Thảo/Linh Khoáng theo map

### GameData và content

- Chủ dự án duyệt catalog 60 tài nguyên. `010_GATHERING_RESOURCE_CATALOG_PROPOSAL.md` chuyển `APPROVED`; thêm runtime spec `011_MAP_GATHERING_RUNTIME_SPEC.md`.
- Thêm `gathering_rules.json`: hai family HERB/ORE, duration 30/60 giây, một active run, tier theo map và role PRIMARY/RARE `75/25`, quantity `1–3/1`.
- Thêm `resource_catalog.json`: 60 MATERIAL Item cho đủ 15 map; mỗi resource có map, tier, family, role, tên và mô tả.
- GameData normalizer merge resource vào canonical `itemTemplates`, sinh 30 `mapGatheringPools`, 30 Reward Table và 30 Gathering Template từ JSON. Ba map ACTIVE được bổ sung activity `GATHERING`; 12 map pending giữ content pending.
- Loại hai Gathering/Reward Table global legacy `HERB_GATHERING`/`MINING` có reference tới Item chưa tồn tại. Giữ `SPIRIT_HERB` vì recipe nghề nghiệp hiện hữu vẫn dùng nó; chưa tự migration recipe/inventory ngoài phạm vi quyết định.
- Reward System bổ sung selection mode `WEIGHTED_ONE`; mỗi lần roll chọn đúng một entry theo weight rồi roll quantity. Các Reward Table cũ tiếp tục `INDEPENDENT_CHANCE`.
- Validator bắt đủ 60 resource/30 pool, hai entry mỗi map-family, tổng weight 100, tier khớp navigation order, reference tồn tại và baseline đã duyệt.

### Lazy runtime và concurrency

- `GatheringCompletionService.start()` resolve current map trong chính idempotent transaction, từ chối template của map khác hoặc content chưa ACTIVE, rồi snapshot map ID/tên, family, tier, realm và `readyAt`.
- Claim tiếp tục khóa Player + Activity Run, roll/apply reward đúng một lần, ghi Reward Claim/Ledger/progress và hoàn tất run trong transaction. Người chơi có thể di chuyển sau start; reward dùng map snapshot.
- `ActivityRunRepository.findActive()` cung cấp read model run Gathering `IN_PROGRESS`; `GatheringService.getDashboard()` tính READY theo `readyAt` khi request, không scheduler/tick DB.

### Discord UI

- Thêm slash command `/thuthap`: hiển thị map/tier, hai pool và tỷ lệ/sản lượng; nút Hái Linh Thảo, Khai Linh Khoáng, Thu hoạch, Làm mới và Đóng.
- Nút start bị khóa khi có active run; nút claim chỉ mở khi READY. Người chơi có thể mở lại command sau timeout hoặc bot restart để lấy run từ PostgreSQL.
- Reward result dùng tên Item tiếng Việt và số lượng; lỗi kỹ thuật được map sang copy tiên hiệp/người dùng.

### Xác minh

- Thêm `audit:map-gathering`: PASS 60 resource, 30 pool, current-map-only, deterministic weighted-one, map mismatch guard, start snapshot, active-run recovery và Discord dashboard.
- PASS: `auditDataSchemaAlignment`, `auditApprovedPolicies`, `auditPlayerMapFoundation`, `auditArchitectureBoundaries`, `auditActivityPostgresHarness`, `simulateGathering`, `simulateRewardRuntime` và syntax checks.
- Cập nhật PostgreSQL activity verifier sang gathering ID theo map và inject `PlayerMapService`; chưa chạy integration DB vì môi trường hiện không cung cấp `ACTIVITY_TEST_DATABASE_URL`.
- `Q-GATHERING-005..009` chuyển `RESOLVED`.

## 2026-07-27 — Nối metadata Gathering vào Túi Trữ Vật

- `Material` runtime giữ `resourceTier`, `resourceFamily`, `resourceRole` và `sourceMapId` từ Item Template; Item generic cũ vẫn tương thích với các field null.
- `/tuido` hiển thị tài nguyên mới theo dạng `Cấp tài nguyên N • Linh Thảo/Linh Khoáng • Phổ biến/Hiếm`, giúp phân biệt tier thay vì chỉ dựa vào rarity Item.
- Mở `Q-PROFESSION-015` cho việc thay `SPIRIT_HERB ×5` trong Phá Chướng Đan và xử lý inventory legacy. Không tự đổi recipe/economy khi chưa có lựa chọn.
- Mở rộng audit inventory với contract metadata Gathering.

## 2026-07-27 — Nối Gathering vào recipe Phá Chướng Đan

- Chủ dự án chọn phương án A của `Q-PROFESSION-015`: Phá Chướng Đan đổi từ
  `SPIRIT_HERB ×5` sang `Tụ Linh Thảo ×4 + Thanh Tâm Thảo ×1`.
- Đánh dấu Item `SPIRIT_HERB` là `DEPRECATED`, khai báo lý do và
  `replacedByItemId = HERB_TU_LINH_THAO`; validator bắt buộc replacement tồn tại
  và không được tự tham chiếu.
- Thêm migration `026_gathering_resource_recipe_cutover.sql`. Migration xác định
  persistence authoritative qua `persistence_cutovers`: `inventory_stacks` khi
  `INVENTORY=ACTIVE`, còn `player_items` khi `LEGACY/BACKFILLED`.
- Snapshot số dư trước chuyển đổi và ghi hai Resource Ledger entry cho mỗi Player:
  trừ `SPIRIT_HERB`, cộng `HERB_TU_LINH_THAO` theo tỷ lệ 1:1. Operation ID xác
  định và `NOT EXISTS` bảo vệ replay; `balance_after` đích cộng cả stack đã tồn tại.
- Cập nhật cả `player_items` và `inventory_stacks` để dữ liệu backfill không lệch
  khi kích hoạt cutover. Không gộp vật lý các stack trùng ID vì repository đã cộng
  và consume qua nhiều stack; tổng quantity được bảo toàn.
- Cập nhật fixture/audit nghề nghiệp và PostgreSQL progression verifier cho hai
  nguyên liệu mới, gồm batch scaling và concurrent active-slot race.
- Thêm `audit:gathering-recipe-cutover` để khóa recipe, metadata deprecated,
  authoritative storage selection, ledger guard và quantity preservation.
- Đã chạy migration runner trên PostgreSQL cấu hình trong `.env`; migration
  `026_gathering_resource_recipe_cutover.sql` được áp dụng thành công.
- PASS: `audit:gathering-recipe-cutover`, `audit:profession-foundation`,
  `audit:data-schema-alignment`, `audit:database-foundation`,
  `audit:map-gathering`, `audit:approved-policies`,
  `audit:architecture-boundaries`, toàn bộ syntax check và JSON parse.
- `verify:progression:postgres` PASS trên schema PostgreSQL cô lập với đủ 26
  migration. Profession coverage xác nhận idempotent start, concurrent claim chỉ
  nhận một lần, active-slot race chỉ consume một lần và lazy `readyAt` với recipe
  hai nguyên liệu mới.
- Đồng bộ tài liệu trạng thái: `Q-MONSTER-005/007` chuyển `RESOLVED` vì Quality
  Pool, reward multiplier và runtime tương ứng đã được hoàn tất qua
  `Q-MONSTER-009/011`.
- `Q-PROFESSION-015` chuyển `RESOLVED`.

## 2026-07-27 — Hoàn tất cooldown Utility Skill

- Chủ dự án chọn phương án A tại `Q-COMBAT-018`: sáu Skill thuần
  Buff/Debuff/Purify dùng cooldown 3 lượt.
- Author `cooldownTurns: 3` cho `Cuồng Hóa`, `Bản Năng Săn Mồi`, `Cuồng Bạo`,
  `Vương Giả Uy Áp`, `Tịnh Hóa` và `Gia Tốc`.
- Toàn bộ 49 Active Skill canonical hiện có cooldown explicit: 35 Skill cooldown
  2 và 14 Skill cooldown 3; không còn Active Skill compatibility cooldown 0.
- GameData Validator bắt buộc Active Skill có cooldown dương và Passive Skill có
  cooldown 0. Basic Attack tiếp tục không tạo cooldown.
- Audit cooldown chuyển sang `RUNTIME_ACTIVE_COMPLETE_CONTENT`, kiểm tra riêng sáu
  Utility Skill và vẫn khóa chuỗi ready-pool/Đánh Thường/lifecycle event.
- PASS: `audit:skill-cooldown-foundation`, `audit:data-schema-alignment`,
  `audit:monster-skill-catalog`, `audit:monster-quality-runtime`,
  `audit:battle-round-limit`, `audit:battle-fixed-point`,
  `audit:approved-policies`, JSON parse và syntax check.
- `Q-COMBAT-017`, `Q-COMBAT-018` và quyết định bị thay thế `Q-MONSTER-012`
  chuyển `RESOLVED`.

## 2026-07-27 — Thêm cẩm nang slash command `/trogiup`

- Đánh giá Roadmap: core MVP vertical slice đã gần hoàn thành và chạy end-to-end;
  phần chưa hoàn tất chủ yếu là 12 map cao `CONTENT_PENDING`, content recipe nghề
  nghiệp ngoài Phá Chướng Đan, PvP/Tổ đội/Bang chiến/World Boss và load–soak/
  failover vận hành Phase 7.
- Thêm `/trogiup` phản hồi ephemeral, nhóm lệnh thành Nhập môn, Tu luyện, Vật
  phẩm, Thế giới, Cộng đồng và Hệ thống.
- Catalog lấy toàn bộ command đang nạp từ `client.commands`, lấy subcommand trực
  tiếp qua `getSlashData()` và có fallback `Lệnh khác`; thêm command mới không bị
  ẩn khỏi cẩm nang.
- `BaseCommand` bổ sung metadata `availability`, mặc định `ACTIVE`.
  `/loidai`, `/todoi`, `/bangchien` khai báo `PLANNED` vì gameplay chưa mở.
- UI ban đầu ghi nhận 25 command: 22 đang hoạt động và 3 giao diện khung. Mô tả dùng
  tiếng Việt có dấu và không vượt giới hạn Discord Embed.
- Thêm spec `09_APPLICATION/012_COMMAND_HELP_SPEC.md` và audit
  `audit:command-help` kiểm tra coverage, uniqueness, subcommand discovery,
  planned allowlist, giới hạn field và ephemeral response.
- PASS: `audit:command-help` với 25 command/6 nhóm,
  `audit:architecture-boundaries`, `audit:component-session` và syntax/JSON check.

## 2026-07-27 — Hợp nhất UI Công Pháp và Kỹ Năng

- Ghi nhận yêu cầu một Công Pháp tu luyện và loadout Kỹ Năng khởi đầu 2 ô, tăng
  theo Realm bằng GameData thay vì hardcode.
- Phân tích persistence xác nhận `player_skills` hiện chỉ lưu ownership và Battle
  dùng toàn bộ Skill đã học. Mở `Q-SKILL-002` cho Active/Passive slot semantics và
  `Q-SKILL-003` cho capacity curve/backfill; chưa tạo UI giả không khớp combat.
- Gỡ `/kynang` khỏi command registry và loại subcommand `xem/hoc/dung` khỏi
  `/congphap`.
- `/congphap` trở thành dashboard duy nhất: hiển thị Công Pháp đang vận hành,
  Effect dạng `%`, Công Pháp/Kỹ Năng đã lĩnh ngộ và số bí kíp trong túi.
- Thêm select đổi Công Pháp, lĩnh ngộ Công Pháp, lĩnh ngộ Kỹ Năng và nút Đóng.
  Dashboard reload sau mỗi mutation, owner-only ephemeral và TTL 2 phút.
- `CultivationArtService` projection bổ sung element, cultivation bonus và Effect;
  Discord presenter không tự tính modifier.
- `/nhanvat` đổi shortcut Kỹ Năng/Công Pháp về duy nhất `/congphap`.
- Command help hiện có 24 command: 21 `ACTIVE`, 3 `PLANNED`.
- Thêm spec `013_CULTIVATION_LOADOUT_UI.md` và
  `audit:cultivation-loadout-ui`.
- PASS: `audit:cultivation-loadout-ui`, `audit:command-help`,
  `audit:character-dashboard`, `audit:architecture-boundaries`,
  `audit:component-session`, `audit:data-schema-alignment`,
  `audit:approved-policies`, syntax check và JSON parse.

## 2026-07-27 — Đề xuất lại luồng tạo nhân vật

- Phân tích `/start` hiện tại: lấy Discord username làm tên, roll Linh Căn/phẩm
  một lần và persist Player ngay trước khi hiển thị Embed.
- Ghi nhận yêu cầu mới: Đạo hiệu riêng, tối đa 5 lần tái tạo Linh Căn và giao diện
  message + button, không dùng Embed.
- Mở `Q-START-001` cho cách nhập/validate/unique Đạo hiệu và `Q-START-002` cho
  semantics 5 reroll, loại/phẩm, lịch sử kết quả và duplicate.
- Thêm proposal `014_CHARACTER_CREATION_FLOW_PROPOSAL.md`: Modal Đạo hiệu, message
  Thiên Mệnh, năm button Tái tạo/Nhập Đạo/Xem tỷ lệ/Đổi Đạo hiệu/Hủy, chỉ persist
  final snapshot khi confirm.
- Đề xuất `character_creation_rules.json` giữ max reroll, TTL và pool revision;
  preview không ghi DB, confirm transaction recheck Player và không roll lại.
- Đề xuất UI `/congphap` hoàn chỉnh dùng hai thanh riêng: select đơn Công Pháp và
  multi-select Kỹ Năng có `maxValues` lấy từ capacity Realm, tránh hardcode số row.
- Làm rõ ngay ba select hiện hữu bằng prefix `【Công Pháp】` và `【Kỹ Năng】`;
  thanh trang bị Kỹ Năng thật vẫn chờ slot semantics/capacity để không sai Battle.
- Chưa triển khai creation flow hoặc Skill equip persistence trước khi bốn câu hỏi
  `Q-SKILL-002/003`, `Q-START-001/002` được trả lời.

## 2026-07-27 — Hoàn tất luồng tạo nhân vật bằng Đạo hiệu và Thiên Mệnh

- Chủ dự án chọn A tại `Q-START-001/002`: Đạo hiệu nhập bằng Modal, không unique toàn
  cục; một lượt đầu cộng thêm tối đa 5 reroll, mỗi lượt thay cả loại Linh Căn lẫn phẩm
  cấp, không giữ lịch sử để chọn lại và duplicate vẫn tiêu lượt.
- Thêm `player/character_creation_rules.json` giữ revision, TTL 300 giây,
  `maxRerolls: 5`, quality pool đời 0 và giới hạn Đạo hiệu 2–24 ký tự.
- `DaoNamePolicy` chuẩn hóa Unicode NFC, trim/gộp khoảng trắng, chỉ nhận chữ, số và
  khoảng trắng; Discord user ID tiếp tục là identity nên Đạo hiệu được phép trùng.
- `/start` không còn Embed và không tạo Player ngay. Flow mới mở Modal rồi hiển thị
  message owner-only với năm nút: Tái tạo, Xác nhận nhập đạo, Xem tỷ lệ, Đổi đạo hiệu,
  Hủy. Hết lượt thì disable reroll; timeout/hủy không ghi database.
- `PlayerStartService.rollDestiny()` roll loại và phẩm bằng một seeded random stream.
  Runtime mặc định dùng `SecureSeedProvider`; audit có thể inject random deterministic.
- Confirm không roll lại. Service canonicalize root/quality ID từ GameData và transaction
  `createPlayer` persist đúng preview cuối cùng cùng starter inventory, Công Pháp và map.
- Migration `027_character_creation_snapshot.sql` thêm `creation_rerolls_used` và
  `creation_rule_revision` để audit/balance mà không lưu các preview bị bỏ.
- `CharacterCreationPresentation` hiển thị Effect và tỷ lệ ở dạng `%`, không lộ raw
  decimal/seed; sau confirm giữ nguyên Thiên Mệnh hiện tại và bổ sung phần thưởng nhập môn.
- `Q-START-001/002` chuyển `RESOLVED`. `Q-SKILL-002/003` chuyển `ANSWERED`; migration/
  Battle loadout vẫn dừng tại `Q-SKILL-004` vì câu trả lời Passive hiện còn mâu thuẫn.
- Migration runner đã áp dụng thành công `027_character_creation_snapshot.sql` lên
  PostgreSQL cấu hình trong `.env`.
- PASS: syntax/JSON, `audit:character-creation-flow`, `audit:data-schema-alignment`,
  `audit:database-foundation`, `audit:command-help` và `audit:architecture-boundaries`.

## 2026-07-27 — Hoàn tất Skill loadout Active/Passive

- Chủ dự án chọn A tại `Q-SKILL-004`: Active và Passive cùng chiếm tổng loadout,
  capacity tăng theo milestone từ 2 đến 9, tối đa 3 Active; Passive chưa trang bị không
  cộng Effect và không chạy passive battle trigger.
- `skill_rules.json` thêm `playerLoadout.revision = 1`, `maxActiveSkills = 3` cùng tám
  milestone Luyện Khí 2, Kết Đan 3, Hóa Thần 4, Hợp Thể 5, Độ Kiếp 6,
  Huyền Tiên 7, Thái Ất 8 và Đạo Tổ 9. Validator khóa Realm order, capacity không giảm,
  giới hạn Discord và tham chiếu Realm.
- Thêm `SkillLoadoutPolicy` resolve capacity hoàn toàn từ GameData và fail-fast duplicate,
  Skill chưa học, vượt tổng capacity hoặc Active thứ tư.
- Migration `028_player_skill_loadout.sql` thêm `equipped_slot/loadout_revision`, check
  constraints và unique partial index. Backfill Active theo `learned_at, skill_id`:
  hai Skill cho Luyện Khí/Trúc Cơ, tối đa ba cho Realm cao; Passive không tự kích hoạt.
- `SkillService.equipSkillLoadout` replace toàn bộ loadout trong transaction theo lock order
  Player → player_skills. `PlayerRuntimeRepository` tách learned/equipped projection.
- `RuntimePlayer` có `learnedSkillIds` và `equippedSkillIds`; `skillIds` là compatibility
  alias cho equipped. `BattleEntityFactory` chỉ snapshot equipped Skill, vì vậy Active
  chưa trang bị không được thi triển và Passive chưa trang bị không có Effect/trigger.
- `/congphap` có hai thanh select tách biệt. Multi-select Kỹ Năng hỗ trợ tháo hết,
  hiển thị ô/Active/Passive, cập nhật trực tiếp và phân trang khi quá 25 Skill; mọi trang
  luôn chứa toàn bộ Skill đang trang bị để không làm mất loadout.
- Migration runner đã áp dụng thành công migration 028 lên PostgreSQL `.env`.
- `Q-SKILL-002/003/004` chuyển `RESOLVED`.
- PASS: syntax/JSON, `audit:skill-loadout-runtime`, `audit:cultivation-loadout-ui`,
  `audit:data-schema-alignment`, `audit:approved-policies`, `audit:battle-fixed-point`,
  `audit:architecture-boundaries`, `audit:command-help`, `audit:database-foundation` và
  `verify:progression:postgres` với đủ 28 migration, capacity/Active cap/concurrent
  replacement atomic.

## 2026-07-28 — Đối chiếu drop map và cấp Đan Phương nhập môn

- Đối chiếu ba nguồn GameData độc lập: map/spawn/reward của Thám hiểm, resource pool của
  Thu thập và Craft Template của Luyện Đan.
- Xác nhận Thanh Vân Sơn Mạch dùng `POOL_TRUC_LAM`; quái Luyện Khí resolve
  `MONSTER_LUYEN_KHI`, chỉ rơi Linh Thạch, trang bị, Phá Chướng Đan và Vé Bí Cảnh.
  Quái không rơi Linh Thảo.
- Xác nhận `/thuthap` tại Thanh Vân có `Tụ Linh Thảo` (primary, weight 75, quantity 1–3)
  và `Thanh Tâm Thảo` (rare, weight 25, quantity 1). Phá Chướng Đan dùng đúng
  `Tụ Linh Thảo ×4 + Thanh Tâm Thảo ×1`, nên reference recipe/map đã khớp nhưng nguồn
  nguyên liệu là Thu thập, không phải Thám hiểm.
- Mở `Q-PROFESSION-016`: “Tụ Linh Đan” chưa có Item/recipe canonical; `CULTIVATION_PILL`
  hiện mang tên Tu Vi Đan và còn thiếu quyết định về identity, hiệu lực, nguyên liệu,
  thời gian và stacking. Không tự author thông số balance.
- Mở `Q-PROFESSION-017`: cần chủ dự án quyết định Linh Thảo chỉ đến từ `/thuthap` hay
  còn rơi khi Thám hiểm/đánh quái; chưa tự sửa Reward Table hoặc đặt tỷ lệ.
- Phần độc lập đã triển khai: `CRAFT_BREAKTHROUGH_PILL` chuyển từ `AUTO_BY_GRADE` sang
  `LEARNED`; `character_creation_rules.json` revision 2 định nghĩa
  `starterRecipeIds: ["CRAFT_BREAKTHROUGH_PILL"]`.
- `PlayerStartService` resolve starter recipe từ GameData. `PlayerRuntimeRepository`
  ghi ownership vào `player_learned_recipes` trong cùng transaction tạo Player, với
  `source_ref = CHARACTER_CREATION`; Discord success message hiển thị Đan Phương nhập môn.
- Validator bắt danh sách starter recipe không rỗng/không trùng/reference hợp lệ và yêu cầu
  mọi starter recipe dùng `LEARNED`, tránh cấu hình “được cấp” nhưng runtime vẫn auto-unlock.
- Migration `029_starter_alchemy_recipes.sql` backfill idempotent Phá Chướng Đan Phương
  cho toàn bộ Player hiện hữu bằng `ON CONFLICT DO NOTHING`. Migration đã áp dụng thành
  công lên PostgreSQL `.env`; tổng migration hiện là 29.
- Cập nhật profession audit và PostgreSQL verification seed theo ownership contract mới.
- PASS: syntax/JSON, `audit:character-creation-flow`, `audit:profession-foundation`,
  `audit:data-schema-alignment`, `audit:database-foundation`, `audit:command-help`,
  `audit:gathering-recipe-cutover`, `audit:architecture-boundaries` và
  `verify:progression:postgres` (29 migration; nghề nghiệp start/claim/race atomic).

## 2026-07-28 — Khóa mô hình Tụ Linh Đan và source UI nghề nghiệp

- Chủ dự án chọn `Q-PROFESSION-016` phương án B: Tụ Linh Đan là Item cộng tu vi trực
  tiếp và phân theo cảnh giới; Player ở cảnh giới cao không dùng được đan cấp thấp.
  Quyết định được ghi thành policy `EXACT_REALM`, chưa tự đặt lượng tu vi hoặc recipe.
- Chủ dự án chọn `Q-PROFESSION-017` phương án B: quái có tỷ lệ rơi Linh Thảo thấp;
  UI recipe đồng thời phải chỉ nguồn thu thập theo map.
- Hai lựa chọn chưa chứa bảng số bắt buộc. Mở `Q-PROFESSION-018` cho lượng tu vi,
  overflow/cap, nguyên liệu và thời gian Tụ Linh Đan; mở `Q-PROFESSION-019` cho chance/
  quantity mỗi roll của Tụ Linh Thảo và Thanh Tâm Thảo. Không tự thay đổi balance.
- Triển khai phần độc lập: `ProfessionService.recipeViews()` trả source có cấu trúc cho
  từng material (`mapId`, `mapName`, `methods`) từ GameData Item/Map.
- `/nghenghiep` hiển thị ngay dưới từng nguyên liệu: `/thuthap` và map tương ứng; contract
  đã dành sẵn `/thamhiem` khi source `MONSTER_DROP` được phát hành sau câu trả lời.
- Gathering Resource normalizer chấp nhận `sources` data-driven và mặc định an toàn về
  `GATHERING`, không hard-code riêng hai Linh Thảo Luyện Khí.
- PASS: syntax, `audit:profession-foundation`, `audit:data-schema-alignment`,
  `audit:gathering-recipe-cutover`, `audit:command-help` và
  `audit:architecture-boundaries`.

## 2026-07-28 — Hoàn tất Tụ Linh Đan và drop Linh Thảo Luyện Khí

- Chủ dự án chọn `Q-PROFESSION-018` phương án A và `Q-PROFESSION-019` phương án B.
  Bốn câu hỏi `Q-PROFESSION-016..019` đã chuyển `RESOLVED`.
- Thêm Item `SPIRIT_GATHERING_PILL` — Tụ Linh Đan: `realmPolicy = EXACT_REALM`,
  chỉ dùng tại `LUYEN_KHI`, cộng 10% `req_cul` của tầng nhỏ hiện tại và cap tại ngưỡng
  đột phá; không tự vượt tầng hoặc tiêu Item khi tu vi đã đầy.
- Thêm recipe `CRAFT_SPIRIT_GATHERING_PILL`: Luyện Đan Nhất Phẩm, `LEARNED`, 1 phút,
  0 Linh Thạch, tiêu `Tụ Linh Thảo ×3`, tạo một Tụ Linh Đan.
- Character creation rules revision 3 cấp cả Phá Chướng Đan Phương và Tụ Linh Đan
  Phương. Transaction tạo Player ghi cả hai ownership từ GameData.
- Migration `030_starter_spirit_gathering_recipe.sql` backfill idempotent Đan Phương
  Tụ Linh cho Player hiện hữu; đã áp dụng thành công lên PostgreSQL `.env`, tổng cộng
  30 migration.
- Thêm `ItemUseService`: idempotency theo interaction ID, lock Player, lazy-settle tu vi,
  recheck exact Realm, consume Item có Resource Ledger và persist cultivation trong cùng
  transaction. Sai Realm, Item không hỗ trợ hoặc tu vi đã đầy không tiêu Item.
- `/tuido` có select cho Item usable trên trang hiện tại, refresh inventory sau khi dùng
  và hiển thị kết quả tăng tu vi/lỗi cảnh giới bằng tiếng Việt.
- `BaseItem` projection thêm `usable`, `actions`, `requiredRealm`, `realmPolicy`; business
  logic không nằm trong Discord và không dùng method `Consumable.use()` hard-code cũ.
- `MONSTER_LUYEN_KHI` vẫn có `rollCount = 3`; thêm mỗi roll Tụ Linh Thảo 5% ×1 và
  Thanh Tâm Thảo 1% ×1. Hai resource khai báo source `GATHERING + MONSTER_DROP`,
  nên `/nghenghiep` hiển thị cả `/thuthap`, `/thamhiem` và Thanh Vân Sơn Mạch.
- Bonus chance phẩm chất quái áp dụng nguyên trạng vì hai reward mới là `ITEM`;
  Phàm Thú có xác suất ít nhất một lần rơi xấp xỉ 14,3% và 3% mỗi chiến thắng.
- Validator khóa action cộng tu vi: Item phải usable, policy `EXACT_REALM`, Realm hợp lệ,
  percent trong `(0, 100]` và bắt buộc cap tại threshold.
- PASS: syntax/JSON/GameData bootstrap, `audit:starter-alchemy`,
  `audit:inventory-presentation`, `audit:character-creation-flow`,
  `audit:profession-foundation`, `audit:data-schema-alignment`,
  `audit:monster-quality-runtime`, `audit:database-foundation`, `audit:command-help`,
  `audit:architecture-boundaries`, `audit:approved-policies`,
  `audit:gathering-recipe-cutover` và `verify:progression:postgres` với 30 migration,
  exact-Realm/cap/idempotent Item use.

## 2026-07-28 — Kiểm tra phạm vi Monster Reward theo cảnh giới

- Xác nhận `reward_tables.json` hiện chỉ có bốn bảng quái:
  `MONSTER_LUYEN_KHI`, `MONSTER_TRUC_CO`, `MONSTER_KET_DAN`,
  `MONSTER_NGUYEN_ANH`.
- Alias `BASIC_MONSTER_DROP` trong `monster_rules.json` chỉ ánh xạ Realm order 1–4.
  Đây là reward resolution đang được runtime sử dụng, không phải bảng legacy đã bị loại bỏ.
- Content Thám hiểm thực tế chỉ có ba map ACTIVE tương ứng Luyện Khí, Trúc Cơ và Kết Đan.
  Map Nguyên Anh `TRUNG_CHAU_THANH_VUC` vẫn `CONTENT_PENDING`, không có
  `monsterSpawnPoolId`; bảng reward Nguyên Anh và template Xích Viêm Giao Long hiện là
  content chuẩn bị trước, chưa reachable từ map.
- Từ Hóa Thần đến Đạo Tổ chưa có Monster Reward mapping, spawn pool hoặc map ACTIVE.
  Nếu kích hoạt map cao hơn khi chưa bổ sung mapping, Monster Generator sẽ không resolve
  được reward alias cho Realm order tương ứng.

## 2026-07-28 — Cutover Monster Reward sang generator data-driven

- Rà lại `Q-MONSTER-001..003`: quyết định cũ đã khóa currency formula
  `10–20 × 2^(realmOrder−1)` và yêu cầu Equipment/Item chance cấu hình explicit theo
  tier, không suy từ tên cảnh giới và không tự tăng theo currency.
- Thêm `monster/monster_reward_scaling.json` làm nguồn canonical với version, alias ID,
  `CONFIGURED_TIERS_ONLY`, currency baseline và tier 1–4 đã duyệt.
- `GameDataNormalizer.buildMonsterRewardContent()` sinh Reward Table và
  `BASIC_MONSTER_DROP.realmOrderTableIds` trực tiếp từ Realm Registry + config.
  `monster_rules.json` chỉ còn strategy/source identity, không lặp mapping.
- Loại bỏ bốn bảng `MONSTER_*` khỏi `reward_tables.json`; file này hiện chỉ giữ Reward
  Table độc lập như `TREASURE_HUNT`. Không còn hai nơi cùng điều khiển Monster drop.
- Generator giữ nguyên currency/order, roll count, Equipment và Item entries của
  Luyện Khí, Trúc Cơ, Kết Đan, Nguyên Anh; Tụ Linh Thảo/Thanh Tâm Thảo vẫn ở tier 1.
- Validator mới khóa scaling version/coverage/currency, unique Realm order/table,
  roll count, Item/grade-pool reference và generated alias-table consistency.
- Mở `Q-REWARD-006` cho tier 5–15: rare reward, grade pool, material và currency cap.
  Chưa tự kích hoạt Hóa Thần → Đạo Tổ; generator foundation và bốn tier hiện hữu không
  phụ thuộc câu hỏi.
- Thêm spec `006_MONSTER/004_MONSTER_REWARD_SCALING_SPEC.md` và audit
  `audit:monster-reward-scaling`.
- PASS: syntax/JSON, GameData bootstrap, `audit:monster-reward-scaling`,
  `audit:data-schema-alignment`, `audit:starter-alchemy`. Audit chứng minh order 5 sẽ
  tính currency `160–320` khi được cấu hình, nhưng chưa publish alias tier 5.
- PASS hồi quy: `audit:monster-quality-runtime`, `audit:three-map-monster-content`,
  `audit:architecture-boundaries`, `audit:command-help`, `audit:approved-policies` và
  `simulate:exploration` tại Thanh Vân; runtime vẫn resolve `MONSTER_LUYEN_KHI` và
  settlement reward thành công.

## 2026-07-28 — Chốt contract reward explicit cho 15 cảnh giới

- Chủ dự án chọn `Q-REWARD-006` phương án C: mỗi cảnh giới phải có một record reward
  explicit trong `monster_reward_scaling.json`; `rollCount`, Equipment, Item và
  `gradePoolId` không được runtime tự suy hoặc fallback sang tier thấp.
- Currency tiếp tục theo công thức Realm order đã duyệt tại `Q-MONSTER-003`; lựa chọn
  mới chỉ thay đổi cách author phần rare reward, không thay đổi economy tier 1–4.
- Kiểm kê canonical GameData xác nhận 60 tài nguyên Gathering đã phủ đủ 15 map, nhưng
  Equipment hiện chỉ có ba grade Hoàng/Huyền/Địa và ba pool đến Kết Đan; Item đan
  hiện hữu cũng chưa có nội dung đúng Realm cho tier 5–15.
- Mở `Q-EQUIPMENT-002` để chốt tuyến grade/pool cảnh giới cao và `Q-REWARD-007` để
  chốt Item/chance/quantity từng tier. Không tự đặt balance hoặc phát hành reward chưa
  được duyệt.
- Cập nhật Monster Reward spec và roadmap để phản ánh contract explicit cùng hai
  dependency đang OPEN. Map/Monster Hóa Thần → Đạo Tổ vẫn `CONTENT_PENDING`.
- PASS khi chạy trực tiếp trong workspace: `audit:monster-reward-scaling`,
  `audit:data-schema-alignment`, `audit:approved-policies` và
  `audit:architecture-boundaries`. Lệnh bọc qua `npm` bị sandbox Windows chặn tại
  thư mục cài đặt người dùng; đây không phải lỗi source hoặc audit.

## 2026-07-28 — Duyệt baseline Monster Reward tier 5–15

- Chủ dự án chọn `Q-EQUIPMENT-002` phương án A: tuyến trang bị gồm
  Hoàng/Huyền/Địa/Thiên/Tiên/Thánh/Thần.
- Chủ dự án chọn `Q-REWARD-007` phương án A: mỗi tier 5–15 có `rollCount: 1`,
  Equipment 8%, Vé Bí Cảnh 1%, không rơi Phá Chướng Đan; mỗi roll có bốn tài nguyên
  đúng map với PRIMARY 3% ×1 và RARE 1% ×1 cho cả Linh Thảo/Khoáng.
- Phương án grade mới chỉ khóa tên/số lượng phẩm, chưa chứa Realm gate, chỉ số hoặc
  pool weights. Mở `Q-EQUIPMENT-003` với bảng balance cụ thể, không tự đặt số.
- Phát hiện dependency cũ `Q-EQUIPMENT-001` vẫn OPEN: slot thứ tư hiện là `ROBE`
  trong runtime nhưng yêu cầu UI trước đó gọi là `NECKLACE`. Không tự chọn ID hoặc
  modifier cho slot này.
- Làm rõ phương án A của `Q-EQUIPMENT-001`: nếu chọn thay `ROBE → NECKLACE`, migration
  bảo toàn hai modifier DEF/HP và lực chiến hiện hữu; nhờ đó câu trả lời tiếp theo đủ
  để triển khai mà không phát sinh thêm một câu hỏi chỉ số dây chuyền.
- Chưa publish alias tier 5–15 và chưa thêm `MONSTER_DROP` vào source metadata. Hai
  thay đổi sẽ được thực hiện atomically sau khi grade pool và slot equipment được
  duyệt, tránh UI nghề nghiệp hiển thị nguồn chưa tồn tại.
- PASS: `audit:monster-reward-scaling`, `audit:data-schema-alignment` và
  `audit:approved-policies`; alias runtime vẫn chỉ phủ bốn tier đã hoàn chỉnh.

## 2026-07-28 — Enforce Realm gate trang bị và tách yêu cầu pháp bảo mở rộng

- Chủ dự án trả lời `Q-EQUIPMENT-003` chọn A nhưng bổ sung ba yêu cầu làm thay đổi
  bảng cũ: chỉ số phải tăng mạnh theo cảnh giới, trang bị có dòng chính + nhiều affix,
  và LUCK phải tăng tỷ lệ drop.
- `EquipmentService` hiện resolve `requiredRealm` từ grade quality canonical và chặn
  ở cả preview lẫn transaction `equipLoadout`. Không tin preview cũ; request concurrent
  hoặc gọi thẳng service vẫn được recheck trước khi ghi.
- `/trangbi` hiển thị rõ `Cần đạt <Cảnh giới>` thay vì lỗi chung khi chọn pháp bảo
  vượt Realm. `gameDataManager` được inject vào service tại composition root.
- Audit trang bị bổ sung fixture Player Luyện Khí chọn Huyền phẩm (gate Kết Đan) và
  xác nhận lỗi `EQUIPMENT_REALM_LOCKED` cùng Realm code đúng.
- Mở `Q-EQUIPMENT-004` cho curve “tăng mạnh”, `Q-EQUIPMENT-005` cho dòng chính/affix
  và `Q-REWARD-008` cho công thức LUCK. Không tự đặt các hệ số balance mới.
- `Q-EQUIPMENT-001` vẫn OPEN vì file chưa có câu trả lời cho migration
  `ROBE → NECKLACE`; phần này tiếp tục chặn publish bốn type cuối.
- PASS: syntax, `audit:equipment-type-slots`, `audit:data-schema-alignment` và
  `audit:architecture-boundaries`.

## 2026-07-28 — Phát hành LUCK reward policy và khóa hướng pháp bảo song hệ

- Chủ dự án chọn `Q-REWARD-008` phương án A. `reward_runtime_rules.json` revision 2
  khai báo data-driven: mỗi 1 LUCK tăng 1% tương đối, cap contribution 100 LUCK,
  effective chance cap 100%; chỉ áp dụng ITEM/EQUIPMENT/SKILL/CULTIVATION_ART.
- `RewardTableService` kết hợp multiplicative bonus phẩm chất quái và LUCK, giữ
  CURRENCY nguyên trạng; không thay quantity, grade pool hoặc quality distribution.
- Exploration, Secret Realm, Gathering và Treasure Hunt lấy LUCK từ canonical Battle
  stat rồi snapshot trong activity input lúc bắt đầu. Claim/completion dùng snapshot,
  không đọc trang bị live nên tháo/đổi đồ giữa start và claim không đổi reward.
- Thêm validator policy và `auditRewardLuckPolicy.js`; audit khóa công thức, cap,
  currency exclusion, negative-LUCK floor và composition với monster quality.
- Chủ dự án chọn `Q-EQUIPMENT-001` A và `Q-EQUIPMENT-004` A; contract bốn slot cùng
  curve Thiên/Tiên/Thánh/Thần đã được ghi nhận.
- Câu trả lời `Q-EQUIPMENT-005` mở rộng thành pháp bảo tối đa song hệ, có prefix/icon,
  Element Damage và Element Resistance. Mở `Q-EQUIPMENT-006` cho authoring cụ thể và
  `Q-COMBAT-019` cho formula/cap; chưa tự tạo modifier hoặc migration template.
- PASS: `audit:reward-luck-policy`, `audit:map-gathering`,
  `simulate:exploration`, `simulate:secret-realm`, `audit:data-schema-alignment`,
  `audit:approved-policies`, `audit:monster-quality-runtime` và
  `audit:architecture-boundaries`.
- Sửa fixture `simulate:treasure-hunt` để dùng `operationId` đúng contract và capture
  reward context; PASS với LUCK snapshot `0`.
# 2026-07-28 — Elemental equipment, late-game rewards và cutover Necklace/Wind

## Quyết định đã áp dụng

- Resolve `Q-EQUIPMENT-006` theo phương án A và `Q-COMBAT-019` theo phương án A.
- Cutover bốn equipment type canonical thành `WEAPON`, `ARMOR`, `NECKLACE`, `RING`;
  thay family template không thuộc Element Registry `SWORD → WIND`.
- Damage nguyên tố chỉ áp dụng cho Damage Action cùng hệ; đánh thường/neutral bị loại
  trừ. Resistance cùng hệ cap 80%, sau Element Relation và trước final hook/shield.
- Mở `Q-COMBAT-020`; chưa tự đặt tỷ lệ base cho kỹ năng đa nguyên tố.

## Data và runtime

- Bổ sung 16 stat/modifier damage-resistance cho tám hệ Kim, Mộc, Thủy, Hỏa, Thổ,
  Băng, Lôi, Phong; Battle pipeline truyền element vào executor.
- `ItemGenerator` dùng Random Provider có thể inject, tạo prefix hệ, một hoặc hai hệ
  unique với chance Hạ/Trung/Thượng `0/25/50%`, elemental curve
  `5/10/15/23/34/51/77%`, và `0/1/2` affix không trùng modifier.
- Vũ khí có ATK% + Element Damage; Giáp có DEF% + Element Resist; Nhẫn/Dây chuyền
  roll equal-weight primary HP/ATK/DEF/SPD/LUCK rồi nhận Damage/Resist theo slot.
  Ring dùng curve công/HP; Necklace dùng curve thủ/HP; LUCK dùng flat range `1–5`
  đã duyệt trong affix data.
- Persist `elementIds` và `generatedName` vào `instance_data`; starter equipment và
  reward equipment đều giữ metadata. Instance cũ được migration 031 đổi ID/type/slot
  nhưng không reroll hoặc ghi đè effect.
- Phát hành đủ bảy grade Hoàng/Huyền/Địa/Thiên/Tiên/Thánh/Thần và 14 grade pool từ
  Luyện Khí đến Đạo Tổ. Bổ sung Monster Reward tier 5–15: một roll, equipment 8%,
  Bí Cảnh Lệnh 1%, bốn tài nguyên đúng map và không còn Phá Chướng Đan ở late game.
- Chuẩn hóa type chance của reward cũ về bốn type canonical, mỗi loại 25%.

## Kiểm chứng

- JSON parse: PASS.
- `audit:elemental-equipment-generation`: PASS — Thần phẩm 153% ATK, hai elemental
  line 77%, prefix deterministic và đúng hai affix.
- `audit:elemental-equipment-combat`: PASS — damage `100 → 120`, resist cap 80%,
  neutral không nhận bonus.
- `audit:equipment-type-slots`: PASS — bốn slot canonical và invariant một món/type.
- `audit:data-schema-alignment`: PASS — 35 Battle Stats, 59 modifiers, 7 grade và
  reward alias có tier Đạo Tổ.
- `audit:late-game-monster-rewards`: PASS — đủ realm order 1–15; 11 tier late-game
  đúng một roll, equipment 8%, ticket 1% và bốn tài nguyên cùng tier.
- `verify:progression:postgres`: PASS trên schema test cô lập; đủ 31 migration,
  migration rerun-safe và toàn bộ progression/profession/loadout concurrency contract
  vẫn đạt.
# 2026-07-29 — Weighted multi-element skill damage

## Quyết định

- Resolve `Q-COMBAT-020` theo phương án B: tỷ lệ đa hệ được author trên từng action
  bằng `elementWeights`, ví dụ `{"FIRE": 70, "ICE": 30}`.
- `element` và `elementWeights` loại trừ nhau; kỹ năng đơn hệ giữ contract cũ.

## Runtime

- `BattleActionFactory`, GameData normalizer, Action Pipeline và Execution Context giữ
  nguyên bảng weight immutable xuyên suốt một action.
- Action Scope tạo component độc lập cho từng hệ. Mỗi component resolve Element
  Relation, Spirit Root affinity, Element Damage và Element Resistance riêng.
- Formula Engine hỗ trợ tái sử dụng random variables; các component dùng chung một
  formula random/critical/variance roll, tránh tăng hoặc giảm damage do reroll.
- Damage được nhân weight sau các multiplier cùng hệ, cộng bằng fixed-point và floor
  một lần theo numeric policy hiện hữu.
- Validator yêu cầu object có ít nhất hai hệ canonical, mỗi weight trong `(0,100]`,
  tổng chính xác 100 và chỉ được dùng trên `DAMAGE`/`CHAIN_DAMAGE`.

## Kiểm chứng

- `audit:multi-element-damage`: PASS. Case Hỏa 70/Băng 30 cho `67 + 24 = 91`,
  chỉ gọi random một lần; component Hỏa đồng thời resolve đúng tương khắc Kim.
- `audit:element-relation-effects`: PASS.
- `audit:elemental-equipment-combat`: PASS.
- `audit:data-schema-alignment`: PASS.
- `simulateBattle`: PASS; battle đơn hệ, cooldown, đánh thường và effect tick không
  regression sau khi thêm nhánh đa hệ.
# 2026-07-29 — Bổ sung Công Pháp/Kỹ Năng Phong–Lôi và nhãn tiếng Việt

## Phân tích nội dung

- Dùng `docs/CP.txt` làm nguồn tham khảo tên cảnh giới theo yêu cầu; không sao chép
  ma trận 15 Realm × hai phẩm vì runtime hiện author content theo sáu grade.
- Phát hiện Công Pháp đang đủ sáu phẩm cho bảy hệ nhưng thiếu Phong; kỹ năng công kích
  Lôi thiếu Thánh/Thần và Phong thiếu toàn bộ; kỹ năng phòng thủ Lôi đã đủ nhưng Phong
  thiếu toàn bộ.

## GameData và UI

- Thêm sáu Công Pháp Phong từ `Phong Hành Quyết` đến
  `Khởi Nguyên Phong Thần Kinh`; ma trận Công Pháp đạt tám hệ × sáu phẩm.
- Thêm sáu kỹ năng công kích Phong, hai kỹ năng công kích Lôi late-game và sáu kỹ năng
  phòng thủ Phong. Tất cả action có ID/order ổn định, kỹ năng công kích cooldown hai
  lượt theo policy Damage hiện hữu.
- Thêm `skill_rules.displayLabels` cho ba loại nội dung, tám hệ + Vô hệ và sáu phẩm.
  Normalizer truyền `label`, `typeLabel`, `elementLabel`, `gradeLabel` vào Skill,
  Công Pháp và bí kíp.
- `/congphap` hiển thị tên hệ/phẩm tiếng Việt trong tổng quan, loadout và select menu;
  không còn phải hiển thị trực tiếp ID `WIND`, `LIGHTNING`, `THAN` trong các vị trí này.
- Regenerate 180 Sect Reward Pool từ 448 lên 510 entry. Sửa generator loại trừ
  `MONSTER_ONLY`, tránh sinh bí kíp người chơi cho kỹ năng Thiên Môn của quái.

## Kiểm chứng

- JSON parse và bootstrap GameData: PASS.
- `audit:wind-lightning-skill-coverage`: PASS — Công Pháp `8 × 6`, Phong công kích
  `6`, Lôi công kích `6`, Phong phòng thủ `6`, label runtime/UI và nguồn Sect hợp lệ.
- `audit:skill-action-identity`: PASS với 88 Skill / 177 Action.
- `audit:cultivation-loadout-ui`, `audit:data-schema-alignment`,
  `audit:approved-policies` và `simulateBattle`: PASS.

# 2026-07-29 — Bounded load PostgreSQL Phase 7

## Phạm vi và blocker content

- Rà `docs/questions.md`: không còn câu hỏi cũ ở trạng thái OPEN.
- Xác nhận 12 map từ Nguyên Anh đến Đạo Tổ chưa thể tự kích hoạt. Quyết định
  `Q-MONSTER-004` trước đây chỉ duyệt ba map đầu; TXT chưa gán quái/hệ/Skill/weight,
  boss Bí Cảnh hoặc Quality Pool cho từng map.
- Mở `Q-MONSTER-014` với ba phương án author content. Chỉ phần encounter 12 map bị
  chặn; reward, Gathering, tuyến di chuyển và Phase 7 tiếp tục độc lập.

## Load harness

- Thêm `load:phase7:postgres` dùng duy nhất URL test có nhãn, từ chối URL trùng
  `DATABASE_URL`, tạo/xóa schema cô lập và chạy đủ migration trước khi đo.
- Concurrency data-driven qua env, bị giới hạn `10–100`; mặc định 10 worker × 20
  operation. Workload trộn leaderboard read và Outbox `SKIP LOCKED` claim/ack.
- Harness fail nếu operation lỗi, Outbox claim trùng, thiếu event đã xử lý hoặc count
  không khớp. Kết quả có throughput, p50/p95/p99/max, Outbox dispatch lag và đánh giá
  mẫu bằng `operational-slo-mvp-v1`.
- Thêm `audit:phase7-load-harness` khóa test-database-only, primary rejection,
  concurrency bound, cleanup và correctness guards.

## Kết quả PostgreSQL test

- PASS trên schema cô lập với 31 migration; database chính không được dùng.
- 10 worker, 400 operation tổng, 1.000 Outbox event, elapsed `3.285,518 ms`,
  throughput `121,746 operation/giây`.
- Availability mẫu `100%`, error `0%`, duplicate claim `0`, processed
  `1.000/1.000`.
- Leaderboard p95/p99 `107,553/438,758 ms`; Outbox batch mutation p95
  `51,279 ms`; dispatch lag p95 `1.918,3 ms`.
- Đánh giá mẫu SLO: PASS. Đây là bounded sample, chưa thay cho soak dài hạn,
  failover database và retry-storm test.

# 2026-07-29 — Draft content 12 map late-game

- Chủ dự án chọn `Q-MONSTER-014` phương án A: lập ma trận lore/balance đầy đủ để
  duyệt, chưa áp dụng vào GameData.
- Thêm `docs/06_MONSTER/007_LATE_GAME_CONTENT_MATRIX_DRAFT.md`: 12 map từ Nguyên Anh
  đến Đạo Tổ, 59 quái thường, 12 boss Bí Cảnh, tối đa hai Skill/loadout, equal-weight
  spawn và Quality Pool đề xuất.
- Boss được đề xuất chỉ xuất hiện ở Bí Cảnh, không roll phẩm chất và tiếp tục dùng
  adaptive boss formula hiện hữu.
- Bản draft khóa power budget đề xuất: Damage cooldown 2; Heal/Shield/Control
  cooldown 3; control thường/boss 20%/25%; heal/shield ưu tiên dưới 50% HP.
- Phát hiện dependency rõ ràng: Thiên Kiếp/Thái Sơ/Đại La/Khởi Nguyên cần
  `DARK/LIGHT/CHAOS`; catalog hiện vẫn để Quang/Ám/Hỗn Độn `CONTENT_PENDING`.
  Không tự remap sang Element khác hoặc `NEUTRAL`.
- `Q-MONSTER-014` chuyển `ANSWERED`, chưa `RESOLVED`; runtime 12 map tiếp tục pending
  cho tới khi chủ dự án duyệt năm điểm trong mục 8 của bản draft.

# 2026-07-29 — Foundation Ánh Sáng, Bóng Tối và Hỗn Độn

- Chủ dự án chọn E1: thêm ba Element canonical. Ánh Sáng và Bóng Tối khắc lẫn nhau;
  Hỗn Độn không bị hệ khác khắc và dự kiến tương hợp mọi Công Pháp/Kỹ Năng.
- Thêm `LIGHT`, `DARK`, `CHAOS` cùng marker Effect không action. Thêm hai relation
  đối xứng `LIGHT → DARK` và `DARK → LIGHT`, tái sử dụng action-scoped counter
  multiplier hiện hữu. Hỗn Độn không có relation incoming/outgoing.
- Bổ sung sáu Attribute/Modifier và sáu Battle Stat Damage/Resist để Element mới có
  contract runtime đầy đủ; chưa đưa ba hệ vào pool roll pháp bảo hoặc template reward.
- Bổ sung nhãn tiếng Việt Ánh Sáng/Bóng Tối/Hỗn Độn cho Skill presentation.
- Monster semantic catalog đã map Quang/Ám/Hỗn Độn sang ID canonical, nhưng tách rõ
  Element `SUPPORTED` và mechanic Purify/Curse/Dispel `CONTENT_PENDING`.
- Mở `Q-ELEMENT-002` vì mô tả +2% và “giảm một phần ba theo chỉ số +” chưa xác định
  duy nhất lớp multiplier. Chưa tạo Linh Căn Hỗn Độn hoặc áp wildcard formula.
- PASS: JSON parse, `audit:light-dark-chaos-foundation`,
  `audit:element-relation-effects`, `audit:monster-skill-catalog`,
  `audit:data-schema-alignment`, `audit:elemental-equipment-combat`,
  `audit:architecture-boundaries` và `simulate:battle`.

# 2026-07-29 — Hỗn Độn Linh Căn wildcard affinity

- Chủ dự án chọn `Q-ELEMENT-002` A.
- Thêm `HON_DON_LINH_CAN`, archetype `PRIMORDIAL`, hệ phòng thủ `CHAOS` và policy
  `ALL_NON_NEUTRAL_ELEMENTS`.
- Thêm Effect/Modifier `SPIRIT_ROOT_CHAOS_UNIVERSAL_AFFINITY_2`. Mọi direct
  `DAMAGE/CHAIN_DAMAGE` Skill có hệ nhận bonus phẩm Linh Căn cộng thêm 2%; Basic
  Attack và Neutral không nhận.
- Battle snapshot giữ affinity mode và tỷ lệ giảm Element Damage trang bị. Dòng cộng
  thêm dùng phép hữu tỉ `(authored × 2) / 3`, tránh sai số fixed decimal; resistance
  mục tiêu không bị giảm hoặc bypass.
- Multi-element Action áp wildcard, bonus phẩm và tỷ lệ `2/3` độc lập cho từng
  component trước khi nhân weight và cộng.
- Ví dụ audit: Hạ phẩm `100 → 102`; Thượng phẩm `100 → 106`; Element Damage
  `30% → 20%`, tổng `106 × 1,2 = 127`; target kháng 30% còn damage `89`. Linh Căn
  thường giữ nguyên full Element Damage (`104 × 1,3 = 135`).
- Template Hỗn Độn tạm `rollWeight: 0` và tag `ACQUISITION_PENDING`; mở
  `Q-SPIRITROOT-016`, không tự giảm tỷ lệ Linh Căn hiện hữu.
- PASS: `audit:chaos-spirit-root-affinity`, `audit:spirit-root-foundation`,
  `audit:element-relation-effects`, `audit:multi-element-damage`,
  `audit:elemental-equipment-combat`, `audit:data-schema-alignment`,
  `audit:approved-policies`, `audit:character-creation-flow`,
  `audit:spirit-root-reroll-runtime`, `audit:spirit-root-command` và
  `audit:architecture-boundaries`.

# 2026-07-29 — Đính chính: giữ nguyên Element Damage trang bị cho Hỗn Độn

- Chủ dự án yêu cầu loại bỏ hoàn toàn quy tắc Element Damage trang bị còn `2/3`.
- Xóa `equipmentElementDamageScale` khỏi Linh Căn, GameData normalizer/validator,
  Battle snapshot và Action Executor.
- Hỗn Độn chỉ còn semantics: mọi Skill Damage có hệ nhận `bonus phẩm + 2%`; Element
  Damage từ trang bị tiếp tục áp dụng full value giống Linh Căn thường.
- Resistance mục tiêu giữ nguyên; multi-element vẫn resolve từng component nhưng
  không scale dòng trang bị.
- Audit canonical được đổi: Thượng phẩm + Element Damage 30% cho
  `100 × 1,06 × 1,30 = 137`; target kháng 30% còn `96`; Linh Căn Hỏa Thượng phẩm
  vẫn `100 × 1,04 × 1,30 = 135`.
- PASS: `audit:chaos-spirit-root-affinity`, `audit:spirit-root-foundation`,
  `audit:multi-element-damage`, `audit:elemental-equipment-combat`,
  `audit:data-schema-alignment` và `audit:architecture-boundaries`.

# 2026-07-29 — Mở điều kiện “chỉ tăng sát thương khi khắc hệ”

- Chủ dự án làm rõ tăng sát thương chỉ xảy ra khi khắc hệ.
- Mở `Q-ELEMENT-003` vì chưa xác định câu này áp vào riêng +2% Hỗn Độn, toàn bộ
  affinity Hỗn Độn, hay cả Element Damage trang bị.
- Chưa sửa runtime để tránh vô tình ghi đè `Q-COMBAT-019`; phần độc lập giữ nguyên.

# 2026-07-29 — Chốt bonus Hỗn Độn 2% theo tương khắc

- Chủ dự án trả lời `Q-ELEMENT-003`: phần tăng 2% là hiệu ứng riêng của Linh Căn,
  không ảnh hưởng các nguồn khác; lấy tổng sát thương đã tính rồi cộng thêm 2%.
- `SPIRIT_ROOT_CHAOS_UNIVERSAL_AFFINITY_2` đổi điều kiện sang
  `ACTION_ELEMENT_COUNTERS_TARGET`. Bonus phẩm Hỗn Độn vẫn tương hợp mọi Damage
  Action có hệ và giữ độc lập với bonus cố định.
- `ActionScopedElementEffectEngine` resolve affinity theo từng mục tiêu, lưu relation
  `COUNTER`, multiplier và Effect ID vào target context. AoE không dùng chung kết quả
  tương khắc giữa các mục tiêu.
- `ActionExecutor` áp dụng theo thứ tự: Formula/Element Relation → bonus phẩm Linh Căn
  → full Element Damage/Element Resistance → multiplier Hỗn Độn `1,02`. Kỹ năng đa
  hệ resolve thứ tự này độc lập trên từng component trước khi nhân trọng số.
- Không sửa hoặc giảm stat trang bị. Audit canonical: Hạ Phẩm trung tính `100`, Hạ
  Phẩm khắc hệ `120 → 122`; Thượng Phẩm trung tính `104`, Ánh Sáng khắc Bóng Tối
  `120 → 124 → 126`; Thượng Phẩm + Element Damage 30% khi khắc đạt `164`; có
  Resistance 30% còn `114`; Action Hỏa/Thủy `50/50` đạt `149`. Linh Căn Hỏa thường
  với Element Damage 30% vẫn đạt `135`.
- `Q-ELEMENT-003` chuyển `RESOLVED`. Acquisition của Hỗn Độn vẫn độc lập và tiếp tục
  chờ lựa chọn tại `Q-SPIRITROOT-016`.
- PASS: `audit:chaos-spirit-root-affinity`, `audit:spirit-root-foundation`,
  `audit:element-relation-effects`, `audit:multi-element-damage`,
  `audit:elemental-equipment-combat`, `audit:data-schema-alignment`,
  `audit:approved-policies` và `audit:architecture-boundaries`.

# 2026-07-29 — Chuẩn hóa gate còn lại của gói 12 map cao

- `Q-SPIRITROOT-016` vẫn `OPEN`; không tự đặt tỷ lệ xuất hiện Hỗn Độn Linh Căn.
- Sau khi foundation `LIGHT/DARK/CHAOS` và công thức Hỗn Độn hoàn tất, tách bốn điểm
  duyệt còn lại của `Q-MONSTER-014` thành hai quyết định độc lập:
  - `Q-MONSTER-015`: mapping 59 quái/12 Boss, Boss-only và baseline control
    `20%/25%`.
  - `Q-MONSTER-016`: Quality Pool map cao, kèm phương án phát hành thận trọng cap
    Hồng Hoang ở 20%.
- Chưa kích hoạt 12 map hoặc author content phụ thuộc trước khi có câu trả lời.
- Chuyển `Q-EQUIPMENT-003/004/005` sang `RESOLVED` vì toàn bộ dependency của chúng
  đã được triển khai qua `Q-EQUIPMENT-006`, `Q-COMBAT-019/020` và `Q-REWARD-008`;
  không có thay đổi runtime trong bước housekeeping này.

# 2026-07-29 — Hỗn Độn acquisition và Quality Pool 12 map cao

- Chủ dự án chọn `Q-SPIRITROOT-016 B`: pool Linh Căn revision 4 thêm bốn bracket
  template weight `0–9/10–19/20–39/40+`, tỷ lệ Hỗn Độn lần lượt
  `0/0,5/1/2%`; phần weight trừ khỏi Ngũ Hành để tổng luôn 100.
- `SpiritRootRoller` resolve bracket bằng BigInt theo pool/rebirth count.
  `/start` dùng bracket đời 0; reroll Luân hồi snapshot template bracket, toàn bộ
  weights và revision cùng accepted/rejected draw. Template Hỗn Độn chuyển từ
  `ACQUISITION_PENDING` sang `REBIRTH_GATED`.
- Chủ dự án chọn `Q-MONSTER-015 A`: duyệt mapping 59 quái, 12 Boss, Boss-only và
  control `20%/25%`. Khi author phát hiện Element của Skill dùng chung chưa có
  contract, đồng thời Xóa Buff/Khóa Hồi Máu vẫn được draft đánh dấu pending; mở
  `Q-MONSTER-017` và `Q-COMBAT-021`, chưa tự kích hoạt map.
- Chủ dự án chọn `Q-MONSTER-016 B`: thêm đủ 12 Monster Quality Pool order 4–15.
  Kim Tiên/Thái Ất/Đại La/Đạo Tổ cap Hồng Hoang 20%, phần vượt cap chuyển sang
  Thần. Toàn tuyến hiện có 15 pool, mỗi pool tổng weight 100.
- PASS: `audit:spirit-root-foundation`, `audit:character-creation-flow`,
  `audit:spirit-root-reroll-runtime`, `audit:chaos-spirit-root-affinity`,
  `audit:spirit-root-command`, `audit:monster-quality-runtime`,
  `audit:data-schema-alignment`, `audit:approved-policies` và
  `audit:architecture-boundaries`.

# 2026-07-29 — Late-game combat và content-ready

- Chủ dự án chọn `Q-MONSTER-017 C`: thêm `elementMode` hybrid
  `FIXED/INHERIT_CASTER` vào Skill schema, normalizer, factory, validator và
  action-scoped Element resolver. Mọi Skill late-game author mode explicit; offensive
  Element được giữ trong execution snapshot.
- Chủ dự án chọn `Q-COMBAT-021 A`: Action `DISPEL` xóa Buff/timed positive Modifier
  mới nhất theo runtime sequence; không xóa passive/equipment/base stat.
  `HEAL_BLOCK` chặn Action HEAL một lượt và phát event `HEAL_BLOCKED`.
- Control Action hỗ trợ `chanceByVariant`; cùng Skill dùng `20%` cho NORMAL và `25%`
  cho BOSS mà không clone Skill. UI Battle hiển thị kết quả Xóa Buff và Khóa Hồi Máu.
- Generator idempotent đã author 58 Skill mới, nâng tổng executable Monster Skill
  trong catalog lên 75; 63 Skill được ma trận late-game sử dụng.
- Generator content đã author 59 Monster thường, 12 Boss, 12 Spawn Pool và 12 Secret
  Realm Boss Pool ở trạng thái content-ready. Audit phát hiện collision bỏ dấu giữa
  Hồ Yêu/Hổ Yêu; identity được tách thành `MON_YAO_FOX`/`MON_YAO_TIGER`.
- Phát hiện Băng Quy có `Mai Giáp + Hồi Phục`, không có Damage Action và trái gate
  loadout. Mở `Q-MONSTER-018`; chưa chuyển 12 map sang `ACTIVE`.
- PASS: `audit:late-game-combat-mechanics`, `audit:late-game-monster-content`,
  `audit:monster-skill-catalog`, `audit:data-schema-alignment` và
  `audit:battle-fixed-point`.

# 2026-07-29 — Regression content-ready và đồng bộ semantic catalog

- Chạy lại regression sau khi author toàn bộ gói late-game: combat mechanics,
  Monster content, Skill catalog, data schema, architecture boundary, approved
  policy và Battle presentation đều PASS.
- Xác nhận live data có 59 quái thường, 12 Boss, 63 Skill được tuyến late-game
  tham chiếu, 12 Spawn Pool, 12 Secret Realm Boss Pool và 12 Quality Pool.
- Đồng bộ `monster_skill_catalog.json` với contract đã duyệt tại
  `Q-COMBAT-021`: `LIGHT:PURIFY`, `DARK:HEAL_BLOCK` và `CHAOS:DISPEL` đều chuyển
  sang `SUPPORTED`; không còn mechanic Element canonical bị đánh dấu pending.
- Dependency duy nhất còn lại là `Q-MONSTER-018`: Băng Quy vẫn support-only,
  vì vậy 12 map vẫn giữ `CONTENT_PENDING` và chưa được mở cho người chơi.

# 2026-07-30 — Kích hoạt toàn tuyến 15 map

- Chủ dự án chọn `Q-MONSTER-018 A`. Băng Quy đổi loadout từ `Mai Giáp + Hồi
  Phục` sang `Phản Kích + Hồi Phục`; Skill tấn công cooldown 2 và Skill hồi máu
  cooldown 3.
- Cập nhật chính ma trận nội dung và generator canonical, tránh lần generate sau
  phục hồi loadout support-only cũ.
- Generator chuyển đủ 12 map Nguyên Anh–Đạo Tổ sang `ACTIVE`, gắn đúng 12 Spawn
  Pool, 12 Quality Pool và `EXPLORATION/GATHERING`. Toàn tuyến hiện có 15 map
  ACTIVE, không còn map `CONTENT_PENDING`.
- Không cần migration PostgreSQL: các map và pool là GameData; current-map
  persistence tiếp tục dùng các Map ID đã tồn tại.
- Đồng bộ catalog Element: `LIGHT:PURIFY`, `DARK:HEAL_BLOCK`,
  `CHAOS:DISPEL` đều `SUPPORTED`.
- PASS: `audit:late-game-monster-content` (`PASS_ACTIVE`),
  `audit:data-schema-alignment` (15 ACTIVE/0 pending),
  `audit:light-dark-chaos-foundation`, `audit:late-game-combat-mechanics`,
  `audit:monster-skill-catalog`, `audit:player-map-foundation`,
  `audit:map-gathering`, `audit:monster-quality-runtime`,
  `audit:late-game-monster-rewards` và `audit:architecture-boundaries`.

# 2026-07-30 — Phát hành dashboard `/tongmon`

- Thêm một slash command `/tongmon` dạng dashboard ephemeral, không chia nhỏ
  subcommand: xem 10 Tông Môn, hệ truyền thừa, toàn bộ passive hiện tại và Điểm
  Tông Môn.
- Hai select tách Tông Môn và danh mục bí tịch; 18 exchange rule hiển thị
  Realm gate, chi phí, kích thước pool và lý do chưa khả dụng. Nút đổi bị khóa khi
  thiếu Realm/Điểm hoặc pool rỗng.
- Gia nhập và rời Tông đều xác nhận hai bước. Rời Tông hiển thị chính xác thời
  điểm có thể gia nhập lại, giữ Điểm theo `sect-membership-v1`; mutation tiếp tục
  dùng component interaction ID làm operation ID.
- Mở rộng read model `listSects()` với Điểm Tông Môn, rejoin timestamp và immutable
  membership policy snapshot phục vụ presentation; không đưa Discord vào gameplay.
- `/trogiup` tự nhận lệnh mới: tổng 25 command, 22 ACTIVE và 3 PLANNED.
- Dọn trạng thái tài liệu cũ: `Q-PROFESSION-013`, `Q-EQUIPMENT-001`,
  `Q-MONSTER-014/015` chuyển từ `ANSWERED` sang `RESOLVED` theo các dependency
  đã triển khai; không thay đổi quyết định gameplay.
- PASS: `audit:sect-command`, `audit:command-help`, `simulate:sect`,
  `audit:data-schema-alignment` và `audit:architecture-boundaries`.

# 2026-07-30 — Hoàn thiện dữ liệu và hiển thị Effect Tông Môn

- Tái hiện lỗi UI: Core Effect normalized giữ tên tại `displayName`, trong khi
  `SectPresentation` đọc `effect.name`, khiến tên nội tại hiển thị
  `undefined`.
- Presenter chuyển sang fallback an toàn
  `displayName → name → id`, đồng thời không còn bất kỳ nhánh nào có thể nội suy
  trực tiếp giá trị thiếu thành chuỗi `undefined`.
- Bổ sung `description` canonical cho đủ 15 Sect Effect, bao gồm toàn bộ số liệu
  đã duyệt: duration, tỷ lệ hồi/phản, stat percentage point, modifier phần trăm,
  cooldown trigger và scope Battle/Cultivation/Breakthrough.
- Dashboard thêm trường **Danh sách Tông Môn** chứa đủ 10 tên, hệ và tên mọi nội
  tại. Select hiển thị tên nội tại thay vì chỉ số lượng; Tông Môn đang chọn hiển
  thị đầy đủ tên, scope và mô tả từng Effect.
- `GameDataValidator` yêu cầu mọi Effect được Tông Môn tham chiếu phải có tên và
  mô tả không rỗng.
- Audit `/tongmon` duyệt lần lượt cả 10 Tông Môn, xác nhận 15/15 Effect đầy đủ,
  mọi field nằm trong giới hạn Discord, directory không thiếu Tông Môn và số
  chuỗi `undefined` bằng 0.
- Môi trường NVM đang active Node `14.16.0`, thấp hơn `engines >=20.19.0`; audit
  tổng hợp ban đầu dừng ở cú pháp `||=` có sẵn từ trước. Regression chính thức
  được chạy trực tiếp bằng Node `20.19.2` đã cài và PASS:
  `audit:sect-command`, `audit:data-schema-alignment`,
  `audit:architecture-boundaries`.

# 2026-07-31 — Hợp nhất icon Ngũ Hành cho Tông Môn

- Chủ dự án yêu cầu hệ trong danh sách Tông Môn dùng đúng icon đã cấu hình trước
  đó. Rà soát phát hiện bộ icon đang nằm cục bộ trong `ItemGenerator`, chưa phải
  Element GameData.
- Chuyển nguyên mapping đã duyệt vào `elements.json` revision 3:
  `⚙️ Kim`, `🌿 Mộc`, `💧 Thủy`, `🔥 Hỏa`, `⛰️ Thổ`, `❄️ Băng`,
  `⚡ Lôi`, `🌪️ Phong`. Không tự đặt icon cho Ánh Sáng/Bóng Tối/Hỗn Độn hoặc
  Tông Môn vô hệ.
- `GameDataNormalizer` giữ trường `Element.icon`; `ItemGameDataResolver` cung cấp
  Element cho Item Generator. Xóa bảng label hardcode khỏi `ItemGenerator`, tên
  trang bị và UI Tông Môn nay cùng dùng một nguồn canonical.
- `/tongmon` hiển thị icon ở cả directory 10 Tông Môn, description của select và
  trường Truyền thừa trong chi tiết.
- Audit khóa đúng cả tám mapping, xác nhận từng Tông Môn có hệ dùng icon từ
  GameData và Tông Môn vô hệ chỉ hiển thị `Vô hệ`.
- PASS bằng Node `20.19.2`: `audit:sect-command`
  (`configuredElementIcons: 8`, `CANONICAL_GAMEDATA`),
  `audit:elemental-equipment-generation`, `audit:data-schema-alignment`,
  `audit:architecture-boundaries`.

# 2026-07-31 — Visual starter pack cho dashboard nhân vật

- Chủ dự án ưu tiên hình ảnh để chạy thử nghiệm thực tế trước khi mở rộng gameplay.
  Áp dụng skill `imagegen` ở built-in mode, tạo ba banner Tu Tiên ngang không chữ cho
  Tổng quan, Tu luyện và Hành trình; file cuối được đưa vào
  `src/assets/ui/banners`, không để runtime tham chiếu asset ngoài workspace.
- Thêm manifest presentation `src/assets/ui/ui_assets.json` revision 1 với ba semantic
  ID `CHARACTER_OVERVIEW`, `CULTIVATION`, `JOURNEY`. Đây là asset config, không phải
  gameplay GameData và không được lưu binary trong PostgreSQL.
- Thêm `UiAssetResolver` tại Discord presentation layer. Resolver giới hạn đường dẫn
  trong asset root, kiểm tra file tồn tại và trả fallback `null`; thiếu manifest/ảnh
  không làm hỏng `/nhanvat` hoặc business logic.
- `/nhanvat` gắn banner vào ba tab tương ứng bằng Discord attachment. Mỗi payload chỉ
  gửi ảnh tab hiện tại và đặt `attachments: []` khi update để bỏ ảnh cũ, tránh ba file
  thừa xuất hiện dưới embed. Tab Trang bị/Kho đồ tiếp tục text-only trong revision 1.
- Thêm `audit:ui-assets`: kiểm tra manifest/file/attachment URL, mapping ba tab và
  text-only fallback. PASS bằng Node `20.19.2`: `audit:ui-assets`,
  `audit:component-session`, `audit:command-help`, `audit:architecture-boundaries`
  cùng syntax check của resolver, command và audit.

# 2026-07-31 — Equipment pixel icon pack theo phẩm cấp

- Chủ dự án yêu cầu tiếp tục visual MVP bằng icon trang bị pixel-art có phân phẩm.
  Đối chiếu GameData và giữ nguyên ma trận hiện hành: bốn type `WEAPON/ARMOR/NECKLACE/
  RING`, bảy phẩm `HOANG/HUYEN/DIA/THIEN/TIEN/THANH/THAN`, ba chất lượng
  `LOW/MIDDLE/HIGH`; không thêm tier hoặc thay đổi chỉ số gameplay.
- Dùng built-in `imagegen` tạo bốn master không gắn rarity: phi kiếm, chiến giáp,
  dây chuyền ngọc và nhẫn linh ngọc. Asset cuối được lưu dưới
  `src/assets/ui/equipment/masters`, không phụ thuộc file ngoài workspace.
- Nâng `ui_assets.json` lên revision 2 và thêm `equipmentIconPolicy` data-driven.
  Màu khung biểu thị bảy phẩm; 1/2/3 marker hình ngọc biểu thị Hạ/Trung/Thượng.
  Tool PowerShell `generateEquipmentIconVariants.ps1` sinh deterministic đủ 84 PNG
  256×256 vào `equipment/variants`; package script `generate:equipment-icons` cho
  phép đổi palette/frame trong JSON rồi generate lại mà không gọi AI.
- Visual QA phát hiện lần generate đầu tái sử dụng cùng GDI+ PNG decoder làm biến thể
  chất lượng thứ ba mất vật phẩm, chỉ còn khung. Generator được sửa để mở master bitmap
  mới cho từng output và ghi đè an toàn; kiểm tra lại mẫu Hoàng Hạ, Thiên Trung và
  Thần Thượng đều có vật phẩm, khung và đúng số marker.
- `UiAssetResolver` bổ sung resolver theo type/grade/quality, hỗ trợ alias legacy
  `MEDIUM → MIDDLE`, từ chối ID/path không hợp lệ và fallback `null`.
- `/trangbi` dùng icon làm thumbnail: ưu tiên món vừa chọn, sau đó vũ khí đang mặc,
  trang bị đang mặc khác và món đầu tiên. Nếu không có variant hợp lệ, avatar người
  dùng vẫn là fallback; mỗi update xóa attachment cũ.
- Thêm `audit:equipment-icons`, xác nhận `4 × 7 × 3 = 84` file, toàn bộ PNG 256×256,
  mapping đúng GameData, unknown-grade fallback và thumbnail `/trangbi`.
- PASS bằng Node `20.19.2`: `audit:equipment-icons`, `audit:ui-assets`,
  `audit:equipment-type-slots`, `audit:elemental-equipment-generation`,
  `audit:data-schema-alignment`, `audit:architecture-boundaries`, JSON parse và
  syntax check. Một lần gọi nhầm audit không tồn tại `auditEquipmentLoadout.js`
  được thay bằng audit canonical `auditEquipmentTypeSlots.js`; không phải lỗi runtime.

# 2026-08-01 — Icon riêng cho toàn bộ template trang bị

- Chủ dự án yêu cầu mỗi trang bị có icon pixel riêng thay vì bốn hình chung theo slot,
  đặc biệt phải phân biệt kiếm, thương, trượng và chùy.
- Đối chiếu `equipment_templates.json`: catalog hiện có đúng 32 template thuộc tám hệ
  Hỏa/Mộc/Thổ/Thủy/Kim/Lôi/Băng/Phong và bốn type. Không tự thêm template, vũ khí hoặc
  thay đổi gameplay ngoài danh sách hiện hành.
- Dùng built-in `imagegen` tạo tám sprite sheet 2×2 trên nền charcoal, mỗi sheet giữ
  thứ tự cố định Vũ khí/Giáp/Dây chuyền/Nhẫn. Art direction 32-bit RPG pixel-art,
  không chữ, rarity frame, nhân vật hoặc watermark. Các sheet được lưu tại
  `src/assets/ui/equipment/template-sheets`, không tham chiếu file ngoài workspace.
- Nâng `ui_assets.json` lên revision 3 và thêm `equipmentTemplateIconPolicy`: mapping
  đủ 32 item ID, master/file/attachment pattern, master size 256 và runtime size 128.
- Thêm `generateEquipmentTemplateIconVariants.ps1` và package script
  `generate:equipment-template-icons`. Tool cắt tám sheet thành 32 master và sinh
  deterministic 672 variant `32 × 7 × 3`, giữ nguyên palette phẩm cùng marker
  Hạ/Trung/Thượng đã phát hành. Tổng bộ sheet/master/variant khoảng 31,87 MB.
- `UiAssetResolver` bổ sung exact-template resolver. `/trangbi` ưu tiên icon theo
  `item.id`; nếu template mới chưa có artwork thì fallback icon chung theo slot, sau
  đó mới dùng avatar. Không có thay đổi EquipmentService, persistence hoặc battle stat.
- Visual QA kiểm tra đại diện đủ bốn họ vũ khí: Xích Viêm Kiếm, Thanh Mộc Trượng,
  Hậu Thổ Chùy, Thiên Lôi Thương; đồng thời kiểm tra Hàn Ngục Giáp, Thương Hải Hạng
  Liên và Kiếm Tâm Giới Chỉ. Tất cả đúng quadrant, có vật phẩm, khung và marker.
- Thêm `audit:equipment-template-icons`, xác nhận 8 sheet, 32 template unique khớp
  GameData, 7 phẩm, 3 chất lượng, 672 PNG 128×128, exact thumbnail và generic fallback.
- PASS bằng Node `20.19.2`: `audit:equipment-template-icons`,
  `audit:equipment-icons`, `audit:equipment-type-slots`, `audit:data-schema-alignment`,
  `audit:architecture-boundaries`, JSON parse và syntax check.

# 2026-08-01 — Thu nhỏ icon template trang bị còn 32×32

- Theo yêu cầu UI, chuyển toàn bộ 672 variant của 32 template trang bị từ 128×128 về
  32×32 để chúng hoạt động đúng vai trò icon nhỏ. Giữ nguyên 32 master 256×256 và tám
  sprite sheet nguồn; không giảm chất lượng tài sản nguồn và không thay đổi gameplay.
- Nâng manifest lên revision 4, `equipmentTemplateIconPolicy` revision 2 và đặt
  `variantSize = 32`. Generator không còn hard-code tọa độ 128px: vùng vật phẩm, viền
  phẩm cấp, góc khung và 1–3 marker phẩm chất đều được tính theo kích thước cấu hình.
- Sinh lại đủ 672 PNG; tổng dung lượng variant giảm còn khoảng 1,12 MB. Visual QA xác
  nhận kiếm, thương, giáp, dây chuyền và nhẫn vẫn nhận diện được ở kích thước gốc 32px.
- Audit template đọc kích thước mong đợi trực tiếp từ policy và khóa yêu cầu hiện hành
  ở 32×32. Luồng `/trangbi`, exact-template resolver và generic fallback không thay đổi.

# 2026-08-01 — Compact túi đồ và icon trước tên trang bị

- Phân tích `/tuido`: mỗi item trước đây chiếm tối thiểu hai dòng và có thể tăng tới sáu
  dòng do metadata, bốn effect và mô tả 180 ký tự; page size chỉ là năm. Chuyển sang 10
  item/trang, một dòng/item, giữ số lượng, phẩm, metadata gameplay chính và tối đa hai
  effect; effect còn lại được tóm tắt bằng `+N hiệu ứng` và bỏ mô tả dài khỏi list view.
- Thêm `EquipmentEmojiResolver` tại presentation layer. Kiếm dùng `🗡️`, Thanh Mộc Trượng
  dùng `🪄`, Hậu Thổ Chùy dùng `🔨`, Thiên Lôi Thương dùng `🔱`; giáp, dây chuyền và nhẫn
  lần lượt dùng `🛡️/📿/💍`. Business logic, Item GameData và stat không phụ thuộc emoji.
- `/trangbi` đặt icon trước bốn dòng trang bị hiện tại, dòng preview/effect và trong từng
  String Select option. PNG 32×32 chính xác theo template/phẩm/chất lượng vẫn là thumbnail
  của món được nhấn mạnh; generic slot icon và avatar tiếp tục là fallback.
- Xác minh giới hạn Discord chính thức: attachment không thay thế custom emoji inline;
  Application Emoji hỗ trợ tối đa 2.000 emoji/app và upload tối đa 256 KiB. Mở `Q-UI-003`
  để chủ dự án chọn 32 emoji theo template, 672 emoji đầy đủ hoặc chỉ Unicode. Chưa upload
  hay tạo tài nguyên bên ngoài trước khi có lựa chọn.
- PASS bằng Node `20.19.2`: inventory presentation page size 10/pagination/filter/item use,
  equipment type slots, syntax check; audit exact-template được mở rộng để khóa icon thương
  trước tên và trong select option.

# 2026-08-02 — Kích hoạt 32 Discord Application Emoji trang bị

- Chủ dự án chọn `Q-UI-003` phương án A: một Application Emoji cho mỗi template trang bị,
  tổng cộng 32 emoji; phẩm và chất lượng tiếp tục hiển thị bằng text/thumbnail thay vì nhân
  thành 672 emoji. Câu hỏi chuyển `RESOLVED` sau khi sync và audit thành công.
- Nâng `ui_assets.json` lên revision 5, thêm `applicationEmojiPolicy`: nguồn 128×128, tên
  deterministic `td_<item_id>` và file mapping. Generator trang bị hiện sinh đồng thời 32
  master 256×256, 672 runtime icon 32×32 và 32 nguồn Application Emoji 128×128.
- Thêm `syncEquipmentApplicationEmojis.js` và script
  `sync:equipment-application-emojis`. Tool đăng nhập bằng `DISCORD_TOKEN`, fetch emoji của
  chính Application, tái sử dụng theo tên, chỉ tạo emoji thiếu và ghi mapping bằng atomic
  rename; không xóa hoặc sửa emoji không thuộc policy và không chạy trong bot startup.
- Lần sync đầu tạo đủ `32`, mapping đủ `32`; lần sync kiểm tra tạo `0`, tái sử dụng `32`,
  xác nhận idempotent. Không ghi token hay secret vào config/log.
- `EquipmentEmojiResolver` ưu tiên Application Emoji hợp lệ cho cả markup text và object
  component; mapping thiếu/sai Snowflake tự fallback về Unicode kiếm/trượng/chùy/thương/
  giáp/dây chuyền/nhẫn. `/tuido` và `/trangbi` không phụ thuộc API ở request-time.
- Thêm `audit:equipment-application-emojis`: khóa 32 nguồn, kích thước 128×128, giới hạn
  256 KiB, đủ mapping/Snowflake/tên và resolver text/component. PASS sau sync cùng
  `audit:equipment-template-icons`, `audit:inventory-presentation` và
  `audit:architecture-boundaries` bằng Node `20.19.2`.

# 2026-08-02 — Bộ environment art cho toàn tuyến 15 map

- Dùng built-in ImageGen tạo 15 banner map 16:9 theo đúng `maps.json`, từ Thanh Vân Sơn
  Mạch đến Khởi Nguyên Đạo Giới. Art direction thống nhất polished cinematic xianxia
  environment concept art; mỗi map có landmark/palette riêng và mức độ siêu nhiên tăng theo
  Realm. Không sinh nhân vật, quái, text, logo, watermark hoặc UI frame.
- Lưu toàn bộ asset trong `src/assets/ui/maps`; 15 PNG cùng kích thước 1672×941, tổng khoảng
  40,44 MB, file lớn nhất khoảng 3,16 MB nên nằm dưới safety limit attachment 10 MB/file.
- Nâng `ui_assets.json` lên revision 6 và thêm `mapArtPolicy` mapping explicit đủ 15 map ID.
  `UiAssetResolver` bổ sung resolve/attachment API, chuẩn hóa ID, kiểm tra safe path và trả
  `null` khi asset thiếu; business logic không đọc ảnh và correctness không phụ thuộc asset.
- Tích hợp ảnh đúng current/encounter map vào `/chuyenmap`, tab Hành trình `/nhanvat`,
  `/thamhiem`, `/dungoan`, `/biccanh` và `/thuthap`. Payload có `attachments: []` trước khi
  gắn file mới để chuyển map/tab không giữ artwork cũ; thumbnail/logic battle không đổi.
- Thêm `audit:map-art-assets`: đối chiếu map policy với GameData, unique ID/attachment,
  kích thước PNG, giới hạn dung lượng, resolver/fallback và sáu điểm tích hợp presentation.
  Đồng thời cập nhật roadmap mô tả `/tuido` từ pagination cũ 5 item sang compact 10 item.

# 2026-08-02 — Khảo sát portrait quái/Boss và chuẩn bị battle thumbnail

- Đối chiếu nguồn GameData đang chạy: 16 normal spawn pool tham chiếu 83 Monster ID hợp lệ;
  15 Secret Realm Boss Pool tham chiếu đúng 15 Boss ID. Quái thường trải trên 15 nhóm nhận
  diện (`raceId`, cộng nhóm elemental không có `raceId`), nên phạm vi 98 portrait riêng khác
  đáng kể với phương án dùng artwork theo chủng tộc.
- Mở `Q-UI-004` để chủ dự án chọn giữa 15 Boss riêng + portrait chủng tộc, 98 portrait riêng,
  hoặc chỉ làm 15 Boss trước. Chưa sinh hay tự gán artwork trong khi lựa chọn còn `OPEN`.
- Phần presentation độc lập đã được chuẩn bị: `BattleLogAnimator.renderEmbed()` nhận
  `thumbnailUrl` explicit và ưu tiên nó trước avatar Discord của người chơi. Khi caller chưa
  truyền portrait, hành vi fallback avatar hiện tại được giữ nguyên; business logic và
  Battle result không phụ thuộc file ảnh.
- Mở rộng audit battle presentation để khóa precedence của thumbnail quái bằng attachment URL.

# 2026-08-03 — Portrait quái thường và Boss cho giao diện battle

- Chủ dự án duyệt `Q-UI-004` phương án A. Dùng built-in ImageGen tạo 15 master nhận diện
  chủng tộc, bảy biến thể Nguyên Tố Hỏa/Mộc/Thổ/Thủy/Kim/Lôi/Băng giữ chung hình học và
  15 portrait riêng cho toàn bộ Boss Bí Cảnh. Art direction thống nhất: square cinematic
  xianxia portrait, silhouette rõ khi thu nhỏ, nền khí vụ tối giản, không text/logo/watermark/UI.
- Lưu 37 PNG 1254×1254 trong `src/assets/ui/monsters/{races,elementals,bosses}`. Tổng dung
  lượng khoảng 103,68 MB; từng file nằm dưới safety limit 10 MiB. Ảnh nguồn sinh mặc định
  được copy vào workspace, runtime không tham chiếu đường dẫn ngoài dự án.
- Nâng `ui_assets.json` lên revision 7 và thêm `monsterPortraitPolicy` data-driven. Thứ tự
  resolve explicit: Boss ID → Monster override → `raceId` → Element; `overrides` để trống
  nhưng đã sẵn contract cho artwork riêng của quái thường về sau.
- `MonsterGeneratorService` đưa `raceId` có sẵn trong template vào runtime Monster plan;
  không thêm logic hình ảnh vào gameplay. `UiAssetResolver` chịu toàn bộ safe-path,
  attachment và fallback `null` ở presentation boundary.
- `/thamhiem`, `/dungoan` và từng wave `/biccanh` upload portrait ở frame realtime đầu,
  giữ thumbnail trong các frame tiếp theo, sau đó gắn lại portrait cuối cùng cùng environment
  art của map. Content chưa có ảnh tiếp tục fallback avatar người chơi.
- Thêm `audit:monster-portrait-assets`: khóa 14 race portrait explicit + bảy Element palette
  + 15 Boss, kích thước/dung lượng/attachment unique, coverage 83 normal spawn và 15 Boss,
  precedence Boss, fallback an toàn và ba điểm tích hợp command.
- PASS Node 20.19.2: JSON/syntax, monster portrait assets, battle presentation,
  architecture boundaries, exploration simulation và secret-realm simulation.
