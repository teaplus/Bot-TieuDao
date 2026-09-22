import fs from 'fs';
import { Collection, MessageFlags } from 'discord.js';
import {
    buildCommandHelpCatalog,
    createCommandHelpPayload
} from '../application/discord/CommandHelpPresentation.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const commands = new Collection();
const commandDirectory = new URL('../commands/player/', import.meta.url);
const fileNames = fs.readdirSync(commandDirectory)
    .filter((fileName) => fileName.endsWith('.js'))
    .sort();

for (const fileName of fileNames) {
    const module = await import(new URL(fileName, commandDirectory));
    const command = new module.default();
    assert(!commands.has(command.name), 'Command name must be unique', command.name);
    commands.set(command.name, command);
}

const catalog = buildCommandHelpCatalog(commands);
assert(catalog.length === commands.size, 'Help must include every loaded command');
assert(new Set(catalog.map((command) => command.name)).size === commands.size,
    'Help must list each command exactly once');
assert(catalog.find((command) => command.name === 'trogiup')?.availability === 'ACTIVE',
    'Help command must list itself as active');
assert(catalog.filter((command) => command.availability === 'PLANNED')
    .map((command) => command.name).sort().join(',')
    === 'bangchien,loidai,todoi',
'Only approved roadmap placeholder commands may be marked planned');
assert(catalog.find((command) => command.name === 'shop')?.subcommands.length === 0,
    'Shop must expose one unified slash panel without legacy subcommands');
assert(catalog.every((command) => command.categoryId !== 'OTHER'),
    'Every current command must have an intentional help category');

const payload = createCommandHelpPayload(commands);
const json = payload.embeds[0].toJSON();
assert(json.fields.every((field) => field.value.length <= 1024),
    'Help category exceeds Discord embed field limit');
assert(json.description.includes(`${commands.size - 3}`) && json.description.includes('3'),
    'Help summary counts are incorrect', json.description);

const interactionState = { deferred: null, payload: null };
await commands.get('trogiup').execute({
    async deferReply(options) { interactionState.deferred = options; },
    async editReply(nextPayload) {
        interactionState.payload = nextPayload;
        return nextPayload;
    }
}, { commands });
assert(interactionState.deferred?.flags === MessageFlags.Ephemeral,
    'Help response must be ephemeral');
assert(interactionState.payload?.embeds?.length === 1,
    'Help command did not return its command catalog');

console.log(JSON.stringify({
    status: 'PASS',
    commandCount: commands.size,
    activeCount: commands.size - 3,
    plannedCount: 3,
    categories: json.fields.length,
    checks: [
        'all-loaded-commands-listed',
        'unique-command-entry',
        'unified-shop-slash-panel',
        'explicit-roadmap-status',
        'discord-field-limits',
        'ephemeral-help-response'
    ]
}, null, 2));
