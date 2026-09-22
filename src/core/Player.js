import fs from 'fs';
import CultivationArt from '../items/CultivationArt.js';
import Equipment from '../items/Equipment.js';
import ItemFactory from '../managers/ItemFactory.js';
import EffectResolver from './EffectResolver.js';
import StatCalculator from './StatCalculator.js';

// Tải dữ liệu cảnh giới từ file JSON
const realmsData = JSON.parse(fs.readFileSync('./src/data/realms.json', 'utf-8'));
const cultivationArtsData = JSON.parse(fs.readFileSync('./src/data/cultivationArts.json', 'utf-8'));
const effectDefinitions = JSON.parse(fs.readFileSync('./src/data/effects.json', 'utf-8'));
const realmIds = Object.keys(realmsData)
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id))
    .sort((a, b) => a - b);
const defaultRealmId = realmIds[0] || 1;
const maxRealmId = realmIds[realmIds.length - 1] || defaultRealmId;

export default class Player {
    constructor(dbData) {
        this.id = dbData.id;
        this.name = dbData.name;
        this.spiritualRoot = dbData.spiritual_root;
        
        this.realmId = this.normalizeRealmId(dbData.realm_id);
        this.cultivationArtId = dbData.cultivation_art_id || 'cp_001';
        this.cultivation = Number(dbData.cultivation) || 0;
        this.spiritStones = Number(dbData.spirit_stones) || 0;

        this.baseAtk = dbData.base_atk || 10;
        this.baseDef = dbData.base_def || 10;
        this.baseHp = dbData.base_hp || 100;
        this.baseSpd = dbData.base_spd || 10;
        
        // Thời gian cập nhật lần cuối (Parse từ SQL Timestamp ra Object Date của Javascript)
        this.lastCultivate = new Date(dbData.last_cultivate);
        
        // Tự động map thông tin cảnh giới
        this.realmInfo = realmsData[this.realmId];
        this.cultivationArt = this.createCultivationArt();
        this.equipments = this.createEquipments(dbData.equipments);
        this.passiveSkills = dbData.passive_skills || [];
        this.activeBuffs = dbData.active_buffs || [];
        this.effects = EffectResolver.getAllEffects(this);
        this.cultivationSpeed = this.calculateCultivationSpeed();
    }

    normalizeRealmId(realmId) {
        const parsedRealmId = Number(realmId);

        if (!Number.isInteger(parsedRealmId)) {
            return defaultRealmId;
        }

        if (realmsData[parsedRealmId]) {
            return parsedRealmId;
        }

        if (parsedRealmId > maxRealmId) {
            return maxRealmId;
        }

        return defaultRealmId;
    }

    getMaxRealmId() {
        return maxRealmId;
    }

    isAtMaxRealm() {
        return this.realmId >= maxRealmId;
    }

    getNextRealmInfo() {
        if (this.isAtMaxRealm()) {
            return null;
        }

        return realmsData[this.realmId + 1] || null;
    }

    createCultivationArt() {
        const cultivationArtData = cultivationArtsData[this.cultivationArtId] || cultivationArtsData.cp_001;
        const itemTemplate = {
            id: cultivationArtData.itemId,
            name: cultivationArtData.name,
            type: 'CULTIVATION_ART',
            rarity: cultivationArtData.rarity,
            description: cultivationArtData.description,
            artId: cultivationArtData.id,
            cultivation_speed_multiplier: cultivationArtData.cultivation_speed_multiplier,
            effects: cultivationArtData.effects || []
        };

        return new CultivationArt(itemTemplate, { cultivationArtId: cultivationArtData.id });
    }

    createEquipments(equipmentData = []) {
        if (!Array.isArray(equipmentData)) {
            return [];
        }

        return equipmentData.map((equipment) => {
            if (equipment instanceof Equipment) return equipment;

            return ItemFactory.createItem(equipment.item_id || equipment.itemId, equipment);
        }).filter(Boolean);
    }

    calculateRealmCultivationMultiplier() {
        let multiplier = 1;

        for (let realmIndex = 2; realmIndex <= this.realmId; realmIndex += 1) {
            const realm = realmsData[realmIndex];
            if (!realm) continue;

            if (realm.breakthrough_type === 'MAJOR') {
                multiplier *= 1.5;
                continue;
            }

            if (realm.breakthrough_type === 'MINOR') {
                multiplier *= 1.1;
            }
        }

        return multiplier;
    }

    calculateCultivationSpeed() {
        const baseSpeed = 1;
        return StatCalculator.calculate(baseSpeed, this.effects, 'cultivation_speed');
    }

    getFinalStat(stat) {
        const baseStats = {
            atk: this.baseAtk,
            def: this.baseDef,
            hp: this.baseHp,
            spd: this.baseSpd,
            crit_rate: 0,
            crit_damage: 1.5,
            cultivation_speed: 1
        };

        const baseValue = baseStats[stat] ?? effectDefinitions[stat]?.base_value ?? 0;
        return StatCalculator.calculate(baseValue, this.effects, stat);
    }

    /**
     * Hàm tính toán Tu vi nhận được trong thời gian AFK
     * @returns {Object} { earned: số_tu_vi_nhận_được, minutes: số_phút_afk }
     */
  calculateOfflineCultivation() {
        const now = new Date();
        
        // Trừ 2 Object Date sẽ ra số mili-giây (milliseconds) chênh lệch
        const diffMs = now - this.lastCultivate; 
        
        // Đổi mili-giây ra số giây (1 giây = 1000 ms)
        const diffSeconds = Math.floor(diffMs / 1000);

        if (diffSeconds > 0) {
            // Tu vi nhận = Số giây x tốc độ tu luyện thực tế
            const earnedCul = Number((diffSeconds * this.cultivationSpeed).toFixed(2));
            
            // Cộng vào bản thân và cập nhật mốc thời gian mới
            this.cultivation += earnedCul;
            this.lastCultivate = now;

            return { earned: earnedCul, seconds: diffSeconds };
        }

        return { earned: 0, seconds: 0 };
    }
    // Tiện ích: Lấy phần trăm tiến độ đột phá
    getCultivationProgress() {
        const percent = (this.cultivation / this.realmInfo.req_cul) * 100;
        return Math.min(percent, 100).toFixed(1); // Tối đa 100% và lấy 1 chữ số thập phân
    }
}
