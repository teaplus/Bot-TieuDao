import DiscordResponse from './DiscordResponse.js';

export default class CommandErrorHandler {
    constructor(options = {}) {
        this.logger = options.logger;
    }

    async handle(error, context = {}) {
        const { interaction, command } = context;
        this.log(error, context);

        if (!interaction) {
            return null;
        }

        return DiscordResponse.safeReply(
            interaction,
            DiscordResponse.error(this.resolveUserMessage(error))
        );
    }

    log(error, context = {}) {
        const { command, interaction } = context;
        this.logger?.error(`Command execution failed: ${command?.name || 'unknown'}`, {
            userId: interaction?.user?.id || null,
            commandName: command?.name || null,
            errorName: error instanceof Error ? error.name : 'UnknownError',
            errorCode: error?.code || null,
            error: error instanceof Error ? error.message : String(error)
        });
    }

    resolveUserMessage(error) {
        const knownMessages = {
            CONFIG_MISSING_ENV: 'Cau hinh he thong chua day du, hay bao quan tri vien.',
            PLAYER_NOT_FOUND: 'Hay dung `/start` de tao nhan vat truoc.'
        };

        return knownMessages[error?.code] || knownMessages[error?.message]
            || 'Thien dia linh khi hon loan, khong the thuc thi phap thuat luc nay!';
    }
}
