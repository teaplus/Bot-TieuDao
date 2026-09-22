import BaseItem from '../core/BaseItem.js';

export default class Material extends BaseItem {
    constructor(template, instanceData = {}) {
        super(template);
        this.quantity = instanceData.quantity || 1; // Số lượng linh thạch, khoáng thạch...
        this.resourceTier = template.resourceTier || null;
        this.resourceFamily = template.family || null;
        this.resourceRole = template.role || null;
        this.sourceMapId = template.mapId || null;
    }

    // Ghi đè hàm hiển thị nếu cần thiết cho Nguyên liệu
    getDisplayString() {
        return `**[${this.rarity}] ${this.name}** (x${this.quantity})\n*${this.description}*`;
    }
}
