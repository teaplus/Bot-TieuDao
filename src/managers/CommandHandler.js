import fs from 'fs';
import path from 'path';
import { Routes } from 'discord.js';
import { REST } from '@discordjs/rest';

export default class CommandHandler {
    constructor(client) {
        this.client = client;
    }

    async loadCommands() {
        const commandFolders = fs.readdirSync('./src/commands');
        for (const folder of commandFolders) {
            const commandFiles = fs.readdirSync(`./src/commands/${folder}`).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                // Import động các Class Lệnh
                const { default: CommandClass } = await import(`../commands/${folder}/${file}`);
                const command = new CommandClass();
                this.client.commands.set(command.name, command);
            }
        }
        console.log(`⚡ Đã nạp thành công ${this.client.commands.size} Slash Commands.`);
    }

    async registerSlashCommands() {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        const commandData = this.client.commands.map(cmd => cmd.getSlashData().toJSON());

        try {
            // Đăng ký toàn bộ lệnh lên Discord API toàn cầu hoặc theo Guild
           await rest.put(
    Routes.applicationGuildCommands(this.client.user.id, process.env.GUILD_ID),
    { body: commandData }
);
            console.log('🚀 Đã đồng bộ cấu trúc Slash Commands với hệ thống Discord thành công!');
        } catch (error) {
            console.error('Lỗi đăng ký Slash Commands:', error);
        }
    }
}