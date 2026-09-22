import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import createSeededRandom from '../platform/random/createSeededRandom.js';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const businessRoots = ['battle', 'gameplay', 'runtime', 'foundation', 'factories', 'items', 'shared'];
const importPattern = /(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

async function listJavaScriptFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...await listJavaScriptFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            files.push(fullPath);
        }
    }
    return files;
}

function collectImports(source) {
    return [...source.matchAll(importPattern)].map((match) => match[1] || match[2]);
}

function normalizeRelative(filePath) {
    return path.relative(sourceRoot, filePath).replaceAll('\\', '/');
}

function resolveImport(filePath, specifier) {
    if (!specifier.startsWith('.')) {
        return specifier;
    }
    return normalizeRelative(path.resolve(path.dirname(filePath), specifier));
}

function assertNoViolations(violations, code) {
    if (violations.length > 0) {
        const error = new Error(code);
        error.details = violations;
        throw error;
    }
}

async function auditDiscordBoundary() {
    const violations = [];
    for (const rootName of businessRoots) {
        const files = await listJavaScriptFiles(path.join(sourceRoot, rootName));
        for (const filePath of files) {
            const imports = collectImports(await readFile(filePath, 'utf8'));
            if (imports.includes('discord.js')) {
                violations.push({ file: normalizeRelative(filePath), import: 'discord.js' });
            }
        }
    }
    assertNoViolations(violations, 'ARCHITECTURE_DISCORD_BOUNDARY_VIOLATION');
    return businessRoots;
}

async function auditBattleIsolation() {
    const files = await listJavaScriptFiles(path.join(sourceRoot, 'battle'));
    const violations = [];
    for (const filePath of files) {
        const imports = collectImports(await readFile(filePath, 'utf8'));
        for (const specifier of imports) {
            const resolved = resolveImport(filePath, specifier);
            const forbidden = specifier === 'discord.js'
                || specifier === 'fs'
                || specifier === 'node:fs'
                || specifier === 'node:fs/promises'
                || resolved.startsWith('database/')
                || resolved.startsWith('repositories/')
                || resolved.startsWith('platform/database/');
            if (forbidden) {
                violations.push({ file: normalizeRelative(filePath), import: specifier });
            }
        }
    }
    assertNoViolations(violations, 'ARCHITECTURE_BATTLE_ISOLATION_VIOLATION');
    return files.length;
}

async function auditBattleEntityFactoryGate() {
    const roots = ['gameplay', 'runtime'];
    const violations = [];
    for (const rootName of roots) {
        const files = await listJavaScriptFiles(path.join(sourceRoot, rootName));
        for (const filePath of files) {
            if (normalizeRelative(filePath) === 'runtime/battle/BattleEntityFactory.js') {
                continue;
            }
            const source = await readFile(filePath, 'utf8');
            if (/\bnew\s+BattleEntity\s*\(/.test(source)) {
                violations.push({ file: normalizeRelative(filePath), usage: 'new BattleEntity(...)' });
            }
        }
    }
    assertNoViolations(violations, 'ARCHITECTURE_BATTLE_ENTITY_FACTORY_BYPASS');
}

function auditSeededRandomProvider() {
    const first = createSeededRandom(20260716);
    const second = createSeededRandom(20260716);
    const firstSequence = Array.from({ length: 8 }, () => first());
    const secondSequence = Array.from({ length: 8 }, () => second());
    if (JSON.stringify(firstSequence) !== JSON.stringify(secondSequence)) {
        throw new Error('SEEDED_RANDOM_REPLAY_MISMATCH');
    }
    if (firstSequence.some((value) => value < 0 || value >= 1)) {
        throw new Error('SEEDED_RANDOM_RANGE_INVALID');
    }
    return firstSequence;
}

async function auditCacheOptionality() {
    const packageJson = JSON.parse(await readFile(path.resolve(sourceRoot, '../package.json'), 'utf8'));
    const dependencies = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {})
    };
    const forbiddenDependencies = ['redis', 'ioredis', '@redis/client'].filter((name) => dependencies[name]);
    assertNoViolations(forbiddenDependencies, 'ARCHITECTURE_PREMATURE_REDIS_DEPENDENCY');

    const cacheFiles = await listJavaScriptFiles(path.join(sourceRoot, 'platform/cache'));
    const violations = [];
    for (const filePath of cacheFiles) {
        for (const specifier of collectImports(await readFile(filePath, 'utf8'))) {
            if (specifier === 'discord.js' || /(?:^|\/)(?:ioredis|redis)(?:\/|$)/.test(specifier)) {
                violations.push({ file: normalizeRelative(filePath), import: specifier });
            }
        }
    }
    assertNoViolations(violations, 'ARCHITECTURE_CACHE_ADAPTER_BOUNDARY_VIOLATION');
    return cacheFiles.length;
}

try {
    const discordBoundaryRoots = await auditDiscordBoundary();
    const battleFiles = await auditBattleIsolation();
    await auditBattleEntityFactoryGate();
    const seededSequence = auditSeededRandomProvider();
    const cacheFiles = await auditCacheOptionality();

    console.log(JSON.stringify({
        status: 'PASS',
        checks: {
            discordBoundaryRoots,
            battleIsolationFiles: battleFiles,
            battleEntityFactoryGate: true,
            seededRandomReplay: true,
            cacheOptionality: true,
            cachePlatformFiles: cacheFiles,
            seededSequence
        }
    }, null, 2));
} catch (error) {
    console.error(JSON.stringify({
        status: 'FAIL',
        message: error.message,
        details: error.details || null
    }, null, 2));
    process.exitCode = 1;
}
