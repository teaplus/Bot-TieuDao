import Consumable from '../items/Consumable.js';
import CultivationArt from '../items/CultivationArt.js';
import Equipment from '../items/Equipment.js';
import Material from '../items/Material.js';
import SkillBook from '../items/SkillBook.js';
import ItemGameDataResolver from '../runtime/resolvers/ItemGameDataResolver.js';
import ItemGenerator from './ItemGenerator.js';

function getItemGameDataResolver() {
    return new ItemGameDataResolver();
}

export default class ItemFactory {
    static getTemplate(itemId) {
        return getItemGameDataResolver().getItemTemplate(itemId);
    }

    static generateEquipment(itemId, rarity) {
        const template = this.getTemplate(itemId);
        if (!template) return null;
        return new Equipment(template, ItemGenerator.rollEquipment(template, rarity));
    }

    static createItem(itemId, instanceData = {}) {
        const template = this.getTemplate(itemId);
        if (!template) return null;

        switch (template.type) {
            case 'CONSUMABLE': return new Consumable(template, instanceData);
            case 'EQUIPMENT': return new Equipment(template, instanceData);
            case 'MATERIAL':
            case 'CURRENCY': return new Material(template, instanceData);
            case 'CULTIVATION_ART': return new CultivationArt(template, instanceData);
            case 'SKILL_BOOK': return new SkillBook(template, instanceData);
            default: throw new Error(`Loai vat pham khong hop le: ${template.type}`);
        }
    }
}

