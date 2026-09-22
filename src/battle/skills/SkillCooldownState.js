function normalizeCooldownTurns(value) {
    const turns = Number(value || 0);
    if (!Number.isSafeInteger(turns) || turns < 0) {
        throw new Error('INVALID_SKILL_COOLDOWN_TURNS');
    }
    return turns;
}

export default class SkillCooldownState {
    constructor(initialState = {}) {
        this.remainingBySkillId = new Map();
        for (const [skillId, remainingTurns] of Object.entries(initialState || {})) {
            this.start(skillId, remainingTurns);
        }
    }

    getRemainingTurns(skillId) {
        return this.remainingBySkillId.get(String(skillId)) || 0;
    }

    isReady(skillId) {
        return this.getRemainingTurns(skillId) === 0;
    }

    start(skillId, cooldownTurns) {
        const id = String(skillId || '').trim();
        if (!id) throw new Error('SKILL_ID_REQUIRED');
        const turns = normalizeCooldownTurns(cooldownTurns);
        if (turns === 0) {
            this.remainingBySkillId.delete(id);
            return Object.freeze({ skillId: id, remainingTurns: 0 });
        }
        this.remainingBySkillId.set(id, turns);
        return Object.freeze({ skillId: id, remainingTurns: turns });
    }

    tick(options = {}) {
        const excluded = new Set((options.excludeSkillIds || []).map(String));
        const transitions = [];
        for (const [skillId, before] of this.remainingBySkillId.entries()) {
            if (excluded.has(skillId)) continue;
            const after = Math.max(0, before - 1);
            if (after === 0) this.remainingBySkillId.delete(skillId);
            else this.remainingBySkillId.set(skillId, after);
            transitions.push(Object.freeze({
                skillId,
                before,
                after,
                ready: after === 0
            }));
        }
        return Object.freeze(transitions);
    }

    snapshot() {
        return Object.freeze(Object.fromEntries(
            [...this.remainingBySkillId.entries()]
                .sort(([left], [right]) => left.localeCompare(right))
        ));
    }
}
