import { normalizeDate, normalizeNumber } from '../shared/runtimeNormalization.js';

export default class RuntimeItem {
    constructor(payload) {
        this.runtimeId = String(payload.runtimeId);
        this.templateId = String(payload.templateId);
        this.quantity = normalizeNumber(payload.quantity, 1);
        this.lockState = Boolean(payload.lockState);
        this.createTime = normalizeDate(payload.createTime);
        this.instanceData = Object.freeze({ ...(payload.instanceData || {}) });
    }
}

