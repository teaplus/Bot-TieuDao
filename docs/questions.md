# Câu hỏi kiến trúc và gameplay đang mở

Tài liệu này ghi lại các điểm chưa đủ thông tin hoặc có nhiều lựa chọn ảnh hưởng lớn. Không phương án đề xuất nào trong file này được xem là đã phê duyệt. Các hạng mục phụ thuộc phải giữ trạng thái `BLOCKED` cho đến khi câu hỏi được trả lời và chuyển sang `RESOLVED`.

## Quy ước trạng thái

- `OPEN`: chưa có câu trả lời của chủ dự án.
- `ANSWERED`: đã có câu trả lời nhưng chưa cập nhật đầy đủ vào spec/data liên quan.
- `RESOLVED`: câu trả lời đã được phản ánh vào nguồn chuẩn và có thể triển khai.

---

## Q-ECONOMY-019 — Đồng bộ profile Slot active với quyết định và revision

- **Bối cảnh:** Trong lúc xác minh `!balance`, audit Economy tổng hợp phát hiện
  `slot_rules.json` đang đặt `activeProfileId = FRIENDLY_20_PERCENT`, nhưng `revision`,
  `Q-ECONOMY-018`, changelog và audit chuẩn vẫn ghi profile đã duyệt là
  `FRIENDLY_15_PERCENT`. Runtime vì vậy đang dùng tỷ lệ trúng `19,7332%`, không phải
  `14,8960%` như tài liệu.
- **Tài liệu/code liên quan:** `src/data/minigames/slot_rules.json`,
  `auditSlotBalanceProfiles.js`, `auditEconomyMessageCommands.js`, `Q-ECONOMY-018`.
- **Điểm chưa rõ:** Việc chuyển `activeProfileId` sang profile 20% có phải quyết định mới của chủ
  dự án hay là thay đổi thử nghiệm chưa muốn phát hành.
- **Phương án A — Giữ quyết định 15%:** đổi active profile về `FRIENDLY_15_PERCENT`. Tài liệu và
  audit hiện tại tiếp tục đúng; tỷ lệ thắng thấp hơn profile 20%.
- **Phương án B — Phát hành profile 20% (đề xuất nếu thay đổi là có chủ ý):** giữ active profile
  20%, nâng revision phù hợp và cập nhật spec/changelog/audit. Runtime thân thiện hơn nhưng payout
  trung bình mỗi lần trúng thấp hơn và house edge thay đổi theo profile 20%.
- **Phương án C — Chỉ thử nghiệm 20%:** bổ sung cơ chế chọn profile theo môi trường. Linh hoạt cho
  test/production nhưng tăng cấu hình vận hành và cần xác định biến môi trường/source of truth.
- **Đề xuất kỹ thuật:** B nếu chủ dự án đã chủ ý sửa JSON; revision phải phản ánh đúng profile để
  snapshot/audit không gắn nhãn 15% cho ván chạy bằng bảng 20%.
- **Phần bị chặn:** Chỉ chặn việc sửa Slot revision/tài liệu/audit. `!balance` độc lập và đã hoàn
  thành.
- **Câu trả lời của chủ dự án:** Chưa có.
- **Trạng thái:** OPEN

---

## Q-ECONOMY-018 — Tăng tỷ lệ Slot ra ba biểu tượng giống nhau

- **Bối cảnh:** Chủ dự án nhận thấy Slot hiện khó trúng và yêu cầu tăng tỷ lệ ba biểu tượng giống
  nhau. Paytable hiện dùng sáu weight `35/25/18/12/7/3`, ba reel độc lập, xác suất trúng chính xác
  `6,643%` (trung bình 1/15,05 ván), RTP `90,4606%`. Vì game không giới hạn số lượt và max wager
  bằng wallet, chỉ tăng xác suất mà giữ payout có thể làm RTP vượt 100%.
- **Tài liệu/code liên quan:** `minigame_rules.json`, `SlotEngine`,
  `calculateSlotRtpPartsPerMillion`, `Q-ECONOMY-007/009`.
- **Điểm chưa rõ:** Mục tiêu tỷ lệ trúng mong muốn; có chấp nhận giảm multiplier từng biểu tượng
  để giữ economy bền vững hay không.
- **Phương án A — Khoảng 10%:** weight `43/26/16/8/5/2`, payout tổng
  `6,5×/13×/26×/65×/210×/840×`. Xác suất trúng `10,1824%` (1/9,82 ván), RTP `91,8029%`.
  Tăng vừa phải, jackpot vẫn rất lớn nhưng người chơi có thể vẫn cảm thấy chuỗi thua dài.
- **Phương án B — Khoảng 15% (đề xuất):** weight `51/24/13/6/4/2`, payout tổng
  `5,2×/11×/22×/55×/170×/680×`. Xác suất trúng `14,8960%` (1/6,71 ván), RTP `91,8383%`.
  Cảm giác trúng rõ rệt hơn, vẫn giữ jackpot hiếm và house edge khoảng 8,16%.
- **Phương án C — Khoảng 20%:** weight `57/22/11/5/3/2`, payout tổng
  `4,2×/9×/18×/45×/140×/560×`. Xác suất trúng `19,7332%` (1/5,07 ván), RTP `91,1485%`.
  Thân thiện nhất nhưng biểu tượng Linh Thạch chiếm ưu thế và giá trị mỗi lần trúng giảm nhiều.
- **Đề xuất kỹ thuật:** B. Chỉ sửa GameData, không thay SlotEngine hoặc database;
  validator tiếp tục tự tính RTP và từ chối `>=100%`. Tăng revision Mini Game và audit khóa exact
  hit rate/RTP mới.
- **Phần đã triển khai độc lập:** Đã tách `src/data/minigames/slot_rules.json` với bốn profile
  `CURRENT/10%/15%/20%`. Runtime resolve `activeProfileId`, tự tính hit rate/RTP và validator
  chặn tổng weight sai hoặc RTP `>=100%`. Profile active vẫn là `CURRENT_6_PERCENT`, nên balance
  chưa thay đổi trước khi chủ dự án chọn.
- **Phần bị chặn:** Không còn.
- **Câu trả lời của chủ dự án:** Chọn B.
- **Kết quả xử lý:** Đã kích hoạt `FRIENDLY_15_PERCENT`, nâng revision Slot lên V2. Runtime dùng
  weight `51/24/13/6/4/2`, payout tổng `5,2×/11×/22×/55×/170×/680×`, hit rate
  `14,8960%` và RTP `91,8383%`. Validator/audit tính lại từ JSON; không sửa engine/database.
- **Trạng thái:** RESOLVED
---

## Q-ECONOMY-017 — Cho phép `/give` gửi Linh Thạch tới người chưa `/start`

- **Bối cảnh:** `/give` hiện trả “Người nhận chưa tạo nhân vật bằng `/start`” khi recipient chưa
  có account `REGISTERED`. Đây là hành vi đúng với `Q-ECONOMY-016 = A`, không phải lỗi Discord:
  GameData đang khóa cả sender và recipient ở `REGISTERED_ONLY`. Tuy nhiên Guest Economy hiện đã
  có thể tạo account/wallet cho người chưa tạo nhân vật và `/start` giữ lại wallet đó.
- **Tài liệu/code liên quan:** `017_SPIRIT_STONE_TRANSFER_SPEC.md`,
  `spirit_stone_transfer_rules.json`, `SpiritStoneTransferService`, `PlayerAccountRepository`,
  migration 038 Guest Economy và migration 042 transfer.
- **Điểm chưa rõ:** Chỉ mở eligibility cho người nhận hay cho cả người gửi; recipient chưa có row
  `players` có được tự tạo Guest Account trong transaction hay phải chủ động dùng một lệnh economy
  trước; receipt có cần ghi rõ người nhận chưa tạo nhân vật hay không.
- **Phương án A — Sender đã tạo nhân vật, recipient tự động thành Guest (đề xuất):** sender vẫn
  phải `REGISTERED`; recipient là Discord user không phải bot, có thể `REGISTERED`, `GUEST` hoặc
  chưa có row. Preview/confirm tự `ensureGuest` recipient khi cần, sau đó credit wallet atomically.
  Recipient giữ Linh Thạch khi dùng `/start` về sau. UX thuận tiện, vẫn ngăn Guest gửi tiền, nhưng
  `/give` có thể tạo account/wallet thụ động cho user được nhắc tới.
- **Phương án B — Cả sender và recipient đều có thể là Guest:** mọi user có wallet từ Daily/Mini
  Game đều có thể gửi/nhận trước `/start`; linh hoạt nhất nhưng tăng mạnh khả năng mule account và
  luân chuyển tài nguyên farm.
- **Phương án C — Recipient phải có Guest Account sẵn:** sender phải `REGISTERED`; recipient có
  thể `REGISTERED` hoặc `GUEST`, nhưng `/give` không tự tạo row. Người nhận phải từng dùng Daily,
  Mini Game hoặc một lệnh tạo Guest trước. Ít tạo account thụ động hơn nhưng UX khó hiểu vì hai
  người đều chưa `/start` có thể cho kết quả khác nhau.
- **Đề xuất kỹ thuật:** A. Dùng policy data-driven
  `recipientEligibility = REGISTERED_OR_GUEST_AUTO_CREATE`; bot/self vẫn bị chặn; lock Player theo
  ID tăng dần, transfer/idempotency/ledger giữ nguyên. Preview không nên tạo state nếu muốn tuyệt
  đối read-only; khi đó chỉ confirm mới `ensureGuest`, còn preview hiển thị recipient là Guest mới.
- **Phần bị chặn:** Không còn.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả xử lý:** Sender tiếp tục bắt buộc `REGISTERED`; recipient nhận được khi là
  `REGISTERED`, `GUEST` hoặc chưa có account. Preview không ghi database; confirm tự tạo Guest
  Account rồi credit wallet trong cùng transaction. Daily, Work, Slot, Cao Thấp, Blackjack và
  Nối Từ tiếp tục dùng Guest Economy độc lập, không bị thay đổi eligibility. GameData V2, service,
  UI notice và PostgreSQL integration đã được cập nhật.
- **Trạng thái:** RESOLVED
---

## Q-PLAYER-002 — Chính sách xóa và tạo lại nhân vật, giữ Linh Thạch

- **Bối cảnh:** Chủ dự án muốn reset toàn bộ nhân vật để chạy lại `/start`, chỉ giữ Linh Thạch.
  Hard-delete `players` không an toàn vì transfer/Nối Từ dùng foreign key `RESTRICT`; chỉ đổi
  `account_status` sang GUEST cũng gây nhân đôi starter content và quà 100 Linh Thạch.
- **Tài liệu/code liên quan:** `018_CHARACTER_RECREATE_SPEC.md`, `PlayerStartService`, Guest
  Economy, Rebirth reset, transfer/ledger/idempotency/period counters.
- **Điểm chưa rõ:** Tạo lại có nhận thêm 100 Linh Thạch không; có giữ history/counter economy để
  chống farm không; cooldown bao lâu; xử lý activity/craft/minigame đang dở.
- **Phương án A — Production-safe 30 ngày (đề xuất):** giữ số dư Linh Thạch và toàn bộ immutable
  economy/audit/counter; không cộng lại 100 Linh Thạch; cấp lại starter item/recipe/công pháp;
  cooldown 30 ngày; block khi còn activity/craft/minigame ACTIVE. Chống reroll Linh Căn và farm
  reward tốt nhất nhưng thử lại nhân vật chậm.
- **Phương án B — Balanced 7 ngày:** retention/starter/active gate giống A, cooldown 7 ngày.
  Dễ sửa lựa chọn nhân vật hơn nhưng cho reroll Linh Căn thường xuyên hơn.
- **Phương án C — Testing không cooldown:** retention/starter/active gate giống A, không cooldown.
  Tiện kiểm thử nhưng không phù hợp production vì có thể reroll Linh Căn vô hạn.
- **Đề xuất kỹ thuật:** A cho production; dùng `/xoanhanvat`, owner-only Danger confirmation 60
  giây, reset về GUEST trong transaction và ghi reset history. Không hard-delete identity/history.
- **Câu trả lời của chủ dự án:** Chọn A, nhưng cooldown phải nằm trong file config để có thể
  tự điều chỉnh; giá trị ban đầu là không cooldown.
- **Kết quả xử lý:** Đã phát hành policy
  `src/data/player/character_reset_rules.json` với `cooldownSeconds = 0`. `/xoanhanvat` dùng
  owner-only Danger confirmation 60 giây; transaction giữ `SPIRIT_STONE`, reset các currency
  khác và toàn bộ character projection, giữ immutable economy/audit/counter, ghi
  `player_character_reset_history`, rồi chuyển account về GUEST. Activity/craft/minigame đang
  active sẽ chặn reset. `/start` cấp lại starter content nhưng không cộng lại 100 Linh Thạch
  sau lần reset. Migration 043 và PostgreSQL integration rollback đã PASS, gồm active-session
  gate, retention, ledger, idempotent replay và recreate.
- **Phần bị chặn:** Không còn.
- **Trạng thái:** RESOLVED
---

## Q-ECONOMY-016 — Chính sách slash command gửi Linh Thạch

- **Bối cảnh:** Chủ dự án yêu cầu tính năng gửi Linh Thạch bằng slash command. Chuyển tiền tạo
  luồng economy giữa hai tài khoản và có thể hỗ trợ mule/farm nếu eligibility, phí và giới hạn
  không được khóa rõ.
- **Tài liệu/code liên quan:** `017_SPIRIT_STONE_TRANSFER_SPEC.md`, `player_wallets`,
  `resource_ledger`, Guest Economy và `IdempotentOperationExecutor`.
- **Điểm chưa rõ:** Sender/recipient phải `/start` hay guest được dùng; có phí/daily cap không;
  chuyển ngay hay cần confirmation; receipt công khai hay riêng tư.
- **Quyết định giao diện đã khóa:** Dùng slash command `/give`; quyết định này độc lập với ba
  phương án policy bên dưới.
- **Phương án A — Transfer an toàn cho Player đã đăng ký (đề xuất):** cả hai phải REGISTERED;
  không phí, amount tối thiểu 1, tối đa balance, chưa daily cap; button xác nhận owner-only 60
  giây; hết hạn không trừ; receipt thành công công khai amount và hai user nhưng không lộ số dư.
  Giảm gửi nhầm và hạn chế guest farm, đổi lại recipient phải tạo nhân vật trước.
- **Phương án B — Transfer thuận tiện cho mọi account:** sender guest/registered đều gửi được;
  recipient chưa có account được tự tạo guest; không phí/cap, chuyển ngay không confirmation;
  receipt công khai. Ít ma sát nhất nhưng rủi ro farm, gửi nhầm và tạo account rác cao hơn.
- **Phương án C — Transfer có kiểm soát economy:** chỉ REGISTERED và có confirmation như A,
  đồng thời thu phí/daily cap. Chống luân chuyển/farm tốt hơn nhưng cần chốt thêm chính xác phần
  trăm phí, min fee, amount/lượt/ngày và nơi tiêu hủy phí.
- **Đề xuất kỹ thuật:** A cho V1; persisted transfer record, hai ledger entry, idempotency và lock
  hai Player theo ID tăng dần trong một transaction. Không tự áp dụng.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả xử lý:** `/give` chỉ cho sender/recipient `REGISTERED`; không phí, không daily cap,
  min 1 và max theo sender wallet; owner-only confirmation 60 giây; timeout/hủy không debit;
  receipt công khai amount/hai user/mã giao dịch nhưng không lộ số dư. Migration 042, policy,
  service, command và integration đã hoàn tất.
- **Phần bị chặn:** Không còn.
- **Trạng thái:** RESOLVED
---

## Q-ECONOMY-015 — Làm tròn `half` khi cược Blackjack

- **Bối cảnh:** Chủ dự án yêu cầu `!bj all` và `!bj half`. `all` có nghĩa rõ là toàn bộ số dư
  khả dụng tại lúc transaction khóa wallet. Với số dư lẻ, `half` tạo một nửa Linh Thạch trong
  khi economy chỉ lưu số nguyên.
- **Tài liệu/code liên quan:** `blackjack.js`, `MiniGameService.startBlackjack`,
  `IntegerAmount`, `016_BLACKJACK_MINIGAME_SPEC.md`.
- **Điểm chưa rõ:** Số dư 101 thì `half` cược 50 hay 51; nếu kết quả thấp hơn min bet thì tự nâng
  lên minimum hay báo lỗi.
- **Phương án A — Làm tròn xuống (đề xuất):** `floor(balance / 2)`; sau đó vẫn kiểm tra min bet
  bình thường và báo lỗi nếu không đủ. Không bao giờ cược quá một nửa nhưng có thể để lại nhiều
  hơn một nửa đúng 1 Linh Thạch.
- **Phương án B — Làm tròn lên:** `ceil(balance / 2)`; gần nghĩa “một nửa” nhưng có thể cược hơn
  50% đúng 1 Linh Thạch.
- **Phương án C — Chỉ cho `half` khi số dư chẵn:** chính xác tuyệt đối nhưng UX bất tiện.
- **Đề xuất kỹ thuật:** A; resolve sau khi khóa wallet, không tự nâng lên min bet. Không tự áp dụng.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả xử lý:** `half = floor(balance / 2)` sau khi Player/wallet đã được khóa. Kết quả
  không tự nâng lên minimum; nếu thấp hơn min bet hiện tại thì trả lỗi wager dưới minimum.
- **Phần bị chặn:** Không còn.
- **Trạng thái:** RESOLVED
---

## Q-ECONOMY-013 — Bộ luật và settlement cho Blackjack/Xì Dách

- **Bối cảnh:** `docs/GAME MINI/blackjack.md` mô tả UI plain-text, lá bài emoji, buttons và edit
  cùng một message, nhưng chưa khóa luật/payout. Đây là game cược nhiều bước: Player nhìn bài
  trước khi hành động nên timeout/refund ảnh hưởng trực tiếp khả năng khai thác economy.
- **Tài liệu/code liên quan:** `016_BLACKJACK_MINIGAME_SPEC.md`, `blackjack.md`,
  `minigame_rules.json`, `MiniGameService`, `player_minigame_rounds`.
- **Điểm chưa rõ:** Blackjack quốc tế hay Xì Dách Việt Nam; action V1; soft 17; natural payout;
  hòa; số deck; Double/Split; TTL và bỏ ván; bet policy.
- **Phương án A — Blackjack quốc tế MVP (đề xuất):** một bộ 52 lá xào riêng mỗi round; Player có
  `Bốc`, `Dừng`, `Gấp đôi`, chưa có `Tách`; dealer đứng mọi 17 kể cả soft 17; Blackjack tự nhiên
  trả tổng `2,5×` tiền cược (lãi `1,5×`), thắng thường tổng `2×`, hòa hoàn cược; Double chỉ ở hai
  lá đầu, giữ thêm đúng một wager rồi rút đúng một lá và tự dừng; TTL 120 giây, hết hạn tự
  `Dừng`; kế thừa min bet theo map, max bằng wallet và không giới hạn lượt. Phạm vi vừa đủ,
  payout quen thuộc và tránh exploit refund, nhưng chưa hỗ trợ Split.
- **Phương án B — Blackjack quốc tế đầy đủ:** giống A nhưng thêm Split, nhiều hand, split Ace,
  Double after split và payout từng hand. Trải nghiệm đầy đủ hơn, đổi lại state machine, UI,
  wager reservation và audit settlement phức tạp đáng kể.
- **Phương án C — Xì Dách Việt Nam:** bổ sung luật Xì Bàn/Xì Dách/Ngũ Linh cùng thứ tự thắng và
  payout riêng. Hợp tên gọi Việt Nam hơn, nhưng cần chủ dự án cung cấp chính xác mốc rút của nhà
  cái, so Ngũ Linh, payout từng loại và luật đặc biệt trước khi triển khai.
- **Đề xuất kỹ thuật:** A để phát hành an toàn; schema snapshot vẫn dùng mảng `playerHands` để có
  thể thêm Split bằng revision sau mà không đổi lõi round. Không tự áp dụng.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả xử lý:** Khóa Blackjack quốc tế MVP: một deck 52 lá; Hit/Stand/Double, chưa Split;
  dealer đứng soft 17; natural trả tổng 2,5×, thắng thường 2×, hòa hoàn cược; Double chỉ ở hai
  lá đầu và tự Stand sau một lá; TTL 120 giây tự Stand; kế thừa bet policy hiện tại. Chính sách
  phần lẻ của payout 3:2 được tách sang `Q-ECONOMY-014`.
- **Phần bị chặn:** Không còn blocker về bộ luật; activation/settlement chờ `Q-ECONOMY-014`.
- **Trạng thái:** RESOLVED

---

## Q-ECONOMY-014 — Linh Thạch lẻ và metadata RTP của Blackjack

- **Bối cảnh:** `Q-ECONOMY-013 = A` khóa natural Blackjack trả tổng `2,5×` wager. Linh Thạch và
  các cột wallet/ledger chỉ chấp nhận số nguyên; wager lẻ tạo payout có phần `0,5`. RTP Blackjack
  cũng phụ thuộc chiến thuật Player, không phải một paytable xác suất cố định như Slot.
- **Tài liệu/code liên quan:** `016_BLACKJACK_MINIGAME_SPEC.md`, `minigame_rules.json`,
  `IntegerAmount`, `GameDataValidator`, `BlackjackEngine`.
- **Điểm chưa rõ:** Cấm wager lẻ, làm tròn xuống hay làm tròn lên; GameData có nên hiển thị một
  phần trăm RTP cố định khi kết quả còn phụ thuộc quyết định Hit/Stand/Double.
- **Phương án A — Chỉ nhận wager chẵn, RTP strategy-dependent (đề xuất):** mọi payout 3:2 luôn
  chính xác; validator yêu cầu wager chia hết cho 2 và ghi `rtp.model = PLAYER_STRATEGY_DEPENDENT`,
  không công bố phần trăm giả định. Rõ ràng/audit tốt nhất nhưng người chơi có thêm ràng buộc cược.
- **Phương án B — Cho wager bất kỳ, làm tròn xuống:** dùng phép basis-point integer hiện tại;
  đơn giản nhưng mỗi natural với wager lẻ mất 0,5 Linh Thạch và làm house edge tăng nhẹ.
- **Phương án C — Cho wager bất kỳ, làm tròn lên:** thân thiện Player hơn nhưng tạo thêm 0,5
  Linh Thạch ở wager lẻ và có thể bị tối ưu bằng cách luôn đặt cược số lẻ.
- **Đề xuất kỹ thuật:** A. UI báo tiền cược Blackjack phải là số chẵn; RTP lưu dạng phụ thuộc
  chiến thuật và không hiển thị một con số cố định. Không tự áp dụng.
- **Câu trả lời của chủ dự án:** Không dùng payout 3:2; Blackjack tự nhiên cũng chỉ lời 1:1.
- **Kết quả xử lý:** Natural và thắng thường đều trả tổng `2×` wager; push hoàn `1×`, thua nhận
  `0`. Mọi wager nguyên đều có payout nguyên nên không cần rounding/cấm cược lẻ. RTP ghi
  `PLAYER_STRATEGY_DEPENDENT`, không hiển thị một phần trăm cố định.
- **Phần bị chặn:** Không còn.
- **Trạng thái:** RESOLVED
->Chọn A
---

## Q-WORD-009 — Cooldown chống spam theo người chơi trong Nối Từ

- **Bối cảnh:** Mỗi Discord server được giới hạn một phiên Nối Từ `ACTIVE`, chỉ nhận đáp án tại
  channel đã mở phiên. Registry trong RAM giúp loại message ở channel khác trước khi truy cập
  PostgreSQL. Đề xuất kỹ thuật có nhắc cooldown 2–3 giây nhưng chưa có giá trị chính xác.
- **Tài liệu/code liên quan:** `015_WORD_CHAIN_MINIGAME_DRAFT.md`, `WordChainMessageHandler`,
  `word_chain_rules.json`.
- **Điểm chưa rõ:** Cooldown mỗi người là 2 hay 3 giây; message trong cooldown có bị tính lỗi
  hay chỉ bị bỏ qua; giới hạn chỉ áp dụng trong một phiên hay toàn server.
- **Phương án A — 3 giây/người/phiên (đề xuất):** bỏ qua attempt trong cooldown, không tăng lỗi
  và không ghi database. Giảm spam/write burst tốt hơn nhưng nhịp chơi cá nhân chậm hơn.
- **Phương án B — 2 giây/người/phiên:** phản hồi nhanh hơn, nhưng cho phép tải cao hơn khoảng
  50% so với A khi bị spam liên tục.
- **Phương án C — Chưa có cooldown gameplay:** chỉ dùng giới hạn hạ tầng chung sau khi load-test;
  ít ảnh hưởng UX nhất nhưng không chặn một tài khoản tạo nhiều dictionary lookup hợp lệ.
- **Đề xuất kỹ thuật:** A; lưu mốc ngắn hạn trong RAM theo `sessionId:playerId`, message bị giới
  hạn được bỏ qua hoàn toàn. PostgreSQL vẫn là nguồn chuẩn của session; cooldown chỉ là lớp
  giảm tải và có thể mất khi restart mà không ảnh hưởng correctness.
- **Câu trả lời của chủ dự án:** Chưa có.
- **Phần bị chặn:** Chỉ cooldown/rate limit Nối Từ. Giới hạn một phiên/server, registry channel,
  database constraint và luồng UI tiếp tục độc lập.
- **Trạng thái:** OPEN

---

## Q-WORD-001 — Mô hình phiên và cách nhập đáp án Nối Từ

- **Bối cảnh:** Chủ dự án muốn bổ sung game nối từ tiếng Việt, giới hạn “chỉ 2 từ”, dùng dữ
  liệu có sẵn trong bảng `words` của `bot_tu_tien_test`.
- **Tài liệu/code liên quan:** `015_WORD_CHAIN_MINIGAME_DRAFT.md`, message command router,
  `words`.
- **Điểm chưa rõ:** Đây là phòng chơi chung trong channel, đối kháng hai người hay Player đấu
  bot; đáp án là message thường hay bắt buộc có prefix; ai được phép bắt đầu/dừng.
- **Phương án A — Chuỗi cộng đồng theo channel (đề xuất):** `!noitu` mở một phiên; khi phiên
  ACTIVE, message đúng hai thành phần được xem là đáp án; moderator/người mở dùng
  `!noitu stop`. Tương tác tự nhiên và phù hợp Discord, nhưng router phải tránh bắt nhầm hội thoại.
- **Phương án B — Chuỗi cộng đồng với `!noi <cụm>`:** ít bắt nhầm và dễ rate limit; mỗi lượt
  phải gõ prefix nên kém tự nhiên hơn.
- **Phương án C — Đối kháng hai người theo lượt:** luật thắng thua rõ; cần challenge, accept,
  turn ownership và timeout phức tạp hơn.
- **Đề xuất kỹ thuật:** A cho MVP; state lưu PostgreSQL và không giữ collector/timer per-session.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả xử lý:** Khóa mô hình chuỗi cộng đồng theo channel; `!noitu` mở phiên, message
  thường là đáp án, người mở hoặc moderator được dừng. Session là PostgreSQL state, không dùng
  collector/timer riêng trong RAM.
- **Phần bị chặn:** Không còn blocker về mô hình phiên; lifecycle/reward chờ `Q-WORD-004`.
- **Trạng thái:** RESOLVED
---

## Q-WORD-002 — Contract “chỉ 2 từ” và chuẩn hóa từ điển

- **Bối cảnh:** `words` có 70.511 record `vi`, nhưng chỉ 40.595 record có đúng hai thành phần
  phân tách bởi khoảng trắng; 8.280 record có từ ba thành phần trở lên và 1.450 record chứa
  punctuation. Bảng chưa có index.
- **Tài liệu/code liên quan:** `015_WORD_CHAIN_MINIGAME_DRAFT.md`, `public.words`.
- **Điểm chưa rõ:** “2 từ” là đúng hai tiếng cách nhau bằng khoảng trắng hay hai mục từ; có bỏ
  dấu, bỏ punctuation, chấp nhận tên riêng/từ địa phương/từ tục và dùng lại cụm trong cùng ván
  hay không.
- **Phương án A — Đúng hai thành phần, giữ dấu (đề xuất):** lowercase, Unicode normalize,
  trim/gộp khoảng trắng; giữ dấu tiếng Việt; chỉ nhận exact dictionary `vi`; không dùng lại
  normalized phrase trong một session. Dễ hiểu và index được, nhưng loại các thành ngữ dài.
- **Phương án B — Cho phép mọi cụm dictionary:** nối token cuối sang token đầu; tận dụng nhiều
  dữ liệu hơn nhưng trái mô tả “chỉ 2 từ” và dễ có cụm khó kiểm chứng.
- **Phương án C — Dictionary đã duyệt riêng:** import các cụm hai thành phần sang read model có
  allowlist/blacklist. Chất lượng tốt nhất nhưng cần quy trình moderation/sync dữ liệu.
- **Đề xuất kỹ thuật:** luật A kết hợp read model của C; `words` là nguồn nhập read-only, không
  query scan trực tiếp trên hot path.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả xử lý:** Khóa cụm đúng hai thành phần phân tách bằng khoảng trắng; Unicode normalize,
  lowercase, trim/gộp khoảng trắng nhưng giữ dấu; exact lookup `lang_code = 'vi'`; một cụm
  normalized không được dùng lại trong cùng session.
- **Phần bị chặn:** Chính sách punctuation/nội dung từ điển được tách sang `Q-WORD-005`.
- **Trạng thái:** RESOLVED
---

## Q-WORD-003 — Timeout, tính điểm và phần thưởng Nối Từ

- **Bối cảnh:** Nối Từ có thể trở thành nguồn Linh Thạch cho cả guest lẫn registered Player,
  nhưng reward theo mỗi lượt rất dễ bị hai tài khoản farm tự động.
- **Tài liệu/code liên quan:** `015_WORD_CHAIN_MINIGAME_DRAFT.md`, Economy wallet/ledger,
  rate-limit foundation.
- **Điểm chưa rõ:** Thời gian mỗi lượt, điều kiện kết thúc, điểm cá nhân/chuỗi và có phát Linh
  Thạch hay không.
- **Phương án A — MVP chỉ điểm/thành tích (đề xuất):** timeout và điểm được cấu hình, chưa trả
  Linh Thạch. Ít rủi ro kinh tế, dễ thu telemetry; chưa tạo thêm nguồn thu cho Player.
- **Phương án B — Thưởng người cuối/chuỗi:** hấp dẫn hơn nhưng phải định nghĩa winner, daily cap
  và chống thông đồng.
- **Phương án C — Thưởng nhỏ mỗi lượt hợp lệ:** phản hồi tức thì nhưng write amplification và
  nguy cơ bot farm cao nhất.
- **Đề xuất kỹ thuật:** A cho lần phát hành đầu; reward economy là revision sau với ledger,
  idempotency và daily cap.
- **Câu trả lời của chủ dự án:** Chọn B — có thưởng người thắng/chuỗi.
- **Kết quả xử lý:** Đã khóa hướng có reward, nhưng phương án B chưa cung cấp timeout, cách xác
  định người thắng, công thức thưởng, cap hoặc chống farm. Các thông số được tách sang
  `Q-WORD-004/006/007/008` và nay đã được khóa đầy đủ.
- **Phần bị chặn:** Không còn.
- **Trạng thái:** RESOLVED

---

## Q-WORD-004 — Điều kiện thắng, timeout và công thức thưởng Nối Từ

- **Bối cảnh:** `Q-WORD-001 = A` chọn chuỗi cộng đồng theo channel; `Q-WORD-003 = B` chọn thưởng
  người thắng/chuỗi. Phòng cộng đồng không có turn ownership nên “người thua vì hết lượt” chưa
  tự xác định được.
- **Tài liệu/code liên quan:** `015_WORD_CHAIN_MINIGAME_DRAFT.md`, Economy wallet/ledger,
  `Q-WORD-001/003`.
- **Điểm chưa rõ:** Timeout bao lâu; hết phiên do không ai nối thì ai thắng; thưởng cố định hay
  theo độ dài chuỗi; giới hạn ngày và điều kiện tối thiểu để chống tự farm.
- **Phương án A — Người nối cuối thắng khi phòng im lặng:** mỗi move gia hạn timeout; khi hết
  hạn, người gửi move hợp lệ cuối nhận thưởng theo độ dài chuỗi có cap. Dễ hiểu nhưng người chơi
  có thể cố chờ hết giờ và cần minimum participants/moves.
- **Phương án B — Phiên có thời lượng cố định, xếp theo đóng góp (đề xuất):** phiên chạy trong
  một khoảng cố định; người có nhiều move hợp lệ nhất thắng, hòa thì người đạt số move đó sớm
  hơn thắng. Công bằng hơn cho phòng cộng đồng nhưng cần leaderboard tạm và vẫn phải chọn số
  phút/công thức reward.
- **Phương án C — Mỗi cụm mở đầu là một round loại trực tiếp:** sau mỗi move bot chỉ định người
  kế tiếp; người được gọi không trả lời đúng trong timeout bị loại. Có winner rõ nhưng biến game
  cộng đồng thành turn-based và phức tạp hơn lựa chọn `Q-WORD-001 = A`.
- **Đề xuất kỹ thuật:** B; sau lựa chọn cần ghi kèm thời lượng phiên, minimum player/move, công
  thức Linh Thạch và daily cap. Không tự áp dụng giá trị mặc định.
- **Câu trả lời của chủ dự án:** Chọn A — người nối cuối thắng khi phòng im lặng.
- **Kết quả xử lý:** Mỗi move hợp lệ gia hạn inactivity timeout; khi timeout, người gửi move
  hợp lệ cuối là ứng viên thắng. Dừng thủ công không mặc nhiên phát thưởng. Giá trị timeout,
  điều kiện tối thiểu và công thức/cap thưởng được tách sang `Q-WORD-006`.
- **Kết quả cập nhật:** Quy tắc inactivity timeout đã bị câu trả lời mới hơn tại `Q-WORD-007`
  ghi đè. Không còn timeout; ván kết thúc theo failure counter và người có move đúng gần nhất
  là ứng viên thắng.
- **Phần bị chặn:** Không còn; dùng kết quả cuối của `Q-WORD-006..008`.
- **Trạng thái:** RESOLVED
---

## Q-WORD-005 — Punctuation và kiểm duyệt nội dung từ điển Nối Từ

- **Bối cảnh:** `Q-WORD-002 = A` khóa exact phrase hai thành phần và giữ dấu. Trong 70.511 mục
  `vi` có 1.450 record chứa punctuation; nguồn hiện tại cũng chưa có cờ duyệt nội dung.
- **Tài liệu/code liên quan:** `015_WORD_CHAIN_MINIGAME_DRAFT.md`, `public.words`,
  `Q-WORD-002`.
- **Điểm chưa rõ:** Có loại toàn bộ punctuation, tên riêng/từ địa phương/từ tục hay cho phép
  theo dữ liệu nguồn; moderator có cần allowlist/denylist động không.
- **Phương án A — Lọc chặt cho MVP (đề xuất):** chỉ nhận chữ cái tiếng Việt và một khoảng
  trắng phân cách; loại punctuation; thêm denylist data-driven có thể cập nhật mà không sửa core.
  An toàn cho kênh công cộng nhưng có thể loại một số mục hợp lệ.
- **Phương án B — Exact dictionary không lọc thêm:** tận dụng toàn bộ nguồn, triển khai nhanh;
  dễ hiển thị từ không phù hợp hoặc dấu câu lạ.
- **Phương án C — Allowlist duyệt thủ công:** chất lượng cao nhất; cần công cụ/quy trình duyệt
  hơn 40.000 cụm và đồng bộ revision.
- **Đề xuất kỹ thuật:** A, đồng thời lưu dictionary revision trong session. Chưa áp dụng.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả xử lý:** Chỉ nhận hai thành phần gồm chữ cái Unicode tiếng Việt và đúng một khoảng
  trắng sau normalization; loại punctuation. Dùng denylist data-driven có revision; session
  snapshot revision đã dùng. Không tự suy diễn tên riêng/từ địa phương nếu chúng vẫn hợp lệ
  trong dictionary và không nằm trong denylist.
- **Phần bị chặn:** Không còn blocker về content contract; nội dung denylist ban đầu được phép
  bắt đầu rỗng và bổ sung bằng data mà không sửa core.
- **Trạng thái:** RESOLVED

---

## Q-WORD-006 — Bộ thông số settlement và chống farm Nối Từ

- **Bối cảnh:** `Q-WORD-004 = A` khóa người nối cuối thắng sau một khoảng im lặng; mỗi move hợp
  lệ gia hạn timeout. Economy hiện scale theo `SHOP_MAP_BASE_PRICE`: map đầu có base 100,
  Daily nhận 5× base và Work nhận 0,8–1,2× base.
- **Tài liệu/code liên quan:** `015_WORD_CHAIN_MINIGAME_DRAFT.md`, `earning_activities.json`,
  `shop_rules.json`, `Q-WORD-003/004`.
- **Điểm chưa rõ:** Số giây inactivity, số người/move tối thiểu, reward curve, daily cap và
  settlement khi moderator/người mở dừng phiên.
- **Phương án A — Conservative theo map (đề xuất):** timeout 60 giây; cần ít nhất 3 người khác
  nhau và 10 move hợp lệ; thưởng người thắng bằng `winnerMapBasePrice × chainMultiplier`, với
  `chainMultiplier = min(2, 1 + floor(moveCount / 10) × 0,25)`; tối đa một lần nhận thưởng mỗi
  ngày cho mỗi Player; dừng thủ công là `CANCELLED`, không thưởng. Theo kịp economy từng map và
  khó farm hơn, nhưng phòng ít người khó đạt điều kiện.
- **Phương án B — Casual theo map:** timeout 30 giây; cần 2 người và 5 move; thưởng
  `winnerMapBasePrice × min(3, floor(moveCount / 5))`; tối đa ba lần nhận/ngày; dừng thủ công
  không thưởng. Dễ chơi và reward rõ, nhưng farm nhanh và tạo nhiều settlement hơn.
- **Phương án C — Thưởng cố định toàn server:** timeout 60 giây; cần 3 người và 10 move; thưởng
  `min(1.000, 100 + 10 × moveCount)` Linh Thạch; tối đa một lần/ngày; dừng thủ công không
  thưởng. Không lợi dụng Realm cao để scale reward nhưng sớm trở nên không đáng kể ở late-game.
- **Đề xuất kỹ thuật:** A. Toàn bộ trị số phải nằm trong `word_chain_rules.json`, dùng period
  counter, wallet ledger và idempotent settlement; chưa áp dụng trước khi chủ dự án chọn.
- **Câu trả lời của chủ dự án:** Chọn A nhưng đổi giới hạn thành 10 lần nhận thưởng/ngày. Ván
  có mốc 10 lượt nối hợp lệ, người vừa nối không được tự nối tiếp; B/C phải thay nhau nối sau A.
  Chủ dự án đồng thời yêu cầu trường hợp trả lời sai có thể kết thúc ván.
- **Kết quả xử lý:** Khóa timeout 60 giây, tối thiểu 3 người khác nhau, reward theo
  `winnerMapBasePrice × min(2, 1 + floor(moveCount / 10) × 0,25)`, cap 10 reward claim/ngày và
  dừng thủ công không thưởng. Semantics mốc 10 lượt/sai được tách sang `Q-WORD-007` vì câu trả
  lời hiện có nhiều cách diễn giải ảnh hưởng trực tiếp đến winner và khả năng phá ván.
- **Kết quả cập nhật:** `Q-WORD-007` loại bỏ timeout 60 giây. Các phần còn lại giữ nguyên:
  tối thiểu 3 người, công thức reward trên, cap 10 claim/ngày, cấm nối hai lượt liên tiếp và
  dừng thủ công không thưởng. Failure counter cộng dồn theo `Q-WORD-008 = A`.
- **Phần bị chặn:** Không còn.
- **Trạng thái:** RESOLVED

---

## Q-WORD-007 — Semantics 10 lượt đúng và một câu trả lời sai

- **Bối cảnh:** `Q-WORD-006` chọn bộ A, đổi cap thành 10 reward/ngày và bổ sung ván kết thúc
  quanh mốc 10 lượt đúng hoặc khi có trả lời sai. Với room theo channel, nếu mọi message sai
  đều kết thúc ván thì người ngoài có thể vô tình hoặc cố ý phá phiên.
- **Tài liệu/code liên quan:** `015_WORD_CHAIN_MINIGAME_DRAFT.md`, `Q-WORD-001/004/006`.
- **Điểm chưa rõ:** Ván kết thúc ngay khi đủ 10 move đúng hay chỉ sau một câu sai; loại input
  nào được xem là “câu trả lời sai”; ai thắng; người vừa trả lời có bị cấm nối liên tiếp không.
- **Phương án A — 10 move hoặc lỗi đủ điều kiện (đề xuất):** người vừa nối không được gửi move
  kế tiếp. Ván kết thúc khi đạt 10 move đúng, hết 60 giây, hoặc một người khác gửi một cụm hai
  thành phần có trong dictionary nhưng nối sai/trùng từ. Message sai format, không có trong từ
  điển và hội thoại thông thường bị bỏ qua, không phá ván. Người gửi move đúng cuối cùng thắng;
  nếu đạt 10 thì người gửi move thứ 10 thắng.
- **Phương án B — Chỉ đủ 10 move hoặc timeout:** câu sai chỉ bị từ chối và không kết thúc ván;
  người vừa nối vẫn không được nối liên tiếp. An toàn khỏi phá game nhưng nhẹ hơn yêu cầu
  “mà sai”.
- **Phương án C — Sau 10 move mới chờ lỗi:** đạt 10 move chưa kết thúc; từ đó câu nối sai đầu
  tiên hoặc timeout kết thúc, người nối đúng trước đó thắng. Ván có thể dài hơn 10 move và mốc
  10 chỉ là điều kiện đủ để bắt đầu xét winner.
- **Đề xuất kỹ thuật:** A vì khớp gần nhất với cách hiểu “10 lượt hợp lệ hoặc sai”, đồng thời
  chỉ xem dictionary-valid input là attempt để tránh hội thoại thường phá ván. Chưa áp dụng.
- **Câu trả lời của chủ dự án:** Không có timeout. Ván tự kết thúc sau 10 câu sai. Chủ dự án làm
  rõ thêm ngày 2026-08-11: cụm đúng định dạng hai từ nhưng không tồn tại trong từ điển cũng được
  tính là một câu sai.
- **Kết quả xử lý:** Loại bỏ inactivity timeout 60 giây đã nêu trong `Q-WORD-004/006`. Message
  sai format hoặc hội thoại thường không được tính. Một qualified failure là cụm đúng hai từ
  nhưng ngoài dictionary, không nối đúng required part hoặc đã được dùng, do người khác người
  nối gần nhất gửi. Khi đạt 10 qualified failure, người có move
  đúng gần nhất là ứng viên thắng; nếu chưa có human move đúng hoặc không đạt minimum participant
  thì không thưởng. `Q-WORD-008 = A` khóa failure cộng dồn toàn session và move đúng không
  reset counter.
- **Phần bị chặn:** Không còn.
- **Trạng thái:** RESOLVED

---

## Q-WORD-008 — Mười lỗi nối từ được cộng dồn hay phải liên tiếp

- **Bối cảnh:** `Q-WORD-007` khóa không có timeout và kết thúc sau 10 qualified failure. Một
  câu nối đúng có thể xuất hiện xen giữa các lỗi nên cần xác định counter có reset hay không.
- **Tài liệu/code liên quan:** `015_WORD_CHAIN_MINIGAME_DRAFT.md`, `Q-WORD-006/007`.
- **Điểm chưa rõ:** Đếm 10 lỗi trên toàn session, 10 lỗi liên tiếp, hay 10 người khác nhau mắc
  lỗi; điều này thay đổi đáng kể độ dài ván và khả năng phối hợp farm/grief.
- **Phương án A — Cộng dồn toàn session (đề xuất):** mỗi qualified failure tăng `failureCount`;
  move đúng không reset. Đạt 10 thì kết thúc. Khớp cách nói “sau khi có 10 câu trả lời ... sai”
  và bảo đảm ván cuối cùng sẽ kết thúc nếu có đủ attempt.
- **Phương án B — Mười lỗi liên tiếp:** move đúng reset `failureCount = 0`. Thưởng chuỗi chơi
  tốt nhưng ván có thể tồn tại rất lâu vì không có timeout.
- **Phương án C — Mười người khác nhau mắc lỗi:** mỗi Player chỉ đóng góp tối đa một failure
  vào mốc kết thúc. Chống một người cố phá ván nhưng phòng ít hơn 10 người có thể không bao giờ
  tự kết thúc.
- **Đề xuất kỹ thuật:** A; vẫn áp dụng rate limit và cấm người vừa nối tự gửi move kế tiếp.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả xử lý:** `failureCount` cộng dồn mọi qualified failure trong session; move đúng
  không reset. Khi counter đạt 10, session kết thúc và settlement người có move đúng gần nhất
  nếu đủ eligibility. Rate limit và quy tắc không nối hai lượt liên tiếp vẫn áp dụng.
- **Phần bị chặn:** Không còn.
- **Trạng thái:** RESOLVED
---

## Q-ECONOMY-004 — Kênh nhập lệnh cho Daily, Work và Mini Game

- **Bối cảnh:** Thiết kế ban đầu cân nhắc slash dashboard. Chủ dự án đã xác nhận Daily, Work,
  Slot và trò bài phải được gọi bằng lệnh tin nhắn thường, không phải slash command.
- **Tài liệu/code liên quan:** `CommandHelpPresentation.js`, các command player hiện hành,
  `economy_rules.json`, `014_DAILY_WORK_MINIGAME_SPEC.md`.
- **Điểm chưa rõ ban đầu:** Dùng slash dashboard hay lệnh riêng; vấn đề prefix/message router
  chi tiết được tách sang `Q-ECONOMY-008` sau câu trả lời.
- **Phương án A — Một `/kiemlinhthach` dạng dashboard (đề xuất):** select `Hằng Ngày`,
  `Làm Việc`, `Trò Chơi`; Daily/Work dùng nút thao tác, Trò Chơi có select game và mức cược.
  Ít slash command, dễ thêm game; state component phức tạp hơn.
- **Phương án B — Ba command `/hangngay`, `/lamviec`, `/trochoi`:** dễ hiểu, command nhỏ;
  tăng số slash command và lặp presentation/session/error mapping.
- **Phương án C — Hai command:** `/kiemlinhthach` cho Daily/Work và `/trochoi` cho game cược.
  Tách nguồn thu an toàn khỏi cờ bạc nhưng người chơi phải nhớ hai entry point.
- **Đề xuất kỹ thuật cũ:** A; không áp dụng sau câu trả lời mới.
- **Phần bị chặn:** Đã mở khóa qua `Q-ECONOMY-008`.
- **Câu trả lời của chủ dự án:** Dùng lệnh tin nhắn thường, không dùng slash command.
- **Kết quả xử lý:** Đã thêm message router độc lập slash command; Daily/Work/Mini Game dùng
  message command và có `!help` riêng.
- **Trạng thái:** RESOLVED

---

## Q-ECONOMY-008 — Cú pháp lệnh tin nhắn và Message Content Intent

- **Bối cảnh:** Bot hiện chỉ có slash command, chỉ bật `GatewayIntentBits.Guilds` và không có
  `messageCreate` handler. Lệnh prefix cần `GuildMessages` + `MessageContent` intent, đồng thời
  Message Content phải được bật trong Discord Developer Portal khi bot thuộc diện yêu cầu.
- **Tài liệu/code liên quan:** `ExtendedClient.js`, `CommandHandler.js`, `loadAppConfig.js`,
  `014_DAILY_WORK_MINIGAME_SPEC.md`.
- **Điểm chưa rõ:** Prefix cụ thể, tên lệnh tiếng Anh hay Việt, và các game bài nhiều bước có
  được dùng button/select trong message phản hồi hay phải nhập hoàn toàn bằng text.
- **Phương án A — Prefix cấu hình, lệnh ngắn tiếng Anh (đề xuất):** env `MESSAGE_COMMAND_PREFIX`
  mặc định `!`; dùng `!daily`, `!work`, `!slot <cược>`, `!highlow <cược>`; game nhiều bước có
  button owner-only. Quen thuộc, dễ gõ và đổi prefix; cần bật Message Content Intent.
- **Phương án B — Prefix cấu hình, tên tiếng Việt:** `!hangngay`, `!lamviec`, `!xeng`,
  `!caothap`. Hợp ngôn ngữ game nhưng dài hơn và người chơi dễ nhập sai dấu nếu dùng biến thể.
- **Phương án C — Mention command:** `@Bot daily`, `@Bot work`, ...; không xung đột prefix bot
  khác nhưng dài, parsing mention phức tạp và UX kém hơn.
- **Đề xuất kỹ thuật:** A; alias tiếng Việt không dấu khai báo trong JSON.
  Message trả về vẫn được phép dùng button/select cho round tương tác.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả xử lý:** Prefix đọc từ `MESSAGE_COMMAND_PREFIX`, mặc định `!`; đã thêm
  `GuildMessages`/`MessageContent`, message router, lệnh `daily/work/slot/highlow/help` và alias
  `hangngay/lamviec/xeng/caothap/commands`. Mini Game nhiều bước được phép dùng component.
- **Trạng thái:** RESOLVED
---

## Q-ECONOMY-005 — Nhịp Daily/Work, streak và công thức Linh Thạch

- **Bối cảnh:** Giá Shop là `100 → 30.000.000` theo 15 map, còn Linh Thạch quái dùng curve
  `10–20 × 2^(realmOrder-1)`. Reward cố định sẽ vô nghĩa ở map cao hoặc phá kinh tế map thấp.
- **Tài liệu/code liên quan:** `shop_rules.json`, `monster_reward_scaling.json`,
  `economy_rules.json`, `player_period_counters`, `reward_claims`.
- **Điểm chưa rõ:** Scale theo map hay cảnh giới; Work cooldown/limit; Daily có streak; Work có
  thất bại hay luôn nhận thưởng.
- **Phương án A — Theo giá cơ sở map, không streak (đề xuất):** Daily một lần/ngày nhận
  `5 × mapBasePrice`; Work cooldown 60 phút, tối đa 8 lần/ngày, luôn thành công và roll
  `0,8–1,2 × mapBasePrice`. Dễ hiểu, theo kịp Shop; tối đa khoảng 13 base/ngày.
- **Phương án B — Theo map + streak 7 ngày:** Daily `3/4/5/6/7/8/12 × base`, bỏ một ngày reset;
  Work như A. Giữ chân tốt hơn nhưng thêm state và dễ tạo cảm giác ép đăng nhập.
- **Phương án C — Theo reward quái:** Daily tương đương trung bình 25 lần thắng quái cùng cảnh
  giới; Work tương đương 5 lần, tối đa 8/ngày. Bám farm nhưng lệch curve giá Shop.
- **Đề xuất kỹ thuật:** A; multiplier/cooldown/limit nằm trong JSON.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả xử lý:** `!daily` nhận `5 × mapBasePrice` một lần/ngày; `!work` cooldown 60 phút,
  tối đa tám lần/ngày và roll `0,8–1,2 × base`. Claim/counter/wallet/ledger đều atomic.
- **Trạng thái:** RESOLVED
---

## Q-ECONOMY-006 — Danh sách Mini Game phát hành đầu tiên

- **Bối cảnh:** “Slot, đánh bài các thứ” chưa xác định trò bài nào. Slot resolve một lần;
  Blackjack cần nhiều lượt hit/stand và session state; Cao Thấp đơn giản hơn.
- **Tài liệu/code liên quan:** `RandomSystem`, `ComponentSession`, Battle realtime UI pattern,
  `014_DAILY_WORK_MINIGAME_SPEC.md`.
- **Điểm chưa rõ:** Game nào phải có ngay, luật chơi và game bài realtime hay resolve một lần.
- **Phương án A — Slot + Cao Thấp cho V1 (đề xuất):** Slot ba cuộn; Cao Thấp rút một lá mở và
  đoán lá kế tiếp. Đủ kiểm chứng engine cược/UI; Blackjack làm sau vì cần hand/deck/session riêng.
- **Phương án B — Slot + Tài Xỉu + Blackjack:** đa dạng nhất; rule, UI, deterministic audit và
  timeout settlement lớn hơn đáng kể.
- **Phương án C — Chỉ Slot:** ra mắt nhanh, ít state; chưa đáp ứng phần “đánh bài”.
- **Đề xuất kỹ thuật:** A. Hòa Cao Thấp hoàn cược; bộ bài dùng server seed và
  round snapshot bất biến.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả xử lý:** Registry đã có `SLOT` và `HIGH_LOW`, command/alias đã được đăng ký. Hai game
  giữ `BALANCE_BLOCKED` tại `Q-ECONOMY-009` vì exact paytable chưa được chọn.
- **Trạng thái:** RESOLVED
---

## Q-ECONOMY-007 — Mức cược, RTP, giới hạn và quan hệ với tiền thật

- **Bối cảnh:** Mini game cược có thể thành nguồn tạo/hủy Linh Thạch lớn nhất. Không cap cho phép
  cược toàn bộ wallet; paytable kỳ vọng dương gây lạm phát. Kiến trúc pháp lý thay đổi nếu Linh
  Thạch mua bằng tiền thật hoặc cash-out được.
- **Tài liệu/code liên quan:** `PlayerWalletRepository`, `resource_ledger`, idempotency policy,
  `economy_rules.json`, Shop economy.
- **Điểm chưa rõ:** Quan hệ tiền thật; min/max bet, số lượt, house edge/RTP và bảo vệ thua sạch.
- **Phương án A — Tiền ảo thuần túy, cược có biên (đề xuất):** không mua/cash-out/chuyển thành
  giá trị thật; min `1 × mapBasePrice`, max `10 × base`; tối đa 30 round/ngày; target RTP Slot
  92%, Cao Thấp 95%. Kiểm soát lạm phát/thiệt hại nhưng giới hạn khá chặt.
- **Phương án B — Tiền ảo, không giới hạn lượt:** min `1 × base`, max bằng số dư wallet, RTP dưới
  100%. Tự do nhưng variance lớn, dễ mất toàn bộ Linh Thạch và cần hỗ trợ số nguyên cực lớn.
- **Phương án C — Không cược wallet:** cấp vé Mini Game miễn phí hằng ngày, chỉ trả thưởng.
  An toàn nhất nhưng không còn đúng cảm giác casino.
- **Đề xuất kỹ thuật cũ:** A; chủ dự án chọn B.
- **Câu trả lời của chủ dự án:** Chọn B — tiền ảo, không giới hạn lượt, min bằng một lần giá
  cơ sở map, max bằng số dư wallet và RTP dưới 100%.
- **Kết quả xử lý:** Bet policy đã được khóa trong `minigame_rules.json`; không có daily round
  limit. Exact RTP/paytable được tách sang `Q-ECONOMY-009` và chưa active.
- **Trạng thái:** RESOLVED

---

## Q-ECONOMY-009 — Paytable chính xác của Slot và Cao Thấp

- **Bối cảnh:** `Q-ECONOMY-006 = A` chọn Slot + Cao Thấp; `Q-ECONOMY-007 = B` chọn không giới
  hạn lượt, cược tối đa bằng wallet và chỉ yêu cầu RTP dưới 100%. Chưa có symbol weight, payout
  multiplier hoặc payout khi thắng Cao Thấp nên không thể kiểm chứng house edge.
- **Tài liệu/code liên quan:** `minigame_rules.json`, `MiniGameEngine`,
  `014_DAILY_WORK_MINIGAME_SPEC.md`.
- **Điểm chưa rõ:** Exact paytable và cách làm tròn payout.
- **Phương án A — Paytable cân bằng sẵn (đề xuất):** Slot ba cuộn độc lập, sáu symbol weight
  `35/25/18/12/7/3`; chỉ ba symbol giống nhau thắng với tổng payout `7×/14×/28×/70×/225×/900×`,
  RTP lý thuyết khoảng 90,46%. Cao Thấp trả tổng `1,9×` khi đoán đúng và hoàn `1×` khi đồng hạng,
  RTP lý thuyết khoảng 95,38%; payout làm tròn xuống integer.
- **Phương án B — Slot có thưởng đôi:** cùng weight như A; hai symbol giống hoàn cược `1×`, ba
  symbol dùng `4×/7×/12×/25×/50×/250×`, RTP khoảng 93,15%. Cao Thấp như A. Thắng xuất hiện
  thường xuyên hơn nhưng phần lớn chỉ hòa vốn.
- **Phương án C — Chủ dự án cung cấp bảng riêng:** khai báo symbol, weight và multiplier mong
  muốn; runtime audit sẽ tính RTP và từ chối publish nếu `>= 100%`.
- **Đề xuất kỹ thuật (chưa áp dụng):** A vì kết quả rõ ràng, không tạo nhiều lượt “thắng giả”
  chỉ hoàn vốn và house edge phù hợp lựa chọn không giới hạn lượt.
- **Phần bị chặn:** Engine/JSON/UI/settlement Slot và Cao Thấp. Message router, Daily/Work và
  migration nền tảng Mini Game vẫn triển khai độc lập.
- **Câu trả lời của chủ dự án:** Chọn A. Cú pháp cược là `!slot <số tiền>`, ví dụ
  `!slot 1000`.
- **Kết quả xử lý:** Đã đưa toàn bộ symbol weight, payout multiplier và RTP vào
  `minigame_rules.json`; Slot được settlement atomically trong một request. Cao Thấp đã khóa
  paytable nhưng phần lifecycle phiên được tách sang `Q-ECONOMY-010`. Payout Cao Thấp `1,9×`
  trong phương án này sau đó đã bị yêu cầu mới thay thế bằng tổng payout cố định `2×`; xem
  `Q-ECONOMY-011`.
- **Trạng thái:** RESOLVED
---

## Q-ECONOMY-010 — Xử lý ván Cao Thấp bị bỏ dở

- **Bối cảnh:** Cao Thấp là game hai bước: `!highlow <số tiền>` mở bài và giữ tiền cược, sau đó
  Player chọn Cao/Thấp bằng button. Nếu Player không chọn hoặc bot restart, tiền cược đã giữ cần
  một quy tắc kết thúc rõ ràng để không mất hoặc hoàn tiền ngoài ý muốn.
- **Tài liệu/code liên quan:** `minigame_rules.json`, `player_minigame_rounds`,
  `014_DAILY_WORK_MINIGAME_SPEC.md`, `Q-ECONOMY-009`.
- **Điểm chưa rõ:** Thời hạn phiên và settlement của tiền cược khi hết hạn.
- **Phương án A — Không hết hạn:** ván ACTIVE được lưu vô hạn; gọi lại lệnh sẽ mở lại đúng ván cũ.
  Không cần timeout nhưng có thể giữ tiền và state treo rất lâu.
- **Phương án B — Hết hạn tính thua:** sau 2 phút không chọn thì mất cược; luật chặt nhưng dễ gây
  khó chịu khi Discord lag hoặc bot restart.
- **Phương án C — Hết hạn hoàn cược (đề xuất):** sau 2 phút, request tiếp theo lazy-expire ván và
  hoàn 100% tiền cược atomically. Trải nghiệm an toàn, không cần scheduler; Player có thể bỏ ván
  nhưng chưa thấy lá kết quả nên không tạo lợi thế xác suất.
- **Đề xuất kỹ thuật (chưa áp dụng):** C; persist `expires_at`, owner-only button, row lock khi
  settle/expire, ledger hoàn cược và idempotency riêng cho start/choice/expiry.
- **Phần bị chặn:** Engine, button và settlement runtime của `!highlow <số tiền>`. Slot, Daily và
  Work không phụ thuộc câu hỏi này.
- **Câu trả lời của chủ dự án:** Chọn C — hết hạn sau 2 phút và hoàn cược.
- **Kết quả xử lý:** Đã khóa policy `LAZY_REFUND` với TTL 120 giây trong GameData. Lệnh chưa
  debit tiền vì quá trình kiểm tra phát hiện thứ tự lật/chọn bài ảnh hưởng lớn đến RTP; phần này
  được tách sang `Q-ECONOMY-011`.
- **Trạng thái:** RESOLVED
---

## Q-ECONOMY-011 — Luật private round và kết quả hòa của Cao Thấp

- **Bối cảnh:** `Q-ECONOMY-010` khóa timeout 2 phút hoàn cược. Chủ dự án đã thay payout cũ của
  `Q-ECONOMY-009`: Player tự nhập số cược; đoán đúng nhận tổng cộng đúng `2 × tiền cược`, đoán
  sai mất cược. Chủ dự án bổ sung rằng mỗi Player phải có một process/ván riêng biệt, không tác
  động lẫn nhau, và yêu cầu tham khảo game bài bạc Discord khác.
- **Tài liệu/code liên quan:** `minigame_rules.json`, `MiniGameService`,
  `014_DAILY_WORK_MINIGAME_SPEC.md`, `Q-ECONOMY-007/009/010`.
- **Tham khảo đã kiểm tra:** Highlow của Dank Memer dùng một hint number riêng rồi cho chọn
  Higher/Lower/Exact bằng button. Tuy nhiên game đó không dùng cùng contract wager của dự án:
  đoán sai không mất wager và reward là coin grant. Vì vậy chỉ có thể tham khảo UI/private
  session, không thể sao chép payout mà vẫn giữ economy hiện tại.
- **Điểm đã rõ:** Mỗi Player có tối đa một round ACTIVE riêng; unique `(player_id, game_id)`,
  owner-only component, Player A không đọc/settle/expire round của Player B.
- **Điểm chưa rõ:** Dùng private midpoint roll cân bằng hay bộ bài 13 hạng với lá mốc 7.
- **Mâu thuẫn đã kiểm chứng:** Nếu thấy lá mốc ngẫu nhiên và chọn phía có nhiều kết quả hơn,
  payout đúng `2×` tạo RTP ít nhất khoảng `142,01%` khi hòa mất cược và khoảng `149,70%` nếu hòa
  hoàn cược. Cả hai đều vượt 100% và tạo nguồn sinh Linh Thạch vô hạn.
- **Phương án A — Private midpoint 1–101 (đề xuất sau tham khảo):** mỗi round sinh sẵn một số
  ẩn riêng trong `1..101`; UI hiển thị mốc 51 và hai button Cao/Thấp. Cao thắng khi `>51`, Thấp
  thắng khi `<51`, đúng 51 mất cược; đúng nhận tổng `2×`. Hai hướng cân bằng 50 kết quả, RTP nội
  bộ khoảng `99,0099%`; UI không hiển thị RTP.
- **Phương án B — Private rank 1–13:** mỗi round sinh một hạng ẩn riêng; UI hiển thị lá mốc 7.
  Cao thắng `8..13`, Thấp thắng `1..6`, đúng 7 mất cược; đúng nhận tổng `2×`. Hai hướng cân bằng,
  RTP nội bộ `92,3077%`; mang cảm giác bài hơn nhưng house edge cao hơn đáng kể.
- **Đề xuất kỹ thuật (chưa áp dụng):** A vì gần mô hình Higher/Lower phổ biến, private session
  đúng yêu cầu mới và giữ payout `2×` mà không có chiến thuật chọn phía xác suất cao hơn.
- **Phần bị chặn:** Deal engine, button và debit wager của `!highlow <số tiền>`. Timeout/refund
  policy đã được khóa độc lập; Daily/Work/Slot không bị ảnh hưởng.
- **Câu trả lời của chủ dự án:** Chọn A; đúng nhận tổng `2 × tiền cược`, sai hoặc đúng mốc mất
  cược; mỗi người có process/ván riêng biệt không tác động nhau.
- **Kết quả xử lý:** Đã triển khai private persisted round theo Player, miền `1..101`, mốc 51,
  owner-only button và lazy refund sau 120 giây. “Process riêng” được hiện thực bằng state/lock
  riêng theo Player trong PostgreSQL, không tạo OS process riêng gây lãng phí tài nguyên.
- **Trạng thái:** RESOLVED
---

## Q-ECONOMY-012 — Tài khoản kinh tế trước khi tạo nhân vật

- **Bối cảnh:** Chủ dự án yêu cầu Discord user chưa dùng slash `/start` vẫn được dùng `!daily`,
  `!work`, `!slot` và `!highlow` để kiếm/cược Linh Thạch. PostgreSQL hiện gắn wallet, ledger,
  idempotency và Mini Game round bằng FK tới `players`.
- **Tài liệu/code liên quan:** `players`, `player_wallets`, `PlayerStartService`,
  `PlayerRuntimeRepository`, `EconomyActivityService`, `MiniGameService`.
- **Điểm cần quyết định:** Tạo identity tối giản rồi nâng cấp, tách bảng guest wallet, hay tự tạo
  luôn nhân vật đầy đủ.
- **Phương án A — Guest identity nâng cấp tại `/start` (đề xuất):** `players.account_status`
  là `GUEST|REGISTERED`; economy nhìn thấy cả hai, gameplay khác chỉ nhìn REGISTERED. `/start`
  atomically nâng guest, giữ wallet/history và cộng quà khởi đầu hiện hữu 100 Linh Thạch. Ít đổi
  FK, không nhân đôi wallet, nhưng repository phải mặc định lọc guest.
- **Phương án B — Bảng economy account riêng:** wallet owner tách khỏi Player rồi liên kết khi
  `/start`. Aggregate sạch hơn nhưng phải đổi toàn bộ FK wallet/ledger/idempotency/round.
- **Phương án C — Tự tạo nhân vật đầy đủ khi dùng Daily:** đơn giản persistence nhưng tự chọn đạo
  hiệu/Linh Căn/công pháp, phá luồng roll nhân vật đã duyệt.
- **Đề xuất kỹ thuật:** A; guest mặc định map Thanh Vân Sơn Mạch, wallet 0, có thể nhận Daily/Work.
  Không cấp quyền tu luyện, chiến đấu, trang bị, shop hoặc di chuyển map trước `/start`.
- **Câu trả lời của chủ dự án:** Người chưa đăng ký trò chơi bằng `/start` vẫn được chơi Mini
  Game và dùng Daily để kiếm Linh Thạch.
- **Kết quả xử lý:** Đã triển khai A bằng migration 038. Bốn message command tự ensure guest;
  `/start` dùng atomic upsert `GUEST → REGISTERED`, bảo toàn Linh Thạch đã kiếm và cộng đúng 100
  quà khởi đầu một lần.
- **Trạng thái:** RESOLVED

---

## Q-SHOP-001 — Một slash `/shop` và phạm vi shop Tông Môn

- **Bối cảnh:** Chủ dự án yêu cầu shop thường có hai khu vực, shop Tông Môn và shop Kỳ
  Ngộ. Runtime hiện có `/shop xem|mua` chỉ cho `GENERAL`; đổi thưởng Tông Môn đã chạy độc
  lập trong `/tongmon` bằng `SectService`, điểm cống hiến và transaction riêng.
- **Tài liệu/code liên quan:** `005_SHOP_SPEC.md`, `009_SHOP_RUNTIME_SPEC.md`,
  `shop_templates.json`, `ShopService`, `/shop`, `/tongmon`, `SectService`,
  `sect_exchange_template.json`.
- **Điểm chưa rõ:** “cùng 1 slash” áp dụng cho hai khu shop thường hay toàn bộ shop; có
  giữ đường vào shop Tông Môn trong `/tongmon` để tương thích UI hiện tại hay không.
- **Phương án A — Một panel `/shop`, giữ lối tắt `/tongmon` (đề xuất):** `/shop` có các
  tab `Phường Thị`, `Trân Các`, `Tông Môn`, và `Thương Nhân Kỳ Ngộ` khi có phiên. Tab Tông
  Môn gọi lại `SectService`; `/tongmon` vẫn giữ nút đổi thưởng cũ. Người chơi dễ tìm, không
  phá luồng cũ; presentation phải adapter hai service khác nhau.
- **Phương án B — Chỉ gom hai khu shop thường:** `/shop` có `Theo Map` và `Đặc Biệt`;
  Tông Môn tiếp tục chỉ ở `/tongmon`, kỳ ngộ mở từ kết quả thám hiểm. Ít UI phức tạp nhưng
  hàng hóa bị phân tán ở nhiều command.
- **Phương án C — Chuyển toàn bộ giao dịch sang `/shop`:** `/tongmon` chỉ còn thông tin,
  nhiệm vụ và gia nhập; mọi mua/đổi hàng nằm trong `/shop`. Gọn về lâu dài nhưng thay đổi
  luồng đã phát hành và cần migration component/session.
- **Đề xuất kỹ thuật (chưa áp dụng):** A. Chỉ dùng chung presentation/controller; shop
  Tông Môn tiếp tục sở hữu nghiệp vụ và currency riêng, không ép vào repository shop thường.
- **Phần bị chặn:** Cấu trúc component và routing cuối cùng của `/shop`.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả xử lý:** `/shop` đã trở thành panel duy nhất với select Phường Thị, Trân Các,
  Tông Môn và Merchant khi có phiên; `/tongmon` vẫn giữ shortcut cũ. Tab Tông Môn gọi
  `SectService`, không trộn Điểm Tông Môn vào nghiệp vụ shop thường.
- **Trạng thái:** RESOLVED

---

## Q-SECT-007 — Độ phủ “đủ cảnh giới và phẩm” của truyền thừa Tông Môn

- **Bối cảnh:** Shop Tông Môn hiện có 18 exchange rule, tương ứng ba nhóm `CULTIVATION_ART`,
  `ATTACK`, `DEFENSE` tại sáu phẩm Hoàng/Huyền/Địa/Thiên/Thánh/Thần. Realm gate hiện lần lượt
  là Luyện Khí, Kết Đan, Luyện Hư, Chân Tiên, Đại La và Đạo Tổ. Yêu cầu mới muốn mỗi Tông Môn
  có Công Pháp/Kỹ Năng đặc hữu “đủ cảnh giới và phẩm”, nhưng chưa xác định có cần một bộ riêng
  cho từng 15 cảnh giới hay dùng sáu mốc phẩm hiện hữu.
- **Tài liệu/code liên quan:** `005_SECT_SPEC.md`, `sect_exchange_template.json`,
  `sect_reward_pools.json`, các catalog `cultivation_arts`, `attackSkills`, `defenseSkills`.
- **Điểm chưa rõ:** Số lượng content cần phát hành cho mỗi Tông Môn và quan hệ Realm–Grade.
- **Phương án A — Sáu phẩm, sáu Realm gate hiện hữu (đề xuất):** mỗi Tông Môn có đúng một
  Công Pháp, một Kỹ Năng công và một Kỹ Năng thủ đặc hữu tại mỗi phẩm; tổng `10 × 6 × 3 = 180`
  truyền thừa. Các cảnh giới giữa hai gate tiếp tục dùng phẩm đã mở gần nhất. Ít trùng content,
  phù hợp loadout/catalog hiện tại và đủ đường tiến triển từ Luyện Khí tới Đạo Tổ.
- **Phương án B — Mười lăm cảnh giới, ba dòng mỗi cảnh giới:** mỗi Tông Môn có 45 truyền thừa,
  toàn hệ thống 450. Tiến triển dày hơn nhưng cần thêm grade mapping, lượng balance/action rất
  lớn và làm loãng ý nghĩa sáu phẩm.
- **Phương án C — Sáu bí kíp gốc + nâng cấp ở 15 cảnh giới:** giữ 180 template nhưng thêm cấp
  tu luyện/nâng phẩm theo từng cảnh giới. Content gọn hơn B nhưng cần một progression system
  mới cho bí kíp, EXP/cost và migration ownership.
- **Đề xuất kỹ thuật:** A; Realm gate và giá Điểm Cống Hiến tiếp tục data-driven,
  có thể thêm phẩm/cảnh giới sau mà không sửa `SectService`.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả xử lý:** Đã sinh 180 truyền thừa độc quyền: 10 Tông Môn × 6 phẩm × 3 nhóm.
  Sáu Realm gate và giá `SECT_POINT` tiếp tục đọc từ `sect_exchange_template.json`.
- **Trạng thái:** RESOLVED

---

## Q-SECT-008 — Hệ truyền thừa của ba Tông Môn đang khai báo Vô hệ

- **Bối cảnh:** Bảy Tông Môn có hệ rõ ràng: Hỏa/Mộc/Thổ/Thủy/Kim/Lôi/Băng. `Lưỡng Nghi Tông`,
  `Sát Thần Điện`, `Trường Sinh Cốc` hiện có `element: null`; generator vì vậy đưa mọi hệ vào
  pool của họ, trái yêu cầu mỗi Tông Môn có truyền thừa đặc biệt theo hệ riêng.
- **Tài liệu/code liên quan:** `sect_template.json`, Element registry, Light/Dark/Chaos policy,
  Spirit Root affinity, multi-element Skill Action và `generateSectRewardPools.js`.
- **Điểm chưa rõ:** Ba Tông Môn này dùng hệ nào; Lưỡng Nghi là song hệ hay một hệ Hỗn Độn;
  có đổi `sect.element` dùng cho UI hay thêm `inheritanceElements` riêng.
- **Phương án A — Theo lore song hệ:** Lưỡng Nghi `LIGHT + DARK`, Sát Thần `DARK`, Trường Sinh
  `WOOD`; thêm `inheritanceElements[]` và UI hiển thị đầy đủ. Đúng fantasy nhất, nhưng Công Pháp
  song hệ cần mở rộng affinity contract từ một Element sang danh sách Element.
- **Phương án B — Một hệ canonical cho mỗi Tông Môn (đề xuất kỹ thuật):** Lưỡng Nghi `CHAOS`,
  Sát Thần `DARK`, Trường Sinh `WOOD`; đổi `sect.element` tương ứng. Tái sử dụng schema một hệ,
  Hỗn Độn hợp lore âm dương và runtime hiện hữu; đổi cách UI gọi ba Tông Môn từ Vô hệ sang có hệ.
- **Phương án C — Giữ Vô hệ nhưng content độc quyền:** bí kíp mang `NEUTRAL`, không nhận/không
  gây elemental counter và affinity theo policy vô hệ. Ít đổi engine nhưng không tận dụng
  Light/Dark/Chaos đã có và kém sát yêu cầu “theo hệ”.
- **Đề xuất kỹ thuật:** B để không mở thêm multi-element Cultivation Art; nếu
  ưu tiên lore hơn chi phí kỹ thuật thì chọn A.
- **Câu trả lời của chủ dự án:** Chọn B.
- **Kết quả xử lý:** `SECT_YINYANG = CHAOS`, `SECT_ASSASSIN = DARK`,
  `SECT_LONGEVITY = WOOD`; UI dùng icon Element canonical. Đã bổ sung icon Ánh Sáng,
  Bóng Tối và Hỗn Độn vào registry.
- **Trạng thái:** RESOLVED

---

## Q-SECT-009 — Mua truyền thừa đặc hữu, random pool và sách trùng

- **Bối cảnh:** Runtime hiện cho người chơi chọn `category + grade`, sau đó random equal-weight
  trong pool và cho phép nhận sách trùng (`duplicatePolicy: ALLOW`). Với truyền thừa đặc hữu,
  người chơi cần biết chính xác Công Pháp/Kỹ Năng đang mua; nhận lại cùng bí kíp sẽ tốn Điểm
  Cống Hiến nhưng không tạo giá trị học mới.
- **Tài liệu/code liên quan:** `Q-SECT-002/005`, `SectService.rollRewardItem()`,
  `exchangeTemplate()`, Shop product duplicate policy và UI `/shop`/`/tongmon`.
- **Điểm chưa rõ:** Mỗi rule bán cố định một truyền thừa hay vẫn random; sách đã học/đang có
  được mua lại hay bị khóa; người chơi xem tên/effect trước khi xác nhận hay chỉ xem nhóm/phẩm.
- **Phương án A — Một bí kíp cố định mỗi rule, chặn duplicate (đề xuất):** UI hiển thị chính xác
  tên, hệ, phẩm, Realm gate, effect và giá; sách đã học/đang có bị khóa. Transaction khóa Player,
  kiểm tra ownership lại rồi debit/grant/log atomically. Minh bạch và phù hợp Shop Tông Môn
  đặc hữu; explicit weighted pool chỉ còn dùng cho reward khác.
- **Phương án B — Giữ random và cho duplicate:** ít đổi runtime nhất, nhưng người chơi không
  chủ động chọn truyền thừa và có thể mất cống hiến vào sách vô dụng.
- **Phương án C — Random nhưng loại ownership:** pool lọc sách đã học/đang có; khi cạn trả
  `SECT_REWARD_POOL_EXHAUSTED`. Giữ cảm giác rút truyền thừa nhưng preview không thể cam kết
  chính xác và concurrency phức tạp hơn A.
- **Đề xuất kỹ thuật:** A; vẫn lưu immutable reward snapshot và operation ID,
  không học thẳng mà cấp bí kíp vào túi như Shop thường.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả xử lý:** Mỗi pool có đúng một bí kíp và policy `DENY_OWNED`; `/shop` và `/tongmon`
  preview đúng tên/hệ/phẩm/mô tả/Realm gate/giá. Runtime kiểm tra cả sách trong túi, Công Pháp
  đã học và Kỹ Năng đã học bên trong idempotent Player transaction trước khi debit/grant.
- **Trạng thái:** RESOLVED

---

## Q-SHOP-002 — Product contract cho Item, Công Pháp, Kỹ Năng và Trang Bị

- **Bối cảnh:** Shop hiện chỉ nhận `itemId` thuộc `itemTemplates` và luôn cộng stackable
  item. Yêu cầu mới cần bán thêm Công Pháp, Kỹ Năng và trang bị siêu phẩm/thần binh. Các
  loại này có lifecycle khác nhau: Công Pháp/Kỹ Năng được học từ bí kíp; trang bị là instance
  có grade, quality, element, affix và effect.
- **Tài liệu/code liên quan:** `ShopService.purchase`, `purchaseShopEntry`,
  `RewardApplyService`, `CultivationArtService`, `SkillService`, `EquipmentService`, các
  catalog `skills/` và `equipment/`.
- **Điểm chưa rõ:** Mua Công Pháp/Kỹ Năng sẽ học thẳng hay nhận bí kíp; xử lý hàng đã
  học/đã sở hữu; trang bị shop là instance cố định hay sinh thuộc tính lúc mua.
- **Phương án A — Mọi hàng hóa là reward descriptor (đề xuất):** `ITEM` cộng stack;
  `CULTIVATION_ART_BOOK`/`SKILL_BOOK` nhận bí kíp rồi tự học trong `/congphap`;
  `EQUIPMENT` tạo instance từ snapshot hàng hóa đã roll khi shop refresh. Bí kíp đã học hoặc
  đã có trong túi bị khóa mua; trang bị có thể mua nếu còn stock. Đồng nhất UI/lore, mua lại
  idempotent và người chơi xem đúng chỉ số trước khi trả tiền; cần mở rộng transaction shop.
- **Phương án B — Học thẳng Công Pháp/Kỹ Năng:** mua xong ghi thẳng learned list; trang bị
  vẫn sinh instance. Ít thao tác nhưng bỏ qua luồng bí kíp hiện hành và cần semantics hoàn
  tiền/duplicate riêng.
- **Phương án C — Đóng gói mọi thứ thành item tĩnh:** tạo item template riêng cho từng bí
  kíp và từng trang bị. Repository shop ít đổi nhưng nhân bản catalog, trang bị random khó
  preview và dễ lệch nguồn chuẩn.
- **Đề xuất kỹ thuật (chưa áp dụng):** A. Entry lưu `product` discriminated union và snapshot
  immutable của hàng đã refresh; purchase áp dụng cost + reward + stock + ledger trong cùng
  PostgreSQL transaction.
- **Phần bị chặn:** Schema entry v2, grant nhiều product type và nội dung Trân Các/Kỳ Ngộ.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả xử lý:** Đã nâng Shop entry thành product descriptor có bốn kind `ITEM`,
  `CULTIVATION_ART_BOOK`, `SKILL_BOOK`, `EQUIPMENT` và vẫn tương thích entry `itemId` cũ.
  Bí kíp đã học/đã có bị chặn cả ở projection lẫn transaction; equipment grant instance từ
  immutable snapshot đã preview. Migration 033 lưu `product_kind/product_snapshot`; purchase
  vẫn debit, grant, purchase log và resource ledger trong cùng idempotent transaction.
- **Trạng thái:** RESOLVED
---

## Q-SHOP-003 — Refresh, stock và phiên Thương Nhân Kỳ Ngộ

- **Bối cảnh:** Chủ dự án muốn có xác suất gặp Thương Nhân Kỳ Ngộ khi thám hiểm; merchant
  có thể bán đan dược, phù lục, bí kíp, thần binh tốt nhất map hoặc item bất kỳ. Chưa có tỷ
  lệ, số ô hàng, điều kiện xuất hiện, thời gian tồn tại hoặc stock. Exploration hiện chỉ tạo
  encounter quái, battle và reward trong activity transaction.
- **Tài liệu/code liên quan:** `ExplorationService`, `/thamhiem`, `activity_runs`,
  `player_shop_purchases`, period counters, map/catalog reward và scheduler spec.
- **Điểm chưa rõ:** Merchant roll trước hay sau chiến đấu; thua/hòa có gặp không; tỷ lệ;
  số mặt hàng; phiên hết hạn khi nào; mỗi entry mua được bao nhiêu; regular/special refresh.
- **Phương án A — Phiên persisted sau chiến thắng (đề xuất):** mỗi lần thắng có `5%` cơ hội;
  tạo 4 ô hàng bằng seed đã lưu, tồn tại 15 phút; mỗi ô stock 1 và có thể mua nhiều ô. Shop
  Theo Map là catalog cố định với limit ngày; Trân Các refresh tuần theo timezone game.
  Chống reroll/restart tốt, tạo cảm giác kỳ ngộ; cần bảng session/stock mới.
- **Phương án B — Merchant là encounter thay cho quái:** mỗi lần `/thamhiem` có `5%` gặp
  merchant và không battle/reward; 6 ô, tồn tại đến lần thám hiểm tiếp theo. Đúng nghĩa gặp
  trên đường nhưng có thể làm người chơi mất một lượt farm quái.
- **Phương án C — Popup chỉ sống trong interaction:** sau chiến thắng có `10%`, 4 ô, mua
  ngay bằng button rồi hết khi component timeout. Code/DB ít hơn nhưng restart hoặc Discord
  timeout làm mất cơ hội và khó bảo vệ stock khi nhiều interaction đồng thời.
- **Đề xuất kỹ thuật (chưa áp dụng):** A. Roll chance trong completion transaction bằng seed
  riêng; lưu `shop_session`, immutable entry snapshot, `expires_at` và remaining stock. Mua
  khóa session/entry bằng `SELECT ... FOR UPDATE`.
- **Phần bị chặn:** Hook exploration, migration session/stock, pool kỳ ngộ và refresh policy.
- **Câu trả lời của chủ dự án:** Chọn một phương án mới: trước trận đánh, Thám Hiểm roll
  một encounter theo trọng số. Quái là loại phổ biến nhất; Thương Nhân Kỳ Ngộ là một event
  hiếm thay thế trận đánh. Registry phải data-driven để về sau thêm nhiều kỳ ngộ/event/reward
  khác mà không sửa pipeline lõi.
- **Kết quả xử lý:** Thám Hiểm dùng weighted encounter registry trước battle. `MONSTER` chạy
  combat cũ; `MYSTERY_MERCHANT` và `FORTUNE_REWARD` hoàn tất activity không battle. Merchant
  persist session/stock lazy-expiry; fortune áp dụng reward table map idempotently.
- **Trạng thái:** RESOLVED
---

## Q-SHOP-004 — Nguồn giá và phẩm hàng theo 15 map

- **Bối cảnh:** Yêu cầu nói Trân Các “đắt đỏ”, thần binh kỳ ngộ “hơi đắt” và hàng thường
  phù hợp map, nhưng chưa có giá trị hay curve. Dự án có 15 map/cảnh giới, sáu phẩm Công
  Pháp/Kỹ Năng và trang bị sinh theo realm/grade/quality; hard-code giá trong service sẽ làm
  mất khả năng cân bằng data-driven.
- **Tài liệu/code liên quan:** `maps.json`, catalog Skill/Công Pháp/Equipment, currency rules,
  `shop_templates.json`, Lazy Economy/period counter specs.
- **Điểm chưa rõ:** Giá tuyệt đối theo map/phẩm; currency của Phường Thị, Trân Các và Kỳ
  Ngộ; định nghĩa “siêu phẩm” và “đồ xịn nhất map”; có cho mua hàng cao hơn map hiện tại không.
- **Phương án A — Bảng giá JSON theo realm/category/grade (đề xuất):** cả ba shop dùng Linh
  Thạch; Tông Môn giữ điểm cống hiến. File config khai báo base price cho từng realm và hệ số
  `ITEM`, `ART`, `SKILL`, `EQUIPMENT`, rarity/quality, shop type. Hàng Theo Map không vượt
  realm map; Trân Các có grade được mở ở cảnh giới hiện tại nhưng quality cao nhất; Kỳ Ngộ
  thần binh là trang bị quality cao nhất được phép của map hiện tại. Dễ chỉnh và audit, file
  lớn hơn nhưng không sửa code khi cân bằng.
- **Phương án B — Một công thức lũy thừa:** `base × realmGrowth^(mapOrder-1) × modifier`;
  config rất gọn nhưng số lớn tăng nhanh và chỉnh riêng từng mốc khó.
- **Phương án C — Giá explicit từng entry:** tác giả ghi giá trực tiếp trên mọi mặt hàng;
  kiểm soát tuyệt đối nhưng dễ lệch cân bằng giữa hàng trăm entry và khó sinh shop động.
- **Đề xuất kỹ thuật (chưa áp dụng):** A. Dùng integer string cho mọi giá, validator bắt đủ
  15 realm tier; UI format qua `IntegerAmount`, tuyệt đối không ép sang JavaScript `Number`.
- **Phần bị chặn:** Catalog hàng, giá, pool động và validator cân bằng shop.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả xử lý:** Đã phát hành `shop_rules.json` đủ 15 map, product/shop multiplier và
  `ShopPriceService` BigInt; catalog không vượt grade mở tại map và trang bị đặc biệt dùng
  immutable high-quality snapshot.
- **Trạng thái:** RESOLVED
---

## Q-SHOP-005 — Trọng số encounter và vòng đời Thương Nhân Kỳ Ngộ

- **Bối cảnh:** `Q-SHOP-003` đã khóa encounter registry động và merchant thay thế trận đánh,
  nhưng “tỷ lệ không cao” chưa có con số; slot, TTL và quan hệ với lần thám hiểm sau cũng
  chưa được chọn. Các số này quyết định trực tiếp tần suất farm và schema session/stock.
- **Tài liệu/code liên quan:** `Q-SHOP-003`, `ExplorationService`, `activity_runs`, shop
  session/stock design.
- **Phương án A — MVP 90/5/5 (đề xuất):** `MONSTER 90%`, `MYSTERY_MERCHANT 5%`,
  `FORTUNE_REWARD 5%`. Merchant có 4 slot, mỗi slot stock 1, tồn tại 15 phút và Player chỉ
  có một session merchant active; mở merchant mới chỉ sau khi phiên cũ hết hạn. Fortune là
  một reward event nhỏ theo reward table map. Đủ hiếm, đồng thời chứng minh registry có thể
  chạy hơn một loại kỳ ngộ ngay từ đầu.
- **Phương án B — Hiếm hơn 95/3/2:** `MONSTER 95%`, merchant 3%, fortune 2%; merchant có
  3 slot và tồn tại 10 phút. Giữ nhịp battle/farm gần hiện tại nhưng người chơi ít thấy tính
  năng mới.
- **Phương án C — Chỉ merchant trong MVP:** `MONSTER 95%`, merchant 5%; 4 slot, 15 phút.
  Registry vẫn dynamic nhưng chưa phát hành reward event thứ hai. Ít phạm vi hơn A nhưng
  chưa kiểm chứng nhánh event reward tổng quát.
- **Đề xuất kỹ thuật (chưa áp dụng):** A. Tất cả weight/slot/TTL nằm trong JSON; dùng seed
  lưu cùng activity run. Event không battle phải hoàn tất activity bằng outcome riêng, reward
  và merchant session vẫn idempotent.
- **Phần bị chặn:** Encounter config, exploration dispatcher, merchant session và fortune event.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả xử lý:** Đã áp dụng `90/5/5`, bốn slot stock 1, TTL 900 giây và một session
  active/Player trong GameData, exploration dispatcher và PostgreSQL session runtime.
- **Trạng thái:** RESOLVED
---

## Q-SHOP-006 — Giá cụ thể cho 15 map và hệ số loại hàng

- **Bối cảnh:** `Q-SHOP-004` chọn bảng giá JSON, nhưng chưa có giá base hoặc multiplier.
  Chỉ chọn cấu trúc file chưa đủ để tạo catalog có thể mua và audit economy.
- **Tài liệu/code liên quan:** `Q-SHOP-004`, `maps.json`, `shop_templates.json`, catalog
  Item/Công Pháp/Kỹ Năng/Equipment.
- **Phương án A — Curve khoảng ×2.4 mỗi map (đề xuất):** base Linh Thạch map 1→15 là
  `100, 250, 625, 1.500, 3.750, 9.000, 22.500, 55.000, 135.000, 330.000, 800.000,
  2.000.000, 5.000.000, 12.500.000, 30.000.000`. Hệ số product:
  nguyên liệu thường `1`, nguyên liệu hiếm `3`, consumable `2`, vé `5`, Công Pháp `25`,
  Kỹ Năng `20`, trang bị `30`. Hệ số shop: Theo Map `1`, Trân Các `3`, Kỳ Ngộ `1,5`.
  Giá tăng mạnh theo progression và hàng siêu phẩm thực sự đắt; late-game cần nguồn Linh
  Thạch tương ứng được cân bằng về sau.
- **Phương án B — Curve ×2 mỗi map:** base `100, 200, 400, 800, 1.600, 3.200, 6.400,
  12.800, 25.600, 51.200, 102.400, 204.800, 409.600, 819.200, 1.638.400`; dùng cùng hệ
  số product/shop của A. Dễ đọc, an toàn với economy hiện chưa hoàn thiện nhưng chênh giá
  late-game nhỏ hơn nhiều.
- **Phương án C — Chỉ phát hành giá Luyện Khí:** dùng base map 1 là `100` và các hệ số A;
  map 2–15 giữ `CONTENT_PENDING` cho đến khi economy mỗi realm có income target. Cân bằng
  chắc nhất nhưng không đáp ứng shop đủ 15 map ngay.
- **Quy tắc chung:** Giá cuối làm tròn lên integer; Tông Môn tiếp tục dùng bảng Điểm Tông
  Môn riêng. Shop Theo Map bán resource map và consumable phù hợp; Trân Các refresh tuần
  với 6 slot; hàng đã học/đã có bí kíp bị khóa; equipment/công pháp/kỹ năng không vượt grade
  được mở ở realm hiện tại.
- **Đề xuất kỹ thuật (chưa áp dụng):** A để có catalog đủ 15 map; mọi con số nằm trong JSON,
  validator bắt đủ map và integer-safe.
- **Phần bị chặn:** Shop price config, generated catalog và purchase integration test.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả xử lý:** Đã áp dụng curve A và toàn bộ multiplier vào JSON; validator khóa đủ
  15 map và phép tính giá làm tròn lên bằng integer-safe decimal multiplication.
- **Trạng thái:** RESOLVED
---

## Q-SHOP-007 — Scope rotation Trân Các và giới hạn mua shop Theo Map

- **Bối cảnh:** `Q-SHOP-006` đã khóa Trân Các refresh tuần với sáu slot nhưng chưa nói sáu
  món là chung toàn server, chung theo map/cảnh giới hay riêng từng Player. Shop Theo Map
  được yêu cầu có hàng cố định nhưng chưa có quantity limit. Hai lựa chọn ảnh hưởng trực tiếp
  tới khả năng chia sẻ thông tin shop, độ hiếm và contention database.
- **Tài liệu/code liên quan:** `shop_rules.json`, `PeriodKeyService`, `player_period_counters`,
  catalog Công Pháp/Kỹ Năng/Equipment và shop session design.
- **Phương án A — Chung theo map/cảnh giới, limit riêng Player (đề xuất):** mọi Player đứng
  cùng map thấy cùng sáu món Trân Các trong tuần; không có stock toàn server, mỗi entry chỉ
  mua một lần/Player/tuần. Shop Theo Map: nguyên liệu thường tối đa 20/ngày, nguyên liệu hiếm
  5/ngày, consumable/vé giữ giới hạn khai báo của entry. Dễ chia sẻ tin tức, không tạo race
  stock toàn server và vẫn kiểm soát faucet.
- **Phương án B — Rotation riêng từng Player:** seed gồm Player ID; mỗi người có sáu món
  khác nhau và mua một lần/tuần. Cá nhân hóa tốt nhưng người chơi không thể chia sẻ thông tin
  Trân Các, snapshot/cache nhiều hơn.
- **Phương án C — Chung toàn server và stock toàn server:** mọi Player thấy cùng hàng, mỗi
  slot có stock hữu hạn server-wide. Tạo cạnh tranh mạnh nhưng dễ bị bot mua sạch, cần fairness,
  thông báo restock và transaction contention cao; không phù hợp MVP.
- **Đề xuất kỹ thuật (chưa áp dụng):** A. Seed canonical `periodKey + mapId + rulesRevision`;
  period counter khóa limit theo Player. Merchant kỳ ngộ vẫn là session riêng Player và stock 1.
- **Phần bị chặn:** Sinh sáu slot Trân Các, subject key period counter và limit shop Theo Map.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả xử lý:** Catalog Theo Map lấy đúng bốn resource của map và hàng consumable hiện
  hành; resource thường giới hạn 20/ngày, hiếm 5/ngày. Trân Các dùng seed chung theo
  `periodKey + mapId + rulesVersion`, sáu slot và limit một lần/Player/tuần; không có stock
  toàn server. Price/period subject đều được lazy-resolve, không dùng scheduler tick.
  Ngày 2026-08-04, chủ dự án yêu cầu bỏ giới hạn shop: Phường Thị và Trân Các đã chuyển
  toàn bộ `purchaseLimit` về `null`; rotation tuần vẫn giữ để đổi danh mục hàng, không còn
  giới hạn số lần mua. Stock của Merchant Kỳ Ngộ và exchange rule Tông Môn là contract riêng.
- **Trạng thái:** RESOLVED

---

## Q-SHOP-008 — Thành phần hàng Merchant và phạm vi Phù Lục MVP

- **Bối cảnh:** Merchant đã có 4 slot stock 1, nhưng chưa có tỷ trọng loại hàng. Yêu cầu nói
  “thường là đan dược, phù lục”, đôi khi Công Pháp hoặc thần binh. Catalog hiện có đan dược,
  nguyên liệu, bí kíp và trang bị nhưng chưa có Item Phù Lục sử dụng được; tự thêm Phù Lục
  đòi hỏi chọn effect, thời hạn và stacking.
- **Tài liệu/code liên quan:** `shop_rules.json`, item/action/effect registries, profession Phù
  Sư, `ShopCatalogService`, merchant session snapshot.
- **Phương án A — Weighted pool, Phù Lục để CONTENT_PENDING (đề xuất):** mỗi slot roll độc
  lập `ITEM 60% / CULTIVATION_ART_BOOK 12,5% / SKILL_BOOK 12,5% / EQUIPMENT 15%`;
  duplicate template trong một phiên bị loại. ITEM hiện lấy đan dược, vé và resource map;
  Phù Lục chỉ vào pool sau khi gameplay Phù Lục được duyệt. Equipment luôn là phẩm cao nhất
  map, quality `HIGH`, rarity `LEGENDARY`. Đúng tính hiếm và không phát minh mechanic mới.
- **Phương án B — Bắt buộc đủ nhóm:** hai Item, một bí kíp ngẫu nhiên và một Equipment mỗi
  merchant. Preview đa dạng nhưng thần binh xuất hiện ở toàn bộ encounter merchant, làm giảm
  độ hiếm so với mô tả “có khi”.
- **Phương án C — Triển khai Phù Lục ngay:** dùng pool A nhưng bổ sung Phù Lục chiến đấu
  một trận và Phù Lục tu luyện có thời hạn. Đúng fantasy sớm hơn nhưng cần mở thêm câu hỏi về
  effect/stack/duration và mở rộng ItemUse runtime trước khi shop hoàn tất.
- **Đề xuất kỹ thuật (chưa áp dụng):** A. Weight nằm trong JSON; author chỉ cần thêm template
  có tag merchant-eligible để mở rộng pool. Session lưu immutable product/cost snapshot.
- **Phần bị chặn:** Sinh 4 entry merchant cụ thể và bật encounter merchant production.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả xử lý:** `shop_rules.json` khai báo `ITEM 60 / CULTIVATION_ART_BOOK 12,5 /
  SKILL_BOOK 12,5 / EQUIPMENT 15`; bốn slot loại duplicate template, equipment dùng grade
  cao nhất map + `HIGH/LEGENDARY`. Phù Lục giữ `CONTENT_PENDING`, không xuất hiện trong
  pool cho đến khi Item effect được duyệt. Encounter merchant tạo persisted session 15 phút;
  mua khóa entry/stock và đọc lại product/cost snapshot trong transaction.
- **Trạng thái:** RESOLVED
---

## Q-CULT-004 — Công Pháp khởi đầu vô hệ và bonus tương hợp Linh Căn

- **Bối cảnh:** Chủ dự án yêu cầu Player mới nhận một Công Pháp vô hệ để tu luyện bình
  thường; khi Công Pháp phù hợp Linh Căn thì được tăng thêm tốc độ tu luyện theo phẩm cấp
  trong khoảng 20–50%. Runtime hiện dùng `CP_FIRE_HOANG` làm Công Pháp active khởi đầu
  (+25%) và đồng thời tặng sách `CP_WOOD_HOANG`. Bảng hiện hành lấy Trung phẩm của mỗi cấp,
  tạo curve Hoàng/Huyền/Địa/Thiên/Thánh/Thần là `25/45/65/90/115/130%`, không có affinity
  check giữa Element Công Pháp và Linh Căn.
- **Tài liệu/code liên quan:** `cultivation_arts.json`, `cultivation_art_grades.json`,
  `character_creation_rules.json`, `PlayerStartService`, `GameDataNormalizer`,
  `SpiritRootEffectResolver`, `CultivationArtService`, Rebirth bootstrap và migration Player.
- **Điểm chưa rõ:** “Tu luyện bình thường” của Công Pháp vô hệ là +0% hay có bonus cố định;
  curve chính xác cho sáu phẩm Công Pháp; bonus 20–50% thay thế bonus hiện tại hay cộng thêm;
  Công Pháp lệch hệ có còn bonus không; Thiên Linh Căn/Ngũ Hành/Hỗn Độn được xét tương hợp
  thế nào; có tiếp tục tặng thêm sách hệ Mộc khi tạo nhân vật không.
- **Phương án A — Affinity là nguồn bonus duy nhất (đề xuất):** thêm `Dẫn Khí Quyết` vô hệ
  làm Công Pháp active khởi đầu, luôn +20%; không tặng thêm sách Mộc. Công Pháp có hệ chỉ
  nhận bonus khi tương hợp, theo curve Hoàng/Huyền/Địa/Thiên/Thánh/Thần
  `20/25/30/35/40/50%`; lệch hệ +0%. Linh Căn đơn/biến dị khớp exact Element, Ngũ Hành
  khớp Kim–Mộc–Thủy–Hỏa–Thổ, Thiên Linh Căn và Hỗn Độn khớp mọi Element không trung tính.
  Curve gọn, đúng khoảng mới và tạo lựa chọn loadout rõ; Player đang dùng Công Pháp lệch hệ
  có thể bị giảm tốc sau migration.
- **Phương án B — Giữ bonus nền và cộng affinity:** mọi Công Pháp giữ curve hiện tại
  `25–130%`; nếu hợp Linh Căn cộng thêm `20–50%`. Không làm giảm Player hiện hữu nhưng tốc độ
  tối đa tăng rất mạnh, khó cân bằng idle economy và khoảng 20–50% không còn là tổng bonus.
- **Phương án C — Bonus theo phẩm Linh Căn:** Công Pháp giữ một bonus nền riêng; phần
  tương hợp lấy phẩm Linh Căn Hạ→Thần `20/25/30/35/40/45/48/50%`. Làm phẩm Linh Căn nổi
  bật nhưng chồng thêm curve cultivation-only `0–50%` mà phẩm Linh Căn hiện đã sở hữu.
- **Ưu/nhược điểm kỹ thuật:** A cho một nguồn canonical dễ audit và data-driven; B tương thích
  save hiện hữu nhất nhưng tạo multiplier lớn; C dùng đủ tám phẩm Linh Căn nhưng double-count
  sức mạnh phẩm và không đúng cách catalog Công Pháp hiện đang phân cấp.
- **Đề xuất kỹ thuật (chưa áp dụng):** A. Tách `baseCultivationBonus` và
  `affinityCultivationBonus` trong projection để UI giải thích rõ; settle-before-change giữ
  nguyên. Affinity resolver dùng Element ID, không suy luận từ tên. Migration/backfill phải
  chuyển bootstrap active art sang ID vô hệ nhưng không tự đổi Công Pháp Player đã chọn.
- **Phần bị chặn:** Tạo Công Pháp vô hệ, thay starter/rebirth bootstrap, curve 20–50%, affinity
  resolver, migration/backfill Player và cập nhật UI/audit. Thay overflow từ 30% xuống 20%
  độc lập và đã được triển khai.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả xử lý:** Đã thêm `Dẫn Khí Quyết` vô hệ +20% làm starter cho Player mới và
  Luân Hồi. Công Pháp có hệ chỉ cộng tốc độ khi affinity resolver xác nhận tương hợp theo
  curve Hoàng→Thần `20/25/30/35/40/50%`; lệch hệ +0%. Ngũ Hành khớp năm hệ cơ bản,
  Thiên Linh Căn và Hỗn Độn khớp mọi hệ không trung tính. Migration 032 cấp quyền sở hữu
  Dẫn Khí Quyết cho Player cũ nhưng không đổi active art họ đã chọn. UI `/congphap` hiển thị
  rõ ổn định/tương hợp/không tương hợp và potential bonus.
- **Trạng thái:** RESOLVED
---

## Q-UI-004 — Phạm vi portrait quái thường và Boss trong giao diện battle

- **Bối cảnh:** Bộ environment art cho 15 map đã hoàn tất. Catalog runtime hiện có 83
  Monster ID xuất hiện trong normal spawn pool và 15 Boss ID trong Bí Cảnh. Một số quái
  cùng chủng tộc nhưng có tên, hệ và cấp map khác nhau; Boss luôn có identity riêng.
- **Tài liệu/code liên quan:** `monster_template.json`, `monster_spawn_pools.json`,
  `secret_realm_boss_pools.json`, `BattleLogAnimator.js`, `/thamhiem`, `/dungoan`,
  `/biccanh`, `ui_assets.json`.
- **Điểm chưa rõ:** Portrait quái thường cần artwork riêng cho từng Monster ID hay có thể
  dùng chung theo chủng tộc; có triển khai toàn bộ ngay hay ưu tiên Boss trước. Lựa chọn ảnh
  hưởng trực tiếp tới số asset, dung lượng repository, thời gian tạo/duyệt và độ chi tiết UI.
- **Phương án A — 15 Boss riêng + 15 portrait chủng tộc cho quái thường (đề xuất):** Boss
  có artwork độc nhất; 83 quái thường resolve theo `raceId`, riêng nhóm elemental dùng một
  portrait nền có palette đổi theo hệ. Chỉ khoảng 30 master, gọn và dễ thay thế; quái cùng
  chủng tộc chưa có silhouette riêng theo từng tên.
- **Phương án B — 98 portrait riêng theo Monster ID:** 83 quái thường và 15 Boss đều có
  artwork đúng identity. Nhận diện/lore tốt nhất nhưng số asset lớn, cần nhiều vòng visual QA
  và tăng đáng kể dung lượng repository.
- **Phương án C — Chỉ 15 portrait Boss trong đợt đầu:** hoàn thiện điểm nhấn Bí Cảnh nhanh
  nhất; battle quái thường tiếp tục dùng avatar người chơi hoặc fallback chung cho đến đợt sau.
- **Đề xuất kỹ thuật (chưa áp dụng):** A. Manifest khai báo `monsterPortraitPolicy` với
  mapping Boss theo `monsterId`, quái thường theo `raceId` và override tùy chọn theo
  `monsterId`; resolver luôn ưu tiên override rồi mới fallback chủng tộc. Battle chỉ nhận
  attachment URL ở presentation layer, không đưa đường dẫn ảnh vào GameData/business logic.
- **Phần bị chặn:** Việc sinh portrait, mapping asset cụ thể và gắn portrait quái vào ba
  command battle. Contract thumbnail tổng quát của `BattleLogAnimator`, kiểm kê catalog và
  audit fallback có thể tiếp tục độc lập.
- **Câu trả lời của chủ dự án:** Chọn A — 15 Boss có portrait riêng; quái thường dùng
  portrait theo chủng tộc, cho phép override theo Monster ID về sau.
- **Kết quả xử lý:** Đã phát hành 15 master chủng tộc, bảy palette cho nhóm Nguyên Tố và
  15 portrait Boss riêng. `monsterPortraitPolicy` resolve theo thứ tự Boss ID → override
  Monster ID → `raceId` → Element; `/thamhiem`, `/dungoan`, `/biccanh` dùng portrait trong
  realtime battle và kết quả cuối. Audit bao phủ đủ 83 quái thường và 15 Boss đang spawn,
  có fallback `null` an toàn cho content chưa có artwork.
- **Trạng thái:** RESOLVED
---

## Q-UI-003 — Phạm vi Application Emoji cho icon trang bị inline

- **Bối cảnh:** 32 template trang bị đã có PNG riêng. `/tuido` và `/trangbi` cần đặt icon
  ảnh ngay trước tên từng món, nhưng Discord không render file attachment như ảnh inline
  trong text hoặc String Select. Vị trí này chỉ nhận Unicode emoji hoặc custom/application
  emoji có Snowflake ID. Theo tài liệu Discord hiện hành, một application sở hữu tối đa
  2.000 emoji, dùng được bởi chính app mà không cần quyền `USE_EXTERNAL_EMOJIS`; file upload
  tối đa 256 KiB và API nhận ảnh emoji 128×128.
- **Tài liệu/code liên quan:** `src/assets/ui/equipment/template-masters`,
  `EquipmentEmojiResolver.js`, `InventoryPresentation.js`, `trangbi.js`,
  [Discord Emoji Resource](https://docs.discord.com/developers/resources/emoji).
- **Điểm chưa rõ:** Chỉ upload một emoji nhận diện cho mỗi template hay upload đầy đủ từng
  tổ hợp phẩm/chất lượng; thao tác đồng bộ sẽ tạo tài nguyên thật trên Discord Application.
- **Phương án A — 32 Application Emoji theo template (đề xuất):** một emoji cho mỗi
  `item.id`; phẩm và chất lượng vẫn hiển thị bằng text/màu thumbnail. Ít tài nguyên, dễ đồng
  bộ và tên món luôn có đúng artwork; icon inline không thể hiện khung phẩm cụ thể.
- **Phương án B — 672 Application Emoji theo template/phẩm/chất lượng:** icon inline khớp
  hoàn toàn PNG runtime. Chiếm 672/2.000 slot, danh mục và đồng bộ lớn, thay palette phải cập
  nhật hàng loạt và dễ gặp rate limit hơn.
- **Phương án C — Chỉ giữ Unicode theo hình thức trang bị:** không upload hay quản lý tài
  nguyên Discord; kiếm/trượng/chùy/thương/giáp/dây chuyền/nhẫn vẫn phân biệt được nhưng không
  dùng chính artwork đã tạo.
- **Đề xuất kỹ thuật (chưa áp dụng):** A. Viết tool sync idempotent theo tên `td_<item_id>`,
  lưu mapping emoji ID vào file config presentation và giữ Unicode làm fallback. Không tự
  chạy upload trong startup; chỉ chạy lệnh quản trị rõ ràng bằng bot token.
- **Phần bị chặn:** Chỉ việc thay Unicode trước tên bằng artwork Application Emoji. Compact
  inventory, thumbnail PNG chính xác và icon Unicode đã hoạt động độc lập.
- **Câu trả lời của chủ dự án:** Chọn A — 32 Application Emoji theo template.
- **Kết quả xử lý:** Đã thêm policy, 32 nguồn upload 128×128, công cụ sync idempotent và
  mapping cục bộ. Đã đồng bộ đủ 32 emoji lên Discord Application; lần kiểm tra thứ hai tạo
  `0`, tái sử dụng `32`. `/tuido` và `/trangbi` dùng Application Emoji trước tên và trong
  String Select; Unicode vẫn là fallback khi mapping không khả dụng.
- **Trạng thái:** RESOLVED
---

## Q-PROFESSION-001 — Một nhân vật được học bao nhiêu nghề

- **Bối cảnh:** Hệ thống mới gồm Luyện Đan Sư, Phù Sư, Luyện Khí Sư, Trận Sư và Khôi Lỗi Sư. Tài liệu hiện tại chỉ có Craft chung, không có profession state hoặc giới hạn lựa chọn.
- **Tài liệu/phần code liên quan:** `03_ITEM/006_CRAFT_SPEC.md`, `10_GAMEPLAY/010_CRAFT_RUNTIME_SPEC.md`, `CraftService`, `craft_templates.json`.
- **Điểm chưa rõ:** Player học một nghề chính, nhiều nghề có giới hạn hay cả năm nghề; có được đổi nghề/reset tiến độ không.
- **Phương án A — Học cả năm nghề độc lập (đề xuất):** mỗi nghề có level/EXP riêng; không khóa content vĩnh viễn. Phù hợp idle dài hạn và cho người chơi tự cung tự cấp, nhưng giảm vai trò giao thương/chuyên môn hóa.
- **Phương án B — Một nghề chính, nghề khác bị khóa:** tăng bản sắc và kinh tế giữa người chơi; cần cơ chế đổi nghề, hoàn trả và chống tạo tài khoản phụ.
- **Phương án C — Một nghề chính + nghề phụ:** cân bằng chuyên môn và quyền tiếp cận; cần chốt số nghề phụ và penalty/cap riêng.
- **Đề xuất kỹ thuật (chưa áp dụng):** A cho MVP; schema vẫn dùng `(player_id, profession_id)` để sau này áp cap mà không đổi cấu trúc.
- **Phần bị chặn:** Player profession state, enrollment và UI chọn nghề.
- **Câu trả lời của chủ dự án:** Chọn A — Player được học cả năm nghề, mỗi nghề có progression độc lập.
- **Kết quả xử lý:** Đã phản ánh vào `009_PROFESSION_SYSTEM_SPEC.md`; persistence dùng `(player_id, profession_id)`, không hard-code nghề vào Player.
- **Trạng thái:** RESOLVED
---

## Q-PROFESSION-002 — Cấp bậc, EXP và điều kiện thăng nghề

- **Bối cảnh:** Chưa có thang tiến triển nghề hoặc công thức EXP. Realm progression không thể tự động được dùng làm cấp nghề vì hai hệ thống có nhịp khác nhau.
- **Tài liệu/phần code liên quan:** Realm/Stage progression, Craft runtime, numeric policy.
- **Điểm chưa rõ:** Tên/cấp tối đa của nghề; EXP nhận theo lần chế tạo hay theo độ khó; craft thất bại có EXP không; Realm có khóa cấp nghề không.
- **Phương án A — 9 phẩm nghề độc lập (đề xuất):** Nhất Phẩm đến Cửu Phẩm, mỗi phẩm có level nội bộ hoặc EXP threshold data-driven; recipe khai báo `requiredProfessionGrade`. Dễ mở content tu tiên nhưng cần bảng EXP và Realm gate.
- **Phương án B — Dùng thẳng 15 đại cảnh giới:** nghề đồng cấp Realm, ít tên mới nhưng buộc progression nghề đi cùng chiến lực.
- **Phương án C — Level số 1–100:** dễ cân bằng và UI nhưng ít chất tu tiên hơn.
- **Đề xuất kỹ thuật (chưa áp dụng):** A; threshold và Realm gate để trong JSON, PostgreSQL chỉ lưu EXP/current grade revision.
- **Phần bị chặn:** EXP calculator, grade registry, thăng cấp và recipe requirement.
- **Câu trả lời của chủ dự án:** Chọn A — chín phẩm nghề độc lập.
- **Kết quả xử lý:** Identity Nhất đến Cửu Phẩm và requirement theo nghề phẩm đã được khóa trong spec; threshold EXP, EXP recipe và Realm gate được tách sang `Q-PROFESSION-010`.
- **Trạng thái:** RESOLVED
---

## Q-PROFESSION-003 — Phạm vi sản phẩm của năm nghề

- **Bối cảnh:** Item hiện chỉ có category PILL/MATERIAL/TICKET/CHEST/TOKEN/SCROLL/PET/SPECIAL; Equipment là runtime instance riêng. Trận pháp và Khôi lỗi chưa có domain/runtime tương ứng.
- **Tài liệu/phần code liên quan:** Item/Equipment specs, Item categories, BattleEntity, Team/formation command hiện hữu.
- **Điểm chưa rõ:** Phù là consumable hay trang bị; Trận pháp là consumable, loadout hay nội dung đội hình; Khôi lỗi là item, pet/companion hay BattleEntity; Luyện Khí Sư tạo mới hay nâng cấp/trùng luyện trang bị.
- **Phương án A — Ranh giới domain đầy đủ (đề xuất):** Luyện Đan tạo PILL; Phù Sư tạo TALISMAN consumable; Luyện Khí Sư tạo/nâng Equipment; Trận Sư tạo FORMATION loadout; Khôi Lỗi Sư tạo PUPPET companion có runtime instance. Đúng bản sắc và mở rộng tốt nhưng Formation/Puppet cần module mới.
- **Phương án B — MVP tất cả là Item consumable:** Trận bàn/Khôi lỗi/phù đều kích hoạt Effect rồi tiêu hao. Tái sử dụng Item nhanh nhưng làm mất chiều sâu và khó nâng thành entity/loadout mà không migrate.
- **Phương án C — Chia giai đoạn:** MVP triển khai Luyện Đan/Phù/Luyện Khí; chỉ define registry cho Trận Sư/Khôi Lỗi Sư và hoãn runtime riêng. Giảm rủi ro nhưng chưa đủ năm nghề dùng được ngay.
- **Đề xuất kỹ thuật (chưa áp dụng):** C, đồng thời thiết kế recipe/output union để không khóa đường nâng lên A.
- **Phần bị chặn:** Item categories mới, output contract, Formation/Puppet persistence và battle integration.
- **Câu trả lời của chủ dự án:** Chọn C — MVP triển khai Luyện Đan/Phù/Luyện Khí; Trận Sư/Khôi Lỗi Sư chỉ define trước.
- **Kết quả xử lý:** Spec đăng ký đủ năm stable ID; chỉ `ITEM/EQUIPMENT` executable trong MVP, `FORMATION/PUPPET` là reserved output và không được giả lập.
- **Trạng thái:** RESOLVED
---

## Q-PROFESSION-004 — Học và mở khóa công thức

- **Bối cảnh:** Craft hiện liệt kê toàn bộ recipe và chỉ khóa bằng Realm. Không có recipe book, ownership hoặc mastery.
- **Tài liệu/phần code liên quan:** `craft_templates.json`, `CraftService.listRecipes()`, Inventory/Item source/reward.
- **Điểm chưa rõ:** Công thức tự mở theo cấp nghề, phải dùng bí tịch/công thức, nhận từ nhiệm vụ/tông môn hay kết hợp; công thức học có mất khi Luân hồi không.
- **Phương án A — Hybrid data-driven (đề xuất):** recipe cơ bản tự mở theo grade; recipe hiếm cần Recipe Item dùng một lần để ghi learned recipe. Có chiều sâu loot mà không khóa onboarding; cần bảng ownership.
- **Phương án B — Tự mở toàn bộ theo grade:** đơn giản, không cần learned state nhưng giảm giá trị loot/giao thương.
- **Phương án C — Mọi recipe đều phải học bằng item:** kinh tế mạnh nhưng onboarding nặng và phụ thuộc drop/shop content lớn.
- **Đề xuất kỹ thuật (chưa áp dụng):** A; recipe khai báo `unlockMode`, `requiredProfessionGrade`, optional `recipeItemId`.
- **Phần bị chặn:** learned recipe table, item sử dụng để học và recipe visibility.
- **Câu trả lời của chủ dự án:** Chọn A — recipe cơ bản tự mở theo phẩm, recipe hiếm phải học bằng Recipe Item.
- **Kết quả xử lý:** Spec khóa hai unlock mode `AUTO_BY_GRADE/LEARNED` và learned recipe là progression vĩnh viễn.
- **Trạng thái:** RESOLVED
---

## Q-PROFESSION-005 — Thành công, thất bại và phẩm chất sản phẩm

- **Bối cảnh:** Craft spec LOCKED hiện nói Craft không Random; nếu random thì đi qua RewardTable. Nghề nghiệp tu tiên thường có tỷ lệ thành công và phẩm chất, nhưng thêm trực tiếp sẽ thay đổi contract/economy lớn.
- **Tài liệu/phần code liên quan:** Craft/Reward/Random specs, Equipment grade/quality, idempotent Craft transaction.
- **Điểm chưa rõ:** Có tỷ lệ thất bại không; thất bại mất bao nhiêu nguyên liệu; sản phẩm có phẩm chất; skill nghề, lò/bút/trận bàn và may mắn ảnh hưởng công thức nào.
- **Phương án A — Deterministic thành công, random phẩm chất qua RewardTable (đề xuất MVP):** đủ vật liệu + điều kiện thì luôn có output; nghề/công cụ tăng weight phẩm chất/số lượng. Thân thiện idle và giữ Craft spec; vẫn cần quality pool.
- **Phương án B — Có success chance và phẩm chất:** roll success trước rồi roll quality; sâu hơn nhưng dễ gây ức chế và phải chốt refund/pity.
- **Phương án C — Deterministic cả output và quality:** recipe quyết định chính xác kết quả; dễ audit nhất nhưng progression nghề ít hấp dẫn.
- **Đề xuất kỹ thuật (chưa áp dụng):** A.
- **Phần bị chặn:** Random/result schema, quality roll, thất bại/refund và profession bonus.
- **Câu trả lời của chủ dự án:** Chọn A — craft luôn thành công, phẩm chất output roll qua data/Reward policy.
- **Kết quả xử lý:** Deterministic success đã khóa; representation và pool phẩm chất được tách sang `Q-PROFESSION-011`.
- **Trạng thái:** RESOLVED
---

## Q-PROFESSION-006 — Chế tạo tức thời hay Lazy Evaluation theo thời gian

- **Bối cảnh:** Craft hiện atomically tiêu nguyên liệu và nhận output ngay. Dự án ưu tiên Idle Lazy Evaluation, nhưng chưa có yêu cầu thời gian cho nghề.
- **Tài liệu/phần code liên quan:** Lazy Evaluation rules, Craft runtime, `activity_runs`, Gathering start/claim.
- **Điểm chưa rõ:** Recipe có thời gian chế tạo không; số slot/hàng đợi; có chế tạo hàng loạt; offline cap; nhận tự động hay claim; Luân hồi xử lý job đang chạy thế nào.
- **Phương án A — Job lazy start/claim (đề xuất):** lưu `started_at/ready_at/quantity/input_snapshot`; không tick; claim transaction/idempotency; ban đầu một slot mỗi nghề. Đúng định hướng idle nhưng cần job lifecycle và reservation nguyên liệu.
- **Phương án B — Tức thời như Craft hiện tại:** phạm vi nhỏ, UI nhanh; không tạo gameplay idle nghề.
- **Phương án C — Hybrid:** recipe phổ thông tức thời, recipe cao cấp chạy job. Linh hoạt nhưng hai flow transaction/UI phức tạp hơn.
- **Đề xuất kỹ thuật (chưa áp dụng):** A nếu nghề là hệ thống progression chính; B nếu chỉ là tiện ích economy.
- **Phần bị chặn:** craft job schema, slot/queue, batch semantics, claim và activity/rebirth interaction.
- **Câu trả lời của chủ dự án:** Chọn A — lazy job start/claim, không tick liên tục.
- **Kết quả xử lý:** Spec khóa lifecycle lazy và dự kiến một slot mỗi nghề; duration, batch và consume/reserve được tách sang `Q-PROFESSION-012`.
- **Trạng thái:** RESOLVED
---

## Q-PROFESSION-007 — Năng lượng nghề, công cụ và nguyên liệu thất bại

- **Bối cảnh:** Recipe hiện chỉ tiêu Item + Currency. Chưa có thể lực/tinh lực, độ bền công cụ, lò đan/bút phù/lò luyện/trận bàn/xưởng khôi lỗi hoặc wear/repair.
- **Tài liệu/phần code liên quan:** Item, Equipment, Currency, Gathering stamina đang hoãn, Resource Ledger.
- **Điểm chưa rõ:** Craft có giới hạn ngày/năng lượng không; công cụ là equipment slot, facility hay requirement item; có độ bền; nguyên liệu bị reserve lúc start hay consume lúc claim.
- **Phương án A — Không energy/durability trong MVP (đề xuất):** giới hạn bằng nguyên liệu, thời gian và slot; công cụ chỉ là optional data-driven modifier không hao bền. Ít state nóng và dễ cân bằng.
- **Phương án B — Profession energy hồi lazy:** mỗi nghề có năng lượng/timestamp/cap riêng; kiểm soát sản lượng nhưng thêm năm nguồn idle và claim concurrency.
- **Phương án C — Công cụ có durability:** tạo sink mạnh nhưng cần instance state, repair và transaction bổ sung.
- **Đề xuất kỹ thuật (chưa áp dụng):** A.
- **Phần bị chặn:** profession resource, tool/facility contract, durability và thời điểm tiêu hao.
- **Câu trả lời của chủ dự án:** Chọn A — MVP không energy/durability; giới hạn bằng nguyên liệu, thời gian và slot.
- **Kết quả xử lý:** Đã phản ánh trong spec; tool chỉ là optional Effect/Modifier mở rộng, không chặn MVP.
- **Trạng thái:** RESOLVED
---

## Q-PROFESSION-008 — Luân hồi giữ hay xóa tiến độ nghề

- **Bối cảnh:** Policy Luân hồi hiện giữ một số progression phi vật phẩm nhưng xóa inventory/equipment. Nghề, EXP nghề, recipe đã học, job đang chạy và công cụ nghề chưa có trong retention matrix.
- **Tài liệu/phần code liên quan:** Rebirth policy/migration, activity gate, inventory reset.
- **Điểm chưa rõ:** Giữ nghề/EXP/công thức không; job đang chạy chặn Luân hồi hay bị hủy; output recipe cấp cao có được claim sau khi reset Realm không.
- **Phương án A — Giữ nghề và công thức, chặn khi còn job (đề xuất):** tương tự progression dài hạn; recipe vẫn phải kiểm tra Realm lúc start. Không mất công sức nhưng vòng đời sau có lợi thế lớn.
- **Phương án B — Reset toàn bộ nghề:** tạo vòng lặp prestige sạch nhưng rất nặng với hệ thống năm nghề.
- **Phương án C — Giữ công thức, reset grade/EXP:** collectible được bảo toàn nhưng phải cày lại quyền chế tạo.
- **Đề xuất kỹ thuật (chưa áp dụng):** A.
- **Phần bị chặn:** Rebirth retention, FK/cascade và stale-job policy.
- **Câu trả lời của chủ dự án:** Chọn A — giữ nghề/công thức và chặn Luân hồi khi còn craft job.
- **Kết quả xử lý:** Đã bổ sung retention/gate contract trong spec; recipe vẫn kiểm tra Realm tại lúc start.
- **Trạng thái:** RESOLVED

## Q-PROFESSION-009 — Slash command và UX nghề nghiệp

- **Bối cảnh:** Command spec chỉ nêu `/craft`; source hiện chưa có slash command Craft. Năm nghề cần browse recipe, xem tiến độ, start/claim và quản lý công thức mà không vượt giới hạn component Discord.
- **Tài liệu/phần code liên quan:** Command spec, Discord component session, `/nhanvat`, `/trangbi`, `CraftService`.
- **Điểm chưa rõ:** Dùng một command tổng hay command riêng; public/ephemeral; xác nhận tiêu nguyên liệu; pagination/search; thông báo job hoàn tất.
- **Phương án A — Một `/nghenghiep` dạng dashboard (đề xuất):** select nghề + tab Tổng quan/Công thức/Đang chế tạo; action start/claim có confirm; `/chetao` có thể là shortcut. Dễ mở rộng và tránh nhiều command.
- **Phương án B — Năm command riêng:** rõ theo lore nhưng trùng logic/UI và tăng số slash command.
- **Phương án C — Chỉ `/craft`:** nhỏ nhất nhưng khó biểu diễn progression năm nghề.
- **Đề xuất kỹ thuật (chưa áp dụng):** A.
- **Phần bị chặn:** Application read model, slash command/component flow và notification.
- **Câu trả lời của chủ dự án:** Chọn A — một dashboard `/nghenghiep`; `/chetao` có thể làm shortcut.
- **Kết quả xử lý:** Discord boundary và ba view Tổng quan/Công thức/Đang chế tạo đã được khóa trong spec.
- **Kết quả triển khai:** `/nghenghiep` là panel ephemeral owner-only, có select nghề/công thức/batch, trạng thái xưởng, start/claim/refresh/close; operation ID lấy từ component interaction.
- **Trạng thái:** RESOLVED
---

## Q-PROFESSION-010 — Bảng EXP, EXP recipe và Realm gate cho chín phẩm nghề

- **Bối cảnh:** `Q-PROFESSION-002` chọn chín phẩm nghề độc lập nhưng chưa cung cấp threshold, lượng EXP hoặc quan hệ với Realm. Đây là balance bắt buộc để tạo GameData và migration backfill.
- **Tài liệu/phần code liên quan:** `009_PROFESSION_SYSTEM_SPEC.md`, Realm registry, numeric policy.
- **Điểm chưa rõ:** Cumulative EXP từng phẩm; EXP nhận theo recipe; craft lặp recipe thấp có bị giảm EXP; Realm tối thiểu từng phẩm.
- **Phương án A — Baseline tăng gấp đôi (đề xuất):** cumulative EXP Nhất→Cửu `0/100/300/700/1500/3100/6300/12700/25500`; recipe Nhất→Cửu cho `10/20/40/80/160/320/640/1280/2560` EXP; recipe thấp hơn nghề từ 2 phẩm trở lên chỉ nhận 25% EXP. Realm gate lần lượt chín Realm đầu từ Luyện Khí đến Độ Kiếp.
- **Phương án B — Linear dễ cày:** cumulative `0/100/300/600/1000/1500/2100/2800/3600`; recipe grade ×10 EXP; không giảm EXP. Dễ tiếp cận nhưng spam recipe rẻ có thể tối ưu quá mạnh.
- **Phương án C — Chủ dự án cung cấp bảng riêng:** kiểm soát balance chính xác; cần đủ 9 threshold, 9 EXP reward, low-grade penalty và Realm mapping.
- **Đề xuất kỹ thuật (chưa áp dụng):** A; mọi số nằm trong JSON revisioned.
- **Phần bị chặn:** Profession grade/EXP GameData, calculator, persistence promotion và recipe availability.
- **Câu trả lời của chủ dự án:** Chọn A — dùng baseline tăng gấp đôi, giảm EXP recipe thấp và Realm gate theo chín đại cảnh giới đầu.
- **Kết quả xử lý:** Đã phản ánh bảng threshold, EXP, penalty và Realm gate vào `009_PROFESSION_SYSTEM_SPEC.md` và GameData nghề nghiệp.
- **Trạng thái:** RESOLVED
---

## Q-PROFESSION-011 — Biểu diễn phẩm chất cho Item và Equipment chế tạo

- **Bối cảnh:** Craft luôn thành công nhưng roll phẩm chất. Equipment đã có `gradeQuality`; stackable Item chỉ lưu `templateId + quantity`, nên không thể trộn nhiều phẩm chất trong cùng stack nếu không đổi identity/schema.
- **Tài liệu/phần code liên quan:** Item/Equipment specs, inventory split, RewardApplyService, `Q-PROFESSION-005`.
- **Điểm chưa rõ:** PILL/TALISMAN có phẩm chất riêng không; phẩm chất tăng potency, quantity hay chỉ giá trị bán; dùng chung tier với Equipment hay registry riêng.
- **Phương án A — Quality variant cho mọi output (đề xuất dài hạn):** registry chung `LOW/MEDIUM/HIGH/PEAK`; Item stack key gồm quality, Equipment dùng `gradeQuality`; Effect potency resolve theo quality multiplier. Đúng gameplay nhưng cần migration inventory stack variant và item-use support.
- **Phương án B — Chỉ Equipment có quality trong MVP:** PILL/TALISMAN luôn đúng template potency; nghề phẩm cao tăng quantity/chance bonus item. Ít migration nhưng phẩm chất luyện đan/phù không rõ nét.
- **Phương án C — Template riêng theo phẩm chất:** ví dụ bốn Item ID cho cùng đan. Tương thích inventory hiện tại nhưng content nở lớn và khó đổi curve.
- **Đề xuất kỹ thuật (chưa áp dụng):** B cho vertical slice, nâng A khi Item runtime hỗ trợ variant Effect an toàn.
- **Phần bị chặn:** Quality pool/weight/multiplier, output resolver và inventory representation.
- **Câu trả lời của chủ dự án:** Chọn B — MVP chỉ Equipment có phẩm chất; PILL/TALISMAN giữ potency cố định theo template.
- **Kết quả xử lý:** Output policy chỉ cho phép quality với `EQUIPMENT`; stackable Item không đổi identity/schema trong MVP.
- **Trạng thái:** RESOLVED
---

## Q-PROFESSION-012 — Thời gian job, batch và thời điểm tiêu nguyên liệu

- **Bối cảnh:** Lazy start/claim đã được chọn nhưng chưa chốt duration/batch/input ownership. Reservation mà không trừ inventory cần reserved balance; consume lúc start đơn giản hơn nhưng job cancel phải có refund policy.
- **Tài liệu/phần code liên quan:** CraftService/repository, Gathering lazy flow, resource ledger, activity/rebirth gate.
- **Điểm chưa rõ:** Duration theo recipe grade; tối đa batch; thời gian scale; nguyên liệu consume lúc start hay claim; job có cancel không.
- **Phương án A — Consume-at-start, linear batch (đề xuất):** base duration Nhất→Cửu `1/3/10/30/90/240/600/1440/2880` phút; batch `1..99`, tổng thời gian `base × quantity`; một slot mỗi nghề; không cancel trong MVP; claim explicit không cap offline vì `ready_at` cố định.
- **Phương án B — Reserve-at-start:** inventory giữ item nhưng ghi reserved quantity; claim mới consume. UX dễ hiểu số dư nhưng mọi inventory mutation phải nhận biết reservation.
- **Phương án C — Mọi recipe tự khai báo duration, không có global curve:** linh hoạt nhất; vẫn cần chốt consume, batch và cancel.
- **Đề xuất kỹ thuật (chưa áp dụng):** A; recipe có thể override base duration sau này.
- **Phần bị chặn:** craft job DDL, start/claim transaction, batch request hash và UI countdown.
- **Câu trả lời của chủ dự án:** Chọn A — consume-at-start, batch tuyến tính, một slot mỗi nghề và claim chủ động.
- **Kết quả xử lý:** Đã khóa duration Nhất→Cửu `1/3/10/30/90/240/600/1440/2880` phút, batch `1..99`, không cancel và không offline cap.
- **Trạng thái:** RESOLVED
---

## Q-PROFESSION-013 — Vertical slice content cho ba nghề ACTIVE

- **Bối cảnh:** Kiến trúc chọn triển khai Luyện Đan/Phù/Luyện Khí trước, nhưng source chỉ có Linh Thảo, ba đan dược và một recipe Phá Chướng Đan; chưa có TALISMAN category/template/material hoặc recipe Equipment nghề nghiệp.
- **Tài liệu/phần code liên quan:** Item/Equipment/Reward data, `craft_templates.json`, `009_PROFESSION_SYSTEM_SPEC.md`.
- **Điểm chưa rõ:** Recipe/item/material đầu tiên của mỗi nghề; cost; Realm/phẩm gate; Effect của phù; Luyện Khí tạo loại Equipment nào.
- **Phương án A — Gói MVP nhỏ để duyệt (đề xuất):** Luyện Đan có Phá Chướng Đan và Tu Vi Đan; Phù Sư có Hộ Thân Phù (khiên cho trận kế) và Thần Hành Phù (SPD cho trận kế); Luyện Khí Sư có một recipe vũ khí ngũ hành chọn output theo recipe riêng. Mỗi recipe dùng explicit material/cost/duration/grade trong JSON; bảng số chi tiết sẽ được trình duyệt trước khi author.
- **Phương án B — Chỉ chuyển recipe Phá Chướng Đan hiện có:** triển khai pipeline end-to-end nhanh nhất nhưng chưa chứng minh output TALISMAN/EQUIPMENT.
- **Phương án C — Chủ dự án cung cấp catalog đầy đủ:** đúng content nhất; cần bảng recipe/output/input/effect/cost/gate.
- **Đề xuất kỹ thuật (chưa áp dụng):** A, triển khai từng nghề một sau khi duyệt bảng số.
- **Phần bị chặn:** Item/Equipment/recipe content cụ thể và vertical-slice integration test.
- **Câu trả lời của chủ dự án:** Chọn A — catalog MVP gồm hai đan, hai phù và năm recipe vũ khí ngũ hành tách biệt.
- **Kết quả xử lý:** Phạm vi catalog đã được duyệt. `Q-PROFESSION-014 C` sau đó
  chốt chỉ phát hành Phá Chướng Đan trong vertical slice hiện tại; Tu Vi Đan, Phù
  và vũ khí nghề nghiệp tiếp tục chờ bảng số thay vì tự author. Pipeline lazy
  start/claim và content đã duyệt đều được triển khai đúng phạm vi.
- **Trạng thái:** RESOLVED

---

## Q-ELEMENT-002 — Công thức tương hợp toàn hệ của Hỗn Độn

- **Bối cảnh:** Chủ dự án chọn E1 tại `Q-MONSTER-014`: thêm `LIGHT`, `DARK`,
  `CHAOS`; Ánh Sáng và Bóng Tối khắc lẫn nhau. Hỗn Độn tăng 2% sát thương cho tất cả
  hệ, phù hợp mọi Công Pháp/Kỹ Năng, không bị khắc; đồng thời “sát thương nguyên tố
  giảm một phần ba theo chỉ số +”. Runtime hiện tách ba lớp: bonus Linh Căn theo phẩm,
  `ELEMENT_<X>_DAMAGE` từ trang bị và Element Relation.
- **Tài liệu/code liên quan:** `SpiritRootEffectResolver`,
  `ActionScopedElementEffectEngine`, `ActionExecutor.applySpiritRootAffinityDamage`,
  `applyElementalEquipmentDamage`, `spirit_root_quality_tiers.json`,
  `Q-COMBAT-019/020`.
- **Điểm chưa rõ:** 2% là cộng thêm hay thay thế bonus phẩm Linh Căn; “giảm một phần
  ba” áp vào chỉ số Element Damage từ trang bị, bonus Linh Căn, hay toàn bộ damage;
  Hỗn Độn là wildcard của Linh Căn hay là quan hệ của Action hệ Chaos.
- **Phương án A — Wildcard Linh Căn, cộng 2%, giảm dòng trang bị (đề xuất):**
  Linh Căn Hỗn Độn coi mọi Action Damage có hệ là cùng hệ; nhận
  `qualityAffinityBonus + 2%`. Riêng chỉ số `ELEMENT_<Action>_DAMAGE` dương từ trang
  bị chỉ còn `2/3` hiệu lực. Resistance mục tiêu vẫn giữ nguyên. Hỗn Độn không có
  relation incoming/outgoing.
- **Phương án B — Wildcard cố định 2%, không dùng bonus phẩm:** Linh Căn Hỗn Độn chỉ
  cho +2% mọi hệ; quality vẫn tăng tốc tu luyện nhưng không tăng damage. Element
  Damage trang bị còn `2/3`. Dễ cân bằng hơn nhưng phẩm Linh Căn Hỗn Độn không tăng
  sức mạnh chiến đấu theo ladder chung.
- **Phương án C — Chỉ Action hệ Hỗn Độn:** Action `CHAOS` gây thêm 2% khi đánh mọi
  hệ và không bị khắc; không tạo wildcard cho Công Pháp/Kỹ Năng hệ khác. Không phù hợp
  đầy đủ với mô tả “phù hợp bất kỳ công pháp hay kỹ năng”.
- **Đề xuất kỹ thuật (chưa áp dụng):** A, vì giữ ladder phẩm cấp Linh Căn hiện hữu và
  diễn giải “chỉ số +” là dòng Element Damage cộng thêm từ trang bị. Công thức:
  `affinity = qualityBonus + 0,02`;
  `effectiveEquipmentElementDamage = authoredElementDamage × 2/3`.
- **Phần bị chặn:** Linh Căn Hỗn Độn, wildcard affinity, modifier 2% và phép giảm
  một phần ba. Ba Element canonical, quan hệ Ánh Sáng/Bóng Tối và marker Effect độc
  lập đã có thể triển khai.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả xử lý:** `HON_DON_LINH_CAN` dùng wildcard cho mọi Damage Action có hệ.
  Bonus phẩm cấp tương hợp với mọi hệ. Sau triển khai ban đầu, chủ dự án
  đính chính loại bỏ hoàn toàn phép giảm `1/3`: dòng `ELEMENT_<Action>_DAMAGE` từ
  trang bị giữ nguyên 100% như mọi Linh Căn khác; resistance mục tiêu cũng không đổi.
  Quy tắc cộng thêm 2% được làm rõ và triển khai riêng tại `Q-ELEMENT-003`: chỉ kích
  hoạt khi hệ của Action thực sự `COUNTER` hệ phòng thủ mục tiêu.
  Kỹ năng đa hệ resolve wildcard độc lập trên từng component. Hỗn Độn không có
  relation incoming/outgoing. Template hiện `rollWeight: 0` để không tự đặt xác suất
  xuất hiện.
- **Trạng thái:** RESOLVED

---

## Q-SPIRITROOT-016 — Xác suất xuất hiện của Hỗn Độn Linh Căn

- **Bối cảnh:** Công thức Hỗn Độn tại `Q-ELEMENT-002` đã hoàn tất, nhưng Linh Căn này
  mạnh hơn loại đơn hệ vì tương hợp mọi kỹ năng. Tổng roll weight hiện hữu là 100 và
  chưa có tỷ lệ Hỗn Độn được duyệt. Template đang để `rollWeight: 0`, nên có thể audit
  công thức nhưng Player chưa roll được.
- **Tài liệu/code liên quan:** `spirit_roots.json`, `SpiritRootRoller`,
  `spirit_root_reroll_pools.json`, Character Creation odds và Luân hồi reroll.
- **Điểm chưa rõ:** Hỗn Độn có xuất hiện từ lúc tạo nhân vật hay chỉ sau số lần Luân
  hồi nhất định; tỷ lệ lấy từ Linh Căn nào để tổng vẫn bằng 100.
- **Phương án A — Cố định 1% ở mọi lần roll:** Hỗn Độn weight 1, Ngũ Hành giảm
  `30 → 29`. Dễ hiểu và không cần đổi schema; nhân vật mới có thể roll được Linh Căn
  rất mạnh.
- **Phương án B — Tỷ lệ tăng theo Luân hồi (đề xuất):** đời `0–9: 0%`,
  `10–19: 0,5%`, `20–39: 1%`, `40+: 2%`; mỗi bracket trừ phần tương ứng khỏi Ngũ
  Hành. Phù hợp progression và độ hiếm, nhưng cần mở rộng template-weight policy theo
  rebirth thay vì weight tĩnh hiện tại.
- **Phương án C — Không nằm trong roll pool:** chỉ cấp qua reward/achievement late
  game riêng. Kiểm soát tốt nhất nhưng cần thiết kế source/entitlement mới.
- **Đề xuất kỹ thuật (chưa áp dụng):** B. Snapshot bracket/revision vào roll history
  như quality roll để replay/audit; tổng weight mỗi bracket luôn đúng 100.
- **Phần bị chặn:** Chỉ acquisition của Hỗn Độn Linh Căn. Formula Battle, profile
  projection và dữ liệu template đã hoàn tất.
- **Câu trả lời của chủ dự án:** Chọn B.
- **Kết quả xử lý:** Pool revision 4 có bốn template-weight bracket liên tục:
  đời `0–9 = 0%`, `10–19 = 0,5%`, `20–39 = 1%`, `40+ = 2%` Hỗn Độn; phần weight
  được trừ đúng khỏi Ngũ Hành Linh Căn để tổng mỗi bracket luôn bằng 100. `/start`
  dùng bracket đời 0 nên không roll Hỗn Độn. Reroll Luân hồi resolve theo
  `rebirthNumber`, snapshot `templateBracketId`, toàn bộ weight và revision vào lịch
  sử/idempotency payload. Template gốc giữ weight 0 và tag `REBIRTH_GATED`.
- **Trạng thái:** RESOLVED
---

## Q-ELEMENT-003 — Phạm vi “tăng sát thương chỉ khi khắc hệ”

- **Bối cảnh:** Sau khi bỏ quy tắc giảm Element Damage trang bị, chủ dự án đính chính
  “tăng sát thương chỉ là khi khắc hệ”. Runtime hiện có ba nguồn độc lập: bonus phẩm
  Linh Căn Hỗn Độn áp wildcard, cộng thêm 2% Hỗn Độn, và Element Damage từ trang bị
  khi Action trùng hệ. Quan hệ `COUNTER` được resolve theo cặp hệ Action → hệ phòng
  thủ mục tiêu.
- **Tài liệu/code liên quan:** `Q-ELEMENT-002`, `Q-COMBAT-019`,
  `ActionScopedElementEffectEngine.resolveSpiritRootAffinity`,
  `ActionExecutor.applySpiritRootAffinityDamage`,
  `applyElementalEquipmentDamage`.
- **Điểm chưa rõ:** “Tăng sát thương” chỉ nói đến 2% riêng của Hỗn Độn, toàn bộ bonus
  phẩm Linh Căn Hỗn Độn, hay cả Element Damage từ trang bị.
- **Phương án A — Chỉ +2% Hỗn Độn cần khắc hệ (đề xuất):** bonus phẩm Linh Căn vẫn
  tương hợp mọi Skill có hệ; +2% chỉ cộng khi Element của Action có relation
  `COUNTER` với hệ phòng thủ mục tiêu. Element Damage trang bị giữ contract
  `Q-COMBAT-019`: cùng hệ Skill là được áp dụng.
- **Phương án B — Toàn bộ affinity Hỗn Độn cần khắc hệ:** cả bonus phẩm và 2% chỉ
  kích hoạt khi Action khắc hệ mục tiêu. Hỗn Độn vẫn cho phép dùng mọi Công Pháp/Kỹ
  Năng nhưng không tăng damage khi quan hệ neutral/generate.
- **Phương án C — Mọi bonus nguyên tố cần khắc hệ:** giống B và Element Damage trang
  bị cũng chỉ áp dụng khi Action khắc mục tiêu. Đây là thay đổi lớn, ghi đè contract
  trang bị đã duyệt tại `Q-COMBAT-019`.
- **Đề xuất kỹ thuật (chưa áp dụng):** A, vì câu đính chính xuất hiện ngay sau phần
  +2% Hỗn Độn và không làm thay đổi ngầm contract pháp bảo đã duyệt.
- **Phần bị chặn:** Chỉ điều kiện kích hoạt multiplier Hỗn Độn. Quan hệ hệ, stat trang
  bị và các Battle formula khác tiếp tục giữ nguyên cho tới khi có lựa chọn.
- **Câu trả lời của chủ dự án:** Không ảnh hưởng các nguồn khác; đây chỉ là phần tăng
  riêng theo Linh Căn, lấy tổng sát thương đã gây ra rồi cộng thêm 2%.
- **Kết quả xử lý:** Chọn A. Bonus phẩm cấp của Hỗn Độn vẫn tương hợp mọi Skill Damage
  có hệ. Bonus cố định 2% chỉ kích hoạt trên từng mục tiêu khi Element của Action có
  relation `COUNTER` với hệ phòng thủ mục tiêu. Runtime tính relation, bonus phẩm,
  toàn bộ Element Damage trang bị và Element Resistance trước, sau đó mới nhân tổng
  sát thương của component đó với `1,02`. Không sửa hay giảm bất kỳ nguồn chỉ số nào
  khác. Với kỹ năng đa hệ/AoE, điều kiện được resolve độc lập theo từng component và
  từng mục tiêu để không cộng nhầm cho mục tiêu không bị khắc.
- **Trạng thái:** RESOLVED

---

## Q-COMBAT-016 — Semantics cooldown Skill theo lượt

- **Bối cảnh:** Chủ dự án yêu cầu mọi Skill có cooldown riêng, ví dụ Skill A 3 lượt và Skill B 2 lượt; trong thời gian không dùng được Skill thì entity Đánh Thường. Runtime hiện chưa có cooldown state và mỗi lượt luôn random một Active Skill.
- **Tài liệu/phần code liên quan:** `SkillManager`, `BattleEngine.executeTurn()`, `BattleEntity`, `BattleSkillFactory`, `Q-MONSTER-012`, `Q-SECRET-003`.
- **Điểm chưa rõ:** Khi A cooldown nhưng B đã sẵn sàng thì dùng B hay vẫn Đánh Thường; cooldown giảm vào đầu/cuối lượt; lượt bị STUN/SILENCE có làm giảm cooldown; con số 3 nghĩa là bỏ đúng ba lượt kế tiếp hay sẵn sàng ở lượt kế tiếp thứ ba.
- **Phương án A — Ready-pool + đúng N lượt chờ (đề xuất):** Skill bắt đầu sẵn sàng; chỉ random trong Skill đã hồi. Dùng Skill có cooldown N thì N lượt hành động tiếp theo của chính entity không dùng được Skill đó; sau đủ N lượt mới sẵn sàng. Nếu còn Skill khác sẵn sàng thì dùng Skill đó; chỉ Đánh Thường khi toàn bộ Active Skill đang cooldown. STUN/SILENCE/Đánh Thường vẫn làm cooldown giảm một lượt. Cooldown battle-local và reset giữa các battle/wave theo policy Bí Cảnh hiện có.
- **Phương án B — Cooldown toàn bộ loadout sau mỗi Skill:** dùng một Skill khiến entity chỉ Đánh Thường trong N lượt dù Skill khác sẵn sàng. Dễ nhìn thấy Đánh Thường hơn nhưng làm cooldown riêng của B ít ý nghĩa.
- **Phương án C — Cooldown chỉ giảm khi thực hiện hành động thành công:** STUN không giảm; SILENCE/Basic Attack có giảm. Control mạnh hơn nhưng lifecycle phức tạp và trận dễ kéo dài.
- **Đề xuất kỹ thuật:** A; tick tại cuối lượt, không decrement cooldown vừa bắt đầu trong chính lượt cast; event `SKILL_COOLDOWN_STARTED/TICK/READY` để replay/audit.
- **Phần bị chặn:** lọc ready Skill trong `SkillManager`, start/tick cooldown trong BattleEngine, fallback Đánh Thường và UI cooldown.
- **Câu trả lời của chủ dự án:** Chọn A — ready-pool và đúng N lượt chờ.
- **Kết quả xử lý:** Đã triển khai `SkillCooldownState` battle-local, ready-pool trong `SkillManager`, fallback Đánh Thường khi toàn bộ Active Skill đang hồi, và lifecycle start/tick/ready trong `BattleEngine`. Cooldown vừa bắt đầu không giảm ở lượt cast; STUN/SILENCE/Đánh Thường vẫn tick cooldown; tạo BattleEntity mới sẽ reset state.
- **Trạng thái:** RESOLVED
---

## Q-COMBAT-017 — Bảng `cooldownTurns` cho Skill hiện hữu

- **Bối cảnh:** Runtime hiện có 91 Skill canonical: 49 Active (12 Hoàng, 18 Huyền, 11 Địa, 8 Thiên) và 42 Passive. Chủ dự án mới đưa ví dụ A=3/B=2 nhưng chưa gắn giá trị vào từng Skill. Tự suy từ phẩm/hệ/tag sẽ thay đổi balance toàn bộ combat.
- **Tài liệu/phần code liên quan:** `attack_skill_templates.json`, `monster_attack_skill_templates.json`, Defense Skill data, Skill registry/validator.
- **Điểm chưa rõ:** Cooldown cụ thể của từng Active Skill; Passive Skill có cooldown hay tiếp tục dùng trigger/once-per-battle; Basic Attack có cooldown không.
- **Phương án A — Author explicit từng Active Skill (đề xuất):** mỗi JSON Skill khai báo integer `cooldownTurns`; Passive và Basic Attack không cooldown. Chính xác, data-driven, cho phép balance từng Skill nhưng cần bảng giá trị.
- **Phương án B — Baseline theo phẩm rồi override:** baseline đề xuất Hoàng `2`, Huyền `3`, Địa `4`, Thiên `5` lượt; Skill đặc biệt được author override. Passive và Basic Attack không cooldown. Ít nhập dữ liệu và có thể kích hoạt ngay, nhưng các Skill cùng phẩm mặc định có cùng nhịp.
- **Phương án C — Baseline theo tag:** direct damage/buff/control/AOE có curve riêng. Đúng vai trò hơn nhưng một Skill nhiều tag cần priority rule.
- **Đề xuất kỹ thuật (chưa áp dụng):** A. Có thể triển khai cuốn chiếu Monster Skill trước nếu mục tiêu trước mắt là làm quái xuất hiện Đánh Thường.
- **Phần bị chặn:** author cooldown content và kích hoạt validator bắt buộc positive integer cho mọi Active Skill.
- **Câu trả lời của chủ dự án:** Chọn A — author explicit `cooldownTurns` trên từng Active Skill; Passive và Basic Attack không cooldown.
- **Kết quả xử lý một phần:** Chủ dự án bổ sung rule sát thương `2`, hồi máu/khống chế `3`. Đã author 43/49 Active Skill; sáu Utility Skill chưa thuộc rule được tách sang `Q-COMBAT-018`. Với quái chỉ có một Skill và cooldown `N`, chuỗi là `Skill -> N lần Đánh Thường -> Skill`.

```json
{
  "MON_SK_BEAST_BITE": 2,
  "MON_SK_BEAST_POUNCE": 3,
  "MON_SK_BEAST_ROAR": 2,
  "MON_SK_BEAST_BERSERK": null,
  "MON_SK_BEAST_HUNTING_INSTINCT": null,
  "MON_SK_BEAST_FRENZY": null,
  "MON_SK_BEAST_KING_PRESSURE": null,
  "MON_SK_WOOD_ROOT_BIND": 3,
  "MON_SK_WOOD_THORNS": 2,
  "MON_SK_WOOD_LIFE_DRAIN": 3,
  "MON_SK_WOOD_CHARM_POLLEN": 3,
  "MON_SK_SPIRIT_HEAL": 3,
  "MON_SK_SPIRIT_PURIFY": null,
  "MON_SK_SPIRIT_HASTE": null,
  "MON_SK_SPIRIT_LIFE_SPRING": 3,
  "MON_SK_SPIRIT_LIGHT": 2,
  "MON_SK_AVIAN_WIND_BLADE": 2
}
```

- **Kết quả hoàn tất:** `Q-COMBAT-018` chọn cooldown 3 cho sáu Utility Skill. Toàn bộ 49 Active Skill đã được author explicit; Passive và Basic Attack không cooldown.
- **Trạng thái:** RESOLVED
---

## Q-COMBAT-018 — Cooldown cho Skill thuần Buff, Debuff và Purify

- **Bối cảnh:** Chủ dự án đã duyệt Skill sát thương cooldown `2`; Skill hồi máu hoặc khống chế cooldown `3`. Đã author được 43/49 Active Skill. Còn sáu Monster Skill không gây sát thương, không hồi máu và không mang tag `CONTROL`: `MON_SK_BEAST_BERSERK`, `MON_SK_BEAST_HUNTING_INSTINCT`, `MON_SK_BEAST_FRENZY`, `MON_SK_BEAST_KING_PRESSURE`, `MON_SK_SPIRIT_PURIFY`, `MON_SK_SPIRIT_HASTE`.
- **Tài liệu/phần code liên quan:** `monster_attack_skill_templates.json`, `SkillManager`, `Q-COMBAT-016/017`.
- **Điểm chưa rõ:** Cooldown cho Skill thuần Buff, Debuff giảm thuộc tính và Purify.
- **Phương án A — Toàn bộ Utility là 3 lượt (đề xuất):** Buff/Debuff/Purify cùng nhịp với Heal/Control; hạn chế quái lặp hiệu ứng liên tục.
- **Phương án B — Buff/Debuff 2 lượt, Purify 3 lượt:** nhịp chủ động nhanh hơn, nhưng buff có thể được tái áp dụng thường xuyên.
- **Phương án C — Author riêng sáu Skill:** cân bằng chính xác nhất nhưng cần cung cấp sáu con số.
- **Đề xuất kỹ thuật (chưa áp dụng):** A; đây đều là Skill tạo lợi thế trạng thái thay vì sát thương trực tiếp.
- **Phần bị chặn:** Chỉ sáu field `cooldownTurns` nói trên. 43 Active Skill độc lập đã được author.
- **Câu trả lời của chủ dự án:** Chọn A — toàn bộ Buff/Debuff/Purify Utility Skill có cooldown 3 lượt.
- **Kết quả triển khai:** Sáu Utility Skill đã được author `cooldownTurns: 3`. Toàn bộ 49 Active Skill canonical hiện có cooldown dương: 35 Skill cooldown 2 và 14 Skill cooldown 3. Validator chặn Active Skill cooldown 0/thiếu và chặn Passive Skill có cooldown khác 0.
- **Trạng thái:** RESOLVED
---

## Q-MONSTER-013 — Hai Skill giữ lại cho boss hệ Thú

- **Bối cảnh:** Chủ dự án duyệt mỗi quái có tối đa hai Skill, phục vụ các vai trò hồi máu/khiên/khống chế và tấn công. Sau khi xử lý hai quái thường, 31/33 Monster Template đã không vượt giới hạn. `Nhân Sâm Tinh` và `Thạch Linh` đã giảm rõ ràng về `tấn công + hồi máu`. Hai boss `Lang Vương` và `Bạch Hổ Vương` đang dùng chung ba Skill: `Cuồng Bạo` (buff ATK/Skill Damage), `Vương Giả Uy Áp` (debuff ATK đối phương), `Cắn Xé` (tấn công).
- **Tài liệu/phần code liên quan:** `monster_template.json`, `monster_attack_skill_templates.json`, `monster_rules.json`, `MonsterGeneratorService.pickSkills()`.
- **Điểm chưa rõ:** Trong hai Skill boss, giữ buff hay debuff bên cạnh Skill tấn công; buff/debuff có được tính vào nhóm “hồi máu/khiên/khống chế” hay không.
- **Phương án A — `Cắn Xé + Vương Giả Uy Áp` (đề xuất):** đảm bảo một Skill tấn công và một Skill gây bất lợi/khống chế mềm; bỏ `Cuồng Bạo` khỏi loadout hai boss.
- **Phương án B — `Cắn Xé + Cuồng Bạo`:** đảm bảo tấn công và phong cách boss cuồng chiến; bỏ `Vương Giả Uy Áp`.
- **Phương án C — Mỗi boss một bộ riêng:** chủ dự án cung cấp hai cặp Skill; linh hoạt nhất nhưng cần thêm lựa chọn cụ thể.
- **Đề xuất kỹ thuật (chưa áp dụng):** A, vì gần nhất với cấu trúc “khống chế và tấn công” vừa duyệt.
- **Phần bị chặn:** Chỉ hai `skillIds` của `MON_BOSS_WOLF_KING`, `MON_BOSS_WHITE_TIGER_KING` và việc bật validator/runtime hard guard `maxSkills = 2`. Hai quái thường độc lập đã giảm còn hai Skill.
- **Câu trả lời của chủ dự án:** Chọn A — cả hai boss giữ `Cắn Xé + Vương Giả Uy Áp`.
- **Kết quả xử lý:** Đã cập nhật hai loadout boss; validator và `MonsterGeneratorService` cùng fail-fast nếu template/runtime loadout vượt `monsterRules.skillSlots.maxSkills = 2`.
- **Trạng thái:** RESOLVED
---

## Q-PROFESSION-014 — Thông số catalog nghề nghiệp MVP

- **Bối cảnh:** `Q-PROFESSION-013` đã duyệt danh mục sản phẩm nhưng chưa có bảng nguyên liệu, chi phí, phẩm nghề, thời gian override, Effect/potency của hai Phù và thông số Equipment cho năm vũ khí.
- **Tài liệu/phần code liên quan:** `craft_templates.json`, Item/Equipment templates, Effect registry, `009_PROFESSION_SYSTEM_SPEC.md`.
- **Điểm chưa rõ:** Input/cost/gate cụ thể của Tu Vi Đan, Hộ Thân Phù, Thần Hành Phù và năm vũ khí; khiên/SPD tồn tại bao lâu và có cộng dồn không; grade/affix pool của Equipment chế tạo.
- **Phương án A — Chủ dự án cung cấp bảng số đầy đủ (đề xuất):** bảo toàn ý đồ balance; cần mỗi recipe có input, cost, grade, output và Effect/policy tương ứng.
- **Phương án B — Duyệt một baseline do kỹ thuật đề xuất ở lượt sau:** triển khai nhanh hơn nhưng vẫn phải xem và trả lời trước khi author JSON.
- **Phương án C — Chỉ phát hành Phá Chướng Đan hiện hữu trước:** hoàn thiện pipeline không cần tự đặt balance; dashboard hai nghề còn lại chỉ hiển thị chưa có công thức.
- **Đề xuất kỹ thuật (chưa áp dụng):** C cho vertical slice kỹ thuật, sau đó trình bảng A/B riêng để mở content.
- **Phần bị chặn:** Author và phát hành bốn nhóm content mới. Schema, progression, lazy job và recipe Phá Chướng Đan hiện hữu không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn C — chỉ phát hành Phá Chướng Đan hiện hữu trước; các content mới tiếp tục chờ bảng số.
- **Kết quả xử lý:** Foundation/start-claim và dashboard đã chạy với Phá Chướng Đan; không tự author Tu Vi Đan, Phù hoặc vũ khí ngũ hành.
- **Trạng thái:** RESOLVED
---

## Q-MONSTER-012 — Tỷ lệ quái dùng Đánh Thường khi đã có kỹ năng

- **Bối cảnh:** `SkillManager` đã có fallback `BASIC_ATTACK`, nhưng chỉ dùng khi entity không có Active Skill hợp lệ hoặc bị `SILENCE`. Tất cả quái content hiện tại đều có `skillIds`, nên mỗi lượt luôn chọn một Skill và gần như không xuất hiện Đánh Thường. `monster_ai.json` có `attackWeight/defenseWeight` nhưng runtime chưa dùng và hai weight này không định nghĩa tỷ lệ Basic Attack.
- **Tài liệu/phần code liên quan:** `SkillManager`, `BattleEngine`, `monster_ai.json`, `MonsterGeneratorService`, `BattleEntityFactory`.
- **Điểm chưa rõ:** Xác suất Đánh Thường là bao nhiêu; dùng chung hay theo AI profile; boss có dùng Đánh Thường không; roll trước hay sau khi lọc Skill hợp lệ.
- **Phương án A — `basicAttackChance` theo AI profile (đề xuất):** thêm phần trăm vào JSON và `SkillManager` roll giữa Basic Attack/Skill sau khi lọc Skill hợp lệ. Baseline đề xuất: `NORMAL 35%`, `AGGRESSIVE 20%`, `DEFENSIVE 40%`, `BOSS 15%`. Data-driven, dễ cân bằng; cần snapshot AI profile vào BattleEntity.
- **Phương án B — Basic Attack là một weighted skill:** mỗi monster/template khai báo weight cho `BASIC_ATTACK` cùng từng Skill. Kiểm soát từng quái tốt nhất nhưng content dài và cần weighted skill schema mới.
- **Phương án C — Skill có cooldown, hết Skill mới đánh thường:** tự nhiên hơn nhưng cần cooldown state/replay và thông số cho toàn bộ Skill; phạm vi lớn hơn yêu cầu hiện tại.
- **Đề xuất kỹ thuật (chưa áp dụng):** A.
- **Phần bị chặn:** Thay đổi lựa chọn hành động để quái có xác suất Đánh Thường. Fallback hiện hữu và `SILENCE → BASIC_ATTACK_ONLY` vẫn hoạt động.
- **Câu trả lời của chủ dự án:** Áp dụng giống như người chơi.
- **Điểm cần làm rõ sau trả lời:** Player hiện cũng luôn chọn Active Skill nếu có và chỉ fallback Đánh Thường khi không có Skill hợp lệ. Vì vậy áp dụng đúng rule của Player sẽ không tạo xác suất Đánh Thường cho quái đang có `skillIds`, trái với báo cáo ban đầu “quái vật không có đánh thường”. Cần xác nhận muốn giữ rule giống Player hay vẫn thêm một tỷ lệ Basic Attack cho cả Player và Monster.
- **Quyết định mới ngày 2026-07-23:** Chủ dự án thay thế mô hình xác suất bằng cooldown riêng trên từng Skill; khi không thể dùng Skill do cooldown thì dùng Đánh Thường. Quyết định này chọn hướng C nhưng lifecycle chính xác và bảng cooldown được tách sang `Q-COMBAT-016/017` trước khi kích hoạt.
- **Kết quả hoàn tất:** `Q-COMBAT-016..018` đã triển khai cooldown battle-local cho toàn bộ Active Skill. Player và Monster cùng dùng ready-pool; chỉ Đánh Thường khi không còn Active Skill sẵn sàng, không dùng xác suất AI riêng.
- **Trạng thái:** RESOLVED

---

## Q-COMBAT-015 — Phạm vi và tỷ lệ gắn Effect khống chế vào Skill

- **Bối cảnh:** Runtime đã hỗ trợ `STUN/FREEZE → SKIP_ACTION` trong 1 lượt và `SILENCE → BASIC_ATTACK_ONLY`; chance được roll bằng RandomProvider. `Lôi Ngục` đã có STUN 20%, `Thiên Môn Kiếm Trận` STUN 15%. Nhiều Skill khác chỉ có Element marker/Damage; `Vồ Mồi` và `Rễ Trói` hiện gây SLOW, không làm mất lượt.
- **Tài liệu/phần code liên quan:** `effects.json`, `attack_skill_templates.json`, `monster_attack_skill_templates.json`, `BattleEngine`, `ActionExecutor`, `Q-COMBAT-001`.
- **Điểm chưa rõ:** Những Skill nào được xem là khống chế; Effect cụ thể và tỷ lệ từng Skill/phẩm; có đổi SLOW hiện hữu thành STUN/FREEZE hay giữ song song; player skill và monster skill có dùng cùng curve không.
- **Phương án A — Author explicit từng Skill (đề xuất):** mỗi Skill CONTROL khai báo Action `APPLY_EFFECT`, Effect và chance riêng trong JSON. Giữ hai tỷ lệ đã duyệt 20%/15%; chủ dự án cung cấp hoặc duyệt bảng còn lại. Rõ ràng, data-driven, không làm mọi Skill cùng hệ tự động khống chế.
- **Phương án B — Curve theo hệ và phẩm:** Băng tự FREEZE, Lôi tự STUN; Hoàng/Huyền/Địa/Thiên dùng chung curve đề xuất `5/10/15/20%`. Ít data lặp nhưng thay đổi sức mạnh toàn bộ Skill nguyên tố và khó tạo ngoại lệ theo tên Skill.
- **Phương án C — Chỉ giữ content hiện có:** không gắn Effect hàng loạt; chỉ sửa UI để hiện thành công/thất bại và mất lượt. Ít rủi ro balance nhưng không mở rộng danh sách Skill khống chế.
- **Đề xuất kỹ thuật (chưa áp dụng):** A.
- **Phần bị chặn:** Sửa/thêm Effect và chance cho các Skill chưa có quyết định. Runtime control và phần hiển thị kết quả Effect không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn A — Effect và chance được author explicit trên từng Skill.
- **Kết quả xử lý:** Contract data-driven đã đúng phương án A. `Lôi Ngục` khai báo STUN 20%, `Thiên Môn Kiếm Trận` STUN 15%, `Vồ Mồi` SLOW 30%, `Rễ Trói` SLOW 50% và `Hoa Phấn Mê Hoặc` SILENCE 25%. Không tự thêm Effect vào Skill khác khi chưa có bảng content cụ thể.
- **Trạng thái:** RESOLVED
---

## Q-EQUIPMENT-001 — Ô `ROBE` hay `NECKLACE` trong loadout 4 loại

- **Bối cảnh:** Chủ dự án yêu cầu màn hình trang bị có đủ 4 select tương ứng Nhẫn, Vũ khí, Áo giáp và Dây chuyền. GameData/runtime hiện có đúng 4 type nhưng là `WEAPON`, `ARMOR`, `ROBE`, `RING`; toàn bộ template ngũ hành, grade field và effect mapping hiện đã có cho `ROBE`, chưa có `NECKLACE`.
- **Tài liệu/phần code liên quan:** `equipment_types.json`, `equipment_templates.json`, `equipment_grades.json`, `ItemGenerator.BASE_PERCENT_FIELD`, migration `020_equipment_type_slots.sql`, `/trangbi`.
- **Điểm chưa rõ:** `NECKLACE` sẽ thay thế hoàn toàn `ROBE`, được thêm thành type thứ năm, hay chỉ là tên hiển thị mới của `ROBE`? Mỗi phương án thay đổi content/migration và cân bằng loadout khác nhau.
- **Phương án A — Thay `ROBE` bằng `NECKLACE` và bảo toàn balance (đề xuất nếu
  loadout bắt buộc đúng 4 ô):** migrate template/instance `ROBE → NECKLACE`, đổi tên
  template theo từng hệ; Dây chuyền giữ hai modifier hiện hữu `DEF_PERCENT +
  HP_PERCENT` và dùng hai grade field DEF/HP tương ứng. Đúng UX bốn ô yêu cầu, không
  làm thay đổi chỉ số Player hiện hữu; đổi lại semantics Dây chuyền thiên về phòng thủ.
- **Phương án B — Giữ `ROBE`, thêm `NECKLACE` thành ô thứ năm:** bảo toàn content hiện hữu và phân biệt pháp y/phụ kiện; cần UI pagination hoặc bỏ hàng nút thao tác vì Discord chỉ cho tối đa 5 action row mỗi message.
- **Phương án C — Giữ ID/runtime `ROBE`, chỉ hiển thị là Dây chuyền:** migration nhỏ nhất nhưng tên dữ liệu, template pháp y và modifier DEF/HP sai nghĩa; không khuyến nghị.
- **Phương án D — Gộp `ROBE` và `NECKLACE` vào một type `ACCESSORY`:** vẫn bốn ô và mở rộng content, nhưng một pháp y và dây chuyền cạnh tranh cùng ô, không khớp trực giác trang bị.
- **Đề xuất kỹ thuật (chưa áp dụng):** A nếu bốn ô là contract cố định; giữ modifier
  DEF/HP để migration không làm thay đổi lực chiến. UI hiện được làm data-driven theo
  bốn type đang cấu hình nên phần preview/format không bị chặn.
- **Phần bị chặn:** đổi/xóa `ROBE`, tạo `NECKLACE`, migration dữ liệu trang bị và tên ô cuối cùng. Percentage formatter, stat preview và panel bốn select theo GameData hiện tại không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn A — thay `ROBE` bằng `NECKLACE`, giữ đúng bốn
  slot và bảo toàn dữ liệu Player.
- **Kết quả xử lý:** Contract migration đã khóa và hoàn tất tại
  `Q-EQUIPMENT-006 A`: `ROBE → NECKLACE`, `SWORD → WIND`, đủ bốn slot và tám
  template Dây chuyền. Migration đổi identity dữ liệu cũ nhưng bảo toàn fixed
  effect/lực chiến của instance Player hiện hữu.
- **Trạng thái:** RESOLVED
---

## Q-COMBAT-014 — Canonical Action ID và order cho Skill content

- **Bối cảnh:** Skill Action spec yêu cầu mọi Action có `id` và `order`. Attack Skill hiện có order nhưng không có ID; Defense Skill không có cả ID lẫn order. `BattleActionFactory` đang compatibility-default mọi order thiếu thành `999`, nên hai Defense Action chỉ giữ thứ tự nhờ stable array sort và không có canonical identity trong event/audit.
- **Tài liệu/phần code liên quan:** `004_SKILL_ACTION_SPEC.md`; `008_RUNTIME_SKILL_SPEC.md`; `BattleActionFactory`; `BattleSkillFactory`; attack/defense skill templates; `BattleActionPipeline.createEventIdentity()`.
- **Điểm chưa rõ:** Action identity phải được author khai báo hay sinh runtime; Defense Action dùng explicit order nào; event/replay lưu action ID hay tiếp tục chỉ `(skillId, actionIndex)`.
- **Phương án A — Migrate content sang explicit ID/order:** mọi Action khai báo ID duy nhất trong Skill và order positive integer; Defense Shield order 1, Effect order 2 theo array hiện tại; validator bắt duplicate/missing. Event mang action ID cùng index. Data rõ và replay/audit ổn định nhưng cần cập nhật toàn bộ skill content/schema.
- **Phương án B — Factory sinh deterministic identity/order:** ID `${skillId}:action:<index>` và order `index + 1` khi thiếu. Không phải sửa nhiều JSON nhưng reorder content âm thầm đổi identity và replay reference.
- **Phương án C — Giữ compatibility hiện tại:** không Action ID, order thiếu là 999 và identity `(skillId, actionIndex)`. Ít thay đổi nhưng tiếp tục trái spec, khó tham chiếu Action ổn định.
- **Đề xuất kỹ thuật:** A; content author phải sở hữu identity/order. Factory chỉ preserve/normalize, không phát minh canonical gameplay identity.
- **Phần bị chặn:** Enforce ID/order trong validator, migration skill JSON và đưa action ID vào battle event/replay. Deep immutability/source isolation của factory không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn A — migrate toàn bộ content sang explicit Action ID/order.
- **Kết quả triển khai:** 70 Skill/140 Action đã có ID explicit và order positive integer; 84 Defense Action được gán order theo thứ tự hiện hữu (Shield 1, Effect 2). Validator chặn thiếu/trùng ID hoặc order trong cùng Skill và chặn reference/type không tồn tại. Factory không còn fallback order `999`; Basic Attack cũng có canonical Action ID. Event identity, semantic trigger, aggregate ActionResult và ExecutionContext đều mang `actionId`. Migration authoring chạy lặp an toàn qua `data:migrate:skill-actions`; audit chuyên biệt xác nhận JSON → normalizer → factory → event giữ nguyên identity/order.
- **Trạng thái:** RESOLVED

---

## Q-MONSTER-004 — Phân bổ danh sách quái TXT vào 15 map

- **Bối cảnh:** `Danh_sach_quai_vat_game_tu_tien.txt` cung cấp hơn 100 tên quái/boss theo 20 chủng tộc, trong khi runtime có 15 map theo cảnh giới. Mỗi Monster Template bắt buộc có `element`, `realmCode`, AI/Skill, reward reference và spawn pool cần `weight`/`spawnType`. TXT chưa chứa các trường này.
- **Tài liệu/code liên quan:** `src/data/monster/Danh_sach_quai_vat_game_tu_tien.txt`, `monster_template.json`, `monster_spawn_pools.json`, `maps.json`, `MonsterGeneratorService`, `MapEncounterService`.
- **Điểm chưa rõ:** Chủng/tên quái nào thuộc từng map; mỗi quái dùng hệ, AI, skill và reward nào; số quái/spawn weight trên mỗi map; boss nào là boss Bí Cảnh của từng cảnh giới.
- **Phương án A — Chủ dự án cung cấp mapping đầy đủ:** đúng lore/balance nhất; cần bảng `{mapId, monsterName, element, skillIds, weight, spawnType}` và boss theo Realm.
- **Phương án B — Tạo bản mapping theo chủ đề để duyệt:** kỹ thuật đề xuất phân nhóm theo lore/map rồi ghi toàn bộ mapping vào câu hỏi trước khi kích hoạt; nhanh hơn nhưng vẫn cần chủ dự án duyệt vì ảnh hưởng lớn đến content và balance.
- **Phương án C — Triển khai cuốn chiếu ba map ACTIVE trước:** phạm vi nhỏ, tận dụng reward hiện có; 12 map còn lại tiếp tục `CONTENT_PENDING`, nhưng chưa đưa toàn bộ TXT vào gameplay ngay.
- **Ưu/nhược điểm:** A kiểm soát cao nhưng tốn công nhập; B nhanh và nhất quán chủ đề nhưng có rủi ro lệch ý đồ; C an toàn cho MVP nhưng content không đầy đủ.
- **Đề xuất kỹ thuật (chưa áp dụng):** B kết hợp C — lập mapping có chủ đề cho toàn tuyến, chỉ kích hoạt từng map khi reward/skill của Realm đó đã hợp lệ.
- **Phần bị chặn:** Tạo Monster Template mới từ TXT, gán spawn pool/map và boss Bí Cảnh cụ thể. Registry phẩm chất và quy tắc boss bỏ quality không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn C — triển khai cuốn chiếu ba map ACTIVE trước; đồng thời bổ sung `Ky_nang_quai_vat_theo_chung_toc.txt` và yêu cầu tạo data Skill riêng cho quái theo logic game Tu Tiên.
- **Kết quả xử lý:** Phạm vi ba map đã chốt. Mapping quái/boss/weight cụ thể được tách thành `Q-MONSTER-006`; semantics Skill vượt khả năng executor hiện tại được tách thành `Q-MONSTER-008`. Catalog tên Skill có thể chuẩn hóa độc lập.
- **Trạng thái:** RESOLVED
---

## Q-MONSTER-005 — Phân phối xác suất phẩm chất quái thường

- **Bối cảnh:** Chủ dự án đã chốt 10 phẩm chất từ Phàm Thú đến Hồng Hoang Dị Thú; mỗi bậc tăng thêm 15% base stat gốc và phần trăm phải chỉnh được trong JSON. Boss không có phẩm chất và giữ công thức scaling cũ. Tuy nhiên TXT không nêu tỷ lệ xuất hiện phẩm chất.
- **Tài liệu/code liên quan:** `monster_quality_tiers.json`, `MonsterGeneratorService`, `monster_spawn_pools.json`, Exploration và Secret Realm.
- **Điểm chưa rõ:** Quality được roll theo một bảng toàn game, theo map/cảnh giới, hay được gán cố định trên từng spawn entry; tỷ lệ của 10 bậc là bao nhiêu; phẩm chất có tăng reward/drop hay chỉ tăng HP/ATK/DEF/SPD.
- **Phương án A — Một bảng tỷ lệ toàn game:** dễ cân bằng và ít data; nhưng Hồng Hoang Dị Thú có thể xuất hiện quá sớm nếu không thêm Realm gate.
- **Phương án B — Quality pool theo map/cảnh giới:** kiểm soát progression tốt, data-driven và dễ mở rộng; cần cung cấp/duyệt weights cho từng tier/map.
- **Phương án C — Quality cố định trên spawn entry:** deterministic và đơn giản; ít đa dạng, muốn cùng quái nhiều phẩm chất phải lặp entry.
- **Ưu/nhược điểm:** A ít cấu hình nhưng khó cân progression; B linh hoạt nhất nhưng nhiều dữ liệu; C dễ audit nhưng không tạo cảm giác roll ngẫu nhiên tự nhiên.
- **Đề xuất kỹ thuật (chưa áp dụng):** B; mỗi map trỏ `monsterQualityPoolId`, pool có Realm gate và weights. Reward multiplier để riêng, chưa tự tăng theo stat quality.
- **Phần đã triển khai độc lập:** 10 tier và `stepPercent: 15` trong JSON; công thức cộng tuyến tính từ base gốc; quái không có lựa chọn quality dùng Phàm Thú 0%; BOSS/WORLD_BOSS luôn `qualityId = null` và không nhận multiplier.
- **Phần bị chặn:** Roll quality ngẫu nhiên và ảnh hưởng quality lên reward/drop.
- **Câu trả lời của chủ dự án:** Chọn B — Quality Pool theo map/cảnh giới.
- **Kết quả xử lý:** Kiến trúc pool theo map/cảnh giới đã chốt; weights cụ thể được duyệt tại `Q-MONSTER-007`, reward semantics được duyệt tại `Q-MONSTER-009/011`. Runtime hiện roll quality theo pool của map và bỏ qua quality cho Boss.
- **Trạng thái:** RESOLVED

---

## Q-MONSTER-006 — Mapping content cụ thể cho ba map ACTIVE

- **Bối cảnh:** `Q-MONSTER-004` chọn triển khai cuốn chiếu ba map hiện có, nhưng chưa chọn Monster cụ thể, boss Bí Cảnh hay spawn weight. Danh sách TXT có nhiều cách phân bổ hợp lore.
- **Tài liệu/code liên quan:** hai TXT trong `src/data/monster`, `maps.json`, `monster_spawn_pools.json`, Monster/Secret Realm runtime.
- **Điểm chưa rõ:** Có duyệt mapping đề xuất dưới đây hay cần thay quái/boss; spawn quái thường dùng equal weight hay tỷ lệ riêng?
- **Phương án A — Duyệt baseline theo chủ đề (đề xuất):** `Thanh Vân Sơn Mạch`: Thỏ Linh, Linh Hồ, Yêu Lang, Phong Lang, Thụ Yêu; boss Bí Cảnh Lang Vương. `Huyền Mộc Quốc`: Hoa Yêu, Đằng Yêu, Cổ Mộc, Linh Hoa, Nhân Sâm Tinh, Thạch Linh; boss Vạn Niên Thụ Yêu. `Đông Hoang Đại Lục`: Bạch Hổ, Huyết Hổ, Ma Hùng, Liệt Diễm Sư, Lôi Báo, Kim Cang Viên; boss Bạch Hổ Vương. Quái thường trong mỗi map equal weight; boss không nằm trong Exploration pool.
- **Phương án B — Chủ dự án chỉnh mapping:** giữ phạm vi ba map nhưng cung cấp danh sách thay thế và weight cho từng quái/boss.
- **Phương án C — Chỉ triển khai Thanh Vân trước:** giảm phạm vi playtest, hai map còn lại tạm giữ content cũ.
- **Ưu/nhược điểm:** A tạo progression rõ, chỉnh dễ trong JSON nhưng là lựa chọn lore kỹ thuật; B đúng ý đồ nhất nhưng cần thêm input; C an toàn nhất nhưng chậm đưa content mới vào game.
- **Đề xuất kỹ thuật (chưa áp dụng):** A. Dùng Monster Template explicit và Secret Realm Boss Pool theo Realm; không để boss xuất hiện trong `/thamhiem`.
- **Phần bị chặn:** Monster Template/spawn pool/boss pool mới và kích hoạt Skill lên các template.
- **Câu trả lời của chủ dự án:** Chọn A — duyệt nguyên baseline mapping, equal weight và boss chỉ thuộc Bí Cảnh.
- **Kết quả xử lý:** Đã triển khai mapping ba map, equal weight và boss pool riêng. Entry Phong Lang được thay bằng Thiết Giáp Lang theo quyết định tiếp theo tại `Q-MONSTER-010`.
- **Trạng thái:** RESOLVED
---

## Q-MONSTER-007 — Weight Quality Pool cho ba map và reward semantics

- **Bối cảnh:** `Q-MONSTER-005` đã chọn pool theo map/cảnh giới, nhưng chưa có weights và chưa quyết định phẩm chất có tăng reward hay chỉ tăng stat.
- **Tài liệu/code liên quan:** `monster_quality_tiers.json`, ba map ACTIVE, Monster Generator và Reward Table runtime.
- **Điểm chưa rõ:** Tỷ lệ từng phẩm chất tại mỗi map; tier tối đa; quality có nhân reward/drop không?
- **Phương án A — Baseline tăng dần bảo thủ (đề xuất):** Thanh Vân `Phàm 75/Linh 20/Yêu 5`; Huyền Mộc `Phàm 55/Linh 30/Yêu 12/Huyền 3`; Đông Hoang `Phàm 35/Linh 35/Yêu 20/Huyền 8/Địa 2`. Các tier cao hơn weight 0/không vào pool. MVP chỉ tăng HP/ATK/DEF/SPD, reward giữ nguyên.
- **Phương án B — Cùng một pool cho cả ba map:** `Phàm 55/Linh 30/Yêu 12/Huyền 3`; ít data nhưng progression map kém rõ.
- **Phương án C — Chủ dự án cung cấp weights/reward multiplier:** kiểm soát balance đầy đủ nhưng cần bảng số cụ thể.
- **Ưu/nhược điểm:** A tạo cảm giác map cao có quái hiếm hơn và không gây lạm phát; B dễ quản lý nhưng ít khác biệt; C linh hoạt nhất nhưng chưa thể triển khai nếu thiếu số.
- **Đề xuất kỹ thuật (chưa áp dụng):** A; reward multiplier tách thành quyết định sau telemetry, không ngầm tăng cùng combat stat.
- **Phần bị chặn:** JSON quality pools, weighted resolver và gắn pool vào ba map.
- **Câu trả lời của chủ dự án:** Chọn A cho weights; bổ sung yêu cầu quality tăng tỷ lệ rơi công pháp, kỹ năng, trang bị và vật phẩm.
- **Kết quả xử lý:** Ba Quality Pool đã được author theo đúng weights duyệt. `Q-MONSTER-009/011` tiếp tục chốt relative multiplier riêng, cap 100% và chỉ tác động reward phi currency; runtime/audit tương ứng đã hoàn tất.
- **Trạng thái:** RESOLVED
---

## Q-MONSTER-008 — Semantics runtime cho Skill chủng tộc

- **Bối cảnh:** TXT mới có các Skill mà executor hiện chạy được trực tiếp (DAMAGE, HEAL, SHIELD, control/modifier), nhưng cũng có Triệu Hồi, Phân Thân, Hồi Sinh, Đoạt Xá, Biến hình và Khóa Hồi Máu chưa có contract/runtime hoàn chỉnh.
- **Tài liệu/code liên quan:** `Ky_nang_quai_vat_theo_chung_toc.txt`, `ActionExecutor`, executable Action allowlist, Effect/Formula registries và Skill templates hiện tại.
- **Điểm chưa rõ:** Gói đầu có chỉ dùng Skill biểu diễn đúng bằng executor hiện hữu hay phải mở rộng engine cho các semantics đặc biệt ngay?
- **Phương án A — Staged executable-only (đề xuất):** chuẩn hóa toàn bộ tên thành catalog; với ba map đầu chỉ author Skill có semantics thật bằng DAMAGE/HEAL/SHIELD/ADD_MODIFIER/PURIFY/control/CHAIN_DAMAGE. Skill đặc biệt giữ `CONTENT_PENDING`, không giả lập sai tên.
- **Phương án B — Mở rộng engine ngay:** thêm typed summon/revive/transform/heal-lock/possession contracts và executor trước khi tạo toàn bộ Skill; đầy đủ hơn nhưng mở rộng combat lớn và cần thêm quyết định duration/target/cap.
- **Phương án C — Chỉ tạo catalog, chưa gán Skill mới:** không ảnh hưởng battle hiện tại nhưng content ba map chưa có bản sắc chủng tộc.
- **Ưu/nhược điểm:** A chạy được sớm và đúng contract hiện hành; B sát toàn bộ TXT nhưng rủi ro/balance lớn; C an toàn nhưng chưa đáp ứng gameplay.
- **Đề xuất kỹ thuật (chưa áp dụng):** A. Mỗi Monster Template dùng explicit `skillIds`; catalog và executable templates tách file để content pending không lọt vào Battle.
- **Phần bị chặn:** Tạo/gán executable Monster Skill cho ba map; catalog tên/nhóm có thể triển khai độc lập.
- **Câu trả lời của chủ dự án:** Chọn A — staged executable-only, không giả lập sai Skill đặc biệt.
- **Kết quả xử lý:** Đã tạo 16 Skill executable thuộc ba chủng tộc Beast/Wood Demon/Spirit Creature, chỉ dùng Action runtime hỗ trợ và gắn `MONSTER_ONLY`. Toàn bộ quái đang ACTIVE và ba boss đều có ít nhất một Action DAMAGE; 96 Skill còn lại giữ catalog-only. Audit runtime và battle simulation PASS.
- **Trạng thái:** RESOLVED

---

## Q-MONSTER-009 — Công thức quality tăng tỷ lệ rơi reward

- **Bối cảnh:** Chủ dự án yêu cầu phẩm chất quái tăng cơ hội rơi công pháp, kỹ năng, trang bị và vật phẩm. Reward entries hiện dùng `chance` phần trăm; currency có thể guaranteed và quantity riêng. Quality stat đang tăng 15% mỗi order.
- **Tài liệu/code liên quan:** `monster_quality_tiers.json`, `RewardTableService`, `reward_tables.json`, Exploration/Secret Realm reward context.
- **Điểm chưa rõ:** Bonus là nhân tương đối hay cộng điểm phần trăm; dùng chung bước 15% với stat hay cấu hình riêng; cap chance; có tác động currency/quantity/grade pool không?
- **Phương án A — Nhân tương đối cùng quality bonus:** `effectiveChance = min(100, baseChance × qualityMultiplier)`; chỉ áp dụng ITEM/EQUIPMENT/SKILL/CULTIVATION_ART, không đổi currency/quantity/grade. Ví dụ base 8%, Linh Thú thành 9.2%. Ít config nhưng buộc reward/stat dùng chung curve.
- **Phương án B — Reward multiplier riêng trong quality JSON (đề xuất):** mỗi tier hoặc policy có `rewardChanceBonusPercent`; công thức nhân tương đối và cap 100%; không đổi currency/quantity/grade. Dễ balance độc lập nhưng cần chốt giá trị ban đầu.
- **Phương án C — Cộng thẳng percentage point:** `effectiveChance = min(100, baseChance + bonusPoint)`; dễ thấy nhưng làm drop hiếm tăng quá mạnh.
- **Ưu/nhược điểm:** A đơn giản; B kiểm soát kinh tế tốt nhất; C trực quan nhưng rủi ro lạm phát lớn.
- **Đề xuất kỹ thuật (chưa áp dụng):** B, baseline có thể bắt đầu `0/5/10/15/20/30/40/55/75/100%` relative bonus theo 10 tier; cần chủ dự án duyệt số. Persist effective quality trong activity snapshot và truyền typed reward context, không đọc quality mới sau battle.
- **Phần bị chặn:** Quality modifier lên reward roll. Quality stat, pool weights, monster/skill/map và boss runtime không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn B — reward multiplier riêng trong quality JSON.
- **Kết quả xử lý:** Đã triển khai công thức nhân tương đối, cap 100%, allowlist reward phi currency và nhận bonus từ Monster quality snapshot. Dãy bonus đã được chốt/áp dụng tại `Q-MONSTER-011`.
- **Trạng thái:** RESOLVED
---

## Q-MONSTER-010 — Phong Lang trong Thanh Vân khi hệ Phong chưa có runtime

- **Bối cảnh:** Mapping được duyệt tại `Q-MONSTER-006` có Phong Lang trong Thanh Vân Sơn Mạch. Tuy nhiên Element registry hiện không có `WIND`; semantics Phong trong TXT là tăng tốc/né tránh và đang `CONTENT_PENDING`. `Q-MONSTER-008` yêu cầu chỉ đưa Skill executable đúng nghĩa vào runtime, không ánh xạ giả sang hệ khác.
- **Tài liệu/code liên quan:** `Q-MONSTER-006`, `Q-MONSTER-008`, `monster_skill_catalog.json`, `elements.json`, `attributes.json`, `monster_spawn_pools.json`.
- **Điểm chưa rõ:** MVP nên thay Phong Lang bằng quái cùng chủ đề đã hỗ trợ, tạm để pool bốn quái, hay mở rộng Element/né tránh ngay?
- **Phương án A — Thay bằng Thiết Giáp Lang cho MVP (đề xuất):** vẫn đủ năm quái và giữ chủ đề Lang; dùng hệ Kim/primitives hiện có. Ưu điểm là triển khai ngay; nhược điểm là khác mapping tên đã duyệt.
- **Phương án B — Bổ sung WIND và dodge runtime:** giữ đúng Phong Lang và bản sắc hệ Phong. Ưu điểm là đúng lore; nhược điểm là thay đổi Element relation, attribute/formula và balance vượt phạm vi content data.
- **Phương án C — Giữ Thanh Vân với bốn quái cho tới gói hệ Phong:** không giả lập và không đổi mapping đã duyệt. Ưu điểm an toàn; nhược điểm pool hiện thiếu Phong Lang so với baseline năm quái.
- **Ưu/nhược điểm:** A hoàn chỉnh pool nhanh nhưng thay content; B đầy đủ nhất nhưng mở rộng engine; C bảo toàn quyết định và scope nhưng ít đa dạng tạm thời.
- **Đề xuất kỹ thuật (chưa áp dụng):** A nếu ưu tiên đủ content MVP; C nếu muốn giữ chính xác danh sách đã duyệt. Không dùng `LIGHTNING` làm alias cho WIND.
- **Phần bị chặn:** Chỉ entry thứ năm của Thanh Vân và Skill Phong Lang. Bốn quái Thanh Vân, toàn bộ Huyền Mộc/Đông Hoang, quality pool và boss Bí Cảnh đã triển khai độc lập.
- **Câu trả lời của chủ dự án:** Chọn A — thay Phong Lang bằng Thiết Giáp Lang cho MVP.
- **Kết quả xử lý:** Đã thêm `MON_BEAST_IRON_WOLF` hệ Kim, explicit skill Cắn Xé/Gầm Thét và đưa vào Thanh Vân equal-weight. Không thêm WIND hoặc dodge ngầm.
- **Trạng thái:** RESOLVED
---

## Q-MONSTER-011 — Giá trị reward bonus cho từng phẩm chất quái

- **Bối cảnh:** `Q-MONSTER-009` chọn multiplier riêng trong quality JSON, nhưng phương án B không tự xác định mười giá trị ban đầu. Reward chance cần số cụ thể để tránh thay đổi kinh tế ngoài ý muốn.
- **Tài liệu/code liên quan:** `monster_quality_tiers.json`, `RewardTableService`, `Q-MONSTER-009`.
- **Điểm chưa rõ:** Có duyệt baseline relative bonus `0/5/10/15/20/30/40/55/75/100%` hay dùng dãy khác?
- **Phương án A — Duyệt baseline đề xuất:** Phàm đến Hồng Hoang lần lượt `0/5/10/15/20/30/40/55/75/100`; effective chance `min(100, baseChance × (1 + bonus/100))`. Dễ kiểm soát và tách khỏi stat curve, nhưng tier cuối nhân đôi chance.
- **Phương án B — Dùng cùng bước 15% như stat:** `0/15/30/.../135`; ít tham số nhưng drop tăng mạnh và làm mất lợi ích của policy tách riêng.
- **Phương án C — Chủ dự án cung cấp mười số:** kiểm soát balance chính xác nhất nhưng cần đủ mười giá trị không âm.
- **Ưu/nhược điểm:** A bảo thủ ở tier thấp và tăng rõ ở tier cao; B đơn giản nhưng lạm phát hơn; C linh hoạt nhất.
- **Đề xuất kỹ thuật (chưa áp dụng):** A. Lưu số trên từng tier, validator bắt số hữu hạn không âm; reward plan snapshot effective chance để audit. `CURRENCY` không bị tác động; `ITEM` bao gồm sách công pháp/kỹ năng và vật phẩm, `EQUIPMENT` là trang bị.
- **Phần bị chặn:** Chỉ việc điền bonus và kích hoạt quality modifier lên Reward Table roll.
- **Câu trả lời của chủ dự án:** Chọn A — duyệt baseline `0/5/10/15/20/30/40/55/75/100%`.
- **Kết quả xử lý:** Đã khai báo `rewardChanceBonusPercent` trên đủ 10 tier, validator bắt số không âm và runtime dùng đúng formula/cap từ policy. Currency không đổi.
- **Trạng thái:** RESOLVED
---

## Q-ELEMENT-001 — Phạm vi bổ sung hệ Phong và cơ chế né tránh

- **Bối cảnh:** Chủ dự án xác nhận kiến trúc nên cho phép bổ sung hệ Phong. Element registry hiện data-driven, nhưng battle chưa có thuộc tính né tránh; `HIT_RATE` đang tồn tại mà damage pipeline chưa có contract đối ứng DODGE. Việc chỉ thêm `WIND` vào JSON sẽ hợp lệ về reference nhưng chưa tạo gameplay Phong như TXT mô tả.
- **Tài liệu/code liên quan:** `elements.json`, `element_relations.json`, `attributes.json`, Formula/Action pipeline, `monster_skill_catalog.json`.
- **Điểm chưa rõ:** WIND là hệ độc lập hay biến dị của hệ nào; có quan hệ sinh/khắc với hệ khác không; MVP cần né tránh thật hay chỉ cần tốc độ; tỷ lệ né, cap và thứ tự hit/miss so với crit/control chưa được chốt.
- **Phương án A — WIND data-first, gameplay tốc độ (đề xuất MVP):** thêm WIND là Element độc lập, chưa có sinh/khắc nên exact lookup trả neutral; Skill Phong dùng DAMAGE và `SPD_UP_10`; semantics DODGE tiếp tục pending. Mở rộng content ngay, không giả có né tránh.
- **Phương án B — WIND + dodge runtime đầy đủ:** thêm `DODGE_RATE` percentage-point; đề xuất hit chance `clamp(HIT_RATE - DODGE_RATE, 5, 100)`, roll trước crit/damage/effect; cần chốt bonus Skill và quan hệ nguyên tố. Đúng bản sắc hơn nhưng thay đổi balance toàn battle.
- **Phương án C — Chỉ mở extension contract, chưa thêm WIND content:** giữ code hiện tại và audit chứng minh registry chấp nhận Element mới; không có gameplay Phong cho tới gói sau.
- **Ưu/nhược điểm:** A mở content an toàn nhưng chưa có né; B đầy đủ nhưng tác động engine/balance; C ít rủi ro nhất nhưng chưa có hệ mới trong game.
- **Đề xuất kỹ thuật (chưa áp dụng):** A cho MVP, sau đó nâng sang B bằng Effect/Formula data khi có bộ số. Không khai báo parent hoặc relation nếu chưa được chọn.
- **Phần bị chặn:** Registry/content WIND và mọi cơ chế dodge. Thiết Giáp Lang theo lựa chọn `Q-MONSTER-010` không phụ thuộc câu này.
- **Câu trả lời của chủ dự án:** Phong hệ là sát thương thuần.
- **Kết quả xử lý:** Đã thêm Element `WIND` độc lập và Effect marker không gameplay ngầm; `Phong Nhận` là executable Monster Skill chỉ có một Action DAMAGE hệ WIND. Không thêm dodge, speed, parent hoặc sinh/khắc. Thiết Giáp Lang vẫn giữ trong Thanh Vân theo `Q-MONSTER-010`.
- **Trạng thái:** RESOLVED
---

## Q-UI-001 — Mô hình điều hướng giao diện Discord chính

- **Bối cảnh:** Dự án có 22 slash command; `/nhanvat` đã là panel bốn tab nhưng Map, tu luyện, activity, inventory và thao tác nhanh vẫn phân tán. Chủ dự án yêu cầu bắt đầu phần giao diện. Việc chọn màn hình trung tâm ảnh hưởng presenter, component session, navigation và phạm vi refactor command.
- **Tài liệu/code liên quan:** `docs/09_APPLICATION/010_DISCORD_UI_AUDIT.md`, `/nhanvat`, `/hoso`, `/tuvi`, `/trangbi`, `/chuyenmap`, `ComponentSession`.
- **Điểm chưa rõ:** Giữ slash command rời làm UX chính hay xây dashboard trung tâm; dashboard lấy nhân vật hay hành trình làm trọng tâm; command cũ được giữ hay thay thế.
- **Phương án A — Nâng `/nhanvat` thành dashboard trung tâm (đề xuất):** các nhóm Tổng quan, Tu luyện, Trang bị, Hành trình và Bộ sưu tập dùng tab/action; slash command hiện hữu vẫn giữ làm shortcut/deep link. Ít phá compatibility, phù hợp read model/private policy đã chốt; cần quản lý giới hạn 5 action row và session refresh.
- **Phương án B — Giữ 22 command rời, chỉ thống nhất visual theme:** ít refactor và mỗi command đơn giản; navigation vẫn phân mảnh, người chơi mới khó biết flow.
- **Phương án C — Tạo dashboard mới `/hanhtrinh`:** lấy map/activity làm trung tâm, `/nhanvat` chỉ quản lý build. Phù hợp RPG nhưng thêm command/read model/session mới và trùng một phần navigation.
- **Ưu/nhược điểm:** A tận dụng nền tảng hiện có và giữ shortcut; B nhanh nhất nhưng không giải quyết khám phá tính năng; C có bản sắc adventure mạnh nhưng phạm vi lớn nhất.
- **Đề xuất kỹ thuật (chưa áp dụng):** A. Tách shared UI token/presenter trước, sau đó chuyển từng tab; không gọi command khác từ button, mà dùng application query/action handler chung.
- **Phần bị chặn:** Refactor navigation và cấu trúc dashboard chính. Audit UI, chuẩn hóa token/formatter không phụ thuộc lựa chọn có thể tiếp tục.
- **Câu trả lời của chủ dự án:** Chọn A — nâng `/nhanvat` thành dashboard trung tâm và giữ command hiện hữu làm shortcut.
- **Kết quả xử lý:** Đã triển khai shared Discord UI theme/formatter và dashboard 5 tab Tổng quan/Tu luyện/Trang bị/Hành trình/Kho đồ. Dashboard dùng management/profile, inventory và current-map query; owner-only session, hết hạn disable toàn bộ component. Các command cũ không bị xóa.
- **Trạng thái:** RESOLVED
---

## Q-UI-002 — Phạm vi “Thuộc tính cộng thêm” trên tab Tổng quan

- **Bối cảnh:** Chủ dự án muốn Tổng quan hiển thị thuộc tính cộng thêm từ vũ khí/trang bị và Công Pháp, effect giống nhau phải cộng dồn. `EffectResolver` hiện aggregate theo khóa `stat:mode`: additive mode cộng, `mul_total` nhân. Tuy nhiên `player.effects` còn chứa Realm, Passive Skill, Tông Môn/Linh Căn và active buff, nên không thể dùng thẳng nếu chỉ muốn hai nguồn đã nêu.
- **Tài liệu/code liên quan:** `nhanvat.js`, `PlayerReadService`, `EffectResolver`, `Equipment.getEffects()`, `CultivationArt.getEffects()`, `EffectFormatter`.
- **Điểm chưa rõ:** Tổng quan chỉ hiển thị Equipment + Công Pháp, hay toàn bộ effect đang tác động; có cần breakdown nguồn hay chỉ một tổng đã cộng dồn?
- **Phương án A — Tổng Equipment + Công Pháp (đề xuất):** chỉ lấy effect từ trang bị đang mặc và Công Pháp đang vận hành; group theo `stat:mode`, hiển thị một dòng tổng cho mỗi nhóm. Gọn, đúng yêu cầu; không giải thích từng món đóng góp bao nhiêu.
- **Phương án B — Toàn bộ effect hiện hành:** dùng mọi nguồn Realm/Equipment/Art/Passive/Sect/Spirit Root/Buff. Phản ánh đầy đủ final stat nhưng dễ dài và trùng tab khác.
- **Phương án C — Tổng kèm breakdown nguồn:** hiển thị tổng ở Tổng quan và danh sách contribution theo từng món/Công Pháp ở tab Trang bị hoặc chi tiết. Minh bạch nhất nhưng cần thêm presenter và giới hạn độ dài.
- **Ưu/nhược điểm:** A dễ đọc và đúng scope; B đầy đủ nhưng nhiễu; C dễ kiểm chứng build nhưng chiếm nhiều UI.
- **Đề xuất kỹ thuật (chưa áp dụng):** A cho Tổng quan; giữ breakdown cho tab Trang bị ở bước sau. Projection phải được tạo trong application read model, không aggregate trong Discord command. Cùng `stat + mode` mới gộp; `add_flat_base`, `add_percent_base`, `add_flat_final` không được trộn với nhau; `mul_total` phải nhân theo canonical semantics, không cộng số thô.
- **Phần bị chặn:** Field “Thuộc tính cộng thêm” trên Tổng quan và projection nguồn tương ứng. Các tab/UI khác không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn A, sau đó bổ sung Linh Căn — Tổng quan hiển thị tổng effect từ trang bị đang mặc, Công Pháp đang vận hành và Linh Căn/phẩm chất Linh Căn.
- **Kết quả xử lý:** Read model tạo projection riêng từ ba nguồn đã chọn và aggregate theo `stat:mode`; Discord chỉ format projection. Effect cùng stat nhưng khác mode không bị trộn, `mul_total` giữ phép nhân canonical. Realm, Passive Skill, Tông Môn, active buff và trang bị chưa mặc không đi vào field này.
- **Trạng thái:** RESOLVED
---

## Q-PROGRESSION-001 — Mô hình cảnh giới vô hạn và Luân hồi

- **Bối cảnh:** GameData hiện có 15 Realm hữu hạn, mỗi Realm `maxStage: 10`. `progression_rules.json` dùng `realms.json` làm nguồn `maxStage`; `BreakthroughService` trả `MAX_REALM` khi không tìm thấy Realm tiếp theo. Player persistence hiện lưu `realm_id` và `realm_stage`, leaderboard join trực tiếp Realm definitions.
- **Tài liệu/code liên quan:** `src/data/realms/realms.json`, `src/data/realms/progression_rules.json`, `BreakthroughService`, `PlayerRuntimeRepository`, `CultivationLeaderboardRepository`, Map/Monster spawn specs.
- **Điểm chưa rõ:** Sau Đạo Tổ/Realm cuối có cho tăng vô hạn không; “luân hồi” reset những gì; người chơi giữ tài nguyên, skill, equipment, sect, achievement hay không; sức mạnh và leaderboard tính theo đời hiện tại hay tổng tiến trình; Realm vô hạn là content JSON từng mốc hay công thức sinh procedural.
- **Phương án A — Realm hữu hạn + Luân hồi (khuyến nghị MVP):** Giữ 15 Realm/10 Stage hiện tại; khi đạt Realm cuối và điều kiện Luân hồi, reset Realm/Stage/cultivation theo policy, tăng `rebirth_count`, giữ một nhóm permanent progression đã duyệt. Dễ cân bằng, tương thích data hiện tại và cho phép thêm Realm mới trước khi cần procedural scaling; cần chốt retention/reward.
- **Phương án B — Realm vô hạn theo công thức:** Realm/order/stage tiếp tục sinh từ tầng cơ sở, dùng curve và name generator; persistence lưu `realm_tier`/`realm_stage` và không cần thêm JSON từng Realm. Mở rộng vô hạn tốt nhưng khó cân bằng, khó đặt tên/map/reward/leaderboard và phải thay nhiều validator/query.
- **Phương án C — Chu kỳ Realm cố định + Luân hồi nâng cấp:** Mỗi đời đi qua một bộ Realm cố định; `rebirth_count` tạo multiplier/trait/unlock, Realm vẫn hữu hạn trong từng đời. Dễ tạo meta-progression và season/content, nhưng cần thiết kế reset/anti-snowball và UI hiển thị hai chiều tiến trình.
- **Ưu/nhược điểm kỹ thuật:** A ít thay đổi schema và battle/map; B yêu cầu thay resolver, data reference, leaderboard và reward scaling; C cần thêm domain `rebirths/permanent_progression` nhưng giữ Realm lookup ổn định.
- **Đề xuất kỹ thuật (chưa áp dụng):** Chọn A hoặc C cho MVP; giữ Realm là data-driven hữu hạn, thêm `rebirth_count`/permanent unlock bằng migration riêng sau khi chốt retention. Không dùng số thực vô hạn; mọi tier/count dùng integer/bigint và curve có cap/overflow policy.
- **Phần bị chặn:** Mọi thay đổi `MAX_REALM`, schema rebirth, breakthrough transition cuối, Realm/map/monster scaling sau Realm cuối và leaderboard “đời/tổng” bị chặn. Có thể tiếp tục viết content cho 15 Realm hiện tại độc lập.
- **Câu trả lời của chủ dự án:** Chọn A — giữ Realm hữu hạn và mở Luân hồi sau Realm cuối.
- **Kết quả xử lý:** Realm hữu hạn và Luân hồi đã được phản ánh vào policy/schema/calculator. Transaction cutover đang phụ thuộc `Q-PROGRESSION-005/006`; runtime hiện vẫn trả `MAX_REALM` cho đến khi các gate này được xử lý.
- **Trạng thái:** RESOLVED
---

## Q-CONTENT-001 — Phạm vi gói content Skill/Effect/Monster/Map tiếp theo

- **Bối cảnh:** Runtime đã hỗ trợ data-driven Skill/Action/Effect, Monster Template/Variant/AI/Reward và Map/Spawn Pool. User muốn bổ sung content theo phong cách Tu Tiên, nhưng chưa chỉ rõ gói đầu tiên, Realm mục tiêu, số lượng, power budget, tỷ lệ rơi và quan hệ nguyên tố.
- **Tài liệu/code liên quan:** `docs/05_SKILL`, `docs/02_CORE_DATA/003_EFFECT_SPEC.md`, `docs/10_GAMEPLAY/013_MAP_SPAWN_SPEC.md`, các JSON trong `src/data/skills`, `src/data/elements`, `src/data/monsters`, `src/data/maps`.
- **Điểm chưa rõ:** Content mới dành cho 15 Realm hiện tại hay Realm/luân hồi mới; cần bao nhiêu Active/Defense Skill; Effect có được thêm Action type mới không; quái/map dùng reward table nào; power curve và độ hiếm; có cần lore/biệt danh tiếng Việt chuẩn hóa không.
- **Phương án A — Content pack theo Realm hiện tại (khuyến nghị):** Mỗi pack 1–2 Realm, thêm Skill/Effect/Monster/Map tương ứng, chỉ dùng executor/effect type hiện có. Dễ kiểm thử và không mở rộng logic lõi; tốc độ content vừa phải.
- **Phương án B — Content pack theo hệ nguyên tố:** Mỗi pack tập trung một nguyên tố/khắc chế, trải dài nhiều Realm. Tạo bản sắc combat rõ nhưng cân bằng cross-Realm và reward khó hơn.
- **Phương án C — Vertical slice hoàn chỉnh:** Một Map mới gồm quái thường/elite/boss, skill/effect riêng, reward và command flow đầy đủ trước khi nhân rộng. Dễ playtest end-to-end nhưng số content ban đầu ít hơn.
- **Đề xuất kỹ thuật (chưa áp dụng):** Chọn C cho gói đầu tiên, giới hạn vào Action/Effect type đã executable; schema audit bắt buộc mọi reference tồn tại, map ACTIVE có spawn pool, monster có reward table và skill có ID/order chuẩn.
- **Phần bị chặn:** Chỉ việc thêm JSON content đã chốt mới được triển khai sau khi xác định pack/Realm/power budget; không tự thêm Action type, công thức hay reward economy mới.
- **Câu trả lời của chủ dự án:** Chọn C — xây một vertical slice hoàn chỉnh trước khi nhân rộng.
- **Kết quả xử lý:** Vertical slice Thiên Môn đã hoàn tất Map → Spawn → Monster → Skill/Effect → Reward → command map input và có audit chuyên biệt.
- **Trạng thái:** RESOLVED

---

## Q-PROGRESSION-002 — Retention, bonus và xếp hạng khi Luân hồi

- **Bối cảnh:** `Q-PROGRESSION-001` đã chọn Realm hữu hạn + Luân hồi. Để chuyển `MAX_REALM` thành transition thật cần xác định điều kiện, dữ liệu reset/giữ lại, permanent bonus và leaderboard.
- **Tài liệu/code liên quan:** `BreakthroughService`, Player/Wallet/Inventory/Skill/Art/Sect persistence, cultivation rules và Cultivation Leaderboard.
- **Điểm chưa rõ:** Điều kiện Luân hồi; có reset economy/loadout/learned content không; bonus mỗi đời và cap; người chơi có thể Luân hồi lặp vô hạn không; rank ưu tiên đời hay Realm hiện tại.
- **Phương án A — Soft Rebirth:** yêu cầu Đạo Tổ tầng 10 và đủ cultivation của tầng; reset Realm về Luyện Khí tầng 1, cultivation/base stats; giữ wallet, inventory, equipment, skill, công pháp, linh căn và tông môn. Tăng `rebirth_count`; mỗi lần cộng 10% cultivation gain, không cộng trực tiếp battle stat; leaderboard sort `rebirth_count DESC -> realm_order DESC -> stage DESC -> cultivation DESC`. Dễ hiểu và ít mất mát, nhưng item/skill cao cấp có thể làm vòng sau quá nhanh.
- **Phương án B — Hard Rebirth:** reset Realm/stage/cultivation/base stats, wallet, inventory, equipment, skill, công pháp và tông môn; chỉ giữ identity, linh căn, achievement/cosmetic và `rebirth_count`. Mỗi lần cộng 15% cultivation gain + 5% base battle stat, cap 10 lần; leaderboard ưu tiên `rebirth_count`. Cân bằng vòng lặp rõ nhưng mức mất mát cao.
- **Phương án C — Sealed Retention:** giữ ownership wallet/inventory/equipment/skill/công pháp/tông môn, nhưng tháo trang bị và niêm phong content cao hơn Realm hiện tại cho đến khi đạt lại yêu cầu. Mỗi lần cho 1 Luân Hồi Điểm dùng trên data-driven permanent talent tree; không hard-code multiplier mặc định. Có chiều sâu và chống phá cân bằng tốt hơn, nhưng cần requirement metadata, sealed-state projection và talent content mới.
- **Đề xuất kỹ thuật (chưa áp dụng):** C cho thiết kế dài hạn; nếu muốn MVP nhanh thì A nhưng cần thêm realm requirement cho equipment/skill để tránh vòng mới bị trivialize. `rebirth_count` dùng integer không âm; transaction Luân hồi phải khóa Player, settle cultivation và ghi ledger/idempotency cùng commit.
- **Phần bị chặn:** Migration/schema Luân hồi, service/command, reset transaction, permanent bonus và leaderboard ordering.
- **Câu trả lời của chủ dự án:** Chọn C, điều chỉnh thành Luân hồi không giới hạn; reset về cảnh giới thấp nhất; tăng thuộc tính cơ bản trước Effect/Equipment; chỉ giữ Linh Thạch và xóa toàn bộ vật phẩm trong hành trang/balo.
- **Kết quả xử lý:** Vòng lặp vô hạn, retention matrix và công thức base stat đã được phản ánh vào `REBIRTH_MVP_V1`, calculator và migration 016. Transaction cutover còn phụ thuộc cách xử lý activity đang dở và numeric battle runtime tại `Q-PROGRESSION-005/006`.
- **Trạng thái:** RESOLVED
---

## Q-CONTENT-002 — Chủ đề và power budget cho vertical slice đầu tiên

- **Bối cảnh:** `Q-CONTENT-001` đã chọn vertical slice. Project đang có Map `THIEN_MON` ở trạng thái `CONTENT_PENDING`, dành cho Kết Đan nhưng chưa có spawn pool/monster/reward mapping. Đây là vị trí tự nhiên để hoàn thiện end-to-end mà không tạo map trùng.
- **Tài liệu/code liên quan:** `maps.json`, `monster_spawn_pools.json`, `monster_template.json`, `monster_rules.json`, Skill/Effect JSON và `reward_tables.json`.
- **Điểm chưa rõ:** Dùng map pending hay tạo map mới; hệ nguyên tố/lore; số quái; skill/effect; reward table Kết Đan và tỷ lệ spawn.
- **Phương án A — Hoàn thiện Thiên Môn Sơn/Kết Đan (khuyến nghị):** kích hoạt `THIEN_MON` cho Exploration; thêm 2 quái thường (`Vân Dực Điêu` hệ Lôi, `Kim Giáp Viên` hệ Kim), 1 Elite (`Hộ Sơn Lôi Thú`), 1 Boss (`Thiên Môn Kiếm Khôi`); spawn weight Normal 40/40, Elite 15, Boss 5. Chỉ dùng DAMAGE/CHAIN_DAMAGE/STUN/SHIELD/ADD_MODIFIER hiện có. Thêm `MONSTER_KET_DAN`: linh thạch 40–80, equipment 10%, Đột Phá Đan 5%, Vé Bí Cảnh 2%.
- **Phương án B — U Minh Đầm/Luyện Khí–Trúc Cơ:** map mới thiên Thủy/Băng, quái thiên SLOW/FREEZE/PURIFY; reward dùng bảng Realm hiện có. Playtest control dễ nhưng tạo thêm low-level map trong khi `THIEN_MON` vẫn pending.
- **Phương án C — Xích Viêm Long Uyên/Nguyên Anh:** map boss-focused dùng Xích Viêm Giao Long, BURN và defense reactive; reward dùng `MONSTER_NGUYEN_ANH`. Hấp dẫn hơn nhưng vertical slice đầu tiên khó cân bằng và bỏ trống progression Kết Đan.
- **Đề xuất kỹ thuật (chưa áp dụng):** A; hoàn thiện content pending hiện hữu. Mọi Skill Action có explicit ID/order, không thêm Action type/formula mới; Boss xuất hiện trong spawn pool nhưng Exploration phải xác nhận có cho spawn Boss hay chỉ dành cho dungeon trước khi activation.
- **Phần bị chặn:** Ghi Skill/Effect/Monster/Spawn/Reward JSON, chuyển `THIEN_MON` sang ACTIVE và nối map vào command Exploration.
- **Câu trả lời của chủ dự án:** Chọn A — hoàn thiện Thiên Môn Sơn/Kết Đan theo danh sách quái, spawn weight và reward budget đề xuất.
- **Kết quả xử lý:** Đã thêm 4 Monster Template/Skill Kết Đan, `POOL_THIEN_MON` 40/40/15/5, `MONSTER_KET_DAN`, alias Realm order 3, explicit `skillIds`; map ACTIVE và command nhận `mapId`.
- **Trạng thái:** RESOLVED

---

## Q-PROGRESSION-003 — Retention ngoài inventory khi Luân hồi

- **Bối cảnh:** Chủ dự án đã yêu cầu chỉ giữ Linh Thạch và xóa toàn bộ vật phẩm. Tuy nhiên skill đã học, công pháp đã lĩnh ngộ, linh căn, tông môn, achievement và các currency khác không phải inventory item nên chưa có semantics reset rõ ràng.
- **Tài liệu/code liên quan:** Player/Wallet/Inventory persistence, `SkillService`, `CultivationArtService`, `SectService`, Spirit Root và Reward Ledger.
- **Điểm chưa rõ:** “Chỉ giữ Linh Thạch” áp dụng cho toàn bộ progression hay chỉ wallet/inventory; linh căn có reroll không; membership tông môn và learned content có bị xóa không.
- **Phương án A — Hard retention tối thiểu:** chỉ giữ player identity/name, linh căn, `SPIRIT_STONE`, achievement/cosmetic và `rebirth_count`; reset/xóa mọi currency khác, inventory/equipment, learned skill/công pháp, active loadout và tông môn. Đúng nghĩa “chỉ giữ Linh Thạch”, cân bằng vòng mới rõ nhưng mất nhiều tiến trình.
- **Phương án B — Giữ progression phi vật phẩm:** giữ linh căn, learned skill/công pháp, tông môn, achievement và Linh Thạch; xóa currency khác, inventory/equipment. Ít mất mát nhưng skill/công pháp cao cấp có thể làm vòng mới quá dễ nếu không có realm requirement.
- **Phương án C — Data-driven retention matrix:** policy JSON khai báo từng resource/domain là `KEEP`, `RESET` hoặc `SEAL`; baseline ban đầu dùng A. Linh hoạt cho content sau nhưng transaction/reconciliation phức tạp hơn.
- **Đề xuất kỹ thuật (chưa áp dụng):** C với baseline A; policy version phải được snapshot vào mỗi lần Luân hồi để audit và replay.
- **Phần bị chặn:** Reset transaction, deletion/ledger reconciliation và projection sau Luân hồi.
- **Câu trả lời của chủ dự án:** Chọn C — dùng retention matrix data-driven, baseline theo phương án A.
- **Kết quả xử lý:** Đã thêm policy `REBIRTH_MVP_V1` revision 1: giữ identity/name, linh căn, Linh Thạch, achievement/cosmetic và `rebirth_count`; reset currency khác, inventory/equipment, learned skill/công pháp, active loadout và tông môn. Sau reset, runtime chỉ bootstrap lại công pháp mặc định `CP_FIRE_HOANG` như invariant bắt buộc để Player hợp lệ; đây không phải retention của công pháp đời trước. Reset transaction vẫn đang triển khai.
- **Trạng thái:** RESOLVED
---

## Q-PROGRESSION-004 — Công thức tăng base stat cho Luân hồi vô hạn

- **Bối cảnh:** Chủ dự án yêu cầu Luân hồi không giới hạn và tăng base stat trước Effect/Equipment. Linear/exponential multiplier không cap có thể vượt integer/database hoặc phá cân bằng sau nhiều đời.
- **Tài liệu/code liên quan:** Realm stage stat formula, `BattleEntityFactory`, Player base HP/ATK/DEF/SPD persistence và numeric policy.
- **Điểm chưa rõ:** Tăng bao nhiêu mỗi lần; áp cho HP/ATK/DEF/SPD giống nhau không; rounding; công thức có diminishing return hay cap; base stat được materialize hay tính từ Realm + rebirth count.
- **Phương án A — Linear 10% mỗi đời:** `FLOOR(realmStageBaseStat × (1 + 0.10 × rebirthCount))` cho HP/ATK/DEF/SPD. Dễ hiểu, tăng vô hạn tuyến tính nhưng số đời lớn vẫn tạo chênh lệch rất cao.
- **Phương án B — Exponential 5% mỗi đời:** `FLOOR(realmStageBaseStat × 1.05^rebirthCount)`. Cảm giác mỗi đời rõ nhưng tăng bùng nổ và không phù hợp Luân hồi không giới hạn.
- **Phương án C — Diminishing theo căn bậc hai:** `FLOOR(realmStageBaseStat × (1 + 0.25 × SQRT(rebirthCount)))`. Không cap cứng, vẫn tăng mãi nhưng tốc độ giảm dần; UI khó giải thích hơn và cần decimal sqrt deterministic.
- **Đề xuất kỹ thuật (chưa áp dụng):** C; materialize `rebirth_count`, còn effective base stat tính deterministic từ Realm/Stage và policy version trước khi áp Effect/Equipment. Không cộng dồn từ stat đời trước để tránh drift.
- **Phần bị chặn:** Numeric policy/migration, stat resolver, Luân hồi service và battle snapshot bonus.
- **Câu trả lời của chủ dự án:** Chọn C — `FLOOR(realmStageBaseStat × (1 + 0.25 × SQRT(rebirthCount)))` cho HP/ATK/DEF/SPD.
- **Kết quả xử lý:** Đã thêm calculator BigInt deterministic, không dùng floating point và không cộng dồn stat đời trước; policy quy định áp trước Effect/Equipment. Migration 016 chuyển base stat sang PostgreSQL `NUMERIC`, thêm `rebirth_count`, policy revision và lịch sử Luân hồi. Việc nối calculator vào breakthrough/battle snapshot còn đang triển khai.
- **Trạng thái:** RESOLVED
---

## Q-CONTENT-003 — Contract gán Skill riêng cho Monster Thiên Môn

- **Bối cảnh:** Thiên Môn đã có Monster/Spawn/Reward foundation. `MonsterGeneratorService` hiện chỉ nhận `attackSkillPool` là tên nguyên tố rồi chọn ngẫu nhiên trong toàn bộ skill cùng hệ; không thể đảm bảo từng quái dùng skill/lore riêng, thậm chí có thể chọn skill phẩm cấp bất kỳ.
- **Tài liệu/code liên quan:** `monster_template.json`, `MonsterGeneratorService.pickSkills()`, attack/defense skill templates và Skill Action spec.
- **Điểm chưa rõ:** Vertical slice có cần skill riêng thật hay tái sử dụng pool nguyên tố; skill assignment explicit trên monster hay qua registry pool; bộ skill baseline và thông số control.
- **Phương án A — Tái sử dụng elemental pool:** không thêm schema/skill; bốn quái dùng random Lightning/Metal skill hiện có. Kích hoạt nhanh nhưng không đạt bản sắc skill riêng và power grade không được khóa.
- **Phương án B — Explicit `skillIds` trên Monster Template:** Generator ưu tiên danh sách ID tường minh, validator kiểm tra reference; thêm `Phong Lôi Trảo` (DAMAGE), `Kim Cương Chấn` (DAMAGE), `Lôi Ngục` (CHAIN_DAMAGE + STUN 20%), `Thiên Môn Kiếm Trận` (DAMAGE + STUN 15%). Rõ ràng cho vertical slice và deterministic pool nhỏ, nhưng template phải lặp ID nếu nhiều quái dùng chung bộ skill.
- **Phương án C — Named Monster Skill Pool registry:** thêm JSON pool có ID, weighted skill entries và optional slot/variant condition; Monster Template chỉ tham chiếu pool. Mở rộng data-driven tốt nhất nhưng cần collection/normalizer/validator/runtime mới trước khi viết content.
- **Đề xuất kỹ thuật (chưa áp dụng):** B cho vertical slice đầu tiên; có thể nâng lên C khi có ít nhất ba nhóm monster thực sự tái sử dụng pool. Không thêm Action type/formula mới.
- **Phần bị chặn:** Skill JSON riêng, Monster explicit assignment, chuyển `THIEN_MON` sang ACTIVE và Discord Exploration map flow.
- **Câu trả lời của chủ dự án:** Chọn B — khai báo `skillIds` tường minh trên Monster Template.
- **Kết quả triển khai:** Đã thêm bốn Skill Thiên Môn với Action ID/order explicit, gán `skillIds` cho từng quái, ưu tiên explicit assignment trong Generator và kiểm tra reference/duplicate trong Validator. `THIEN_MON` đã ACTIVE cho Exploration; `/thamhiem` và `/dungoan` nhận option `map`, xử lý map khóa/inactive. Audit Thiên Môn và schema đều PASS.
- **Trạng thái:** RESOLVED

---

## Q-PROGRESSION-005 — Activity và reward claim đang dở khi Luân hồi

- **Bối cảnh:** Retention baseline yêu cầu xóa progression/loadout và reset Realm trong một transaction. PostgreSQL hiện có `activity_runs` trạng thái `IN_PROGRESS`, Gathering lazy có `ready_at`, activity có thể đã tiêu vé/cooldown ở reserve transaction và reward claim dùng business identity riêng. Luân hồi trong lúc activity đang dở có thể cho battle/reward cấp cao được hoàn tất sau khi Player đã về Luyện Khí.
- **Tài liệu/code liên quan:** migration 009–012, `ActivityRunRepository`, `GatheringService`, `ExplorationService`, `SecretRealmService`, Reward Claim/Activity Progress projection và `Q-ACTIVITY-001/002`.
- **Điểm chưa rõ:** Luân hồi phải chặn, hủy hay settle các activity `IN_PROGRESS`; nếu hủy có hoàn vé/cooldown không; reward đã reserve/roll nhưng chưa apply có còn claim được không; crash-stale activity được xử lý thế nào.
- **Phương án A — Chặn khi còn activity đang dở:** khóa Player rồi kiểm tra không có `activity_runs.status = IN_PROGRESS`; nếu có trả `REBIRTH_ACTIVITY_IN_PROGRESS`, người chơi phải hoàn tất activity trước. Không thay đổi kinh tế/reserve semantics và dễ audit, nhưng stale run cần dùng recovery hiện hữu trước khi Luân hồi.
- **Phương án B — Hủy toàn bộ, không hoàn cost:** cùng transaction đánh dấu run `FAILED` với reason `REBIRTH`, không cho claim về sau và không hoàn vé/cooldown. Luân hồi luôn thực hiện được nhưng người chơi có thể mất cost/reward và cần contract invalidate claim rõ ràng.
- **Phương án C — Settle trước rồi Luân hồi:** hoàn thành/claim toàn bộ activity đủ điều kiện bằng loadout/Realm cũ trong cùng orchestration, sau đó mới reset. Thân thiện người chơi nhưng transaction dài, battle không nên nằm trong DB transaction và replay/crash recovery phức tạp.
- **Ưu/nhược điểm kỹ thuật:** A giữ transaction ngắn và không phát minh refund; B cần cancellation ledger/outbox và policy cost; C cần saga nhiều bước cùng snapshot cũ.
- **Đề xuất kỹ thuật (chưa áp dụng):** A cho MVP; query/lock gate nằm trong transaction Luân hồi để request activity đồng thời không vượt qua sau kiểm tra.
- **Phần bị chặn:** Rebirth transaction service, reset activity projection và slash command Luân hồi.
- **Câu trả lời của chủ dự án:** Chọn A — chặn Luân hồi nếu Player còn bất kỳ activity `IN_PROGRESS` nào.
- **Kết quả triển khai:** `RebirthService` khóa Player trước, kiểm tra/khóa activity `IN_PROGRESS`, rồi mới reset. Mọi activity start/complete cũng dùng lock ordering `Player → Activity Run`, nên request đồng thời không thể lọt qua gate. Slash command trả lỗi rõ khi còn activity; audit runtime PASS.
- **Trạng thái:** RESOLVED
---

## Q-PROGRESSION-006 — Numeric contract cho battle stat Luân hồi không giới hạn

- **Bối cảnh:** Migration 016 và calculator dùng PostgreSQL `NUMERIC`/BigInt string để không mất precision, nhưng `RuntimePlayerFactory`, `BattleEntityFactory`, `FormulaEngine`, HP/shield/damage và metrics hiện chuyển stat sang JavaScript `Number`. Sau đủ nhiều Luân hồi, giá trị vượt `Number.MAX_SAFE_INTEGER` sẽ không còn deterministic chính xác dù database vẫn lưu đúng.
- **Tài liệu/code liên quan:** `RebirthStatCalculator`, migration 016, `RuntimePlayerFactory`, `BattleEntityFactory`, `BattleEntity`, `FormulaEngine`, `StatCalculator` và battle replay/metrics.
- **Điểm chưa rõ:** Battle phải hỗ trợ arbitrary precision thật, dùng decimal library, hay cho phép giới hạn kỹ thuật ở safe integer; UI/leaderboard serialize số lớn theo dạng nào.
- **Phương án A — Fixed-point/BigInt toàn battle:** chuyển stat, formula, modifier, HP/damage/shield và metrics sang integer/fixed-decimal string. Chính xác và đúng “không giới hạn” nhất nhưng là migration lớn toàn combat, đặc biệt với multiplier phần trăm/random variance.
- **Phương án B — Decimal library qua numeric adapter:** dùng decimal arbitrary-precision cho battle math, serialize string tại boundary. Hỗ trợ tỷ lệ/phần trăm dễ hơn BigInt nhưng thêm dependency và cần audit mọi phép toán/so sánh.
- **Phương án C — Number với safe-integer guard:** giữ battle hiện tại; trước materialize/battle, fail-fast khi stat vượt `Number.MAX_SAFE_INTEGER`, không cap gameplay count nhưng người chơi quá ngưỡng không thể battle cho đến khi nâng numeric engine. Ít thay đổi MVP nhưng không thực hiện trọn vẹn “Luân hồi không giới hạn”.
- **Ưu/nhược điểm kỹ thuật:** A ít dependency nhưng scope rewrite lớn; B cân bằng precision và công thức nhưng cần chọn/duyệt thư viện; C nhanh nhưng tạo trần kỹ thuật nhìn thấy được.
- **Đề xuất kỹ thuật (chưa áp dụng):** B cho mục tiêu dài hạn; nếu cần MVP trước thì C chỉ được dùng khi chủ dự án chấp nhận rõ giới hạn kỹ thuật và telemetry cảnh báo.
- **Phần bị chặn:** Đưa `rebirth_count`/base stat mới vào Runtime Player, breakthrough stat materialization, Battle snapshot và công bố Luân hồi production-ready.
- **Câu trả lời của chủ dự án:** Chọn A — chuyển toàn bộ battle stat/math liên quan sang fixed-point/BigInt.
- **Kết quả triển khai:** Battle stat, HP, shield, damage/heal, modifier, formula parser, condition/passive HP%, targeting/turn order, metrics, activity snapshot và Discord HP bar đã chuyển sang fixed-point/BigInt; public boundary dùng decimal-string. Audit số cực lớn và replay deterministic PASS.
- **Trạng thái:** RESOLVED

---

## Q-SPIRITROOT-001 — Reroll hậu Luân hồi và phân cấp Linh Căn động

- **Bối cảnh:** Chủ dự án muốn sau Luân hồi Player có thể reroll Linh Căn, đồng thời mở rộng Linh Căn thành hệ phân cấp có Effect data-driven/dynamic. Yêu cầu này được ghi nhận để xử lý sau khi hoàn tất Luân hồi và numeric battle; chưa thay đổi runtime hiện tại. Hiện registry có 10 Linh Căn, các tier `HEAVENLY/MUTATED/ELEMENTAL/MIXED`, weighted roll tổng 100 và `effectIds` đang rỗng.
- **Tài liệu/code liên quan:** `010_SPIRIT_ROOT_SPEC.md`, `spirit_roots.json`, `PlayerStartService.rollSpiritualRoot()`, `BattleEntityFactory.resolvePlayerDefensiveElement()`, Core Effect/Modifier registry và `REBIRTH_MVP_V1`.
- **Điểm chưa rõ:** Reroll là tự động hay quyền chọn một lần; có được xem trước/giữ Linh Căn cũ không; có cost hoặc pity không; pool/weight có scale theo `rebirth_count` không; tier là rarity, quality hay evolution; Effect áp cho cultivation/battle/drop ở lifecycle nào; Linh Căn đa hệ chọn defensive Element ra sao.
- **Phương án A — Một reroll tùy chọn sau mỗi Luân hồi:** mỗi lần Luân hồi cấp một lượt reroll chưa dùng; Player có thể giữ Linh Căn cũ hoặc roll theo pool data-driven, kết quả mới thay thế vĩnh viễn. Dễ hiểu và không ép mất Linh Căn tốt, nhưng cần entitlement/idempotency và UI xác nhận.
- **Phương án B — Tự động reroll trong transaction Luân hồi:** Linh Căn mới được roll ngay khi reset và snapshot vào lịch sử. Transaction gọn nhưng có thể làm mất build tốt ngoài ý muốn và thay đổi retention baseline hiện tại.
- **Phương án C — Tích lũy điểm/tài nguyên tiến hóa Linh Căn:** Luân hồi cấp currency/point, dùng để reroll, nâng tier hoặc khóa thuộc tính. Có chiều sâu dài hạn nhưng cần economy, pity, sink và progression content riêng.
- **Kiến trúc phân cấp đề xuất (chưa áp dụng):** tách `spiritRootTiers` registry chứa order/rarity/effect budget; template Linh Căn tham chiếu `tierId`, `elementIds`, `effectIds`, `rollPoolId`; pool reroll có weighted entries và predicate theo rebirth/tier. Gameplay chỉ qua Core Effect/Modifier, không hard-code bonus trong Player hoặc Discord command.
- **Đề xuất kỹ thuật (chưa áp dụng):** A cho lượt reroll MVP, kết hợp registry tier/pool data-driven; giữ `SPIRIT_ROOT: KEEP` trong Luân hồi và cấp quyền reroll riêng sau commit để không roll RNG trong reset transaction.
- **Phần bị chặn:** Reroll entitlement/schema/command, tier registry, Effect budget, multi-element selection và balance content.
- **Lịch xử lý:** Luân hồi, confirmation, leaderboard đa đời và numeric battle đã hoàn tất ngày 2026-07-20; hạng mục được mở lại để chốt lựa chọn. Weighted roller dùng chung đã được tách nhưng chưa có entitlement/schema/effect mới.
- **Câu trả lời của chủ dự án:** Chọn A — một entitlement reroll tùy chọn sau mỗi lần Luân hồi; không tự động thay Linh Căn trong reset transaction.
- **Kết quả triển khai:** Migration 018 tạo entitlement unique `(player, rebirth_number)` và roll-history; Luân hồi cấp một lượt AVAILABLE trong transaction. Pool/cutover và consume runtime đã hoàn tất; `/linhcan reroll` dùng preview/confirm owner-only và idempotency.
- **Trạng thái:** RESOLVED
---

## Q-SPIRITROOT-002 — Tách loại hình Linh Căn và phẩm cấp tăng tiến

- **Bối cảnh:** 10 template hiện tại dùng `tier = HEAVENLY/MUTATED/ELEMENTAL/MIXED`. Đây là loại hình/lore và xác suất gốc, không phải một thang chất lượng có thứ tự. Dùng trường này làm “phẩm cấp” sẽ dẫn tới các kết luận không hợp lý như mọi Linh Căn ngũ hành có cùng chất lượng cố định.
- **Tài liệu/code liên quan:** `010_SPIRIT_ROOT_SPEC.md`, `spirit_roots.json`, `normalizeSpiritRoot()`, `GameDataValidator.validateSpiritRoots()` và `BattleEntityFactory.resolvePlayerDefensiveElement()`.
- **Điểm chưa rõ:** Một loại Linh Căn có thể xuất hiện ở nhiều phẩm cấp hay mỗi template chỉ có một cấp cố định; tên trường `tier` hiện tại có được đổi sang `archetype` không; Player lưu template và quality riêng hay tạo ID cho mọi tổ hợp.
- **Phương án A — Tách `archetype` và `qualityTierId`:** migrate `tier` hiện tại thành `archetype`; thêm registry `spiritRootQualityTiers`; Player lưu `spirit_root_id` và `spirit_root_quality_tier_id`. Một template dùng được ở nhiều phẩm cấp. Ít nhân bản content, truy vấn/effect rõ, nhưng cần migration compatibility và resolver ghép hai lớp.
- **Phương án B — Giữ `tier` hiện tại là phẩm cấp:** đặt thứ tự trực tiếp cho HEAVENLY/MUTATED/ELEMENTAL/MIXED. Ít đổi schema, nhưng trộn loại hình với sức mạnh và hạn chế content lâu dài.
- **Phương án C — Mỗi tổ hợp là một template riêng:** tạo ID như `HOA_LINH_CAN_THUONG_PHAM`. Runtime đơn giản, nhưng nhân số template/pool/effect và khó cân bằng hàng loạt.
- **Đề xuất kỹ thuật (chưa áp dụng):** A; dùng tier IDs `LOWER_GRADE/MIDDLE_GRADE/UPPER_GRADE/PEAK_GRADE/IMMORTAL_GRADE`, còn `HEAVENLY/MUTATED/ELEMENTAL/MIXED` chuyển thành archetype.
- **Phần bị chặn:** Tier registry, Player quality column, pool entry theo template+quality và presenter phẩm cấp.
- **Câu trả lời của chủ dự án:** Chọn A — tách archetype và quality tier.
- **Kết quả triển khai:** `tier` cũ được thay bằng `archetype`; thêm registry 5 quality tier và nullable `players.spirit_root_quality_tier_id`. Template hỗ trợ `elementIds` độc lập với quality.
- **Trạng thái:** RESOLVED
---

## Q-SPIRITROOT-003 — Contract Effect tĩnh dùng chung cho Linh Căn

- **Bối cảnh:** Spirit Root đã có `effectIds`, nhưng runtime chưa materialize chúng. Core Effect chủ yếu chạy lifecycle Action; Sect đang dùng `sectPolicy` riêng để biến Effect thành battle/cultivation/breakthrough bonus. Sao chép `spiritRootPolicy` sẽ hoạt động nhanh nhưng làm core Effect phụ thuộc từng domain content.
- **Tài liệu/code liên quan:** `coreEffects`, `modifiers`, `BattleEntityFactory.collectRuntimePlayerEffects()`, `SectEffectResolver` và cultivation/breakthrough Effect hooks.
- **Điểm chưa rõ:** Bonus Linh Căn nên được mô tả bằng contract modifier dùng chung hay policy riêng; áp ở Battle/Cultivation/Breakthrough/Drop nào; quality tier sở hữu effect hay template/archetype sở hữu effect.
- **Phương án A — Generic passive modifier bindings:** Core Effect hỗ trợ danh sách binding data-driven `{ scope, modifierId/value }`; resolver dùng chung materialize Battle/Cultivation/Breakthrough mà không biết nguồn là Linh Căn hay Sect. Modular nhất và giảm policy đặc thù, nhưng cần mở rộng validator/resolver và migrate dần Sect.
- **Phương án B — `spiritRootPolicy` riêng:** làm tương tự `sectPolicy`. Triển khai cô lập nhanh, nhưng mỗi nguồn content lại có adapter/schema riêng và khó tái sử dụng.
- **Phương án C — Chỉ dùng lifecycle Battle Effect hiện tại:** Linh Căn chỉ tác động qua event/action trong combat. Không cần contract modifier mới, nhưng không hỗ trợ bonus tu luyện/đột phá tĩnh như mục tiêu thiết kế.
- **Đề xuất kỹ thuật (chưa áp dụng):** A; tier sở hữu effect sức mạnh chung, archetype/template sở hữu affinity/element effect. Giai đoạn đầu chỉ nối scope đã có use case rõ, không tự thêm drop-rate.
- **Phần bị chặn:** Effect definitions thật, static resolver, nối vào Player cultivation/breakthrough/battle và effect budget.
- **Câu trả lời của chủ dự án:** Chọn A — generic passive modifier bindings.
- **Kết quả triển khai:** Core Effect hỗ trợ/validate `passiveBindings`; `PassiveEffectBindingResolver` materialize modifier theo scope và được `SpiritRootEffectResolver` tái sử dụng. Không thêm policy hard-code riêng cho Linh Căn.
- **Trạng thái:** RESOLVED
---

## Q-SPIRITROOT-004 — Thang phẩm cấp và power budget MVP

- **Bối cảnh:** Sau khi tách phẩm cấp, cần số cấp và bonus cụ thể; nếu thiếu con số thì không thể author Effect data mà không tự cân bằng game. Các stat/bộ số hiện dùng fixed-point và modifier data-driven.
- **Tài liệu/code liên quan:** Attribute/Modifier registry, cultivation multiplier, Battle Stat policy, Rebirth stat bonus và proposed quality tier registry.
- **Điểm chưa rõ:** Có bao nhiêu phẩm; bonus tác động cultivation hay cả battle; các cấp có cộng dồn không; có cap theo Luân hồi không.
- **Phương án A — 5 phẩm cân bằng hỗn hợp:** Hạ/Trung/Thượng/Cực/Tiên; cultivation bonus lần lượt `0/5/10/20/35%`, battle base-stat bonus `0/2/4/7/10%`; không cộng dồn tier, chỉ tier hiện tại có hiệu lực. Progression rõ và đủ dài, nhưng tăng đồng thời hai trục sức mạnh.
- **Phương án B — 5 phẩm chỉ tăng tu luyện:** cultivation `0/5/10/20/35%`, không có generic battle-stat bonus; battle identity đến từ Effect riêng của archetype. Balance combat sạch hơn, nhưng phẩm cấp kém nổi bật trong chiến đấu.
- **Phương án C — Không có bảng global:** mỗi tier/template tự khai báo Effect và budget riêng. Linh hoạt nhất, nhưng khó audit power creep và cần cung cấp từng Effect cụ thể trước khi triển khai.
- **Đề xuất kỹ thuật (chưa áp dụng):** B cho MVP; phẩm cấp điều khiển tốc độ progression, còn bản sắc chiến đấu đến từ nguyên tố/archetype thay vì cộng toàn bộ stat.
- **Phần bị chặn:** Tier JSON, modifier/effect definitions, cultivation resolver và balance audit.
- **Câu trả lời của chủ dự án:** Chọn B — 5 phẩm chỉ tăng tốc độ tu luyện `0/5/10/20/35%`, không cộng battle stat global.
- **Kết quả triển khai:** Registry `LOWER/MIDDLE/UPPER/PEAK/IMMORTAL_GRADE` tham chiếu 4 Core Effect cultivation-only. Runtime materialize đúng một quality; migration 019 đã chốt mọi Player tối thiểu `LOWER_GRADE`.
- **Trạng thái:** RESOLVED
---

## Q-SPIRITROOT-005 — Pool reroll có phụ thuộc số đời Luân hồi

- **Bối cảnh:** Mỗi lần Luân hồi có thể cấp quyền reroll, nhưng pool hiện tại chỉ có weighted template tổng 100 và không có quality. Nếu pool tăng theo `rebirth_count`, Luân hồi trở thành meta-progression mạnh; nếu cố định, người chơi nhiều đời vẫn có thể liên tục nhận phẩm thấp.
- **Tài liệu/code liên quan:** `SpiritRootRoller`, `rebirth_count`, proposed reroll entitlement và quality tier registry.
- **Điểm chưa rõ:** Pool template và quality dùng chung hay tách; số đời có tăng odds/floor không; có pity hoặc khóa lựa chọn cũ không.
- **Phương án A — Pool cố định mọi đời:** mỗi entitlement roll cùng một pool template+quality. Dễ audit và không power creep theo đời, nhưng thiếu cảm giác tiến bộ và variance xấu kéo dài.
- **Phương án B — Pool theo bracket Luân hồi:** registry định nghĩa bracket/predicate theo `rebirth_count`, tăng weight phẩm cao hoặc quality floor ở milestone; template weights vẫn độc lập. Meta-progression rõ và hoàn toàn data-driven, nhưng cần chốt weights/milestones và balance lâu dài.
- **Phương án C — Pool cố định + pity:** mỗi lần không nâng phẩm tăng pity counter, reset khi đạt phẩm cao hơn. Bảo vệ người chơi xui nhưng thêm state, công thức và race/idempotency.
- **Đề xuất kỹ thuật (chưa áp dụng):** B, nhưng chỉ author bracket sau khi có bảng weight cụ thể; schema pool/predicate có thể chuẩn bị độc lập sau khi chọn.
- **Phần bị chặn:** Reroll pool registry, quality roll, pity/milestone state và entitlement consumption transaction.
- **Câu trả lời của chủ dự án:** Chọn B — pool quality theo bracket `rebirth_count`, template weight độc lập.
- **Phần còn thiếu:** Chưa có milestone/weight cụ thể; chuyển sang `Q-SPIRITROOT-007`, không tự author balance.
- **Kết quả triển khai:** `Q-SPIRITROOT-007` đã chốt và registry pool revision 1 materialize toàn bộ bracket/weight theo `rebirth_count`.
- **Trạng thái:** RESOLVED
---

## Q-SPIRITROOT-006 — Linh Căn đa hệ và nguyên tố phòng thủ

- **Bối cảnh:** Battle hiện resolve đúng một `elementId`; template không có hệ trả `NEUTRAL`. Kiến trúc tương lai dự kiến `elementIds`, nhưng relation lookup hiện exact directional và không hỗ trợ tự chọn hệ tốt nhất.
- **Tài liệu/code liên quan:** `BattleEntityFactory.resolvePlayerDefensiveElement()`, Element Relation resolver và Spirit Root template.
- **Điểm chưa rõ:** Linh Căn đa hệ phòng thủ bằng một hệ chủ đạo, luôn Neutral, hay chọn hệ theo đòn đánh; hệ chủ đạo do data author hay người chơi chọn.
- **Phương án A — `elementIds` + `defensiveElementId` explicit:** template có nhiều affinity nhưng author chỉ định một hệ phòng thủ canonical; validator bắt buộc defensive element thuộc danh sách. Deterministic/replay đơn giản, nhưng hệ phụ chưa trực tiếp phòng thủ.
- **Phương án B — Đa hệ luôn `NEUTRAL`:** tránh lợi thế matchup và không sửa resolver, nhưng làm mất bản sắc hệ trong phòng thủ.
- **Phương án C — Dynamic best-match:** mỗi Action chọn hệ phòng thủ có lợi nhất. Mạnh và linh hoạt, nhưng tốn lookup, dễ power creep và cần quy tắc tie-break/ẩn thông tin.
- **Đề xuất kỹ thuật (chưa áp dụng):** A; không cho runtime tự tối ưu matchup.
- **Phần bị chặn:** Migrate `elementId` sang `elementIds`, defensive resolver và Effect affinity đa hệ.
- **Câu trả lời của chủ dự án:** Chọn A — `elementIds` và `defensiveElementId` explicit.
- **Kết quả triển khai:** Spirit Root template/normalizer/validator đã chuyển sang danh sách affinity và hệ phòng thủ canonical; Battle snapshot giữ cả affinity list và chỉ dùng defensive Element explicit cho matchup.
- **Trạng thái:** RESOLVED

---

## Q-SPIRITROOT-007 — Mốc Luân hồi và weight phẩm cấp reroll

- **Bối cảnh:** `Q-SPIRITROOT-005` đã chọn pool theo bracket, nhưng chưa có bảng weight. Template Linh Căn tiếp tục dùng weight 100 hiện hữu; bảng dưới đây chỉ roll quality tier và tổng mỗi bracket bằng 100.
- **Tài liệu/code liên quan:** `SpiritRootRoller`, quality tier registry, `rebirth_count`, entitlement migration 018.
- **Điểm chưa rõ:** Các bracket bắt đầu ở đời nào; weight Hạ/Trung/Thượng/Cực/Tiên; có quality floor hay chỉ thay weight.
- **Phương án A — Curve thận trọng, không hard floor:** đời `1–2: 55/30/12/3/0`; `3–5: 35/35/22/7/1`; `6–9: 20/32/30/15/3`; `10+: 10/22/32/26/10`. Tăng đều, vẫn giữ variance ở late-game; nhưng người nhiều đời vẫn có thể roll Hạ Phẩm.
- **Phương án B — Milestone có hard floor:** đời `1–2: 55/30/12/3/0`; `3–5: 0/55/32/12/1`; `6–9: 0/0/60/34/6`; `10+: 0/0/0/75/25`. Luân hồi luôn tạo tiến bộ rõ, nhưng power inflation nhanh và giảm giá trị variance.
- **Phương án C — Curve mềm hơn:** đời `1–4: 65/25/8/2/0`; `5–9: 45/32/17/5/1`; `10–19: 25/35/27/11/2`; `20+: 15/28/32/20/5`. Tuổi thọ dài hơn, nhưng Tiên Phẩm rất hiếm và progression có thể chậm.
- **Đề xuất kỹ thuật (chưa áp dụng):** A; toàn bộ bracket/entry là JSON, resolver chọn bracket cao nhất có `minRebirthCount <= count`; không hard-code milestone trong service.
- **Phần bị chặn:** Reroll pool JSON, quality roller, entitlement consumption và `/linhcan reroll`.
- **Câu trả lời của chủ dự án:** Chọn A — curve thận trọng, không hard floor.
- **Kết quả triển khai:** Registry `SPIRIT_ROOT_REBIRTH_QUALITY_V1` revision 1 có đủ bốn bracket liên tục và weight đúng `55/30/12/3/0`, `35/35/22/7/1`, `20/32/30/15/3`, `10/22/32/26/10`. Quality roller resolve bracket bằng integer-string/BigInt.
- **Trạng thái:** RESOLVED
---

## Q-SPIRITROOT-008 — Quality khởi tạo cho Player mới và backfill Player hiện hữu

- **Bối cảnh:** Quality column được để nullable để không tự thay balance. Trước khi mở runtime reroll, Player mới và dữ liệu cũ cần policy canonical; migration không được random vì phải deterministic/retry-safe.
- **Tài liệu/code liên quan:** `PlayerStartService`, migration 018, 10 Spirit Root hiện hữu và quality tier registry.
- **Điểm chưa rõ:** Player mới có roll quality ngay khi `/start` hay bắt đầu Hạ Phẩm; Player hiện hữu/backfill nhận phẩm nào; có cấp entitlement bù cho các lần Luân hồi cũ không.
- **Phương án A — Tất cả khởi tạo Hạ Phẩm:** Player mới và backfill đều `LOWER_GRADE`; không cấp entitlement hồi tố. Công bằng/deterministic và Luân hồi là nguồn nâng phẩm duy nhất, nhưng người cũ có Linh Căn hiếm vẫn bắt đầu quality thấp.
- **Phương án B — Player mới roll pool đời 0, backfill Trung Phẩm:** người mới có variance ngay từ đầu, người cũ nhận baseline an toàn; nhưng hai cohort khác rule và migration ưu ái dữ liệu cũ.
- **Phương án C — Hạ Phẩm + entitlement hồi tố tối đa một lượt:** mọi Player Hạ Phẩm; ai có `rebirth_count > 0` nhận đúng một entitlement AVAILABLE đại diện lịch sử, không cấp đủ N lượt. Giảm thiệt cho người cũ nhưng thêm backfill business rule.
- **Đề xuất kỹ thuật (chưa áp dụng):** C; deterministic, không tạo hàng loạt N entitlement cho số đời lớn và vẫn ghi nhận progression cũ.
- **Phần bị chặn:** NOT NULL/default cutover, `/start` quality, entitlement backfill và mở command reroll.
- **Câu trả lời của chủ dự án:** Chọn C — mọi Player Hạ Phẩm; Player cũ có Luân hồi nhận tối đa một entitlement hồi tố.
- **Kết quả triển khai:** Migration 019 backfill/default/NOT NULL `LOWER_GRADE`, insert conflict-safe một row tại `rebirth_count` hiện tại nếu count > 0; `/start` ghi và trả Hạ Phẩm explicit.
- **Trạng thái:** RESOLVED

---

## Q-SPIRITROOT-009 — Bracket áp cho entitlement tích lũy

- **Bối cảnh:** Entitlement gắn `rebirth_number` và có thể tích lũy nếu người chơi không dùng ngay. Pool quality thay đổi theo số đời, nên một lượt được cấp ở đời 1 nhưng dùng tại đời 10 có thể dùng odds đời 1 hoặc đời 10; quyết định này ảnh hưởng mạnh tới hành vi giữ lượt.
- **Tài liệu/code liên quan:** migration 018/019, `SPIRIT_ROOT_REBIRTH_QUALITY_V1`, quality roller và reroll transaction sắp triển khai.
- **Điểm chưa rõ:** Pool được snapshot theo đời cấp hay resolve theo đời hiện tại lúc consume; entitlement cũ được chọn theo thứ tự nào; entitlement có hết hạn khi Luân hồi tiếp không.
- **Phương án A — Grant-time bracket, oldest-first:** dùng `entitlement.rebirth_number`, khóa/consume row AVAILABLE nhỏ nhất trước. Odds không đổi theo thời gian và chống tích lượt chờ bracket tốt; nhưng lượt cũ có odds thấp dù người chơi đã tiến xa.
- **Phương án B — Current-cycle bracket:** mọi lượt dùng `players.rebirth_count` lúc consume, oldest-first chỉ để audit. Thân thiện với người giữ lượt, nhưng tạo chiến lược hoard entitlement để hưởng odds late-game.
- **Phương án C — Chỉ giữ lượt mới nhất:** khi Luân hồi mới, entitlement AVAILABLE cũ hết hiệu lực hoặc bị thay thế. Không hoard và luôn dùng current bracket, nhưng phá semantics “mỗi đời một lượt” và cần trạng thái EXPIRED.
- **Đề xuất kỹ thuật (chưa áp dụng):** A; entitlement là quyền đã snapshot tại lần Luân hồi tạo ra nó, không thay đổi value theo thời điểm sử dụng.
- **Phần bị chặn:** Query lock entitlement, pool selection, roll snapshot và consume transaction.
- **Câu trả lời của chủ dự án:** Chọn A — grant-time bracket, consume oldest-first.
- **Kết quả triển khai:** Repository khóa Player trước, sau đó chọn entitlement AVAILABLE theo `rebirth_number ASC, id ASC FOR UPDATE`; quality pool dùng chính `entitlement.rebirth_number`. Confirm bắt buộc `expectedEntitlementId` để request đồng thời từ cùng preview không thể tiêu lượt kế tiếp.
- **Trạng thái:** RESOLVED
---

## Q-SPIRITROOT-010 — Kết quả reroll trùng tổ hợp hiện tại

- **Bối cảnh:** Template và quality được roll độc lập; kết quả có thể trùng đúng cả `spirit_root_id + quality_tier_id` hiện tại. Cần chốt việc lượt có bị tiêu khi không có thay đổi quan sát được.
- **Tài liệu/code liên quan:** Spirit Root template weights, quality bracket weights, entitlement và roll-history.
- **Điểm chưa rõ:** Chấp nhận kết quả trùng, roll lại tự động, hay bảo vệ không giảm phẩm; số lần retry và persisted roll snapshot.
- **Phương án A — Chấp nhận và tiêu lượt:** mọi kết quả hợp lệ được commit kể cả trùng. Xác suất thuần túy/audit đơn giản, nhưng trải nghiệm rất tệ khi entitlement hiếm không tạo thay đổi.
- **Phương án B — Reroll deterministic đến khi khác đúng tổ hợp:** tiếp tục lấy cặp RNG kế tiếp nếu cả template và quality cùng trùng, giới hạn fail-safe theo số tổ hợp; snapshot toàn bộ rejected draws. Đảm bảo có thay đổi nhưng làm phân phối có điều kiện lệch nhẹ.
- **Phương án C — Chỉ nhận nếu quality không giảm:** giữ template/quality cũ nếu kết quả thấp hơn, có thể chỉ đổi archetype cùng cấp. Biến reroll thành upgrade protection mạnh và thay đổi lớn balance đã chọn.
- **Đề xuất kỹ thuật (chưa áp dụng):** B; chỉ bảo vệ exact duplicate, vẫn cho kết quả phẩm thấp hơn và công khai cảnh báo trước confirm.
- **Phần bị chặn:** Vòng roll canonical, snapshot rejected draws, presenter kết quả và audit distribution.
- **Câu trả lời của chủ dự án:** Chọn B — seeded reroll đến khi khác đúng tổ hợp.
- **Kết quả triển khai:** Template và quality dùng chung seeded RNG stream; exact duplicate lấy cặp kế tiếp, tối đa `positiveTemplateCount × positiveQualityCount`. Snapshot lưu seed, bracket, accepted draw và toàn bộ rejected draws; exhaustion ném lỗi để rollback entitlement/state.
- **Trạng thái:** RESOLVED
---

## Q-SPIRITROOT-011 — Bản sắc Effect chiến đấu của từng loại Linh Căn

- **Bối cảnh:** Reroll, quality, persistence và bonus tu luyện theo phẩm cấp đã hoàn tất. Tuy nhiên cả 10 template Linh Căn vẫn có `effectIds: []`; vì vậy Kim/Mộc/Thủy/Hỏa/Thổ/Băng/Lôi/Phong/Thiên/Tạp hiện chỉ khác tỷ lệ roll và affinity nguyên tố, chưa có bản sắc chỉ số. `Q-SPIRITROOT-004` đã chốt quality chỉ tăng tu luyện, còn battle identity phải đến từ Effect riêng của template/archetype.
- **Tài liệu/code liên quan:** `010_SPIRIT_ROOT_SPEC.md`, `spirit_roots.json`, `spirit_root_effects.json`, Modifier registry, `SpiritRootEffectResolver`, `BattleEntityFactory`, `/linhcan` và field thuộc tính cộng thêm `/nhanvat`.
- **Điểm chưa rõ:** Mỗi loại Linh Căn tăng stat nào và bao nhiêu; Effect template có cố định ở mọi phẩm hay scale theo phẩm cấp; Thiên Linh Căn/Tạp Căn dùng identity nào; có dùng mechanic nguyên tố đặc thù hay chỉ static modifier MVP.
- **Phương án A — Một static battle identity cố định mỗi template (đề xuất MVP):** quality vẫn chỉ tăng tu luyện; mỗi template có đúng một passive binding `ENTITY`, độc lập quality. Bảng đề xuất để chủ dự án duyệt/chỉnh: Kim `PEN +10`, Mộc `HP +10%`, Thủy `Kháng khống chế +10`, Hỏa `ATK +10%`, Thổ `DEF +10%`, Băng `Tỷ lệ khống chế +10`, Lôi `Chí mạng +10`, Phong `SPD +10%`, Thiên `Sát thương kỹ năng +10%`, Tạp `May mắn +20`. Dễ hiểu, dùng primitive hiện có và không làm quality tăng sức mạnh chiến đấu; cần cân bằng riêng vì stat không cùng giá trị thực tế.
- **Phương án B — Identity scale theo phẩm cấp:** cùng identity như A nhưng binding value nhân theo Hạ/Trung/Thượng/Cực/Tiên. Phẩm cấp có cảm giác mạnh trong combat, nhưng thay đổi quyết định “quality chỉ tăng tu luyện” và tạo trục power creep thứ hai.
- **Phương án C — Chỉ giữ affinity, chưa thêm battle modifier:** quality tiếp tục tăng tu luyện; template chỉ quyết định affinity/defensive element. Cân bằng sạch và không thêm số, nhưng các Linh Căn cùng quan hệ neutral gần như không có khác biệt gameplay.
- **Ưu/nhược điểm kỹ thuật:** A chỉ cần thêm Effect JSON và reference; B cần contract/bảng coefficient mới cùng audit power budget; C không cần content nhưng chưa đạt mục tiêu Effect động cho từng loại.
- **Đề xuất kỹ thuật (chưa áp dụng):** A. Dùng Core Effect `passiveBindings` scope `ENTITY`, không hard-code trong Player/Battle/Discord. Giữ Effect phẩm cấp ở scope `CULTIVATION`; hai lớp được resolve độc lập và tổng hợp khi hiển thị.
- **Phần bị chặn:** Mười Effect battle identity, các modifier mới nếu đổi bảng, reference `effectIds` và balance combat tương ứng. Generic resolver theo scope, kết nối Battle/UI và metadata Phong hệ không phụ thuộc bảng số nên vẫn tiếp tục.
- **Câu trả lời mới của chủ dự án:** Không dùng bảng static stat đề xuất làm hướng chính. Linh Căn được chia loại và 8 phẩm; phẩm cấp tăng tốc tu luyện và tăng sát thương kỹ năng nguyên tố khi nguyên tố kỹ năng trùng affinity Linh Căn.
- **Kết quả xử lý:** Hướng battle identity được chuyển sang affinity-matching theo phẩm cấp. Nội dung/runtime phụ thuộc bảng bonus, odds và damage-scope được tách sang `Q-SPIRITROOT-012..014`; chưa áp con số hoặc thay GameData hiện hành.
- **Kết quả triển khai bổ sung:** Quality battle identity đã chuyển hoàn toàn sang ACTION Effect cùng affinity theo `Q-SPIRITROOT-012..014`; không áp bảng static PEN/HP/ATK đề xuất ban đầu.
- **Trạng thái:** RESOLVED
---

## Q-SPIRITROOT-012 — Power budget cho 8 phẩm Linh Căn

- **Bối cảnh:** Chủ dự án chốt thang `Hạ → Trung → Thượng → Cực → Thiên → Thánh → Tiên → Thần`, mỗi phẩm tăng tốc tu luyện và sát thương kỹ năng cùng nguyên tố. Runtime hiện có 5 phẩm Hạ/Trung/Thượng/Cực/Tiên với cultivation `0/5/10/20/35%`; chưa có ba tier mới hoặc elemental-damage modifier.
- **Tài liệu/code liên quan:** `spirit_root_quality_tiers.json`, `spirit_root_effects.json`, `010_SPIRIT_ROOT_SPEC.md`, Modifier/Effect registry, `SpiritRootEffectResolver` và battle formula pipeline.
- **Điểm chưa rõ:** Phần trăm cultivation và matching-element damage của từng phẩm; Hạ Phẩm có bonus hay không; bonus damage được biểu diễn dạng percentage-point/additive hay multiplier độc lập; có cap không.
- **Phương án A — Curve tương thích hiện hữu (đề xuất):** giữ nguyên cultivation của bốn tier đầu và Tiên hiện hữu, chèn Thiên/Thánh ở giữa: Hạ `0%/0%`, Trung `5%/2%`, Thượng `10%/4%`, Cực `20%/7%`, Thiên `25%/10%`, Thánh `30%/14%`, Tiên `35%/18%`, Thần `50%/25%` theo thứ tự `cultivation/matching damage`. Ít làm lệch Player hiện hữu và tăng trưởng thận trọng; Thần Phẩm chưa quá áp đảo.
- **Phương án B — Curve tăng mạnh late-game:** Hạ `0%/0%`, Trung `5%/3%`, Thượng `10%/6%`, Cực `20%/10%`, Thiên `35%/15%`, Thánh `55%/22%`, Tiên `80%/30%`, Thần `120%/40%`. Cảm giác phẩm cao rõ, nhưng power creep và tốc độ vòng Luân hồi tăng mạnh.
- **Phương án C — Chủ dự án cung cấp bảng riêng:** khai báo đủ 8 cặp phần trăm; phù hợp nếu đã có mục tiêu thời gian Luân hồi/DPS cụ thể.
- **Ưu/nhược điểm kỹ thuật:** A giữ compatibility tốt nhất; B tạo late-game rõ nhưng cần rebalance Realm/map; C chính xác theo design nhưng cần đủ số trước khi author JSON.
- **Đề xuất kỹ thuật (chưa áp dụng):** A. Giữ stable ID hiện hữu; thêm `HEAVENLY_GRADE`, `SAINT_GRADE`, `DIVINE_GRADE`, đổi order `IMMORTAL_GRADE` thành 7. Mọi bonus đi qua Effect/Modifier data, không hard-code theo order.
- **Phần bị chặn:** Registry 8 phẩm, Effect/Modifier tương ứng, UI mô tả và migration/content revision nếu cần.
- **Câu trả lời của chủ dự án:** Chọn A — curve tương thích hiện hữu.
- **Kết quả triển khai:** Registry có đủ 8 tier stable ID/order. Quality Effect dùng cultivation `0/5/10/20/25/30/35/50%` và matching damage `0/2/4/7/10/14/18/25%` qua Modifier + passive binding; không hard-code theo order.
- **Trạng thái:** RESOLVED
---

## Q-SPIRITROOT-013 — Xác suất 8 phẩm theo số lần Luân hồi

- **Bối cảnh:** Chủ dự án yêu cầu xác suất phẩm dựa trên số lần Luân hồi. Pool hiện có bốn bracket cho 5 phẩm và entitlement dùng grant-time bracket, oldest-first; mở rộng lên 8 phẩm cần bảng weight mới, mỗi bracket phải tổng 100.
- **Tài liệu/code liên quan:** `spirit_root_reroll_pools.json`, `SpiritRootQualityRoller`, entitlement/reroll snapshot và `Q-SPIRITROOT-005/007/009`.
- **Điểm chưa rõ:** Mốc Luân hồi mới; weight của 8 phẩm; có hard floor hay vẫn cho ra Hạ Phẩm ở late-game; Thần Phẩm bắt đầu xuất hiện từ đời nào.
- **Phương án A — Curve thận trọng, không hard floor (đề xuất):** theo thứ tự Hạ/Trung/Thượng/Cực/Thiên/Thánh/Tiên/Thần: đời `1–2 = 55/30/12/3/0/0/0/0`; `3–5 = 35/35/22/7/1/0/0/0`; `6–9 = 20/32/30/15/2/1/0/0`; `10–19 = 10/22/32/24/8/3/1/0`; `20–39 = 5/15/28/27/15/7/3/0`; `40+ = 2/8/18/27/22/14/7/2`. Giữ variance và chống power inflation; Thần Phẩm chỉ có từ đời 40.
- **Phương án B — Milestone có hard floor:** từ đời 10 loại Hạ, đời 20 loại cả Hạ/Trung, đời 40 chỉ roll Cực trở lên và Thần Phẩm 5–10%. Tiến bộ rõ hơn nhưng phá policy không-hard-floor cũ và làm phẩm cao phổ biến nhanh.
- **Phương án C — Chủ dự án cung cấp bracket/weight riêng:** mỗi bracket cần `min/max rebirth` và đủ 8 weight tổng 100.
- **Ưu/nhược điểm kỹ thuật:** A tương thích semantics hiện tại và entitlement snapshot; B thân thiện progression nhưng inflation lớn; C cho phép khớp mục tiêu vòng đời game.
- **Đề xuất kỹ thuật (chưa áp dụng):** A; giữ grant-time bracket/oldest-first và seeded snapshot hiện tại, chỉ nâng revision pool.
- **Phần bị chặn:** Pool revision mới, quality roller audit boundaries, odds UI và reroll distribution.
- **Câu trả lời của chủ dự án:** Chọn A — curve thận trọng, không hard floor.
- **Kết quả triển khai:** Pool revision 2 có sáu bracket liên tục 1–2/3–5/6–9/10–19/20–39/40+, mỗi bracket đủ 8 tier và tổng weight 100. Grant-time bracket, oldest-first, seeded roll và exact-duplicate rejection giữ nguyên.
- **Trạng thái:** RESOLVED
---

## Q-SPIRITROOT-014 — Phạm vi và thứ tự bonus sát thương cùng nguyên tố

- **Bối cảnh:** Action đã có Element và Battle pipeline resolve offensive Element theo `action → effect → skill`; Element Relation modifier được tạo trong action scope trước khi Formula chạy. Tuy nhiên một Skill có thể có nhiều Action, DOT/effect phát sinh hoặc formula riêng không dùng `SKD`, nên “tăng sát thương kỹ năng nguyên tố” cần contract chính xác.
- **Tài liệu/code liên quan:** `BattleActionPipeline`, `ActionScopedElementEffectEngine`, `ActionExecutor`, `FormulaEngine`, Skill/Action Element và battle replay.
- **Điểm chưa rõ:** Bonus áp cho direct DAMAGE/CHAIN_DAMAGE hay cả DOT/effect phát sinh; xét Element của Skill hay từng Action; multi-element Linh Căn match ra sao; NEUTRAL có được bonus; bonus cộng với `SKD` hay nhân hậu Formula; thứ tự với sinh/khắc và chí mạng.
- **Phương án A — Direct elemental Skill Action, multiplier hậu Formula (đề xuất):** chỉ áp khi có `payload.skill`, Action là `DAMAGE/CHAIN_DAMAGE`, offensive Element khác NEUTRAL và nằm trong `spiritRootElementIds`; xét riêng từng Action. Formula (gồm stat/SKD/element relation hiện tại) chạy trước, sau đó nhân matching bonus một lần trước khi trừ HP/khiên. Basic attack, DOT/status và supplemental Effect không được hưởng. Deterministic, áp được cho mọi formula; effect phát sinh chưa hưởng bonus.
- **Phương án B — Toàn bộ causal damage của Skill:** direct damage, DOT, chain và supplemental Effect cùng Element đều hưởng bonus theo causal chain. Đúng cảm giác build nguyên tố hơn nhưng cần truyền origin Skill/Element qua Effect lifecycle, chống double-apply và snapshot causal metadata.
- **Phương án C — Cộng vào action-scoped `SKD`:** khi match, cộng percentage-point vào stat Skill Damage trước Formula. Tận dụng stat hiện hữu nhưng các formula không tham chiếu `SKD` sẽ không được hưởng, tạo hành vi không đồng nhất.
- **Ưu/nhược điểm kỹ thuật:** A nhỏ, rõ và replay-safe; B đầy đủ nhưng thay pipeline sâu; C đơn giản nhưng phụ thuộc cách author Formula.
- **Đề xuất kỹ thuật (chưa áp dụng):** A cho MVP; multi-element match bất kỳ affinity, NEUTRAL không match, mỗi Action chỉ áp một lần dù root có duplicate affinity. Lưu applied multiplier/quality/element trong execution result để replay/audit.
- **Phần bị chặn:** Affinity damage resolver, action execution multiplier, battle event/snapshot và integration audit.
- **Câu trả lời của chủ dự án:** Chọn A — direct elemental Skill Action, multiplier hậu Formula.
- **Kết quả triển khai:** Battle chỉ áp cho direct `DAMAGE/CHAIN_DAMAGE` có Skill và Element khác NEUTRAL khớp bất kỳ affinity. Bonus nhân hậu Formula đúng một lần trước khi trừ HP/khiên; basic/mismatch/NEUTRAL/DOT/supplemental không nhận. Result, ExecutionContext và event lưu snapshot multiplier để replay/audit.
- **Trạng thái:** RESOLVED
---

## Q-SPIRITROOT-015 — Xác suất phẩm cấp Linh Căn khi `/start`

- **Bối cảnh:** Chủ dự án yêu cầu `/start` random cả loại và phẩm cấp Linh Căn, thay cho việc mọi Player mới nhận `LOWER_GRADE`. Loại Linh Căn đã roll theo `spirit_roots.json`, nhưng pool phẩm cấp hiện chỉ có bracket từ Luân hồi 1 trở lên; Player mới có `rebirthCount = 0` nên chưa có bảng tỷ lệ hợp lệ.
- **Tài liệu/code liên quan:** `PlayerStartService`, `SpiritRootQualityRoller`, `spirit_root_reroll_pools.json`, `Q-SPIRITROOT-008` và `Q-SPIRITROOT-013`.
- **Điểm chưa rõ:** Tỷ lệ tám phẩm tại Luân hồi 0 là bao nhiêu; Player mới có được roll Thiên/Thánh/Tiên/Thần Phẩm hay không; bảng `/start` dùng chung hay độc lập với reroll hậu Luân hồi.
- **Phương án A — Thêm bracket Luân hồi 0 dùng curve khởi đầu (đề xuất):** thêm `REBIRTH_0_START` với `55/30/12/3/0/0/0/0%` cho Hạ/Trung/Thượng/Cực/Thiên/Thánh/Tiên/Thần, rồi `/start` gọi chung `SpiritRootQualityRoller`. Không nhân đôi thuật toán, tỷ lệ khởi đầu thận trọng và tiếp nối bracket đời 1–2; đổi pool revision có thể ảnh hưởng snapshot/config audit.
- **Phương án B — Tạo pool phẩm cấp `/start` riêng:** chủ dự án cung cấp tám weight riêng. Cân bằng tân thủ độc lập và dễ thay đổi mà không đụng reroll; có thêm một registry/pool cần duy trì.
- **Phương án C — Đồng xác suất tám phẩm:** mỗi phẩm 12.5%. Dễ hiểu nhưng làm phẩm hiếm xuất hiện quá thường xuyên, phá ý nghĩa các mốc Luân hồi và không phù hợp rarity hiện tại.
- **Ưu/nhược điểm kỹ thuật:** A tái sử dụng hoàn toàn resolver/validator hiện có và giữ một nguồn xác suất; B tách đúng domain nhưng tăng cấu hình; C đơn giản nhưng rủi ro balance rất lớn.
- **Đề xuất kỹ thuật (chưa áp dụng):** A; roll loại và phẩm cấp bằng hai lần RNG độc lập, persist cả hai trong cùng transaction tạo Player, trả đúng quality đã roll trên embed `/start`.
- **Phần bị chặn:** Thay constant `STARTER_SPIRIT_ROOT_QUALITY_TIER_ID`, bổ sung bracket/pool, cập nhật starter audit và triển khai random phẩm cấp thật.
- **Câu trả lời của chủ dự án:** Chọn A — thêm bracket Luân hồi 0 với tỷ lệ `55/30/12/3/0/0/0/0%` và dùng chung quality roller.
- **Kết quả triển khai:** Pool revision 3 có bracket `REBIRTH_0_START`; `/start` roll độc lập loại và phẩm cấp, persist quality đã chọn trong cùng transaction tạo Player và hiển thị đúng kết quả. Player cũ/backfill không bị reroll.
- **Trạng thái:** RESOLVED
---

## Q-PROGRESSION-007 — Scale, rounding và RNG cho fixed-point battle

- **Bối cảnh:** `Q-PROGRESSION-006` đã chọn fixed-point/BigInt toàn battle. Battle hiện có stat nguyên, percentage-point, multiplier thập phân, crit multiplier, penetration, chain multiplier, random variance và một số công thức làm tròn `Math.floor`. Chuyển sang BigInt cần scale và quy tắc làm tròn canonical để replay không phụ thuộc cách từng executor tự xử lý.
- **Tài liệu/code liên quan:** `FormulaEngine`, `StatCalculator`, `BattleStatPolicy`, `BattleEntity`, `ActionExecutor`, Action-scoped modifier, battle metrics/replay và modifier/formula JSON.
- **Điểm chưa rõ:** fixed-point dùng bao nhiêu chữ số thập phân; phép nhân/chia làm tròn ở mỗi bước hay chỉ output boundary; số âm làm tròn thế nào; random float được quantize ra sao; event/API serialize raw fixed hay integer display.
- **Phương án A — Scale 10^6 canonical:** coefficient/percentage/variance dùng 6 chữ số thập phân; nhân/chia truncate toward zero ở intermediate boundary, combat amount không âm dùng `FLOOR`; RNG seeded được quantize thành integer `[0, 999999]`; stat/HP/damage event serialize decimal-string theo đơn vị gameplay. Precision tốt và khớp numeric policy cultivation, nhưng BigInt lớn hơn và cần helper format/parser chuẩn.
- **Phương án B — Scale 10^4 canonical:** tương tự A nhưng 4 chữ số thập phân. Nhẹ hơn và đủ cho phần trăm phổ biến, nhưng mất precision sớm hơn với chuỗi modifier/variance.
- **Phương án C — Rational không scale toàn cục:** giữ numerator/denominator BigInt qua toàn pipeline, chỉ floor ở output. Chính xác nhất nhưng object/event phức tạp, denominator tăng nhanh và khó tương tác với data/UI.
- **Ưu/nhược điểm kỹ thuật:** A có contract thống nhất và precision cao; B đơn giản hơn nhưng thay đổi balance ở số rất nhỏ; C tránh quantization nhưng tăng đáng kể độ phức tạp/runtime cost.
- **Đề xuất kỹ thuật (chưa áp dụng):** A; dùng shared `BattleFixed` adapter, không expose raw scaled integer ra Discord/application boundary và audit parity với battle hiện tại trên seed cố định trước cutover.
- **Phần bị chặn:** Numeric adapter, Formula/Stat/Entity/Effect migration, battle replay BigInt và nối stat Luân hồi vào breakthrough/battle.
- **Câu trả lời của chủ dự án:** Chọn A — scale `10^6`, truncate toward zero ở intermediate, floor combat amount không âm và quantize RNG `[0, 999999]`.
- **Kết quả triển khai:** Thêm shared `BattleFixed`, expression evaluator không dùng `new Function`, Battle Stat calculator và audit arbitrary-precision. Số lớn `900719925474099312345678901234567890` giữ chính xác qua modifier, damage, HP mutation, turn order và JSON serialization.
- **Trạng thái:** RESOLVED

---

## Q-PROGRESSION-008 — Thứ tự Cultivation Leaderboard khi có nhiều đời Luân hồi

- **Bối cảnh:** Cultivation Leaderboard hiện xếp theo Realm/Stage/Cultivation của đời hiện tại. Luân hồi đưa Player từ Realm cuối về Luyện Khí nhưng tăng `rebirth_count`; nếu giữ sort cũ, người vừa Luân hồi sẽ rơi xuống dưới người chưa Luân hồi dù lifetime progression cao hơn.
- **Tài liệu/code liên quan:** migration 015/016, `CultivationLeaderboardRepository`, `CultivationLeaderboardService`, `/bangxephang` và `REBIRTH_MVP_V1`.
- **Điểm chưa rõ:** Leaderboard ưu tiên số đời hay tiến độ đời hiện tại; hiển thị `rebirth_count` ra sao; cursor/snapshot ordering cần canonical tie-break nào.
- **Phương án A — Luân hồi ưu tiên:** `rebirth_count DESC → realm_order DESC → stage DESC → cultivation DESC → player_id ASC`. Phản ánh lifetime progression rõ và keyset dễ mở rộng, nhưng người nhiều đời gần như luôn đứng trên người ít đời.
- **Phương án B — Tiến độ đời hiện tại ưu tiên:** giữ Realm/Stage/Cultivation trước, `rebirth_count` chỉ tie-break. Cạnh tranh vòng hiện tại tốt hơn nhưng tạo động lực trì hoãn Luân hồi để giữ hạng.
- **Phương án C — Hai bảng riêng:** một bảng Lifetime ưu tiên rebirth và một bảng Current Cycle ưu tiên Realm. Rõ nhất nhưng tăng command UI, refresh/query/snapshot và pagination contract.
- **Đề xuất kỹ thuật (chưa áp dụng):** A cho leaderboard mặc định MVP; snapshot thêm count dạng decimal-string, keyset cursor thêm count và audit pagination qua ranh giới đời.
- **Phần bị chặn:** Migration leaderboard projection v2, refresh ordering, cursor, presenter và hiển thị đời.
- **Câu trả lời của chủ dự án:** Chọn A — Luân hồi ưu tiên; sau đó Realm, Stage, Cultivation và Player ID.
- **Kết quả triển khai:** Migration 017 thêm `rebirth_count NUMERIC` vào top-100 projection; refresh xếp `rebirth_count DESC → realm_order DESC → stage DESC → cultivation DESC → player_id ASC`. Public projection và `/bangxephang` hiển thị số đời. Keyset tiếp tục dùng `rank + player_id` vì rank là khóa ổn định đã materialize trong snapshot 5 phút, không encode số lớn vào cursor.
- **Trạng thái:** RESOLVED
---

## Q-PROGRESSION-009 — Xác nhận thao tác Luân hồi phá hủy progression

- **Bối cảnh:** `/luanhoi` xóa inventory/equipment/skill/công pháp/tông môn và currency khác trong một transaction. Service/idempotency đã hoàn tất nhưng gọi nhầm slash command có hậu quả không thể đảo ngược ngoài khôi phục backup.
- **Tài liệu/code liên quan:** `LuanHoiCommand`, `RebirthService`, Discord Component Session và retention matrix.
- **Điểm chưa rõ:** Có cần preview/xác nhận hay slash invocation là đủ; confirmation tồn tại bao lâu; request đồng thời/stale preview xử lý thế nào.
- **Phương án A — Button xác nhận có snapshot:** `/luanhoi` trả preview reset và hai nút Xác nhận/Hủy, owner-only, TTL 2 phút; confirm gửi `expectedRebirthCount`/preview identity và service tái kiểm tra toàn bộ eligibility. An toàn và thân thiện nhất nhưng thêm component session.
- **Phương án B — Boolean option bắt buộc:** `/luanhoi xacnhan:true`; đơn giản, không giữ session nhưng preview kém trực quan và vẫn dễ bấm nhầm.
- **Phương án C — Thực hiện ngay:** invocation gọi service trực tiếp. Ít bước nhất nhưng rủi ro mất progression ngoài ý muốn cao.
- **Đề xuất kỹ thuật (chưa áp dụng):** A; operation ID của confirm interaction là idempotency key, preview không reserve/mutate gì, confirm stale phải tải lại preview thay vì tự thực hiện.
- **Phần bị chặn:** Mở `rebirthCommandEnabled` production và Discord confirmation presenter. Core service/repository không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn A — preview và button xác nhận owner-only, TTL 2 phút.
- **Kết quả triển khai:** `/luanhoi` trả ephemeral preview nêu rõ dữ liệu xóa/giữ và stat đời mới, có nút Danger/Hủy. Preview chỉ đọc; confirm dùng interaction ID làm idempotency key, gửi `expectedRebirthCount`, rồi core khóa Player và tái kiểm tra eligibility/activity. Preview stale không reset dữ liệu và được tải lại; timeout/hủy loại bỏ button. Command đã được mở, không còn feature gate tạm thời.
- **Trạng thái:** RESOLVED
---

## Q-PROGRESSION-010 — Đường cong tăng base stat qua từng tầng và đại cảnh giới

- **Bối cảnh:** Chủ dự án báo đột phá không tăng chỉ số. Runtime vẫn persist `newStats`, nhưng công thức đã khóa là `FLOOR(initial × growthPerStage^(stage-1))`. Luyện Khí đang đặt toàn bộ stat `growthPerStage = 1.0`, nên tầng 1–10 không tăng. Từ Trúc Cơ, HP/ATK/DEF đặt `1.5`, khiến tầng 10 lớn khoảng 38 lần tầng 1 rồi giảm mạnh khi sang cảnh giới tiếp theo có `initial` thấp hơn. SPD của mọi cảnh giới dùng `1.0`, nên chỉ tăng lúc đổi đại cảnh giới; riêng Đạo Tổ có `SPD initial = 79993`, là bước nhảy bất thường so với Đại La 109.
- **Tài liệu/code liên quan:** ADR2-020, `realms.json`, `RealmStageValue.resolveRealmStageValue()`, `Player.getStageStats()`, `BreakthroughService.completeTransition()` và `RebirthStatCalculator`.
- **Điểm chưa rõ:** Mỗi tiểu tầng phải tăng theo phần trăm, lượng cố định hay nội suy tới cảnh giới kế; SPD có tăng mỗi tầng không; có cho phép giảm stat khi major breakthrough không; `SPD 79993` của Đạo Tổ là chủ ý hay typo.
- **Phương án A — Nội suy hình học giữa hai mốc Realm (đề xuất):** giữ `initial` của từng cảnh giới làm mốc canonical; stage 1 là mốc hiện tại, các stage sau tiến dần theo tỷ lệ hình học và stage 10 luôn nhỏ hơn stage 1 của cảnh giới kế, major breakthrough hoàn tất bước cuối. Mọi tầng đều tăng, không giảm ở biên và giữ tương quan phần trăm; cần định nghĩa riêng tăng trưởng Đạo Tổ vì không có Realm kế tiếp và xác nhận SPD 79993.
- **Phương án B — Author lại `growthPerStage` explicit trong JSON:** giữ nguyên công thức ADR2-020 nhưng chủ dự án cung cấp factor cho HP/ATK/DEF/SPD ở từng Realm, đồng thời tăng `initial` Realm kế để luôn lớn hơn stage 10 Realm trước. Kiểm soát balance cao nhất nhưng cần một bảng lớn và dễ sai continuity.
- **Phương án C — Clamp không giảm tại transition:** giữ data/công thức hiện tại, khi đột phá dùng `max(stat hiện tại, stat target)`. Chặn giảm nhanh và ít sửa, nhưng Luyện Khí/SPD vẫn không tăng qua tiểu tầng và base stat sẽ không còn derive thuần từ Realm/Stage/Rebirth.
- **Ưu/nhược điểm kỹ thuật:** A ít tham số và bảo đảm monotonic toàn ladder nhưng thay semantics ADR; B data-driven tuyệt đối nhưng cần author nhiều số; C vá triệu chứng, gây drift giữa persistence và GameData.
- **Đề xuất kỹ thuật (chưa áp dụng):** A; dùng interpolation deterministic/fixed-point, HP/ATK/DEF/SPD đều không giảm, và thêm explicit final-Realm growth policy. Trước khi áp dụng cần chủ dự án xác nhận cách xử lý Đạo Tổ và giá trị SPD 79993.
- **Phần bị chặn:** Thay công thức stage stat, rebalance `realms.json`, migration sửa base stat Player hiện hữu và regression test toàn bộ 15 Realm. Persistence breakthrough/idempotency độc lập vẫn hoạt động.
- **Câu trả lời một phần của chủ dự án:** Mỗi tiểu tầng ×1.2 và mỗi đại cảnh ×1.7; ví dụ riêng Luyện Khí tầng 1–10 ×1.1 mỗi tầng, Luyện Khí → Trúc Cơ ×1.5, sau đó Trúc Cơ tầng 1–10 ×1.2 mỗi tầng.
- **Điểm cần xác nhận còn lại:** (1) Luyện Khí `×1.1` và transition đầu `×1.5` có phải hai ngoại lệ duy nhất, còn từ Trúc Cơ trở đi mọi tiểu tầng `×1.2` và mọi major transition `×1.7`; (2) “mỗi tầng theo base” là compound trên tầng trước (`stage 3 = stage 1 × 1.2²`) hay cộng tuyến tính theo base Realm (`stage 3 = stage 1 × (1 + 20% × 2)`); (3) policy áp đồng nhất cho HP/ATK/DEF/SPD và khiến các `initial` Realm 2–15 hiện tại chỉ còn metadata/được thay bằng giá trị derive từ transition trước.
- **Diễn giải kỹ thuật đề xuất để duyệt:** compound và làm tròn `FLOOR` ở mỗi transition; Luyện Khí minor ×1.1, Luyện Khí 10 → Trúc Cơ 1 ×1.5; từ Trúc Cơ trở đi minor ×1.2, major ×1.7; áp cả HP/ATK/DEF/SPD. Cách này bỏ phụ thuộc `SPD Đạo Tổ = 79993` vì mọi base Realm sau Luyện Khí được derive liên tục.
- **Câu trả lời xác nhận của chủ dự án:** Đúng — compound và `FLOOR` mỗi transition; Luyện Khí minor ×1.1, transition đầu ×1.5, từ Trúc Cơ minor ×1.2 và mọi major tiếp theo ×1.7; áp HP/ATK/DEF/SPD, base Realm sau được derive liên tục.
- **Kết quả triển khai:** `progression_rules.json` revision 2 chứa rational factor data-driven. `RealmStatProgressionCalculator` dùng BigInt, compound từ base Luyện Khí tầng 1 và floor từng transition; `/start`, đột phá và Luân hồi dùng chung calculator trước bonus Luân hồi. Migration 024 reconcile toàn bộ Player hiện hữu theo Realm/Stage/Rebirth và đánh dấu policy revision 2. Authored stat `initial/growthPerStage` của Realm 2–15 không còn tham gia battle base stat; cultivation required/gain vẫn giữ formula cũ.
- **Trạng thái:** RESOLVED


---

## Q-OUTBOX-002 — Poll cadence và backlog drain policy của Outbox Worker

- **Bối cảnh:** Outbox Worker đã có short lease, `SKIP LOCKED`, batch mặc định 100 và retry/dead-letter. Interval Scheduler đã có thể trigger task mà không overlap trong một process, nhưng poll cadence và số batch được drain mỗi tick chưa được duyệt.
- **Tài liệu/phần code liên quan:** `OutboxWorker`; `OutboxRepository`; `IntervalScheduler`; Phase 7 roadmap; `005_EVENT_BUS_IMPLEMENTATION.md`.
- **Điểm chưa rõ:** Poll mỗi bao lâu; mỗi tick xử lý một batch hay drain nhiều batch; giới hạn burst khi backlog lớn; có đăng ký worker ngay trong bot process hay dùng worker process riêng.
- **Phương án A — Fixed polling MVP:** worker process riêng poll mỗi 1 giây, batch 100, tối đa một batch mỗi tick; scheduler chống overlap và nhiều process phối hợp bằng `SKIP LOCKED`. Dễ dự đoán tải, throughput khoảng 100 event/giây/worker nhưng backlog lớn thoát chậm hơn.
- **Phương án B — Bounded drain loop:** poll mỗi 1 giây, xử lý liên tiếp tối đa 10 batch hoặc dừng khi batch rỗng. Thoát backlog nhanh hơn nhưng có thể tạo burst DB/external subscriber và chiếm process lâu.
- **Phương án C — External trigger:** không polling trong Node process; platform job/queue trigger `processBatch()`. Tách deployment tốt nhưng cần hạ tầng và delivery trigger chưa tồn tại.
- **Đề xuất kỹ thuật:** A cho MVP; tách worker process khỏi Discord gateway process và chỉ tăng drain/worker count khi outbox-lag telemetry chứng minh cần.
- **Phần bị chặn:** Đăng ký Outbox Worker vào scheduler/deployment entrypoint và throughput acceptance test. Outbox repository/worker hiện hữu không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn A — worker process riêng, poll 1 giây, batch 100, một batch/tick; chỉ scale khi outbox-lag telemetry chứng minh cần.
- **Kết quả triển khai:** Thêm `OutboxPollingRuntime` và entrypoint `npm run worker:outbox`; timer giữ worker process sống, run-on-start, chống overlap và shutdown sạch. Worker ID dùng env hoặc `hostname:pid`. Registry handler hiện rỗng cho đến khi subscriber domain cụ thể được đăng ký.
- **Trạng thái:** RESOLVED
---

## Q-OBS-001 — Backend và aggregation contract cho SLO telemetry

- **Bối cảnh:** `operational-slo-mvp-v1` và evaluator đã tồn tại, nhưng query metrics hiện chỉ aggregate count/average/max trong memory. SLO cần percentile, availability/error rate và outbox lag xuyên process/restart trong cửa sổ 30 ngày.
- **Tài liệu/phần code liên quan:** `OperationalSloPolicy`; `DatabaseQueryMetrics`; `DatabaseHealthService`; Phase 7 exit criteria.
- **Điểm chưa rõ:** Metric được export bằng chuẩn/backend nào; histogram boundaries; multi-process aggregation; retention; dashboard/alert owner.
- **Phương án A — OpenTelemetry metrics contract:** instrument histogram/counter/gauge bằng OpenTelemetry và cấu hình exporter ở deployment. Backend-neutral, hỗ trợ multi-process/retention nhưng thêm dependency và cần operator chọn collector/backend.
- **Phương án B — In-process rolling metrics + structured snapshot log:** không cần hạ tầng mới và triển khai nhanh; nhưng mất khi restart, khó aggregate nhiều worker và không chứng minh availability 30 ngày nếu log platform không bảo đảm aggregation.
- **Phương án C — Ghi telemetry vào PostgreSQL:** chỉ dùng hạ tầng hiện tại và query được 30 ngày; nhưng tạo write amplification, cạnh tranh connection/I/O với gameplay và biến DB source of truth thành metrics store.
- **Đề xuất kỹ thuật:** A; giữ instrumentation API ở Platform, gameplay chỉ gắn stable operation/use-case name. Không tự chọn exporter vendor trong core project.
- **Phần bị chặn:** Production percentile/availability aggregation, dashboard và alert integration. Pure SLO evaluator và current query profiling không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn A — OpenTelemetry metrics contract, Platform-owned instrumentation và không chọn exporter vendor trong core.
- **Kết quả triển khai:** Thêm injected-Meter `OpenTelemetryMetricsAdapter`, No-Op mặc định và singleton configuration seam. Bảy Counter/Histogram đo use-case, database và outbox; attributes chỉ dùng stable low-cardinality name/type/outcome. MeterProvider/exporter/retention thuộc deployment.
- **Trạng thái:** RESOLVED
---

## Q-LEADERBOARD-002 — Discord UX cho Cultivation Leaderboard

- **Bối cảnh:** Business service và read model đã trả keyset page với public allowlist, nhưng chưa có Discord command/presentation. Slash command không thể yêu cầu người dùng tự nhập opaque cursor.
- **Tài liệu/phần code liên quan:** `CultivationLeaderboardService`; `ComponentSession`; các command trong `src/commands/player`; `002_CULTIVATION_LEADERBOARD.md`.
- **Điểm chưa rõ:** Tên command; có phân trang bằng button không; page size hiển thị; thời hạn interaction session; khi snapshot refresh làm cursor stale thì UX xử lý thế nào.
- **Phương án A — Interactive command:** `/bangxephang`, 20 dòng/trang, nút Trước/Sau, session 10 phút; khi cursor stale thì reload trang đầu và thông báo bảng đã cập nhật. UX đầy đủ và dùng đúng keyset contract nhưng cần component lifecycle.
- **Phương án B — Read-only first page:** `/bangxephang` chỉ hiển thị top 20, không button. Đơn giản và không có session state nhưng không xem được hạng 21–100.
- **Phương án C — Hoãn Discord presentation:** chỉ expose business service cho adapter tương lai. Không thêm UX vội nhưng leaderboard chưa đến được người chơi.
- **Đề xuất kỹ thuật:** A; Discord adapter chỉ format projection và giữ cursor trong component session, không tự query DB hoặc tính rank.
- **Phần bị chặn:** Discord command/embed/button handler. Read model, refresh scheduler và business service không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn A — `/bangxephang`, 20 dòng/trang, nút Trước/Sau, session 10 phút và stale cursor quay về trang đầu.
- **Kết quả triển khai:** Thêm command/Embed/Button adapter chỉ gọi `CultivationLeaderboardService`. Component session dùng TTL tuyệt đối 600.000ms, owner-only; stale snapshot reload trang đầu có thông báo và timeout loại bỏ buttons.
- **Trạng thái:** RESOLVED
---

## Q-PERF-002 — SLO vận hành và ngưỡng cảnh báo Phase 7

- **Bối cảnh:** Phase 7 yêu cầu định nghĩa/đo SLO. Runtime đã có query metrics, pool saturation snapshot và database readiness check, nhưng tài liệu chưa quy định availability, latency, error rate, outbox lag hoặc cửa sổ đo. Biến slow-query 250ms hiện chỉ là ngưỡng quan sát, không mặc nhiên là SLO.
- **Tài liệu/phần code liên quan:** Phase 7 roadmap; `015_DATABASE_POOL_POLICY.md`; `DatabaseQueryMetrics`; `DatabaseHealthService`; `OutboxWorker`.
- **Điểm chưa rõ:** SLO áp dụng cho command/use case nào; có tính thời gian Discord transport không; mục tiêu availability/latency/error/outbox lag; cửa sổ đo và điều kiện cảnh báo.
- **Phương án A — Baseline MVP tạm thời rồi hiệu chỉnh:** availability ứng dụng 99.5% theo 30 ngày; chỉ đo thời gian xử lý nội bộ, loại trừ Discord transport; interactive query p95 ≤ 2s và p99 ≤ 5s; mutation p95 ≤ 3s; error rate nội bộ < 1%; outbox dispatch lag p95 ≤ 30s. Cảnh báo khi vi phạm liên tục 5 phút và hiệu chỉnh sau 14 ngày telemetry. Có exit criteria sớm nhưng số ban đầu chưa dựa trên production workload.
- **Phương án B — Baseline nghiêm ngặt:** availability 99.9%; interactive p95 ≤ 1s/p99 ≤ 3s; mutation p95 ≤ 2s; error rate < 0.5%; outbox lag p95 ≤ 10s. Chất lượng cao hơn nhưng có thể tạo cảnh báo nhiễu và ép tối ưu sớm.
- **Phương án C — Burn-in trước khi đặt SLO:** thu thập 14–30 ngày telemetry, chỉ định nghĩa cách đo và dashboard trước; sau đó dùng phân phối thực tế để chốt mục tiêu. Có cơ sở dữ liệu tốt hơn nhưng Phase 7 chưa đạt exit criteria SLO trong thời gian burn-in.
- **Đề xuất kỹ thuật:** A dưới dạng baseline MVP có revision, tuyệt đối tách Discord network latency khỏi application latency và không đồng nhất slow-query threshold với DB SLO.
- **Phần bị chặn:** SLO document, alert thresholds, load/soak acceptance thresholds. Health/readiness primitive và metric collection độc lập không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn A — baseline MVP tạm thời và hiệu chỉnh sau telemetry.
- **Kết quả triển khai:** Thêm immutable policy `operational-slo-mvp-v1`, pure evaluator cho đủ sáu metric, điều kiện vi phạm liên tục 5 phút và tài liệu measurement boundary loại trừ Discord transport. Telemetry thiếu không phát false alert; exporter/dashboard vẫn thuộc deployment integration.
- **Trạng thái:** RESOLVED
---

## Q-PAGINATION-001 — Contract phân trang cho danh sách có thể tăng lớn

- **Bối cảnh:** Phase 7 yêu cầu pagination, nhưng repository/use case chưa có contract thống nhất. OFFSET trên ledger, inventory log, activity history hoặc leaderboard sẽ chậm và có thể lặp/bỏ bản ghi khi dữ liệu thay đổi đồng thời.
- **Tài liệu/phần code liên quan:** Phase 7 roadmap; các repository PostgreSQL; ledger/activity/outbox read paths tương lai.
- **Điểm chưa rõ:** Dùng cursor hay offset; page size mặc định/tối đa; sort key/tie-breaker; cursor có opaque/versioned không.
- **Phương án A — Keyset cursor chuẩn:** mặc định 20, tối đa 100; thứ tự ổn định `(sort_value, id)`; cursor opaque, có version và direction; không dùng OFFSET trên hot/unbounded paths. Hiệu năng ổn định và chịu concurrent insert tốt, nhưng client không nhảy trực tiếp đến trang N.
- **Phương án B — Offset/limit chuẩn:** mặc định 25, tối đa 100. Dễ dùng và nhảy trang, nhưng độ trễ tăng theo offset và kết quả không ổn định khi có concurrent writes.
- **Phương án C — Mỗi endpoint tự chọn:** linh hoạt theo UI, nhưng contract phân mảnh, khó audit và dễ để endpoint nóng dùng OFFSET ngoài ý muốn.
- **Đề xuất kỹ thuật:** A; endpoint dữ liệu nhỏ, bounded có thể xin ngoại lệ rõ ràng. Cursor phải encode giá trị sort đã snapshot và ID tie-breaker, không chứa SQL.
- **Phần bị chặn:** Shared pagination contract và cutover các list query tăng lớn. Query metrics/health không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn A — keyset cursor chuẩn, mặc định 20 và tối đa 100.
- **Kết quả triển khai:** Thêm opaque Base64URL cursor version 1 mang direction, `(sortValue, id)` và optional snapshot context; page limit được validate chặt. Leaderboard là read path đầu tiên dùng contract và không có OFFSET.
- **Trạng thái:** RESOLVED
---

## Q-LEADERBOARD-001 — Phạm vi, thứ hạng và độ tươi của Leaderboard MVP

- **Bối cảnh:** Roadmap yêu cầu read model/materialized view thay vì aggregate nóng từ raw logs, nhưng game design chưa chốt loại leaderboard, công thức xếp hạng, dữ liệu công khai hoặc độ trễ cập nhật.
- **Tài liệu/phần code liên quan:** Phase 6–7 roadmap; Player/Profile projection; Realm Registry; PostgreSQL read-model định hướng.
- **Điểm chưa rõ:** Leaderboard nào thuộc MVP; sort/tie-breaker; global hay guild/season; top-N; refresh cadence; trường profile nào được công khai.
- **Phương án A — Cultivation leaderboard tối thiểu:** global, không season; sort `realm.order DESC, stage DESC, cultivation DESC, player_id ASC`; public allowlist gồm rank/display name/realm/stage; materialized read model top 100, refresh 5 phút. Cụ thể và rẻ để vận hành, nhưng chưa phản ánh combat power hay nhiều mode.
- **Phương án B — Bộ leaderboard đầy đủ:** cultivation, combat power, wealth và PvE; hỗ trợ global/season. Hấp dẫn hơn nhưng đang thiếu power formula, season policy, privacy và balance contract.
- **Phương án C — Hoãn content leaderboard:** chỉ xây pagination/read-model interface; chờ Phase 6 gameplay và privacy spec rồi mới tạo view. Không tự áp công thức sai, nhưng chưa có leaderboard dùng được trong MVP.
- **Đề xuất kỹ thuật:** A nếu cần leaderboard trong MVP; nếu chưa phải tính năng phát hành bắt buộc thì C an toàn hơn. Dù chọn phương án nào, không query aggregate trực tiếp từ raw ledger/activity logs trên request path.
- **Phần bị chặn:** Schema/view, refresh job, leaderboard service và Discord presentation. Profile projection hiện tại không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn A — Cultivation leaderboard global, không season, top 100 và refresh 5 phút.
- **Kết quả triển khai:** Migration 015 tạo materialized read-model table/state. Refresh transaction lấy `realm.order/name` từ GameData, xếp `realm.order DESC, stage DESC, cultivation DESC, player_id ASC`; service hỗ trợ refresh gate 5 phút, snapshot-aware keyset cursor và public allowlist `rank/displayName/realmName/stage`.
- **Trạng thái:** RESOLVED
---

## Q-PERF-001 — PostgreSQL connection budget, timeout và slow-query threshold

- **Bối cảnh:** `postgres.js` hiện chỉ truyền `DATABASE_URL` vào `pg.Pool`, nên pool size, connect/idle timeout, statement/query timeout đều dùng implicit defaults. Phase 7 yêu cầu connection pool budget và query profiling, nhưng chưa có DB capacity, số worker production hoặc SLO latency để chọn số an toàn.
- **Tài liệu/phần code liên quan:** Phase 7 roadmap; ADR2-018; `postgres.js`; `loadAppConfig.js`; `DatabaseQueryMetrics` foundation.
- **Điểm chưa rõ:** Mỗi process được dùng tối đa bao nhiêu connection; production thiếu env budget thì fail-fast hay dùng default; connect/idle/statement/query timeout; ngưỡng slow query.
- **Phương án A — Fixed baseline cho mọi môi trường:** `max=10`, idle 30s, connect 10s, statement 15s, query 20s, slow 250ms. Dễ vận hành nhưng tổng connection tăng tuyến tính theo worker và có thể vượt DB capacity.
- **Phương án B — Production budget bắt buộc, development có baseline:** production bắt buộc `DB_POOL_MAX`; operator tính `floor((DB_CONNECTION_BUDGET - reserve) / process_count)`. Development mặc định max 5. Chung cho cả hai: idle 30s, connect 10s, statement 15s, query 20s, slow threshold 250ms; mọi giá trị cho phép override bằng env đã validate. Scale an toàn và explicit, nhưng deployment phải cung cấp budget.
- **Phương án C — Giữ implicit `pg` defaults:** ít thay đổi, nhưng không audit được connection budget và timeout có thể khác ý định khi scale.
- **Đề xuất kỹ thuật:** B; production fail-fast nếu thiếu `DB_POOL_MAX`, log config đã sanitize, query metrics chỉ dùng stable operation name và tuyệt đối không ghi SQL params.
- **Phần bị chặn:** Cutover pool factory/config, timeout enforcement và instrumentation query paths. Collector/audit độc lập không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn B — production bắt buộc connection budget; development dùng baseline đã đề xuất.
- **Kết quả triển khai:** Pool config validate development max 5 và production bắt buộc `DB_POOL_MAX`; idle/connect/statement/query/slow mặc định 30000/10000/15000/20000/250ms, hỗ trợ env override. `ObservedPostgresPool` đo stable operation name, failure/duration và không đưa SQL/params vào metrics; bootstrap log sanitized config.
- **Trạng thái:** RESOLVED
---

## Q-OUTBOX-001 — Delivery, lease, retry và dead-letter contract của Outbox Worker

- **Bối cảnh:** `outbox_events` đã tồn tại và roadmap yêu cầu worker dùng `FOR UPDATE SKIP LOCKED`. Event Bus spec chỉ mô tả Publisher → EventBus → Subscribers, chưa chốt transaction tồn tại trong lúc handler chạy, crash recovery, retry delay hoặc dead-letter. Giữ row lock xuyên external side effect và release lock trước handler tạo hai failure mode rất khác nhau.
- **Tài liệu/phần code liên quan:** Phase 7 roadmap; `EVENT_BUS_SPEC`; `SCHEDULER_SPEC`; migration 002 `outbox_events`; `OutboxRepository.enqueue()`.
- **Điểm chưa rõ:** Delivery guarantee là at-least-once hay best-effort; claim dùng row-lock dài hay lease; lease timeout; retry/backoff; số lần tối đa; dead-letter lưu thế nào; subscriber có bắt buộc idempotent theo event ID không?
- **Phương án A — At-least-once với short claim transaction và lease:** `SKIP LOCKED` claim batch, ghi `locked_at/locked_by/available_at`, commit rồi xử lý ngoài transaction; ack riêng. Baseline đề xuất lease 60 giây, exponential backoff từ 5 giây tối đa 15 phút, 10 lần thất bại thì `dead_lettered_at`; subscriber bắt buộc idempotent theo outbox event ID. Chịu crash/multi-worker tốt nhưng cần migration và duplicate-delivery contract.
- **Phương án B — Giữ transaction/row lock trong suốt handler:** code ít hơn và không cần lease, nhưng transaction dài, giữ connection/lock khi gọi external side effect và vẫn không đảm bảo exactly-once ngoài PostgreSQL.
- **Phương án C — Publish best-effort trong process:** đơn giản, nhưng mất event khi crash/redeploy và không đạt mục tiêu reliable subscriber.
- **Đề xuất kỹ thuật:** A với toàn bộ baseline trên; handler nhận immutable event envelope và phải idempotent. Advisory lock không dùng cho row-owned work.
- **Phần bị chặn:** Migration lease/dead-letter, claim/ack/fail worker loop và subscriber runtime. Typed transactional enqueue độc lập không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn A với toàn bộ baseline: at-least-once, lease 60 giây, backoff 5 giây tối đa 15 phút, 10 attempt rồi dead-letter; subscriber idempotent theo event ID.
- **Kết quả triển khai:** Migration 014 thêm lease/availability/error/dead-letter fields và indexes. `OutboxRepository` có atomic `SKIP LOCKED` claim, ack, fail/backoff/dead-letter và renew lease. `OutboxWorker.processBatch()` chạy handler ngoài transaction, dùng transaction ngắn riêng cho claim/ack/fail; immutable event envelope mang canonical outbox ID.
- **Trạng thái:** RESOLVED
---

## Q-MONSTER-001 — Quy tắc ánh xạ reward table cho Monster

- **Bối cảnh:** Tất cả monster template hiện khai báo `baseRewardId: "BASIC_MONSTER_DROP"`. Normalizer chuyển field này thành runtime `rewardTableId`, nhưng `reward_tables.json` không có bảng `BASIC_MONSTER_DROP`; dữ liệu hiện chỉ có các bảng theo cảnh giới như `MONSTER_LUYEN_KHI`. Vì vậy battle độc lập vẫn chạy, còn Exploration/Secret Realm thắng trận sẽ không thể settle reward.
- **Tài liệu liên quan:** `docs/06_MONSTER/000_MONSTER_MODULE_SPEC.md`, `docs/06_MONSTER/001_MONSTER_TEMPLATE_SPEC.md`, `src/data/monster/monster_template.json`, `src/data/reward_tables.json`, `MonsterGeneratorService`, `GameDataValidator`.
- **Điểm chưa rõ:** `BASIC_MONSTER_DROP` là một bảng thưởng tĩnh còn thiếu, là alias phải được resolve theo cảnh giới runtime, hay dữ liệu monster phải tham chiếu trực tiếp từng reward table cụ thể?
- **Phương án A — Thêm bảng tĩnh `BASIC_MONSTER_DROP`:** Giữ nguyên monster data và lookup trực tiếp; đơn giản nhưng mọi cảnh giới dùng chung một economy table nếu không bổ sung override khác.
- **Phương án B — Resolve alias theo cảnh giới:** `BASIC_MONSTER_DROP` được chuyển thành `MONSTER_<REALM_CODE>` khi tạo runtime monster; phù hợp bảng thưởng theo cảnh giới và monster adaptive, nhưng cần khai báo contract alias rõ ràng trong GameData thay vì ghép chuỗi ngầm trong service.
- **Phương án C — Tham chiếu trực tiếp trong từng template:** Thay `baseRewardId` bằng reward table cụ thể như `MONSTER_LUYEN_KHI`; reference được validator kiểm tra rõ ràng, nhưng template adaptive hoặc đổi cảnh giới runtime có thể trả reward không khớp nếu không thay cả template.
- **Ưu/nhược điểm chính:** A ít thay đổi nhất nhưng khó scale balance; B data-driven và phù hợp reward theo cảnh giới nhất nhưng thêm một lớp resolver; C có reference tường minh nhất nhưng gắn reward vào cảnh giới thiết kế của template.
- **Đề xuất kỹ thuật:** Phương án B, với alias được khai báo trong data/rules và validator kiểm tra mọi đích resolve tồn tại; không hard-code phép nối chuỗi trong gameplay service.
- **Phần bị chặn:** Chưa sửa reference validator từ bỏ qua sang báo lỗi vì dữ liệu hiện tại sẽ làm bootstrap thất bại; chưa settle reward cho Exploration/Secret Realm dùng monster. Battle engine, skill/effect pipeline và simulator không trao thưởng vẫn tiếp tục độc lập.
- **Câu trả lời của chủ dự án:** Chọn phương án B — resolve alias theo cảnh giới bằng mapping tường minh trong GameData.
- **Kết quả:** Đã triển khai alias `BY_REALM_ORDER`; runtime resolve qua Realm Registry và lưu resolved reward table ID.
- **Trạng thái:** RESOLVED

---

## Q-SECT-001 — Chính sách rời và đổi môn phái

- **Bối cảnh:** Runtime và PostgreSQL hiện lưu một `sect_id` trên mỗi người chơi. `SectService` đã hỗ trợ gia nhập idempotent và từ chối ghi đè khi người chơi đang thuộc môn phái khác, nhưng tài liệu chưa mô tả rời hoặc chuyển môn phái.
- **Tài liệu/phần code liên quan:** Sect System spec; `sect_template.json`; `SectService.joinSect()`; `PlayerRuntimeRepository.joinSect()`.
- **Điểm chưa rõ:** Gia nhập có vĩnh viễn không; nếu được rời/đổi thì có cooldown, chi phí, mất điểm môn phái hoặc điều kiện cảnh giới nào không?
- **Phương án A — Chọn một lần vĩnh viễn:** đơn giản và chống abuse tốt, nhưng khóa lựa chọn dài hạn và khó sửa sai cho người chơi.
- **Phương án B — Cho rời/đổi với policy data-driven:** cấu hình cooldown, chi phí và quy tắc giữ/xóa tiến độ; linh hoạt và cân bằng được, nhưng cần chốt toàn bộ thông số và transaction contract.
- **Phương án C — Cho đổi tự do:** UX đơn giản, nhưng dễ tối ưu hóa bằng cách đổi môn phái theo từng trận hoặc từng exchange.
- **Đề xuất kỹ thuật:** B; lưu policy trong data, dùng operation ID và transaction khóa Player khi rời/đổi. Không áp dụng cho đến khi có thông số được duyệt.
- **Phần bị chặn:** API rời/đổi môn phái và mọi cooldown/chi phí liên quan. Gia nhập lần đầu atomically vẫn tiếp tục hoạt động.
- **Câu trả lời của chủ dự án:** Chọn B — cho rời/đổi theo policy data-driven.
- **Kết quả triển khai:** Policy data-driven `sect-membership-v1` đã được nối với leave/rejoin transaction, operation ID và timestamp cooldown do PostgreSQL bảo vệ; thông số cụ thể theo `Q-SECT-004`.
- **Trạng thái:** RESOLVED
---

## Q-SECT-002 — Nguồn và thuật toán chọn phần thưởng Sect Exchange

- **Bối cảnh:** Spec mô tả `Filter Skill Pool -> Choose Grade -> Random -> Runtime Skill`, nhưng `sect_exchange_rules.json` mới có category/grade/realm/cost, không tham chiếu reward pool. Runtime hiện chọn phần tử khớp đầu tiên theo thứ tự registry nên chưa thực hiện semantics Random.
- **Tài liệu/phần code liên quan:** Sect System spec; `sect_exchange_rules.json`; `SectService.resolveRewardItem()`; Skill/Cultivation Art registries.
- **Điểm chưa rõ:** Random từ pool nào, có trọng số không, có cho trùng không, và kết quả retry được cố định ở thời điểm nào?
- **Phương án A — Reward pool tường minh, có trọng số:** mỗi rule/sect tham chiếu pool data-driven; roll bằng seed phía server và snapshot kết quả trong operation idempotent. Linh hoạt, audit được, nhưng cần bổ sung content/schema.
- **Phương án B — Một reward ID cố định trên mỗi rule/sect:** đơn giản, hoàn toàn deterministic, nhưng bỏ semantics Random trong spec.
- **Phương án C — Lọc registry ngầm rồi random:** ít data hơn, nhưng phụ thuộc thứ tự/nội dung registry; thêm content có thể âm thầm đổi xác suất.
- **Đề xuất kỹ thuật:** A; explicit weighted pool và deterministic roll thuộc cùng transaction exchange. Không áp dụng cho đến khi pool và policy được duyệt.
- **Phần bị chặn:** Cutover từ resolver compatibility sang random reward chính thức. Structural validation, list rule và atomic debit/reward hiện tại không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn A — dùng explicit weighted reward pool và deterministic/idempotent roll.
- **Kết quả triển khai:** Runtime chỉ đọc `sectRewardPools` tường minh, roll bằng seed trong idempotent exchange transaction và persist pool/seed/weight trong reward snapshot; content theo `Q-SECT-005`.
- **Trạng thái:** RESOLVED
---

## Q-SECT-003 — Contract runtime của passive effect môn phái

- **Bối cảnh:** Mười Sect khai báo tổng cộng 15 effect ID trong `sect_template.json`, nhưng các ID này chưa có định nghĩa trong Core Effect registry và `BattleEntityFactory` chưa áp dụng effect từ Sect. Mô tả cũ ghi nhầm 14; danh sách nguồn chuẩn và bảng baseline thực tế đều có 15 ID.
- **Tài liệu/phần code liên quan:** Sect System spec; `sect_template.json`; Core Effect/Action/Trigger specs; `BattleEntityFactory`.
- **Điểm chưa rõ:** Mỗi effect là Battle Effect, stat modifier hay passive ngoài combat; scope, trigger, duration, stack, target và giá trị balance cụ thể là gì?
- **Phương án A — Core Effect effect-driven:** mỗi ID tham chiếu định nghĩa Effect/Action/Trigger chuẩn, được materialize vào entity snapshot. Mở rộng tốt và thống nhất engine, nhưng cần định nghĩa chi tiết từng effect.
- **Phương án B — Chỉ dùng stat modifier trực tiếp:** dễ triển khai cho buff số học, nhưng không biểu diễn được burn duration, shield behavior hoặc trigger đặc thù.
- **Phương án C — Giữ metadata chưa có gameplay:** không làm sai balance, nhưng chọn Sect tạm thời không nhận passive thực tế.
- **Đề xuất kỹ thuật:** A; bổ sung content effect-driven và validator reference sau khi chốt behavior/balance từng ID. Không tự tạo công thức mặc định.
- **Phần bị chặn:** Áp dụng Sect passive vào Battle Entity và strict validation reference của `sect.effects`. Membership/exchange độc lập vẫn tiếp tục.
- **Câu trả lời của chủ dự án:** Chọn A — Sect passive dùng Core Effect effect-driven.
- **Kết quả triển khai:** Đủ 15 ID đã có Core Effect definition theo scope `ENTITY`/`CULTIVATION`/`BREAKTHROUGH`, strict reference validation và runtime materialization theo `Q-SECT-006`.
- **Trạng thái:** RESOLVED

---

## Q-SECT-004 — Thông số policy rời/đổi môn phái

- **Bối cảnh:** `Q-SECT-001` đã chọn policy data-driven nhưng chưa có giá trị cho cooldown, chi phí và cách xử lý Sect Point. Các giá trị này quyết định schema, transaction và anti-abuse behavior.
- **Tài liệu/phần code liên quan:** `Q-SECT-001`; Sect spec; Player wallet/ledger; `players.sect_id`.
- **Điểm chưa rõ:** Rời và đổi là một hay hai thao tác; cooldown bắt đầu lúc nào; có tốn Sect Point; điểm hiện có được giữ, reset hay khấu trừ?
- **Phương án A — Leave rồi chờ 7 ngày:** rời miễn phí, giữ Sect Point, chỉ được gia nhập Sect mới sau 7 ngày kể từ lúc rời. Dễ hiểu và chống đổi buff tức thời, nhưng người chơi bị trống Sect trong thời gian chờ.
- **Phương án B — Đổi trực tiếp với cooldown 7 ngày:** giữ Sect Point, đổi ngay nhưng chỉ được đổi tiếp sau 7 ngày; cần thêm một mức chi phí cố định hoặc theo cảnh giới trước khi triển khai. UX tốt hơn nhưng vẫn còn phải chốt cost.
- **Phương án C — Đổi trực tiếp sau 30 ngày và reset Sect Point:** chống abuse mạnh, nhưng hình phạt lớn và có thể làm mất toàn bộ tiến độ economy.
- **Đề xuất kỹ thuật:** A cho MVP; cấu hình `leaveCooldownSeconds: 604800`, `retainSectPoints: true`, lưu `sect_rejoin_available_at`, operation ID và resource ledger nếu sau này có cost.
- **Phần bị chặn:** Migration timestamp/policy revision và API leave/rejoin/change.
- **Câu trả lời của chủ dự án:** Chọn A cho MVP; `leaveCooldownSeconds: 604800`, `retainSectPoints: true`, lưu `sect_rejoin_available_at`, operation ID và resource ledger nếu sau này có cost.
- **Kết quả triển khai:** Migration 013 thêm `sect_rejoin_available_at`/`sect_policy_revision`; `leaveSect()` giữ nguyên wallet, đặt cooldown 7 ngày và `joinSect()` từ chối rejoin sớm trong cùng idempotent transaction.
- **Trạng thái:** RESOLVED
---

## Q-SECT-005 — Nội dung pool, duplicate và thời điểm cố định kết quả exchange

- **Bối cảnh:** `Q-SECT-002` đã chọn explicit weighted pool, nhưng data hiện chưa có danh sách entry/weight. Cũng chưa có rule cho sách/công pháp người chơi đã sở hữu.
- **Tài liệu/phần code liên quan:** `Q-SECT-002`; `sect_exchange_template.json`; Skill/Cultivation Art/Item registries; idempotency operation và exchange log.
- **Điểm chưa rõ:** Ai sở hữu danh sách pool ban đầu; trọng số mặc định; duplicate có được nhận; kết quả roll được persist cùng exchange hay reserve trước exchange?
- **Phương án A — Pool đầy đủ, equal weight, cho duplicate:** tạo pool tường minh theo từng Sect/category/grade từ toàn bộ content hiện có khớp điều kiện; mọi entry weight `1`; sách duplicate vẫn vào inventory. Roll một lần trong transaction và persist reward/seed trong exchange log/idempotent response. Dễ audit và không có pool rỗng do lọc ownership, nhưng duplicate có thể kém hấp dẫn.
- **Phương án B — Pool curated có trọng số:** chủ dự án cung cấp entry/weight cho từng pool; cho kiểm soát balance tốt nhất nhưng cần một bộ content đầy đủ trước khi runtime cutover.
- **Phương án C — Equal weight nhưng loại item đã sở hữu:** giảm duplicate, nhưng pool có thể rỗng và cần thêm fallback/compensation policy.
- **Đề xuất kỹ thuật:** A cho MVP; pool vẫn là JSON tường minh, không lọc registry ngầm ở runtime. Script/audit chỉ hỗ trợ sinh và kiểm tra content ban đầu.
- **Phần bị chặn:** Tạo pool data, weighted resolver và cutover `resolveRewardItem()`.
- **Câu trả lời của chủ dự án:** Chọn A cho MVP; pool là JSON tường minh, không lọc registry ngầm ở runtime; script/audit chỉ sinh và kiểm tra content ban đầu.
- **Kết quả triển khai:** Sinh 180 pool và 448 equal-weight entry, duplicate policy `ALLOW`. Pool thiếu content giữ entries rỗng và trả `SECT_REWARD_POOL_EMPTY`. Weighted roll dùng seed inject được; reward snapshot lưu `rollSeed`, `poolId`, `entryWeight`.
- **Trạng thái:** RESOLVED
---

## Q-SECT-006 — Bộ baseline behavior và balance cho 15 Sect Effect

- **Bối cảnh:** `Q-SECT-003` đã chọn Core Effect effect-driven, nhưng tên effect không đủ để xác định trigger, target, duration và amount. Một số effect còn tác động ngoài battle như cultivation/breakthrough.
- **Tài liệu/phần code liên quan:** `Q-SECT-003`; `sect_template.json`; Core Effect/Modifier/Trigger specs; Cultivation và Breakthrough policies.
- **Điểm chưa rõ:** Có chấp nhận một baseline MVP do kỹ thuật đề xuất hay chủ dự án sẽ cung cấp từng định nghĩa; effect ngoài combat có dùng cùng registry nhưng khác scope hay tách policy registry?
- **Phương án A — Duyệt baseline MVP theo effect scope:** chấp nhận toàn bộ bảng baseline bên dưới; battle effect dùng Core Effect/Modifier, cultivation và breakthrough effect dùng cùng effect ID nhưng scope `CULTIVATION`/`BREAKTHROUGH`. Kiến trúc thống nhất và đủ đầu vào để triển khai MVP, nhưng các giá trị sẽ trở thành baseline balance cần theo dõi telemetry.
- **Phương án B — Chủ dự án cung cấp đủ 15 definition:** mỗi ID có scope, trigger, target, action/modifier, amount, duration, stack và chance. Chính xác nhất, nhưng triển khai chờ content hoàn chỉnh.
- **Phương án C — Triển khai trước bốn numeric passive:** chỉ `CRIT_UP`, `PEN_UP`, `REF_UP`, `ATK_UP/DOWN`, còn behavioral và progression effect tiếp tục khóa. Có tiến độ sớm nhưng trải nghiệm Sect không đồng đều.
- **Đề xuất kỹ thuật:** A; nếu được chọn, bảng baseline 15 effect dưới đây là nội dung được duyệt để thêm Core Effect data và factory materialization.
- **Baseline MVP đề xuất nếu chọn A:**

  | Effect ID | Scope và behavior đề xuất |
  |---|---|
  | `SECT_FIRE_BURN_DURATION` | `BATTLE`: Burn do chủ thể áp dụng kéo dài thêm 1 lượt. |
  | `SECT_WOOD_PARTY_HEAL` | `BATTLE`: cuối lượt hồi 3% Max HP cho bản thân và đồng minh còn sống. |
  | `SECT_EARTH_SHIELD_EXPLODE` | `BATTLE`: khi shield của chủ thể bị phá, gây lại 30% lượng shield vừa hấp thụ lên nguồn damage; tối đa một lần mỗi lượt. |
  | `SECT_WATER_CLEANSE` | `BATTLE`: đầu lượt xóa một negative effect; tối đa một lần mỗi battle. |
  | `SECT_METAL_CRIT_UP` | `BATTLE_STAT`: `CRIT +10` percentage points. |
  | `SECT_LIGHTNING_PEN_UP` | `BATTLE_STAT`: `PEN +10` percentage points. |
  | `SECT_ICE_SLOW_AFTER_CONTROL` | `BATTLE`: sau khi chủ thể áp dụng Control thành công, target nhận `SPD -10%` trong 2 lượt. |
  | `SECT_YINYANG_REF_UP` | `BATTLE_STAT`: `REF +10` percentage points. |
  | `SECT_YINYANG_ATK_DOWN` | `BATTLE_STAT`: `ATK -10%` base. |
  | `SECT_ASSASSIN_ATK_UP` | `BATTLE_STAT`: `ATK +15%` base. |
  | `SECT_ASSASSIN_BREAKTHROUGH_DOWN` | `BREAKTHROUGH`: success chance `-10` percentage points. |
  | `SECT_LONGEVITY_CULTIVATION_UP` | `CULTIVATION`: tốc độ tu luyện `+10%` multiplicative. |
  | `SECT_LONGEVITY_BREAKTHROUGH_UP` | `BREAKTHROUGH`: success chance `+10` percentage points. |
  | `SECT_LONGEVITY_ATK_DOWN` | `BATTLE_STAT`: `ATK -10%` base. |
  | `SECT_LONGEVITY_DEF_DOWN` | `BATTLE_STAT`: `DEF -10%` base. |

  Nếu party combat chưa được mở, `PARTY_HEAL` chỉ target SELF trong solo PvE nhưng contract target vẫn giữ `ALLY_ALL` cho phase sau.
- **Phần bị chặn:** Strict effect reference validation, Battle Entity Sect passive và modifier Cultivation/Breakthrough.
- **Câu trả lời của chủ dự án:** Chọn A và toàn bộ bảng baseline MVP.
- **Kết quả triển khai:** 15 Core Effect được materialize theo scope. Audit executable bao phủ Burn duration, party heal, shield-break reflect, cleanse, timed slow; stat modifier và progression resolver bao phủ CRIT/PEN/REF/ATK/DEF, cultivation và breakthrough.
- **Trạng thái:** RESOLVED
---

## Q-ACTIVITY-001 — Lifecycle và retry contract của Exploration

- **Bối cảnh:** `ExplorationService` hiện generate encounter và chạy battle trước; chỉ khi thắng mới gọi Reward Runtime để reserve `activity_runs`. Crash sau battle hoặc Discord retry có thể chạy lại encounter/RNG với cùng operation ID, còn defeat/timeout không tạo activity/progress chuẩn. Roadmap yêu cầu immutable battle input snapshot, server-side seed và idempotent completion.
- **Tài liệu/phần code liên quan:** `006_EXPLORATION_SPEC.md`, `ExplorationService`, `activity_runs`, Battle deterministic replay, Phase 6 roadmap.
- **Điểm chưa rõ:** Activity được reserve trước hay sau battle; retry tiếp tục/replay run cũ hay tạo battle mới; defeat/timeout có được complete và ghi progress; operation ID đại diện start hay completion.
- **Phương án A — Reserve-before-battle deterministic run:** operation ID reserve activity trước battle với encounter, player battle snapshot và server seed; battle chạy ngoài DB transaction nhưng replay deterministic từ snapshot; mọi outcome đều complete, chỉ victory nhận reward. Retry cùng operation trả/replay cùng run. Audit tốt nhất nhưng cần execution/result snapshot và completion orchestration.
- **Phương án B — Single-request settlement sau battle:** giữ battle trước reserve, chỉ làm reward/progress atomic khi thắng. Refactor nhỏ nhưng crash/retry vẫn có thể chạy trận/RNG mới và loss không có canonical run.
- **Phương án C — Hai operation start/claim như Gathering:** start reserve encounter, client gọi resolve/claim để chạy battle và settle. Retry rõ nhưng thay đổi Discord UX thành hai bước dù battle đồng bộ.
- **Đề xuất kỹ thuật:** A; DB transaction chỉ bao quanh reserve và completion, không giữ transaction trong lúc battle CPU chạy. Lưu seed/input trước battle và result snapshot khi complete.
- **Phần bị chặn:** Cutover Exploration sang canonical activity lifecycle, deterministic retry và atomic progress cho mọi outcome. Repository transaction seams và projection FK độc lập không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn A — reserve trước battle; transaction chỉ bao quanh reserve/completion; lưu seed/input trước battle và result snapshot khi complete.
- **Kết quả triển khai:** Exploration reserve immutable Player/Monster BattleEntity snapshots cùng battle/reward seed phía server. Battle chạy ngoài transaction bằng seeded provider; mọi outcome đều ghi progress và complete canonical run trong transaction riêng, reward chỉ áp dụng khi victory. Retry dùng cùng snapshot/run; legacy unsafe settlement path đã loại bỏ.
- **Trạng thái:** RESOLVED
---

## Q-SECRET-001 — Transaction boundary của vé và Secret Realm activity

- **Bối cảnh:** `SecretRealmService.enter()` hiện trừ vé trước battle bằng transaction riêng, sau đó chạy các wave và chỉ reserve/settle activity nếu clear. Crash sau khi trừ vé có thể làm mất vé mà không có run để retry; reward/progress cũng commit tách rời.
- **Tài liệu/phần code liên quan:** `007_SECRET_REALM_SPEC.md`, `SecretRealmService`, inventory repository, `activity_runs`, reward claim foundation.
- **Điểm chưa rõ:** Vé được trừ lúc reserve, lúc completion hay chỉ khi clear; thất bại có mất vé; retry sau crash dùng lại run nào; input/seed/waves được snapshot khi nào.
- **Phương án A — Consume-and-reserve atomically trước battle:** start transaction khóa/trừ một vé và reserve immutable run/seed; battle chạy từ snapshot; completion ghi mọi outcome, reward chỉ khi clear. Retry cùng operation dùng lại run, thất bại vẫn mất vé. Chống free retry và crash-safe nhưng cần deterministic replay.
- **Phương án B — Reserve trước, consume tại completion:** crash không mất vé nhưng người chơi có thể dùng/di chuyển vé trong lúc run; cần reservation/escrow inventory và semantics timeout.
- **Phương án C — Chỉ trừ vé khi clear:** đơn giản và thân thiện nhưng cho phép retry thất bại miễn phí, thay đổi rõ economy hiện tại.
- **Đề xuất kỹ thuật:** A; ticket debit ledger/projection và activity reserve cùng transaction, completion là transaction riêng theo run identity.
- **Phần bị chặn:** Atomic Secret Realm start/completion, ticket correctness và retry recovery. Client-aware item/progress repository methods vẫn triển khai độc lập.
- **Câu trả lời của chủ dự án:** Chọn A — ticket debit ledger/projection và activity reserve cùng transaction; completion là transaction riêng theo run identity; thất bại vẫn mất vé.
- **Kết quả triển khai:** Secret Realm reserve run/input/seeds trước battle rồi consume ticket bằng cùng transaction client và ghi resource ledger tham chiếu activity run. Mọi outcome đều complete/projection; reward chỉ áp dụng khi CLEARED. Retry dùng cached reservation và deterministic snapshots.
- **Trạng thái:** RESOLVED
---

## Q-SECRET-002 — Trạng thái nhân vật giữa các wave Bí Cảnh

- **Bối cảnh:** `runWave()` hiện tạo `BattleEntity` mới từ cùng RuntimePlayer cho từng wave, vì vậy HP, shield, effect và cooldown được reset hoàn toàn. Spec chỉ ghi Generate Waves → Battle → Boss, không nói trạng thái có được mang sang wave sau.
- **Tài liệu/phần code liên quan:** `007_SECRET_REALM_SPEC.md`, `SecretRealmService.runWave()`, `BattleEntityFactory`, BattleResult final snapshots.
- **Điểm chưa rõ:** HP/shield/effect/cooldown có carry giữa wave không; có hồi phục giữa wave; passive once-per-battle được reset theo wave hay toàn Bí Cảnh.
- **Phương án A — Reset toàn bộ mỗi wave:** giữ behavior hiện tại; mỗi wave là battle độc lập. Dễ cân bằng/kỹ thuật nhưng attrition gần như không tồn tại.
- **Phương án B — Carry toàn bộ battle state:** Bí Cảnh là một encounter nhiều wave; HP/shield/effect/cooldown và once-per-run carry. Có chiều sâu nhưng Battle Engine cần multi-wave context/lifecycle rõ.
- **Phương án C — Carry HP, reset transient state:** HP tạo attrition; shield/effect/cooldown/passive battle flags reset mỗi wave. Cân bằng trung gian nhưng cần chốt hồi phục và chính xác field nào transient.
- **Đề xuất kỹ thuật:** C cho MVP với không hồi HP tự động giữa wave; tuy nhiên không áp dụng cho đến khi chủ dự án chọn và chốt danh sách state.
- **Phần bị chặn:** Snapshot/replay Secret Realm và cách khởi tạo entity ở wave 2+. Exploration và Gathering không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn C cho MVP — carry HP, không hồi tự động; shield/effect/cooldown/passive battle flags reset mỗi wave.
- **Kết quả triển khai:** Mỗi wave restore Player từ immutable base snapshot, override duy nhất `currentHP` bằng HP cuối wave trước và đặt shield về 0. Battle Engine/context mới cho mỗi wave nên transient effect, modifier, cooldown và once-per-battle flags không carry. Simulator xác nhận HP giảm xuyên wave và defeat vẫn được ghi.
- **Trạng thái:** RESOLVED
---

## Q-COMBAT-004 — Contract Core Data và runtime của Condition

- **Bối cảnh:** `008_ACTION_SPEC`, Battle Pipeline và Execution Context đều quy định Action có thể tham chiếu `conditionId`, Battle Engine phải resolve Condition trước Target/Action. Source hiện chưa có `conditions.json`, GameData registry cho Condition hoặc Condition Checker. Defense Skill dùng inline `condition: { hpPercent }`, nhưng đó là trigger condition riêng đã được chốt tại `Q-COMBAT-003`, không phải contract tổng quát cho Action/Effect.
- **Tài liệu liên quan:** `docs/02_CORE_DATA/008_ACTION_SPEC.md`, `docs/08_BATTLE/003_BATTLE_PIPELINE_SPEC.md`, `docs/08_BATTLE/011_EXECUTION_CONTEXT_SPEC.md`, `docs/08_BATTLE/012_TRIGGER_SYSTEM_SPEC.md`, `GameDataRegistry`, `GameDataValidator`, `BattleEngine`.
- **Điểm chưa rõ:** Condition là Core Data definition dùng lại theo ID hay object inline; schema biểu diễn subject/operator/value thế nào; tập predicate MVP gồm những gì; nhiều predicate kết hợp `ALL`/`ANY` hay chỉ một predicate; condition không tồn tại/không hỗ trợ phải fail bootstrap hay skip action.
- **Phương án A — Condition Registry + typed predicate tree:** thêm `conditions.json`; mỗi definition có `id`, node `predicate` hoặc group `ALL`/`ANY`, subject typed (`SELF`, `TARGET`, `BATTLE`), operator allowlist và arguments. Action/Trigger chỉ giữ `conditionId`; validator resolve toàn bộ reference và runtime evaluator fail-fast nếu predicate chưa có executor. Data-driven và đúng spec, nhưng cần chốt schema cùng tập predicate ban đầu.
- **Phương án B — Inline condition object:** Action/Trigger chứa trực tiếp object condition; ít lookup và dễ author content nhỏ, nhưng trái contract `conditionId`, lặp dữ liệu và khó quản lý version/reference.
- **Phương án C — Condition ID ánh xạ code-only evaluator:** giữ `conditionId` nhưng mỗi ID là handler viết trong code, không có Core Data definition. Đơn giản cho MVP nhưng thêm content Condition thường phải sửa logic lõi, không đạt mục tiêu data-driven.
- **Đề xuất kỹ thuật:** A. Baseline đề xuất cho MVP: predicate `HP_PERCENT`, `HAS_EFFECT`, `IS_ALIVE`; subject `SELF`/`TARGET`; operator số `LT/LTE/GT/GTE/EQ` và boolean `IS`; group `ALL`/`ANY`; missing ID hoặc unsupported predicate làm validation/bootstrap fail. Đây chỉ là đề xuất, chưa áp dụng.
- **Phần bị chặn:** Condition Checker tổng quát, `conditionId` trên Action/Trigger và condition stage trong Execution Context. Defense passive đã resolve riêng theo quyết định trước; Action không có `conditionId` vẫn tiếp tục chạy.
- **Câu trả lời của chủ dự án:** Chọn A, áp dụng baseline predicate/operator/group/subject được đề xuất.
- **Kết quả triển khai:** Đã thêm Condition Core Data Registry, typed predicate tree, validator và `ConditionEvaluator`; ba predicate `HP_PERCENT`/`HAS_EFFECT`/`IS_ALIVE`, group `ALL`/`ANY`, subject `SELF`/`TARGET` và fail-fast đã hoạt động. Integration per-target filtering được hoàn tất theo `Q-COMBAT-005`.
- **Trạng thái:** RESOLVED

---

## Q-COMBAT-005 — Thứ tự và phạm vi đánh giá Condition theo Target

- **Bối cảnh:** Q-COMBAT-004 đã chọn Condition Registry và cho phép subject `TARGET`. `008_ACTION_SPEC` hiện ghi `Resolve Condition -> Resolve Target -> Execute Action`, nhưng Condition không thể đọc `TARGET` trước khi Target Selector tạo entity runtime. Với Action `ENEMY_ALL`/`ALLY_ALL`, tài liệu cũng chưa quy định một target fail Condition sẽ loại riêng target đó hay hủy toàn bộ Action.
- **Tài liệu liên quan:** `docs/02_CORE_DATA/008_ACTION_SPEC.md`, `docs/08_BATTLE/003_BATTLE_PIPELINE_SPEC.md`, `docs/08_BATTLE/011_EXECUTION_CONTEXT_SPEC.md`, `Q-COMBAT-004`, `TargetSelector`, `BattleEngine`.
- **Điểm chưa rõ:** Thứ tự thực tế giữa target resolution và condition evaluation; semantics của `TARGET` condition trên nhiều target; event condition thiếu payload target phải fail hay chỉ không match.
- **Phương án A — Per-target filtering:** resolve candidate targets trước, evaluate cùng Condition cho từng `{ SELF, TARGET }`, loại target false và execute trên phần còn lại; không còn target thì enqueue `ACTION_SKIPPED_CONDITION`. Condition chỉ dùng `SELF` vẫn cho cùng kết quả trên mọi target. Data-driven và tự nhiên với AOE, nhưng sửa thứ tự pipeline trong spec thành `Resolve Target -> Evaluate Condition per Target -> Execute`.
- **Phương án B — Whole-action gate bằng primary target:** resolve một preview/primary target, evaluate một lần; true thì action tác động toàn bộ target đã chọn, false thì bỏ toàn action. Ít evaluation hơn nhưng AOE có thể phụ thuộc tùy ý vào target đầu tiên.
- **Phương án C — Khai báo evaluation scope:** Condition hoặc Action thêm `evaluationScope: ACTION | EACH_TARGET`; author content chọn semantics. Linh hoạt nhất nhưng tăng schema và có nguy cơ cùng Condition cho kết quả khác theo caller.
- **Đề xuất kỹ thuật:** A. Với Trigger/Event không có payload target mà Condition yêu cầu `TARGET`, evaluator fail-fast `CONDITION_SUBJECT_UNAVAILABLE:TARGET` trong development/audit; validator không thể chứng minh payload runtime nên cần contract test theo từng event.
- **Phần bị chặn:** Chỉ integration `conditionId` vào Action/Trigger execution và completion của Execution Context pipeline. Condition Registry, validator, evaluator độc lập và battle content hiện không khai báo condition vẫn tiếp tục hoạt động.
- **Câu trả lời của chủ dự án:** Chọn A — per-target filtering.
- **Kết quả triển khai:** Mọi action source resolve candidate targets rồi dùng chung `ConditionTargetFilter`; target false bị loại, không còn target phát `ACTION_SKIPPED_CONDITION`, partial filter phát `ACTION_TARGETS_FILTERED_CONDITION`. Trigger condition dùng effect owner làm `SELF` và payload target làm `TARGET`; thiếu payload cần thiết fail-fast.
- **Trạng thái:** RESOLVED
---

## Q-COMBAT-006 — Hook ordering khi tách Trigger khỏi ActionExecutor

- **Bối cảnh:** `008_ACTION_SPEC` quy định ActionExecutor không được Trigger Event; Trigger System cũng yêu cầu Trigger chỉ mô tả thời điểm và Battle Engine thực hiện dispatch. Runtime hiện dispatch `BEFORE_ACTION`/`AFTER_ACTION` bên trong `ActionExecutor.executeOne()` theo từng target, đồng thời phát `ON_HIT`, `ON_HEAL`, `ON_SHIELD`, `ON_EFFECT_APPLIED`, `ON_DEATH`. `CHAIN_DAMAGE` là một Action nhưng gọi nhiều DAMAGE hit nội bộ, nên hiện tạo BEFORE/AFTER cho từng jump dưới action type `DAMAGE`.
- **Tài liệu liên quan:** `docs/02_CORE_DATA/008_ACTION_SPEC.md`, `docs/08_BATTLE/007_ACTION_EXECUTOR_SPEC.md`, `docs/08_BATTLE/011_EXECUTION_CONTEXT_SPEC.md`, `docs/08_BATTLE/012_TRIGGER_SYSTEM_SPEC.md`, `BattleActionPipeline`, `ActionExecutor`, `BattleTriggerDispatcher`.
- **Điểm chưa rõ:** BEFORE/AFTER áp dụng một lần cho Action/ExecutionContext hay một lần mỗi target; Chain Damage nên phát hook cấp `CHAIN_DAMAGE` hay từng hit `DAMAGE`; reactive Defense và ON_DEATH nằm ở vị trí nào so với AFTER_ACTION.
- **Phương án A — Per-target lifecycle giữ compatibility:** BattleActionPipeline lặp từng target, dispatch `BEFORE_ACTION -> execute one target -> semantic trigger -> AFTER_ACTION`. Chain phải expose selected jumps cho pipeline để từng jump có lifecycle riêng. Giữ timeline hiện tại nhưng một ExecutionContext chứa nhiều target lại có nhiều cặp action hook và Chain orchestration phức tạp.
- **Phương án B — One lifecycle per Action:** mỗi ExecutionContext phát một `BEFORE_ACTION` với toàn bộ target IDs, ActionExecutor trả toàn bộ results, pipeline phát semantic trigger theo từng result rồi một `AFTER_ACTION`. Chain có một cặp hook type `CHAIN_DAMAGE`, các hit vẫn phát `ON_HIT`/`ON_DEATH` theo target. Contract sạch và đúng “một context/một action”, nhưng thay đổi số lượng/thứ tự hook so với runtime hiện tại.
- **Phương án C — Giữ Trigger trong ActionExecutor:** ít thay đổi nhất nhưng tiếp tục vi phạm Stable Action spec, ActionExecutor phụ thuộc TriggerDispatcher và executor plugin phải tự biết lifecycle.
- **Đề xuất kỹ thuật:** B. Ordering đề xuất: `BEFORE_ACTION -> mutate/collect all target results -> ON_HIT/ON_HEAL/ON_SHIELD/ON_EFFECT_APPLIED theo thứ tự target -> reactive Defense của target sống -> ON_DEATH -> AFTER_ACTION`. `AFTER_ACTION` nhận aggregate Action Result.
- **Phần bị chặn:** Chỉ việc chuyển hook/semantic trigger và reactive passive ra khỏi ActionExecutor. Action registry, ExecutionContext, Condition pipeline và gameplay hiện tại tiếp tục hoạt động.
- **Câu trả lời của chủ dự án:** Chọn B — one lifecycle per Action/ExecutionContext.
- **Kết quả triển khai:** `BattleActionPipeline` mở rộng target đặc thù (bao gồm Chain) trước Condition, phát đúng một `BEFORE_ACTION`, gọi ActionExecutor để mutate/collect toàn bộ result, phát semantic trigger theo thứ tự result, xử lý reactive Defense của target còn sống rồi `ON_DEATH`, cuối cùng phát một `AFTER_ACTION` nhận aggregate Action Result. `ActionExecutor` không còn phụ thuộc TriggerDispatcher hoặc PassiveSkillEngine.
- **Trạng thái:** RESOLVED
---

## Q-COMBAT-007 — Semantics chiến đấu của quan hệ Element

- **Bối cảnh:** `element_relations.json` hiện định nghĩa 5 quan hệ `generate` và 5 quan hệ `counter`. Runtime trước đây đọc nhầm shape `relations`, khiến collection luôn rỗng; phần ingest nay đã được sửa thành immutable records `{ relationType, from, to }`. Skill và Monster có Element, nhưng dữ liệu quan hệ không có multiplier, effect/formula reference, timing áp dụng hoặc quy tắc xác định Element phòng thủ của Player.
- **Tài liệu liên quan:** `docs/02_CORE_DATA/002_ELEMENT_SPEC.md`, `src/data/elements/element_relations.json`, `elements.json`, `effects.json`, `BattleSkillFactory`, `BattleEntityFactory`, `FormulaEngine`, `BattleActionPipeline`.
- **Điểm chưa rõ:** `GENERATE` và `COUNTER` chỉ là lore/progression metadata hay phải thay đổi damage/effect trong battle; nếu có thì hệ số/công thức là gì; lấy Element tấn công từ Skill, Effect hay actor; lấy Element phòng thủ từ Spirit Root, entity metadata hay effect đang hoạt động; quan hệ mutation như Lightning/Ice tham gia vòng ngũ hành ra sao.
- **Phương án A — Metadata-only trong MVP:** load và validate quan hệ nhưng battle không áp dụng. Không làm sai balance khi thiếu số liệu, đơn giản; đổi lại hệ tương sinh/tương khắc chưa tạo gameplay.
- **Phương án B — Multiplier trực tiếp trong relation data:** bổ sung numeric field cho từng chiều quan hệ và Formula Engine nhân damage theo attacker/defender Element. Dễ hiểu và nhanh; nhưng cần chốt nguồn Element, hệ số, stacking, neutral case và có thể đẩy Element logic vào formula core.
- **Phương án C — Effect-driven relation:** mỗi relation tham chiếu Effect/Modifier/Formula policy riêng; pipeline resolve relation context rồi content quyết định damage/buff/debuff. Phù hợp kiến trúc Effect-driven và mở rộng mutation element tốt hơn; schema/content authoring phức tạp hơn và vẫn cần đầy đủ thông số gameplay.
- **Ưu/nhược điểm chính:** A an toàn nhất nhưng chỉ hoàn tất data foundation; B ít lớp nhất nhưng dễ hard-code semantics; C mở rộng tốt nhất và đúng định hướng dự án nhưng cần thiết kế data contract cùng balance content.
- **Đề xuất kỹ thuật:** C cho kiến trúc dài hạn; giữ behavior A trong lúc chưa có schema và thông số được duyệt. Đề xuất này chưa được áp dụng vào battle.
- **Phần bị chặn:** Chỉ Element relation combat resolver, multiplier/effect và simulation tương sinh–tương khắc. Việc load, normalize, validate và expose 10 relation records vẫn độc lập và đã triển khai.
- **Câu trả lời của chủ dự án:** Chọn C — Effect-driven relation.
- **Kết quả triển khai:** Contract Effect-driven đã hoàn tất qua `Q-COMBAT-010` và `Q-COMBAT-011`: source Element có thứ tự rõ ràng, exact directional lookup, optional `effectId`, ACTION-scoped carrier pre-formula, target-specific Formula Context và cleanup bắt buộc. Mười relation hiện hữu chưa khai báo `effectId` nên vẫn không tự sinh gameplay hoặc multiplier.
- **Trạng thái:** RESOLVED
---

## Q-COMBAT-010 — Nguồn Element khi resolve quan hệ trong battle

- **Bối cảnh:** `Q-COMBAT-007` đã chọn Effect-driven relation. Structural `ElementRelationResolver` hiện chỉ lookup chính xác `{ from, to, relationType }` và không suy diễn. Skill có `element`; Monster snapshot có `metadata.element`; Player có `spiritRootId` nhưng BattleEntity snapshot chưa materialize Element. Mutation Element có `parentElement` nhưng data không nói có fallback về hệ cha khi lookup relation hay không.
- **Tài liệu liên quan:** `elements.json`, `element_relations.json`, `spirit_roots.json`, `BattleSkillFactory`, `BattleEntityFactory`, `BattleActionPipeline`, `ElementRelationResolver`.
- **Điểm chưa rõ:** Element tấn công lấy từ Skill, actor hay Action; Element phòng thủ lấy từ Spirit Root/Monster hay effect runtime; Action không có Element xử lý neutral hay fallback actor; Lightning/Ice dùng exact relation hay kế thừa FIRE/WATER.
- **Phương án A — Skill vs innate target Element:** `from = skill.element` (Action có explicit override nếu schema bổ sung), `to = target.metadata.element`; action không có Element là neutral. Player innate Element resolve từ `spiritRootId`, Monster từ plan. Mutation chỉ match relation được author trực tiếp, không tự fallback parent. Data-driven và dễ dự đoán; cần materialize Player Element.
- **Phương án B — Innate actor vs innate target:** bỏ qua Skill Element, luôn dùng Element của hai entity. Snapshot đơn giản; nhưng skill khác hệ với người dùng không tạo đúng quan hệ và giảm vai trò `skill.element`.
- **Phương án C — Explicit per Action/Effect:** mỗi Action khai báo đầy đủ attacker/defender Element source hoặc relation ID. Tường minh nhất; nhưng lặp content lớn và làm authoring skill/effect nặng.
- **Ưu/nhược điểm chính:** A tận dụng data hiện hữu và không hard-code mutation fallback; B đơn giản nhưng bỏ dữ liệu Skill; C kiểm soát cao nhưng giảm khả năng tái sử dụng.
- **Đề xuất kỹ thuật:** A, exact authored relation only; không có relation là neutral.
- **Phần bị chặn:** Chỉ việc đưa resolved relation vào ExecutionContext/event policy. Structural lookup, validation và battle không có Element relation vẫn hoạt động.
- **Câu trả lời của chủ dự án:** Chọn A và phê duyệt thứ tự `Action -> Effect -> Skill -> NEUTRAL`, defensive override/snapshot theo target, exact authored relation, không fallback innate actor hoặc mutation parent.
- **Kết quả triển khai:** Action/Effect Element được giữ qua normalizer/factory; `ExecutionContext` snapshot offensive Element và relation theo target. Player materialize từ Spirit Root một hệ, Monster từ template/plan, runtime Effect có thể override `defensiveElement`; unknown Element fail-fast.
- **Trạng thái:** RESOLVED
Chọn Phương án A — Skill/Effect Element đối chiếu với innate defensive Element của target, với contract sau.

1. Offensive Element

Element tấn công được resolve một lần cho mỗi Action/ExecutionContext, theo thứ tự ưu tiên:

Action explicit element
→ owning Effect explicit element
→ Skill element
→ NEUTRAL

Không fallback sang innate Element của actor.

Basic Attack mặc định là NEUTRAL.

Vũ khí, công pháp hoặc cơ chế khác chỉ có thể Element hóa Basic Attack bằng cách cung cấp explicit Element cho Action/Effect theo contract trên.

Element đã resolve được snapshot trong ExecutionContext; không đọc lại mutable entity state giữa các hit của cùng Action.

2. Defensive Element

Element phòng thủ được resolve riêng cho từng target:

runtime defensive-element override
→ BattleEntity.metadata.defensiveElement
→ NEUTRAL

Monster materialize defensiveElement từ Monster Template tại BattleEntityFactory.

Player materialize defensiveElement từ Spirit Root nếu Spirit Root xác định chính xác một main Element.

Spirit Root nhiều hệ hoặc không có main Element rõ ràng được materialize thành NEUTRAL cho đến khi có cơ chế chọn Element đang vận hành.

Runtime override chỉ tồn tại theo lifecycle của effect tạo ra nó và phải được snapshot khi relation của Action được resolve.

3. Exact authored relation

Relation chỉ được lookup theo đúng chiều:

offensiveElement → defensiveElement

Không đảo chiều relation.

LIGHTNING, ICE và các mutation Element chỉ dùng relation được author trực tiếp.

Không fallback qua parentElement, ví dụ không tự suy diễn LIGHTNING → WOOD hoặc ICE → WATER.

parentElement chỉ là metadata phân loại, không tạo combat relation ngầm.

4. Neutral behavior

Nếu một trong hai Element là NEUTRAL, hoặc không có exact relation phù hợp:

Resolver trả về không có relation.

Không kích hoạt Element relation Effect.

Damage và Action tiếp tục theo công thức thông thường.

Nếu Formula Context cần một trường numeric để tương thích, giá trị identity có thể là 1.0, nhưng đây không phải multiplier được sinh từ relation và không được xem là semantics của hệ Element.

5. Multi-target

Với Action nhiều target:

Offensive Element dùng chung từ Action/Effect/Skill.

Defensive Element và relation được resolve riêng cho từng target.

Relation của target này không được ảnh hưởng Formula Context của target khác.
---

## Q-COMBAT-011 — Contract thực thi Effect-driven Element relation

- **Bối cảnh:** Chọn C tại `Q-COMBAT-007` loại bỏ direct multiplier hard-code, nhưng relation records hiện chỉ có type/from/to. Effect hiện hành có lifecycle STATUS/INSTANT/TRIGGER và Action pipeline; chưa có contract “temporary modifier chỉ trong một Action” hoặc pre-formula result modifier.
- **Tài liệu liên quan:** `003_EFFECT_SPEC`, `008_ACTION_SPEC`, `ElementRelationResolver`, `BattleActionPipeline`, `EffectEngine`, `FormulaEngine`, `BattleTimings`.
- **Điểm chưa rõ:** relation tham chiếu Effect trực tiếp hay policy record; chạy trước formula, sau formula hay như semantic event; effect thay damage bằng temporary modifier, Action bổ sung hay status; scope và cleanup để không leak sang action sau.
- **Phương án A — Relation tham chiếu scoped Effect:** thêm `effectId`; pipeline execute effect ở `BEFORE_ACTION` với scope `ACTION`, Effect có thể cung cấp modifier/formula input và bị cleanup sau `AFTER_ACTION`. Đúng Effect-driven, hỗ trợ damage/buff/debuff; nhưng cần thêm scoped-effect contract và ordering chi tiết.
- **Phương án B — Relation policy trả Formula multiplier:** thêm `policyId` trỏ tới numeric Formula policy, pipeline truyền multiplier vào damage formula. Dễ balance và không leak state; nhưng thực tế trở lại multiplier-driven, chỉ bọc bằng policy và khó biểu diễn buff/debuff.
- **Phương án C — Typed relation event:** pipeline phát `ON_ELEMENT_RELATION` chứa relation/source/target; Trigger/Effect content lắng nghe và thực thi action. Event-driven, mở rộng tốt; nhưng nếu cần sửa chính hit hiện tại thì phải có pre-formula event/result mutation contract, nếu không effect chỉ tác động sau hit.
- **Ưu/nhược điểm chính:** A phù hợp lựa chọn Effect-driven nhất nhưng thêm scoped runtime; B đơn giản và deterministic nhưng hạn chế semantics; C decoupled nhất nhưng ordering/result mutation phức tạp.
- **Đề xuất kỹ thuật:** A; Effect definition immutable, runtime scoped instance nằm trong ExecutionContext và cleanup bắt buộc ở `AFTER_ACTION`. C có thể bổ sung làm notification sau khi scoped policy ổn định.
- **Phần bị chặn:** Author relation policy fields, validator reference, scoped effect runtime và simulation tương sinh/tương khắc. Không chặn resolver cấu trúc hoặc combat hiện hành.
- **Câu trả lời của chủ dự án:** Chọn A và phê duyệt optional relation `effectId`, Effect capability `ACTION`, pre-formula scoped carrier, modifier isolation, supplemental Action context riêng, causal/depth guard, shared RNG và cleanup trong `finally`.
- **Kết quả triển khai:** Validator kiểm tra Effect reference/ACTION scope; `ActionScopedElementEffectEngine` tạo carrier không lưu trên entity, dùng target-specific Formula stat view, phát duy nhất event quan sát và cleanup sau `AFTER_ACTION` kể cả khi executor lỗi. Relation không có `effectId` giữ nguyên Action Result/RNG behavior.
- **Trạng thái:** RESOLVED
Chọn Phương án A — Relation tham chiếu scoped Effect, với contract thực thi sau.

1. Data contract

Mỗi authored Element relation có thể tham chiếu một Effect:

{
  "relationType": "COUNTER",
  "from": "WATER",
  "to": "FIRE",
  "effectId": "EFFECT_ELEMENT_WATER_COUNTER_FIRE"
}

effectId là optional trong giai đoạn migration.

Relation không có effectId vẫn hợp lệ về cấu trúc nhưng không tạo gameplay behavior.

Validator phải fail-fast khi effectId được khai báo nhưng không tồn tại hoặc không hỗ trợ ACTION scope.

relationType chỉ dùng để phân loại và lookup; bản thân GENERATE hoặc COUNTER không hard-code multiplier, buff hay debuff.

2. Runtime scope

Relation Effect definition là immutable GameData.

Khi relation match, runtime tạo một scoped Effect instance với:

scope = ACTION
owner = current ExecutionContext
source = caster
target = current resolved target
relation = matched relation record

Scoped instance:

Chỉ khả dụng trong Action hiện tại.

Không được thêm vào BattleEntity.effects.

Không tham gia duration tick hoặc status stacking của entity.

Không tồn tại sang Action/turn tiếp theo.

Nếu relation Effect tạo một STATUS Effect thông qua Action chuẩn, STATUS Effect được lưu và vận hành theo lifecycle riêng của nó. Chỉ scoped relation Effect đóng vai trò carrier bị cleanup sau Action.

3. Ordering

Một Action tuân theo thứ tự:

1. Expand/resolve candidate targets
2. Evaluate Conditions và loại target không hợp lệ
3. Phát BEFORE_ACTION đúng một lần
4. Resolve offensive/defensive Element cho từng target
5. Lookup exact Element relation
6. Attach/execute scoped relation Effect trong pre-formula phase
7. Evaluate Formula và thực thi Action
8. Phát semantic hooks từ ordered Action Result
9. Xử lý reactive Defense và ON_DEATH
10. Phát AFTER_ACTION đúng một lần với aggregate Action Result
11. Cleanup toàn bộ ACTION-scoped relation instances

Relation Effect phải được kích hoạt trước Formula của hit hiện tại để có thể cung cấp modifier hoặc formula input cho chính hit đó.

BEFORE_ACTION không được phát thêm lần thứ hai cho relation Effect. Relation processing là một phase bên trong lifecycle hiện tại, không tạo một lifecycle song song.

4. Modifier isolation

Modifier do relation Effect cung cấp phải được lưu trong target-specific Formula Context của ExecutionContext.

Không mutate base stat của caster hoặc target.

Không ghi temporary modifier vào BattleEntity.

Không để modifier của một target ảnh hưởng target khác.

Không để modifier của hit hoặc Action hiện tại rò sang Action tiếp theo.

Khi có nhiều modifier hợp lệ, áp dụng theo ordering chuẩn của Effect/Modifier registry; không phụ thuộc thứ tự object hoặc map runtime.

5. Execution cardinality

Một relation Effect được activate tối đa một lần cho mỗi bộ:

Action ExecutionContext
+ target
+ matched relation record

Không activate lại cho từng bước Formula.

Không activate lại vì semantic event của cùng Action.

Multi-hit nằm trong cùng một Action dùng cùng scoped relation context, trừ khi content mô hình hóa mỗi hit thành một Action riêng.

Supplemental Action do Effect sinh ra có ExecutionContext riêng và có thể tự resolve relation theo contract thông thường.

Runtime phải có causal/depth guard để relation Effect không tự kích hoạt đệ quy vô hạn.

6. RNG và determinism

Mọi chance, roll hoặc target selection của relation Effect phải sử dụng RandomProvider trong current ExecutionContext.

Không được gọi random toàn cục hoặc tạo RNG riêng. Cùng seed và input phải cho cùng relation resolution, Effect result và BattleResult.

7. Cleanup và error handling

Cleanup ACTION scope phải chạy trong finally:

Sau AFTER_ACTION khi Action hoàn tất bình thường.

Vẫn chạy nếu Formula/Effect executor ném lỗi.

Vẫn chạy khi target chết, battle abort hoặc Action bị kết thúc sớm sau khi scoped Effect đã được tạo.

Unknown Element/effect reference hoặc runtime contract bất hợp lệ phải fail-fast; không được im lặng chuyển thành neutral. Chỉ trường hợp hợp lệ nhưng không có exact relation mới được xử lý như neutral.

8. Event contract

MVP chưa cần dùng ON_ELEMENT_RELATION làm cơ chế thực thi chính.

Có thể phát typed event quan sát như ELEMENT_RELATION_APPLIED sau khi relation đã được resolve để phục vụ log, metrics hoặc telemetry, nhưng event này:

Không sửa Formula Result của hit hiện tại.

Không thay thế scoped Effect.

Không làm relation Effect chạy lần thứ hai.

Typed relation event có thể được mở rộng sau nếu dự án cần trigger content độc lập.

9. Compatibility

Khi relation không có effectId, Element là NEUTRAL, hoặc không có exact relation:

Không tạo scoped Effect.

Không thay đổi damage, RNG hoặc Action Result.

Battle hiện hành giữ nguyên behavior.
---

## Q-COMBAT-012 — Nội dung và thông số cho 10 Element relation hiện hữu

- **Bối cảnh:** Runtime Effect-driven relation đã hoàn tất theo `Q-COMBAT-007/010/011`. Cả 10 record `GENERATE`/`COUNTER` hiện chưa khai báo `effectId`, nên hợp lệ trong migration nhưng chủ đích không tạo gameplay. Kiến trúc không cho phép tự suy ra multiplier hoặc modifier từ `relationType`.
- **Tài liệu liên quan:** `src/data/elements/element_relations.json`, `src/data/effects/effects.json`, `src/data/modifiers/modifiers.json`, `Q-COMBAT-007`, `Q-COMBAT-010`, `Q-COMBAT-011`, `ActionScopedElementEffectEngine`.
- **Điểm chưa rõ:** Mỗi cặp relation dùng Effect riêng hay tái sử dụng Effect theo relation type; `GENERATE` và `COUNTER` sẽ tăng/giảm stat nào, tạo Status/Action nào; trị số, chance, target, stacking với modifier khác và yêu cầu balance theo từng cặp chưa được cung cấp.
- **Phương án A — Effect riêng cho từng relation:** Mỗi record khai báo một `effectId` riêng và toàn bộ Action/Modifier được author tường minh. Mở rộng/balance từng cặp tốt nhất, không hard-code; đổi lại cần cung cấp hoặc duyệt 10 bộ behavior/thông số.
- **Phương án B — Effect dùng chung theo relation type:** Tất cả `GENERATE` dùng một Effect và tất cả `COUNTER` dùng một Effect. Ít content, dễ cân bằng baseline; nhưng làm các cặp đồng nhất và relation Effect cần nhận Formula Context chung đủ để tái sử dụng.
- **Phương án C — Giữ metadata-only trong MVP:** Chưa gắn `effectId`; framework sẵn sàng nhưng battle chưa có tương sinh/tương khắc. Không tạo balance ngoài ý muốn và cho phép tiếp tục module khác; đổi lại Element relation chưa có tác động gameplay.
- **Ưu/nhược điểm chính:** A data-driven và linh hoạt nhất nhưng cần nhiều balance data; B triển khai content nhanh hơn nhưng giảm khác biệt; C an toàn nhất trong lúc thiếu số liệu nhưng chỉ hoàn tất nền tảng kỹ thuật.
- **Đề xuất kỹ thuật:** A theo từng đợt content, bắt đầu bằng một cặp có fixture/simulation rồi mở rộng; chưa tự áp dụng cho đến khi Effect Action/Modifier và trị số được duyệt.
- **Phần bị chặn:** Chỉ việc thêm `effectId` thật vào 10 relation và cân bằng tác động gameplay. Schema, validator, runtime scoped Effect, battle hiện hành và các Phase độc lập tiếp tục hoạt động.
- **Câu trả lời của chủ dự án:** Chọn A — mỗi authored relation dùng một Effect riêng.
- **Kết quả triển khai:** Cả 10 relation đã có 10 `effectId` riêng, tham chiếu Core Effect immutable và được validator kiểm tra ACTION scope. Baseline Action/Modifier được hoàn tất theo `Q-COMBAT-013`.
- **Trạng thái:** RESOLVED
---

## Q-COMBAT-013 — Baseline Action/Modifier cho 10 Element relation Effect riêng

- **Bối cảnh:** `Q-COMBAT-012` đã chọn 10 Effect riêng, nhưng lựa chọn đó chỉ xác định identity/reference. Một ACTION-scoped Effect bắt buộc phải có Action hợp lệ; hiện chưa có quyết định về target, modifier, chance hoặc trị số nên không thể tạo 10 Effect definition mà không tự đặt balance.
- **Tài liệu liên quan:** `Q-COMBAT-012`, `element_relations.json`, `effects.json`, `modifiers.json`, `ActionScopedElementEffectEngine`.
- **Điểm chưa rõ:** Baseline của `GENERATE` và `COUNTER` tác động stat nào; dùng modifier hiện hữu hay tạo modifier mới; mức phần trăm; áp lên caster hay target; mọi cặp cùng baseline hay mỗi cặp có behavior riêng.
- **Phương án A — Mười Effect riêng, baseline dùng chung theo type:** Mỗi relation có Effect ID riêng; năm `GENERATE` dùng `ADD_MODIFIER SELF ATK_UP_10`, năm `COUNTER` dùng `ADD_MODIFIER SELF ATK_UP_20`, chance 100%. Triển khai nhanh và vẫn cho phép tách balance từng cặp sau này; nhưng behavior ban đầu chỉ khác theo type và Counter tạo chênh lệch damage lớn.
- **Phương án B — Baseline công/thủ bảo thủ:** Mỗi relation có Effect ID riêng; `GENERATE` dùng `DEF_UP_10` trên caster, `COUNTER` dùng `ATK_UP_10` trên caster, chance 100%. Chênh lệch nhỏ hơn và phân vai tương sinh/tương khắc; nhưng tác dụng DEF trong Action hiện tại thường không ảnh hưởng hit đang tung ra, nên Generate có thể gần như không có giá trị tức thời.
- **Phương án C — Bảng behavior riêng cho từng cặp:** Chủ dự án cung cấp `{from,to,effectId,actions:[...]}` cho cả 10 relation, có thể tái sử dụng modifier hiện hữu hoặc chỉ định modifier mới. Đúng mục tiêu Effect riêng và linh hoạt nhất; cần nhiều dữ liệu balance trước khi triển khai.
- **Ưu/nhược điểm chính:** A có MVP rõ và dễ audit nhưng đồng nhất theo type; B ít burst hơn nhưng pre-formula defense có semantics yếu ở phía tấn công; C chuẩn data-driven nhất nhưng cần bảng thông số đầy đủ.
- **Đề xuất kỹ thuật:** C nếu đã có định hướng balance; nếu mục tiêu là bật gameplay MVP ngay thì A là baseline dễ kiểm chứng nhất. Đây chỉ là đề xuất, chưa áp dụng.
- **Phần bị chặn:** Tạo 10 Core Effect thật, gắn 10 `effectId` và simulation balance. Runtime/scoped isolation và các Phase độc lập không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn A — Effect riêng theo relation, baseline dùng chung theo type.
- **Kết quả triển khai:** Năm `GENERATE` dùng `ADD_MODIFIER SELF ATK_UP_10`, năm `COUNTER` dùng `ADD_MODIFIER SELF ATK_UP_20`, chance 100%. Audit kiểm tra đủ 10 Effect ID duy nhất, ACTION scope, modifier mapping và damage baseline `100 -> 110/120` mà không mutate entity.
- **Trạng thái:** RESOLVED
---

## Q-GATHERING-001 — Transaction boundary cho Gathering completion

- **Bối cảnh:** `GatheringService.gather()` hiện kiểm tra số lượt bằng `COUNT(*) ... completed_at >= CURRENT_DATE`, settle reward qua transaction/idempotency riêng, rồi ghi `player_gathering_runs` sau khi reward đã commit. Hai request đồng thời có thể cùng vượt qua daily check; crash sau reward có thể thiếu progress; retry reward idempotent có thể ghi thêm legacy progress. `activity_runs`, reward claims và atomic period counter đã tồn tại nhưng chưa hợp nhất với Gathering completion.
- **Tài liệu liên quan:** `008_GATHERING_SPEC.md`, `GatheringService`, `RewardRuntimeService`, `RewardApplyService`, `ActivityRunRepository`, `PeriodCounterRepository`, `player_gathering_runs`.
- **Điểm chưa rõ:** Nguồn chuẩn của progress là `activity_runs` hay legacy gathering log; daily limit đếm start hay successful completion; reward, period counter, stamina và progress có bắt buộc cùng transaction; operation ID có bắt buộc khi apply thật hay không.
- **Phương án A — Completion mutation hook trong reward transaction:** Mở rộng RewardApply boundary bằng typed activity-completion mutation; trong cùng idempotent transaction thực hiện period counter, resource cost, reward, legacy progress projection và complete activity run. Ít thay reward pipeline và atomic đầy đủ; cần kiểm soát interface để gameplay module không truyền callback tùy ý.
- **Phương án B — GatheringCompletionService sở hữu transaction:** Tách reward mutation primitive khỏi RewardApplyService; Gathering orchestration reserve/lock, limit, cost, reward, progress và completion trong một transaction. Ownership rõ nhất và dễ test; refactor reward pipeline lớn hơn, cần áp dụng dần cho Exploration/Secret Realm.
- **Phương án C — Saga/reconciliation:** Giữ các transaction riêng, thêm trạng thái pending và worker bù progress/reward. Hợp với activity dài; nhưng phức tạp hơn, có eventual consistency và không cần thiết cho Gathering đồng bộ nếu có thể commit atomically.
- **Đề xuất kỹ thuật:** B cho boundary dài hạn; có thể xây typed completion primitive dùng chung cho các activity thay vì callback tự do. Daily limit nên dùng `player_period_counters` theo `Asia/Ho_Chi_Minh` và chỉ tăng trong completion thành công. Đây là đề xuất, chưa áp dụng.
- **Phần bị chặn:** Chuyển Gathering apply thật sang atomic completion, concurrency limit và loại bỏ duplicate progress. Listing, realm/reward validation và preview reward độc lập vẫn hoạt động.
- **Câu trả lời của chủ dự án:** Chọn B — `GatheringCompletionService` sở hữu transaction; dùng typed completion primitive, daily counter chỉ tăng khi completion thành công.
- **Kết quả triển khai:** `GatheringCompletionService.claim()` khóa activity run và thực hiện daily counter, reward claim/mutation, activity completion cùng legacy progress projection trong một idempotent UnitOfWork. `RewardApplyService` expose typed `applyInTransaction()` primitive; không nhận callback gameplay tự do.
- **Trạng thái:** RESOLVED
---

## Q-GATHERING-002 — Nguồn và semantics của `staminaCost`

- **Bối cảnh:** Hai Gathering template khai báo `staminaCost` 5/10, nhưng Player/Wallet không có resource `STAMINA`, không có regeneration/idle source và runtime chỉ chép cost vào progress log mà không kiểm tra hoặc trừ. Vì vậy UI hiện hiển thị một chi phí không được thực thi.
- **Tài liệu liên quan:** `gathering_templates.json`, `currencies.json`, `idle_sources.json`, `GatheringService`, `PlayerRuntimeRepository`.
- **Điểm chưa rõ:** Stamina là currency/resource nào; balance tối đa/regen; có lazy regeneration hay reset theo kỳ; trừ lúc start hay completion; thiếu stamina trả lỗi nào.
- **Phương án A — Thêm typed STAMINA resource và lazy regeneration:** Đúng semantics stamina phổ biến và dùng checkpoint, không tick write; nhưng mở rộng phạm vi Idle MVP vốn đang chỉ có Cultivation và cần đầy đủ cap/rate/formula.
- **Phương án B — Vô hiệu stamina trong MVP:** Đổi `staminaCost` của content hiện hành về 0 và không hiển thị/ghi cost cho đến khi stamina design được duyệt. Trung thực với runtime, phạm vi nhỏ; Gathering tạm chỉ bị giới hạn bởi realm/daily policy.
- **Phương án C — Dùng consumable item làm vé:** Thay stamina bằng `cost` tham chiếu Item/Currency hiện hữu và trừ atomically. Không cần regeneration; nhưng đổi gameplay từ năng lượng sang vé và cần chọn item/amount.
- **Đề xuất kỹ thuật:** B cho MVP theo quyết định `Q-IDLE-001`; sau này mở A bằng một idle source riêng khi có cap/rate được duyệt. Chưa sửa data.
- **Phần bị chặn:** Kiểm tra/trừ stamina và atomic resource cost. Structural validation vẫn yêu cầu `staminaCost` là số nguyên không âm nhưng không diễn giải gameplay.
- **Câu trả lời của chủ dự án:** Chọn B cho MVP theo `Q-IDLE-001`; sau này có thể mở A bằng idle source riêng khi cap/rate được duyệt.
- **Kết quả triển khai:** Hai template hiện hành có `staminaCost: 0`; Gathering view/result/progress payload không expose hoặc ghi stamina cost. Validator vẫn giữ field số nguyên không âm để tương thích schema tương lai.
- **Trạng thái:** RESOLVED
---

## Q-GATHERING-003 — Semantics của `duration`

- **Bối cảnh:** Template khai báo duration 30/60 nhưng `gather()` trao reward ngay lập tức; không có `startedAt`, `readyAt`, cooldown hoặc running state. Tài liệu chỉ nêu Duration mà không định nghĩa đơn vị và flow start/claim.
- **Tài liệu liên quan:** `008_GATHERING_SPEC.md`, `gathering_templates.json`, `GatheringService`, `activity_runs`.
- **Điểm chưa rõ:** Đơn vị duration; đây là thời gian chờ thật, cooldown sau claim hay metadata hiển thị; người chơi được chạy song song bao nhiêu Gathering; reward roll lúc start hay claim.
- **Phương án A — Start/claim lazy activity:** Duration tính bằng giây; start lưu immutable input và `readyAt`, claim sau thời điểm đó mới roll/apply reward atomically. Không scheduler/tick write và đúng Lazy Evaluation; cần state `IN_PROGRESS/READY/COMPLETED`, concurrency slot và hai operation ID.
- **Phương án B — Cooldown sau completion:** Reward áp ngay, `nextAvailableAt = now + duration`; request tiếp theo kiểm tra timestamp. Đơn giản hơn nhưng duration là cooldown, không phải thời gian thu thập trước reward.
- **Phương án C — Metadata-only trong MVP:** Gathering tiếp tục đồng bộ; duration chỉ hiển thị hoặc tạm bỏ khỏi response. Ít thay đổi nhưng field dễ gây hiểu nhầm và spam chỉ được kiểm soát nếu daily limit khác 0.
- **Đề xuất kỹ thuật:** A nếu Gathering là hoạt động có thời gian; dùng timestamp/lazy claim, không scheduler. Chưa áp dụng vì cần chốt đơn vị, concurrency và roll timing.
- **Phần bị chặn:** Runtime duration/cooldown và activity state. Data validator độc lập chỉ bảo vệ duration là số nguyên dương.
- **Câu trả lời của chủ dự án:** Chọn A — duration tính bằng giây; start/claim dùng timestamp và lazy claim, không scheduler; reward roll/apply tại claim; start và claim có operation ID riêng.
- **Kết quả triển khai:** `start()` persist `started_at`/`ready_at` và immutable input snapshot; `claim()` khóa run, từ chối trước `ready_at`, rồi mới roll/apply reward. `READY` là trạng thái suy ra khi đọc timestamp, không cần scheduler ghi chuyển trạng thái; persistence giữ `IN_PROGRESS` cho đến atomic `COMPLETED`.
- **Trạng thái:** RESOLVED

---

## Q-GATHERING-004 — Giới hạn Gathering đang chạy đồng thời

- **Bối cảnh:** `Q-GATHERING-003` đã chọn start/claim lazy activity. Mỗi start cần reserve một activity run trước `readyAt`; nếu không có slot policy và database constraint, nhiều request đồng thời có thể tạo không giới hạn run `IN_PROGRESS`.
- **Tài liệu/phần code liên quan:** `Q-GATHERING-001`, `Q-GATHERING-003`, `GatheringService`, `activity_runs`, `gathering_templates.json`.
- **Điểm chưa rõ:** Một người chơi được có bao nhiêu Gathering chưa hoàn tất; giới hạn là toàn cục, theo template hay cấu hình bằng data.
- **Phương án A — Một Gathering active trên toàn người chơi:** chỉ cho một run `IN_PROGRESS/READY` bất kể template. Constraint và UX rõ, chống spam tốt, nhưng không thể thu thập nhiều loại song song.
- **Phương án B — Một Gathering active trên mỗi template:** có thể chạy Herb và Mining song song; cần unique active key theo player + content và số active tăng theo content.
- **Phương án C — Slot cấu hình data-driven:** khai báo số slot toàn cục hoặc theo unlock. Linh hoạt nhất nhưng cần thêm progression/balance content chưa tồn tại.
- **Đề xuất kỹ thuật:** A cho MVP; reserve dưới transaction/advisory hoặc player row lock và partial unique active-slot constraint. Sau này mở C bằng policy data mà không đổi start/claim contract.
- **Phần bị chặn:** Migration active Gathering, `start()` concurrency guard và toàn bộ apply thật của `GatheringCompletionService`. Listing, stamina-zero content và Profile không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn A — một Gathering active trên toàn người chơi trong MVP.
- **Kết quả triển khai:** Migration 011 thêm `ready_at`, partial unique index `(player_id) WHERE activity_type = 'GATHERING' AND status = 'IN_PROGRESS'`, ready lookup index và preflight reconciliation guard. Runtime map unique violation thành `GATHERING_ACTIVE_RUN_EXISTS`.
- **Trạng thái:** RESOLVED
---

## Q-COMBAT-008 — Shape và nguồn thống kê của BattleResult

- **Bối cảnh:** Stable `010_BATTLE_RESULT_SPEC` yêu cầu Winner, Loser, Combat Log, Statistics, Survivors, duration và generated events. Runtime hiện trả `winnerTeam`, entity final snapshots, log, events, rounds/turns/duration; loser/survivors có thể suy ra nhưng `Statistics` chưa có schema hoặc nguồn aggregate chính thức.
- **Tài liệu liên quan:** `docs/08_BATTLE/010_BATTLE_RESULT_SPEC.md`, `BattleContext`, `BattleResult`, `ActionExecutor`, `BattleActionPipeline`, Exploration và Secret Realm consumers.
- **Điểm chưa rõ:** Statistics là battle-total hay per-entity; cần gồm damage dealt/taken, shield absorbed, healing, kills, critical, effect application hay các metric nào; aggregate trực tiếp khi mutation hay derive từ generated events; timeout/draw có loser hay không.
- **Phương án A — Derived summary từ event cuối trận:** BattleResult scan event list để tạo loser/survivors và statistics. Ít thay runtime mutation; nhưng phụ thuộc event payload ổn định, tốn scan và có thể double-count nested/semantic events nếu contract thay đổi.
- **Phương án B — Typed battle metrics collector:** BattleContext giữ per-entity counters, mutation boundary ghi đúng một lần, BattleResult chỉ snapshot aggregate. Rõ ownership, nhanh và đáng tin cậy; nhưng cần chốt metric schema và thêm instrumentation cho từng Action result.
- **Phương án C — Giữ result tối thiểu:** consumers tự suy ra từ entities/events khi cần. Không thêm code; nhưng không đạt đầy đủ Stable spec và mỗi consumer có thể tính khác nhau.
- **Ưu/nhược điểm chính:** A thuận tiện cho retrofit nhưng coupling event schema; B contract mạnh nhất nhưng cần quyết định metric; C đơn giản nhưng tạo nhiều nguồn diễn giải.
- **Đề xuất kỹ thuật:** B, với schema metric tối thiểu được chủ dự án duyệt trước khi instrument. Không tự chọn danh sách metric hoặc draw semantics.
- **Phần bị chặn:** Chỉ BattleResult statistics/explicit loser-survivor contract. Battle outcome, reward settlement, logs và entity snapshots hiện tại tiếp tục hoạt động.
- **Câu trả lời của chủ dự án:** Chọn B và phê duyệt baseline typed metrics collector được mô tả bên dưới.
- **Approved baseline:** BattleContext sở hữu collector; mutation boundary là nguồn chuẩn; scope battle + per-entity; amount dùng integer-string; không derive từ Combat Log/events; outcome có WIN/DRAW/ABORTED.
- **Quyết định thay thế ngày 2026-07-24:** Giới hạn toàn trận là 15 hiệp. Nếu hết hiệp 15 mà chưa có phe thắng thì outcome canonical là `DRAW`, `winnerTeam/loserTeam = null`, `isDraw = true`, `drawReason = ROUND_LIMIT`. Không dùng `TIMEOUT` hoặc error làm kết quả/UI; event kỹ thuật là `BATTLE_ROUND_LIMIT_REACHED`.

đề xuất của tôi có thể tham khảo
BattleContext sở hữu một metrics collector trong suốt trận đấu. Mọi mutation boundary cập nhật metric đúng một lần. BattleResult chỉ snapshot dữ liệu đã aggregate, không scan lại Combat Log hoặc generated events để tính statistics.

Statistics scope

Statistics được lưu theo hai cấp:

battle total
per entity

Battle total dùng để tóm tắt toàn trận. Per-entity statistics dùng cho profile trận đấu, quest, achievement, telemetry và balance.

Metric tối thiểu cho MVP

Mỗi entity có:

{
  "entityId": "ENTITY_ID",
  "teamId": "TEAM_ID",
  "damageDealt": "0",
  "damageTaken": "0",
  "healingDone": "0",
  "healingReceived": "0",
  "shieldGranted": "0",
  "shieldAbsorbed": "0",
  "kills": 0,
  "deaths": 0,
  "criticalHits": 0,
  "actionsTaken": 0,
  "actionsSkipped": 0,
  "effectsApplied": 0
}

Các amount lớn dùng string-safe numeric hoặc fixed decimal theo numeric policy chung.

Counter như kills, criticalHits có thể dùng integer an toàn.

Battle-total statistics

{
  "totalDamage": "0",
  "totalHealing": "0",
  "totalShieldAbsorbed": "0",
  "totalActions": 0,
  "totalTurns": 0,
  "totalRounds": 0
}

Battle total có thể được cập nhật song song với per-entity metric hoặc được tổng hợp từ metrics collector khi tạo result.

Không derive từ Combat Log.

Ownership của từng metric

Damage

Khi damage đã qua defense, resistance, shield và modifier cuối cùng:

damageDealt tăng theo lượng HP damage thực tế gây ra.

damageTaken tăng theo lượng HP damage thực tế target nhận.

Damage bị shield hấp thụ không tính vào HP damageTaken.

Lượng shield hấp thụ được ghi riêng vào shieldAbsorbed.

Không dùng raw damage trước mitigation cho damageDealt.

Nếu sau này cần metric raw damage, thêm field riêng như:

rawDamageGenerated

Không thay đổi nghĩa metric hiện tại.

Healing

healingDone và healingReceived chỉ tính effective healing:

min(requestedHealing, missingHp)

Overheal không tính vào effective healing.

Nếu cần telemetry overheal, thêm field riêng sau.

Shield

shieldGranted: lượng shield thực sự được thêm sau cap/rule.

shieldAbsorbed: lượng incoming damage thực tế bị shield chặn.

Shield hết hạn mà chưa dùng không tính là absorbed.

Kill và death

Khi entity chuyển từ alive sang dead:

source hợp lệ nhận kills += 1;

target nhận deaths += 1.

Một entity chỉ được tính death một lần trong một life state.

Damage over time hoặc reflected damage phải giữ source attribution rõ để tính kill.

Nếu không xác định được source hợp lệ, death vẫn tăng nhưng không cộng kill cho entity nào.

Critical hit

criticalHits tăng khi một hit được resolve là critical và thực sự thực hiện damage execution.

Không tăng critical counter nếu action bị skip hoặc target không hợp lệ trước khi hit diễn ra.

Action

actionsTaken: Skill hoặc Basic Attack đã bắt đầu execution hợp lệ.

actionsSkipped: action bị control directive như STUN hoặc FREEZE chặn.

Silence dẫn tới Basic Attack vẫn tính là một action taken.

Turn không có target hợp lệ cần một result code riêng; MVP có thể tính skipped nếu Battle Engine đã bắt đầu lượt nhưng không thể thực hiện action.

Effect application

effectsApplied tăng khi một Effect instance được áp dụng thành công.

Không tăng khi:

target immune;

validation thất bại;

effect bị reject do stack rule;

condition false.

Refresh hoặc stack thêm có thể được tính là application thành công nếu Effect Runtime trả result APPLIED, REFRESHED hoặc STACKED. Nếu cần phân biệt, bổ sung metric riêng sau.

Metrics Collector API

Collector nên expose các method typed, ví dụ:

recordDamage(...)
recordHealing(...)
recordShieldGranted(...)
recordShieldAbsorbed(...)
recordKill(...)
recordActionTaken(...)
recordActionSkipped(...)
recordEffectApplied(...)

Không cho Action Executor tự sửa object statistics tùy ý.

Mỗi method phải được gọi tại mutation boundary đã xác định, tránh ghi metric từ cả Action Executor và generated event subscriber gây double-count.

BattleResult shape

BattleResult cuối cùng gồm tối thiểu:

{
  "outcome": "TEAM_A_WIN",
  "winnerTeamId": "TEAM_A",
  "loserTeamId": "TEAM_B",
  "isDraw": false,
  "survivors": [],
  "entities": [],
  "combatLog": [],
  "events": [],
  "statistics": {
    "battle": {},
    "entities": []
  },
  "rounds": 0,
  "turns": 0,
  "durationMs": 0
}

Tên field thực tế phải theo naming convention hiện tại, nhưng semantics giữ như trên.

Winner, Loser và Draw

Outcome phải là field chuẩn, không chỉ dựa vào nullable winner.

Baseline:

TEAM_A_WIN
TEAM_B_WIN
DRAW
ABORTED

Quy tắc:

Khi một team thắng:

có winnerTeamId;

có loserTeamId;

isDraw = false.

Khi draw:

winnerTeamId = null;

loserTeamId = null;

isDraw = true.

Khi đạt giới hạn 15 hiệp mà chưa phân thắng bại:

outcome = DRAW;

winner/loser đều null;

drawReason = ROUND_LIMIT.

Khi trận bị lỗi hoặc hủy:

outcome = ABORTED;

không trao reward.

Policy cũ tách TIMEOUT khỏi DRAW đã được quyết định ngày 2026-07-24 thay thế.

Survivors

survivors được snapshot trực tiếp từ final battle entities:

entity còn alive tại thời điểm battle kết thúc

Survivor entry nên chứa tối thiểu:

entityId

teamId

currentHp

maxHp

Không cần scan event để suy ra ai sống.

Generated events và metrics

Events phục vụ:

replay;

audit;

trigger;

UI combat log;

integration consumer.

Metrics phục vụ:

summary;

achievement;

quest;

telemetry;

balance.

Events và metrics có thể mô tả cùng một hành vi nhưng không được dùng đồng thời làm hai nguồn aggregate độc lập.

Mutation boundary là nguồn chuẩn của metrics.

Determinism

Metrics không được làm thay đổi battle outcome hoặc RNG order.

Collector chỉ ghi nhận kết quả đã resolve.

Hai trận cùng seed và input phải tạo cùng:

outcome;

events;

final snapshots;

statistics.

Không triển khai trong MVP

Chưa cần:

damage theo từng Element;

damage theo từng Skill;

uptime buff/debuff;

average damage per turn;

threat;

crowd-control duration;

overkill;

overheal;

dodge/block/miss chi tiết;

damage raw trước mitigation.

Có thể thêm sau bằng metric fields mới hoặc telemetry event riêng mà không đổi nghĩa các field MVP.

- **Kết quả triển khai:** Đã thêm typed `BattleMetricsCollector`, instrument một lần tại mutation boundary và snapshot immutable vào BattleResult. Result có `outcome`, winner/loser, draw flag, survivors, battle/per-entity statistics; actual HP damage được clamp theo HP còn lại, shield absorption và effective healing tách riêng; total turns dùng collector thay vì turn index cuối round.
- **Trạng thái:** RESOLVED
---

## Q-COMBAT-009 — Đơn vị và materialization đầy đủ Battle Stat

- **Bối cảnh:** `BattleEntity` và `FormulaEngine` đã khai báo HP/ATK/DEF/SPD cùng CRIT, CDMG, PEN, SKD, LS, SHD, CCR, TEN, FINAL_DAMAGE, FINAL_DEFENSE, HIT_RATE, CONTROL_IMMUNITY, LUK. `BattleEntityFactory.calculateBattleStats()` hiện chỉ materialize 6 stat đầu và làm rơi modifier của các stat còn lại. Core Attribute data lại biểu diễn percent theo percentage point (`CRIT.defaultValue = 5`, `HIT_RATE = 100`, modifier `CRIT_UP_10 = ADD 10`), trong khi một số runtime behavior dùng fraction/multiplier (`random < critRate`, `critDamage = 1.5`) và percent modifier khác đã normalize về `0.1`.
- **Tài liệu liên quan:** `attributes.json`, `modifiers.json`, `GameDataNormalizer`, `StatCalculator`, `RuntimePlayerFactory`, `BattleEntityFactory`, `BattleEntity`, `FormulaEngine`.
- **Điểm chưa rõ:** canonical unit của các stat percent là percentage point hay fraction; CDMG lưu `50` bonus hay multiplier `1.5`; modifier ADD trên percent có cần chia 100; default secondary stat lấy từ Attribute registry hay hard-code BattleEntity; cap/clamp cho từng stat áp dụng ở snapshot hay lúc formula sử dụng.
- **Phương án A — Fraction canonical trong runtime:** mọi percent thành `[0,1]`, CDMG thành multiplier; factory convert Attribute defaults và modifier theo type. Formula đơn giản, nhưng phải phân biệt flat numeric và percentage-point ADD khi normalize, đồng thời thay đổi nhiều snapshot hiện tại.
- **Phương án B — Percentage-point canonical:** runtime giữ CRIT/PEN/LS/CCR… theo `0..100`, CDMG giữ bonus percent; Formula/behavior convert tại điểm dùng. Khớp JSON hiện hữu và dễ author data; nhưng cần converter rõ ràng, nếu quên convert sẽ gây lỗi lớn như critical hiện tại.
- **Phương án C — Typed stat value:** mỗi stat mang `{ value, unit }`, Stat Registry điều phối conversion/cap. An toàn schema và mở rộng nhất; nhưng làm BattleEntity/Formula DSL nặng hơn đáng kể cho MVP.
- **Ưu/nhược điểm chính:** A tối ưu runtime math nhưng migration/normalization phức tạp; B gần source data nhất nhưng đòi hỏi usage boundary chặt; C loại ambiguity tốt nhất nhưng tăng độ phức tạp toàn pipeline.
- **Đề xuất kỹ thuật:** B, dùng Attribute registry làm nguồn default/min/max và helper duy nhất convert percentage point sang probability/multiplier tại Formula/Effect boundary. Chưa áp dụng đề xuất này.
- **Phần bị chặn:** Mở rộng BattleEntityFactory cho toàn bộ stat, sửa critical/CDMG semantics và audit modifier propagation. HP/ATK/DEF/SPD cùng behavior hiện hành vẫn tiếp tục hoạt động; API target legacy không phụ thuộc stat đã được loại bỏ.
- **Câu trả lời của chủ dự án:** Chọn B — percentage-point canonical, Attribute registry là nguồn default/min/max, conversion tại Formula/Effect usage boundary.
- **Kết quả triển khai:** Thêm Battle Stat policy 19 stat; BattleEntityFactory materialize player/monster snapshot từ Attribute registry và modifier, hỗ trợ `SET`; CRIT/CDMG giữ percentage point và Formula boundary convert sang probability/multiplier. Bổ sung mapping SHD/REG/REF; audit xác nhận secondary/special stats không còn bị drop.
- **Trạng thái:** RESOLVED
---

## Q-MONSTER-002 — Reward table cho Monster cảnh giới Nguyên Anh

- **Bối cảnh:** Khi triển khai phương án B của `Q-MONSTER-001`, validator xác nhận `TPL_MON_DRAGON_001` dùng alias `BASIC_MONSTER_DROP` tại realm `NGUYEN_ANH`. `reward_tables.json` hiện chỉ có `MONSTER_LUYEN_KHI` và `MONSTER_TRUC_CO`, nên không có reward table hợp lệ để map cho Nguyên Anh.
- **Tài liệu liên quan:** `src/data/monster/monster_template.json`, `src/data/monster/monster_rules.json`, `src/data/reward_tables.json`, `Q-MONSTER-001`.
- **Điểm chưa rõ:** Nguyên Anh cần reward table riêng với nội dung nào, được phép tạm dùng bảng của Trúc Cơ, hay Dragon template phải tạm ngừng xuất hiện cho đến khi có balance data?
- **Phương án A — Tạo `MONSTER_NGUYEN_ANH`:** Progression/economy đúng theo cảnh giới và mở rộng tự nhiên; cần chủ dự án cung cấp hoặc phê duyệt roll count, currency range, item/equipment chance cụ thể.
- **Phương án B — Mapping tạm về `MONSTER_TRUC_CO`:** Không cần đặt thông số mới và runtime hoạt động ngay; phần thưởng Nguyên Anh có thể thấp đáng kể và phải được đánh dấu là fallback tạm thời.
- **Phương án C — Tạm vô hiệu hóa Dragon Nguyên Anh:** Không làm sai economy; giảm content khả dụng và cần cơ chế enabled/content gating trong GameData.
- **Ưu/nhược điểm chính:** A đúng thiết kế dài hạn nhưng thiếu balance numbers; B đơn giản nhất nhưng tạo economy debt; C an toàn về reward nhưng thêm content-state contract.
- **Đề xuất kỹ thuật:** Phương án A cho dài hạn. Nếu chưa có thông số balance, chọn B rõ ràng như fallback tạm thời để hoàn tất pipeline và thay bằng bảng riêng sau.
- **Phần bị chặn:** Mapping đầy đủ của `BASIC_MONSTER_DROP`, strict bootstrap validation và reward settlement cho `TPL_MON_DRAGON_001`. Mapping Luyện Khí/Trúc Cơ và resolver đã có nhưng chưa thể chuyển Q-MONSTER-001 sang RESOLVED khi toàn bộ template chưa hợp lệ.
- **Câu trả lời của chủ dự án:** Chọn phương án A — tạo reward table riêng `MONSTER_NGUYEN_ANH`.
- **Kết quả:** Đã thêm `MONSTER_NGUYEN_ANH`; thông số balance được chốt tại `Q-MONSTER-003`.
- **Trạng thái:** RESOLVED

---

## Q-MONSTER-003 — Thông số balance của `MONSTER_NGUYEN_ANH`

- **Bối cảnh:** `Q-MONSTER-002` đã chọn tạo bảng riêng, nhưng tài liệu không có công thức scale monster reward. Hai mẫu hiện tại là Luyện Khí `10–20` Linh Thạch và Trúc Cơ `20–40`; không có bảng Kết Đan để xác định Nguyên Anh tăng theo tier liền kề hay theo chỉ số cảnh giới tuyệt đối. Hai mẫu cũng dùng tên field equipment chance khác nhau.
- **Tài liệu liên quan:** `src/data/reward_tables.json`, `docs/01_FOUNDATION/007_REWARD_SYSTEM_SPEC.md`, `Q-MONSTER-002`.
- **Điểm chưa rõ:** `rollCount`, khoảng Linh Thạch, tỷ lệ Equipment, grade distribution, Breakthrough Pill và Secret Realm Ticket của Nguyên Anh chưa được quy định.
- **Phương án A — Extrapolate theo chỉ số đại cảnh giới:** `rollCount: 3`, Linh Thạch `80–160` (gấp đôi qua Luyện Khí -> Trúc Cơ -> Kết Đan -> Nguyên Anh), Equipment `10%`, Pill `5%`, Ticket `2%`; progression rõ nhưng tăng source currency mạnh khi chưa đối chiếu sink.
- **Phương án B — Tăng bảo thủ một tier từ bảng hiện có:** `rollCount: 3`, Linh Thạch `40–80`, Equipment `10%`, Pill `5%`, Ticket `2%`; ít rủi ro inflation hơn nhưng không phản ánh khoảng cách thiếu bảng Kết Đan.
- **Phương án C — Chủ dự án cung cấp bộ số riêng:** balance chính xác theo ý đồ; cần đủ `rollCount`, currency min/max và chance/distribution từng reward component.
- **Contract equipment chung cho A/B:** dùng field chuẩn `gradeChances` `{ LOW: 70, MEDIUM: 25, HIGH: 5 }`, `realmOffset: 0`, giữ type chances như bảng Luyện Khí hiện tại để tránh tiếp tục schema lệch.
- **Đề xuất kỹ thuật:** Phương án B làm baseline an toàn, sau đó balance bằng telemetry source/sink; không tự áp dụng trước khi được duyệt.
- **Phần bị chặn:** Chưa thêm `MONSTER_NGUYEN_ANH`, chưa thêm mapping alias Nguyên Anh, strict GameData bootstrap và Exploration reward vẫn bị chặn. Combat in-memory độc lập không bị ảnh hưởng.
- **Câu trả lời của chủ dự án:** Chọn phương án C và cung cấp baseline riêng: `rollCount: 1`, Linh Thạch `80–160`, Equipment `8%`, Pill `3%`, Ticket `1%`, grade `70/25/5`, `realmOffset: 0`.
- **Kết quả:** Đã thêm table, mapping order 4, strict validation và audit runtime; chi tiết quyết định giữ bên dưới.
- **Trạng thái:** RESOLVED

* **Chi tiết quyết định của chủ dự án:** Chọn **Phương án C — cung cấp bộ số riêng**, nhưng toàn bộ logic scale phải theo dữ liệu cảnh giới động, không hard-code tên hoặc số lượng cảnh giới.

  Quái vật luôn được cân bằng tại:

  ```text
  realmStage = 1
  ```

  của đại cảnh giới được khai báo trong Monster Template.

  `MONSTER_NGUYEN_ANH` là reward table cho monster có `realmId` tương ứng với cảnh giới Nguyên Anh trong registry hiện tại. Nếu sau này thêm, xóa hoặc sắp xếp lại cảnh giới, runtime không được phụ thuộc vào chuỗi tên cảnh giới viết cứng trong code.

  Thông số baseline cho reward table hiện tại:

  * `rollCount`: `1`
  * Linh Thạch: `80–160`
  * Equipment chance: `8%`
  * Equipment `realmOffset`: `0`
  * Equipment grade distribution:

    * `LOW`: `70%`
    * `MEDIUM`: `25%`
    * `HIGH`: `5%`
  * Breakthrough Pill chance: `3%`
  * Secret Realm Ticket chance: `1%`

  ### Quy tắc scale động theo cảnh giới

  Mỗi cảnh giới cần có một giá trị thứ tự ổn định, ví dụ:

  ```json
  {
    "id": "NGUYEN_ANH",
    "order": 4
  }
  ```

  Reward cơ bản được xác định từ `realm.order` hoặc `rewardTier`, không suy ra từ tên hiển thị.

  Ví dụ công thức currency baseline:

  ```text
  minCurrency = baseMin × currencyGrowthFactor^(realmOrder - baseRealmOrder)
  maxCurrency = baseMax × currencyGrowthFactor^(realmOrder - baseRealmOrder)
  ```

  Với baseline hiện tại:

  ```text
  baseMin = 10
  baseMax = 20
  currencyGrowthFactor = 2
  ```

  Cảnh giới có `order = 4` sẽ cho:

  ```text
  minCurrency = 80
  maxCurrency = 160
  ```

  Tỷ lệ reward hiếm không bắt buộc tăng gấp đôi. Chúng phải được lấy từ reward scaling definition hoặc cấu hình từng tier để tránh inflation.

  ### Quy tắc Monster

  Monster Template chỉ cần lưu:

  ```json
  {
    "realmId": "NGUYEN_ANH",
    "realmStage": 1
  }
  ```

  Runtime lấy:

  ```text
  monster.realmId
  → Realm Registry
  → realm.order hoặc rewardTier
  → Monster Reward Scaling
  → reward table cuối cùng
  ```

  Không dùng:

  ```text
  if realmId === "NGUYEN_ANH"
  ```

  trong Combat Engine, Reward Resolver hoặc Discord Command.

  ### Cấu hình đề xuất

  Có thể dùng một trong hai mô hình:

  1. Mỗi cảnh giới khai báo `monsterRewardTier`.
  2. Một file `monster_reward_scaling.json` ánh xạ theo `realmId` hoặc `realmOrder`.

  Ưu tiên khai báo rõ bằng dữ liệu thay vì chỉ tính toàn bộ bằng công thức, vì tỷ lệ Equipment, Pill và Ticket thường cần balance riêng.

* **Kết quả:** Có thể thêm `MONSTER_NGUYEN_ANH` cho dữ liệu hiện tại, đồng thời runtime phải resolve reward theo Realm Registry động. Không hard-code chuỗi cảnh giới hoặc giả định game luôn có đúng bốn đại cảnh giới.



---

## Q-ROADMAP-001 — Quan hệ với roadmap đang LOCKED

- **Bối cảnh:** Yêu cầu hiện tại cần một roadmap chi tiết mới, trong khi `docs/00_PROJECT/000_PROJECT_PRINCIPLES.md` và `docs/00_PROJECT/004_PROJECT_ROADMAP.md` quy định roadmap hiện tại đã `LOCKED`.
- **Tài liệu liên quan:** `docs/00_PROJECT/000_PROJECT_PRINCIPLES.md`, `docs/00_PROJECT/004_PROJECT_ROADMAP.md`, yêu cầu hiện tại.
- **Điểm chưa rõ:** Roadmap mới là bản thay thế chính thức hay là kế hoạch mở rộng/bản đồ triển khai bổ sung cho roadmap đã khóa?
- **Phương án A — Roadmap bổ sung:** Giữ file LOCKED, dùng `docs/ROADMAP_DATABASE_ARCHITECTURE.md` làm kế hoạch chi tiết.
  - Ưu: không phá vỡ governance hiện tại; dễ đối chiếu.
  - Nhược: tồn tại hai tài liệu roadmap, cần quy định tài liệu nào điều khiển sprint.
- **Phương án B — Phát hành Roadmap v2:** Tạo design decision/version mới rồi thay thế roadmap điều khiển dự án.
  - Ưu: một nguồn kế hoạch duy nhất.
  - Nhược: thay đổi quyết định đã khóa và cần cập nhật TODO/context/changelog.
- **Đề xuất kỹ thuật:** Phương án A trước; chỉ chuyển sang B sau khi chủ dự án phê duyệt version mới.
- **Phần bị chặn:** Không thay đổi roadmap/TODO đang LOCKED; chưa gán roadmap mới làm sprint chính thức.
- **Câu trả lời của chủ dự án:** Chọn phương án A — roadmap bổ sung.
- **Kết quả:** Đã cập nhật roadmap và ghi ADR2-001.
- **Trạng thái:** RESOLVED

---

## Q-REWARD-003 — Business identity của reward claim theo activity

- **Bối cảnh:** `reward_claims` cần unique `(player_id, claim_type, source_ref)` để chống nhận một business reward bằng operation ID mới. Treasure Hunt, Exploration, Gathering và Secret Realm hiện chưa có `activity_runs` ID; dùng `rewardTableId` sẽ chặn sai các lần chơi hợp lệ tiếp theo.
- **Tài liệu liên quan:** `docs/01_FOUNDATION/007_REWARD_SYSTEM_SPEC.md`, `docs/10_GAMEPLAY/012_REWARD_RUNTIME_SPEC.md`, `docs/11_PLATFORM/015_IDEMPOTENCY_SPEC.md`, Phase 3/6 trong `ROADMAP_DATABASE_ARCHITECTURE.md`.
- **Điểm chưa rõ:** `source_ref` chuẩn của reward lặp lại theo activity phải là Discord operation ID, execution/progress log ID riêng từng source, hay activity-run ID chung.
- **Phương án A — Operation ID:** triển khai ngay và chống retry cùng adapter; không chống một business completion được gửi lại bằng operation ID mới.
- **Phương án B — Activity run ID chung:** identity/audit thống nhất, phù hợp replay và multi-worker; cần đưa một phần `activity_runs` của Phase 6 lên sớm.
- **Phương án C — Source-specific execution ID:** tận dụng treasure/exploration/gathering/secret-realm log hiện có; ít schema mới nhưng RewardApply phải biết nhiều loại source và transaction hiện tại đang tách rời.
- **Ưu/nhược điểm chính:** A đơn giản nhưng business dedup yếu; B sạch và mở rộng nhất nhưng tăng phạm vi; C chuyển tiếp nhanh hơn B nhưng coupling cao và khó hợp nhất activity sau này.
- **Đề xuất kỹ thuật:** Phương án B; tạo activity-run header trước khi roll, dùng run ID làm `source_ref`, rồi claim/progress/reward/ledger tham chiếu cùng run trong một transaction hoàn tất.
- **Phần bị chặn:** Nối `RewardApplyService` vào `reward_claims`, permanent business key và resource ledger; migration/header repository độc lập vẫn triển khai được.
- **Câu trả lời của chủ dự án:** Chọn phương án B — dùng activity run ID chung làm business `source_ref`.
- **Kết quả:** Mở khóa activity-run header, reward claim, permanent business key và reward ledger dùng chung run identity.
- **Trạng thái:** RESOLVED
---

## Follow-up parameters

Các câu dưới đây chỉ hỏi thông số chưa có trong câu trả lời kiến trúc. Chúng không chặn các phần độc lập.

## Q-DB-003 — Precision và scale của NUMERIC

- **Bối cảnh:** Đã chọn BIGINT identity + NUMERIC/string-safe mapping, nhưng chưa có precision/scale cuối cùng.
- **Tài liệu liên quan:** ADR2-003, `cultivation_rules.json`, realm/currency data.
- **Điểm chưa rõ:** Dùng một type chung hay scale theo từng resource; quy tắc rounding ở persistence boundary.
- **Phương án A — `NUMERIC(30,6)` chung:** đơn giản; currency nguyên vẫn cần enforce scale 0 ở domain.
- **Phương án B — Theo resource:** currency `NUMERIC(30,0)`, cultivation `NUMERIC(30,6)`; invariant rõ hơn.
- **Phương án C — `NUMERIC(38,12)` chung:** headroom lớn; storage/output dài hơn cần thiết.
- **Đề xuất kỹ thuật:** B, rounding `HALF_UP` cho cultivation và không ép qua JavaScript Number.
- **Phần bị chặn:** DDL amount cuối cùng và lazy cultivation persistence.
- **Câu trả lời của chủ dự án:** Chọn phương án B — precision/scale theo từng resource.
- **Kết quả:** Đã define currency/resource `NUMERIC(30,0)`, cultivation `NUMERIC(30,6)`, rate/config `NUMERIC(18,8)`, item quantity ưu tiên BIGINT.
- **Trạng thái:** RESOLVED

Quyết định chi tiết:

### Quy tắc kiểu dữ liệu

- Các loại tiền và tài nguyên chỉ cho phép số nguyên:
  - Dùng `NUMERIC(30,0)`.
  - Ví dụ: linh thạch, điểm cống hiến, vé, token, số lượng nguyên liệu.
- Tu vi và các giá trị tích lũy có thể phát sinh phần lẻ từ Lazy Evaluation:
  - Dùng `NUMERIC(30,6)`.
- Tỷ lệ, hệ số và phần trăm cấu hình:
  - Dùng `NUMERIC(18,8)` hoặc kiểu phù hợp trong bảng/config tương ứng.
  - Không dùng chung cột amount với balance của người chơi.
- Số lượng item trong inventory:
  - Ưu tiên `BIGINT` nếu chắc chắn luôn là số nguyên và không vượt phạm vi.
  - Chỉ dùng `NUMERIC(30,0)` khi cần thống nhất với economy cực lớn.

## Q-BREAK-002 — Tỷ lệ cultivation mất khi đột phá thất bại

- **Bối cảnh:** Đã chọn penalty theo phần trăm cấu hình nhưng chưa có giá trị.
- **Tài liệu liên quan:** ADR2-008, `breakthroughs.json`.
- **Điểm chưa rõ:** Một tỷ lệ toàn game hay mỗi transition; tính trên cultivation hiện có hay ngưỡng yêu cầu.
- **Phương án A — Global percent trên required cultivation:** data gọn, dễ hiểu.
- **Phương án B — Mỗi transition một percent trên required cultivation:** balance linh hoạt, cần điền 14 giá trị.
- **Phương án C — Percent trên cultivation hiện có:** scale theo số dư và có thể gây mất mát ngoài dự kiến.
- **Đề xuất kỹ thuật:** B; thêm `failureCultivationLossPercent` từng transition và tính trên required cultivation.
- **Phần bị chặn:** Logic penalty và data breakthrough.
- **Câu trả lời của chủ dự án:** Chọn phương án B; mỗi transition mất 25% required cultivation, clamp theo current cultivation.
- **Kết quả:** Đã thêm `failureCultivationLossPercent: 25` vào toàn bộ breakthrough transition và validator.
- **Trạng thái:** RESOLVED

Quy tắc

Mỗi breakthrough transition khai báo:

{
  "failureCultivationLossPercent": 25
}

Công thức:

cultivationLoss
= requiredCultivation × failureCultivationLossPercent / 100

Không tính penalty trên tổng cultivation hiện có của người chơi.

Sau khi tính:

actualLoss = min(currentCultivation, calculatedLoss)

Điều này bảo đảm cultivation không bao giờ âm.

## Q-IDEMPOTENCY-002 — Retention của idempotency record

- **Bối cảnh:** Operation ID trung lập đã được duyệt; chưa có thời gian lưu response dedup.
- **Tài liệu liên quan:** ADR2-014, schema Phase 1.
- **Điểm chưa rõ:** Giữ record 7 ngày, 30 ngày hay theo loại operation?
- **Phương án A — 7 ngày:** ít storage; retry dài ngày không được dedup.
- **Phương án B — 30 ngày:** cân bằng vận hành; cần cleanup batch.
- **Phương án C — Theo operation:** business key một lần giữ vĩnh viễn, cached response thường 30 ngày.
- **Đề xuất kỹ thuật:** C.
- **Phần bị chặn:** Cleanup/partition policy; unique operation schema vẫn triển khai độc lập.
- **Câu trả lời của chủ dự án:** Chọn phương án C — retention theo operation.
- **Kết quả:** Cached response giữ 30 ngày; business key của one-time claim giữ vĩnh viễn; đã define trong idempotency rules.
- **Trạng thái:** RESOLVED
## Q-ECONOMY-002 — Mốc bắt đầu tuần

- **Bối cảnh:** Timezone đã chốt `Asia/Ho_Chi_Minh`; weekly limit cần boundary chính xác.
- **Tài liệu liên quan:** ADR2-015, shop/exchange/scheduler specs.
- **Điểm chưa rõ:** Tuần bắt đầu Thứ Hai hay Chủ Nhật, tại mấy giờ.
- **Phương án A — Thứ Hai 00:00:** phù hợp ISO week.
- **Phương án B — Chủ Nhật 00:00:** phù hợp một số lịch sự kiện.
- **Phương án C — Theo event:** linh hoạt nhưng không phù hợp default economy week.
- **Đề xuất kỹ thuật:** A theo `Asia/Ho_Chi_Minh`.
- **Phần bị chặn:** Weekly `period_key` và counter.
- **Câu trả lời của chủ dự án:** Chọn phương án A — Thứ Hai 00:00 theo `Asia/Ho_Chi_Minh`.
- **Kết quả:** Đã cập nhật `economy_rules.json`.
- **Trạng thái:** RESOLVED
## Q-REWARD-002 — Reward overflow khi inventory đầy

- **Bối cảnh:** Reward claim đã chốt all-or-nothing; item rules có giới hạn slot.
- **Tài liệu liên quan:** ADR2-016, `item_rules.json`, Reward Runtime spec.
- **Điểm chưa rõ:** Khi inventory hết slot, rollback để claim lại hay chuyển reward sang nơi tạm giữ?
- **Phương án A — Rollback, claim chưa hoàn tất:** ít hệ thống mới; người chơi phải dọn túi rồi claim lại.
- **Phương án B — Reward mailbox:** UX tốt; cần domain/schema/expiry mới.
- **Phương án C — Overflow ledger:** audit đơn giản hơn mailbox UI; vẫn cần command nhận lại.
- **Đề xuất kỹ thuật:** A cho MVP, nâng lên B khi có mailbox design.
- **Phần bị chặn:** Final RewardApply behavior khi inventory full.
- **Câu trả lời của chủ dự án:** Chọn phương án A — rollback và giữ claim retryable.
- **Kết quả:** Đã define `ROLLBACK_RETRYABLE`; RewardApply phải kiểm tra capacity trước mutation.
- **Trạng thái:** RESOLVED
## Q-DB-001 — Công cụ migration PostgreSQL

- **Bối cảnh:** `package.json` có Prisma và `pg`, nhưng schema hiện được tạo bằng câu SQL trong `src/database/initDB.js`.
- **Tài liệu liên quan:** `package.json`, `src/database/initDB.js`, `docs/11_PLATFORM/003_DATABASE_SPEC.md`.
- **Điểm chưa rõ:** Migration chuẩn sẽ dùng Prisma Migrate, SQL migration thuần, hay tiếp tục DDL lúc bootstrap?
- **Phương án A — SQL migration thuần + pg:** Kiểm soát tốt PostgreSQL, constraint/index/locking rõ ràng; phải tự quản lý tooling và rollback.
- **Phương án B — Prisma Migrate + Prisma Client:** DX và type generation tốt; cần thống nhất lại repository đang dùng `pg`, một số tính năng PostgreSQL vẫn cần raw SQL.
- **Phương án C — DDL khi startup:** Ít setup; khó audit/rollback, rủi ro khi nhiều instance cùng khởi động, không phù hợp production.
- **Đề xuất kỹ thuật:** Phương án A để khớp code `pg` hiện tại; loại bỏ dần DDL khỏi bootstrap sau khi migration baseline được duyệt.
- **Phần bị chặn:** Chưa tạo migration hoặc thay `initDB.js`.
- **Câu trả lời của chủ dự án:** Chọn phương án A — SQL migration thuần + `pg`.
- **Kết quả:** Đã ghi ADR2-002, thêm versioned SQL migrations, checksum, advisory lock và migration spec.
- **Trạng thái:** RESOLVED
## Q-DB-002 — Kiểu ID runtime và độ chính xác số

- **Bối cảnh:** Schema hiện dùng `BIGSERIAL`, Discord ID là `VARCHAR`, cultivation là `NUMERIC(20,2)`, trong khi runtime JavaScript thường chuyển các giá trị sang `Number`.
- **Tài liệu liên quan:** `src/database/initDB.js`, `PlayerRuntimeRepository`, các JSON realm/currency.
- **Điểm chưa rõ:** Runtime entity dùng identity bigint hay UUID; scale tối đa của cultivation/currency; API biểu diễn số lớn bằng string, bigint hay decimal object.
- **Phương án A — BIGINT identity + NUMERIC, serialize string:** index gọn và PostgreSQL-native; cần mapping cẩn thận trong Node.js.
- **Phương án B — UUID + NUMERIC, serialize string:** sinh ID phân tán thuận lợi; index/storage lớn hơn.
- **Phương án C — JavaScript Number xuyên suốt:** đơn giản; mất chính xác khi economy vượt `2^53-1`.
- **Đề xuất kỹ thuật:** A cho runtime row ID hiện tại; tuyệt đối không chuyển balance/cultivation lớn sang `Number`, nhưng precision/scale phải theo trần gameplay được chủ dự án xác nhận.
- **Phần bị chặn:** DDL type cuối cùng, mapper và public DTO numeric.
- **Câu trả lời của chủ dự án:** Chọn phương án A — BIGINT identity + NUMERIC.
- **Kết quả:** Đã ghi ADR2-003; precision/scale cụ thể được tách sang `Q-DB-003`.
- **Trạng thái:** RESOLVED
## Q-TRANSACTION-001 — Chủ sở hữu transaction boundary

- **Bối cảnh:** Platform spec nói gameplay không quản lý transaction và repository thực hiện; use case thực tế như reward/craft/breakthrough phải cập nhật nhiều repository/aggregate atomically.
- **Tài liệu liên quan:** `docs/11_PLATFORM/010_TRANSACTION_SPEC.md`, `011_SAVE_PIPELINE_SPEC.md`, `src/platform/database/runInTransaction.js`, `PlayerRuntimeRepository`.
- **Điểm chưa rõ:** Một repository aggregate sở hữu toàn transaction, hay application service dùng UnitOfWork để phối hợp nhiều repository port?
- **Phương án A — Transaction trong repository method:** khớp code/spec hiện tại, đơn giản; repository dễ phình thành business workflow và khó phối hợp module.
- **Phương án B — UnitOfWork được inject vào use case:** transaction boundary rõ theo request, repository vẫn chỉ persistence; cần cập nhật/phiên bản hóa architecture spec.
- **Phương án C — Transaction script riêng:** tách SQL workflow nhưng dễ trùng business validation.
- **Đề xuất kỹ thuật:** B, với application service chỉ mô tả atomic use case và không phụ thuộc `pg`; PostgreSQL UnitOfWork quản lý transaction vật lý.
- **Phần bị chặn:** Chưa refactor transaction ownership hoặc repository API.
- **Câu trả lời của chủ dự án:** Chọn phương án B — UnitOfWork được inject vào use case.
- **Kết quả:** Đã thêm PostgreSQL UnitOfWork, compatibility wrapper và UnitOfWork spec.
- **Trạng thái:** RESOLVED
## Q-PLAYER-001 — Domain Linh căn

- **Bối cảnh:** Glossary có `SpiritRoot`, database lưu chuỗi `spiritual_root`, và `PlayerStartService` hardcode xác suất/tên Linh căn. Không có spec hay JSON domain tương ứng.
- **Tài liệu liên quan:** `docs/01_FOUNDATION/009_GLOSSARY.md`, `src/gameplay/player/PlayerStartService.js`, bảng `players`.
- **Điểm chưa rõ:** Danh sách Linh căn, xác suất, hệ, phẩm chất, modifier tu luyện/chiến đấu và quy tắc biến dị chưa được định nghĩa.
- **Phương án A — Spirit Root template data-driven:** Tạo domain JSON riêng, player chỉ lưu `spirit_root_id`; hỗ trợ modifier/effect bằng reference.
- **Phương án B — Chỉ lưu nhãn cosmetic:** Đơn giản nhưng không thể hiện ảnh hưởng gameplay và tiếp tục hardcode roll.
- **Đề xuất kỹ thuật:** Phương án A, với `spirit_roots.json` chỉ chứa metadata/reference; logic thực thi đi qua Effect/Modifier.
- **Phần bị chặn:** Roll Linh căn, schema chi tiết và mọi bonus Linh căn.
- **Câu trả lời của chủ dự án:** Chọn phương án A — Spirit Root template data-driven.
- **Kết quả:** Đã thêm spec, JSON, registry, validator và chuyển roll khởi tạo sang GameData.
- **Trạng thái:** RESOLVED

## Q-CULT-001 — Cảnh giới và tầng

- **Bối cảnh:** `realms.json` có `maxStage: 10` và growth theo tầng, nhưng runtime/database chỉ lưu `realm_id`; code đột phá tăng thẳng `realm_id`.
- **Tài liệu liên quan:** `src/data/realms/realms.json`, `docs/01_FOUNDATION/009_GLOSSARY.md`, `BreakthroughService`, bảng `players`.
- **Điểm chưa rõ:** Người chơi phải đi qua 10 tầng mỗi cảnh giới hay `maxStage` chỉ dành cho nội dung khác?
- **Phương án A — Realm + stage:** Lưu `realm_id`, `realm_stage`; tiểu đột phá tăng stage, đại đột phá đổi realm.
- **Phương án B — Chỉ realm:** Bỏ qua stage trong runtime; đơn giản nhưng không dùng phần lớn data growth hiện có.
- **Đề xuất kỹ thuật:** Phương án A vì phù hợp data và glossary, nhưng không được áp dụng trước khi xác nhận công thức tiểu/đại đột phá.
- **Phần bị chặn:** Schema progression cuối cùng, công thức yêu cầu tu vi và stat theo tầng.
- **Câu trả lời của chủ dự án:** Chọn phương án A — Realm + Stage.
- **Kết quả:** `realms.json` đã có `maxStage` và growth theo stage; ADR2-006 khóa semantics triển khai.
- **Trạng thái:** RESOLVED
## Q-CULT-002 — Công thức tu luyện offline và giới hạn tích lũy

- **Bối cảnh:** `cultivation_rules.json` ghi `baseGainPerMinute = 1`, công thức gồm Realm/Talent/Equipment multiplier và cap 12 giờ; `Player.calculateOfflineCultivation()` lại dùng `seconds * cultivationSpeed`, không cap và chưa dùng realm multiplier.
- **Tài liệu liên quan:** `src/data/realms/cultivation_rules.json`, `src/core/Player.js`, `CultivationService`.
- **Điểm chưa rõ:** Đơn vị chuẩn là phút hay giây; cách kết hợp multiplier; quy tắc làm tròn; cap có áp dụng trước hay sau modifier.
- **Phương án A — Theo phút liên tục:** `elapsedSeconds / 60 × baseGainPerMinute × modifiers`, giữ số thập phân.
- **Phương án B — Theo phút hoàn chỉnh:** chỉ tính `floor(elapsedSeconds / 60)`, phần giây dư được bảo toàn qua checkpoint.
- **Đề xuất kỹ thuật:** A với `NUMERIC`, cap elapsed trước khi nhân, làm tròn tại ranh giới persistence theo scale được phê duyệt.
- **Phần bị chặn:** Không sửa công thức collect hiện tại; roadmap chỉ định nghĩa khung lazy evaluation.
- **Câu trả lời của chủ dự án:** Chọn phương án A — tính liên tục từ elapsed seconds theo rate/phút.
- **Kết quả:** ADR2-007 khóa công thức/cap order; precision cụ thể chờ `Q-DB-003`.
- **Làm rõ của chủ dự án ngày 2026-07-22:** Base canonical là `60 tu vi/phút` (tương đương `1 tu vi/giây`), không phải `1 tu vi/phút`.
- **Kết quả triển khai bổ sung:** `cultivation_rules.json` revision 2 dùng `baseGainPerMinute = 60`; calculator vẫn chia elapsed seconds cho 60 đúng đơn vị, rồi nhân toàn bộ modifier. Validator và audit khóa base/effective rate.
- **Trạng thái:** RESOLVED
## Q-BREAK-001 — Chi phí khi đột phá thất bại

- **Bối cảnh:** Spec chỉ nói giữ cảnh giới; `breakthroughKeepCultivation=false`; code hiện trừ đúng `required cultivation`, nhưng không có mô tả mất toàn bộ, mất một phần hay giữ phần dư.
- **Tài liệu liên quan:** `docs/10_GAMEPLAY/004_BREAKTHROUGH_SPEC.md`, `cultivation_rules.json`, `BreakthroughService`.
- **Điểm chưa rõ:** Thất bại tiêu hao bao nhiêu tu vi, có dùng đan dược/vật phẩm, pity hay cooldown không?
- **Phương án A — Mất ngưỡng yêu cầu:** hành vi gần code hiện tại; phạt nặng và khó diễn đạt nếu có stage.
- **Phương án B — Mất phần trăm cấu hình:** dễ balance/data-driven; cần thêm dữ liệu.
- **Phương án C — Không mất tu vi, tiêu hao vật phẩm/lượt:** thân thiện hơn; thay đổi vòng kinh tế.
- **Đề xuất kỹ thuật:** B, cấu hình theo breakthrough definition; không hardcode.
- **Phần bị chặn:** Transaction đột phá hoàn chỉnh và bảng lịch sử đột phá.
- **Câu trả lời của chủ dự án:** Chọn phương án B — mất phần trăm cấu hình.
- **Kết quả:** Đã ghi ADR2-008; giá trị phần trăm chờ `Q-BREAK-002`.
- **Trạng thái:** RESOLVED

## Q-SKILL-001 — Contract chuẩn của Skill

- **Bối cảnh:** Core Data v2.1 quy định `Skill -> Effect -> Action`; tài liệu Skill v1 và Battle pipeline cũ mô tả `Skill -> Action` trực tiếp. Changelog cho biết có bridge compatibility.
- **Tài liệu liên quan:** `docs/02_CORE_DATA/003_EFFECT_SPEC.md`, `docs/02_CORE_DATA/009_SKILL_SPEC.md`, `docs/05_SKILL/004_SKILL_ACTION_SPEC.md`, `docs/08_BATTLE/*`, `docs/00_PROJECT/007_CHANGELOG.md`.
- **Điểm chưa rõ:** Contract nào là đích dài hạn và bridge legacy được giữ đến giai đoạn nào?
- **Phương án A — Effect-driven v2 là chuẩn:** thống nhất DSL và khả năng mở rộng; cần kế hoạch chuyển dữ liệu/runtime cũ.
- **Phương án B — Action-driven v1 là chuẩn:** gần một phần code/data hiện tại; làm yếu nguyên tắc Effect-driven mới.
- **Phương án C — Hỗ trợ vĩnh viễn cả hai:** tương thích cao; tăng độ phức tạp validator/executor/test.
- **Đề xuất kỹ thuật:** A, bridge chỉ ở adapter/normalizer và có tiêu chí loại bỏ rõ ràng.
- **Phần bị chặn:** Schema persistence kỹ năng chi tiết và kế hoạch bỏ bridge.
- **Câu trả lời của chủ dự án:** Chọn phương án A — Effect-driven v2 là contract chuẩn.
- **Kết quả:** Core Data v2.1 là contract đích; bridge legacy chỉ là adapter compatibility.
- **Trạng thái:** RESOLVED
## Q-INVENTORY-001 — Mô hình item stack và equipment instance

- **Bối cảnh:** Database hiện dùng chung `player_items` cho stackable item và equipment instance qua JSONB; spec coi Runtime Equipment có identity/affix/level riêng.
- **Tài liệu liên quan:** `docs/03_ITEM/*`, `docs/04_EQUIPMENT/*`, `docs/07_RUNTIME/*`, `src/database/initDB.js`.
- **Điểm chưa rõ:** Có giữ một bảng polymorphic hay tách stack item và equipment instance?
- **Phương án A — Tách bảng:** `inventory_stacks` và `equipment_instances`; constraint rõ, index nhỏ, giảm JSONB mơ hồ; migration phức tạp hơn.
- **Phương án B — Một bảng:** ít migration; nhiều nullable field/JSONB và khó bảo đảm invariant.
- **Đề xuất kỹ thuật:** A, vẫn cung cấp một `InventoryRepository` thống nhất ở domain layer.
- **Phần bị chặn:** Migration inventory/equipment và constraint slot cuối cùng.
- **Câu trả lời của chủ dự án:** Chọn phương án A — tách stack item và equipment instance.
- **Kết quả:** Đã ghi ADR2-010; schema/migration Phase 3 được mở khóa.
- **Trạng thái:** RESOLVED
## Q-CURRENCY-001 — Ví tiền chuẩn hóa hay cột cố định

- **Bối cảnh:** Currency là data-driven nhưng bảng `players` có bốn cột tiền cố định và repository hardcode map currency.
- **Tài liệu liên quan:** `docs/02_CORE_DATA/007_CURRENCY_SPEC.md`, `currencies.json`, `PlayerRuntimeRepository`.
- **Điểm chưa rõ:** Nội dung mới có được thêm currency chỉ bằng data hay chấp nhận migration/code cho mỗi currency?
- **Phương án A — `player_wallets(player_id,currency_id,amount)`:** data-driven, constraint và locking theo từng currency; thêm join/upsert.
- **Phương án B — Cột trong players:** đọc profile nhanh; không mở rộng bằng data và dễ phình bảng.
- **Đề xuất kỹ thuật:** A.
- **Phần bị chặn:** Migration wallet và API currency repository.
- **Câu trả lời của chủ dự án:** Chọn phương án A — wallet chuẩn hóa.
- **Kết quả:** Đã ghi ADR2-011; schema/migration Phase 3 được mở khóa.
- **Trạng thái:** RESOLVED
## Q-IDLE-001 — Phạm vi các nguồn Idle

- **Bối cảnh:** Chỉ tu luyện có cấu hình offline rõ; yêu cầu hiện tại nhắc tài nguyên, kinh nghiệm và tiến độ nhưng không chỉ ra hệ thống nào tự sinh theo thời gian.
- **Tài liệu liên quan:** `CULTIVATION_SPEC`, gathering/exploration/sect specs, yêu cầu hiện tại.
- **Điểm chưa rõ:** V1 chỉ idle tu vi, hay còn linh thạch, nguyên liệu, stamina, sect contribution, skill/equipment EXP?
- **Phương án A — Chỉ tu vi ở MVP:** phạm vi nhỏ, sớm ổn định concurrency; các nguồn khác thêm sau bằng cùng engine.
- **Phương án B — Engine nhiều nguồn ngay:** nhất quán sớm; cần đầy đủ formula/cap/unlock cho từng nguồn.
- **Đề xuất kỹ thuật:** A cho MVP, nhưng thiết kế bảng generic đủ mở rộng sau khi từng nguồn có data.
- **Phần bị chặn:** Danh sách accumulator thực tế ngoài cultivation.
- **Câu trả lời của chủ dự án:** Chọn phương án A — MVP chỉ idle Cultivation.
- **Kết quả:** Đã define `idle_sources.json` với source `CULTIVATION`.
- **Trạng thái:** RESOLVED
## Q-IDLE-002 — Claim tự động hay explicit

- **Bối cảnh:** Lazy evaluation có thể chỉ preview trên mọi request và claim bằng command riêng, hoặc tự settle trước mọi nghiệp vụ phụ thuộc.
- **Tài liệu liên quan:** yêu cầu Lazy Evaluation, `CultivationService.collectOfflineCultivation()`.
- **Điểm chưa rõ:** Request đọc profile có cập nhật checkpoint không? Đột phá có tự claim tu vi trước khi kiểm tra không?
- **Phương án A — Preview read-only, claim explicit:** ít write, UX minh bạch; đột phá cần hướng dẫn claim.
- **Phương án B — Settle trong command nghiệp vụ:** UX mượt; nhiều transaction ghi checkpoint hơn.
- **Phương án C — Hybrid:** profile preview; collect explicit; breakthrough settle + consume atomically.
- **Đề xuất kỹ thuật:** C.
- **Phần bị chặn:** Semantics API và transaction boundary của từng command.
- **Câu trả lời của chủ dự án:** Chọn phương án C — hybrid claim.
- **Kết quả:** Preview/explicit/atomic settle đã được define trong `idle_sources.json`.
- **Trạng thái:** RESOLVED
## Q-IDEMPOTENCY-001 — Nguồn khóa chống request trùng

- **Bối cảnh:** Discord interaction có ID duy nhất, nhưng service/domain hiện chưa nhận idempotency key; retry hoặc hai worker có thể áp dụng reward hai lần.
- **Tài liệu liên quan:** transaction/save pipeline specs, command/interaction specs, yêu cầu hiện tại.
- **Điểm chưa rõ:** Dùng Discord interaction ID trực tiếp, client-generated request ID, hay cả hai? Thời gian lưu kết quả dedup là bao lâu?
- **Phương án A — Interaction ID ở application boundary:** đơn giản cho Discord; domain khó tái dùng ngoài Discord.
- **Phương án B — `operation_id` trung lập do adapter cung cấp:** domain độc lập, hỗ trợ nhiều adapter; cần contract bắt buộc.
- **Đề xuất kỹ thuật:** B; Discord adapter ánh xạ interaction ID thành `operation_id`.
- **Phần bị chặn:** Schema `idempotency_records` cuối cùng và retention job.
- **Câu trả lời của chủ dự án:** Chọn phương án B — operation ID trung lập.
- **Kết quả:** Đã ghi ADR2-014, thêm schema/spec idempotency; retention tách sang `Q-IDEMPOTENCY-002`.
- **Trạng thái:** RESOLVED
## Q-ECONOMY-001 — Chu kỳ reset và múi giờ

- **Bối cảnh:** Shop/exchange có limit daily/weekly/monthly; scheduler specs không định nghĩa timezone hay mốc reset.
- **Tài liệu liên quan:** shop/exchange specs, scheduler specs, timezone triển khai hiện tại.
- **Điểm chưa rõ:** Reset theo UTC, Asia/Bangkok, timezone guild, hay timezone player? Tuần bắt đầu ngày nào?
- **Phương án A — UTC toàn hệ thống:** đơn giản, chống DST; kém tự nhiên với người chơi Việt Nam.
- **Phương án B — Asia/Ho_Chi_Minh toàn game:** UX phù hợp; cần chuyển đổi rõ ở DB/application.
- **Phương án C — Theo guild/player:** linh hoạt; phức tạp và dễ exploit khi đổi timezone.
- **Đề xuất kỹ thuật:** B, lưu mọi timestamp bằng `TIMESTAMPTZ`/UTC và tính period key theo timezone game cố định.
- **Phần bị chặn:** Unique key theo kỳ và reset/limit implementation.
- **Câu trả lời của chủ dự án:** Chọn phương án B — timezone `Asia/Ho_Chi_Minh`.
- **Kết quả:** Đã define timezone và timestamp policy trong `economy_rules.json`; weekly boundary tách sang `Q-ECONOMY-002`.
- **Trạng thái:** RESOLVED
## Q-REWARD-001 — Chính sách atomic khi reward có phần tử lỗi

- **Bối cảnh:** Reward spec cũ nói reward lỗi thì bỏ qua và tiếp tục roll; yêu cầu claim cần transaction chống nhận trùng.
- **Tài liệu liên quan:** `docs/01_FOUNDATION/007_REWARD_SYSTEM_SPEC.md`, `docs/10_GAMEPLAY/012_REWARD_RUNTIME_SPEC.md`.
- **Điểm chưa rõ:** Khi một reward component không hợp lệ hoặc inventory đầy, claim rollback toàn bộ hay nhận phần hợp lệ?
- **Phương án A — All-or-nothing:** audit và retry dễ, không mất reward; cần cơ chế overflow/mailbox nếu inventory đầy.
- **Phương án B — Partial apply:** người chơi nhận được phần hợp lệ; reconciliation và idempotency phức tạp.
- **Đề xuất kỹ thuật:** A; validation dữ liệu ở startup và claim atomically, overflow là câu chuyện riêng nếu cần.
- **Phần bị chặn:** Reward claim contract và overflow policy.
- **Câu trả lời của chủ dự án:** Chọn phương án A — reward all-or-nothing.
- **Kết quả:** Đã define `ALL_OR_NOTHING` trong `reward_runtime_rules.json`; overflow tách sang `Q-REWARD-002`.
- **Trạng thái:** RESOLVED
## Q-LATEGAME-001 — Phạm vi Sect/PvE/PvP/World Boss V1

- **Bối cảnh:** Spec chỉ mô tả pipeline mức cao; chưa có matchmaking, mùa giải, guild membership role, đóng góp, damage aggregation hay reward eligibility.
- **Tài liệu liên quan:** `docs/10_GAMEPLAY/005_SECT_SPEC.md` đến `008_WORLD_BOSS_SPEC.md`.
- **Điểm chưa rõ:** Feature nào phải phát hành trong V1 và rule cụ thể của từng feature?
- **Phương án A — V1 chỉ Sect membership + solo PvE:** giảm rủi ro; PvP/world boss để phase sau.
- **Phương án B — V1 đầy đủ late-game:** nhiều nội dung; yêu cầu design/balance/concurrency bổ sung đáng kể.
- **Đề xuất kỹ thuật:** A cho baseline, nhưng không loại bỏ schema extension points.
- **Phần bị chặn:** Bảng PvP season/rating, world-boss shared state, sect role/contribution chi tiết.
- **Câu trả lời của chủ dự án:** Chọn phương án A — V1 Sect membership + solo PvE.
- **Kết quả:** Đã ghi ADR2-017; PvP/World Boss được hoãn.
- **Trạng thái:** RESOLVED
## Q-SCALING-001 — Redis có được phép ở phase sau không?

- **Bối cảnh:** Yêu cầu nói hiện chưa dùng Redis/cache và kiến trúc phải dễ tích hợp Redis; đồng thời mô tả dự án sử dụng duy nhất PostgreSQL.
- **Tài liệu liên quan:** yêu cầu hiện tại, `docs/11_PLATFORM/004_CACHE_SPEC.md`.
- **Điểm chưa rõ:** “Duy nhất PostgreSQL” cấm Redis hoàn toàn, hay chỉ PostgreSQL là database/source of truth còn Redis được dùng làm cache/coordination ở phase scaling?
- **Phương án A — PostgreSQL-only vĩnh viễn:** vận hành đơn giản; dùng advisory lock/NOTIFY/LISTEN và DB queue khi scale.
- **Phương án B — PostgreSQL là source of truth, Redis được phép làm cache/lock/rate limit:** scale thuận lợi; tăng hạ tầng và consistency concern.
- **Đề xuất kỹ thuật:** B nếu quy mô cần; mọi correctness vẫn phải đúng khi Redis mất.
- **Phần bị chặn:** Không đưa Redis vào dependency hoặc implementation; Phase 7 chỉ giữ adapter seam.
- **Câu trả lời của chủ dự án:** Chọn phương án B — PostgreSQL source of truth, Redis được phép làm cache/coordination.
- **Kết quả:** Đã ghi ADR2-018; correctness không phụ thuộc cache.
- **Trạng thái:** RESOLVED

---

## Q-CULT-003 — Semantics tiểu đột phá và rounding theo Stage

- **Bối cảnh:** Realm + Stage đã được duyệt và `realms.json` có `growthPerStage`, nhưng chưa quy định success roll/stat update cho tiểu đột phá hay cách làm tròn giá trị growth.
- **Tài liệu liên quan:** `realms.json`, ADR2-006, `BreakthroughService`.
- **Điểm chưa rõ:** Tiểu đột phá có xác suất thất bại không; `required`, HP/ATK/DEF/SPD theo stage làm tròn thế nào; success rate realm áp dụng ở stage nào.
- **Phương án A — Minor chắc chắn, Major mới roll:** required/stat stage dùng `initial × growth^(stage-1)`; required và stat integer làm tròn `FLOOR`; successRate chỉ áp dụng từ stage tối đa sang realm mới.
- **Phương án B — Mọi Stage đều roll:** cùng successRate realm cho cả minor/major; tăng độ khó mạnh.
- **Phương án C — Data từng Stage:** chính xác nhất nhưng cần khai báo 150 stage/transition hoặc generator data mới.
- **Đề xuất kỹ thuật:** A, đồng thời đưa rounding mode vào `progression_rules.json`.
- **Phần bị chặn:** Chưa thay `BreakthroughService` sang minor/major progression; penalty major hiện đã sửa độc lập theo rule data.
- **Câu trả lời của chủ dự án:** Chọn phương án A — minor breakthrough chắc chắn; major breakthrough mới roll. Required/stat dùng `FLOOR(initial × growthPerStage^(stage-1))`; success rate chỉ áp dụng từ Stage tối đa sang realm mới.
- **Kết quả:** Đã cập nhật `progression_rules.json` và runtime Stage progression.
- **Trạng thái:** RESOLVED
## Q-IDLE-003 — Giảm hiệu suất tu luyện khi vượt ngưỡng đột phá

* **Bối cảnh:** Hệ thống tu luyện offline không giới hạn theo thời gian. Tuy nhiên, khi lượng tu vi của người chơi đạt ngưỡng cần thiết để đột phá tầng hoặc cảnh giới hiện tại, phần tu vi tiếp tục phát sinh cần bị giảm hiệu suất nhằm hạn chế việc tích trữ tu vi quá lớn mà không thực hiện đột phá.

* **Tài liệu liên quan:** `cultivation_rules.json`, `breakthroughs.json`, ADR2-007, ADR2-013.

* **Điểm chưa rõ:** Khi tu vi phát sinh khiến tổng tu vi vượt qua ngưỡng yêu cầu đột phá, phần vượt ngưỡng có tiếp tục được tích lũy không và áp dụng hiệu suất như thế nào?

* **Phương án A — Dừng tích lũy tại ngưỡng:** Tu vi không thể vượt quá ngưỡng đột phá hiện tại.

  * **Ưu:** Dễ kiểm soát progression và economy.
  * **Nhược:** Người chơi bị mất toàn bộ tiến độ tu luyện trong thời gian chưa thực hiện đột phá.

* **Phương án B — Tiếp tục tích lũy với hiệu suất đầy đủ:** Toàn bộ tu vi vẫn nhận 100% dù đã đủ điều kiện đột phá.

  * **Ưu:** Đơn giản, không làm mất giá trị thời gian offline.
  * **Nhược:** Người chơi có thể tích trữ lượng tu vi rất lớn tại cảnh giới thấp và bỏ qua áp lực progression.

* **Phương án C — Tiếp tục tích lũy với hiệu suất giảm:** Phần tu vi đến ngưỡng đột phá nhận 100%; phần phát sinh vượt ngưỡng chỉ nhận 20%.

  * **Ưu:** Không làm mất hoàn toàn tiến độ offline, đồng thời khuyến khích người chơi thực hiện đột phá.
  * **Nhược:** Logic lazy evaluation phải chia lượng tu vi phát sinh thành phần trước và sau ngưỡng.

* **Đề xuất kỹ thuật:** Chọn Phương án C.

* **Quyết định (cập nhật 2026-08-04):** Không có giới hạn thời gian tu luyện offline. Phần tu vi phát sinh trước khi đạt ngưỡng đột phá nhận 100% hiệu suất; phần phát sinh vượt ngưỡng chỉ nhận 20% hiệu suất. Quyết định 20% thay thế mức 30% trước đó.

* **Quy tắc tính toán:**

  * Xác định `requiredCultivation` của transition tiếp theo.

  * Tính tổng tu vi thô phát sinh từ thời gian offline và các modifier hợp lệ.

  * Phần còn thiếu để đạt ngưỡng:

    ```text
    remainingToThreshold =
    max(requiredCultivation - currentCultivation, 0)
    ```

  * Phần nhận đủ hiệu suất:

    ```text
    fullEfficiencyGain =
    min(generatedCultivation, remainingToThreshold)
    ```

  * Phần vượt ngưỡng:

    ```text
    overflowRawGain =
    max(generatedCultivation - remainingToThreshold, 0)
    ```

  * Phần vượt ngưỡng thực nhận:

    ```text
    overflowEffectiveGain =
    overflowRawGain × 0.20
    ```

  * Tổng tu vi nhận:

    ```text
    totalGain =
    fullEfficiencyGain + overflowEffectiveGain
    ```

* **Trường hợp người chơi đã đủ điều kiện đột phá trước khi bắt đầu khoảng offline:** Toàn bộ tu vi mới phát sinh được tính với hiệu suất 20%.

* **Modifier:** Linh căn, công pháp, cảnh giới, trang bị và các modifier tu luyện hợp lệ vẫn được áp dụng để tính lượng tu vi thô. Sau đó phần vượt ngưỡng mới bị nhân hệ số `0.20`.

* **Checkpoint:** Sau khi claim thành công, checkpoint được cập nhật về thời điểm hiện tại. Không giữ thời gian dư để claim nhiều lần.

* **Cấu hình:** Không hard-code hệ số `0.20` trong service. Khai báo trong `cultivation_rules.json`, ví dụ:

  ```json
  {
    "cultivationOverflow": {
      "enabled": true,
      "thresholdType": "NEXT_BREAKTHROUGH_REQUIRED_CULTIVATION",
      "efficiencyMultiplier": "0.20"
    }
  }
  ```

* **Trường hợp không còn transition tiếp theo:** Mặc định toàn bộ tu vi phát sinh tiếp tục nhận 20% hiệu suất cho đến khi có policy riêng cho cảnh giới tối đa.

* **Phần bị chặn:** Logic chia tu vi trước và sau ngưỡng, cấu hình `cultivationOverflow`, lazy cultivation claim và checkpoint transaction cuối cùng.

* **Kết quả:** Đã cập nhật `cultivation_rules.json`; lazy claim chia gain trước/sau ngưỡng, checkpoint và mutation chạy trong cùng transaction có khóa player.

* **Trạng thái:** RESOLVED

---

## Q-IDLE-004 — Xử lý tu vi tích lũy khi đổi nguồn modifier

- **Bối cảnh:** Tốc độ tu luyện phụ thuộc công pháp và trang bị. Hiện checkpoint chỉ cập nhật khi collect/breakthrough; nếu người chơi đổi loadout trước khi claim, runtime có thể dùng modifier mới cho toàn bộ khoảng thời gian kể từ checkpoint.
- **Tài liệu liên quan:** ADR2-013, `idle_sources.json`, `EquipmentService`, `CultivationArtService`, mục 3.3 trong `ROADMAP_DATABASE_ARCHITECTURE.md`.
- **Điểm chưa rõ:** Khi equip/unequip trang bị hoặc đổi công pháp, phần thời gian đã tích lũy phải dùng rate cũ hay được tính lại bằng rate mới.
- **Phương án A — Settle-before-change:** Trong cùng transaction, khóa player, tính và lưu tu vi theo loadout cũ, cập nhật checkpoint, sau đó mới đổi loadout. Chính xác và chống exploit; mỗi lần đổi loadout phát sinh thêm cultivation write.
- **Phương án B — Current-rate-for-whole-window:** Chỉ đổi loadout; lần claim sau dùng rate mới cho toàn bộ elapsed window. Ít write hơn nhưng có thể exploit bằng cách equip bộ tăng tốc ngay trước claim.
- **Phương án C — Rate snapshot/segment:** Lưu snapshot hoặc các đoạn rate theo thời gian. Audit chi tiết nhưng schema và thuật toán phức tạp hơn đáng kể.
- **Ưu/nhược điểm chính:** A đơn giản và an toàn nhất cho correctness; B đơn giản nhất về persistence nhưng sai lệch economy; C linh hoạt nhất nhưng vượt nhu cầu MVP.
- **Đề xuất kỹ thuật:** Phương án A.
- **Phần bị chặn:** Chưa sửa transaction của equip/unequip equipment và equip/learn cultivation art để settle cultivation. Preview, explicit collect và breakthrough không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn phương án A — settle cultivation theo loadout cũ trong cùng transaction trước khi đổi modifier.
- **Kết quả:** Mở khóa transaction equip/unequip equipment và learn/equip cultivation art.
- **Trạng thái:** RESOLVED
---

## Q-INVENTORY-002 — Chiến lược phân loại và chuyển dữ liệu inventory legacy

- **Bối cảnh:** `player_items` đang chứa cả stack item và equipment instance. Equipment đang equip có `equipped_slot`, nhưng equipment chưa equip có thể không có discriminator đầy đủ trong row; loại template chuẩn nằm trong GameData JSON.
- **Tài liệu liên quan:** ADR2-010, `player_items`, `item_templates.json`, `equipment_templates.json`, Phase 3 roadmap.
- **Điểm chưa rõ:** Migration production được phép chạy một application migration đọc GameData để phân loại/backfill, hay bắt buộc toàn bộ chuyển đổi chỉ dùng SQL; có cần maintenance window hay dual-read/dual-write online.
- **Phương án A — Application migration + maintenance window:** Load cùng GameData revision với server, khóa mutation inventory, phân loại toàn bộ row và backfill hai bảng mới; đơn giản và kiểm chứng được nhưng cần downtime ngắn.
- **Phương án B — Online dual-write + batch backfill:** Code mới ghi cả schema cũ/mới, worker batch phân loại bằng GameData, sau đó cutover; ít downtime nhưng phức tạp, cần reconciliation và nhiều trạng thái chuyển tiếp.
- **Phương án C — SQL-only với bảng mapping template được materialize trước:** Import mapping `item_id -> persistence_kind` vào PostgreSQL rồi chạy SQL backfill; deterministic nhưng thêm bước publish/version mapping.
- **Ưu/nhược điểm chính:** A ít trạng thái lỗi nhất; B phù hợp hệ thống đang vận hành liên tục; C giữ migration SQL-centric nhưng cần pipeline đồng bộ GameData với database.
- **Đề xuất kỹ thuật:** A nếu chưa có production traffic; B nếu bot đã có người chơi cần zero/low downtime.
- **Phần bị chặn:** Backfill/cutover `inventory_stacks` và `equipment_instances`. Schema draft, validator và wallet migration không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn phương án A — application migration đọc GameData và chạy trong maintenance window.
- **Kết quả:** Mở khóa schema split, backfill script và reconciliation; schema legacy chỉ được loại bỏ ở bước cutover riêng sau xác minh.
- **Trạng thái:** RESOLVED

---

## Q-ECONOMY-003 — Contract dữ liệu cho giới hạn Exchange

- **Bối cảnh:** Exchange spec cho phép giới hạn Daily, Weekly, Monthly hoặc Lifetime; `exchange_templates.json` hiện không có mẫu `limit`, còn normalizer chỉ giữ nguyên `exchange.limit`.
- **Tài liệu liên quan:** `docs/03_ITEM/007_EXCHANGE_SPEC.md`, `src/data/exchange/exchange_templates.json`, `economy_rules.json`, Phase 3 trong `ROADMAP_DATABASE_ARCHITECTURE.md`.
- **Điểm chưa rõ:** Chưa có cấu trúc JSON khóa cho `limit`, đơn vị đếm và việc một exchange có được đồng thời nhiều giới hạn hay không.
- **Phương án A — Một object:** `{ "periodType": "DAILY", "value": 3 }`; đơn giản, mỗi exchange chỉ có một giới hạn.
- **Phương án B — Danh sách:** `[{ "periodType": "DAILY", "value": 3 }, { "periodType": "LIFETIME", "value": 10 }]`; linh hoạt nhưng mutation phải increment nhiều counter atomically.
- **Phương án C — Các field cố định:** `{ "daily": 3, "weekly": 10, "monthly": 20, "lifetime": 100 }`; dễ đọc nhưng schema kém mở rộng và cần quy ước field `0`/null.
- **Ưu/nhược điểm chính:** A tối giản cho MVP; B biểu đạt đầy đủ nhất và tái sử dụng tốt với shop/gathering; C thân thiện khi author JSON nhưng hard-code period vào schema nội dung.
- **Đề xuất kỹ thuật:** Phương án B, mỗi phần tử gồm `periodType` và integer-string `value`; đơn vị đếm là số lần exchange thành công, không phải tổng quantity reward.
- **Phần bị chặn:** Nối `exchange.limit` vào `player_period_counters` và validator GameData. Schema counter, ledger và shop daily counter không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn phương án B — danh sách giới hạn; mỗi phần tử dùng `periodType` và integer-string `value`, đơn vị đếm là số lần exchange thành công.
- **Kết quả:** Mở khóa normalizer, validator và atomic multi-counter cho exchange; mỗi period type chỉ được xuất hiện một lần trong một exchange.
- **Trạng thái:** RESOLVED

## Q-MAP-001 — Contract Map và ràng buộc cảnh giới quái

* **Bối cảnh:** Hệ thống chiến đấu command cần xác định quái xuất hiện theo khu vực. Hiện monster có cảnh giới và reward riêng nhưng chưa có contract Map/Spawn Pool để giới hạn quái theo khu vực.
* **Tài liệu liên quan:** Exploration spec, Secret Realm spec, Monster definitions, Reward System, Phase PvE trong roadmap.
* **Điểm chưa rõ:** Map có ràng buộc cảnh giới người chơi và quái như thế nào; quái được chọn trực tiếp từ map hay thông qua spawn pool; reward phụ thuộc monster hay map.
* **Phương án A — Map chứa trực tiếp monster IDs:** đơn giản cho MVP nhưng khó tái sử dụng và balance.
* **Phương án B — Map tham chiếu Monster Spawn Pool:** mỗi pool có monster ID, weight, điều kiện và loại Normal/Elite/Boss; dễ tái sử dụng và mở rộng.
* **Phương án C — Chọn quái động theo cảnh giới người chơi:** ít dữ liệu nhưng map mất bản sắc và dễ bị exploit.
* **Đề xuất kỹ thuật:** Chọn Phương án B.

### Quyết định đề xuất

* Mỗi map có:

  * `id`
  * `name`
  * `unlockCondition`
  * `recommendedRealmRange`
  * `monsterSpawnPoolId`
  * `activityTypes`
  * `rewardModifier` tùy chọn
* Mỗi spawn pool có danh sách:

  * `monsterId`
  * `weight`
  * `minPlayerRealm`
  * `maxPlayerRealm` nếu cần - có thể không 
  * `spawnType`: `NORMAL`, `ELITE`, `BOSS`
* Cảnh giới quái lấy từ Monster Template, không lặp lại trong Map.
* Map chỉ kiểm soát quái nào được phép xuất hiện.
* Reward cơ bản lấy từ Monster Reward Table.
* Map chỉ được áp modifier reward có kiểm soát, không thay thế reward table của monster.
* Người chơi chỉ được vào map khi đạt điều kiện mở khóa.
* Map có thể chứa một tỷ lệ nhỏ quái cao hơn mức đề xuất để tạo rủi ro.

### Phạm vi MVP

Map trong MVP là khu vực logic, không phải bản đồ tọa độ.

Không triển khai:

* vị trí X/Y;
* di chuyển theo ô;
* pathfinding;
* fog of war;
* bản đồ hình ảnh.

### Kết quả

Sau khi chốt contract có thể tạo:

* `maps.json`

* `monster_spawn_pools.json`

* Map validator

* Map selection service

* Hunt/Explore monster resolver

* **Câu trả lời của chủ dự án:** Chọn phương án B — Map tham chiếu Monster Spawn Pool.
* **Kết quả:** Đã thêm GameData Map/Spawn Pool, validator, `MapEncounterService`, Exploration integration và Discord adapter đọc chung registry.
* **Trạng thái:** RESOLVED

### Đánh giá kỹ thuật

- Mô hình **Map -> Monster Spawn Pool** là hợp lý và phù hợp kiến trúc data-driven; nên giữ Map là khu vực gameplay, còn Continent chỉ là metadata trình bày/nhóm Map.
- `unlockCondition`, `minPlayerRealm` và `maxPlayerRealm` phải tham chiếu Realm Registry rồi so sánh `realm.order`; Discord command không tự so sánh chuỗi tên cảnh giới.
- `rewardModifier` cần là contract typed/effect-driven có validator và giới hạn, không nhận object tùy ý hoặc thay thế monster reward table.
- `ExplorationService` nên nhận `mapId`, gọi Map/Spawn resolver để tạo encounter; Discord chỉ là adapter chọn map.
- Contract kiến trúc hợp lý, nhưng chưa đủ dữ liệu để triển khai spawn pool và persistence mà không tự giả định. Các lựa chọn còn thiếu được tách tại `Q-MAP-002` và `Q-MAP-003`.

---

## Q-MAP-002 — Nội dung Spawn Pool ban đầu

- **Bối cảnh:** Command `chuyenmap` hiện có bốn area `TRUC_LAM`, `HOA_DIEM_SON`, `LINH_KHE`, `THIEN_MON`, nhưng không khai báo monster IDs, weights hay spawn types. `THIEN_MON` yêu cầu Kết Đan trong khi chưa có monster template Kết Đan.
- **Tài liệu liên quan:** `src/commands/player/chuyenmap.js`, `monster_template.json`, `Q-MAP-001`.
- **Điểm chưa rõ:** Monster nào thuộc từng pool, weight bao nhiêu, và xử lý `THIEN_MON` khi thiếu template Kết Đan thế nào?
- **Phương án A — Chủ dự án cung cấp pool cụ thể:** đúng ý đồ content; cần danh sách `{ monsterId, weight, min/max realm, spawnType }` cho bốn area.
- **Phương án B — Baseline theo dữ liệu hiện hữu:** `TRUC_LAM`/`LINH_KHE` dùng nhóm monster Luyện Khí, `HOA_DIEM_SON` dùng `TPL_MON_FIRE_002`, còn `THIEN_MON` giữ locked/content-pending; chạy được ba map nhưng một map chưa có encounter.
- **Phương án C — Tạo thêm monster Kết Đan trước:** content đầy đủ hơn; cần thiết kế template/reward table mới nên mở rộng phạm vi đáng kể.
- **Đề xuất kỹ thuật:** B cho MVP, không dùng Dragon Nguyên Anh làm thay thế ngầm cho quái Kết Đan.
- **Phần bị chặn:** `monster_spawn_pools.json`, spawn resolver và nối Exploration theo map.
- **Câu trả lời của chủ dự án:** Chọn phương án B — baseline theo dữ liệu hiện hữu; `THIEN_MON` giữ content-pending.
- **Kết quả:** Ba map ACTIVE có spawn pool; các monster Luyện Khí dùng equal weight, Hỏa Diệm Sơn dùng `TPL_MON_FIRE_002`; Thiên Môn không selectable.
- **Trạng thái:** RESOLVED
---

## Q-MAP-003 — Persistence của map hiện tại

- **Bối cảnh:** `chuyenmap` hiện chỉ hiển thị UI và ghi rõ chưa có runtime persistence. Nếu Exploration mặc định dùng map đã chọn, hệ thống cần xác định map selection là state lâu dài hay input từng activity.
- **Tài liệu liên quan:** `src/commands/player/chuyenmap.js`, `ExplorationService`, `activity_runs`, `Q-MAP-001`.
- **Điểm chưa rõ:** Có lưu `current_map_id` cho player không, hay người chơi chọn map trong mỗi lần Explore?
- **Phương án A — Persist current map:** thêm player map state/repository và transaction khi chuyển map; UX phù hợp command hiện tại nhưng thêm migration/state mutation.
- **Phương án B — Map là input mỗi activity:** không có state chuyển map; activity run snapshot lưu `mapId`, đơn giản và ít race condition hơn.
- **Phương án C — Session selection tạm thời:** UX nhanh nhưng state phụ thuộc process/cache, không phù hợp PostgreSQL source of truth khi scale.
- **Đề xuất kỹ thuật:** B cho MVP; có thể thêm A khi gameplay thực sự cần khái niệm vị trí hiện tại.
- **Phần bị chặn:** Nối command `chuyenmap` vào state/runtime và xác định transaction boundary.
- **Câu trả lời của chủ dự án:** Chọn phương án B — `mapId` là input của mỗi activity, không persist current map.
- **Kết quả:** Exploration snapshot `mapId`/`spawnPoolId`; không thêm migration hoặc player map state.
- **Thay đổi quyết định ngày 2026-07-21:** Chủ dự án yêu cầu Thám Hiểm luôn dùng map hiện tại của Player và bổ sung di chuyển map cao hơn/thấp hơn. Quyết định B bị thay thế bởi **phương án A — persist current map**. Exploration vẫn snapshot `mapId` đã resolve để replay deterministic, nhưng Discord không còn truyền map tùy ý vào mỗi lần thám hiểm.
- **Trạng thái:** RESOLVED
---

## Q-MAP-004 — Thứ tự tuyến đường và map khởi đầu

- **Bối cảnh:** Đã chốt persist current map và di chuyển cao hơn/thấp hơn. GameData có bốn map nhưng chưa có `navigationOrder`; `TRUC_LAM` và `LINH_KHE` cùng yêu cầu Realm order 1 và nằm ở hai châu lục khác nhau, nên không thể suy ra duy nhất map kế/cận từ cảnh giới hoặc thứ tự object JSON.
- **Tài liệu/code liên quan:** `maps.json`, `MapEncounterService`, `/chuyenmap`, `/thamhiem`, quyết định mới của `Q-MAP-003`.
- **Điểm chưa rõ:** Map khởi đầu là map nào; tuyến `LOWER/HIGHER` đi theo thứ tự nào; có cho chuyển qua map chưa mở khóa hay dừng ở biên; hai map cùng cấp là hai bậc riêng hay map song song.
- **Phương án A — Tuyến toàn cục explicit (đề xuất):** thêm `navigationOrder` và `isStartingMap` vào GameData. Baseline đề xuất `TRUC_LAM → LINH_KHE → HOA_DIEM_SON → THIEN_MON`; nút cao/thấp đi đúng một bậc, map khóa chặn di chuyển. Đơn giản, deterministic, đúng UX Discord RPG; nhưng tuyến đi xuyên châu lục và Linh Khê/Hỏa Diệm Sơn chưa phản ánh thuần thứ tự Realm.
- **Phương án B — Tuyến theo cấp cảnh giới:** map cùng Realm là nhánh song song, `HIGHER` đi tới tier Realm kế tiếp và `LOWER` quay về tier trước. Hợp progression nhưng khi một tier có nhiều map cần thêm select hoặc lưu lịch sử để biết nhánh đích.
- **Phương án C — Tuyến riêng theo châu lục:** cao/thấp chỉ đi trong cùng continent; muốn đổi continent dùng thao tác khác. Lore rõ nhưng dữ liệu hiện mỗi châu chỉ có hai map và cần thêm command/chính sách vượt châu.
- **Đề xuất kỹ thuật (chưa áp dụng):** A, với route explicit và `TRUC_LAM` là starting map. Repository không suy luận thứ tự từ mảng JSON; validator bắt unique order và đúng một starting map.
- **Phần bị chặn:** bootstrap current map cho Player cũ/mới, logic `HIGHER/LOWER`, UI `/chuyenmap`, và bỏ option map khỏi `/thamhiem`. Schema/repository lưu current map độc lập với route vẫn có thể triển khai.
- **Câu trả lời của chủ dự án:** Chọn A và cung cấp tuyến 15 map theo đúng 15 cảnh giới: `Thanh Vân Sơn Mạch → Huyền Mộc Quốc → Đông Hoang Đại Lục → Trung Châu Thánh Vực → Thiên Linh Giới → Hư Không Hải → Thánh Linh Đại Lục → Cửu Thiên Tiên Cảnh → Thiên Kiếp Giới → Tiên Giới → Huyền Thiên Tiên Vực → Kim Khuyết Thiên → Thái Sơ Giới → Đại La Thiên → Khởi Nguyên Đạo Giới`.
- **Kết quả:** Tuyến toàn cục dùng `navigationOrder` 1–15, `Thanh Vân Sơn Mạch` là map khởi đầu; mỗi thao tác chỉ đi một bậc và map khóa/chưa có content sẽ chặn di chuyển. Ba map đầu dùng spawn pool hiện hữu; 12 map còn lại giữ `CONTENT_PENDING`, không tự tạo quái/reward.
- **Trạng thái:** RESOLVED
---

## Q-REWARD-004 — Semantics runtime của Equipment `realmOffset`

- **Bối cảnh:** Reward table Nguyên Anh đã khai báo `realmOffset: 0`, nhưng `RewardTableService` hiện chỉ roll equipment type và grade quality; field này chưa được dùng để chọn equipment grade/pool theo cảnh giới.
- **Tài liệu liên quan:** `reward_tables.json`, `equipment_grades.json`, `equipment_grade_pools.json`, `RewardTableService`.
- **Điểm chưa rõ:** Offset áp dụng lên `realm.order` để chọn grade pool, lên required realm của grade, hay chỉ là metadata dành cho content tương lai?
- **Phương án A — Realm order -> grade pool:** resolve target order bằng `context.realmId + offset`, rồi chọn pool theo data; linh hoạt nhưng cần contract mapping realm-to-pool đầy đủ.
- **Phương án B — Reward table khai báo `gradePoolId` trực tiếp:** reference rõ và dễ validate; `realmOffset` không còn cần cho bảng tĩnh.
- **Phương án C — Giữ metadata, chưa áp dụng MVP:** không thay đổi runtime hiện tại nhưng equipment Nguyên Anh vẫn dùng grade mặc định `HOANG`.
- **Đề xuất kỹ thuật:** B để data author kiểm soát reward hiếm và tránh suy diễn offset.
- **Phần bị chặn:** Chỉ semantics grade/pool của equipment reward; currency/item reward và alias resolution đã hoàn tất.
- **Câu trả lời của chủ dự án:** Chọn phương án B — reward entry khai báo `gradePoolId` trực tiếp.
- **Kết quả:** Đã load/validate equipment grade pool và RewardTableService resolve direct reference; assignment cho bảng Nguyên Anh tách sang `Q-REWARD-005`.
- **Trạng thái:** RESOLVED

---

## Q-REWARD-005 — Grade Pool cụ thể cho `MONSTER_NGUYEN_ANH`

- **Bối cảnh:** Contract direct `gradePoolId` đã được duyệt và triển khai. Registry hiện có `MAP_LUYEN_KHI`, `MAP_TRUC_CO`, `MAP_KET_DAN`, nhưng baseline Nguyên Anh chưa chỉ định dùng pool nào và chưa có pool `MAP_NGUYEN_ANH`.
- **Tài liệu liên quan:** `equipment_grade_pools.json`, `MONSTER_NGUYEN_ANH`, `Q-REWARD-004`.
- **Điểm chưa rõ:** Equipment drop Nguyên Anh dùng pool Kết Đan hiện hữu hay cần pool riêng?
- **Phương án A — `gradePoolId: MAP_KET_DAN`:** triển khai ngay, phân phối Huyền 40%/Địa 60%; tái sử dụng pool nhưng tên pool thấp hơn reward realm.
- **Phương án B — Tạo `MAP_NGUYEN_ANH`:** content rõ và cân bằng độc lập; cần cung cấp tỷ trọng grade cụ thể.
- **Phương án C — Dùng `MAP_TRUC_CO`:** bảo thủ hơn nhưng có thể hạ thấp đáng kể reward Nguyên Anh.
- **Đề xuất kỹ thuật:** A cho MVP, sau đó tách B khi có balance data riêng.
- **Phần bị chặn:** Chỉ assignment grade của Equipment trong `MONSTER_NGUYEN_ANH`; Map, currency/item reward và grade-pool runtime không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn phương án A — `gradePoolId: MAP_KET_DAN` cho MVP.
- **Kết quả:** Equipment entry của `MONSTER_NGUYEN_ANH` trỏ trực tiếp `MAP_KET_DAN`; runtime roll Huyền 40%/Địa 60%. `realmOffset` được loại khỏi entry này.
- **Trạng thái:** RESOLVED
->bổ sung ràng buộc
Mục tiêu hiện tại là hoàn tất runtime reward và giữ phạm vi MVP nhỏ. Chưa tạo MAP_NGUYEN_ANH trong giai đoạn này vì hệ thống map, monster content và balance theo các cảnh giới cao hơn sẽ được bổ sung sau.

Đây là cấu hình fallback tạm thời:

{
  "gradePoolId": "MAP_KET_DAN"
}

Quy tắc bắt buộc:

Không hard-code mapping NGUYEN_ANH -> MAP_KET_DAN trong code.
MONSTER_NGUYEN_ANH phải tham chiếu trực tiếp gradePoolId bằng dữ liệu.
Runtime chỉ resolve pool theo ID được khai báo.
Khi thêm content Nguyên Anh hoàn chỉnh, có thể tạo MAP_NGUYEN_ANH và thay đổi reference trong JSON mà không sửa Reward Resolver.
Việc dùng MAP_KET_DAN không có nghĩa Equipment Nguyên Anh vĩnh viễn dùng pool Kết Đan.
Ghi nhận đây là technical debt/content pending trong changelog hoặc roadmap.

---

## Q-COMBAT-001 — Semantics của Freeze, Stun và Silence

- **Bối cảnh:** Core effects `FREEZE`/`STUN` dùng action `SKIP_TURN`; `SILENCE` dùng `DISABLE_SKILL`. ActionExecutor chưa hỗ trợ hai type này. Action spec lại quy định Action không được thay đổi battle flow, trong khi skip turn trực tiếp điều khiển flow.
- **Tài liệu liên quan:** `effects.json`, `004_SKILL_ACTION_SPEC.md`, `008_ACTION_SPEC.md`, `BattleEngine`, `ActionExecutor`.
- **Điểm chưa rõ:** Control effect nên phát lệnh điều khiển turn qua Action, hay Battle Engine đọc một control directive/status từ Effect; Silence bỏ toàn bộ hành động hay chỉ cấm skill và cho Basic Attack?
- **Phương án A — Effect control directive:** Effect khai báo typed directive `SKIP_ACTION` hoặc `BASIC_ATTACK_ONLY`; Battle Engine resolve directive trước skill selection. Turn vẫn chạy TURN_START/TURN_END, tick và expire; Freeze/Stun bỏ skill action, Silence dùng Basic Attack. Giữ Action thuần và đúng spec nhưng cần đổi schema effect.
- **Phương án B — Flow Action executor:** triển khai `SKIP_TURN`/`DISABLE_SKILL` trong ActionExecutor và ghi flag vào BattleContext; ít đổi data nhưng vi phạm nguyên tắc Action không thay đổi flow.
- **Phương án C — Hard-code theo effect ID/tag:** code nhanh nhưng không data-driven và khó thêm control effect mới.
- **Đề xuất kỹ thuật:** A.
- **Phần bị chặn:** Runtime đúng của Freeze, Stun, Silence và executor coverage tương ứng. Damage/heal/shield/effect/modifier hiện hữu không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn A.
Control Effect không được điều khiển battle flow thông qua ActionExecutor.

FREEZE, STUN và SILENCE phải tạo ra typed control directive hoặc control status để BattleEngine resolve trước bước chọn hành động.

Semantics được chốt:

STUN:
Directive: SKIP_ACTION
Entity không thực hiện Skill hoặc Basic Attack.
Turn vẫn chạy đầy đủ TURN_START và TURN_END.
Effect duration, cooldown, damage-over-time và các trigger theo lượt vẫn được tick.
FREEZE:
Directive: SKIP_ACTION
Semantics MVP giống STUN.
FREEZE vẫn là effect type riêng để sau này có thể thêm tương tác như giải băng, tăng sát thương Hỏa hoặc kháng Băng mà không đổi contract control.
SILENCE:
Directive: BASIC_ATTACK_ONLY
Entity không được sử dụng Active Skill.
Entity vẫn thực hiện Basic Attack nếu còn sống và có mục tiêu hợp lệ.
Silence không chặn Passive Skill, trừ khi một passive cụ thể có rule riêng.

Thứ tự resolve đề xuất:

TURN_START
→ tick/expire effect đầu lượt
→ resolve control directives
→ chọn hành động
→ thực hiện Skill hoặc Basic Attack
→ TURN_END

Nếu entity đồng thời chịu nhiều control effect:

SKIP_ACTION > BASIC_ATTACK_ONLY > NORMAL_ACTION

Tức STUN + SILENCE vẫn bỏ toàn bộ hành động.

Không triển khai SKIP_TURN hoặc DISABLE_SKILL như flow-changing Action trong ActionExecutor.

Có thể giữ các Action type legacy trong normalizer để compatibility, nhưng phải normalize sang control directive trước khi vào runtime.
- **Kết quả triển khai:** `FREEZE`/`STUN` khai báo `SKIP_ACTION`, `SILENCE` khai báo `BASIC_ATTACK_ONLY`; `ControlDirectiveResolver` áp dụng ưu tiên `SKIP_ACTION > BASIC_ATTACK_ONLY > NORMAL_ACTION` trước skill selection. `SKIP_TURN`/`DISABLE_SKILL` đã rời khỏi normalized runtime content.
- **Trạng thái:** RESOLVED

---

## Q-COMBAT-002 — Contract của Chain Damage

- **Bối cảnh:** Effect `CHAIN_DAMAGE` tham chiếu formula `LIGHTNING_CHAIN`, nhưng action cùng tên chưa có executor. Formula bridge hiện tính một hit bằng `(ATK - adjusted DEF) × 0.8 × RANDOM`; chưa có số lần nảy, cách chọn mục tiêu hay giảm damage qua mỗi lần nảy.
- **Tài liệu liên quan:** `effects.json`, `formulas.json` normalized bridge, Action/Target specs.
- **Điểm chưa rõ:** Chain đánh bao nhiêu mục tiêu, có lặp mục tiêu không, chọn theo random/thứ tự nào, và damage mỗi jump có decay không?
- **Phương án A — Explicit chain arguments:** data khai báo `maxTargets`, `allowRepeat`, `targetStrategy` và `jumpMultipliers`; executor chỉ điều phối các hit độc lập bằng Formula Engine. Linh hoạt, deterministic nhưng cần bộ số baseline.
- **Phương án B — AOE alias:** coi Chain Damage là DAMAGE lên `ENEMY_ALL` với cùng formula; đơn giản nhưng không còn semantics nảy mục tiêu.
- **Phương án C — Tạm vô hiệu hóa effect:** không xử lý sai nhưng Lightning content mất cơ chế đặc trưng.
- **Đề xuất kỹ thuật:** A; baseline đề xuất `maxTargets: 3`, không lặp, chọn enemy random không replacement, multiplier từng jump `1.0/0.7/0.4`.
- **Phần bị chặn:** Chỉ `CHAIN_DAMAGE`; các Lightning skill damage trực tiếp vẫn chạy.
- **Câu trả lời của chủ dự án:** Chọn A và baseline đề xuất: tối đa 3 mục tiêu, không lặp, random enemy không replacement, multiplier `1.0/0.7/0.4`.
- **Kết quả triển khai:** `CHAIN_DAMAGE` là executable action, đọc toàn bộ contract từ arguments và chuyển từng jump qua Formula Engine với `CHAIN_MULTIPLIER`; `LIGHTNING_CHAIN` đã là formula data thật thay vì bridge.
- **Trạng thái:** RESOLVED
---

## Q-COMBAT-003 — Trigger của Defense Skill và legacy `TRIGGER_ACTION`

- **Bối cảnh:** Toàn bộ Defense Skill là PASSIVE, trigger `HP_BELOW_PERCENT` 30%, duration 2, once-per-battle. SkillManager hiện chỉ chọn ACTIVE `TURN_ACTION`; trigger dispatcher không hiểu `HP_BELOW_PERCENT`. Các effect `DEFENSE_*` còn là bridge placeholder có `TRIGGER_ACTION` rỗng, trái rule Action không được gọi Action khác.
- **Tài liệu liên quan:** `defense_skills_templates.json`, `skill_rules.json`, Trigger System spec, bridge normalizer, SkillManager/TriggerDispatcher.
- **Điểm chưa rõ:** Kiểm tra ngưỡng HP ngay sau damage hay ở TURN_START; effect `DEFENSE_*` là marker/status hay phải kích hoạt thêm gameplay nào; duration 2 áp dụng cho shield/effect theo semantics nào?
- **Phương án A — Reactive after damage:** sau mỗi damage làm HP đi qua/ở dưới ngưỡng, condition evaluator kích hoạt Defense Skill một lần mỗi battle; thực thi trực tiếp skill actions. `DEFENSE_*` trở thành marker effect không có nested `TRIGGER_ACTION`; shield tồn tại theo shield state, marker duration 2 turn. Phản ứng tức thời và đúng once-per-battle.
- **Phương án B — TURN_START evaluation:** chỉ kích hoạt đầu lượt owner khi HP dưới ngưỡng; đơn giản hơn nhưng có thể chết trước khi skill phòng thủ phản ứng.
- **Phương án C — Loại Defense Skill khỏi MVP:** giữ data nhưng validator đánh dấu content pending; giảm phạm vi nhưng mất toàn bộ passive defense.
- **Đề xuất kỹ thuật:** A; condition được đánh giá sau applied damage và trước ON_DEATH chỉ khi entity còn sống.
- **Phần bị chặn:** Passive Defense Skill, condition evaluator và loại bỏ legacy `TRIGGER_ACTION` placeholder.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả triển khai:** condition được evaluate sau applied HP damage và trước `ON_DEATH`, chỉ khi target còn sống; action của passive được thực thi trực tiếp và key `entityId:skillId` chặn trigger lại trong cùng battle. `DEFENSE_*` là marker 2 turn không có nested action; shield tồn tại trong shield state.
- **Trạng thái:** RESOLVED
-> Chọn A

---

## Q-PROFILE-001 — Vai trò, visibility và read model chuẩn của hồ sơ người chơi

- **Bối cảnh:** Discord hiện có `/hoso` dạng embed tổng quan theo legacy `PlayerReadService` và `/nhanvat` dạng tab tương tác ephemeral. `PlayerProgressService` có thêm sect, unlock, activity summary và wallet nhưng chưa được nối vào command. Hai read model có thể lệch trường và công thức khi tiếp tục mở rộng.
- **Tài liệu/phần code liên quan:** Phase 2 trong `ROADMAP_DATABASE_ARCHITECTURE.md`, `PlayerReadService`, `PlayerProgressService`, command `/hoso` và `/nhanvat`.
- **Điểm chưa rõ:** Hồ sơ nào là public; màn hình nào dùng để quản lý riêng tư; có hợp nhất command hay giữ hai command; phần sect/unlock/activity có được công khai hay không.
- **Phương án A — Giữ hai trải nghiệm, dùng chung canonical profile query:** `/hoso` là public summary giới hạn trường; `/nhanvat` là ephemeral management view; hai presenter lấy từ cùng application read model. Ít phá UX, tránh lệch dữ liệu, nhưng phải định nghĩa field-level visibility.
- **Phương án B — Hợp nhất thành một command có public/private mode:** ít command hơn và một presenter chính, nhưng thay đổi UX/interaction hiện tại và cần policy quyền riêng tư rõ ràng.
- **Phương án C — Tiếp tục hai read model độc lập:** ít refactor trước mắt, nhưng tăng nguy cơ sai lệch công thức, field và cache/persistence về sau.
- **Đề xuất kỹ thuật:** A; giữ presenter Discord riêng theo mục đích nhưng dùng một canonical application query, với allowlist field công khai thay vì trả toàn bộ progress object.
- **Phần bị chặn:** hợp nhất Profile query vào Discord, thay đổi command/visibility, và công khai sect/unlock/activity. Utility tính stage và sửa lỗi read model độc lập không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn A — giữ presenter Discord riêng theo mục đích, dùng canonical application query và allowlist field công khai.
- **Kết quả triển khai:** `PlayerReadService` cung cấp canonical query cùng projection `getPublicProfileView()`/`getManagementProfileView()`; `/hoso` chỉ nhận public DTO không chứa RuntimePlayer/Player, `/nhanvat` dùng management view. Alias `getProfileView()` được giữ cho compatibility.
- **Trạng thái:** RESOLVED

---

## Q-GATHERING-005 — Mô hình cấp bậc của Linh Thảo và Linh Khoáng

- **Bối cảnh:** Chủ dự án yêu cầu Linh Thảo/Linh Khoáng chia cấp bậc và tài nguyên rơi theo map. Tuy nhiên Item hiện chỉ có `rarity` dùng chung (`COMMON..LEGENDARY`); chưa có khái niệm cấp tài nguyên. Map hiện có 15 bậc tương ứng 15 đại cảnh giới.
- **Tài liệu/code liên quan:** `docs/03_ITEM/001_ITEM_TEMPLATE_SPEC.md`, `008_GATHERING_SPEC.md`, `item_templates.json`, `item_rarities.json`, `maps.json`, `gathering_templates.json`.
- **Điểm chưa rõ:** Cấp tài nguyên có đồng nhất với rarity hay là trục progression độc lập; có đúng một cấp cho mỗi map/đại cảnh giới hay nhiều map có thể dùng chung cấp.
- **Phương án A — Cấp tài nguyên bằng bậc map:** thêm `resourceTier = navigationOrder` (1–15) và `requiredMapId`; rarity vẫn mô tả độ hiếm bên trong cùng cấp. Rõ progression, dễ kiểm tra recipe theo map nhưng tạo 15 tier.
- **Phương án B — Ít tier dùng chung nhiều map:** ví dụ Phàm/Linh/Huyền/Địa/Thiên/Tiên/Thần; gọn dữ liệu nhưng phải chốt ranh giới map và nhiều map rơi cùng cấp.
- **Phương án C — Dùng thẳng Item rarity làm cấp:** ít field nhất nhưng trộn “độ hiếm khi rơi” với “cấp nguyên liệu”, khó scale tới 15 map và recipe.
- **Đề xuất kỹ thuật:** A. `resourceTier` là progression identity; `rarity` tiếp tục là độ hiếm. Mọi liên hệ map–resource nằm trong GameData, không hardcode trong service.
- **Phần bị chặn:** schema Item nguyên liệu, validator cấp tài nguyên, map resource pool và recipe requirement theo cấp.
- **Câu trả lời của chủ dự án:** Duyệt phương án A qua yêu cầu “oke làm đi”.
- **Kết quả triển khai:** `resourceTier` bằng `map.navigationOrder`; 60 resource được merge thành canonical MATERIAL Item, rarity tiếp tục là trục độc lập. Validator bắt tier khớp map.
- **Trạng thái:** RESOLVED

---

## Q-GATHERING-006 — Danh mục tài nguyên trên từng map

- **Bối cảnh:** Chủ dự án đã nêu ví dụ map Luyện Khí/Thanh Vân Sơn Mạch có `Tụ Linh Thảo` và `Thanh Tâm Thảo`, nhưng chưa có danh sách Linh Khoáng tại map này hoặc danh sách tài nguyên cho 14 map còn lại.
- **Tài liệu/code liên quan:** `maps.json`, `item_templates.json`, `reward_tables.json`, `craft_templates.json`, `profession` GameData.
- **Điểm chưa rõ:** Mỗi map có bao nhiêu loại Thảo/Khoáng; mọi map có đủ cả hai nhóm hay có map chuyên biệt; tên và công dụng của toàn bộ tài nguyên.
- **Phương án A — Hai Thảo + hai Khoáng mỗi map:** Codex soạn bảng đề xuất 60 tài nguyên theo phong cách tu tiên để chủ dự án duyệt trước khi author JSON. Content đều và dễ cân bằng, nhưng số lượng Item/recipe lớn.
- **Phương án B — Hai Thảo + một Khoáng mỗi map:** 45 tài nguyên; giảm content nhưng nghề Luyện Khí có ít lựa chọn hơn Luyện Đan.
- **Phương án C — Số lượng biến thiên theo map:** giàu bản sắc từng khu vực nhưng cần chủ dự án cung cấp hoặc duyệt riêng ma trận 15 map.
- **Đề xuất kỹ thuật:** A; trước tiên author đầy đủ bảng tên/mô tả/công dụng ở tài liệu, chỉ đưa vào JSON sau khi bảng được duyệt.
- **Phần bị chặn:** tạo Item Template và Reward Pool từ map Trúc Cơ trở lên; ngay cả Linh Khoáng Luyện Khí cũng chờ tên được duyệt. Hai tên `Tụ Linh Thảo`, `Thanh Tâm Thảo` được ghi nhận nhưng chưa tự đặt thông số.
- **Câu trả lời của chủ dự án:** Duyệt phương án A. Catalog 60 tài nguyên sẽ được soạn thành proposal riêng; tên/mô tả chưa được kích hoạt vào JSON cho tới khi catalog được duyệt.
- **Phê duyệt catalog:** Chủ dự án trả lời “oke giúp tôi” sau khi nhận catalog proposal.
- **Kết quả triển khai:** Catalog 15 map × 2 Thảo × 2 Khoáng được author tại `gathering/resource_catalog.json`; tài liệu catalog chuyển `APPROVED`.
- **Trạng thái:** RESOLVED

---

## Q-GATHERING-007 — Cách chọn hoạt động và phân phối sản lượng

- **Bối cảnh:** Gathering hiện có hai template toàn cục `HERB_GATHERING`/`MINING`, lần lượt duration 30/60 giây và Reward Table toàn cục. Yêu cầu mới bắt buộc reward phụ thuộc map hiện tại.
- **Tài liệu/code liên quan:** `008_GATHERING_SPEC.md`, `gathering_templates.json`, `reward_tables.json`, `GatheringService`, `GatheringCompletionService`, `PlayerMapService`.
- **Điểm chưa rõ:** Người chơi chọn nhóm tài nguyên hay chọn chính xác từng cây/quặng; tỷ lệ và số lượng mỗi lần thu thập; có cho phép Linh Khoáng từ Luyện Khí hay tiếp tục khóa Kết Đan như dữ liệu cũ.
- **Phương án A — Chọn nhóm, roll pool của map:** `/thuthap` cho chọn `Linh Thảo` hoặc `Linh Khoáng`; Reward System roll các tài nguyên trong pool tương ứng map. Data ít, đúng gameplay idle, nhưng không farm đích danh một Item.
- **Phương án B — Chọn chính xác tài nguyên:** người chơi chọn Tụ Linh Thảo/Thanh Tâm Thảo/...; kiểm soát nguyên liệu tốt nhưng UI dài và giảm vai trò Reward Table.
- **Phương án C — Một lần roll chung cả Thảo/Khoáng:** thao tác đơn giản nhất nhưng nghề nghiệp khó chủ động tìm nguyên liệu.
- **Đề xuất kỹ thuật:** A. Mỗi map có hai Gathering Template hoặc hai resource pool; snapshot `mapId`, `resourceFamily`, `rewardTableId` khi start. Cần chủ dự án chốt thêm weights, quantity, duration và việc Mining mở từ map đầu hay Kết Đan.
- **Phần bị chặn:** GameData reward pools, kiểm tra current map khi start, slash command và balance sản lượng.
- **Câu trả lời của chủ dự án:** Duyệt phương án A qua yêu cầu “oke làm đi”; người chơi chọn nhóm và Reward System roll pool theo map.
- **Kết quả triển khai:** Mỗi map sinh hai pool HERB/ORE. Start bắt buộc template thuộc map hiện tại và snapshot map/family/tier; Reward System dùng `WEIGHTED_ONE` để trả đúng một tài nguyên.
- **Trạng thái:** RESOLVED

---

## Q-GATHERING-008 — Giao diện `/thuthap` và khôi phục phiên đang chạy

- **Bối cảnh:** Lazy Gathering backend đã có start/claim và unique constraint một run active/player, nhưng chưa có Discord command và `ActivityRunRepository` chưa có query đọc run Gathering active. Nếu chỉ giữ collector trong 30–60 giây, bot restart hoặc UI hết hạn sẽ khiến người chơi không có cách lấy lại `runId` để claim.
- **Tài liệu/code liên quan:** `GatheringCompletionService`, `ActivityRunRepository`, migration `011_gathering_lazy_activity.sql`, `ComponentSession`, các command `/nghenghiep` và `/chuyenmap`.
- **Điểm chưa rõ:** Claim tự động hay người chơi bấm nhận; command mới độc lập hay nằm trong giao diện map.
- **Phương án A — `/thuthap` dashboard start/claim:** hiển thị map hiện tại, hai nhóm tài nguyên, run đang hoạt động và nút `Thu hoạch` khi sẵn sàng. Repository query lại active run nên chịu được restart/timeout. Đúng lazy/idempotent nhưng cần thêm read model.
- **Phương án B — Nút Thu thập trong `/chuyenmap`:** ít command hơn nhưng trộn navigation với activity và giao diện nhanh chạm giới hạn component.
- **Phương án C — Tự động claim khi đủ giờ:** UX ít thao tác nhưng cần scheduler hoặc claim ngầm ở request khác, làm lifecycle/reward khó nhìn.
- **Đề xuất kỹ thuật:** A; vẫn không dùng timer ghi DB. Discord timestamp hiển thị `readyAt`, người chơi mở lại `/thuthap` và claim bằng operation ID của interaction.
- **Phần bị chặn:** slash command, active-run lookup và presentation/error copy.
- **Câu trả lời của chủ dự án:** Duyệt phương án A qua yêu cầu “oke làm đi”.
- **Kết quả triển khai:** Thêm `/thuthap`, active-run lookup từ `activity_runs`, computed READY, start/claim/refresh/close và owner-only ComponentSession. Phiên mới phục hồi được run cũ sau timeout/restart.
- **Trạng thái:** RESOLVED

---

## Q-GATHERING-009 — Baseline thời gian, tỷ lệ và sản lượng thu thập

- **Bối cảnh:** Lazy runtime yêu cầu `duration`, Reward Table yêu cầu `chance/weight` và `quantity`; đây là thông số balance chưa được chủ dự án cung cấp. Dữ liệu cũ dùng Thảo 30 giây, Khoáng 60 giây nhưng không theo map và tham chiếu Item chưa tồn tại.
- **Tài liệu/code liên quan:** `gathering_templates.json`, `reward_tables.json`, `GatheringCompletionService`, yêu cầu tài nguyên theo map.
- **Điểm chưa rõ:** Duration có tăng theo cấp map không; xác suất giữa hai tài nguyên cùng nhóm; sản lượng cơ bản; Mining bắt đầu ở map nào.
- **Phương án A — Baseline cố định mọi map:** Thảo 30 giây, Khoáng 60 giây; cả hai mở từ map Luyện Khí; mỗi pool hai tài nguyên với tỷ lệ `75/25`, sản lượng lần lượt `1–3` và `1`. Dễ hiểu/cân bằng ban đầu, chỉnh hoàn toàn qua JSON.
- **Phương án B — Duration/sản lượng scale theo map:** map cao lâu hơn và cho nhiều hơn theo công thức; tạo cảm giác progression nhưng cần chốt công thức cụ thể trước khi code.
- **Phương án C — Cùng thời gian 30 giây, sản lượng theo map:** UI nhanh và đồng đều nhưng giảm khác biệt giữa hái Thảo và khai Khoáng.
- **Đề xuất kỹ thuật:** A làm baseline có thể chỉnh; không hardcode. Mỗi Gathering Template/Reward Pool author explicit để sau này đổi riêng từng map mà không sửa service.
- **Phần bị chặn:** thông số JSON Gathering/Reward và test deterministic sản lượng.
- **Câu trả lời của chủ dự án:** Duyệt phương án A: Thảo 30 giây, Khoáng 60 giây, mở từ Luyện Khí, pool `75/25`, sản lượng `1–3/1`.
- **Kết quả triển khai:** Baseline nằm trong `gathering_rules.json`; validator khóa contract và audit deterministic xác nhận nhánh chính/hiếm.
- **Trạng thái:** RESOLVED

---

## Q-PROFESSION-015 — Nối tài nguyên Gathering mới vào Phá Chướng Đan

- **Bối cảnh:** Gathering đã phát hành `Tụ Linh Thảo`, `Thanh Tâm Thảo` và 58 tài nguyên theo map. Recipe live duy nhất vẫn tiêu `SPIRIT_HERB ×5`; Item này là nguyên liệu generic cũ và không còn rơi từ Gathering mới. Đổi input trực tiếp ảnh hưởng inventory hiện có và nhịp chế tạo.
- **Tài liệu/code liên quan:** `craft_templates.json`, `item_templates.json`, `resource_catalog.json`, `ProfessionService`, inventory split/backfill.
- **Điểm chưa rõ:** Phá Chướng Đan dùng tài nguyên cụ thể nào; xử lý `SPIRIT_HERB` người chơi đang sở hữu; recipe tương lai dùng explicit Item hay nhóm family/tier.
- **Phương án A — Recipe explicit và chuyển đổi legacy:** đổi recipe thành `Tụ Linh Thảo ×4 + Thanh Tâm Thảo ×1`; migration/backfill đổi mỗi `SPIRIT_HERB` cũ thành `Tụ Linh Thảo` theo tỷ lệ 1:1; giữ template cũ deprecated một thời gian. Dễ hiểu và tạo giá trị cho cả hai Thảo Luyện Khí, nhưng người có kho cũ vẫn phải tìm Thanh Tâm Thảo.
- **Phương án B — Ingredient group theo tag:** recipe yêu cầu tổng `5` Linh Thảo tier 1, cho phép trộn Tụ Linh/Thanh Tâm; runtime consume nhiều Item theo family+tier. Linh hoạt cho 60 tài nguyên nhưng làm Thanh Tâm hiếm có thể bị tiêu ngoài ý muốn và cần UI chọn/priority.
- **Phương án C — Giữ recipe cũ, thêm chuyển hóa:** thêm công thức/đổi `Tụ Linh Thảo → SPIRIT_HERB`; ít ảnh hưởng recipe nhưng tạo một lớp nguyên liệu trung gian dư thừa và Thanh Tâm chưa có công dụng.
- **Đề xuất kỹ thuật:** A cho recipe hiện tại; các recipe mới tiếp tục author explicit để mỗi tài nguyên có vai trò rõ. Migration phải idempotent và ghi Resource Ledger nếu chạy trên dữ liệu live.
- **Phần bị chặn:** thay input recipe, migration inventory legacy và xóa/deprecate `SPIRIT_HERB`. UI metadata tài nguyên không phụ thuộc và có thể triển khai.
- **Câu trả lời của chủ dự án:** Chọn A — recipe explicit `Tụ Linh Thảo ×4 + Thanh Tâm Thảo ×1`; chuyển `SPIRIT_HERB` sang `Tụ Linh Thảo` theo tỷ lệ 1:1 và giữ template cũ ở trạng thái deprecated.
- **Kết quả triển khai:** Recipe đã dùng hai Gathering Item explicit. Migration `026_gathering_resource_recipe_cutover.sql` chọn đúng persistence authoritative theo cutover state, ghi Resource Ledger có operation guard, chuyển cả `player_items` và `inventory_stacks`, đồng thời bảo toàn tổng lượng khi stack đích đã tồn tại. Validator kiểm tra replacement của Item deprecated.
- **Trạng thái:** RESOLVED

---

## Q-SKILL-002 — Phạm vi ô trang bị Kỹ Năng

- **Bối cảnh:** Chủ dự án yêu cầu `/congphap` quản lý cả Công Pháp tu luyện và Kỹ Năng, nhân vật ban đầu có 2 ô Kỹ Năng. Hiện `player_skills` chỉ lưu ownership; Battle nhận toàn bộ `runtimePlayer.skillIds`, còn Passive Effect cũng lấy từ toàn bộ kỹ năng đã học. Chưa có trạng thái equipped.
- **Tài liệu/code liên quan:** `player_skills`, `PlayerRuntimeRepository`, `SkillService`, `EffectResolver`, `BattleEntityFactory`, `/congphap`, `/kynang`.
- **Điểm chưa rõ:** Hai ô áp dụng cho Active Skill hay cả Passive Skill; Passive đã học có luôn hoạt động hay phải trang bị; một Skill có thể nằm ở nhiều ô không.
- **Phương án A — Ô chỉ dành cho Active Skill (đề xuất):** Active Skill phải được trang bị mới vào Battle; Passive đã học tiếp tục luôn hoạt động. Mỗi Active Skill chỉ chiếm một ô và không được lặp. Ít phá vỡ effect hiện hữu, UI dễ hiểu, nhưng Passive không chịu giới hạn loadout.
- **Phương án B — Active và Passive dùng chung hai ô:** chỉ Skill được trang bị mới có Action/Effect. Loadout có lựa chọn rõ nhưng hai ô đầu rất chật và migration có thể làm mất nhiều Passive đang hoạt động.
- **Phương án C — Tách ô Active và Passive:** ban đầu 2 ô Active và một số ô Passive riêng. Linh hoạt nhất nhưng cần chốt thêm curve Passive và UI/persistence phức tạp hơn.
- **Đề xuất kỹ thuật:** A. Thêm `equipped_slot` nullable vào `player_skills`, unique theo Player/slot và partial unique theo Player/Skill khi equipped. Battle chỉ lấy Active equipped; EffectResolver tiếp tục lấy Passive ownership.
- **Đề xuất UI:** một select riêng cho Công Pháp tu luyện và một multi-select riêng cho loadout Kỹ Năng. `maxValues` của select Kỹ Năng lấy từ capacity GameData; không sinh một action row cho từng ô nên vẫn scale khi số ô tăng.
- **Phần bị chặn:** migration equipped skill, equip/unequip transaction, Battle loadout projection và hai select Skill.
- **Câu trả lời của chủ dự án:** Chọn A — ô hiện tại chỉ dành cho Active Skill; Passive đã học luôn hoạt động.
- **Kết quả xử lý:** Quyết định này được `Q-SKILL-004` thay thế một phần: Active và Passive hiện cùng chiếm tổng loadout; chỉ Skill được trang bị mới vào Battle/Effect pipeline.
- **Trạng thái:** RESOLVED
---

## Q-START-001 — Cách nhập và ràng buộc Đạo hiệu

- **Bối cảnh:** `/start` hiện lấy thẳng `interaction.user.username` làm `players.name` và tạo Player ngay. Chủ dự án muốn người chơi có Đạo hiệu riêng trong luồng tạo nhân vật dạng message/button.
- **Tài liệu/code liên quan:** `/start`, `PlayerStartService`, `PlayerRuntimeRepository.createPlayer`, cột `players.name`, các profile/leaderboard.
- **Điểm chưa rõ:** Nhập Đạo hiệu bằng modal hay slash option; giới hạn độ dài/ký tự; Đạo hiệu có bắt buộc duy nhất toàn server không.
- **Phương án A — Modal, không unique toàn cục (đề xuất):** `/start` mở modal; Đạo hiệu 2–24 ký tự Unicode chữ/số/khoảng trắng, trim và gộp khoảng trắng, cấm mention/control/markdown nguy hiểm. Discord user ID vẫn là identity nên hai người có thể trùng Đạo hiệu. UX gọn, không cần unique index và tránh tranh tên.
- **Phương án B — Slash string option, không unique:** `/start dao_hieu:<tên>`; dễ triển khai và autocomplete rõ nhưng command dài, kém cảm giác nhập đạo.
- **Phương án C — Modal và unique không phân biệt hoa thường:** tạo unique normalized name/index. Tạo bản sắc mạnh nhưng phát sinh tranh tên, rename/reservation policy và migration cho Player hiện hữu.
- **Đề xuất kỹ thuật:** A. Lưu Đạo hiệu ở `players.name`; không thêm cột mới. Validation nằm ở application/domain helper dùng chung, Discord chỉ thu input bằng Modal.
- **Phần bị chặn:** modal nhập/đổi tên trong creation session, validator Đạo hiệu và copy lỗi.
- **Câu trả lời của chủ dự án:** Chọn A — nhập Đạo hiệu bằng modal, không unique toàn cục; 2–24 ký tự chữ/số/khoảng trắng.
- **Kết quả xử lý:** `/start` đã dùng modal; policy Unicode chuẩn hóa NFC, trim/gộp khoảng trắng và chặn ký tự ngoài chữ/số/khoảng trắng. Discord ID tiếp tục là identity.
- **Trạng thái:** RESOLVED
---

## Q-START-002 — Quy tắc 5 lần tái tạo Linh Căn khi tạo nhân vật

- **Bối cảnh:** `/start` hiện roll một lần loại Linh Căn và phẩm cấp đời 0 rồi persist ngay. Chủ dự án muốn message có button và cho tối đa 5 lần reroll trước khi xác nhận.
- **Tài liệu/code liên quan:** `PlayerStartService`, `SpiritRootRoller`, `SpiritRootQualityRoller`, bracket Luân hồi 0, `ComponentSession`.
- **Điểm chưa rõ:** “5 lần” là 5 reroll ngoài lượt đầu hay tổng 5 draw; reroll cả loại lẫn phẩm hay chỉ loại; có được chọn lại kết quả cũ; duplicate có tiêu lượt không.
- **Phương án A — Một lượt đầu + 5 reroll, thay thế kết quả (đề xuất):** tối đa 6 draw. Mỗi reroll độc lập cả loại và phẩm cấp, kết quả mới thay thế kết quả cũ, không quay lại; duplicate vẫn hợp lệ và tiêu lượt. Đúng nghĩa reroll, dễ hiểu và không tạo kho kết quả để chọn.
- **Phương án B — Tổng cộng 5 draw và chọn một trong lịch sử:** ít lượt hơn nhưng khả năng tối ưu cao vì giữ toàn bộ kết quả; UI phải có select lịch sử.
- **Phương án C — Một lượt đầu + 5 reroll và được chọn kết quả tốt nhất:** hào phóng nhất, làm phân phối phẩm thực tế lệch mạnh về tier cao và cần balance lại bảng xác suất đời 0.
- **Đề xuất kỹ thuật:** A. `character_creation_rules.json` giữ `maxRerolls: 5`, pool ID/revision và session TTL. Preview ở memory; chưa ghi Player. Confirm recheck Player chưa tồn tại rồi persist final root/quality + `rerollsUsed` snapshot atomically. Timeout/Hủy không ghi database.
- **Phần bị chặn:** creation session state, button Reroll/Confirm, final `startPlayer` input contract và deterministic audit.
- **Câu trả lời của chủ dự án:** Chọn A — một lượt đầu và thêm 5 reroll; mỗi reroll thay cả loại lẫn phẩm, duplicate vẫn tiêu lượt và không giữ lịch sử để chọn lại.
- **Kết quả xử lý:** Đã thêm `character_creation_rules.json`, creation session message/button, secure seeded draw, persist đúng preview cuối cùng cùng `creation_rerolls_used` và revision bằng transaction tạo Player.
- **Trạng thái:** RESOLVED
---

## Q-SKILL-004 — Hợp nhất giới hạn 3 Active với ô Passive

- **Bối cảnh:** `Q-SKILL-002` được chọn A: chỉ Active Skill chiếm ô, Passive đã học luôn hoạt động. Tuy nhiên câu trả lời `Q-SKILL-003` bổ sung “chỉ có tối đa 3 chiêu là chủ động, còn lại là các công pháp bị động map với Effect nhân vật”. Nếu Passive không chiếm ô thì capacity milestone từ 4 đến 9 không còn ý nghĩa; nếu Passive chiếm các ô còn lại thì thay đổi lựa chọn A trước đó.
- **Tài liệu/code liên quan:** `Q-SKILL-002/003`, `player_skills`, `EffectResolver`, `BattleEntityFactory`, `/congphap`.
- **Điểm chưa rõ:** Capacity 2→9 là tổng số Skill trang bị hay chỉ số Active slot; Passive có cần nằm trong loadout mới tác động Effect hay vẫn luôn hoạt động.
- **Phương án A — Tổng loadout 2→9, tối đa 3 Active (đề xuất theo ghi chú mới):** mọi Active/Passive được trang bị đều chiếm một ô; Battle lấy tối đa 3 Active, EffectResolver chỉ lấy Passive đang trang bị. Các ô vượt Active cap dành cho Passive. Mỗi Skill không lặp.
- **Phương án B — Tối đa 3 Active được trang bị, mọi Passive đã học luôn hoạt động:** capacity thực tế chỉ tăng `2 → 3` tại Kết Đan rồi dừng; bỏ các milestone 4→9 vừa chọn. Đơn giản nhưng không còn progression slot dài hạn.
- **Phương án C — Hai capacity độc lập:** Active `2 → 3`, Passive dùng curve milestone riêng `0 → 6` để tổng cuối là 9. Rõ nhất về UI nhưng cần duyệt lại bảng Passive capacity theo từng Realm.
- **Đề xuất kỹ thuật:** A. Một multi-select tổng với `maxValues = totalCapacity`; validator/service chặn số Active >3. Presenter chia hai nhóm Chủ động/Bị động và preview Effect Passive sẽ thêm/bớt.
- **Phần bị chặn:** toàn bộ migration/backfill/equip/Battle projection của `Q-SKILL-002/003`. UI đọc/học Công Pháp/Kỹ Năng hiện hữu không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn A — tổng loadout tăng 2→9, tối đa 3 Active; Passive phải trang bị mới cộng Effect.
- **Kết quả xử lý:** Đã thêm GameData capacity milestone, migration/backfill `equipped_slot`, transaction replace loadout, Runtime/Battle projection và multi-select phân trang trong `/congphap`.
- **Trạng thái:** RESOLVED
## Q-SKILL-003 — Đường mở thêm ô Kỹ Năng và backfill Player hiện hữu

- **Bối cảnh:** Chủ dự án chốt khởi đầu có 2 ô và muốn số ô tăng theo đột phá cảnh giới theo hướng dynamic. Chưa có bảng Realm → capacity, cap tối đa hoặc policy chọn Skill đang dùng cho Player đã học nhiều hơn capacity.
- **Tài liệu/code liên quan:** `realms.json`, Realm progression, `player_skills`, migration mới và `/congphap`.
- **Điểm chưa rõ:** Mốc đại cảnh giới nào mở ô; tối đa bao nhiêu ô; tăng theo tầng nhỏ hay đại cảnh giới; backfill chọn Skill nào.
- **Phương án A — Mỗi đại cảnh giới thêm một ô:** Luyện Khí 2, Trúc Cơ 3, ... Đạo Tổ 16. Đơn giản và hoàn toàn data-driven nhưng loadout cuối game rất lớn.
- **Phương án B — Mở theo milestone bảo thủ (đề xuất):** Luyện Khí 2; Kết Đan 3; Hóa Thần 4; Hợp Thể 5; Độ Kiếp 6; Huyền Tiên 7; Thái Ất 8; Đạo Tổ 9. Các Realm xen giữa giữ capacity trước đó. Giữ lựa chọn loadout có ý nghĩa và UI Discord còn kiểm soát được.
- **Phương án C — Chủ dự án cung cấp bảng riêng:** kiểm soát balance chính xác nhất; cần danh sách 15 Realm và capacity tương ứng.
- **Backfill đề xuất chưa áp dụng:** trang bị theo `learned_at` từ cũ đến mới, chỉ lấy Active Skill, tối đa capacity hiện tại; Player có thể đổi lại trong `/congphap`. Nếu chọn không auto-equip, Player hiện hữu sẽ vào Battle bằng Đánh Thường cho tới khi tự chọn.
- **Đề xuất kỹ thuật:** B và auto-equip deterministic theo `learned_at`. Curve nằm trong JSON có revision, validator bắt capacity nguyên dương, không giảm theo Realm order; service không hardcode tên Realm.
- **Phần bị chặn:** JSON capacity, migration/backfill, preview slot khóa/mở và audit tăng capacity khi breakthrough.
- **Câu trả lời của chủ dự án:** Chọn B; bổ sung tối đa 3 chiêu chủ động, các ô còn lại là kỹ năng/công pháp bị động map vào Effect nhân vật.
- **Kết quả xử lý:** Curve B đã được áp dụng trong `skill_rules.json`: Luyện Khí 2; Kết Đan 3; Hóa Thần 4; Hợp Thể 5; Độ Kiếp 6; Huyền Tiên 7; Thái Ất 8; Đạo Tổ 9. Backfill chọn Active theo `learned_at`, tối đa capacity và cap 3.
- **Trạng thái:** RESOLVED

---

## Q-PROFESSION-016 — Nội dung và công thức Tụ Linh Đan nhập môn

- **Bối cảnh:** Chủ dự án yêu cầu nhân vật mới tự động có Đan Phương Tụ Linh Đan và Phá Chướng Đan để dùng trong giai đoạn Luyện Khí tiến lên Trúc Cơ. Hiện GameData chỉ có Item `CULTIVATION_PILL` tên “Tu Vi Đan” với mô tả tăng tốc tu luyện 20% đến Nguyên Anh; chưa có Item hoặc Craft Template tên “Tụ Linh Đan”. Recipe live duy nhất là `CRAFT_BREAKTHROUGH_PILL`.
- **Tài liệu/code liên quan:** `item_templates.json`, `craft_templates.json`, `resource_catalog.json`, `ProfessionService`, `PlayerStartService`, `player_learned_recipes`.
- **Điểm chưa rõ:** Tụ Linh Đan là tên mới của `CULTIVATION_PILL` hay Item riêng; tác dụng là cộng trực tiếp tu vi hay tăng tốc tu luyện; trị số/thời hạn/cộng dồn; nguyên liệu, số lượng, thời gian luyện, EXP nghề và Realm gate.
- **Phương án A — Đổi Tu Vi Đan thành Tụ Linh Đan:** giữ ID `CULTIVATION_PILL` và Effect tăng tốc tu luyện hiện hữu, chỉ đổi tên/lore rồi thêm recipe. Ít ảnh hưởng persistence nhưng vẫn cần chốt nguyên liệu và thời gian; tên cũ biến mất khỏi UI.
- **Phương án B — Tụ Linh Đan là Item cộng tu vi trực tiếp:** tạo Item/recipe mới, dùng Tụ Linh Thảo làm nguyên liệu chính; dễ hiểu ở đầu game và không tạo buff thời gian, nhưng cần chốt lượng tu vi nhận được.
- **Phương án C — Tụ Linh Đan là Item tăng tốc tu luyện riêng:** tạo Item/recipe mới, giữ Tu Vi Đan hiện hữu; phân cấp content rõ hơn nhưng hai Item gần chức năng nhau và cần policy cộng dồn/thời hạn.
- **Đề xuất kỹ thuật (chưa áp dụng):** B cho đan nhập môn: Item riêng, cộng tu vi tức thời và recipe explicit từ tài nguyên Thanh Vân. Chủ dự án cần cung cấp/chọn trị số cùng công thức trước khi phát hành.
- **Phần bị chặn:** tạo Item/recipe Tụ Linh Đan, cấp Đan Phương này cho Player mới/cũ và hiển thị nó trong dashboard nghề nghiệp. Việc cấp Phá Chướng Đan Phương không phụ thuộc và vẫn tiếp tục.
- **Câu trả lời của chủ dự án:** Chọn B; Tụ Linh Đan là Item cộng tu vi trực tiếp và phân theo cảnh giới. Player ở cảnh giới cao hơn không được dùng đan của cảnh giới thấp hơn.
- **Kết quả xử lý:** Đã phát hành Item riêng `SPIRIT_GATHERING_PILL`, policy `EXACT_REALM`, action cộng 10% yêu cầu tầng và cap tại ngưỡng đột phá theo `Q-PROFESSION-018`. Item-use transaction và UI `/tuido` đã hoạt động.
- **Trạng thái:** RESOLVED

---

## Q-PROFESSION-017 — Linh thảo rơi từ Thám hiểm hay chỉ từ Thu thập

- **Bối cảnh:** Thanh Vân Sơn Mạch có hai nguồn thưởng tách biệt. `/thamhiem` đánh quái dùng `MONSTER_LUYEN_KHI`, hiện rơi Linh Thạch, trang bị, Phá Chướng Đan và vé Bí Cảnh; `/thuthap` mới rơi Tụ Linh Thảo/Thanh Tâm Thảo. Recipe Phá Chướng Đan dùng `Tụ Linh Thảo ×4 + Thanh Tâm Thảo ×1`, nên nguyên liệu khớp map nhưng không xuất hiện trong drop quái.
- **Tài liệu/code liên quan:** `maps.json`, `monster_spawn_pools.json`, `reward_tables.json`, `gathering_rules.json`, `resource_catalog.json`, `craft_templates.json`.
- **Điểm chưa rõ:** “drop của map hiện tại” có yêu cầu mọi hoạt động trên map đều rơi nguyên liệu hay nghề nghiệp phải phụ thuộc hoạt động Thu thập; nếu quái được rơi thảo thì tỷ lệ/số lượng và ảnh hưởng của phẩm chất quái lên tỷ lệ này là bao nhiêu.
- **Phương án A — Giữ nguồn chuyên biệt (đề xuất):** quái không rơi linh thảo; dashboard nghề nghiệp chỉ rõ nguyên liệu phải lấy từ `/thuthap`. Vòng lặp nghề rõ và không tăng nguồn cung, nhưng người chỉ Thám hiểm không tự có nguyên liệu.
- **Phương án B — Quái có tỷ lệ rơi linh thảo thấp:** thêm hai reward entry vào bảng Realm tương ứng; thuận tiện hơn nhưng làm tăng nguồn cung và còn chịu bonus drop theo phẩm chất quái.
- **Phương án C — Thám hiểm có reward tài nguyên theo map, độc lập quái:** sau chiến thắng roll một bảng tài nguyên map riêng; data-driven và dễ cân bằng, nhưng cần thêm reward settlement/snapshot và tỷ lệ mới.
- **Đề xuất kỹ thuật (chưa áp dụng):** A, đồng thời UI recipe hiển thị “Nguồn: Thu thập Linh Thảo tại Thanh Vân Sơn Mạch”. Nếu chọn B/C, cần chủ dự án chốt tỷ lệ trước khi sửa Reward Table.
- **Phần bị chặn:** thay đổi bảng rơi Thám hiểm/quái. Việc xác minh map-resource-recipe và cấp Đan Phương nhập môn không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn B; quái có tỷ lệ rơi Linh Thảo thấp và UI recipe phải hiển thị nguồn thu thập theo map.
- **Kết quả xử lý:** UI source projection hiển thị `/thuthap`, `/thamhiem` và map. `MONSTER_LUYEN_KHI` đã thêm hai reward entry theo tỷ lệ được duyệt tại `Q-PROFESSION-019`.
- **Trạng thái:** RESOLVED

---

## Q-PROFESSION-018 — Trị số và recipe Tụ Linh Đan Luyện Khí

- **Bối cảnh:** `Q-PROFESSION-016` đã chọn Tụ Linh Đan là Item cộng tu vi trực tiếp, chỉ dùng khi Player đang đúng cảnh giới của viên đan. Để phát hành viên Luyện Khí cần chốt lượng tu vi, xử lý khi gần ngưỡng đột phá và nguyên liệu/thời gian.
- **Tài liệu/code liên quan:** `cultivation_rules.json`, Realm `req_cul`, `item_templates.json`, `craft_templates.json`, inventory consume và PostgreSQL transaction.
- **Điểm chưa rõ:** Lượng tu vi là cố định hay theo yêu cầu tầng hiện tại; phần vượt ngưỡng được giữ, giảm theo overflow hiện hành hay bị cắt; công thức nguyên liệu và thời gian luyện.
- **Phương án A — 10% yêu cầu tầng hiện tại (đề xuất):** mỗi viên cộng 10% `req_cul` của tầng nhỏ hiện tại, phần vượt ngưỡng bị giới hạn tại ngưỡng đột phá; recipe `Tụ Linh Thảo ×3`, Nhất Phẩm, thời gian mặc định 1 phút, không tốn Linh Thạch. Scale tự nhiên trong Luyện Khí và không tự vượt tầng, nhưng giá trị mỗi viên tăng theo tầng.
- **Phương án B — 100 tu vi cố định:** mỗi viên cộng 100 tu vi, phần vượt ngưỡng bị giới hạn tại ngưỡng đột phá; recipe `Tụ Linh Thảo ×3`, các gate/thời gian như A. Dễ hiểu nhưng giá trị giảm dần ở tầng cao.
- **Phương án C — Chủ dự án cung cấp bảng riêng:** cung cấp lượng/formula, overflow, nguyên liệu, cost và duration. Kiểm soát balance chính xác nhất nhưng cần đầy đủ các trường trước khi triển khai.
- **Đề xuất kỹ thuật (chưa áp dụng):** A. Item khai báo `realmPolicy: EXACT_REALM`, `realmCode: LUYEN_KHI`, action `GRANT_CULTIVATION_PERCENT` và `capAtBreakthroughThreshold: true`. Use case khóa Player, lazy-settle tu vi tới thời điểm request, recheck Realm, consume một Item và cộng tu vi trong cùng transaction/idempotency key.
- **Phần bị chặn:** Item/recipe Tụ Linh Đan, item-use transaction, starter ownership và migration backfill cho recipe này.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả xử lý:** Đã thêm Tụ Linh Đan Luyện Khí cộng 10% `req_cul` tầng hiện tại, cap tại ngưỡng đột phá, recipe `Tụ Linh Thảo ×3`, Nhất Phẩm, 1 phút, 0 Linh Thạch. Đan Phương được cấp khi tạo nhân vật và migration 030 backfill Player cũ. `/tuido` dùng select và transaction idempotent; sai cảnh giới/đã đầy tu vi không tiêu Item.
- **Trạng thái:** RESOLVED
---

## Q-PROFESSION-019 — Tỷ lệ Linh Thảo rơi từ quái Luyện Khí

- **Bối cảnh:** `Q-PROFESSION-017` chọn thêm drop Linh Thảo thấp vào quái. `MONSTER_LUYEN_KHI` có `rollCount: 3`, nghĩa là mỗi reward entry được kiểm tra ba lần mỗi chiến thắng; bonus phẩm chất quái tiếp tục nhân tương đối vào chance của Item.
- **Tài liệu/code liên quan:** `reward_tables.json`, `RewardTableService`, `monster_quality_tiers.json`, `Q-MONSTER-009/011`, Gathering baseline.
- **Điểm chưa rõ:** `chance` trên mỗi roll và quantity của Tụ Linh Thảo/Thanh Tâm Thảo. Nếu không tính ba lượt roll, tỷ lệ thực tế có thể cao hơn dự kiến.
- **Phương án A — Thấp vừa (đề xuất):** mỗi roll: Tụ Linh Thảo 10% ×1, Thanh Tâm Thảo 3% ×1. Với Phàm Thú, xác suất có ít nhất một lần rơi xấp xỉ 27,1% và 8,7% mỗi chiến thắng; phẩm chất cao nhân chance theo policy hiện hữu.
- **Phương án B — Rất thấp:** mỗi roll: Tụ Linh Thảo 5% ×1, Thanh Tâm Thảo 1% ×1. Với Phàm Thú, xác suất có ít nhất một lần rơi xấp xỉ 14,3% và 3% mỗi chiến thắng; giữ `/thuthap` là nguồn chính.
- **Phương án C — Chủ dự án cung cấp bảng riêng:** chance/quantity cho từng loại; cần ghi rõ là mỗi roll hay mỗi chiến thắng.
- **Đề xuất kỹ thuật (chưa áp dụng):** B để Thám hiểm là nguồn phụ. Thêm entry trực tiếp vào `MONSTER_LUYEN_KHI`, không tạo settlement thứ hai; validator/audit phải khóa việc quality bonus áp dụng đúng Item.
- **Phần bị chặn:** sửa reward table và đánh dấu `MONSTER_DROP` trên source metadata của hai Linh Thảo.
- **Câu trả lời của chủ dự án:** Chọn B.
- **Kết quả xử lý:** `MONSTER_LUYEN_KHI` có ba roll; mỗi roll Tụ Linh Thảo 5% ×1 và Thanh Tâm Thảo 1% ×1. Hai resource khai báo cả `GATHERING` và `MONSTER_DROP`; bonus chance theo phẩm chất quái tiếp tục áp dụng vì reward type là Item.
- **Trạng thái:** RESOLVED

---

## Q-REWARD-006 — Curve Monster Reward từ Hóa Thần đến Đạo Tổ

- **Bối cảnh:** `Q-MONSTER-003` đã duyệt currency động `10–20 × 2^(realmOrder−1)` và yêu cầu tỷ lệ reward hiếm lấy từ cấu hình explicit, không tự scale. Runtime hiện chỉ có tier 1–4; chủ dự án yêu cầu triển khai reward dynamic để mở rộng đến toàn bộ 15 cảnh giới.
- **Tài liệu/code liên quan:** `Q-MONSTER-001..003`, `reward_tables.json`, `monster_rules.json`, `equipment_grade_pools.json`, Realm Registry, Monster Reward generator mới.
- **Điểm chưa rõ:** Realm order 5–15 dùng `rollCount`, Equipment/Pill/Ticket chance nào; grade pool Equipment theo từng tier; có thêm Linh Thảo/Linh Khoáng map tương ứng vào drop quái không; currency có tiếp tục nhân đôi không giới hạn đến Đạo Tổ hay cần cap/segment.
- **Phương án A — Giữ profile Nguyên Anh cho tier 5–15 (đề xuất kỹ thuật tối giản):** currency tiếp tục công thức ×2; từ order 4 trở đi giữ `rollCount: 1`, Equipment 8%, Phá Chướng Đan 3%, Vé Bí Cảnh 1%. Grade pool dùng bảng explicit do chủ dự án bổ sung theo từng tier. Ít inflation reward hiếm nhưng Phá Chướng Đan hiện là đan Luyện Khí nên không hợp lore ở cảnh giới cao.
- **Phương án B — Profile theo ba chặng:** order 5–8, 9–12, 13–15 có ba bộ chance/item/grade pool riêng; currency vẫn dùng công thức hoặc cap theo chặng. Balance và lore tốt hơn nhưng cần chủ dự án cung cấp/chọn toàn bộ ba profile.
- **Phương án C — Bảng explicit cho từng cảnh giới:** mỗi Realm khai báo đầy đủ roll count, Equipment/Item và grade pool. Kiểm soát tốt nhất, dễ thêm đan/nguyên liệu đúng Realm nhưng nhiều cấu hình hơn.
- **Đề xuất kỹ thuật (chưa áp dụng):** C cho reward hiếm; giữ công thức currency đã duyệt. File `monster_reward_scaling.json` vẫn sinh table/alias tự động từ Realm order nhưng mỗi tier author explicit, tránh hard-code trong service.
- **Phần bị chặn:** phát hành reward tier 5–15 và kích hoạt map/monster tương ứng. Generator, schema/validator và việc di chuyển bốn tier hiện hữu sang config mới không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn C — mỗi cảnh giới có một record reward explicit.
- **Kết quả xử lý:** Giữ `monster_reward_scaling.json` làm nguồn canonical; mỗi Realm
  order được author riêng `rollCount`, Equipment, Item và `gradePoolId`. Currency tiếp
  tục dùng công thức đã duyệt tại `Q-MONSTER-003`; runtime không suy tỷ lệ reward hiếm.
  Số liệu content tier 5–15 được tách sang `Q-REWARD-007`; tuyến grade/pool trang bị
  còn thiếu được tách sang `Q-EQUIPMENT-002`.
- **Trạng thái:** RESOLVED

---

## Q-EQUIPMENT-002 — Tuyến phẩm cấp và Grade Pool trang bị cho cảnh giới cao

- **Bối cảnh:** `Q-REWARD-006` đã chọn bảng reward explicit cho từng cảnh giới. Tuy
  nhiên GameData hiện chỉ có ba phẩm trang bị `HOANG`, `HUYEN`, `DIA`; ba pool
  `MAP_LUYEN_KHI`, `MAP_TRUC_CO`, `MAP_KET_DAN`. `MONSTER_NGUYEN_ANH` đang dùng
  fallback `MAP_KET_DAN` theo `Q-REWARD-005`. Chưa có grade/pool canonical cho
  Hóa Thần đến Đạo Tổ.
- **Tài liệu/code liên quan:** `equipment_grades.json`, `equipment_grade_pools.json`,
  `ItemGenerator`, `RewardTableService`, `Q-REWARD-004..006`.
- **Điểm chưa rõ:** Có mở thêm phẩm trang bị sau Địa hay không; tên phẩm, Realm gate,
  chỉ số nền và trọng số từng pool; có chấp nhận quái rơi trang bị chưa đủ cảnh giới
  để mặc như pool Kết Đan hiện tại hay không.
- **Phương án A — Mở tuyến bảy phẩm cổ điển (đề xuất):** giữ Hoàng/Huyền/Địa và thêm
  Thiên/Tiên/Thánh/Thần. Mỗi phẩm mới có `requiredRealm`, chỉ số và pool theo milestone
  explicit; mỗi map vẫn tham chiếu trực tiếp pool của nó. Progression trang bị kéo dài
  đến Đạo Tổ và hoàn toàn data-driven, nhưng cần duyệt bảng chỉ số/trọng số trước khi
  phát hành.
- **Phương án B — Giữ ba phẩm hiện tại:** tier 5–15 dùng các pool kết hợp hoặc `DIA`
  100%. Không cần mở schema/content mới, nhưng sức mạnh và độ hiếm trang bị gần như
  dừng tăng từ Luyện Hư.
- **Phương án C — Chủ dự án cung cấp tuyến riêng:** cung cấp danh sách phẩm, tên hiển
  thị, Realm mở khóa, chỉ số và grade weights cho 15 map. Kiểm soát balance chính xác
  nhất nhưng cần đủ bảng trước khi triển khai.
- **Đề xuất kỹ thuật (chưa áp dụng):** A. Giữ ID phẩm immutable; grade pool là record
  riêng cho từng map để sau này chỉ đổi JSON. Không suy grade từ tên map/cảnh giới.
- **Phần bị chặn:** `gradePoolId` của Equipment reward tier 5–15. Currency và Item
  entries không phụ thuộc tuyến grade.
- **Câu trả lời của chủ dự án:** Chọn A — mở tuyến bảy phẩm
  Hoàng/Huyền/Địa/Thiên/Tiên/Thánh/Thần.
- **Kết quả xử lý:** Đã khóa tên và số lượng grade. Bảng Realm gate, chỉ số, grade
  weights và type weights chưa có trong phương án A nên được tách sang
  `Q-EQUIPMENT-003`; chưa tự phát hành grade/pool mới.
- **Trạng thái:** RESOLVED
---

## Q-REWARD-007 — Bộ Item và tỷ lệ rơi explicit cho Monster tier 5–15

- **Bối cảnh:** Chủ dự án chọn mỗi cảnh giới có bảng riêng. Currency `10–20 ×
  2^(realmOrder−1)` đã được duyệt và 60 tài nguyên Gathering đã tồn tại cho 15 map.
  Nhưng từ tier 5 chưa có Đan đúng cảnh giới; `BREAKTHROUGH_PILL` là nội dung nhập môn
  Luyện Khí. Các chance/quantity và việc quái có rơi Linh Thảo/Linh Khoáng theo map
  chưa được chốt.
- **Tài liệu/code liên quan:** `monster_reward_scaling.json`, `resource_catalog.json`,
  `item_templates.json`, `Q-MONSTER-003`, `Q-PROFESSION-017..019`,
  `Q-REWARD-006`.
- **Điểm chưa rõ:** `rollCount`, Equipment/Ticket chance, loại tài nguyên quái được
  rơi, chance/quantity của tài nguyên và có giữ Phá Chướng Đan ở tier cao hay không.
- **Phương án A — Baseline tài nguyên đầy đủ, author từng tier (đề xuất):** tạo đủ 11
  record tier 5–15; mỗi tier ghi riêng `rollCount: 1`, Equipment `8%`, Vé Bí Cảnh
  `1%`; bỏ Phá Chướng Đan; thêm bốn tài nguyên đúng map với mỗi roll: nguyên liệu
  chính `3% ×1` và nguyên liệu hiếm `1% ×1` cho cả Linh Thảo lẫn Linh Khoáng.
  Dữ liệu vẫn explicit dù các giá trị ban đầu giống nhau; nghề nghiệp có nguồn phụ từ
  quái nhưng `/thuthap` vẫn là nguồn ổn định.
- **Phương án B — Chỉ reward chiến đấu:** mỗi tier explicit `rollCount: 1`, Equipment
  `8%`, Vé Bí Cảnh `1%`, không có Đan/tài nguyên map. Economy tài nguyên chỉ đến từ
  `/thuthap`; đơn giản và ít inflation hơn nhưng drop quái cảnh giới cao kém đa dạng.
- **Phương án C — Chủ dự án cung cấp bảng riêng:** với từng tier 5–15, cung cấp
  `rollCount`, Equipment chance, Item ID/chance/quantity và Ticket chance. Nếu thêm
  Item mới như đan theo cảnh giới, cần chốt tác dụng của Item trước.
- **Đề xuất kỹ thuật (chưa áp dụng):** A làm baseline có thể chỉnh hoàn toàn trong
  JSON. Bonus phẩm chất quái tiếp tục chỉ nhân tương đối chance reward phi currency
  và cap 100% theo policy hiện hữu.
- **Phần bị chặn:** Item entries tier 5–15. Equipment entries còn phụ thuộc
  `Q-EQUIPMENT-002`; generator/currency hiện hữu vẫn tiếp tục độc lập.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả xử lý:** Đã khóa 11 record explicit: `rollCount: 1`, Equipment 8%, Vé Bí
  Cảnh 1%, bỏ Phá Chướng Đan; bốn tài nguyên đúng map có chance mỗi roll: PRIMARY 3%
  ×1 và RARE 1% ×1 cho cả Linh Thảo/Khoáng. Việc publish tier và source
  `MONSTER_DROP` được thực hiện cùng một lần sau `Q-EQUIPMENT-003`, tránh UI công bố
  nguồn `/thamhiem` khi Reward Table tương ứng chưa tồn tại.
- **Trạng thái:** RESOLVED

---

## Q-EQUIPMENT-003 — Bảng balance cụ thể cho grade và pool trang bị cao cấp

- **Bối cảnh:** `Q-EQUIPMENT-002` đã chọn bảy phẩm, nhưng chưa cung cấp Realm gate,
  chỉ số, trọng số pool và type distribution. Runtime hiện chỉ có bốn slot/template
  `WEAPON`, `ARMOR`, `ROBE`, `RING`; một số reward cũ còn chứa type không có template
  như `HELMET`, `NECKLACE`, `BOOTS`.
- **Tài liệu/code liên quan:** `equipment_grades.json`, `equipment_grade_pools.json`,
  `equipment_templates.json`, `equipment_types.json`, `monster_reward_scaling.json`,
  `ItemGenerator`.
- **Điểm chưa rõ:** Realm mở bốn grade mới; mức ATK/DEF/HP; map nào bắt đầu rơi grade
  kế tiếp; có giữ cơ chế “rơi trước khi đủ Realm để mặc” của pool cũ hay không. Type
  weights tạm tính cho bốn slot live còn phụ thuộc `Q-EQUIPMENT-001` đang OPEN về việc
  `ROBE` sẽ được giữ hay đổi thành `NECKLACE`.
- **Phương án A — Giữ pattern hiện hữu và tăng tuyến tính (đề xuất):**
  - Grade: Thiên mở Đại Thừa với Weapon ATK 40%, Armor/Robe DEF+HP 20%, Ring HP 40%;
    Tiên mở Chân Tiên với `50/25/25/50%`; Thánh mở Thái Ất với `60/30/30/60%`;
    Thần mở Đạo Tổ với `70/35/35/70%`. Mỗi grade giữ quality Hạ/Trung/Thượng và
    `randomAffixes: 0/1/2`.
  - Pool riêng từng map: Hóa Thần `Huyền 40/Địa 60`; Luyện Hư `Địa 100`; Hợp Thể
    `Địa 20/Thiên 80`; Đại Thừa `Thiên 100`; Độ Kiếp `Thiên 20/Tiên 80`; Chân Tiên
    và Huyền Tiên `Tiên 100`; Kim Tiên `Tiên 20/Thánh 80`; Thái Ất `Thánh 100`;
    Đại La `Thánh 20/Thần 80`; Đạo Tổ `Thần 100`.
  - Equipment type dùng đúng bốn slot live, mỗi loại 25%.
  - Ưu: nối tiếp đúng bước chỉ số hiện hữu và giữ kiểu có thể rơi grade kế tiếp sớm
    một Realm. Nhược: một phần trang bị rơi ra chưa thể mặc ngay.
- **Phương án B — Không rơi trang bị vượt Realm:** dùng cùng chỉ số/type như A nhưng
  mỗi pool chỉ chứa grade đã mở ở Realm hiện tại; grade mới bắt đầu rơi đúng Realm
  gate. UX rõ hơn nhưng thay pattern pool cũ và progression drop ít bất ngờ hơn.
- **Phương án C — Chủ dự án cung cấp bảng riêng:** cung cấp Realm gate, bốn nhóm chỉ
  số, weights của 11 pool và type weights. Kiểm soát chính xác nhất.
- **Đề xuất kỹ thuật (chưa áp dụng):** A để không sửa semantics dữ liệu cũ. Validator
  sẽ bắt mọi grade/pool reference hợp lệ và mọi type có Equipment Template.
- **Phần bị chặn:** tạo bốn grade, 11 grade pool, Equipment entries và publish Monster
  Reward tier 5–15. ID của loại trang bị thứ tư còn phụ thuộc `Q-EQUIPMENT-001`.
- **Câu trả lời của chủ dự án:** Chọn A, đồng thời yêu cầu chỉ số pháp bảo tăng mạnh
  theo cảnh giới; chỉ được trang bị khi đạt Realm phù hợp; pháp bảo có một dòng thuộc
  tính chính và có thể có nhiều dòng hiệu ứng; trang sức/phụ kiện có thuộc tính ngẫu
  nhiên; LUCK phải tăng tỷ lệ rơi vật phẩm.
- **Kết quả xử lý:** Realm gate đã được enforce ở cả preview và transaction trang bị,
  dùng `equipmentGrades.*.qualities[].requiredRealm`; lỗi trả tên cảnh giới tiếng Việt
  và không ghi database. Bảng A ban đầu bị yêu cầu “tăng mạnh” thay đổi nên trị số mới
  chuyển sang `Q-EQUIPMENT-004`; contract dòng chính/affix chuyển
  `Q-EQUIPMENT-005`; công thức LUCK/drop chuyển `Q-REWARD-008`. Các câu phụ thuộc
  này sau đó đã được giải quyết và phát hành qua `Q-EQUIPMENT-004..006`,
  `Q-COMBAT-019/020` và `Q-REWARD-008`.
- **Trạng thái:** RESOLVED

---

## Q-EQUIPMENT-004 — Curve chỉ số “pháp bảo tăng mạnh” theo grade

- **Bối cảnh:** Bảng A cũ tăng tuyến tính Hoàng 10 → Huyền 20 → Địa 30 → Thiên 40...
  Chủ dự án chọn A nhưng bổ sung yêu cầu pháp bảo cảnh giới cao phải tăng mạnh. Không
  có hệ số hoặc bảng số mới nên không thể coi curve tuyến tính cũ là đáp án cuối.
- **Tài liệu/code liên quan:** `equipment_grades.json`, `ItemGenerator.BASE_PERCENT_FIELD`,
  Player Effect pipeline, `Q-EQUIPMENT-002/003`.
- **Điểm chưa rõ:** Bốn grade Thiên/Tiên/Thánh/Thần tăng bao nhiêu; chỉ số chính có
  tiếp tục là phần trăm base; có cap hay diminishing return không.
- **Phương án A — Lũy tiến khoảng ×1,5 mỗi grade (đề xuất):** giữ Hoàng/Huyền/Địa
  `10/20/30%` cho Vũ khí và Nhẫn, `5/10/15%` cho Giáp/Phụ kiện. Grade mới:
  Thiên `45%` công/HP và `23%` thủ/HP; Tiên `68%/34%`; Thánh `102%/51%`;
  Thần `153%/77%`. Tăng mạnh rõ rệt, vẫn dùng percent-base hiện hữu và không cần
  mechanic mới; late game có thể rất lớn.
- **Phương án B — Giữ tuyến tính đã nêu trong Q-EQUIPMENT-003:** Thiên/Tiên/Thánh/Thần
  lần lượt `40/50/60/70%` cho Vũ khí/Nhẫn và `20/25/30/35%` cho Giáp/Phụ kiện.
  Dễ cân bằng hơn nhưng không thực sự “tăng mạnh”.
- **Phương án C — Chủ dự án cung cấp bảng riêng:** cung cấp chỉ số cho bốn grade mới
  và từng slot; kiểm soát balance chính xác nhất.
- **Đề xuất kỹ thuật (chưa áp dụng):** A; tất cả số nằm trong JSON, runtime chỉ đọc
  Effect và không biết tên grade.
- **Phần bị chặn:** nội dung bốn grade mới và 11 grade pool.
- **Câu trả lời của chủ dự án:** Chọn A — curve lũy tiến khoảng ×1,5.
- **Kết quả xử lý:** Đã khóa curve: Thiên `45/23`, Tiên `68/34`, Thánh `102/51`,
  Thần `153/77` cho nhóm công/HP và thủ/HP. Việc map các giá trị này vào fixed line
  theo slot đã hoàn tất tại `Q-EQUIPMENT-006`.
- **Trạng thái:** RESOLVED
---

## Q-EQUIPMENT-005 — Dòng thuộc tính chính và số lượng affix của pháp bảo

- **Bối cảnh:** Runtime hiện tạo fixed Effect theo Equipment Type, sau đó roll affix
  từ một pool chung. Reward Equipment luôn dùng rarity `COMMON`; `randomAffixes`
  trong grade quality hiện chưa điều khiển generator. Chủ dự án muốn một dòng thuộc
  tính chính cố định theo loại và thêm nhiều dòng hiệu ứng; trang sức/phụ kiện được
  tăng chỉ số nhân vật ngẫu nhiên.
- **Tài liệu/code liên quan:** `equipment_types.json`, `equipment_affixes.json`,
  `equipment_grades.json`, `ItemGenerator`, `ItemGameDataResolver`.
- **Điểm chưa rõ:** Nhẫn/Dây chuyền roll thuộc tính chính nào; số dòng theo Hạ/Trung/
  Thượng phẩm; pool/range/trọng số; có cho trùng cùng modifier không.
- **Phương án A — Một dòng chính + 0/1/2 affix (đề xuất):**
  - Vũ khí luôn có ATK%; Giáp luôn có DEF%.
  - Nhẫn và Dây chuyền có một dòng chính roll equal-weight từ HP%, ATK%, DEF%, SPD
    hoặc LUCK; dùng grade để scale phần trăm, LUCK dùng flat range trong affix data.
  - Hạ/Trung/Thượng thêm `0/1/2` affix theo `randomAffixes` hiện hữu; không trùng
    modifier với dòng chính hoặc affix đã roll.
  - Affix phụ tiếp tục dùng range/weight trong `equipment_affixes.json`.
  Ưu: đúng contract nhiều dòng và tái sử dụng dữ liệu hiện có. Nhược: phụ kiện có độ
  biến động sức mạnh lớn.
- **Phương án B — Mọi slot có fixed stat như hiện tại:** Vũ khí ATK; Giáp DEF+HP;
  Nhẫn HP; slot thứ tư DEF+HP; chỉ thêm 0/1/2 affix. Bảo toàn balance/migration dễ
  nhất nhưng không đáp ứng rõ thuộc tính chính ngẫu nhiên của phụ kiện.
- **Phương án C — Chủ dự án cung cấp pool riêng từng slot:** cần modifier, min/max,
  weight và số dòng từng quality.
- **Đề xuất kỹ thuật (chưa áp dụng):** A. Tách `primaryStatPools` và `affixPools` trong
  JSON; generator nhận Random Provider để audit/replay deterministic, không dùng
  `Math.random` trực tiếp.
- **Phần bị chặn:** thay đổi ItemGenerator, schema/pool affix và backfill semantics cho
  pháp bảo mới. Realm gate không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn A và thay đổi contract: pháp bảo có hai dòng
  guaranteed; một dòng thuộc tính chính và một dòng sát thương/kháng nguyên tố. Các
  dòng còn lại ngẫu nhiên; tối đa hai nguyên tố; tên thêm prefix/icon Kim/Mộc/Thủy/
  Hỏa/Thổ/Băng/Lôi/Phong, ví dụ `[Lôi][Hỏa] Xích Hư Kiếm`. Giáp và trang sức có
  kháng nguyên tố tương tự sát thương nguyên tố.
- **Kết quả xử lý:** Yêu cầu đã rõ về hướng nhưng chưa có mapping từng slot, chance
  nguyên tố thứ hai, giá trị elemental, cap/semantics combat và tên template sau
  migration. Các quyết định này đã được giải quyết và triển khai tại
  `Q-EQUIPMENT-006`, `Q-COMBAT-019` và `Q-COMBAT-020`.
- **Trạng thái:** RESOLVED
---

## Q-REWARD-008 — Công thức LUCK tăng tỷ lệ rơi vật phẩm

- **Bối cảnh:** Attribute `LUK` (May Mắn) và affix `LUCK_UP` đã tồn tại, nhưng
  `RewardTableService` hiện chỉ áp dụng bonus phẩm chất quái. LUCK của Player chưa
  được truyền vào reward roll. Currency cần giữ ngoài bonus theo policy hiện hữu.
- **Tài liệu/code liên quan:** `attributes.json`, `equipment_affixes.json`,
  `RewardTableService.resolveEffectiveChance`, Monster Quality reward policy,
  Exploration/Secret Realm reward context.
- **Điểm chưa rõ:** 1 LUCK tăng bao nhiêu; cộng hay nhân với quality bonus; cap; loại
  reward nào được hưởng; snapshot LUCK ở lúc bắt đầu hay kết thúc activity.
- **Phương án A — Relative multiplier, snapshot lúc bắt đầu (đề xuất):** mỗi 1 LUCK
  tăng tương đối 1% chance, cap contribution LUCK ở 100%. Công thức:
  `effective = min(100, base × (1 + qualityBonus/100) × (1 + min(LUCK,100)/100))`.
  Áp dụng ITEM/EQUIPMENT/SKILL/CULTIVATION_ART, không áp dụng CURRENCY/quantity/grade.
  Snapshot LUCK khi tạo activity run để đổi trang bị giữa trận không đổi reward.
- **Phương án B — Cộng điểm phần trăm:** mỗi 1 LUCK cộng 0,2 điểm %, cap cộng 20 điểm;
  cộng sau quality rồi cap 100. LUCK mạnh hơn rõ trên vật phẩm rất hiếm nhưng dễ làm
  phẳng chênh lệch rarity.
- **Phương án C — Chủ dự án cung cấp công thức riêng:** cần hệ số, cap, eligible types,
  cách kết hợp quality và thời điểm snapshot.
- **Đề xuất kỹ thuật (chưa áp dụng):** A. Snapshot vào activity context/reward plan;
  settlement/replay dùng snapshot, không đọc Player live lần hai.
- **Phần bị chặn:** LUCK tác động drop và audit chống đổi trang bị trước claim.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả xử lý:** Policy đã phát hành trong `reward_runtime_rules.json`: mỗi LUCK
  +1% tương đối, contribution cap 100 LUCK, effective chance cap 100%; nhân với bonus
  quality, chỉ áp dụng reward phi currency. Exploration, Bí Cảnh, Thu thập và Tầm Bảo
  snapshot LUCK lúc activity bắt đầu; claim không đọc lại trang bị live.
- **Trạng thái:** RESOLVED

---

## Q-EQUIPMENT-006 — Authoring cụ thể cho pháp bảo song hệ và cutover template

- **Bối cảnh:** `Q-EQUIPMENT-005` yêu cầu hai dòng guaranteed, tối đa hai nguyên tố,
  prefix/icon và cả sát thương/kháng nguyên tố. GameData có tám Element canonical
  nhưng Equipment Template đang có `SWORD` thay vì `WIND`; Dây chuyền chưa có tên.
- **Tài liệu/code liên quan:** `elements.json`, `equipment_templates.json`,
  `equipment_types.json`, `equipment_affixes.json`, `ItemGenerator`,
  `Q-EQUIPMENT-001/004/005`.
- **Điểm chưa rõ:** Slot nào dùng damage/resistance; chance dòng nguyên tố thứ hai;
  value theo grade/quality; tên/icon/order prefix; có thay toàn bộ `EQ_SWORD_*` bằng
  `EQ_WIND_*` hay không.
- **Phương án A — Contract offensive/defensive rõ ràng (đề xuất):**
  - Vũ khí: fixed ATK% + một Element Damage%; Nhẫn: một primary random
    HP/ATK/DEF/SPD/LUCK + một Element Damage%.
  - Giáp: fixed DEF% + một Element Resistance%; Dây chuyền: một primary random
    HP/ATK/DEF/SPD/LUCK + một Element Resistance%.
  - Element đầu guaranteed; Element thứ hai unique có chance Hạ `0%`, Trung `25%`,
    Thượng `50%`. Affix phụ vẫn `0/1/2`, không trùng modifier.
  - Element value theo grade dùng dãy thủ đã duyệt:
    Hoàng/Huyền/Địa/Thiên/Tiên/Thánh/Thần = `5/10/15/23/34/51/77%`; hai element
    cùng dùng full value.
  - Prefix theo thứ tự roll, icon: `⚙️ Kim`, `🌿 Mộc`, `💧 Thủy`, `🔥 Hỏa`,
    `⛰️ Thổ`, `❄️ Băng`, `⚡ Lôi`, `🌪️ Phong`.
  - Thay `SWORD → WIND`; đổi template ID tương ứng. Dây chuyền dùng tên:
    Viêm Tâm/Huyền Mộc/Hậu Thổ/Thương Hải/Canh Kim/Thiên Lôi/Hàn Phách/Phong Linh
    Hạng Liên. Migration đổi ID/type/slot/instance data nhưng giữ fixed effects cũ
    cho instance Player hiện hữu.
  - Ưu: đủ dữ liệu để triển khai, tám hệ khớp registry. Nhược: pháp bảo song hệ có
    hai bonus full value nên sức mạnh cao.
- **Phương án B — Element thứ hai chỉ nửa hiệu lực:** giống A nhưng dòng thứ hai dùng
  50% value của dòng đầu; giảm sức mạnh song hệ, presenter phải ghi hai giá trị khác.
- **Phương án C — Chủ dự án cung cấp bảng riêng:** cần mapping slot, chance, value,
  icon, template name và policy migrate `SWORD`.
- **Đề xuất kỹ thuật (chưa áp dụng):** B để song hệ có giá trị nhưng không nhân đôi
  toàn bộ budget elemental.
- **Phần bị chặn:** cutover ROBE/NECKLACE và SWORD/WIND, grade fields cuối, generator
  deterministic, prefix presenter và publish Equipment reward tier 5–15.
- **Câu trả lời của chủ dự án:** Chọn A. Sát thương nguyên tố chỉ kích hoạt khi
  nguyên tố của kỹ năng trùng nguyên tố được tăng; kỹ năng đa nguyên tố chia base theo
  từng nguyên tố trước khi áp dụng bonus tương ứng.
- **Kết quả xử lý:** Đã cutover `ROBE → NECKLACE`, `SWORD → WIND`; phát hành đủ tám
  hệ, prefix, hai dòng guaranteed, chance hệ thứ hai `0/25/50%`, full elemental value,
  affix `0/1/2` theo quality và generator có Random Provider. Instance cũ được migration
  đổi identity nhưng giữ nguyên effect cũ. Tỷ lệ chia base của kỹ năng đa nguyên tố được
  tách sang `Q-COMBAT-020`.
- **Trạng thái:** RESOLVED
---

## Q-COMBAT-019 — Semantics sát thương và kháng nguyên tố từ pháp bảo

- **Bối cảnh:** Combat hiện có Element Relation cho tương sinh/tương khắc nhưng chưa có
  stat `ELEMENT_<ID>_DAMAGE/RESIST`. Tự thêm modifier mà không chốt thứ tự/cap có thể
  làm sai Formula Engine và khiến kháng vượt 100%.
- **Tài liệu/code liên quan:** Element Relation Resolver, Formula Engine,
  BattleStatPolicy, Effect pipeline, `Q-EQUIPMENT-005/006`.
- **Điểm chưa rõ:** Bonus damage áp dụng Skill hay cả đánh thường; resistance cap;
  thứ tự với crit/element relation/final damage; multi-hit/AoE; skill không hệ.
- **Phương án A — Skill cùng hệ, multiplier độc lập (đề xuất):**
  - Element Damage chỉ áp dụng Action DAMAGE có Element trùng; đánh thường và
    NEUTRAL không nhận bonus.
  - Element Resistance áp dụng theo Element của Action, cap 80%.
  - `damage = baseFormula × relationMultiplier × (1 + elementDamageBonus)
    × (1 - elementResistance)`, sau đó mới qua final-damage hooks/shield. Crit nằm
    trong base Formula hiện hữu; multi-hit/AoE tính riêng từng hit/target.
  - Bonus damage không cap; resistance không thể làm damage dưới 20% trước các hook.
- **Phương án B — Bonus áp dụng cả đánh thường theo hệ Vũ khí:** tăng vai trò trang bị
  nhưng cần snapshot Element cho Basic Attack và quy tắc khi Vũ khí song hệ.
- **Phương án C — Chủ dự án cung cấp công thức riêng:** cần scope, order và cap.
- **Đề xuất kỹ thuật (chưa áp dụng):** A, dùng data-driven stat key theo Element và
  một stage Formula rõ ràng; Discord chỉ format.
- **Phần bị chặn:** elemental modifier/executor/formula và audit Battle.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả xử lý:** Đã materialize 16 Battle Stat damage/resist cho tám hệ. Damage
  cùng hệ dùng multiplier độc lập, đánh thường/neutral không nhận bonus; resistance cap
  80%. Audit xác nhận `100 × 1,5 × 0,8 = 120`, cap resistance và neutral exclusion.
- **Trạng thái:** RESOLVED

---

## Q-COMBAT-020 — Tỷ lệ chia base damage của kỹ năng đa nguyên tố

- **Bối cảnh:** Chủ dự án xác nhận kỹ năng đa nguyên tố phải chia base theo từng hệ,
  sau đó mỗi phần chỉ nhận Element Damage/Resistance cùng hệ. Runtime hiện đã hoàn tất
  kỹ năng đơn hệ nhưng skill data chưa có tỷ lệ chia.
- **Tài liệu/code liên quan:** `Q-EQUIPMENT-006`, `Q-COMBAT-019`,
  `BattleActionPipeline`, `ActionExecutor`, skill/action GameData.
- **Điểm chưa rõ:** Một kỹ năng Băng–Hỏa chia base damage theo tỷ lệ nào và tỷ lệ đó
  được khai báo ở skill hay từng action/hit.
- **Phương án A — Chia đều theo số hệ (đề xuất):** hai hệ `50/50`, ba hệ `1/3`;
  schema gọn và không cần author thêm weight. Nhược: khó tạo kỹ năng thiên lệch một hệ.
- **Phương án B — Khai báo weight trên từng action:** ví dụ Băng `30`, Hỏa `70`;
  linh hoạt và data-driven, nhưng mọi skill đa hệ phải có tổng weight hợp lệ.
- **Phương án C — Mỗi hệ dùng toàn bộ base:** dễ author nhưng một skill hai hệ có thể
  gây gần gấp đôi damage trước bonus; không khuyến nghị.
- **Đề xuất kỹ thuật (chưa áp dụng):** B, dùng `elementWeights` và validator bắt tổng
  bằng 100; presenter hiển thị tỷ lệ từng hệ.
- **Phần bị chặn:** Chỉ execution của kỹ năng đa nguyên tố. Kỹ năng đơn hệ, trang bị,
  resistance và reward không bị chặn.
- **Câu trả lời của chủ dự án:** Chọn B.
- **Kết quả xử lý:** Damage Action có thể khai báo object `elementWeights`, ví dụ
  `{"FIRE": 70, "ICE": 30}`. Mỗi thành phần tự resolve Element Relation, bonus linh
  căn, Element Damage và Element Resistance trước khi nhân weight; tất cả thành phần
  dùng chung random/critical roll rồi cộng lại và floor một lần theo numeric policy.
  Validator yêu cầu ít nhất hai hệ hợp lệ, weight dương, chỉ dùng cho
  `DAMAGE/CHAIN_DAMAGE`, không khai báo đồng thời `element`, và tổng chính xác 100.
- **Trạng thái:** RESOLVED

---

## Q-MONSTER-014 — Gói content để kích hoạt 12 map từ Nguyên Anh đến Đạo Tổ

- **Bối cảnh:** Tuyến 15 map, reward table và grade pool đã có đủ đến Đạo Tổ, nhưng
  quyết định `Q-MONSTER-004` chỉ duyệt triển khai cuốn chiếu ba map đầu. Mười hai map
  từ `Trung Châu Thánh Vực` vẫn `CONTENT_PENDING`. File danh sách quái chỉ cung cấp
  tên theo chủng tộc, chưa gán quái vào map/cảnh giới hoặc khai báo hệ, Skill, weight
  và boss Bí Cảnh.
- **Tài liệu/code liên quan:** `Danh_sach_quai_vat_game_tu_tien.txt`,
  `Ky_nang_quai_vat_theo_chung_toc.txt`, `maps.json`, `monster_template.json`,
  `monster_spawn_pools.json`, `monster_quality_pools.json`,
  `secret_realm_boss_pools.json`, `Q-MONSTER-004`.
- **Điểm chưa rõ:** Mỗi map dùng nhóm quái nào; số quái thường; hệ và tối đa hai Skill
  của từng quái; spawn weight; boss nào thuộc Bí Cảnh từng cảnh giới; boss có xuất hiện
  trong Thám Hiểm hay không; Quality Pool của Realm order 4–15 phân phối thế nào.
- **Phương án A — Lập ma trận lore đầy đủ để chủ dự án duyệt (đề xuất):** kỹ thuật
  soạn trước bảng 12 map, mỗi map 4–6 quái thường và một boss Bí Cảnh, không kích hoạt
  JSON cho đến khi bảng được duyệt. Bao phủ progression tốt nhưng cần một vòng duyệt
  content/balance.
- **Phương án B — Chủ dự án cung cấp mapping hoàn chỉnh:** nhận bảng
  `{map, monster, element, skillIds, weight, boss}` và Quality Pool; đúng ý đồ nhất
  nhưng cần nhập nhiều dữ liệu.
- **Phương án C — Tiếp tục cuốn chiếu từng map:** làm `Trung Châu Thánh Vực` trước,
  giữ 11 map sau pending. Phạm vi nhỏ, dễ playtest nhưng progression cao vẫn chưa liền
  mạch.
- **Đề xuất kỹ thuật (chưa áp dụng):** A. Tách bản duyệt content khỏi GameData live;
  chỉ sau khi chủ dự án xác nhận mới tạo Monster Template/Skill/Pool và chuyển map sang
  `ACTIVE`.
- **Phần bị chặn:** Chỉ việc author và kích hoạt content quái cho 12 map cao. Reward
  table, Gathering, tuyến di chuyển, battle runtime và công việc Phase 7 vẫn độc lập.
- **Câu trả lời của chủ dự án:** Chọn A — lập ma trận lore đầy đủ để duyệt trước,
  chưa kích hoạt GameData.
- **Kết quả vòng phân tích:** Đã tạo
  `docs/06_MONSTER/007_LATE_GAME_CONTENT_MATRIX_DRAFT.md` với 12 map, 59 quái
  thường, 12 boss, Skill assignment, Spawn/Quality/Boss Pool và gate kiểm chứng.
  Các dependency được tách và hoàn tất tại `Q-MONSTER-015..018`,
  `Q-COMBAT-021`, `Q-ELEMENT-002/003`; generator đã phát hành nội dung và chuyển
  đủ 12 map sang `ACTIVE`.
- **Trạng thái:** RESOLVED

---

## Q-MONSTER-015 — Duyệt mapping quái, Boss và Skill cho 12 map cao

- **Bối cảnh:** `Q-MONSTER-014` đã chọn lập ma trận lore trước khi kích hoạt. Bản
  `docs/06_MONSTER/007_LATE_GAME_CONTENT_MATRIX_DRAFT.md` hiện có 59 quái thường,
  12 Boss Bí Cảnh và loadout tối đa hai Skill cho mỗi quái. Foundation
  `LIGHT/DARK/CHAOS` cùng công thức Hỗn Độn đã hoàn tất, nhưng mapping content và
  baseline control vẫn chưa được chủ dự án duyệt để phát hành vào GameData.
- **Tài liệu/code liên quan:** mục 2.2, 3, 5 và 8 của
  `007_LATE_GAME_CONTENT_MATRIX_DRAFT.md`, `monster_skill_catalog.json`,
  `monster_template.json`, `monster_spawn_pools.json`,
  `secret_realm_boss_pools.json`.
- **Điểm chưa rõ:** Có giữ nguyên toàn bộ mapping quái/hệ/Skill/Boss trong bản draft;
  Boss có tiếp tục chỉ xuất hiện ở wave cuối Bí Cảnh; tỷ lệ control `20%` cho quái
  thường và `25%` cho Boss có được duyệt hay không.
- **Phương án A — Duyệt nguyên baseline draft (đề xuất):** giữ mapping mục 3 và Boss
  mục 5; quái thường chỉ nằm trong Thám Hiểm/wave thường, Boss chỉ xuất hiện ở wave
  cuối Bí Cảnh; control dùng `20%/25%`. Cho phép author toàn bộ content trong một đợt,
  nhưng cần playtest lại balance của 12 cảnh giới.
- **Phương án B — Duyệt mapping/Boss, thay baseline control:** giữ toàn bộ tên, hệ,
  Skill assignment và Boss-only; chủ dự án cung cấp hai tỷ lệ control mới cho quái
  thường/Boss. Giảm phạm vi cần sửa nhưng vẫn chặn author Skill cho tới khi có số.
- **Phương án C — Sửa ma trận trước khi phát hành:** chủ dự án cung cấp các dòng cần
  đổi theo `{map, monster/boss, element, skillIds}` và chính sách xuất hiện Boss.
  Kiểm soát lore chính xác nhất nhưng cần một vòng cập nhật draft và duyệt lại.
- **Đề xuất kỹ thuật (chưa áp dụng):** A. Tất cả Skill chỉ dùng Action primitive đã
  có; validator bắt tối đa hai Skill, ít nhất một Action DAMAGE và Boss không nằm
  trong normal spawn pool.
- **Phần bị chặn:** Monster Template, executable Skill, Spawn Pool, Boss Pool và việc
  chuyển 12 map sang `ACTIVE`. Reward/Gathering, tuyến map và combat engine không bị
  chặn.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả xử lý:** Mapping quái/Boss, Boss-only và baseline control
  `20%/25%` đã được duyệt. Hybrid Element hoàn tất tại `Q-MONSTER-017`,
  Xóa Buff/Khóa Hồi Máu tại `Q-COMBAT-021`, loadout Băng Quy tại
  `Q-MONSTER-018`; toàn bộ Monster/Skill/Pool liên quan đã phát hành và audit
  `PASS_ACTIVE`.
- **Trạng thái:** RESOLVED
---

## Q-MONSTER-016 — Duyệt Quality Pool cho 12 map cao

- **Bối cảnh:** Bảng draft tăng dần đến Đạo Tổ có `75%` Hồng Hoang. Hồng Hoang hiện
  tăng stat base `135%` và tăng tương đối `100%` tỷ lệ reward phi currency, nên lựa
  chọn pool ảnh hưởng lớn cả độ khó lẫn economy. Không được coi bảng draft là mặc định
  kỹ thuật.
- **Tài liệu/code liên quan:** mục 4 của
  `007_LATE_GAME_CONTENT_MATRIX_DRAFT.md`, `monster_quality_tiers.json`,
  `monster_quality_pools.json`, `RewardTableService`.
- **Điểm chưa rõ:** Duyệt nguyên progression mạnh trong draft hay giới hạn tỷ lệ Hồng
  Hoang ở giai đoạn mở 12 map để playtest.
- **Phương án A — Duyệt nguyên bảng draft:** giữ toàn bộ tỷ lệ mục 4, tăng đến
  `Thần 25% / Hồng Hoang 75%` tại Đạo Tổ. Phân tầng late-game rõ, nhưng có rủi ro
  tăng mạnh độ khó và nguồn vật phẩm hiếm.
- **Phương án B — Cap Hồng Hoang 20% khi phát hành đầu (đề xuất):** giữ bảng draft
  đến Huyền Tiên; từ Kim Tiên đến Đạo Tổ chuyển phần Hồng Hoang vượt 20% sang Thần:
  Kim Tiên `Tiên 25/Thần 55/Hồng Hoang 20`, Thái Ất `10/70/20`, Đại La
  `Thần 80/Hồng Hoang 20`, Đạo Tổ `Thần 80/Hồng Hoang 20`. Sau telemetry có thể tăng
  chỉ bằng JSON. An toàn economy hơn nhưng cảm giác chênh phẩm late-game thấp hơn.
- **Phương án C — Bảng riêng:** chủ dự án cung cấp tỷ lệ từng map, tổng mỗi pool phải
  bằng 100 và chỉ dùng tier đã có. Kiểm soát balance chính xác nhất.
- **Đề xuất kỹ thuật (chưa áp dụng):** B cho lần kích hoạt đầu; pool vẫn explicit
  theo map và snapshot quality như runtime hiện hữu.
- **Phần bị chặn:** Chỉ 12 Monster Quality Pool và kích hoạt encounter tương ứng.
- **Câu trả lời của chủ dự án:** Chọn B.
- **Kết quả xử lý:** Đã phát hành 12 Quality Pool explicit. Bảng draft được giữ đến
  Huyền Tiên; Kim Tiên `25/55/20`, Thái Ất `10/70/20`, Đại La và Đạo Tổ
  `80/20` theo thứ tự Tiên/Thần/Hồng Hoang phù hợp từng pool. Audit khóa đủ 15 pool
  toàn tuyến, tổng weight 100 và cap Hồng Hoang 20% ở bốn cảnh giới cuối. Pool đã có
  thể resolve độc lập nhưng map chỉ chuyển `ACTIVE` sau khi content encounter hoàn tất.
- **Trạng thái:** RESOLVED

---

## Q-MONSTER-017 — Nguồn Element cho Skill quái dùng chung

- **Bối cảnh:** Ma trận đã duyệt gán Element phòng thủ cho từng Monster, nhưng cùng
  một Skill được nhiều quái khác hệ sử dụng, ví dụ `Long Tức` dùng bởi Thanh Long,
  Băng Long và Hỏa Long. Element của Skill quyết định tương khắc, Linh Căn, Element
  Damage và Resistance nên không thể suy ra ngầm từ tên hoặc Monster.
- **Tài liệu/code liên quan:** mục 3 của
  `007_LATE_GAME_CONTENT_MATRIX_DRAFT.md`, `monster_attack_skill_templates.json`,
  `BattleSkillFactory`, Element Relation và `Q-COMBAT-019/020`.
- **Điểm chưa rõ:** Skill dùng Element cố định của chính Skill, luôn kế thừa Element
  Monster, hay kết hợp hai chính sách.
- **Phương án A — Mọi Skill có Element cố định:** mỗi Skill khai báo một Element
  canonical theo lore; cùng Skill luôn gây cùng hệ dù Monster sử dụng khác hệ.
  Runtime hiện hữu hỗ trợ sẵn và replay đơn giản, nhưng Băng Long có thể dùng Long Tức
  Hỏa nếu mapping Skill là Hỏa.
- **Phương án B — Mọi Skill kế thừa Element Monster:** Action resolve Element từ
  Monster thi triển. Build theo hệ của từng quái nhất quán, nhưng các tên rõ hệ như
  Phong Nhận/Lôi Dực mất identity riêng.
- **Phương án C — Hybrid data-driven (đề xuất):** Skill có
  `elementMode: FIXED | INHERIT_CASTER`; Skill mang tên hệ rõ ràng dùng `FIXED`,
  Skill chung như Long Trảo/Long Tức/Mai Giáp dùng `INHERIT_CASTER`. Config có thể
  thêm Skill/Element mới mà không sửa executor; snapshot Battle giữ Element đã resolve.
  Linh hoạt nhất nhưng cần mở rộng schema/factory và thêm audit cho cả hai mode.
- **Đề xuất kỹ thuật (chưa áp dụng):** C. Không dùng Element phòng thủ làm fallback
  ngầm; mọi Skill phải khai báo mode rõ.
- **Phần bị chặn:** Author executable Skill và Monster Template của 12 map. Quality
  Pool, reward và tỷ lệ Hỗn Độn độc lập đã hoàn tất.
- **Câu trả lời của chủ dự án:** Chọn C.
- **Kết quả xử lý:** Skill runtime có `elementMode: FIXED | INHERIT_CASTER`.
  `FIXED` dùng Element author trên Skill; `INHERIT_CASTER` resolve từ Element snapshot
  của Monster, không dùng fallback ngầm theo tên. Battle result/context tiếp tục giữ
  offensive Element đã resolve. Toàn bộ 63 Skill được ma trận tham chiếu khai báo mode
  explicit trong JSON: 21 Skill cố định hệ và 42 Skill kế thừa hệ sau khi tính cả năm
  Skill executable cũ được tái sử dụng.
- **Trạng thái:** RESOLVED
---

## Q-COMBAT-021 — Semantics Xóa Buff và Khóa Hồi Máu của Đạo Giới

- **Bối cảnh:** Ma trận Đạo Tổ tham chiếu `MON_SK_DAO_DISPEL` và
  `MON_SK_DAO_HEAL_LOCK`, trong khi mục 2.2 của chính bản draft đánh dấu hai mechanic
  này chưa có contract. Runtime hiện có `PURIFY` để xóa debuff bản thân và
  `REMOVE_EFFECT` theo ID cụ thể, nhưng chưa có thao tác chọn buff đối phương hoặc
  chặn HEAL tổng quát.
- **Tài liệu/code liên quan:** `ActionExecutor`, Effect Engine,
  `monster_attack_skill_templates.json`, `monster_skill_catalog.json`,
  `Q-MONSTER-015`.
- **Điểm chưa rõ:** Cách chọn buff bị xóa; số lượng; Khóa Hồi Máu chặn hoàn toàn hay
  giảm tỷ lệ; chance/duration và thứ tự với HEAL.
- **Phương án A — Baseline đúng tên Skill (đề xuất):**
  - `DISPEL_BUFF`: chance 20% quái thường/25% Boss, xóa tối đa một buff dương mới
    nhất của mục tiêu; Effect và timed Modifier đều tham gia, không xóa passive/
    equipment/base stat.
  - `HEAL_BLOCK`: chance 20%/25%, duration một lượt; mọi Action `HEAL` vào mục tiêu
    cho kết quả 0 trong thời gian khóa, không chặn lifesteal nếu không đi qua HEAL.
  - Hai Skill cooldown 3 và phát event riêng để UI hiển thị.
  Đúng lore và có contract kiểm thử được, nhưng thêm hai primitive combat mới.
- **Phương án B — Thay bằng primitive hiện hữu:** Xóa Buff đổi thành `PURIFY SELF`,
  Khóa Hồi Máu đổi thành `STUN` một lượt. Không sửa engine nhưng tên/hiệu ứng không
  còn đúng nghĩa.
- **Phương án C — Giữ Đạo Giới pending:** kích hoạt 11 map Nguyên Anh–Đại La; giữ
  Khởi Nguyên Đạo Giới và ba Monster liên quan ở `CONTENT_PENDING` cho tới khi thiết
  kế mechanic riêng.
- **Đề xuất kỹ thuật (chưa áp dụng):** A với selection newest-first deterministic,
  Action/Event typed và audit replay.
- **Phần bị chặn:** Hai Skill Đạo Giới và việc kích hoạt map Đạo Tổ. Mười một map
  trước có thể author sau khi `Q-MONSTER-017` được chọn.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả xử lý:** `DISPEL` dùng chance theo variant `20%/25%`, chỉ chọn Effect
  có tag BUFF hoặc timed positive Modifier, newest-first bằng runtime sequence; không
  xóa passive/equipment/base stat. `HEAL_BLOCK` là debuff một lượt, khiến Action
  `HEAL` trả actual healing 0 và phát `HEAL_BLOCKED`; lifesteal ngoài Action HEAL
  không bị đổi. UI battle hiển thị Xóa Buff, thất bại/không có buff và Khóa Hồi Máu.
  Audit xác nhận thứ tự Modifier → Effect, passive còn nguyên và control roll 22%
  thất bại với NORMAL nhưng thành công với BOSS.
- **Trạng thái:** RESOLVED

---

## Q-MONSTER-018 — Loadout Băng Quy không có Skill tấn công

- **Bối cảnh:** Ma trận đã duyệt gán Băng Quy hai Skill `MON_SK_TURTLE_SHELL`
  (Mai Giáp/tạo khiên) và `MON_SK_TURTLE_RECOVERY` (Hồi Phục). Cả hai đều là
  self-sustain, trái gate “mỗi loadout có ít nhất một Damage Action” và định hướng
  trước đó “quái tối đa hai Skill gồm tấn công và hỗ trợ”. Nếu giữ nguyên, Băng Quy
  thường xuyên dùng Skill không gây sát thương và chỉ Đánh Thường khi cả hai cooldown.
- **Tài liệu/code liên quan:** mục 2.1, 3.4 và 7 của
  `007_LATE_GAME_CONTENT_MATRIX_DRAFT.md`, `SkillManager`,
  `monster_attack_skill_templates.json`.
- **Điểm chưa rõ:** Thay Skill nào để Băng Quy có một Skill tấn công.
- **Phương án A — Phản Kích + Hồi Phục (đề xuất):** thay Mai Giáp bằng
  `MON_SK_TURTLE_COUNTER`; giữ bản sắc hồi phục và có một DAMAGE cooldown 2.
- **Phương án B — Mai Giáp + Phản Kích:** thay Hồi Phục bằng
  `MON_SK_TURTLE_COUNTER`; giữ bản sắc phòng thủ bằng khiên nhưng không tự hồi máu.
- **Phương án C — Giữ support-only:** giữ nguyên draft và miễn gate Damage riêng cho
  Băng Quy. Ít sửa content nhưng phá invariant loadout và có thể kéo dài trận đấu.
- **Đề xuất kỹ thuật (chưa áp dụng):** A.
- **Phần bị chặn:** Chỉ loadout Băng Quy, Spawn Pool Thánh Linh Đại Lục và chuyển
  toàn tuyến map sang `ACTIVE`. Skill/Monster khác vẫn có thể author độc lập.
- **Câu trả lời của chủ dự án:** Chọn A.
- **Kết quả xử lý:** Băng Quy dùng `MON_SK_TURTLE_COUNTER` +
  `MON_SK_TURTLE_RECOVERY`, bảo đảm một Skill DAMAGE cooldown 2 và một Skill hồi
  máu cooldown 3. Invariant mọi loadout late-game có Damage Action được khôi phục;
  12 map Nguyên Anh–Đạo Tổ được chuyển sang `ACTIVE`.
- **Trạng thái:** RESOLVED
