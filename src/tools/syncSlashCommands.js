import 'dotenv/config';
import { Collection, REST, Routes } from 'discord.js';
import CommandHandler from '../managers/CommandHandler.js';
import { loadAppConfig } from '../platform/config/loadAppConfig.js';

const config = loadAppConfig(process.env);
if (config.missingKeys.length > 0) {
    throw new Error(`CONFIG_MISSING_ENV:${config.missingKeys.join(',')}`);
}
if (config.invalidKeys.length > 0) {
    throw new Error(`CONFIG_INVALID_ENV:${config.invalidKeys.join(',')}`);
}

const rest = new REST({ version: '10' }).setToken(config.discordToken);
const application = await rest.get(Routes.oauth2CurrentApplication());
if (!application?.id) throw new Error('DISCORD_APPLICATION_ID_NOT_FOUND');

const client = {
    application: { id: application.id },
    user: { id: application.id },
    commands: new Collection()
};
const handler = new CommandHandler(client, {
    scope: config.slashCommandScope,
    guildId: config.guildId,
    restClient: rest
});

await handler.loadCommands();
const result = await handler.registerSlashCommands();

console.log(JSON.stringify({
    status: 'PASS',
    scope: result.scope,
    commandCount: result.commandCount,
    clearedGuildOverride: result.clearedGuildOverride
}, null, 2));
