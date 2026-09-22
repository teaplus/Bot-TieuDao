# DISCORD UI AUDIT

## Phạm vi

Audit giao diện Discord hiện hành trước khi xây UI thống nhất. Business logic, transaction và GameData không được chuyển vào command/presenter.

## Hiện trạng

- Có 22 slash command trong `src/commands/player`.
- Panel có `ComponentSession`: `/nhanvat`, `/tuvi`, `/trangbi`, `/linhcan`, `/chuyenmap`, `/bangxephang`, `/luanhoi`, `/biccanh`, `/nghenghiep`, `/thuthap`.
- Embed hoặc response tĩnh: `/start`, `/hoso`, `/profile`, `/dotpha`, `/thamhiem`, `/dungoan`, `/tambao`, `/shop`, `/thaotrangbi`.
- Placeholder disabled: `/loidai`, `/bangchien`, `/todoi`.
- `/hoso` là public summary; `/nhanvat` là management view ephemeral theo `Q-PROFILE-001`.

## Vấn đề cần xử lý

1. Tiếng Việt không đồng nhất: nhiều title/label/message còn không dấu trong khi gameplay mới dùng đầy đủ dấu.
2. Màu, footer, empty-state, error-state và cách format chỉ số được khai báo riêng trong từng command.
3. `/nhanvat` đã là dashboard sơ khai nhưng chỉ liên kết bốn tab read-only; Map, activity, wallet và action nhanh nằm ở các slash command rời.
4. Component session có owner filter và timeout nhưng mỗi command tự render trạng thái hết hạn/đóng.
5. Command placeholder xuất hiện như tính năng nhưng toàn bộ control bị disabled, chưa có cách phân biệt rõ `Sắp mở` với lỗi quyền/unlock.
6. Không có shared presentation model cho rarity/element/realm/status color và icon.

## Invariant đã chốt

- Discord adapter chỉ nhận DTO, gọi application service và render; không chứa gameplay.
- `/hoso` tiếp tục public allowlist; management/action panel mặc định ephemeral.
- Component custom ID phải gắn session/interaction identity và owner-only.
- Mutation cần confirm khi có cost/reset/destructive effect; preview không được tự ghi database.
- Hết TTL phải disable component hoặc render state hết hạn, không để button còn vẻ hoạt động.
- Không đưa content pending thành action khả dụng.
- Embed phải tuân thủ giới hạn Discord: title/description/field/row/component count.

## Foundation đề xuất sau khi chốt navigation

- `DiscordUiTheme`: color token theo domain/status, label/icon registry, footer và locale `vi-VN`.
- Presenter helpers: format Realm, quality, Element, reward, stat percentage và progress bar.
- Shared states: loading, empty, locked, pending-content, success, error, expired.
- Dashboard presenter nhận canonical management DTO; tab chỉ render, không query repository.
- Command hiện hữu được giữ làm deep link/shortcut trong giai đoạn chuyển đổi.

## Verification cần có

- Serialize toàn bộ slash command và component payload.
- Audit embed/component limits và unique custom ID.
- Owner-only, timeout, stale preview và double-click tests.
- Snapshot presenter cho player mới, player có đầy đủ content, locked map và content pending.
- Architecture audit tiếp tục cấm `discord.js` trong gameplay/battle.

## Vertical slice đã triển khai

`Q-UI-001` chọn dashboard nhân vật trung tâm:

- `/nhanvat` có 5 tab trong một action row: Tổng quan, Tu luyện, Trang bị, Hành trình, Kho đồ.
- Shared `DiscordUiTheme` cung cấp color token, Unicode progress bar, bullet list, truncate theo giới hạn Discord, base embed và disable component rows.
- Dashboard chỉ đọc canonical management/profile, inventory và current-map view; không chứa mutation/gameplay.
- Các slash command hiện hữu được hiển thị như lối tắt và vẫn hoạt động độc lập.
- Session gắn interaction ID, owner-only; timeout giữ nội dung cuối và disable cả 5 tab.
- `audit:character-dashboard` kiểm tra đủ 5 tab, unique custom ID, payload limits, command lifecycle và expired state.

### Refinement Tổng quan/Tu luyện

- Tổng quan ưu tiên bốn khối: Đạo cơ, Tài nguyên, Chiến lực và trạng thái tu luyện; vị trí hiện tại nằm ngay subtitle.
- Tu luyện phân biệt rõ `persistedCultivation`, `earned` chưa nhận và `projectedCultivation` sau khi nhận.
- Tốc độ hiển thị bằng effective `gainPerMinute`, không dùng nhãn multiplier mơ hồ.
- Hiển thị thời gian bế quan, full-efficiency gain, overflow effective gain, số còn thiếu và tỷ lệ đột phá.
- Tất cả vẫn là preview read-only; nhận tu vi/đột phá tiếp tục qua `/tuvi` transaction hiện hữu.

### Thuộc tính cộng thêm trên Tổng quan

- `Q-UI-002` chọn phạm vi: trang bị đang mặc, Công Pháp đang vận hành và Linh Căn/phẩm chất Linh Căn.
- Application read model tạo `attributeBonuses`; Discord presenter không tự đọc item hoặc thực hiện gameplay calculation.
- Effect được gộp theo `stat + mode`: additive mode cộng, `mul_total` nhân. Vì vậy flat, phần trăm base và multiplier tổng của cùng một stat vẫn là các dòng riêng.
- Trang bị chưa mặc, Realm, Passive Skill, Tông Môn và active buff không xuất hiện trong field này.
- `EffectFormatter` chịu trách nhiệm đổi tỷ lệ lưu dạng decimal sang phần trăm dễ đọc, ví dụ `0.25` thành `+25%`.

### UI Linh Căn

- `/linhcan xem` hiển thị affinity, lượt reroll và Effect hiện tại, phân nhãn theo Tu luyện/Chiến đấu/Đột phá.
- Preview reroll giữ cảnh báo giảm phẩm và odds theo entitlement, đồng thời cho người chơi thấy Effect đang sở hữu trước khi xác nhận thay thế vĩnh viễn.
- Kết quả reroll hiển thị Effect của tổ hợp mới; formatter dùng metadata Modifier/Attribute nên tỷ lệ decimal được trình bày bằng `%`.
- Odds preview hiển thị đủ 8 phẩm trong bracket entitlement; ACTION Effect được gắn nhãn `Kỹ năng cùng hệ`.
- Tổng quan nhân vật hiển thị matching-element bonus như hiệu ứng Linh Căn có điều kiện, không cộng nhầm vào global Final Damage.
- Command chỉ render projection từ `SpiritRootRerollService`, không tự resolve GameData hoặc tính stat.

Đề xuất asset/icon được lưu riêng tại `011_UI_ICON_PACK_PROPOSAL.md` với trạng thái `DEFERRED`.

### UI Túi Trữ Vật

- `/tuido` không còn render tối đa 10 field rồi âm thầm bỏ phần còn lại. Presenter chia 5 mục mỗi trang và hỗ trợ chuyển trang.
- Header hiển thị Linh thạch, số ô đã dùng/capacity, tổng trang bị và stack vật phẩm.
- Năm bộ lọc owner-only: Tất cả, Trang bị, Tiêu hao, Nguyên liệu và Bí kíp. Item ngoài taxonomy hiện hữu vẫn xuất hiện trong Tất cả.
- Trang bị đang mặc được xếp trước và gắn nhãn rõ; dòng phụ hiển thị slot, cấp/phẩm và tối đa bốn Effect qua `EffectFormatter`, nên decimal percent được trình bày bằng `%`.
- Consumable/Material hiển thị số lượng theo locale `vi-VN`; Skill Book phân biệt chủ động/bị động; Công Pháp hiển thị tốc độ tu luyện.
- Không hiển thị runtime inventory ID. Các command mutation như `/trangbi`, `/congphap` tiếp tục tự cung cấp select menu canonical. `/kynang` đã được hợp nhất vào dashboard `/congphap`.
- Session dùng interaction ID, owner-only, TTL hai phút; khi hết hạn giữ trang cuối nhưng gỡ toàn bộ component.
- `PlayerReadService` cung cấp `slotUsage/slotCapacity`; Discord presenter không query repository hoặc tính inventory business rule.
- `audit:inventory-presentation` kiểm tra sorting, filter, pagination, percentage Effect, số lượng lớn, ẩn runtime ID và expired cleanup.

## Runtime requirement

`discord.js` hiện tại cần Node hiện đại. Project khai báo `engines.node >= 20.19.0` và `.nvmrc = 20.19.2`; không dùng Node 14 để chạy bot/audit UI.
