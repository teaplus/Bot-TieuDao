import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client, Events, GatewayIntentBits } from 'discord.js';

const ASSET_ROOT = fileURLToPath(new URL('../assets/ui/', import.meta.url));
const MANIFEST_PATH = path.join(ASSET_ROOT, 'ui_assets.json');

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function applyPattern(pattern, templateId) {
    return String(pattern).replaceAll('{template}', templateId.toLowerCase());
}

function atomicWriteJson(targetPath, value) {
    const temporaryPath = `${targetPath}.tmp`;
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    fs.renameSync(temporaryPath, targetPath);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const templatePolicy = manifest.equipmentTemplateIconPolicy;
const emojiPolicy = manifest.applicationEmojiPolicy;
assert(templatePolicy && emojiPolicy, 'APPLICATION_EMOJI_POLICY_MISSING');

const token = String(process.env.DISCORD_TOKEN || '').trim();
assert(token, 'DISCORD_TOKEN_MISSING');

const templateIds = templatePolicy.sheets.flatMap((sheet) => Object.values(sheet.templates));
assert(templateIds.length === 32 && new Set(templateIds).size === 32,
    'APPLICATION_EMOJI_TEMPLATE_MATRIX_INVALID');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
try {
    await client.login(token);
    if (!client.isReady()) await new Promise((resolve) => client.once(Events.ClientReady, resolve));
    const existing = await client.application.emojis.fetch();
    const existingByName = new Map([...existing.values()].map((emoji) => [emoji.name, emoji]));
    const mapping = {};
    let created = 0;
    let reused = 0;

    for (const templateId of templateIds) {
        const name = applyPattern(emojiPolicy.namePattern, templateId);
        assert(/^[a-z0-9_]{2,32}$/i.test(name), `APPLICATION_EMOJI_NAME_INVALID:${name}`);
        const relativeSource = applyPattern(emojiPolicy.sourcePattern, templateId);
        const sourcePath = path.resolve(ASSET_ROOT, relativeSource);
        assert(sourcePath.startsWith(`${path.resolve(ASSET_ROOT)}${path.sep}`),
            `APPLICATION_EMOJI_SOURCE_PATH_INVALID:${templateId}`);
        assert(fs.existsSync(sourcePath), `APPLICATION_EMOJI_SOURCE_MISSING:${templateId}`);

        let emoji = existingByName.get(name);
        if (emoji) {
            reused++;
        } else {
            emoji = await client.application.emojis.create({ attachment: sourcePath, name });
            existingByName.set(name, emoji);
            created++;
        }
        mapping[templateId] = { id: emoji.id, name: emoji.name };
    }

    const mappingPath = path.resolve(ASSET_ROOT, emojiPolicy.mappingFile);
    assert(mappingPath.startsWith(`${path.resolve(ASSET_ROOT)}${path.sep}`),
        'APPLICATION_EMOJI_MAPPING_PATH_INVALID');
    atomicWriteJson(mappingPath, {
        revision: 1,
        applicationId: client.application.id,
        syncedAt: new Date().toISOString(),
        emojis: mapping
    });

    console.log(JSON.stringify({
        status: 'PASS', applicationId: client.application.id,
        expected: templateIds.length, created, reused, mapped: Object.keys(mapping).length
    }, null, 2));
} finally {
    client.destroy();
}
