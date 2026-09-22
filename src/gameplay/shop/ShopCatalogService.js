import crypto from 'node:crypto';
import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import ItemGenerator from '../../factories/ItemGenerator.js';
import createSeededRandom from '../../platform/random/createSeededRandom.js';
import PeriodKeyService from '../../platform/time/PeriodKeyService.js';
import ShopPriceService from './ShopPriceService.js';

function seedFromText(value) {
    const digest = crypto.createHash('sha256').update(String(value)).digest();
    return digest.readUInt32BE(0) % 2147480000 || 1;
}

function pick(entries, random, used = new Set()) {
    const eligible = entries.filter((entry) => !used.has(entry.id));
    if (!eligible.length) throw new Error('SHOP_CATALOG_UNIQUE_POOL_EXHAUSTED');
    const selected = eligible[Math.floor(random() * eligible.length)];
    used.add(selected.id);
    return selected;
}

export default class ShopCatalogService {
    constructor(options = {}) {
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.rules = this.gameDataManager.getCollection('shopRules');
        this.priceService = options.priceService || new ShopPriceService({
            gameDataManager: this.gameDataManager
        });
        const economy = this.gameDataManager.getCollection('economyRules') || {};
        this.periodKeyService = options.periodKeyService || new PeriodKeyService({
            timeZone: economy.timezone
        });
    }

    createMapCatalog(map) {
        const resources = Object.values(this.gameDataManager.getCollection('gatheringResources') || {})
            .filter((resource) => resource.mapId === map.id)
            .sort((left, right) => left.id.localeCompare(right.id));
        const general = this.gameDataManager.getRecord('shopTemplates', 'GENERAL');
        const consumables = (general?.entries || []).map((entry) => ({
            template: this.gameDataManager.getRecord('itemTemplates', entry.itemId),
            legacyEntry: entry
        })).filter(({ template }) => template && template.status !== 'DEPRECATED');
        const entries = [
            ...resources.map((resource) => this.createEntry({
                id: `MAP:${map.id}:${resource.id}`,
                map,
                shopType: 'MAP',
                product: { kind: 'ITEM', templateId: resource.id, quantity: 1 },
                template: resource,
                purchaseLimit: null
            })),
            ...consumables.map(({ template, legacyEntry }) => this.createEntry({
                id: `MAP:${map.id}:${template.id}`,
                map,
                shopType: 'MAP',
                product: { kind: 'ITEM', templateId: template.id, quantity: 1 },
                template,
                purchaseLimit: null
            }))
        ];
        return {
            id: `MAP:${map.id}`,
            type: 'MAP',
            name: `Phường Thị · ${map.name}`,
            mapId: map.id,
            mapName: map.name,
            entries
        };
    }

    createSpecialCatalog(map, now = new Date()) {
        const periodKey = this.periodKeyService.getKey('WEEKLY', now);
        const seed = seedFromText(`${periodKey}:${map.id}:shop-rules-v${this.rules.version}`);
        const random = createSeededRandom(seed);
        const grade = this.resolveHighestContentGrade(map);
        const equipmentGrade = this.resolveHighestEquipmentGrade(map);
        const itemTemplates = Object.values(this.gameDataManager.getCollection('itemTemplates') || {});
        const pools = {
            CULTIVATION_ART_BOOK: itemTemplates.filter((item) => (
                item.type === 'CULTIVATION_ART' && item.rarity === grade && item.id !== 'CP_NEUTRAL_HOANG'
            )),
            SKILL_BOOK: itemTemplates.filter((item) => item.type === 'SKILL_BOOK' && item.rarity === grade),
            EQUIPMENT: itemTemplates.filter((item) => item.type === 'EQUIPMENT')
        };
        const used = new Set();
        const entries = this.rules.specialShop.slotPattern.map((kind, index) => {
            const template = pick(pools[kind], random, used);
            const product = kind === 'EQUIPMENT'
                ? {
                    kind,
                    templateId: template.id,
                    quantity: 1,
                    snapshot: {
                        revision: 1,
                        ...ItemGenerator.rollEquipment(template, 'LEGENDARY', {
                            random,
                            grade: equipmentGrade,
                            gradeQuality: this.rules.specialShop.quality
                        })
                    }
                }
                : {
                    kind,
                    templateId: template.id,
                    quantity: 1,
                    snapshot: kind === 'SKILL_BOOK'
                        ? { skillId: template.skillId }
                        : { artId: template.artId || template.id }
                };
            return this.createEntry({
                id: `SPECIAL:${periodKey}:${map.id}:${index + 1}`,
                map,
                shopType: 'SPECIAL',
                product,
                template,
                purchaseLimit: null
            });
        });
        return {
            id: `SPECIAL:${periodKey}:${map.id}`,
            type: 'SPECIAL',
            name: `Trân Các · Tuần ${periodKey}`,
            mapId: map.id,
            mapName: map.name,
            periodKey,
            seed,
            entries
        };
    }

    createMysteryCatalog(map, seed) {
        const random = createSeededRandom(seed);
        const grade = this.resolveHighestContentGrade(map);
        const equipmentGrade = this.resolveHighestEquipmentGrade(map);
        const itemTemplates = Object.values(this.gameDataManager.getCollection('itemTemplates') || {});
        const generalIds = new Set((this.gameDataManager.getRecord('shopTemplates', 'GENERAL')?.entries || [])
            .map((entry) => entry.itemId));
        const pools = {
            ITEM: itemTemplates.filter((item) => (
                (item.mapId === map.id || generalIds.has(item.id))
                && ['CONSUMABLE', 'MATERIAL'].includes(item.type)
                && item.status !== 'DEPRECATED'
            )),
            CULTIVATION_ART_BOOK: itemTemplates.filter((item) => (
                item.type === 'CULTIVATION_ART' && item.rarity === grade && item.id !== 'CP_NEUTRAL_HOANG'
            )),
            SKILL_BOOK: itemTemplates.filter((item) => item.type === 'SKILL_BOOK' && item.rarity === grade),
            EQUIPMENT: itemTemplates.filter((item) => item.type === 'EQUIPMENT')
        };
        const weights = Object.entries(this.rules.mysteryMerchant.productWeights)
            .map(([kind, weight]) => ({ kind, weight: Number(weight) }));
        const used = new Set();
        const entries = Array.from({ length: this.rules.mysteryMerchant.slotCount }, (_, index) => {
            let cursor = random() * 100;
            const kind = (weights.find((entry) => {
                cursor -= entry.weight;
                return cursor < 0;
            }) || weights.at(-1)).kind;
            const template = pick(pools[kind], random, used);
            const product = kind === 'EQUIPMENT'
                ? {
                    kind, templateId: template.id, quantity: 1,
                    snapshot: {
                        revision: 1,
                        ...ItemGenerator.rollEquipment(template, this.rules.mysteryMerchant.equipmentRarity, {
                            random,
                            grade: equipmentGrade,
                            gradeQuality: this.rules.mysteryMerchant.equipmentQuality
                        })
                    }
                }
                : {
                    kind, templateId: template.id, quantity: 1,
                    snapshot: kind === 'SKILL_BOOK'
                        ? { skillId: template.skillId }
                        : kind === 'CULTIVATION_ART_BOOK'
                            ? { artId: template.artId || template.id }
                            : null
                };
            const entry = this.createEntry({
                id: `MYSTERY:${index + 1}`,
                map,
                shopType: 'MYSTERY',
                product,
                template,
                purchaseLimit: null
            });
            return { ...entry, stock: this.rules.mysteryMerchant.stockPerSlot };
        });
        return {
            id: `MYSTERY:${seed}`,
            type: 'MYSTERY',
            name: 'Thương Nhân Thần Bí',
            mapId: map.id,
            mapName: map.name,
            seed,
            entries
        };
    }

    createEntry({ id, map, shopType, product, template, purchaseLimit }) {
        const price = this.priceService.calculate(map.id, shopType, product, template);
        return {
            id,
            product,
            costs: [{ currencyId: this.rules.currencyId, amount: price }],
            itemId: product.templateId,
            currencyId: this.rules.currencyId,
            price,
            quantity: product.quantity,
            dailyLimit: purchaseLimit?.periodType === 'DAILY' ? purchaseLimit.value : 0,
            purchaseLimit: purchaseLimit || null,
            requiredRealm: map.realmCode
        };
    }

    resolveHighestContentGrade(map) {
        const realms = Object.values(this.gameDataManager.getCollection('realms') || {});
        const mapRealm = realms.find((realm) => realm.code === map.realmCode);
        const arts = Object.values(this.gameDataManager.getCollection('cultivationArts') || {});
        const gradeRows = [...new Map(arts.map((art) => [art.grade, art.requiredRealm])).entries()]
            .map(([grade, realmCode]) => ({
                grade,
                order: realms.find((realm) => realm.code === realmCode)?.order || 0
            }))
            .filter((entry) => entry.order <= mapRealm.order)
            .sort((left, right) => left.order - right.order);
        return gradeRows.at(-1)?.grade || 'HOANG';
    }

    resolveHighestEquipmentGrade(map) {
        const realms = Object.values(this.gameDataManager.getCollection('realms') || {});
        const mapRealm = realms.find((realm) => realm.code === map.realmCode);
        return Object.values(this.gameDataManager.getCollection('equipmentGrades') || {})
            .map((grade) => ({
                grade: grade.grade,
                order: realms.find(
                    (realm) => realm.code === grade.qualities.find((quality) => quality.quality === 'HIGH')?.requiredRealm
                )?.order || 0
            }))
            .filter((entry) => entry.order <= mapRealm.order)
            .sort((left, right) => left.order - right.order)
            .at(-1)?.grade || 'HOANG';
    }
}

export { seedFromText };
