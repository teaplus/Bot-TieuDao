# Command Help Specification

Module: Application / Discord UI

Status: IMPLEMENTED

## Mục tiêu

`/trogiup` là cẩm nang slash command trong Discord. Danh sách phải phản ánh
command registry đã được nạp khi bot khởi động, không duy trì một danh sách runtime
tách biệt có thể bỏ sót command.

## Trạng thái phát hành

- `ACTIVE`: command có gameplay hoặc chức năng đang sử dụng được.
- `PLANNED`: command đã đăng ký giao diện khung nhưng gameplay theo Roadmap chưa mở.

Các command `PLANNED` hiện tại:

- `/loidai`
- `/todoi`
- `/bangchien`

Command mới mặc định là `ACTIVE`; command giao diện khung phải khai báo
`availability: "PLANNED"` rõ ràng trong constructor.

## Presentation

- Phản hồi ephemeral để không làm trôi kênh Discord.
- Nhóm lệnh theo Nhập môn, Tu luyện, Vật phẩm, Thế giới, Cộng đồng và Hệ thống.
- Lấy tên/subcommand trực tiếp từ `getSlashData()` của command.
- Hiển thị `✅` cho lệnh hoạt động và `🕓` cho lệnh đang phát triển.
- Command chưa có mapping nhóm vẫn xuất hiện trong nhóm `Lệnh khác`, không bị ẩn.
- Mỗi field phải nằm trong giới hạn 1024 ký tự của Discord Embed.

## Quy tắc mở rộng

Khi thêm slash command:

1. CommandHandler tự nạp command như bình thường.
2. Thêm category và mô tả tiếng Việt trong `CommandHelpPresentation`.
3. Nếu gameplay chưa mở, khai báo `availability: "PLANNED"`.
4. Chạy `npm run audit:command-help`.

Audit bắt buộc mọi command hiện hành xuất hiện đúng một lần, trạng thái placeholder
đúng allowlist, subcommand được phát hiện từ SlashCommandBuilder và payload không
vượt giới hạn Discord.
