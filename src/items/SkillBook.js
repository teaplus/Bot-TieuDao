import BaseItem from '../core/BaseItem.js';
import SkillFactory from '../managers/SkillFactory.js';

export default class SkillBook extends BaseItem {
    constructor(template, instanceData = {}) {
        super(template);
        this.uuid = instanceData.id;
        this.quantity = instanceData.quantity || 1;
        this.skillId = instanceData.skillId || template.skillId || null;
        this.skill = SkillFactory.create(this.skillId);
    }

    getDisplayString() {
        const type = this.skill?.type === 'PASSIVE' ? 'Bị động' : 'Chủ động';
        return `${super.getDisplayString()}\nLoại: **${type}**`;
    }
}
