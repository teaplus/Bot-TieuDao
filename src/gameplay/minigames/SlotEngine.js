import createSeededRandom from '../../platform/random/createSeededRandom.js';
import { normalizeIntegerAmount } from '../../shared/numeric/IntegerAmount.js';

const BASIS_POINTS = 10000n;

function pickWeightedSymbol(symbols, random) {
    const totalWeight = symbols.reduce((total, symbol) => total + Number(symbol.weight), 0);
    let threshold = random() * totalWeight;
    for (const symbol of symbols) {
        threshold -= Number(symbol.weight);
        if (threshold < 0) return symbol;
    }
    return symbols.at(-1);
}

export function calculateSlotRtpPartsPerMillion(paytable) {
    const symbols = paytable?.symbols || [];
    const totalWeight = symbols.reduce((total, symbol) => total + BigInt(symbol.weight), 0n);
    const reelCount = BigInt(paytable?.reelCount || 0);
    if (reelCount !== 3n || totalWeight <= 0n) throw new Error('SLOT_PAYTABLE_INVALID');

    const numerator = symbols.reduce((total, symbol) => (
        total
        + (BigInt(symbol.weight) ** reelCount)
        * BigInt(symbol.payoutMultiplierBasisPoints)
        * 1000000n
    ), 0n);
    const denominator = (totalWeight ** reelCount) * BASIS_POINTS;
    return Number(numerator / denominator);
}

export default class SlotEngine {
    play(payload) {
        const symbols = payload?.paytable?.symbols || [];
        if (payload?.paytable?.reelCount !== 3
            || payload?.paytable?.requiredMatchCount !== 3
            || symbols.length === 0) {
            throw new Error('SLOT_PAYTABLE_INVALID');
        }

        const wager = BigInt(normalizeIntegerAmount(payload.wager));
        if (wager <= 0n) throw new Error('MINIGAME_WAGER_MUST_BE_POSITIVE');
        const random = createSeededRandom(payload.seed);
        const reels = Array.from({ length: 3 }, () => pickWeightedSymbol(symbols, random));
        const isWin = reels.every((symbol) => symbol.id === reels[0].id);
        const multiplierBasisPoints = isWin
            ? BigInt(reels[0].payoutMultiplierBasisPoints)
            : 0n;
        const payout = (wager * multiplierBasisPoints) / BASIS_POINTS;

        return Object.freeze({
            reels: Object.freeze(reels.map((symbol) => Object.freeze({
                id: symbol.id,
                label: symbol.label,
                icon: symbol.icon
            }))),
            isWin,
            matchedSymbolId: isWin ? reels[0].id : null,
            multiplierBasisPoints: multiplierBasisPoints.toString(),
            payout: payout.toString(),
            netDelta: (payout - wager).toString()
        });
    }
}
