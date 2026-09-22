import { SlashCommandBuilder } from 'discord.js';

export default class BaseCommand {
    constructor(options) {
        this.name = options.name;
        this.description = options.description;
        this.options = options.options || []; // Các tham số truyền vào lệnh nếu có
    }

    // Phương thức tạo cấu trúc dữ liệu gửi lên Discord API
    getSlashData() {
        const builder = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description);
        
        // Bạn có thể mở rộng xử lý thêm options (string, integer...) ở đây nếu cần
        return builder;
    }

    // Hàm này sẽ bị ghi đè (override) ở các lệnh con
    async execute(interaction, client) {
        throw new Error(`Lệnh ${this.name} chưa cấu hình hàm execute!`);
    }
}