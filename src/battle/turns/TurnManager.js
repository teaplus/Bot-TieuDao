import { compareBattleFixed } from '../numeric/BattleFixed.js';

export default class TurnManager {
    constructor(options = {}) {
        this.speedTieBreaker = options.speedTieBreaker || ((left, right) => left.id.localeCompare(right.id));
        this.turnOrder = [];
        this.cursor = 0;
        this.round = 1;
    }

    buildTurnOrder(context) {
        this.turnOrder = context.getAliveEntities()
            .sort((left, right) => {
                const speedDiff = compareBattleFixed(right.battleStat.spd, left.battleStat.spd);
                return speedDiff || this.speedTieBreaker(left, right);
            });
        this.cursor = 0;
        this.round = context.round;
        return this.turnOrder;
    }

    getCurrentEntity(context) {
        if (this.shouldRebuild(context)) {
            this.buildTurnOrder(context);
        }

        return this.turnOrder[this.cursor] || null;
    }

    advance(context) {
        if (this.shouldRebuild(context)) {
            this.buildTurnOrder(context);
        }

        const currentEntity = this.getCurrentEntity(context);
        context.nextTurn();

        this.cursor += 1;
        while (this.cursor < this.turnOrder.length && !this.turnOrder[this.cursor].alive) {
            this.cursor += 1;
        }

        if (this.cursor >= this.turnOrder.length) {
            context.nextRound();
            this.buildTurnOrder(context);
        }

        return currentEntity;
    }

    shouldRebuild(context) {
        return this.round !== context.round
            || this.turnOrder.length === 0
            || this.turnOrder.some((entity) => !entity.alive && this.cursor <= this.turnOrder.indexOf(entity));
        return this.round !== context.round || this.turnOrder.length === 0;
    }
}
