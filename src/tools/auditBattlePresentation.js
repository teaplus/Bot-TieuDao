import fs from 'fs';
import BattleLogAnimator from '../application/discord/BattleLogAnimator.js';
import {
    BATTLE_DRAW_MESSAGE,
    EXPLORATION_DRAW_MESSAGE
} from '../application/discord/BattleOutcomeText.js';

function assert(condition, message, details = null) {
    if (!condition) throw new Error(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
}

const combatLog = [{
    round: 1,
    message: 'Battle started',
    details: {
        entities: [
            { id: 'player', currentHP: '100', maxHP: '100' },
            { id: 'boss', currentHP: '200', maxHP: '200' }
        ]
    }
}];
for (let index = 1; index <= 6; index += 1) {
    combatLog.push({
        round: index,
        message: `Dao huu uses Kiem Thu ${index}`,
        details: {
            actorName: 'Dao huu',
            skillName: `Kiem Thu ${index}`,
            summary: {
                damage: [{
                    targetId: 'boss', amount: '20',
                    applied: { remainingHP: String(200 - index * 20) }
                }],
                healing: [], shields: [], effects: [], modifiers: []
            }
        }
    });
}
combatLog.push({ round: 6, message: 'Battle ended', details: { winnerTeam: 'A' } });

const battleResult = {
    combatLog,
    entities: [
        { id: 'player', name: 'Dao huu', team: 'A', currentHP: '100', maxHP: '100' },
        { id: 'boss', name: 'Boss Bi Canh', team: 'B', currentHP: '80', maxHP: '200' }
    ]
};
const finalLines = BattleLogAnimator.formatCombatLog(battleResult);
assert(finalLines.length > 0 && finalLines.length <= 5,
'Final combat log must keep at most five newest entries', finalLines);
assert(!finalLines.some((entry) => entry.line.includes('Kiem Thu 1'))
    && finalLines.some((entry) => entry.line.includes('Kiem Thu 6')),
'Combat log rolling window did not evict its oldest entry', finalLines);
assert(finalLines.every((entry) => !/[🟩🟥⬛]/u.test(entry.line)),
    'Combat text must not contain HP bars', finalLines);

const controlLines = BattleLogAnimator.formatCombatLog({
    entities: battleResult.entities,
    combatLog: [{
        round: 1,
        message: 'Dao huu uses Loi Nguc',
        details: {
            actorName: 'Dao huu',
            skillName: 'Lôi Ngục',
            summary: {
                damage: [{
                    targetId: 'boss', amount: '45', critical: true,
                    applied: { remainingHP: '155' }
                }], healing: [], shields: [], modifiers: [],
                effects: [{
                    targetId: 'boss', effectId: 'STUN', effectName: 'Choáng',
                    controlDirective: 'SKIP_ACTION', tags: ['CONTROL'], success: true
                }]
            }
        }
    }, {
        round: 1,
        message: 'Boss Bi Canh cannot act',
        details: { actorId: 'boss', directive: 'SKIP_ACTION' }
    }, {
        round: 1,
        message: 'Boss Bi Canh suffers Thieu Dot',
        details: {
            targetName: 'Boss Bi Canh', effectName: 'Thiêu Đốt',
            summary: {
                damage: [{
                    targetId: 'boss', amount: '10',
                    applied: { remainingHP: '145' }
                }], healing: [], shields: [], effects: [], modifiers: []
            }
        }
    }]
}, { maxEntries: 5 });
assert(controlLines.some((entry) => entry.line.includes('Choáng') && entry.line.includes('thành công')),
'Successful control effect is missing from battle presentation', controlLines);
assert(controlLines.some((entry) => entry.line.includes('mất lượt')),
'Skipped control turn is missing from battle presentation', controlLines);
assert(controlLines.some((entry) => entry.line.includes('Chí mạng')),
'Critical hit label is missing from battle presentation', controlLines);
assert(controlLines.some((entry) => entry.line.includes('Thiêu Đốt') && entry.line.includes('10')),
'Effect tick is missing from battle presentation', controlLines);

const finalEmbed = BattleLogAnimator.renderFinalEmbed(battleResult).toJSON();
assert(finalEmbed.description.indexOf('Dao huu') < finalEmbed.description.indexOf('`V'),
'Player HP must appear above the combat log', finalEmbed.description);
assert(finalEmbed.description.includes('**100**/100')
    && finalEmbed.description.includes('**80**/200'),
'Final HP bars must use final entity HP', finalEmbed.description);
const monsterThumbnailEmbed = BattleLogAnimator.renderFinalEmbed(battleResult, {
    thumbnailUrl: 'attachment://monster-portrait.png',
    interaction: {
        user: { displayAvatarURL: () => 'https://example.invalid/player-avatar.png' }
    }
}).toJSON();
assert(monsterThumbnailEmbed.thumbnail?.url === 'attachment://monster-portrait.png',
    'Explicit monster portrait must take priority over the player avatar', monsterThumbnailEmbed);

const drawBattleResult = {
    isDraw: true,
    winnerTeam: null,
    outcome: 'DRAW',
    drawReason: 'ROUND_LIMIT',
    combatLog: [{
        round: 15,
        message: 'Battle ended',
        details: {
            winnerTeam: null,
            outcome: 'DRAW',
            drawReason: 'ROUND_LIMIT',
            maxRounds: 15
        }
    }],
    entities: battleResult.entities
};
const drawEmbed = BattleLogAnimator.renderFinalEmbed(drawBattleResult).toJSON();
assert(drawEmbed.description.includes(BATTLE_DRAW_MESSAGE)
    && !drawEmbed.description.includes('TIMEOUT')
    && !drawEmbed.description.includes('error'),
'Round-limit draw must use the approved xianxia sentence instead of a technical error', drawEmbed);
const explorationDrawEmbed = BattleLogAnimator.renderFinalEmbed(drawBattleResult, {
    drawMessage: EXPLORATION_DRAW_MESSAGE
}).toJSON();
assert(explorationDrawEmbed.description.includes(EXPLORATION_DRAW_MESSAGE)
    && !explorationDrawEmbed.description.includes(BATTLE_DRAW_MESSAGE),
'Exploration draw must override the generic draw sentence', explorationDrawEmbed);

const edits = [];
await BattleLogAnimator.play({
    async editReply(payload) { edits.push(payload.embeds[0].toJSON()); }
}, battleResult, { delayMs: 0 });
assert(edits.length === combatLog.length, 'Realtime boss must render every visible battle entry', edits.length);
assert(edits[0].description.includes('**100**/100')
    && edits[0].description.includes('**200**/200'),
'Realtime first frame must show initial HP', edits[0].description);
assert(edits.at(-1).description.includes('**80**/200'),
'Realtime final frame must show latest HP update', edits.at(-1).description);
assert(edits.every((embed) => (
    (embed.description.match(/^`V/gm) || []).length <= 5
)), 'Realtime rolling log exceeded five entries');

const explorationSource = fs.readFileSync(new URL('../commands/player/thamhiem.js', import.meta.url), 'utf8');
const travelSource = fs.readFileSync(new URL('../commands/player/dungoan.js', import.meta.url), 'utf8');
const secretRealmSource = fs.readFileSync(new URL('../commands/player/biccanh.js', import.meta.url), 'utf8');
assert(explorationSource.includes('BattleLogAnimator.play(')
    && travelSource.includes('BattleLogAnimator.play('),
'Exploration and Travel must use realtime battle animation');
assert(secretRealmSource.includes('for (const waveResult of result.waveResults)')
    && secretRealmSource.includes('BattleLogAnimator.play('),
'Every completed Secret Realm wave must use realtime battle animation');
assert(explorationSource.includes("name: '🎁 Thu thập được'")
    && travelSource.includes("name: '🎁 Thu thập được'")
    && secretRealmSource.includes("name: '🎁 Thu thập được'"),
'Every victorious PvE flow must append collected rewards to its final battle embed');
assert(explorationSource.includes('embeds: [battleLogEmbed]')
    && !explorationSource.includes('DiscordEmbedFactory'),
'Exploration final response must contain only the battle result embed');

console.log(JSON.stringify({
    status: 'PASS',
    checks: {
        hpDisplayFirst: true,
        hpRemovedFromCombatText: true,
        rollingLogMaximum: 5,
        realtimeFrames: edits.length,
        realtimeExploration: true,
        realtimeTravel: true,
        realtimeEverySecretRealmWave: true,
        victoryRewardSummary: true,
        singleExplorationResultEmbed: true,
        controlEffectFeedback: true,
        criticalHitFeedback: true,
        effectTickFeedback: true,
        roundLimitDrawXianxiaMessage: true,
        explorationDrawMessageOverride: true
    }
}, null, 2));
