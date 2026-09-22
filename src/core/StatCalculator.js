export default class StatCalculator {
    static calculate(baseValue, effects = [], stat) {
        const relevantEffects = effects.filter((effect) => effect.stat === stat);

        let flatBaseBonus = 0;
        let percentBaseBonus = 0;
        let flatFinalBonus = 0;
        let totalMultiplier = 1;

        for (const effect of relevantEffects) {
            switch (effect.mode) {
                case 'add_flat_base':
                    flatBaseBonus += effect.value;
                    break;
                case 'add_percent_base':
                    percentBaseBonus += effect.value;
                    break;
                case 'add_flat_final':
                    flatFinalBonus += effect.value;
                    break;
                case 'mul_total':
                    totalMultiplier *= effect.value;
                    break;
                default:
                    break;
            }
        }

        const baseStageValue = baseValue + flatBaseBonus + (baseValue * percentBaseBonus);
        const finalValue = (baseStageValue * totalMultiplier) + flatFinalBonus;

        return Number(finalValue.toFixed(2));
    }
}
