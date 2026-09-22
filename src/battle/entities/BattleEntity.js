import { BATTLE_STAT_DEFINITIONS } from '../stats/BattleStatPolicy.js';
import BattleStatCalculator from '../stats/BattleStatCalculator.js';
import {
    addBattleFixed,
    compareBattleFixed,
    maxBattleFixed,
    minBattleFixed,
    normalizeBattleFixed,
    subtractBattleFixed,
    serializeBattleInteger
} from '../numeric/BattleFixed.js';
import SkillCooldownState from '../skills/SkillCooldownState.js';

export default class BattleEntity {
    constructor(payload) {
        this.id = String(payload.id);
        this.name = payload.name || this.id;
        this.team = payload.team;
        this.sourceType = payload.sourceType || 'UNKNOWN';
        this.sourceId = payload.sourceId || this.id;
        this.baseBattleStat = Object.freeze({
            ...Object.fromEntries(Object.entries(BATTLE_STAT_DEFINITIONS).map(([statKey, definition]) => (
                [statKey, normalizeBattleFixed(payload.battleStat?.[statKey] ?? definition.fallback)]
            )))
        });
        this.modifiers = [...(payload.modifiers || [])];
        this.currentHP = normalizeBattleFixed(payload.currentHP ?? this.battleStat.hp);
        this.currentShield = normalizeBattleFixed(payload.currentShield || 0);
        this.effects = [...(payload.effects || [])];
        this.nextRuntimeSequence = Math.max(
            0,
            ...this.modifiers.map((modifier) => Number(modifier.runtimeSequence || 0)),
            ...this.effects.map((effect) => Number(effect.runtimeSequence || 0))
        );
        this.skills = Object.freeze([...(payload.skills || [])]);
        this.skillCooldowns = payload.skillCooldowns instanceof SkillCooldownState
            ? payload.skillCooldowns
            : new SkillCooldownState(payload.skillCooldowns || {});
        this.metadata = Object.freeze({ ...(payload.metadata || {}) });
    }

    get battleStat() {
        const calculatedStat = { ...this.baseBattleStat };

        for (const modifier of this.modifiers) {
            this.applyModifierToStat(calculatedStat, modifier);
        }

        calculatedStat.hp = serializeBattleInteger(calculatedStat.hp, 1);
        calculatedStat.atk = serializeBattleInteger(calculatedStat.atk, 1);
        calculatedStat.def = serializeBattleInteger(calculatedStat.def, 0);
        calculatedStat.spd = serializeBattleInteger(calculatedStat.spd, 1);

        return Object.freeze(calculatedStat);
    }

    get alive() {
        return compareBattleFixed(this.currentHP, 0) > 0;
    }

    receiveDamage(amount) {
        const incomingDamage = maxBattleFixed(0, amount);
        const shieldDamage = minBattleFixed(this.currentShield, incomingDamage);
        this.currentShield = subtractBattleFixed(this.currentShield, shieldDamage);
        const hpDamage = minBattleFixed(this.currentHP, subtractBattleFixed(incomingDamage, shieldDamage));
        this.currentHP = maxBattleFixed(0, subtractBattleFixed(this.currentHP, hpDamage));

        return {
            incomingDamage,
            shieldDamage,
            hpDamage,
            remainingHP: this.currentHP,
            remainingShield: this.currentShield,
            defeated: !this.alive
        };
    }

    heal(amount) {
        const healing = maxBattleFixed(0, amount);
        const beforeHP = this.currentHP;
        this.currentHP = minBattleFixed(this.battleStat.hp, addBattleFixed(this.currentHP, healing));

        return {
            healing,
            actualHealing: subtractBattleFixed(this.currentHP, beforeHP),
            remainingHP: this.currentHP
        };
    }

    addShield(amount) {
        const shield = maxBattleFixed(0, amount);
        this.currentShield = addBattleFixed(this.currentShield, shield);

        return {
            shield,
            remainingShield: this.currentShield
        };
    }

    addEffect(effect) {
        if (!effect) {
            return null;
        }

        const runtimeEffect = {
            ...effect,
            runtimeSequence: effect.runtimeSequence || ++this.nextRuntimeSequence
        };
        this.effects.push(runtimeEffect);
        return runtimeEffect;
    }

    addModifier(modifier) {
        if (!modifier) {
            return null;
        }

        const runtimeModifier = {
            ...modifier,
            runtimeId: modifier.runtimeId || `${modifier.id}:${this.modifiers.length + 1}`,
            runtimeSequence: modifier.runtimeSequence || ++this.nextRuntimeSequence
        };
        this.modifiers.push(runtimeModifier);
        return runtimeModifier;
    }

    removeModifier(modifierId) {
        const beforeCount = this.modifiers.length;
        this.modifiers = this.modifiers.filter((modifier) => modifier.id !== modifierId && modifier.modifierId !== modifierId);
        return beforeCount - this.modifiers.length;
    }

    removeModifierInstance(runtimeId) {
        const beforeCount = this.modifiers.length;
        this.modifiers = this.modifiers.filter(
            (modifier) => modifier.runtimeId !== runtimeId
        );
        return beforeCount - this.modifiers.length;
    }

    expireTimedModifiers() {
        const expired = [];
        this.modifiers = this.modifiers.filter((modifier) => {
            if (modifier.remainingTurns == null) return true;
            modifier.remainingTurns -= 1;
            if (modifier.remainingTurns > 0) return true;
            expired.push(modifier);
            return false;
        });
        return expired;
    }

    removeEffect(effectId) {
        const beforeCount = this.effects.length;
        this.effects = this.effects.filter((effect) => effect.id !== effectId);
        return beforeCount - this.effects.length;
    }

    applyModifierToStat(stat, modifier) {
        const statKey = modifier.stat || this.attributeToStatKey(modifier.attributeId || modifier.attribute);
        if (!statKey || stat[statKey] == null) {
            return;
        }

        stat[statKey] = BattleStatCalculator.applyRuntimeModifier(stat[statKey], modifier);
    }

    attributeToStatKey(attribute) {
        const elemental = String(attribute || '').match(
            /^ELEMENT_(METAL|WOOD|WATER|FIRE|EARTH|ICE|LIGHTNING|WIND)_(DAMAGE|RESIST)$/
        );
        if (elemental) {
            return `${elemental[1].toLowerCase()}${elemental[2] === 'DAMAGE' ? 'Damage' : 'Resist'}`;
        }
        const map = {
            HP: 'hp',
            ATK: 'atk',
            DEF: 'def',
            SPD: 'spd',
            CRIT: 'critRate',
            CDMG: 'critDamage',
            PEN: 'pen',
            SKD: 'skillDamage',
            LS: 'lifesteal',
            SHD: 'shieldPower',
            REG: 'regen',
            CCR: 'controlRate',
            TEN: 'controlResist',
            REF: 'reflect',
            FINAL_DAMAGE: 'finalDamage',
            FINAL_DEFENSE: 'finalDefense',
            HIT_RATE: 'hitRate',
            CONTROL_IMMUNITY: 'controlImmunity',
            LUK: 'luck'
        };

        return map[attribute] || String(attribute || '').toLowerCase();
    }
}
