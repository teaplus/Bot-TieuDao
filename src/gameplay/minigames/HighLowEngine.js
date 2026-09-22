import createSeededRandom from '../../platform/random/createSeededRandom.js';
import { normalizeIntegerAmount } from '../../shared/numeric/IntegerAmount.js';

const BASIS_POINTS = 10000n;

export default class HighLowEngine {
    deal(payload) {
        const paytable = payload.paytable;
        const minimum = Number(paytable?.minimumNumber);
        const maximum = Number(paytable?.maximumNumber);
        const midpoint = Number(paytable?.midpointNumber);
        if (minimum !== 1 || maximum !== 101 || midpoint !== 51) {
            throw new Error('HIGH_LOW_PAYTABLE_INVALID');
        }
        const random = createSeededRandom(payload.seed);
        return minimum + Math.floor(random() * (maximum - minimum + 1));
    }

    settle(payload) {
        const choice = String(payload.choice || '').toUpperCase();
        if (!['HIGH', 'LOW'].includes(choice)) throw new Error('HIGH_LOW_CHOICE_INVALID');
        const hiddenNumber = this.deal(payload);
        const midpoint = Number(payload.paytable.midpointNumber);
        const isWin = choice === 'HIGH'
            ? hiddenNumber > midpoint
            : hiddenNumber < midpoint;
        const isTie = hiddenNumber === midpoint;
        const wager = BigInt(normalizeIntegerAmount(payload.wager));
        const multiplier = isWin
            ? BigInt(payload.paytable.correctPayoutMultiplierBasisPoints)
            : 0n;
        const payout = (wager * multiplier) / BASIS_POINTS;
        return Object.freeze({
            choice,
            hiddenNumber,
            midpointNumber: midpoint,
            isWin,
            isTie,
            outcome: isWin ? 'WIN' : isTie ? 'TIE_LOSS' : 'LOSS',
            payout: payout.toString(),
            netDelta: (payout - wager).toString()
        });
    }
}
