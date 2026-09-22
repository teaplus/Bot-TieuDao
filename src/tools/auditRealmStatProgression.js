import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import RealmStatProgressionCalculator from '../core/RealmStatProgressionCalculator.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const gameDataManager = bootstrapGameData();
const realms = Object.values(gameDataManager.getCollection('realms'));
const calculator = new RealmStatProgressionCalculator(
    realms,
    gameDataManager.getCollection('progressionRules')
);
const cases = [
    [1, 1, { hp: '200', atk: '40', def: '20', spd: '5' }],
    [1, 2, { hp: '220', atk: '44', def: '22', spd: '5' }],
    [1, 10, { hp: '468', atk: '89', def: '42', spd: '5' }],
    [2, 1, { hp: '702', atk: '133', def: '63', spd: '7' }],
    [2, 2, { hp: '842', atk: '159', def: '75', spd: '8' }],
    [3, 1, { hp: '6143', atk: '1149', def: '537', spd: '44' }]
];

for (const [realmId, stage, expected] of cases) {
    const actual = calculator.calculate(realmId, stage);
    assert(JSON.stringify(actual) === JSON.stringify(expected),
        'Realm stat progression milestone mismatch', { realmId, stage, expected, actual });
}

let previous = calculator.calculate(1, 1);
for (const realm of [...realms].sort((left, right) => left.order - right.order)) {
    for (let stage = 1; stage <= realm.max_stage; stage += 1) {
        if (realm.id === 1 && stage === 1) continue;
        const current = calculator.calculate(realm.id, stage);
        for (const stat of ['hp', 'atk', 'def', 'spd']) {
            assert(BigInt(current[stat]) >= BigInt(previous[stat]),
                'Realm stat must never decrease', { realmId: realm.id, stage, stat, previous, current });
        }
        previous = current;
    }
}

console.log(JSON.stringify({
    status: 'PASS',
    checks: {
        policyRevision: 2,
        milestones: cases.length,
        realmCount: realms.length,
        nonDecreasingTransitions: realms.reduce((total, realm) => total + realm.max_stage, 0) - 1,
        finalStats: previous
    }
}, null, 2));
