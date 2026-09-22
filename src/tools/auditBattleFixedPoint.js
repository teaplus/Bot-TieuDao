import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import BattleEntity from '../battle/entities/BattleEntity.js';
import FormulaEngine from '../battle/formulas/FormulaEngine.js';
import TurnManager from '../battle/turns/TurnManager.js';
import BattleStatCalculator from '../battle/stats/BattleStatCalculator.js';
import { evaluateBattleExpression } from '../battle/numeric/BattleExpressionEvaluator.js';
import {
    BATTLE_FIXED_SCALE,
    formatBattleFixed,
    parseBattleFixed,
    randomBattleFixed
} from '../battle/numeric/BattleFixed.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const gameDataManager = bootstrapGameData();
setGameDataManager(gameDataManager);
const huge = '900719925474099312345678901234567890';
assert(formatBattleFixed(parseBattleFixed(huge)) === huge, 'Huge fixed value lost precision');
assert(BATTLE_FIXED_SCALE === 1_000_000n, 'Battle fixed scale is not 10^6');
assert(evaluateBattleExpression('ATK * 1.25 - DEF / 2', { ATK: huge, DEF: '10' })
    === '1125899906842624140432098626543209857.5', 'Expression evaluator lost precision');
assert(randomBattleFixed('0.8', '1', () => 0.123456789) === '0.824691', 'RNG quantization mismatch');

const boosted = BattleStatCalculator.calculate(huge, [
    { stat: 'atk', mode: 'add_percent_base', value: '0.1' }
], 'atk');
assert(boosted === '990791918021509243580246791358024679', 'Huge stat modifier lost precision', boosted);

const attacker = new BattleEntity({
    id: 'huge-attacker', team: 'A',
    battleStat: { hp: huge, atk: huge, def: '0', spd: `${huge}2`, critRate: '0' }
});
const target = new BattleEntity({
    id: 'huge-target', team: 'B',
    battleStat: { hp: huge, atk: '1', def: '10', spd: `${huge}1`, critRate: '0' }
});
const damage = new FormulaEngine({ gameDataManager, random: () => 0 })
    .calculateDamage(attacker, target, { variance: false, critical: false });
assert(damage.amount === '900719925474099312345678901234567880', 'Huge damage lost precision', damage);
const applied = target.receiveDamage(damage.amount);
assert(applied.remainingHP === '10' && applied.hpDamage === damage.amount, 'Huge HP mutation lost precision', applied);

const context = {
    round: 1,
    getAliveEntities: () => [target, attacker]
};
const order = new TurnManager().buildTurnOrder(context);
assert(order[0] === attacker, 'Turn order used unsafe numeric subtraction');
assert(JSON.stringify({ damage, applied, stats: attacker.battleStat }).includes(huge),
    'Battle public snapshot is not JSON-safe decimal-string');

console.log(JSON.stringify({
    status: 'PASS',
    checks: {
        scale: '1000000',
        hugeValue: huge,
        boosted,
        damage: damage.amount,
        remainingHP: applied.remainingHP,
        rng: randomBattleFixed('0.8', '1', () => 0.123456789),
        expressionParser: 'BIGINT_FIXED_POINT',
        jsonBoundary: 'DECIMAL_STRING'
    }
}, null, 2));
