import fs from 'fs';

const definitions = JSON.parse(fs.readFileSync('./src/data/effects.json', 'utf-8'));

export default class EffectFormatter {
    static format(effect) {
        const definition = definitions[effect.stat] || { name: effect.stat, format: 'number' };
        if (effect.mode === 'mul_total') {
            return `${definition.name}: x${Number(effect.value.toFixed?.(3) ?? effect.value)}`;
        }
        const value = definition.format === 'percent'
            ? `${Number((effect.value * 100).toFixed(2))}%`
            : Number(effect.value).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
        return `${definition.name}: +${value}`;
    }
}
