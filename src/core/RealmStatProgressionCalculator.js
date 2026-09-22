import { normalizeIntegerAmount } from '../shared/numeric/IntegerAmount.js';

const STAT_ATTRIBUTE_MAP = Object.freeze({ hp: 'HP', atk: 'ATK', def: 'DEF', spd: 'SPD' });

function parsePositiveInteger(value, errorCode) {
    const parsed = BigInt(normalizeIntegerAmount(value));
    if (parsed <= 0n) throw new Error(errorCode);
    return parsed;
}

function applyFactor(value, factor) {
    const numerator = parsePositiveInteger(factor?.numerator, 'REALM_STAT_FACTOR_NUMERATOR_INVALID');
    const denominator = parsePositiveInteger(factor?.denominator, 'REALM_STAT_FACTOR_DENOMINATOR_INVALID');
    return (value * numerator) / denominator;
}

export default class RealmStatProgressionCalculator {
    constructor(realms, progressionRules) {
        this.realms = [...(realms || [])].sort((left, right) => left.order - right.order);
        this.rules = progressionRules?.battleStatProgression;
        if (!this.realms.length || !this.rules) throw new Error('REALM_STAT_PROGRESSION_DATA_REQUIRED');
        if (this.rules.rounding !== 'FLOOR_EACH_TRANSITION'
            || this.rules.startingBaseSource !== 'FIRST_REALM_STAGE_ONE_INITIAL'
            || this.rules.laterRealmInitialPolicy !== 'DERIVED_IGNORE_AUTHORED_INITIAL') {
            throw new Error('REALM_STAT_PROGRESSION_POLICY_UNSUPPORTED');
        }
    }

    calculate(targetRealmId, targetStage) {
        const targetRealmIndex = this.realms.findIndex(
            (realm) => Number(realm.id) === Number(targetRealmId)
        );
        if (targetRealmIndex < 0) throw new Error('REALM_STAT_TARGET_NOT_FOUND');
        const targetRealm = this.realms[targetRealmIndex];
        const normalizedStage = Math.max(1, Math.min(
            Math.floor(Number(targetStage) || 1), Number(targetRealm.max_stage || 1)
        ));
        const stats = Object.fromEntries(Object.entries(STAT_ATTRIBUTE_MAP).map(
            ([stat, attributeId]) => [
                stat,
                parsePositiveInteger(
                    this.realms[0].attributes?.[attributeId]?.initial,
                    `REALM_STAT_START_${attributeId}_INVALID`
                )
            ]
        ));

        for (let realmIndex = 0; realmIndex <= targetRealmIndex; realmIndex += 1) {
            const realm = this.realms[realmIndex];
            const finalStage = realmIndex === targetRealmIndex
                ? normalizedStage
                : Number(realm.max_stage);
            const minorFactor = this.rules.minorOverrides?.[realm.code] || this.rules.minorDefault;
            for (let stage = 2; stage <= finalStage; stage += 1) {
                for (const stat of Object.keys(stats)) stats[stat] = applyFactor(stats[stat], minorFactor);
            }
            if (realmIndex < targetRealmIndex) {
                const nextRealm = this.realms[realmIndex + 1];
                const majorFactor = this.rules.majorOverrides?.[`${realm.code}->${nextRealm.code}`]
                    || this.rules.majorDefault;
                for (const stat of Object.keys(stats)) stats[stat] = applyFactor(stats[stat], majorFactor);
            }
        }

        return Object.freeze(Object.fromEntries(Object.entries(stats).map(
            ([stat, value]) => [stat, value.toString()]
        )));
    }
}
