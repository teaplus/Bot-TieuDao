export default class EffectResolver {
    static normalizeEffect(effect, source = 'unknown') {
        if (!effect?.stat || !effect?.mode) {
            return null;
        }

        return {
            stat: effect.stat,
            mode: effect.mode,
            value: Number(effect.value) || 0,
            source: effect.source || source
        };
    }

    static aggregateEffects(effects = []) {
        const grouped = new Map();

        for (const effect of effects) {
            const normalized = this.normalizeEffect(effect);
            if (!normalized) continue;

            const key = `${normalized.stat}:${normalized.mode}`;
            if (!grouped.has(key)) {
                grouped.set(key, {
                    stat: normalized.stat,
                    mode: normalized.mode,
                    value: normalized.mode === 'mul_total' ? 1 : 0,
                    sources: []
                });
            }

            const aggregated = grouped.get(key);

            if (normalized.mode === 'mul_total') {
                aggregated.value *= normalized.value;
            } else {
                aggregated.value += normalized.value;
            }

            aggregated.sources.push(normalized.source);
        }

        return Array.from(grouped.values());
    }

    static getAllEffects(player) {
        const rawEffects = [
            ...this.getRealmEffects(player),
            ...this.getCultivationArtEffects(player),
            ...this.getEquipmentEffects(player),
            ...this.getPassiveSkillEffects(player),
            ...this.getBuffEffects(player)
        ];

        return this.aggregateEffects(rawEffects);
    }

    static getRealmEffects(player) {
        const multiplier = player.calculateRealmCultivationMultiplier();

        return [
            {
                stat: 'cultivation_speed',
                mode: 'mul_total',
                value: multiplier,
                source: `realm:${player.realmId}`
            }
        ];
    }

    static getCultivationArtEffects(player) {
        if (!player.cultivationArt?.getEffects) {
            return [];
        }

        return player.cultivationArt.getEffects();
    }

    static getEquipmentEffects(player) {
        if (!Array.isArray(player.equipments)) {
            return [];
        }

        return player.equipments.flatMap((equipment) => {
            if (!equipment?.isEquipped || !equipment.getEffects) {
                return [];
            }

            return equipment.getEffects();
        });
    }

    static getPassiveSkillEffects(player) {
        if (!Array.isArray(player.passiveSkills)) {
            return [];
        }

        return player.passiveSkills.flatMap((skill) => skill?.getEffects ? skill.getEffects() : []);
    }

    static getBuffEffects(player) {
        if (!Array.isArray(player.activeBuffs)) {
            return [];
        }

        return player.activeBuffs.flatMap((buff) => buff?.effects || []);
    }
}
