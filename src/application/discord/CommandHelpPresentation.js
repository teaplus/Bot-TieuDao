import { EmbedBuilder } from 'discord.js';

const CATEGORY_DEFINITIONS = Object.freeze([
    { id: 'BEGINNER', name: '🌱 Nhập môn & Nhân vật' },
    { id: 'PROGRESSION', name: '🧘 Tu luyện & Năng lực' },
    { id: 'INVENTORY', name: '🎒 Vật phẩm & Kinh tế' },
    { id: 'WORLD', name: '🗺️ Thế giới & PvE' },
    { id: 'SOCIAL', name: '🏯 Cộng đồng & Cạnh tranh' },
    { id: 'SYSTEM', name: '📚 Hệ thống' },
    { id: 'OTHER', name: '📌 Lệnh khác' }
]);

const COMMAND_CATEGORIES = Object.freeze({
    start: 'BEGINNER',
    nhanvat: 'BEGINNER',
    hoso: 'BEGINNER',
    tuvi: 'PROGRESSION',
    dotpha: 'PROGRESSION',
    luanhoi: 'PROGRESSION',
    linhcan: 'PROGRESSION',
    congphap: 'PROGRESSION',
    trangbi: 'INVENTORY',
    thaotrangbi: 'INVENTORY',
    tuido: 'INVENTORY',
    shop: 'INVENTORY',
    nghenghiep: 'INVENTORY',
    chuyenmap: 'WORLD',
    thamhiem: 'WORLD',
    dungoan: 'WORLD',
    biccanh: 'WORLD',
    thuthap: 'WORLD',
    tambao: 'WORLD',
    bangxephang: 'SOCIAL',
    tongmon: 'SOCIAL',
    loidai: 'SOCIAL',
    todoi: 'SOCIAL',
    bangchien: 'SOCIAL',
    give: 'SOCIAL',
    xoanhanvat: 'SYSTEM',
    trogiup: 'SYSTEM'
});

const COMMAND_SUMMARIES = Object.freeze({
    start: 'Khởi tạo nhân vật và bước vào con đường tu tiên.',
    nhanvat: 'Mở dashboard tổng hợp hành trình của nhân vật.',
    hoso: 'Xem nhanh hồ sơ, chỉ số và hiệu ứng hiện tại.',
    tuvi: 'Xem, nhận tu vi tích lũy và thực hiện đột phá.',
    dotpha: 'Lối tắt thực hiện đột phá cảnh giới.',
    luanhoi: 'Xem trước và xác nhận Luân hồi sau cảnh giới cuối.',
    linhcan: 'Xem hoặc tái tạo Linh Căn bằng lượt Luân hồi.',
    congphap: 'Quản lý Công Pháp tu luyện, Kỹ Năng và bí kíp.',
    trangbi: 'Xem trước, mặc hoặc tháo nhiều ô trang bị.',
    thaotrangbi: 'Lối tắt tháo nhanh trang bị đang mặc.',
    tuido: 'Xem và phân loại vật phẩm trong Túi Trữ Vật.',
    shop: 'Mở Phường Thị, Trân Các, shop Tông Môn và Merchant Kỳ Ngộ.',
    nghenghiep: 'Quản lý nghề nghiệp và các mẻ chế tạo lazy.',
    chuyenmap: 'Xem vị trí và di chuyển một bậc trên tuyến map.',
    thamhiem: 'Gặp quái hoặc Kỳ Ngộ ngẫu nhiên tại map hiện tại.',
    dungoan: 'Du ngoạn và đối đầu kỳ ngộ tại khu vực hiện tại.',
    biccanh: 'Tiến vào Bí Cảnh nhiều wave và khiêu chiến boss.',
    thuthap: 'Thu thập Linh Thảo hoặc Linh Khoáng theo map.',
    tambao: 'Thăm dò bảo vật và nhận tài nguyên.',
    bangxephang: 'Xem bảng xếp hạng tu vi toàn cõi.',
    tongmon: 'Xem, gia nhập, rời Tông Môn và đổi bí tịch truyền thừa.',
    loidai: 'Khung PvP và matchmaking, chưa mở gameplay.',
    todoi: 'Khung tổ đội và formation, chưa mở gameplay.',
    bangchien: 'Khung Bang chiến quy mô lớn, chưa mở gameplay.',
    give: 'Gửi Linh Thạch cho một đạo hữu đã tạo nhân vật.',
    xoanhanvat: 'Xóa tiến trình nhân vật để tạo lại, giữ nguyên Linh Thạch.',
    trogiup: 'Xem danh sách slash command và trạng thái phát hành.'
});

function commandArray(commands) {
    if (Array.isArray(commands)) return commands;
    if (typeof commands?.values === 'function') return [...commands.values()];
    return Object.values(commands || {});
}

function subcommandPaths(options = [], prefix = '') {
    return options.flatMap((option) => {
        if (option.type === 1) return [`${prefix}${option.name}`];
        if (option.type === 2) {
            return subcommandPaths(option.options || [], `${prefix}${option.name} `);
        }
        return [];
    });
}

export function buildCommandHelpCatalog(commands) {
    return commandArray(commands)
        .map((command) => {
            const slashData = command.getSlashData().toJSON();
            return Object.freeze({
                name: command.name,
                categoryId: COMMAND_CATEGORIES[command.name] || 'OTHER',
                summary: COMMAND_SUMMARIES[command.name]
                    || command.description
                    || slashData.description
                    || 'Chưa có mô tả.',
                availability: command.availability || 'ACTIVE',
                subcommands: Object.freeze(subcommandPaths(slashData.options))
            });
        })
        .sort((left, right) => left.name.localeCompare(right.name, 'vi'));
}

function commandLine(command) {
    const status = command.availability === 'PLANNED' ? '🕓' : '✅';
    const branches = command.subcommands.length
        ? `\n  ↳ ${command.subcommands.map((name) => `\`${name}\``).join(' · ')}`
        : '';
    return `${status} \`/${command.name}\` — ${command.summary}${branches}`;
}

export function createCommandHelpPayload(commands) {
    const catalog = buildCommandHelpCatalog(commands);
    const activeCount = catalog.filter((command) => command.availability === 'ACTIVE').length;
    const plannedCount = catalog.length - activeCount;
    const embed = new EmbedBuilder()
        .setTitle('📜 Tiểu Đạo — Cẩm Nang Lệnh')
        .setColor('#C89B3C')
        .setDescription(
            `Có **${activeCount}** lệnh đang hoạt động và **${plannedCount}** lệnh đang phát triển.\n`
            + '✅ dùng được · 🕓 mới là giao diện khung theo Roadmap.'
        );

    for (const category of CATEGORY_DEFINITIONS) {
        const entries = catalog.filter((command) => command.categoryId === category.id);
        if (!entries.length) continue;
        embed.addFields({
            name: category.name,
            value: entries.map(commandLine).join('\n').slice(0, 1024)
        });
    }

    embed.setFooter({
        text: 'Danh sách được tạo từ command registry khi bot khởi động.'
    });
    return { embeds: [embed], components: [] };
}
