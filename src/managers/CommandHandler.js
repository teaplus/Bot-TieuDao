import fs from 'fs';
import path from 'path';
import { Routes } from 'discord.js';
import { REST } from '@discordjs/rest';

export default class CommandHandler {
    constructor(client, options = {}) {
        this.client = client;
        this.scope = String(options.scope || 'GLOBAL').toUpperCase();
        this.guildId = options.guildId || '';
        this.restClient = options.restClient || null;
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
        const rest = this.restClient
            || new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        const commandData = this.client.commands.map(cmd => cmd.getSlashData().toJSON());
        const applicationId = this.client.application?.id || this.client.user.id;

        try {
            if (this.scope === 'GUILD') {
                if (!this.guildId) throw new Error('SLASH_COMMAND_GUILD_ID_REQUIRED');
                await rest.put(
                    Routes.applicationGuildCommands(applicationId, this.guildId),
                    { body: commandData }
                );
            } else {
                await rest.put(
                    Routes.applicationCommands(applicationId),
                    { body: commandData }
                );

                // Xóa bộ command guild cũ để chúng không che phiên bản global mới.
                if (this.guildId) {
                    await rest.put(
                        Routes.applicationGuildCommands(applicationId, this.guildId),
                        { body: [] }
                    );
                }
            }
            console.log(
                `🚀 Đã đồng bộ ${commandData.length} Slash Commands ở phạm vi ${this.scope}.`
            );
            return {
                scope: this.scope,
                commandCount: commandData.length,
                clearedGuildOverride: this.scope === 'GLOBAL' && Boolean(this.guildId)
            };
        } catch (error) {
            console.error('Lỗi đăng ký Slash Commands:', error);
            throw error;
        }
    }
}
