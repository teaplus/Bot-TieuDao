const REQUIRED_ENV_KEYS = ['DISCORD_TOKEN'];
const SLASH_COMMAND_SCOPES = new Set(['GLOBAL', 'GUILD']);

function readString(value) {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim();
}

export function loadAppConfig(env = process.env) {
    const slashCommandScope = (readString(env.SLASH_COMMAND_SCOPE) || 'GLOBAL').toUpperCase();
    const config = {
        discordToken: readString(env.DISCORD_TOKEN),
        guildId: readString(env.GUILD_ID),
        slashCommandScope,
        messageCommandPrefix: readString(env.MESSAGE_COMMAND_PREFIX) || '!',
        nodeEnv: readString(env.NODE_ENV) || 'development'
    };

    const missingKeys = REQUIRED_ENV_KEYS.filter((key) => {
        if (key === 'DISCORD_TOKEN') {
            return !config.discordToken;
        }

        return false;
    });
    if (slashCommandScope === 'GUILD' && !config.guildId) missingKeys.push('GUILD_ID');

    const invalidKeys = [];
    if (!SLASH_COMMAND_SCOPES.has(slashCommandScope)) {
        invalidKeys.push('SLASH_COMMAND_SCOPE');
    }

    return Object.freeze({
        ...config,
        missingKeys,
        invalidKeys,
        isProduction: config.nodeEnv === 'production'
    });
}
