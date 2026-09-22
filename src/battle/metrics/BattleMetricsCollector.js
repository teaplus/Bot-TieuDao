const AMOUNT_FIELDS = Object.freeze([
    'damageDealt',
    'damageTaken',
    'healingDone',
    'healingReceived',
    'shieldGranted',
    'shieldAbsorbed'
]);

const COUNTER_FIELDS = Object.freeze([
    'kills',
    'deaths',
    'criticalHits',
    'actionsTaken',
    'actionsSkipped',
    'effectsApplied'
]);

function createEntityMetrics(entity) {
    return {
        entityId: entity.id,
        teamId: entity.team,
        ...Object.fromEntries(AMOUNT_FIELDS.map((field) => [field, 0n])),
        ...Object.fromEntries(COUNTER_FIELDS.map((field) => [field, 0]))
    };
}

function toSafeAmount(value) {
    const amount = BigInt(floorBattleFixed(value || 0));
    return amount < 0n ? 0n : amount;
}

export default class BattleMetricsCollector {
    constructor(entities = []) {
        this.entityMetrics = new Map(entities.map((entity) => [entity.id, createEntityMetrics(entity)]));
        this.totalTurns = 0;
    }

    getEntityMetrics(entity) {
        const entityId = entity?.id || entity;
        const metrics = this.entityMetrics.get(entityId);
        if (!metrics) {
            throw new Error(`BATTLE_METRICS_ENTITY_NOT_FOUND:${entityId}`);
        }
        return metrics;
    }

    addAmount(entity, field, value) {
        const metrics = this.getEntityMetrics(entity);
        metrics[field] += toSafeAmount(value);
    }

    increment(entity, field) {
        const metrics = this.getEntityMetrics(entity);
        metrics[field] += 1;
    }

    recordTurn() {
        this.totalTurns += 1;
    }

    recordDamage(source, target, applied = {}, details = {}) {
        this.addAmount(source, 'damageDealt', applied.hpDamage);
        this.addAmount(target, 'damageTaken', applied.hpDamage);
        this.addAmount(target, 'shieldAbsorbed', applied.shieldDamage);
        if (details.critical) {
            this.increment(source, 'criticalHits');
        }
        if (applied.defeated) {
            const targetMetrics = this.getEntityMetrics(target);
            if (targetMetrics.deaths === 0) {
                targetMetrics.deaths += 1;
                if (source?.id && source.id !== target.id) {
                    this.increment(source, 'kills');
                }
            }
        }
    }

    recordHealing(source, target, applied = {}) {
        this.addAmount(source, 'healingDone', applied.actualHealing);
        this.addAmount(target, 'healingReceived', applied.actualHealing);
    }

    recordShieldGranted(source, applied = {}) {
        this.addAmount(source, 'shieldGranted', applied.shield);
    }

    recordActionTaken(entity) {
        this.increment(entity, 'actionsTaken');
    }

    recordActionSkipped(entity) {
        this.increment(entity, 'actionsSkipped');
    }

    recordEffectApplied(source) {
        this.increment(source, 'effectsApplied');
    }

    snapshot(options = {}) {
        const entities = [...this.entityMetrics.values()].map((metrics) => ({
            entityId: metrics.entityId,
            teamId: metrics.teamId,
            ...Object.fromEntries(AMOUNT_FIELDS.map((field) => [field, metrics[field].toString()])),
            ...Object.fromEntries(COUNTER_FIELDS.map((field) => [field, metrics[field]]))
        }));
        const sumAmount = (field) => entities.reduce(
            (total, metrics) => total + BigInt(metrics[field]),
            0n
        ).toString();
        return {
            battle: {
                totalDamage: sumAmount('damageDealt'),
                totalHealing: sumAmount('healingDone'),
                totalShieldAbsorbed: sumAmount('shieldAbsorbed'),
                totalActions: entities.reduce((total, metrics) => total + metrics.actionsTaken, 0),
                totalTurns: this.totalTurns,
                totalRounds: Number(options.rounds || 0)
            },
            entities
        };
    }
}
import { floorBattleFixed } from '../numeric/BattleFixed.js';
