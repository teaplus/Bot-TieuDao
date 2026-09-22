import BaseItem from '../core/BaseItem.js';

export default class Consumable extends BaseItem {
    constructor(template, instanceData = {}) {
        super(template);
        this.quantity = instanceData.quantity || 1; // Số lượng sở hữu
    }

    // Logic khi người chơi sử dụng đan dược
    use(player) {
        if (this.id === "2001") { // Bổ Huyết Đan
            player.hp = Math.min(player.maxHp, player.hp + 500);
            return `Bạn đã nuốt ${this.name}, hồi phục 500 HP!`;
        }
        return `Vật phẩm này không thể sử dụng trực tiếp.`;
    }
}