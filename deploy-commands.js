require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

// 1. Định nghĩa lại lệnh mới muốn tạo (Lệnh /ping sạch sẽ)
const commands = [
    new SlashCommandBuilder()
        .setName('okela')
        .setDescription('Phản hồi lại bằng okela!'),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('--- BẮT ĐẦU DỌN DẸP LỆNH SLASH ---');

        // LÀM SẠCH LỆNH TRÊN SERVER TEST (GUILD)
        if (process.env.GUILD_ID) {
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: [] }, // Gửi mảng rỗng để xóa sạch lệnh Guild
            );
            console.log('✅ Đã xóa sạch toàn bộ lệnh Slash cũ trên Server Test.');
        }

        // LÀM SẠCH LỆNH TOÀN CẦU (GLOBAL)
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: [] }, // Gửi mảng rỗng để xóa sạch lệnh Global
        );
        console.log('✅ Đã xóa sạch toàn bộ lệnh Slash cũ bản Global.');

        console.log('\n--- BẮT ĐẦU TẠO LẠI LỆNH MỚI ---');

        // ĐĂNG KÝ LẠI LỆNH VÀO SERVER TEST ĐỂ CẬP NHẬT NGAY LẬP TỨC
        if (process.env.GUILD_ID) {
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands },
            );
            console.log('🚀 Đã nạp lại lệnh /okela mới cho Server Test thành công!');
        } else {
            // Nếu không có Guild ID thì nạp Global
            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands },
            );
            console.log('🚀 Đã nạp lại lệnh /okela mới bản Global thành công!');
        }

    } catch (error) {
        console.error('Gặp lỗi khi xử lý lệnh:', error);
    }
})();