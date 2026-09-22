# UI ICON PACK PROPOSAL

## Trạng thái

`MVP_ACTIVE` — visual starter pack đã được phát hành cho dashboard `/nhanvat`;
runtime vẫn có text/emoji fallback và không phụ thuộc asset để bảo đảm correctness.

## Visual starter pack revision 1

Ba banner PNG tỷ lệ ngang đã được tạo và lưu trong `src/assets/ui/banners`:

- `CHARACTER_OVERVIEW`: đạo hữu nhìn ra tiên sơn và vân hải, dùng cho tab Tổng quan.
- `CULTIVATION`: nhân vật tọa thiền hấp thụ linh khí, dùng cho tab Tu luyện.
- `JOURNEY`: đạo hữu tiến về sơn môn trên tuyến tiên lộ, dùng cho tab Hành trình.

Manifest `src/assets/ui/ui_assets.json` ánh xạ semantic ID sang file và tên Discord
attachment. `UiAssetResolver` chỉ tồn tại trong presentation layer, từ chối đường dẫn
thoát khỏi asset root và trả `null` khi manifest/file không khả dụng. Dashboard khi đó
giữ nguyên giao diện text/emoji; business logic không đọc ảnh.

Mỗi lần render chỉ upload ảnh của tab hiện tại. Khi chuyển tab, payload xóa attachment
cũ rồi đính kèm ảnh mới, tránh hiển thị các file PNG không được embed sử dụng.

### Prompt set revision 1

- Tổng quan: một tu sĩ nhìn từ sau trên đài ngọc cao, hướng về biển mây, tiên sơn và
  con đường thiên quang; bình minh vàng, jade/teal tiết chế.
- Tu luyện: tu sĩ tọa thiền trong động phủ sơn môn, linh khí hội tụ về đan điền;
  emerald, jade và ánh vàng dịu.
- Hành trình: lữ khách áo bào đi trên cổ đạo hướng về sơn môn, thác nước, tùng,
  vân kiều và kiếm quang xa; sương lam và đèn vàng.

Cả ba dùng art direction thủy mặc kết hợp polished game concept art, bố cục điện ảnh
ngang, không chữ/logo/watermark/UI frame và ưu tiên silhouette rõ khi thu nhỏ.

## Equipment pixel icon pack revision 1

Bộ trang bị dùng bốn master pixel-art trung tính theo đúng slot GameData:

- `WEAPON`: phi kiếm.
- `ARMOR`: chiến giáp.
- `NECKLACE`: dây chuyền ngọc.
- `RING`: nhẫn linh ngọc.

Từ bốn master, tool `generate:equipment-icons` sinh ma trận 84 PNG kích thước 256×256:
`4 loại × 7 phẩm × 3 chất lượng`. Màu khung biểu thị phẩm `Hoàng/Huyền/Địa/Thiên/
Tiên/Thánh/Thần`; một, hai hoặc ba viên ngọc dưới khung biểu thị `Hạ/Trung/Thượng`.
Palette, độ dày khung, số marker và pattern đường dẫn đều nằm trong
`src/assets/ui/ui_assets.json`, vì vậy có thể đổi presentation rồi generate lại mà
không gọi image model và không sửa gameplay.

`/trangbi` dùng thumbnail của trang bị đang được nhấn mạnh: ưu tiên món vừa chọn,
sau đó vũ khí đang mặc, món đang mặc khác và cuối cùng món đầu tiên trong túi. Nếu
asset/grade/quality không resolve được, UI quay về avatar Discord. Attachment cũ được
xóa trên mỗi update, không tạo file rác dưới embed.

Bốn master được tạo bằng built-in `imagegen`, phong cách 32-bit pixel-art RPG, nền
charcoal, vật phẩm jade/bronze/steel, không chữ, không rarity frame và không gắn hệ.
Khung phẩm cấp được hậu xử lý deterministic để mọi loại có cùng visual grammar.

## Equipment template icon pack revision 1

Icon chung theo slot tiếp tục làm fallback, nhưng 32 template hiện hành đã có artwork
riêng theo đúng `item.id`: tám hệ `Hỏa/Mộc/Thổ/Thủy/Kim/Lôi/Băng/Phong`, mỗi hệ gồm
Vũ khí, Áo giáp, Dây chuyền và Nhẫn. Vũ khí phân biệt trực quan theo catalog: kiếm,
trượng, chùy và thương; không còn dùng chung một hình phi kiếm cho mọi template.

Built-in `imagegen` tạo tám sprite sheet 2×2 nhất quán. Tool
`generate:equipment-template-icons` cắt sheet thành 32 master 256×256 và sinh ma trận
`32 template × 7 phẩm × 3 chất lượng = 672` icon runtime 32×32. Master 256×256 được giữ
lại làm nguồn; bản runtime 32×32 đóng vai trò icon nhỏ và có thể tái sinh từ master.

Manifest revision 4 giữ mapping sheet/quadrant/template, kích thước export và pattern đường dẫn.
`UiAssetResolver` resolve theo thứ tự:

1. Icon chính xác theo `item.id + grade + gradeQuality`.
2. Icon chung theo `equipmentType + grade + gradeQuality`.
3. Avatar Discord nếu cả hai lớp asset đều không khả dụng.

Vì vậy template trang bị mới chưa có artwork vẫn hoạt động bình thường. Artwork chỉ
thuộc presentation layer; Element, chỉ số, phẩm và chất lượng tiếp tục lấy từ GameData.

## Compact inventory và inline icon revision 1

`/tuido` hiển thị tối đa 10 món mỗi trang, mỗi món đúng một dòng gồm icon, tên, số lượng,
phẩm, metadata chính và tối đa hai hiệu ứng. Mô tả dài không còn lặp trên danh sách; mục tiêu
là quét nhanh túi đồ trên màn hình Discord nhỏ mà vẫn giữ thông tin gameplay quan trọng.

Trong text và String Select, presentation dùng icon theo hình thức trang bị: kiếm, trượng,
chùy, thương, giáp, dây chuyền và nhẫn. `/trangbi` tiếp tục dùng PNG chính xác của món đang
nhấn mạnh làm thumbnail. PNG attachment không thể hiển thị inline trước từng tên; việc dùng
chính artwork tại vị trí đó được triển khai bằng 32 Application Emoji theo `Q-UI-003`.

Manifest revision 5 khai báo nguồn emoji 128×128, tên deterministic `td_<item_id>` và file
mapping. `sync:equipment-application-emojis` fetch danh sách emoji hiện hữu, tái sử dụng theo
tên và chỉ tạo phần còn thiếu; không xóa emoji ngoài policy và không chạy tự động khi bot
khởi động. Resolver dùng mapping Snowflake cho text/String Select, đồng thời giữ Unicode theo
hình thức trang bị làm fallback nếu file thiếu hoặc entry không hợp lệ.

## Map environment banner pack revision 1

Toàn bộ 15 map canonical từ Thanh Vân Sơn Mạch đến Khởi Nguyên Đạo Giới có một ảnh
environment riêng kích thước 1672×941. Bộ ảnh dùng polished cinematic xianxia concept art,
landmark và palette tăng dần theo cảnh giới; không có nhân vật, quái, chữ, logo, watermark
hoặc UI frame để tái sử dụng được cho nhiều activity.

Manifest revision 6 ánh xạ explicit `map.id` sang file và attachment name. Presentation
resolve ảnh cho `/chuyenmap`, tab Hành trình `/nhanvat`, `/thamhiem`, `/dungoan`, `/biccanh`
và `/thuthap`. Mỗi render xóa attachment cũ rồi gắn file đúng map; asset thiếu trả `null`
và UI vẫn hoạt động không ảnh, không ảnh hưởng gameplay hoặc persistence.

## Sect emblem pack revision 1

Mười Tông Môn canonical có mười emblem vuông 1254×1254 riêng, bám theo tên, hệ và nội tại:
Hỏa liên Xích Diễm, Linh mộc Thanh Mộc, sơn thuẫn Hậu Thổ, hải châu Thương Hải, Kim Kiếm,
Thiên Lôi, Hàn Nguyệt, Lưỡng Nghi, Sát Đạo và hồ lô Trường Sinh. Ảnh không chứa chữ, nhân vật,
logo, watermark hay UI frame để vẫn đọc rõ khi Discord thu nhỏ thành thumbnail.

Manifest revision 8 ánh xạ explicit `sect.id` sang file và attachment name. `/tongmon` chỉ gắn
emblem của Tông đang được chọn, đồng thời xóa attachment của lựa chọn trước; nếu mapping/file
không tồn tại thì presentation giữ avatar Discord làm fallback. Artwork không tham gia business
logic, Element, nội tại, điều kiện gia nhập hoặc đổi thưởng.

## Battle semantic icon pack revision 1

Battle và `/congphap` dùng một registry 12 semantic thay vì tạo icon riêng cho từng Skill:
Sát thương, Hồi máu, Khiên, Chí mạng, Thiêu đốt, Đóng băng, Choáng, Câm lặng, Làm chậm,
Khóa hồi máu, Thanh tẩy và Sét lan. Mỗi semantic có master 1254×1254, nguồn Application
Emoji 128×128 và Unicode fallback. Skill được phân loại từ Action/Effect canonical; tên Skill
mới dùng primitive hiện hữu sẽ tự nhận icon mà không cần sửa presentation mapping.

Manifest revision 9 khai báo pattern master/source/name và mapping file. Lệnh
`generate:battle-semantic-emoji-sources` tái sinh 12 nguồn upload; lệnh
`sync:battle-semantic-application-emojis` chỉ tạo emoji còn thiếu, tái sử dụng emoji cùng tên
và ghi Snowflake mapping atomically. Sync là thao tác triển khai thủ công, không chạy khi bot
khởi động. Trước khi sync, battle và `/congphap` tiếp tục hiển thị Unicode fallback hợp lệ.

## Item và resource semantic icon pack revision 1

Túi đồ, chiến lợi phẩm và nghề nghiệp dùng registry 11 semantic dành cho content đang hoạt
động: bốn đan dược `Phá Chướng/Tu Vi/Tụ Linh/Cuồng Bạo`, Vé Bí Cảnh, Linh Thạch, Đan Phương
và bốn nhóm nguyên liệu `HERB/ORE × PRIMARY/RARE`. Không tạo 60 artwork riêng theo từng tên
nguyên liệu; mọi resource ở 15 map tự nhận icon từ `family + role`, còn tên, cấp map và độ
hiếm vẫn hiển thị từ GameData. Resource mới dùng bốn tổ hợp hiện hành không cần sửa UI.

Mỗi semantic có master pixel-art 1254×1254, nguồn Application Emoji 128×128 nền trong suốt
và Unicode fallback. Manifest revision 10 giữ exact mapping cho năm stack item hiện hành,
mapping Linh Thạch theo `currencyId`, pattern tên `td_item_<semantic>` và mapping Snowflake.
`ItemResourceEmojiResolver` chỉ nằm trong Discord presentation layer; business logic và
persistence không đọc artwork.

`/tuido` dùng icon trước tên item và trong select sử dụng vật phẩm. `RewardTextFormatter`
dùng cùng resolver cho Linh Thạch và item drop; `/nghenghiep` dùng icon cho công thức, thành
phẩm, nguyên liệu, chi phí và dòng báo thiếu. Lệnh
`generate:item-resource-emoji-sources` tái sinh nguồn 128×128 và làm sạch checkerboard nối
từ biên; `sync:item-resource-application-emojis` là bước triển khai thủ công, không chạy lúc
bot startup. Khi chưa sync, toàn bộ ba UI vẫn chạy bằng Unicode fallback.

## Mục tiêu

Tạo ngôn ngữ hình ảnh nhất quán cho Discord UI, ưu tiên khả năng nhận diện ở kích thước nhỏ thay vì artwork chi tiết cho toàn bộ content.

## MVP đề xuất: 30–40 icon

1. Element: Kim, Mộc, Thủy, Hỏa, Thổ, Lôi, Băng, Phong.
2. Equipment Type: Vũ khí, Giáp, Pháp y, Nhẫn.
3. Resource: Linh Thạch, Tu Vi, điểm Tông Môn, vé Bí Cảnh.
4. Status: khóa, mở, đang mặc, tăng, giảm, boss, quality.
5. Activity: Tu luyện, Đột phá, Thám hiểm, Bí Cảnh, Di chuyển, Luân hồi.
6. Quality/Rarity marker dùng shape + color, không chỉ dựa vào màu để vẫn dễ phân biệt.

Chân dung quái, boss và hình nền map làm sau MVP vì chi phí lớn và ít tái sử dụng hơn.

## Art direction

- Phong cách Tu Tiên tối giản, silhouette rõ ở 32–64 px.
- PNG hoặc WebP nền trong suốt; source master nên giữ kích thước lớn hơn để export nhiều size.
- Cùng độ dày viền, hướng sáng, mức chi tiết và palette.
- Kiểm tra trên cả Discord dark/light theme.
- Không đưa chữ nhỏ vào icon.

## Tích hợp đề xuất

- GameData `ui_icons.json` ánh xạ semantic ID (`elementId`, `equipmentType`, `currencyId`, `activityId`) sang asset/emoji key.
- `IconResolver` ở Discord presentation layer; command không hard-code emoji hoặc URL.
- Unicode emoji có thể làm fallback cho button/select.
- Nếu bot chạy nhiều guild, không phụ thuộc duy nhất vào custom emoji của một guild.
- Ảnh embed cần URL/CDN ổn định hoặc attachment theo response; không lưu binary trong PostgreSQL.

## Không làm ở giai đoạn này

- Không tạo một ảnh riêng cho mọi Item/Monster.
- Không dùng icon để thay thế text quan trọng.
- Không cho asset loading ảnh hưởng correctness hoặc business logic.
- Không thêm registry/asset placeholder trước khi có bộ file thật.
