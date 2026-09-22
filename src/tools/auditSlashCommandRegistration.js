import assert from 'node:assert/strict';
import { Collection, Routes } from 'discord.js';
import CommandHandler from '../managers/CommandHandler.js';
import { loadAppConfig } from '../platform/config/loadAppConfig.js';

function createClient() {
    const commands = new Collection();
    commands.set('start', {
        getSlashData() {
            return { toJSON: () => ({ name: 'start', description: 'Tạo nhân vật' }) };
        }
    });
    commands.set('tuido', {
        getSlashData() {
            return { toJSON: () => ({ name: 'tuido', description: 'Xem túi đồ' }) };
        }
    });
    return {
        application: { id: '123456789012345678' },
        user: { id: '123456789012345678' },
        commands
    };
}

function createRestRecorder() {
    const calls = [];
    return {
        calls,
        async put(route, options) {
            calls.push({ route, body: options.body });
            return options.body;
        }
    };
}

const globalRest = createRestRecorder();
await new CommandHandler(createClient(), {
    scope: 'GLOBAL',
    guildId: '987654321098765432',
    restClient: globalRest
}).registerSlashCommands();
assert.equal(globalRest.calls.length, 2);
assert.equal(globalRest.calls[0].route, Routes.applicationCommands('123456789012345678'));
assert.deepEqual(globalRest.calls[0].body.map((command) => command.name), ['start', 'tuido']);
assert.equal(
    globalRest.calls[1].route,
    Routes.applicationGuildCommands('123456789012345678', '987654321098765432')
);
assert.deepEqual(globalRest.calls[1].body, []);

const guildRest = createRestRecorder();
await new CommandHandler(createClient(), {
    scope: 'GUILD',
    guildId: '987654321098765432',
    restClient: guildRest
}).registerSlashCommands();
assert.equal(guildRest.calls.length, 1);
assert.equal(
    guildRest.calls[0].route,
    Routes.applicationGuildCommands('123456789012345678', '987654321098765432')
);
assert.equal(guildRest.calls[0].body.length, 2);

const defaultConfig = loadAppConfig({ DISCORD_TOKEN: 'test' });
assert.equal(defaultConfig.slashCommandScope, 'GLOBAL');
assert.deepEqual(defaultConfig.invalidKeys, []);
assert.deepEqual(defaultConfig.missingKeys, []);

const guildConfig = loadAppConfig({
    DISCORD_TOKEN: 'test',
    SLASH_COMMAND_SCOPE: 'guild',
    GUILD_ID: '987654321098765432'
});
assert.equal(guildConfig.slashCommandScope, 'GUILD');
assert.deepEqual(guildConfig.missingKeys, []);

const missingGuild = loadAppConfig({ DISCORD_TOKEN: 'test', SLASH_COMMAND_SCOPE: 'GUILD' });
assert(missingGuild.missingKeys.includes('GUILD_ID'));

const invalidScope = loadAppConfig({
    DISCORD_TOKEN: 'test',
    SLASH_COMMAND_SCOPE: 'SERVER'
});
assert(invalidScope.invalidKeys.includes('SLASH_COMMAND_SCOPE'));

console.log(JSON.stringify({
    status: 'PASS',
    defaultScope: defaultConfig.slashCommandScope,
    globalCommandCount: globalRest.calls[0].body.length,
    clearsLegacyGuildOverride: true,
    guildModeOptional: true,
    invalidConfigGuard: true
}, null, 2));
