import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function listJavaScriptFiles(directory) {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const fullPath = path.join(directory, entry.name);
        return entry.isDirectory()
            ? listJavaScriptFiles(fullPath)
            : entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : [];
    });
}

export default class MessageCommandHandler {
    constructor(client, options = {}) {
        this.client = client;
        this.prefix = options.prefix || '!';
        this.directory = options.directory || path.resolve('src/message-commands');
    }

    async loadCommands() {
        for (const filePath of listJavaScriptFiles(this.directory)) {
            const { default: CommandClass } = await import(pathToFileURL(filePath).href);
            const command = new CommandClass();
            const keys = [command.name, ...(command.aliases || [])]
                .map((key) => String(key).trim().toLowerCase())
                .filter(Boolean);
            for (const key of keys) {
                if (this.client.messageCommands.has(key)) {
                    throw new Error(`DUPLICATE_MESSAGE_COMMAND:${key}`);
                }
                this.client.messageCommands.set(key, command);
            }
        }
        return {
            aliases: this.client.messageCommands.size,
            commands: new Set(this.client.messageCommands.values()).size
        };
    }

    async handle(message) {
        if (!message || message.author?.bot || !message.content?.startsWith(this.prefix)) return false;
        const input = message.content.slice(this.prefix.length).trim();
        if (!input) return false;
        const [rawName, ...args] = input.split(/\s+/u);
        const command = this.client.messageCommands.get(rawName.toLowerCase());
        if (!command) return false;
        try {
            await command.execute(message, this.client, args);
        } catch (error) {
            this.client.logger?.error('Message command failed', {
                command: command.name,
                playerId: message.author?.id,
                error: error instanceof Error ? error.message : String(error)
            });
            const response = typeof command.errorMessage === 'function'
                ? command.errorMessage(error)
                : 'Thiên cơ nhiễu loạn, lệnh chưa thể hoàn thành.';
            await message.reply({ content: response, allowedMentions: { repliedUser: false } });
        }
        return true;
    }
}
