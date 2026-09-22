import { formatIntegerAmount, normalizeIntegerAmount } from '../../shared/numeric/IntegerAmount.js';
import { resolveItemResourceEmoji } from './ItemResourceEmojiResolver.js';

export default class RewardTextFormatter {
    static format(rewardResult, gameDataManager, emptyText = 'Không có chiến lợi phẩm.') {
        const rewards = rewardResult?.applied?.rewards || [];
        if (!rewards.length) {
            return emptyText;
        }

        const currencyTotal = rewards
            .filter((reward) => reward.type === 'CURRENCY')
            .reduce((sum, reward) => sum + BigInt(normalizeIntegerAmount(reward.amount || 0)), 0n);
        const itemLines = rewards
            .filter((reward) => reward.type !== 'CURRENCY')
            .map((reward) => this.formatItemReward(reward, gameDataManager));
        const lines = [];

        if (currencyTotal > 0n) {
            lines.push(`- ${resolveItemResourceEmoji({ currencyId: 'SPIRIT_STONE' }, '💎')} Linh thạch x${formatIntegerAmount(currencyTotal)}`);
        }

        return [...lines, ...itemLines].join('\n') || emptyText;
    }

    static formatItemReward(reward, gameDataManager) {
        const template = gameDataManager?.getRecord('itemTemplates', reward.itemId);
        const name = template?.name || reward.itemId;
        const icon = resolveItemResourceEmoji({
            itemId: reward.itemId,
            category: template?.category,
            resourceFamily: template?.resourceFamily || template?.family,
            resourceRole: template?.resourceRole || template?.role
        });
        const quantity = reward.quantity ? ` x${reward.quantity}` : '';
        const inventoryId = reward.inventoryId ? ` (#${reward.inventoryId})` : '';

        return `- ${icon} ${name}${quantity}${inventoryId}`;
    }
}
