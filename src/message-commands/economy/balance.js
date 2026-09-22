import BaseMessageCommand from '../../core/BaseMessageCommand.js';
import { formatIntegerAmount } from '../../shared/numeric/IntegerAmount.js';

export default class BalanceMessageCommand extends BaseMessageCommand {
    constructor() {
        super({ name: 'balance', description: 'Xem số Linh Thạch hiện có.' });
    }

    errorMessage(error) {
        return ({
            BALANCE_COMMAND_INVALID: 'Cách dùng: `!balance`.'
        })[error?.message] || 'Chưa thể kiểm tra túi Linh Thạch, xin đạo hữu thử lại sau.';
    }

    async execute(message, client, args = []) {
        if (args.length) throw new Error('BALANCE_COMMAND_INVALID');
        if (!client.playerAccountService) throw new Error('PLAYER_ACCOUNT_SERVICE_REQUIRED');

        const result = await client.playerAccountService.getSpiritStoneBalance(message.author.id);
        return message.reply({
            content: `💎 Bạn đang có **${formatIntegerAmount(result.balance)} Linh Thạch**.`,
            allowedMentions: { repliedUser: false }
        });
    }
}
