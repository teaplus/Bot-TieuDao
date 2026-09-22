import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';
import ComponentSession from '../../application/discord/ComponentSession.js';
import BaseMessageCommand from '../../core/BaseMessageCommand.js';
import { formatIntegerAmount } from '../../shared/numeric/IntegerAmount.js';

const SUIT_ICONS = Object.freeze({
    SPADES: '♠️', CLUBS: '♣️', HEARTS: '♥️', DIAMONDS: '♦️'
});

function cardText(card) {
    return `[ ${SUIT_ICONS[card.suit] || '🃏'} ${card.rank} ]`;
}

function visibleDealerScore(cards) {
    const card = cards?.[0];
    if (!card) return 0;
    if (card.rank === 'A') return 11;
    if (['J', 'Q', 'K'].includes(card.rank)) return 10;
    return Number(card.rank);
}

function outcomeText(result) {
    const key = result.outcome?.result;
    return ({
        PLAYER_BLACKJACK: '✨ **Blackjack — bạn thắng!**',
        PLAYER_WIN: '🎉 **Bạn thắng!**',
        DEALER_BUST: '💥 **Nhà cái quắc — bạn thắng!**',
        PUSH: '🤝 **Hòa — hoàn cược.**',
        PLAYER_BUST: '🌙 **Bạn quắc — nhà cái thắng.**',
        DEALER_BLACKJACK: '🂡 **Nhà cái Blackjack — bạn thua.**',
        DEALER_WIN: '🌙 **Nhà cái thắng.**'
    })[key] || 'Ván bài đã kết thúc.';
}

function renderBoard(result, playerId) {
    const settled = Boolean(result.outcome);
    const dealerCards = settled
        ? result.dealerHand.map(cardText).join(' ')
        : `${cardText(result.dealerHand[0])} [ 🂠 ? ]`;
    const dealerPoints = settled ? result.dealerScore.total : visibleDealerScore(result.dealerHand);
    const playerCards = result.playerHands[0].cards.map(cardText).join(' ');
    const header = settled ? '🃏 **BLACKJACK · KẾT QUẢ**' : '🃏 **BLACKJACK**';
    const lines = [
        header,
        `Cược **${formatIntegerAmount(result.wager)} 💎**`,
        '',
        `**Nhà cái · ${dealerPoints} điểm**`,
        dealerCards,
        `**Bạn · ${result.playerScore.total}${result.playerScore.isSoft ? ' điểm mềm' : ' điểm'}**`,
        playerCards
    ];
    if (settled) {
        lines.push(
            '',
            outcomeText(result),
            `Nhận **${formatIntegerAmount(result.payout)} 💎** · Kết quả **${BigInt(result.netDelta) > 0n ? '+' : ''}${formatIntegerAmount(result.netDelta)} 💎**`
        );
        if (result.status === 'BLACKJACK_EXPIRED_AUTO_STAND') {
            lines.push('⌛ Hết thời gian, hệ thống đã tự Dừng.');
        }
    } else {
        lines.push('', '*Chọn hành động bên dưới.*');
    }
    return lines.join('\n');
}

function buttons(result, disabled = false) {
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`blackjack:${result.roundId}:HIT`)
            .setLabel('Bốc')
            .setEmoji('🃏')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(`blackjack:${result.roundId}:STAND`)
            .setLabel('Dừng')
            .setEmoji('🛑')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(`blackjack:${result.roundId}:DOUBLE`)
            .setLabel('Gấp đôi')
            .setEmoji('💰')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled || !result.canDouble)
    )];
}

export default class BlackjackMessageCommand extends BaseMessageCommand {
    constructor() {
        super({
            name: 'blackjack',
            aliases: ['bj', 'xidach', 'xi-dach'],
            description: 'Tiên Bài Blackjack dùng Bốc, Dừng và Gấp đôi.'
        });
    }

    errorMessage(error) {
        if (String(error?.message).startsWith('INVALID_INTEGER_AMOUNT')) {
            return 'Số tiền cược phải là số nguyên, ví dụ `!blackjack 1000`.';
        }
        return ({
            MINIGAME_WAGER_REQUIRED: 'Hãy nhập số Linh Thạch muốn cược, ví dụ `!blackjack 1000`.',
            MINIGAME_WAGER_MUST_BE_POSITIVE: 'Tiền cược phải lớn hơn 0.',
            MINIGAME_WAGER_BELOW_MINIMUM: `Cược tối thiểu tại **${error?.mapName || 'map hiện tại'}** là **${formatIntegerAmount(error?.minimumWager || 0)} Linh Thạch**.`,
            INSUFFICIENT_CURRENCY: 'Bạn không đủ Linh Thạch cho mức cược này.',
            BLACKJACK_DOUBLE_NOT_ALLOWED: 'Chỉ được Gấp đôi khi đang có đúng hai lá đầu tiên.'
        })[error?.message] || 'Ván bài chưa thể tiếp tục. Hãy thử lại sau.';
    }

    async execute(message, client, args) {
        if (args.length !== 1) throw new Error('MINIGAME_WAGER_REQUIRED');
        if (!client.playerAccountService) throw new Error('PLAYER_ACCOUNT_SERVICE_REQUIRED');
        if (!client.miniGameService) throw new Error('MINIGAME_SERVICE_REQUIRED');
        await client.playerAccountService.ensureGuest(message.author.id);
        let round = await client.miniGameService.startBlackjack(message.author.id, args[0], {
            operationId: `MESSAGE:${message.id}:BLACKJACK_START`
        });
        const sentMessage = await message.reply({
            content: renderBoard(round, message.author.id),
            components: round.outcome ? [] : buttons(round),
            allowedMentions: { repliedUser: false, users: [message.author.id] }
        });
        if (round.outcome) return sentMessage;

        const remainingMs = Math.max(1000, new Date(round.expiresAt).getTime() - Date.now() + 250);
        const session = ComponentSession.forMessage({
            interaction: { user: message.author },
            message: sentMessage,
            prefix: `blackjack:${round.roundId}:`,
            timeoutMs: remainingMs
        });
        await session.run({
            onCollect: async (component) => {
                try {
                    const action = component.customId.split(':').at(-1);
                    round = await client.miniGameService.actBlackjack(
                        message.author.id,
                        round.roundId,
                        action,
                        { operationId: `COMPONENT:${component.id}:BLACKJACK_ACTION` }
                    );
                    await component.update({
                        content: renderBoard(round, message.author.id),
                        components: round.outcome ? [] : buttons(round),
                        allowedMentions: { users: [message.author.id] }
                    });
                    return !round.outcome;
                } catch (error) {
                    await component.reply({
                        content: this.errorMessage(error),
                        ephemeral: true
                    }).catch(() => null);
                    return true;
                }
            },
            onTimeout: async () => {
                const result = await client.miniGameService.expireBlackjack(
                    message.author.id,
                    round.roundId,
                    { operationId: `BLACKJACK:EXPIRE:${round.roundId}` }
                ).catch(() => null);
                if (result?.outcome) {
                    await sentMessage.edit({
                        content: renderBoard(result, message.author.id),
                        components: [],
                        allowedMentions: { users: [message.author.id] }
                    }).catch(() => null);
                } else {
                    await sentMessage.edit({ components: buttons(round, true) }).catch(() => null);
                }
            }
        });
        return sentMessage;
    }
}
