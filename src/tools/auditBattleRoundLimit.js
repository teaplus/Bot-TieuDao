import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import BattleEngine from '../battle/BattleEngine.js';
import BattleEntity from '../battle/entities/BattleEntity.js';
import { BATTLE_DRAW_MESSAGE } from '../application/discord/BattleOutcomeText.js';
import BattleLogAnimator from '../application/discord/BattleLogAnimator.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const gameDataManager = bootstrapGameData();
const roundLimit = gameDataManager.getCollection('battleRules').roundLimit;
const createTank = (id, team) => new BattleEntity({
    id,
    name: id,
    team,
    battleStat: {
        hp: '1000000',
        atk: '1',
        def: '1000000',
        spd: team === 'A' ? '2' : '1'
    },
    skills: []
});
const result = new BattleEngine({ gameDataManager, random: () => 0 }).run({
    battleId: 'audit:round-limit',
    teams: {
        A: [createTank('round-limit-player', 'A')],
        B: [createTank('round-limit-monster', 'B')]
    }
});

assert(roundLimit === 15, 'Canonical battle round limit must be 15', roundLimit);
assert(result.outcome === 'DRAW'
    && result.isDraw === true
    && result.drawReason === 'ROUND_LIMIT'
    && result.winnerTeam === null
    && result.loserTeam === null,
'Round limit did not produce canonical DRAW', result);
assert(result.rounds === 15, 'BattleResult must report exactly 15 rounds', result.rounds);
assert(result.events.some((event) => (
    event.type === 'BATTLE_ROUND_LIMIT_REACHED' && event.maxRounds === 15
)), 'Round-limit audit event is missing');
assert(!result.events.some((event) => event.type === 'BATTLE_TIMEOUT'),
    'Legacy BATTLE_TIMEOUT event must not be emitted');

const finalEmbed = BattleLogAnimator.renderFinalEmbed(result).toJSON();
assert(finalEmbed.description.includes(BATTLE_DRAW_MESSAGE)
    && !finalEmbed.description.includes('TIMEOUT'),
'Draw UI must use the xianxia message without technical timeout text', finalEmbed);

console.log(JSON.stringify({
    status: 'PASS',
    roundLimit,
    outcome: result.outcome,
    drawReason: result.drawReason,
    rounds: result.rounds,
    turns: result.turns,
    uiMessage: BATTLE_DRAW_MESSAGE
}, null, 2));
