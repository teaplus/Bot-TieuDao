import { Client, Collection, GatewayIntentBits, MessageFlags } from 'discord.js';
import CommandHandler from '../managers/CommandHandler.js';
import { initializeDatabase } from '../database/initDB.js';

export default class ExtendedClient extends Client {
    constructor() {
        super({ intents: [GatewayIntentBits.Guilds] });
        this.commands = new Collection(); // Lưu trữ các lệnh đang hoạt động
        this.commandHandler = new CommandHandler(this);
    }

    async start(token) {
        // Khởi tạo database trước khi login
        await initializeDatabase();

        // Load toàn bộ lệnh trước khi login
        await this.commandHandler.loadCommands();

        this.once('ready', async () => {
            console.log(`☯️ Bot Tu Tiên [${this.user.tag}] đã thức tỉnh!`);
            // Đăng ký Slash Commands với Discord Server công khai
            await this.commandHandler.registerSlashCommands();
        });

        this.on('interactionCreate', async (interaction) => {
            if (!interaction.isChatInputCommand()) return;
            
            const command = this.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction, this);
            } catch (error) {
                console.error(`❌ Lỗi tại lệnh ${command.name}:`, error);
                
                // Cú pháp mới thay thế cho { ephemeral: true }
                const errorPayload = { 
                    content: 'Thiên địa linh khí hỗn loạn, không thể thực thi pháp thuật lúc này!', 
                    flags: MessageFlags.Ephemeral 
                };

                // Kiểm tra xem interaction đã được reply hay defer chưa để tránh lỗi 40060
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorPayload);
                } else {
                    await interaction.reply(errorPayload);
                }
            }
        });

        await this.login(token);
    }
}
