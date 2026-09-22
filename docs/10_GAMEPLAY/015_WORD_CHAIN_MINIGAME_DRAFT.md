# MINI GAME NỐI TỪ — BẢN ĐỊNH HƯỚNG

Module: Mini Game / Community

Version: 1.3

Status: ACTIVE

---

## 1. Mục tiêu

Tạo một trò nối từ tiếng Việt chạy trong Discord. Luật đã được khóa là
mỗi lượt gửi một cụm gồm đúng hai thành phần; thành phần đầu của cụm mới phải bằng thành
phần cuối của cụm trước.

Ví dụ:

```text
tu tiên → tiên giới → giới hạn → hạn chế
```

`Q-WORD-001/002/005` đã khóa cách nhập, contract hai thành phần và content filtering. Chủ dự
án chọn hướng có thưởng người thắng/chuỗi tại `Q-WORD-003`. Quy tắc phòng im lặng/timeout cũ
tại `Q-WORD-004/006` đã bị câu trả lời mới `Q-WORD-007` ghi đè: không có timeout. Theo
`Q-WORD-008 = A`, ván tự kết thúc sau 10 qualified failure cộng dồn; move đúng không reset.

## 2. Dữ liệu từ điển hiện có

Đã kiểm tra read-only PostgreSQL `bot_tu_tien_test` ngày 2026-08-06. Bảng `public.words` có:

| Cột | Kiểu hiện tại | Ghi chú |
| --- | --- | --- |
| `id` | `integer` | Có dữ liệu nhưng schema cho phép `NULL` |
| `word` | `text NOT NULL` | Có từ đơn, cụm hai thành phần và cụm dài hơn |
| `source_id` | `integer` | Nguồn nhập dữ liệu |
| `lang_code` | `text NOT NULL` | Tiếng Việt dùng mã `vi` |

Thống kê riêng `lang_code = 'vi'`:

- 70.511 bản ghi, 70.511 giá trị khác nhau sau khi lowercase/trim/gộp khoảng trắng;
- 21.636 từ một thành phần;
- 40.595 cụm đúng hai thành phần;
- 8.280 cụm từ ba thành phần trở lên;
- 1.450 mục chứa ký tự punctuation;
- chưa có index trên bảng `words`.

Vì vậy không nên query toàn bảng hoặc chấp nhận mọi record `vi` trực tiếp trên hot path.
Nếu luật chọn “đúng hai thành phần”, dictionary read model phải lọc và chuẩn hóa rõ ràng.

## 3. Luồng chơi đã duyệt một phần

Các bước 1–5 và quyền dừng đã được duyệt; cách tự kết thúc/thưởng vẫn chưa khóa:

1. Người chơi gọi `!noitu` trong một channel. Mỗi guild chỉ có tối đa một phiên `ACTIVE`; gọi
   tại channel khác sẽ chỉ về channel đang chơi.
2. Bot chọn một cụm hai thành phần hợp lệ làm từ mở đầu và tạo một phiên `ACTIVE`.
3. Người chơi gửi cụm tiếp theo bằng message thường, ví dụ `tiên giới`.
4. Bot chuẩn hóa input, kiểm tra dictionary, kiểm tra từ nối và kiểm tra cụm chưa được dùng
   trong phiên.
5. Nếu hợp lệ, bot ghi move và cập nhật từ hiện tại trong cùng một transaction.
6. Nếu input đúng hai từ nhưng không có trong dictionary, nối sai hoặc trùng thì tăng qualified
   failure counter. Input sai format hai từ bị hướng dẫn nhưng không thay đổi phiên. Ván tự kết
   thúc khi counter đạt 10. Không có timeout.
7. Người vừa nối đúng không được tự gửi move kế tiếp. Khi ván kết thúc, người có move đúng gần
   nhất là ứng viên thắng; không có human move đúng thì không có winner/reward.
7. `!noitu stop` cho phép người mở phiên hoặc moderator kết thúc an toàn.

Để tránh bot bắt mọi hội thoại, runtime hydrate registry `guildId → channelId` từ PostgreSQL khi
khởi động và chỉ coi message là đáp án tại channel `ACTIVE`. Registry chỉ là lớp định tuyến giảm
tải; PostgreSQL cùng partial unique index vẫn là nguồn chuẩn và bảo vệ race condition.

## 4. Chuẩn hóa và kiểm tra từ

Pipeline đề xuất:

```text
raw message
→ Unicode normalize
→ lowercase
→ trim + gộp khoảng trắng
→ từ chối punctuation và áp dụng denylist revision
→ tách đúng hai thành phần
→ exact lookup dictionary `lang_code = 'vi'`
→ so sánh thành phần nối
→ kiểm tra chưa dùng trong session
```

Không bỏ dấu tiếng Việt khi đối chiếu vì `ma`, `má`, `mà` là các từ khác nhau. Chỉ nhận chữ cái
Unicode tiếng Việt và một khoảng trắng sau normalization; punctuation bị từ chối. Cụm
normalized không được dùng lại trong cùng session. Denylist là data-driven và có revision;
session snapshot revision đã dùng.

## 5. Persistence đề xuất

Bảng `words` chỉ đóng vai trò dữ liệu từ điển, không chứa trạng thái ván. Gameplay cần tối
thiểu hai bảng riêng:

### `word_chain_sessions`

- `id`, `guild_id`, `channel_id`, `status`;
- `current_word_id`, `current_word_snapshot`, `required_part`;
- `started_by`, `last_player_id`, `move_count`;
- `rules_revision`, `version`;
- `started_at`, `last_move_at`, `expires_at`, `ended_at`;
- partial unique index bảo đảm tối đa một session `ACTIVE` trong một guild.

### `word_chain_moves`

- `session_id`, `sequence_no`, `player_id`, `word_id`;
- `submitted_text`, `normalized_text`, `created_at`;
- unique `(session_id, sequence_no)`;
- unique `(session_id, normalized_text)` nếu luật cấm dùng lại từ trong cùng phiên.

Mỗi lượt phải khóa row session bằng `SELECT ... FOR UPDATE`, kiểm tra rồi insert move/update
session trong một transaction. Hai message đến đồng thời vì vậy chỉ có một thứ tự hợp lệ và
không thể cùng nối từ một trạng thái cũ.

## 6. Truy vấn từ điển và khả năng mở rộng

`Q-WORD-002 = A` khóa exact lookup trên nguồn `vi`. Hướng nền tảng là thêm partial/expression
index phù hợp vào `words`, không scan toàn bộ bảng ở mỗi message. Predicate cuối cùng của index
và việc có cần read model/denylist phụ trợ hay không chờ chính sách punctuation/content tại
`Q-WORD-005`.

Gameplay chỉ đọc dictionary; việc thêm/sửa nguồn từ không được phép làm thay đổi một move đã
snapshot.

Một guild là một chuỗi tuần tự nên row lock không phải nút thắt đáng kể. Nhiều guild chơi đồng
thời sẽ khóa các session row khác nhau. Không tạo collector hoặc timer riêng; restart bot hydrate
lại registry từ các row `ACTIVE` nên không làm mất ván.

## 7. Reward và chống farm

Đã chọn người nối hợp lệ cuối thắng khi inactivity timeout. Bộ thông số đã duyệt một phần:

- không có timeout; session tồn tại đến khi đủ 10 qualified failure hoặc bị dừng thủ công;
- tối thiểu 3 người khác nhau;
- `winnerMapBasePrice × min(2, 1 + floor(moveCount / 10) × 0,25)`;
- tối đa 10 reward claim mỗi Player mỗi ngày;
- `!noitu stop` kết thúc `CANCELLED`, không thưởng.

Qualified failure là input đúng contract hai thành phần nhưng không có trong dictionary, nối sai
required part hoặc dùng lại cụm cũ. Message sai format không phá ván.
Failure counter cộng dồn toàn session; move đúng không reset. Các điểm settlement phải bảo đảm:

- ai nhận thưởng: người nối đúng mỗi lượt, người thắng hay toàn nhóm;
- giới hạn theo ngày/channel và cách chống hai tài khoản tự farm;
- reward có phụ thuộc độ dài chuỗi hay không;
- ledger source, idempotency key và transaction settlement.

`!noitu stop` không phát thưởng. Settlement phải dùng period counter, wallet ledger,
idempotency và transaction giống các nguồn Economy.

## 8. Trạng thái triển khai

- GameData/validator ACTIVE tại `src/data/minigames/word_chain_rules.json`.
- Migration `039` tạo `words`, `word_chain_sessions`, `word_chain_moves` cùng constraint/index;
  migration `040` tối ưu chọn từ mở đầu theo dictionary revision mà không count/scan toàn bảng.
- Migration `041` chuyển invariant từ một phiên/channel sang một phiên/guild; advisory lock theo
  guild tuần tự hóa hai lệnh mở ván đồng thời ở hai channel.
- Import idempotent đã chuyển 40.476/70.511 record `vi` hợp lệ từ `bot_tu_tien_test` sang
  `bot_tu_tien`; 30.035 record từ đơn, cụm dài hoặc ngoài content contract bị loại.
- `WordChainNormalizer`, repository và service độc lập Discord.js; session row lock tuần tự hóa
  attempt cùng channel, operation ID chống xử lý lại message và settlement dùng wallet/ledger/
  period counter trong cùng transaction.
- `!noitu`, `!noitu status`, `!noitu stop` ACTIVE. Message thường chỉ đi vào Word Chain sau khi
  command router bỏ qua; input không đúng shape hai từ bị loại trước khi mở transaction.
- UX move đúng chỉ thả reaction `✅`; người vừa nối đúng cố nối tiếp nhận `⏳`. Qualified
  failure thả `❌` và reply bằng text thường gồm lý do cùng bộ đếm `x/10`. Failure thứ 10 trả
  luôn winner/reward trong cùng tin nhắn text, không dùng embed.
- Cụm đúng shape hai từ nhưng không có trong dictionary là qualified failure: ghi move audit,
  react `❌` và tăng failure. Tất cả qualified failure hiển thị `❌ Sai`, phần bắt đầu cần nối và
  `Lỗi x/10`; không công khai nguyên nhân ngoài dictionary, nối không khớp hay dùng lại từ. Input
  trông như attempt hai phần nhưng sai ký tự/dấu câu nhận lời nhắc `⚠️ Từ không phù hợp` kèm phần
  bắt đầu cần nối, nhưng không tăng failure; hội thoại không mang shape attempt vẫn được bỏ qua.
- `verify:word-chain:postgres` PASS trong transaction rollback với ba Player, hai move đúng,
  10 qualified failure, winner/reward/ledger chính xác. Import chạy lại giữ nguyên 40.476 row.
- Load/soak nhiều channel thuộc hạng mục scale production; correctness hiện không phụ thuộc
  collector, timer hoặc Redis.
- Cooldown chống spam theo Player đang chờ chốt tại `Q-WORD-009`; chưa tự áp dụng giá trị 2–3 giây.

---

End
