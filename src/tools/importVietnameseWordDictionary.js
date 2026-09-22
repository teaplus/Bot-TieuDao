import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const BATCH_SIZE = 500;
const LATIN_WORD_PAIR = /^[\p{Script=Latin}\p{Mark}]+ [\p{Script=Latin}\p{Mark}]+$/u;

function databaseIdentity(value) {
    const parsed = new URL(value);
    return [
        parsed.protocol,
        parsed.username,
        parsed.hostname,
        parsed.port || '5432',
        parsed.pathname
    ].join('|');
}

function loadRules() {
    const url = new URL('../data/minigames/word_chain_rules.json', import.meta.url);
    return JSON.parse(fs.readFileSync(url, 'utf8'));
}

export function normalizeDictionaryWord(value, rules) {
    const displayWord = String(value || '')
        .normalize(rules.inputPolicy.unicodeNormalization)
        .trim()
        .replace(/\s+/gu, ' ');
    const normalizedWord = displayWord.toLocaleLowerCase('vi');
    if (normalizedWord.length > rules.inputPolicy.maxLength) return null;
    if (!LATIN_WORD_PAIR.test(normalizedWord)) return null;
    const [firstPart, secondPart] = normalizedWord.split(' ');
    const denylist = new Set(rules.inputPolicy.denylist.map((entry) => (
        String(entry).normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('vi')
    )));
    if (denylist.has(normalizedWord)) return null;
    return { displayWord, normalizedWord, firstPart, secondPart };
}

function buildInsert(entries) {
    const values = [];
    const tuples = entries.map((entry, index) => {
        const offset = index * 8;
        values.push(
            entry.sourceWordId,
            entry.word,
            entry.sourceId,
            entry.langCode,
            entry.normalizedWord,
            entry.firstPart,
            entry.secondPart,
            entry.dictionaryRevision
        );
        return `(${Array.from({ length: 8 }, (_, valueIndex) => `$${offset + valueIndex + 1}`).join(', ')})`;
    });
    return {
        text: `INSERT INTO words (
                   source_word_id, word, source_id, lang_code,
                   normalized_word, first_part, second_part, dictionary_revision
               ) VALUES ${tuples.join(', ')}
               ON CONFLICT (lang_code, normalized_word)
               DO UPDATE SET word = EXCLUDED.word,
                             source_id = EXCLUDED.source_id,
                             source_word_id = EXCLUDED.source_word_id,
                             first_part = EXCLUDED.first_part,
                             second_part = EXCLUDED.second_part,
                             dictionary_revision = EXCLUDED.dictionary_revision,
                             imported_at = CURRENT_TIMESTAMP`,
        values
    };
}

export async function importVietnameseWordDictionary(environment = process.env) {
    const targetUrl = String(environment.DATABASE_URL || '').trim();
    const sourceUrl = String(
        environment.WORD_DICTIONARY_SOURCE_DATABASE_URL
        || environment.PROGRESSION_TEST_DATABASE_URL
        || environment.ACTIVITY_TEST_DATABASE_URL
        || ''
    ).trim();
    if (!targetUrl) throw new Error('DATABASE_URL_REQUIRED');
    if (!sourceUrl) throw new Error('WORD_DICTIONARY_SOURCE_DATABASE_URL_REQUIRED');
    if (databaseIdentity(targetUrl) === databaseIdentity(sourceUrl)) {
        throw new Error('WORD_DICTIONARY_SOURCE_MUST_DIFFER_FROM_PRIMARY');
    }

    const rules = loadRules();
    const sourcePool = new Pool({ connectionString: sourceUrl, max: 1 });
    const targetPool = new Pool({ connectionString: targetUrl, max: 1 });
    let targetClient;
    try {
        const [sourceIdentity, targetIdentity, sourceRows, targetTable] = await Promise.all([
            sourcePool.query('SELECT current_database() AS name'),
            targetPool.query('SELECT current_database() AS name'),
            sourcePool.query(
                `SELECT id, word, source_id, lang_code
                 FROM words
                 WHERE lang_code = $1
                 ORDER BY id`,
                [rules.languageCode]
            ),
            targetPool.query("SELECT to_regclass('public.words') AS name")
        ]);
        if (!targetTable.rows[0].name) throw new Error('TARGET_WORDS_TABLE_MISSING_RUN_MIGRATIONS');

        const eligible = [];
        let rejected = 0;
        for (const row of sourceRows.rows) {
            const normalized = normalizeDictionaryWord(row.word, rules);
            if (!normalized) {
                rejected += 1;
                continue;
            }
            eligible.push({
                sourceWordId: row.id,
                word: normalized.displayWord,
                sourceId: row.source_id,
                langCode: rules.languageCode,
                normalizedWord: normalized.normalizedWord,
                firstPart: normalized.firstPart,
                secondPart: normalized.secondPart,
                dictionaryRevision: rules.dictionaryRevision
            });
        }

        targetClient = await targetPool.connect();
        await targetClient.query('BEGIN');
        for (let offset = 0; offset < eligible.length; offset += BATCH_SIZE) {
            const batch = eligible.slice(offset, offset + BATCH_SIZE);
            const statement = buildInsert(batch);
            await targetClient.query(statement.text, statement.values);
        }
        const finalCount = await targetClient.query(
            `SELECT COUNT(*)::int AS count
             FROM words
             WHERE lang_code = $1 AND dictionary_revision = $2`,
            [rules.languageCode, rules.dictionaryRevision]
        );
        await targetClient.query('COMMIT');

        return {
            status: 'PASS',
            sourceDatabase: sourceIdentity.rows[0].name,
            targetDatabase: targetIdentity.rows[0].name,
            sourceVietnameseRows: sourceRows.rowCount,
            eligibleRows: eligible.length,
            rejectedRows: rejected,
            targetRevisionRows: finalCount.rows[0].count,
            dictionaryRevision: rules.dictionaryRevision
        };
    } catch (error) {
        if (targetClient) await targetClient.query('ROLLBACK').catch(() => {});
        throw error;
    } finally {
        targetClient?.release();
        await Promise.all([sourcePool.end(), targetPool.end()]);
    }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    try {
        console.log(JSON.stringify(await importVietnameseWordDictionary(), null, 2));
    } catch (error) {
        console.error(JSON.stringify({
            status: 'FAIL',
            errorCode: error?.code || error?.message || 'WORD_DICTIONARY_IMPORT_FAILED'
        }, null, 2));
        process.exitCode = 1;
    }
}
