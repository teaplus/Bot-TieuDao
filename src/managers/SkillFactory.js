import fs from 'fs';
import Skill from '../core/Skill.js';

const skills = JSON.parse(fs.readFileSync('./src/data/skills.json', 'utf-8'));

export default class SkillFactory {
    static getData(skillId) {
        return skills[skillId] || null;
    }

    static create(skillId) {
        const data = this.getData(skillId);
        return data ? new Skill(data) : null;
    }

    static getAll() {
        return Object.values(skills);
    }
}
