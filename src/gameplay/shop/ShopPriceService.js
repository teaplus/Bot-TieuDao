import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import { normalizeIntegerAmount } from '../../shared/numeric/IntegerAmount.js';

function multiplyCeilInteger(amount, multiplier) {
    const base = BigInt(normalizeIntegerAmount(amount));
    const raw = String(multiplier);
    if (!/^\d+(?:\.\d+)?$/.test(raw)) throw new Error(`SHOP_MULTIPLIER_INVALID:${raw}`);
    const [whole, fraction = ''] = raw.split('.');
    const denominator = 10n ** BigInt(fraction.length);
    const numerator = BigInt(`${whole}${fraction}`);
    if (numerator <= 0n) throw new Error(`SHOP_MULTIPLIER_INVALID:${raw}`);
    return ((base * numerator + denominator - 1n) / denominator).toString();
}

export default class ShopPriceService {
    constructor(options = {}) {
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.rules = this.gameDataManager.getCollection('shopRules');
    }

    getBasePrice(mapId) {
        const entry = this.rules.pricePolicy.mapBasePrices.find((item) => item.mapId === mapId);
        if (!entry) throw new Error(`SHOP_MAP_PRICE_NOT_FOUND:${mapId}`);
        return normalizeIntegerAmount(entry.amount);
    }

    resolveProductPriceKey(product, template) {
        if (product.kind !== 'ITEM') return product.kind;
        if (template.category === 'TICKET') return 'TICKET';
        if (template.type === 'CONSUMABLE') return 'CONSUMABLE';
        if (template.type === 'MATERIAL') {
            return String(template.resourceRole || template.role || '').toUpperCase() === 'RARE'
                ? 'MATERIAL_RARE'
                : 'MATERIAL_PRIMARY';
        }
        return 'CONSUMABLE';
    }

    calculate(mapId, shopType, product, template) {
        const productKey = this.resolveProductPriceKey(product, template);
        const productMultiplier = this.rules.pricePolicy.productMultipliers[productKey];
        const shopMultiplier = this.rules.pricePolicy.shopMultipliers[shopType];
        if (!productMultiplier) throw new Error(`SHOP_PRODUCT_PRICE_MULTIPLIER_NOT_FOUND:${productKey}`);
        if (!shopMultiplier) throw new Error(`SHOP_TYPE_PRICE_MULTIPLIER_NOT_FOUND:${shopType}`);
        const productPrice = multiplyCeilInteger(this.getBasePrice(mapId), productMultiplier);
        return multiplyCeilInteger(productPrice, shopMultiplier);
    }
}

export { multiplyCeilInteger };
