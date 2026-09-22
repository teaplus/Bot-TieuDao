import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client, Events, GatewayIntentBits } from 'discord.js';

const ROOT = fileURLToPath(new URL('../assets/ui/', import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'ui_assets.json'), 'utf8'));
const policy = manifest.shopAreaIconPolicy;

function assert(condition, code) {
    if (!condition) throw new Error(code);
}

function applyPattern(pattern, areaId) {
    return String(pattern).replaceAll('{area}', areaId.toLowerCase());
}

function atomicWriteJson(targetPath, value) {
    const temporaryPath = `${targetPath}.tmp`;
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    fs.renameSync(temporaryPath, targetPath);
}

assert(policy, 'SHOP_AREA_ICON_POLICY_MISSING');
const token = String(process.env.DISCORD_TOKEN || '').trim();
assert(token, 'DISCORD_TOKEN_MISSING');
const areaIds = policy.areas.map((entry) => entry.id);
assert(areaIds.length === 4 && new Set(areaIds).size === 4, 'SHOP_AREA_MATRIX_INVALID');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
try {
    await client.login(token);
    if (!client.isReady()) await new Promise((resolve) => client.once(Events.ClientReady, resolve));
    const existing = await client.application.emojis.fetch();
    const existingByName = new Map([...existing.values()].map((emoji) => [emoji.name, emoji]));
    const emojis = {};
    let created = 0;
    let reused = 0;
    for (const areaId of areaIds) {
        const name = applyPattern(policy.namePattern, areaId);
        const sourcePath = path.resolve(ROOT, applyPattern(policy.sourcePattern, areaId));
        assert(sourcePath.startsWith(`${path.resolve(ROOT)}${path.sep}`),
            `SHOP_AREA_SOURCE_PATH_INVALID:${areaId}`);
        assert(fs.existsSync(sourcePath), `SHOP_AREA_SOURCE_MISSING:${areaId}`);
        let emoji = existingByName.get(name);
        if (emoji) {
            reused++;
        } else {
            emoji = await client.application.emojis.create({ attachment: sourcePath, name });
            existingByName.set(name, emoji);
            created++;
        }
        emojis[areaId] = { id: emoji.id, name: emoji.name };
    }
    const mappingPath = path.resolve(ROOT, policy.mappingFile);
    atomicWriteJson(mappingPath, {
        revision: 1,
        applicationId: client.application.id,
        syncedAt: new Date().toISOString(),
        emojis
    });
    console.log(JSON.stringify({
        status: 'PASS', applicationId: client.application.id,
        expected: areaIds.length, created, reused, mapped: Object.keys(emojis).length
    }, null, 2));
} finally {
    client.destroy();
}
