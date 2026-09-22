import fs from 'node:fs';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import RebirthStatCalculator from '../gameplay/player/RebirthStatCalculator.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const manager = bootstrapGameData();
const rules = manager.getCollection('rebirthRules');
const calculator = new RebirthStatCalculator(rules.baseStatBonus);
const migrationSql = fs.readFileSync(
    new URL('../database/migrations/016_rebirth_foundation.sql', import.meta.url),
    'utf8'
);

assert(rules.repeatPolicy === 'UNLIMITED', 'Rebirth repeat policy is not unlimited');
assert(rules.retention.SPIRIT_STONE === 'KEEP', 'Spirit Stone must be retained');
assert(rules.retention.OTHER_CURRENCIES === 'RESET', 'Other currencies must reset');
assert(rules.retention.INVENTORY === 'RESET' && rules.retention.EQUIPMENT === 'RESET',
    'Inventory and equipment must reset');
assert(rules.retention.LEARNED_SKILLS === 'RESET'
    && rules.retention.CULTIVATION_ARTS === 'RESET'
    && rules.retention.SECT_MEMBERSHIP === 'RESET', 'Progression retention matrix mismatch');
assert(rules.resetBootstrap.cultivationArtId === 'CP_NEUTRAL_HOANG',
    'Runtime bootstrap cultivation art is missing');

const sequence = ['0', '1', '2', '4', '16'].map((count) => calculator.calculate('100', count));
assert(JSON.stringify(sequence) === JSON.stringify(['100', '125', '135', '150', '200']),
    'Square-root rebirth formula is not deterministic', sequence);
assert(calculator.calculate('9007199254740993', '4') === '13510798882111489',
    'Rebirth calculator lost precision above Number.MAX_SAFE_INTEGER');

assert(migrationSql.includes('rebirth_count NUMERIC'), 'Migration must use arbitrary-precision NUMERIC count');
assert(migrationSql.includes('player_rebirth_history'), 'Migration must persist rebirth history');
assert(migrationSql.includes('UNIQUE (operation_id)'), 'Rebirth history must reject duplicate operation IDs');
assert(migrationSql.includes('UNIQUE (player_id, rebirth_number)'),
    'Rebirth history must reject duplicate player rebirth numbers');

console.log(JSON.stringify({
    status: 'PASS',
    checks: {
        policyId: rules.id,
        policyRevision: rules.revision,
        repeatPolicy: rules.repeatPolicy,
        retentionDomains: Object.keys(rules.retention).length,
        formulaSequence: sequence,
        arbitraryPrecision: true,
        migration: '016_rebirth_foundation.sql'
    }
}, null, 2));
