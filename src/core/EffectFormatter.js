import { getGameDataManager } from '../foundation/game-data/gameDataContext.js';

const STAT_ATTRIBUTE_IDS = Object.freeze({
    hp: 'HP',
    atk: 'ATK',
    def: 'DEF',
    spd: 'SPD',
    critRate: 'CRIT',
    critDamage: 'CDMG',
    pen: 'PEN',
    skillDamage: 'SKD',
    lifesteal: 'LS',
    shieldPower: 'SHD',
    regen: 'REG',
    controlRate: 'CCR',
    controlResist: 'TEN',
    reflect: 'REF',
    luck: 'LUK',
    finalDamage: 'FINAL_DAMAGE',
    finalDefense: 'FINAL_DEFENSE',
    hitRate: 'HIT_RATE',
    controlImmunity: 'CONTROL_IMMUNITY'
});

function getMetadata(effect) {
    try {
        const manager = getGameDataManager();
        const effectDefinition = manager.getRecord('effects', effect.modifierId)
            || manager.getRecord('effects', effect.effectId)
            || manager.getRecord('effects', effect.stat);
        const modifierDefinition = effect.modifierId
            ? manager.getRecord('modifiers', effect.modifierId)
            : null;
        const attributeId = effect.attributeId
            || effectDefinition?.attributeId
            || STAT_ATTRIBUTE_IDS[effect.stat];
        const attribute = attributeId
            ? manager.getRecord('attributes', attributeId)
            : null;
        const modifierName = modifierDefinition?.name
            && modifierDefinition.name !== modifierDefinition.id
            ? modifierDefinition.name
            : null;
        return {
            name: modifierName
                || attribute?.displayName
                || effectDefinition?.name
                || effect.stat,
            attributeIsPercent: String(attribute?.format || '').toUpperCase() === 'PERCENT',
            definitionIsPercent: effectDefinition?.format === 'percent'
        };
    } catch {
        return {
            name: effect.stat,
            attributeIsPercent: false,
            definitionIsPercent: false
        };
    }
}

function formatNumber(value, maximumFractionDigits = 2) {
    return Number(value).toLocaleString('vi-VN', { maximumFractionDigits });
}

function withSign(value, suffix = '') {
    const numeric = Number(value);
    const sign = numeric > 0 ? '+' : '';
    return `${sign}${formatNumber(numeric)}${suffix}`;
}

export default class EffectFormatter {
    static format(effect) {
        const metadata = getMetadata(effect);
        const numericValue = Number(effect.value ?? effect.normalizedValue ?? 0);

        if (effect.mode === 'mul_total') {
            const percentChange = (numericValue - 1) * 100;
            return `${metadata.name}: ${withSign(percentChange, '%')} tổng`;
        }

        if (effect.mode === 'add_percent_base') {
            return `${metadata.name}: ${withSign(numericValue * 100, '%')}`;
        }

        if (effect.mode === 'set') {
            const suffix = metadata.attributeIsPercent || metadata.definitionIsPercent ? '%' : '';
            return `${metadata.name}: =${formatNumber(numericValue)}${suffix}`;
        }

        const suffix = metadata.attributeIsPercent || metadata.definitionIsPercent ? '%' : '';
        return `${metadata.name}: ${withSign(numericValue, suffix)}`;
    }
}
