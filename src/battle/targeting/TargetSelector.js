import { compareBattleFixed } from '../numeric/BattleFixed.js';

export default class TargetSelector {

    constructor(options = {}) {
        this.random = options.random || Math.random;
    }

    select(context, actor, strategy = "ENEMY_SINGLE") {

        const normalizedStrategy = String(strategy || "ENEMY_SINGLE").toUpperCase();
        const candidates = this.getCandidates(context, actor, normalizedStrategy);

        if (candidates.length === 0) {
            return [];
        }

        switch (normalizedStrategy) {

            case "SELF":
            case "CASTER":
            case "OWNER":
                return [actor];

            // ---------- ALLY ----------

            case "ALLY":
            case "ALLY_SINGLE":
                return [candidates[0]];

            case "ALLY_ALL":
                return candidates;

            case "ALLY_RANDOM":
                return [
                    candidates[this.randomInteger(0, candidates.length - 1)]
                ];

            case "ALLY_LOWEST_HP":
                return [
                    this.sortBy(candidates, entity => entity.currentHP)[0]
                ];

            case "ALLY_HIGHEST_ATTACK":
            case "ALLY_HIGHEST_ATK":
                return [
                    this.sortBy(candidates, entity => entity.battleStat.atk, true)[0]
                ];

            // ---------- ENEMY ----------

            case "ENEMY":
            case "ENEMY_SINGLE":
                return [candidates[0]];

            case "ENEMY_ALL":
                return candidates;

            case "ENEMY_RANDOM":
                return [
                    candidates[this.randomInteger(0, candidates.length - 1)]
                ];

            case "ENEMY_LOWEST_HP":
                return [
                    this.sortBy(candidates, entity => entity.currentHP)[0]
                ];

            case "ENEMY_HIGHEST_ATTACK":
            case "ENEMY_HIGHEST_ATK":
                return [
                    this.sortBy(candidates, entity => entity.battleStat.atk, true)[0]
                ];

            // ---------- Generic ----------

            case "ALL":
                return candidates;

            case "RANDOM":
                return [
                    candidates[this.randomInteger(0, candidates.length - 1)]
                ];

            case "LOW_HP":
            case "LOWEST_HP":
                return [
                    this.sortBy(candidates, entity => entity.currentHP)[0]
                ];

            case "HIGH_HP":
            case "HIGHEST_HP":
                return [
                    this.sortBy(candidates, entity => entity.currentHP, true)[0]
                ];

            case "LOWEST_DEF":
                return [
                    this.sortBy(candidates, entity => entity.battleStat.def)[0]
                ];

            case "HIGHEST_ATK":
                return [
                    this.sortBy(candidates, entity => entity.battleStat.atk, true)[0]
                ];

            default:
                return [candidates[0]];
        }

    }

    getCandidates(context, actor, strategy) {

        if (
            strategy === "SELF"
            || strategy === "CASTER"
            || strategy === "OWNER"
        ) {
            return actor.alive ? [actor] : [];
        }

        if (strategy === "ALL") {
            return context.getAliveEntities();
        }

        if (
            strategy === "DEAD_ALLY"
            || strategy === "DEAD_TEAM"
        ) {
            return (context.teams[actor.team] || [])
                .filter(entity => !entity.alive && entity.id !== actor.id);
        }

        if (
            strategy.startsWith("ALLY")
            || strategy === "ALLY"
        ) {

            const allies = context.getAliveEntities(actor.team);

            return strategy === "ALLY_ALL"
                ? allies
                : allies.filter(entity => entity.id !== actor.id);

        }

        const enemyTeam = context.getOpposingTeam(actor.team);

        return context.getAliveEntities(enemyTeam);

    }

    sortBy(entities, selector, descending = false) {

        return [...entities].sort((left, right) => {

            const diff = compareBattleFixed(selector(left), selector(right)) * (descending ? -1 : 1);

            if (diff !== 0) {
                return diff;
            }

            return left.id.localeCompare(right.id);

        });

    }

    randomInteger(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }

}
