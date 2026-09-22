import BattleMetricsCollector from '../metrics/BattleMetricsCollector.js';

export default class BattleContext {
    constructor(payload = {}) {
        this.battleId = payload.battleId || `battle:${Date.now()}`;
        this.round = Number(payload.round || 1);
        this.turn = Number(payload.turn || 0);
        this.random = payload.random || Math.random;
        this.teams = {
            A: [...(payload.teams?.A || [])],
            B: [...(payload.teams?.B || [])]
        };
        this.combatLog = [...(payload.combatLog || [])];
        this.eventQueue = [...(payload.eventQueue || [])];
        this.triggeredSkills = new Set(payload.triggeredSkills || []);
        this.metrics = payload.metricsCollector || new BattleMetricsCollector(this.getAllEntities());
        this.startedAt = payload.startedAt || new Date();
        this.endedAt = null;
        this.outcomeOverride = payload.outcomeOverride || null;
    }

    getAllEntities() {
        return [...this.teams.A, ...this.teams.B];
    }

    getAliveEntities(team = null) {
        const entities = team ? this.teams[team] || [] : this.getAllEntities();
        return entities.filter((entity) => entity.alive);
    }

    getOpposingTeam(team) {
        return team === 'A' ? 'B' : 'A';
    }

    isTeamDefeated(team) {
        return this.getAliveEntities(team).length === 0;
    }

    getWinningTeam() {
        const teamADefeated = this.isTeamDefeated('A');
        const teamBDefeated = this.isTeamDefeated('B');
        if (teamADefeated && teamBDefeated) {
            return null;
        }
        if (teamADefeated) {
            return 'B';
        }

        if (teamBDefeated) {
            return 'A';
        }

        return null;
    }

    enqueueEvent(event) {
        const battleEvent = {
            ...event,
            round: this.round,
            turn: this.turn
        };
        this.eventQueue.push(battleEvent);
        return battleEvent;
    }

    isBattleResolved() {
        return this.outcomeOverride === 'ABORTED'
            || this.isTeamDefeated('A')
            || this.isTeamDefeated('B');
    }

    abort(reason = null) {
        this.outcomeOverride = 'ABORTED';
        this.enqueueEvent({ type: 'BATTLE_ABORTED', reason });
        this.end();
    }

    getSkillTriggerKey(entityId, skillId) {
        return `${entityId}:${skillId}`;
    }

    hasSkillTriggered(entityId, skillId) {
        return this.triggeredSkills.has(this.getSkillTriggerKey(entityId, skillId));
    }

    markSkillTriggered(entityId, skillId) {
        const key = this.getSkillTriggerKey(entityId, skillId);
        this.triggeredSkills.add(key);
        return key;
    }

    log(message, details = {}) {
        const entry = {
            round: this.round,
            turn: this.turn,
            message,
            details
        };
        this.combatLog.push(entry);
        return entry;
    }

    nextTurn() {
        this.turn += 1;
        return this.turn;
    }

    nextRound() {
        this.round += 1;
        this.turn = 0;
        return this.round;
    }

    end() {
        this.endedAt = new Date();
        return this.endedAt;
    }
}
