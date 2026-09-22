import { normalizeNumber } from '../shared/runtimeNormalization.js';

export default class RuntimeSkill {
    constructor(payload) {
        this.templateId = String(payload.templateId);
        this.level = normalizeNumber(payload.level, 1);
        this.quality = payload.quality || null;
        this.lockState = Boolean(payload.lockState);
    }
}

