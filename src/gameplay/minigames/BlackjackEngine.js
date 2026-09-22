import createSeededRandom from '../../platform/random/createSeededRandom.js';
import { normalizeIntegerAmount } from '../../shared/numeric/IntegerAmount.js';

const SUITS = Object.freeze(['SPADES', 'CLUBS', 'HEARTS', 'DIAMONDS']);
const RANKS = Object.freeze(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']);
const BASIS_POINTS = 10000n;

function cloneState(state) {
    return JSON.parse(JSON.stringify(state));
}

function immutableState(state) {
    return Object.freeze({
        ...state,
        deck: Object.freeze(state.deck.map((card) => Object.freeze({ ...card }))),
        dealerHand: Object.freeze(state.dealerHand.map((card) => Object.freeze({ ...card }))),
        playerHands: Object.freeze(state.playerHands.map((hand) => Object.freeze({
            ...hand,
            cards: Object.freeze(hand.cards.map((card) => Object.freeze({ ...card })))
        }))),
        actions: Object.freeze(state.actions.map((action) => Object.freeze({ ...action }))),
        outcome: state.outcome ? Object.freeze({ ...state.outcome }) : null
    });
}

export default class BlackjackEngine {
    requireRules(rules) {
        if (rules?.deckCount !== 1
            || rules?.dealerPolicy !== 'STAND_ALL_17'
            || rules?.naturalPayoutMultiplierBasisPoints !== 20000
            || rules?.winPayoutMultiplierBasisPoints !== 20000
            || rules?.pushPayoutMultiplierBasisPoints !== 10000
            || rules?.doublePolicy !== 'INITIAL_TWO_CARDS_ONE_DRAW_AUTO_STAND'
            || rules?.splitPolicy !== 'DISABLED') {
            throw new Error('BLACKJACK_RULES_INVALID');
        }
        return rules;
    }

    createDeck(seed) {
        const random = createSeededRandom(seed);
        const deck = [];
        for (const suit of SUITS) {
            for (const rank of RANKS) deck.push({ id: `${suit}:${rank}`, suit, rank });
        }
        for (let index = deck.length - 1; index > 0; index -= 1) {
            const target = Math.floor(random() * (index + 1));
            [deck[index], deck[target]] = [deck[target], deck[index]];
        }
        return deck;
    }

    scoreHand(cards) {
        let total = 0;
        let aces = 0;
        for (const card of cards || []) {
            if (card.rank === 'A') {
                total += 11;
                aces += 1;
            } else if (['J', 'Q', 'K'].includes(card.rank)) {
                total += 10;
            } else {
                const value = Number(card.rank);
                if (!Number.isInteger(value) || value < 2 || value > 10) {
                    throw new Error('BLACKJACK_CARD_INVALID');
                }
                total += value;
            }
        }
        let adjustedAces = 0;
        while (total > 21 && aces > 0) {
            total -= 10;
            aces -= 1;
            adjustedAces += 1;
        }
        return Object.freeze({
            total,
            isSoft: aces > 0,
            isBust: total > 21,
            isBlackjack: (cards || []).length === 2 && total === 21,
            adjustedAces
        });
    }

    draw(state, hand) {
        if (state.nextCardIndex >= state.deck.length) throw new Error('BLACKJACK_DECK_EXHAUSTED');
        hand.push(state.deck[state.nextCardIndex]);
        state.nextCardIndex += 1;
    }

    calculatePayout(wagerInput, multiplierBasisPoints) {
        const wager = BigInt(normalizeIntegerAmount(wagerInput));
        const numerator = wager * BigInt(multiplierBasisPoints);
        if (numerator % BASIS_POINTS !== 0n) {
            throw new Error('BLACKJACK_FRACTIONAL_PAYOUT_UNRESOLVED');
        }
        return (numerator / BASIS_POINTS).toString();
    }

    settle(state, outcome, rules) {
        const multiplier = outcome === 'PLAYER_BLACKJACK'
            ? rules.naturalPayoutMultiplierBasisPoints
            : outcome === 'PLAYER_WIN' || outcome === 'DEALER_BUST'
                ? rules.winPayoutMultiplierBasisPoints
                : outcome === 'PUSH'
                    ? rules.pushPayoutMultiplierBasisPoints
                    : 0;
        const payout = this.calculatePayout(state.totalWager, multiplier);
        state.status = 'SETTLED';
        state.outcome = {
            result: outcome,
            payout,
            netDelta: (BigInt(payout) - BigInt(state.totalWager)).toString(),
            playerScore: this.scoreHand(state.playerHands[0].cards),
            dealerScore: this.scoreHand(state.dealerHand)
        };
        return state;
    }

    settleAgainstDealer(state, rules) {
        const playerScore = this.scoreHand(state.playerHands[0].cards);
        if (playerScore.isBust) return this.settle(state, 'PLAYER_BUST', rules);
        let dealerScore = this.scoreHand(state.dealerHand);
        while (dealerScore.total < 17) {
            this.draw(state, state.dealerHand);
            dealerScore = this.scoreHand(state.dealerHand);
        }
        if (dealerScore.isBust) return this.settle(state, 'DEALER_BUST', rules);
        if (playerScore.total > dealerScore.total) return this.settle(state, 'PLAYER_WIN', rules);
        if (playerScore.total < dealerScore.total) return this.settle(state, 'DEALER_WIN', rules);
        return this.settle(state, 'PUSH', rules);
    }

    start(payload) {
        const rules = this.requireRules(payload.rules);
        const wager = normalizeIntegerAmount(payload.wager);
        if (BigInt(wager) <= 0n) throw new Error('MINIGAME_WAGER_MUST_BE_POSITIVE');
        const state = {
            status: 'ACTIVE',
            deck: this.createDeck(payload.seed),
            nextCardIndex: 0,
            dealerHand: [],
            playerHands: [{ cards: [], wager }],
            activeHandIndex: 0,
            baseWager: wager,
            totalWager: wager,
            actions: [],
            outcome: null
        };
        this.draw(state, state.playerHands[0].cards);
        this.draw(state, state.dealerHand);
        this.draw(state, state.playerHands[0].cards);
        this.draw(state, state.dealerHand);

        const playerScore = this.scoreHand(state.playerHands[0].cards);
        const dealerScore = this.scoreHand(state.dealerHand);
        if (playerScore.isBlackjack && dealerScore.isBlackjack) this.settle(state, 'PUSH', rules);
        else if (playerScore.isBlackjack) this.settle(state, 'PLAYER_BLACKJACK', rules);
        else if (dealerScore.isBlackjack) this.settle(state, 'DEALER_BLACKJACK', rules);
        return immutableState(state);
    }

    applyAction(inputState, actionInput, rulesInput) {
        const rules = this.requireRules(rulesInput);
        const action = String(actionInput || '').toUpperCase();
        if (!['HIT', 'STAND', 'DOUBLE'].includes(action)) throw new Error('BLACKJACK_ACTION_INVALID');
        if (inputState?.status !== 'ACTIVE') throw new Error('MINIGAME_ROUND_NOT_ACTIVE');
        const state = cloneState(inputState);
        const hand = state.playerHands[0];

        if (action === 'DOUBLE') {
            if (hand.cards.length !== 2 || state.actions.length !== 0) {
                throw new Error('BLACKJACK_DOUBLE_NOT_ALLOWED');
            }
            state.totalWager = (BigInt(state.totalWager) + BigInt(state.baseWager)).toString();
            hand.wager = state.totalWager;
            this.draw(state, hand.cards);
            state.actions.push({ action: 'DOUBLE', cardId: hand.cards.at(-1).id });
            return immutableState(this.settleAgainstDealer(state, rules));
        }

        if (action === 'HIT') {
            this.draw(state, hand.cards);
            state.actions.push({ action: 'HIT', cardId: hand.cards.at(-1).id });
            const score = this.scoreHand(hand.cards);
            if (score.isBust) this.settle(state, 'PLAYER_BUST', rules);
            else if (score.total === 21) this.settleAgainstDealer(state, rules);
            return immutableState(state);
        }

        state.actions.push({ action: 'STAND' });
        return immutableState(this.settleAgainstDealer(state, rules));
    }
}
