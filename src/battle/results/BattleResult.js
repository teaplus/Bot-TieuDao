function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
    return value;
}

export default class BattleResult {
    constructor(payload) {
        this.battleId = payload.battleId;
        this.winnerTeam = payload.winnerTeam || null;
        this.loserTeam = payload.loserTeam || null;
        this.outcome = payload.outcome;
        this.isDraw = Boolean(payload.isDraw);
        this.drawReason = payload.drawReason || null;
        this.rounds = Number(payload.rounds || 0);
        this.turns = Number(payload.turns || 0);
        this.durationMs = Number(payload.durationMs || 0);
        this.combatLog = Object.freeze([...(payload.combatLog || [])]);
        this.events = Object.freeze([...(payload.events || [])]);
        this.entities = Object.freeze([...(payload.entities || [])]);
        this.survivors = deepFreeze(structuredClone(payload.survivors || []));
        this.statistics = deepFreeze(structuredClone(payload.statistics || { battle: {}, entities: [] }));
    }

    static fromContext(context) {
        const endedAt = context.endedAt || new Date();

        const winnerTeam = context.getWinningTeam();
        const roundLimitEvent = context.eventQueue
            .find((event) => event.type === 'BATTLE_ROUND_LIMIT_REACHED');
        const drawReason = roundLimitEvent ? 'ROUND_LIMIT' : null;
        const outcome = context.outcomeOverride === 'ABORTED'
            ? 'ABORTED'
            : winnerTeam === 'A'
                ? 'TEAM_A_WIN'
                : winnerTeam === 'B'
                    ? 'TEAM_B_WIN'
                    : 'DRAW';
        const loserTeam = winnerTeam ? context.getOpposingTeam(winnerTeam) : null;
        const reportedRounds = roundLimitEvent
            ? Number(roundLimitEvent.maxRounds)
            : context.round;
        const statistics = context.metrics.snapshot({ rounds: reportedRounds });
        const entities = context.getAllEntities().map((entity) => ({
            id: entity.id,
            name: entity.name,
            team: entity.team,
            sourceType: entity.sourceType,
            sourceId: entity.sourceId,
            maxHP: entity.battleStat.hp,
            currentHP: entity.currentHP,
            currentShield: entity.currentShield,
            skillCooldowns: entity.skillCooldowns?.snapshot?.() || {},
            alive: entity.alive
        }));

        return new BattleResult({
            battleId: context.battleId,
            winnerTeam,
            loserTeam,
            outcome,
            isDraw: outcome === 'DRAW',
            drawReason,
            rounds: reportedRounds,
            turns: statistics.battle.totalTurns,
            durationMs: endedAt.getTime() - context.startedAt.getTime(),
            combatLog: context.combatLog,
            events: context.eventQueue,
            entities,
            survivors: entities.filter((entity) => entity.alive).map((entity) => ({
                id: entity.id,
                team: entity.team,
                currentHP: entity.currentHP,
                maxHP: entity.maxHP
            })),
            statistics
        });
    }
}
