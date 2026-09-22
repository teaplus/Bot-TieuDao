# MINI GAME BLACKJACK — BẢN PHÂN TÍCH TRIỂN KHAI

Module: Economy / Mini Game

Version: 1.0

Status: ACTIVE

---

## 1. Nguồn yêu cầu

`docs/GAME MINI/blackjack.md` khóa định hướng UI sau:

- giao diện là message văn bản thuần, không dùng embed;
- lá bài hiển thị bằng rank và emoji chất `♠️ ♣️ ♥️ ♦️`;
- một lá úp của nhà cái hiển thị `[ 🂠 ? ]` trong lượt Player;
- dùng buttons là hướng được khuyên dùng;
- cùng một message được edit sau mỗi hành động để không làm trôi channel;
- khi Player dừng, nhà cái lật bài và tự rút theo ngưỡng luật;
- kết quả cuối hiển thị bài, điểm, kết quả tiền và số dư.

Tài liệu này chưa xác định đầy đủ luật Blackjack/Xì Dách và payout nên chưa đủ authority để
phát hành một game cược Linh Thạch.

## 2. Kiến trúc phù hợp hệ thống hiện tại

```text
!blackjack <wager>
→ ensure Guest account
→ MiniGameService.startBlackjack
→ PostgreSQL transaction
   → khóa Player/wallet
   → xử lý active round cũ theo timeout policy
   → kiểm tra minimum wager theo map và wallet
   → debit wager
   → tạo deck deterministic từ server seed
   → lưu ACTIVE round + immutable rule/deck/hand snapshot + wager ledger
→ gửi plain text + owner-only buttons
→ mỗi button dùng operation ID và khóa ACTIVE round
→ BlackjackEngine áp hành động lên snapshot
→ update snapshot hoặc settle payout atomically
→ edit cùng một Discord message
```

Business logic không phụ thuộc Discord.js. `BlackjackEngine` chỉ nhận rule snapshot, deck state,
hand state và action; cùng input/seed/revision phải replay ra cùng kết quả. Không dùng
`Math.random()`, collector hoặc RAM làm nguồn chuẩn.

## 3. Persistence dự kiến

Tái sử dụng `player_minigame_rounds` cho round header, wager, payout, status, timestamps và
operation khởi tạo. Trạng thái nhiều bước được giữ trong JSONB snapshot:

- `input_snapshot`: map/currency/minimum wager và toàn bộ rule revision đã dùng;
- `rng_snapshot`: algorithm, seed, deck order/hash và vị trí lá kế tiếp;
- `outcome_snapshot`: dealer hand, player hands, active hand, actions, result/payout khi settle.

Mỗi action phải cập nhật snapshot với compare-and-lock trong transaction. Nếu cho phép Split,
snapshot bắt buộc hỗ trợ nhiều hand, wager riêng từng hand và settlement tổng; đây là thay đổi
lớn nên không được tự giả định.

## 4. Race condition và lifecycle

- partial unique index hiện tại đã giới hạn tối đa một round `ACTIVE` cho mỗi Player/game;
- start/action/timeout dùng operation ID riêng và `SELECT ... FOR UPDATE`;
- button chỉ chủ round được dùng;
- message Discord chỉ là projection, lỗi edit message không được rollback settlement;
- khi bot restart, `!blackjack <wager>` phải khôi phục round còn hiệu lực từ PostgreSQL;
- timeout được lazy-evaluate, không ghi tick và không cần scheduler.

Timeout không thể mặc nhiên hoàn cược như Cao Thấp: Player đã nhìn thấy bài trước khi bỏ ván,
nên refund sẽ cho phép né mọi hand xấu. Cần policy được chủ dự án chốt.

## 5. Bộ luật đã duyệt

Theo `Q-ECONOMY-013 = A`: một deck 52 lá; `Bốc`, `Dừng`, `Gấp đôi`, chưa `Tách`; dealer đứng
mọi 17 kể cả soft 17; natural và thắng thường đều tổng `2×`, hòa hoàn cược; Double chỉ ở hai
lá đầu, giữ thêm một wager, rút đúng một lá rồi tự Stand; TTL 120 giây tự Stand; min bet theo
map, max theo wallet và không daily limit.

## 6. Settlement và RTP đã duyệt

Theo câu trả lời ghi tại `Q-ECONOMY-014`, không dùng payout 3:2. Natural và thắng thường đều
lời 1:1: tổng nhận `2×`; push hoàn `1×`; thua `0`. Vì vậy không có phần lẻ và nhận mọi wager
nguyên hợp lệ. RTP là `PLAYER_STRATEGY_DEPENDENT`, không công bố phần trăm cố định.

## 7. Trạng thái triển khai

- `BLACKJACK` ACTIVE trong `minigame_rules.json` revision V3.
- `BlackjackEngine` xào 52 lá deterministic, tính Ace mềm/cứng và xử lý Hit/Stand/Double.
- `MiniGameService` debit wager, persist deck/hand/action snapshot, row-lock mỗi action, debit
  wager bổ sung khi Double và settle payout/ledger atomically.
- TTL 120 giây tự Stand bằng lazy evaluation; round ACTIVE được khôi phục sau restart.
- `!blackjack <wager>` cùng alias `!bj`/`!xidach` dùng plain text, owner-only buttons và edit
  một message. Token `all` cược toàn bộ số dư đã khóa và tự tắt Double; `half` dùng
  `floor(balance / 2)` theo `Q-ECONOMY-015`, không tự nâng lên min bet.
- Không cần migration mới: `player_minigame_rounds` hiện có đã hỗ trợ ACTIVE JSONB snapshot và
  partial unique một active round theo Player/game.
- Engine audit và PostgreSQL integration rollback PASS cho Stand, Double và timeout tự Stand.

---

End
