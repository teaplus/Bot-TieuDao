import fs from 'fs';
import Consumable from '../items/Consumable.js';
import CultivationArt from '../items/CultivationArt.js';
import Equipment from '../items/Equipment.js';
import Material from '../items/Material.js';
import SkillBook from '../items/SkillBook.js';
import ItemGenerator from './ItemGenerator.js';

const templates = JSON.parse(fs.readFileSync('./src/data/itemTemplates.json', 'utf-8'));

export default class ItemFactory {
    static getTemplate(itemId) {
        return templates[itemId] || null;
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
            default: throw new Error(`Loại vật phẩm không hợp lệ: ${template.type}`);
        }
    }
}
