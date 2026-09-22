export default class SkillLoadoutPolicy {
    constructor(options = {}) {
        this.gameDataManager = options.gameDataManager;
        this.rules = this.gameDataManager.getCollection('skillRules')?.playerLoadout;
    }

    getCapacity(realmId) {
        const realm = this.gameDataManager.requireRecord('realms', realmId);
        const milestones = this.rules.capacityMilestones
            .map((entry) => ({
                ...entry,
                realm: Object.values(this.gameDataManager.getCollection('realms'))
                    .find((candidate) => candidate.code === entry.realmCode)
            }))
            .filter((entry) => entry.realm.order <= realm.order)
            .sort((left, right) => left.realm.order - right.realm.order);
        return milestones.at(-1).capacity;
    }

    validate(skillIds, learnedSkillIds, realmId) {
        const uniqueIds = [...new Set((skillIds || []).map(String))];
        if (uniqueIds.length !== (skillIds || []).length) {
            throw new Error('SKILL_LOADOUT_DUPLICATE');
        }
        const capacity = this.getCapacity(realmId);
        if (uniqueIds.length > capacity) throw new Error('SKILL_LOADOUT_CAPACITY_EXCEEDED');

        const learned = new Set(learnedSkillIds);
        const skills = uniqueIds.map((skillId) => {
            if (!learned.has(skillId)) throw new Error('SKILL_NOT_LEARNED');
            return this.gameDataManager.requireRecord('skills', skillId);
        });
        const activeCount = skills.filter((skill) => skill.type === 'ACTIVE').length;
        if (activeCount > this.rules.maxActiveSkills) {
            throw new Error('SKILL_LOADOUT_ACTIVE_LIMIT_EXCEEDED');
        }

        return Object.freeze({
            skillIds: Object.freeze(uniqueIds),
            capacity,
            maxActiveSkills: this.rules.maxActiveSkills,
            activeCount,
            passiveCount: skills.length - activeCount,
            revision: this.rules.revision
        });
    }
}
