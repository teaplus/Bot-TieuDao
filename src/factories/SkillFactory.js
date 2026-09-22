import Skill from '../core/Skill.js';
import ItemGameDataResolver from '../runtime/resolvers/ItemGameDataResolver.js';

function getItemGameDataResolver() {
    return new ItemGameDataResolver();
}

export default class SkillFactory {
    static getData(skillId) {
        return getItemGameDataResolver().getSkillData(skillId);
    }

    static create(skillId) {
        const data = this.getData(skillId);
        return data ? new Skill(data) : null;
    }

    static getAll() {
        const skills = getItemGameDataResolver().gameDataManager.getCollection('skills') || {};
        return Object.values(skills);
    }
}

