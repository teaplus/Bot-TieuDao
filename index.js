require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds] 
});

client.once(Events.ClientReady, c => {
    console.log(`Bíp bíp! Bot ${c.user.tag} đã online và đang lắng nghe lệnh!`);
});

// Lắng nghe tương tác
client.on(Events.InteractionCreate, async interaction => {
    console.log(interaction);
    // Nếu không phải slash command thì dừng lại ngay
    // if (!interaction.isChatInputCommand()) return;

    // Ghi log ra màn hình terminal để xem bot có thực sự nhận được lệnh không
    console.log(`Nhận được lệnh: /${interaction.commandName} từ user: ${interaction.user.tag}`);

    if (interaction.commandName === 'okela') {
        try {
            await interaction.reply('🏓 Pong! Bao Thanh Thiên đã xử án xong trong vòng 1 nốt nhạc!');
        } catch (error) {
            console.error('Lỗi khi reply interaction:', error);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);