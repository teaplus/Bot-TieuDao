import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import IdempotentOperationExecutor from '../../platform/idempotency/IdempotentOperationExecutor.js';
import { createRequestHash } from '../../platform/idempotency/createRequestHash.js';
import SecureSeedProvider from '../../platform/random/SecureSeedProvider.js';
import SystemTimeProvider from '../../platform/time/SystemTimeProvider.js';
import MiniGameRoundRepository from '../../repositories/MiniGameRoundRepository.js';
import PlayerWalletRepository from '../../repositories/PlayerWalletRepository.js';
import ResourceLedgerRepository from '../../repositories/ResourceLedgerRepository.js';
import {
    compareIntegerAmounts,
    normalizeIntegerAmount
} from '../../shared/numeric/IntegerAmount.js';
import SlotEngine from './SlotEngine.js';
import HighLowEngine from './HighLowEngine.js';
import BlackjackEngine from './BlackjackEngine.js';

const BASIS_POINTS = 10000n;
const MAX_NUMERIC_30 = (10n ** 30n) - 1n;

function multiplyBasisPoints(amount, basisPoints) {
    return ((BigInt(normalizeIntegerAmount(amount)) * BigInt(basisPoints)) / BASIS_POINTS).toString();
}

export default class MiniGameService {
    constructor(options = {}) {
        this.playerRuntimeRepository = options.playerRuntimeRepository;
        this.playerMapService = options.playerMapService;
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.operationExecutor = options.operationExecutor || new IdempotentOperationExecutor(options);
        this.walletRepository = options.walletRepository || new PlayerWalletRepository();
        this.resourceLedgerRepository = options.resourceLedgerRepository || new ResourceLedgerRepository();
        this.roundRepository = options.roundRepository || new MiniGameRoundRepository();
        this.slotEngine = options.slotEngine || new SlotEngine();
        this.highLowEngine = options.highLowEngine || new HighLowEngine();
        this.blackjackEngine = options.blackjackEngine || new BlackjackEngine();
        this.seedProvider = options.seedProvider || new SecureSeedProvider();
        this.timeProvider = options.timeProvider || new SystemTimeProvider();
    }

    getRules() {
        return this.gameDataManager.getCollection('miniGameRules');
    }

    requireActiveGame(gameId) {
        const game = this.getRules()?.games?.[gameId];
        if (!game) throw new Error('MINIGAME_NOT_FOUND');
        if (game.status !== 'ACTIVE') throw new Error(`MINIGAME_NOT_ACTIVE:${game.blockedBy || gameId}`);
        return game;
    }

    resolveMapBasePrice(mapId) {
        const entry = this.gameDataManager.getCollection('shopRules')
            ?.pricePolicy?.mapBasePrices?.find((candidate) => candidate.mapId === mapId);
        if (!entry) throw new Error('ECONOMY_MAP_BASE_PRICE_NOT_FOUND');
        return normalizeIntegerAmount(entry.amount);
    }

    async loadContext(client, playerId) {
        const runtimePlayer = await this.playerRuntimeRepository?.findById(playerId, {
            client,
            forUpdate: true,
            includeGuest: true
        });
        if (!runtimePlayer) throw new Error('PLAYER_NOT_FOUND');
        if (!this.playerMapService) throw new Error('PLAYER_MAP_SERVICE_REQUIRED');
        const location = await this.playerMapService.resolveCurrentMap(client, runtimePlayer);
        return {
            map: location.map,
            mapBasePrice: this.resolveMapBasePrice(location.map.id)
        };
    }

    async playSlot(playerId, wagerInput, options = {}) {
        if (!options.operationId) throw new Error('MINIGAME_OPERATION_ID_REQUIRED');
        const wager = normalizeIntegerAmount(wagerInput);
        if (compareIntegerAmounts(wager, 0) <= 0) {
            throw new Error('MINIGAME_WAGER_MUST_BE_POSITIVE');
        }

        const rules = this.getRules();
        const game = this.requireActiveGame('SLOT');
        const settledAt = options.settledAt || this.timeProvider.now();
        return this.operationExecutor.execute({
            operationId: options.operationId,
            playerId,
            operationType: 'MINIGAME_SLOT_PLAY',
            requestHash: createRequestHash({
                operationType: 'MINIGAME_SLOT_PLAY',
                playerId,
                wager,
                rulesRevision: rules.revision
            })
        }, async (client) => {
            const context = await this.loadContext(client, playerId);
            const minimumWager = multiplyBasisPoints(
                context.mapBasePrice,
                rules.betPolicy.minimumMultiplierBasisPoints
            );
            if (compareIntegerAmounts(wager, minimumWager) < 0) {
                const error = new Error('MINIGAME_WAGER_BELOW_MINIMUM');
                error.minimumWager = minimumWager;
                error.mapName = context.map.name;
                throw error;
            }

            const balanceBefore = await this.walletRepository.getBalance(
                client, playerId, rules.currencyId, true
            );
            if (compareIntegerAmounts(wager, balanceBefore) > 0) {
                const error = new Error('INSUFFICIENT_CURRENCY');
                error.balance = balanceBefore;
                throw error;
            }

            const seed = options.seed ?? this.seedProvider.nextSeed();
            const outcome = this.slotEngine.play({
                paytable: game.paytable,
                wager,
                seed
            });
            const finalBalanceValue = BigInt(balanceBefore) + BigInt(outcome.netDelta);
            if (BigInt(outcome.payout) > MAX_NUMERIC_30 || finalBalanceValue > MAX_NUMERIC_30) {
                throw new Error('MINIGAME_NUMERIC_LIMIT_EXCEEDED');
            }

            const balanceAfterDebit = await this.walletRepository.debit(client, {
                playerId,
                currencyId: rules.currencyId,
                amount: wager
            });
            const round = await this.roundRepository.recordSettledRound(client, {
                playerId,
                gameId: game.id,
                rulesRevision: rules.revision,
                operationId: options.operationId,
                wager,
                payout: outcome.payout,
                netDelta: outcome.netDelta,
                inputSnapshot: {
                    mapId: context.map.id,
                    minimumWager,
                    currencyId: rules.currencyId
                },
                outcomeSnapshot: outcome,
                rngSnapshot: { algorithm: 'PARK_MILLER_16807', seed },
                settledAt
            });

            await this.resourceLedgerRepository.record(client, {
                playerId,
                resourceType: 'CURRENCY',
                resourceId: rules.currencyId,
                delta: `-${wager}`,
                balanceAfter: balanceAfterDebit,
                reason: 'MINIGAME_SLOT_WAGER',
                referenceType: 'MINIGAME_ROUND',
                referenceId: round.roundId,
                operationId: options.operationId,
                createdAt: settledAt
            });

            let balance = balanceAfterDebit;
            if (compareIntegerAmounts(outcome.payout, 0) > 0) {
                balance = await this.walletRepository.credit(client, {
                    playerId,
                    currencyId: rules.currencyId,
                    amount: outcome.payout
                });
                await this.resourceLedgerRepository.record(client, {
                    playerId,
                    resourceType: 'CURRENCY',
                    resourceId: rules.currencyId,
                    delta: outcome.payout,
                    balanceAfter: balance,
                    reason: 'MINIGAME_SLOT_PAYOUT',
                    referenceType: 'MINIGAME_ROUND',
                    referenceId: round.roundId,
                    operationId: options.operationId,
                    createdAt: settledAt
                });
            }

            return {
                status: outcome.isWin ? 'SLOT_WIN' : 'SLOT_LOSS',
                roundId: round.roundId,
                mapId: context.map.id,
                mapName: context.map.name,
                currencyId: rules.currencyId,
                minimumWager,
                wager,
                payout: outcome.payout,
                netDelta: outcome.netDelta,
                balance,
                reels: outcome.reels,
                matchedSymbolId: outcome.matchedSymbolId,
                multiplierBasisPoints: outcome.multiplierBasisPoints,
                settledAt: round.settledAt
            };
        });
    }

    async refundHighLowRound(client, round, rules, settledAt, operationId) {
        const expiredRound = await this.roundRepository.expireRound(client, {
            roundId: round.roundId,
            playerId: round.playerId,
            outcomeSnapshot: { outcome: 'EXPIRED_REFUND', refundAmount: round.wager },
            settledAt
        });
        const balance = await this.walletRepository.credit(client, {
            playerId: round.playerId,
            currencyId: rules.currencyId,
            amount: round.wager
        });
        await this.resourceLedgerRepository.record(client, {
            playerId: round.playerId,
            resourceType: 'CURRENCY',
            resourceId: rules.currencyId,
            delta: round.wager,
            balanceAfter: balance,
            reason: 'MINIGAME_HIGH_LOW_EXPIRED_REFUND',
            referenceType: 'MINIGAME_ROUND',
            referenceId: round.roundId,
            operationId,
            createdAt: settledAt
        });
        return { round: expiredRound, balance };
    }

    async startHighLow(playerId, wagerInput, options = {}) {
        if (!options.operationId) throw new Error('MINIGAME_OPERATION_ID_REQUIRED');
        const wager = normalizeIntegerAmount(wagerInput);
        if (compareIntegerAmounts(wager, 0) <= 0) {
            throw new Error('MINIGAME_WAGER_MUST_BE_POSITIVE');
        }
        const rules = this.getRules();
        const game = this.requireActiveGame('HIGH_LOW');
        const startedAt = options.startedAt || this.timeProvider.now();
        return this.operationExecutor.execute({
            operationId: options.operationId,
            playerId,
            operationType: 'MINIGAME_HIGH_LOW_START',
            requestHash: createRequestHash({
                operationType: 'MINIGAME_HIGH_LOW_START', playerId, wager,
                rulesRevision: rules.revision
            })
        }, async (client) => {
            const context = await this.loadContext(client, playerId);
            const activeRound = await this.roundRepository.findActiveRound(
                client, playerId, game.id, { forUpdate: true }
            );
            if (activeRound && new Date(activeRound.expiresAt).getTime() > startedAt.getTime()) {
                const balance = await this.walletRepository.getBalance(
                    client, playerId, rules.currencyId, true
                );
                return {
                    status: 'HIGH_LOW_ACTIVE_RESTORED',
                    roundId: activeRound.roundId,
                    mapId: activeRound.inputSnapshot.mapId,
                    mapName: activeRound.inputSnapshot.mapName,
                    wager: activeRound.wager,
                    balance,
                    midpointNumber: activeRound.inputSnapshot.paytable.midpointNumber,
                    expiresAt: activeRound.expiresAt
                };
            }

            let refundedRound = null;
            if (activeRound) {
                refundedRound = await this.refundHighLowRound(
                    client, activeRound, rules, startedAt, options.operationId
                );
            }

            const minimumWager = multiplyBasisPoints(
                context.mapBasePrice,
                rules.betPolicy.minimumMultiplierBasisPoints
            );
            if (compareIntegerAmounts(wager, minimumWager) < 0) {
                const error = new Error('MINIGAME_WAGER_BELOW_MINIMUM');
                error.minimumWager = minimumWager;
                error.mapName = context.map.name;
                throw error;
            }
            const balanceBefore = await this.walletRepository.getBalance(
                client, playerId, rules.currencyId, true
            );
            if (compareIntegerAmounts(wager, balanceBefore) > 0) {
                const error = new Error('INSUFFICIENT_CURRENCY');
                error.balance = balanceBefore;
                throw error;
            }
            if (BigInt(balanceBefore) + BigInt(wager) > MAX_NUMERIC_30) {
                throw new Error('MINIGAME_NUMERIC_LIMIT_EXCEEDED');
            }

            const seed = options.seed ?? this.seedProvider.nextSeed();
            const expiresAt = new Date(
                startedAt.getTime() + game.sessionPolicy.ttlSeconds * 1000
            );
            const balance = await this.walletRepository.debit(client, {
                playerId, currencyId: rules.currencyId, amount: wager
            });
            const round = await this.roundRepository.recordActiveRound(client, {
                playerId,
                gameId: game.id,
                rulesRevision: rules.revision,
                operationId: options.operationId,
                wager,
                netDelta: `-${wager}`,
                inputSnapshot: {
                    mapId: context.map.id,
                    mapName: context.map.name,
                    currencyId: rules.currencyId,
                    minimumWager,
                    paytable: game.paytable
                },
                rngSnapshot: { algorithm: 'PARK_MILLER_16807', seed },
                startedAt,
                expiresAt
            });
            await this.resourceLedgerRepository.record(client, {
                playerId,
                resourceType: 'CURRENCY',
                resourceId: rules.currencyId,
                delta: `-${wager}`,
                balanceAfter: balance,
                reason: 'MINIGAME_HIGH_LOW_WAGER',
                referenceType: 'MINIGAME_ROUND',
                referenceId: round.roundId,
                operationId: options.operationId,
                createdAt: startedAt
            });
            return {
                status: 'HIGH_LOW_STARTED',
                roundId: round.roundId,
                mapId: context.map.id,
                mapName: context.map.name,
                wager,
                balance,
                midpointNumber: game.paytable.midpointNumber,
                expiresAt: round.expiresAt,
                refundedExpiredRoundId: refundedRound?.round.roundId || null
            };
        });
    }

    async chooseHighLow(playerId, roundId, choice, options = {}) {
        if (!options.operationId) throw new Error('MINIGAME_OPERATION_ID_REQUIRED');
        const normalizedChoice = String(choice || '').toUpperCase();
        if (!['HIGH', 'LOW'].includes(normalizedChoice)) throw new Error('HIGH_LOW_CHOICE_INVALID');
        const rules = this.getRules();
        const settledAt = options.settledAt || this.timeProvider.now();
        return this.operationExecutor.execute({
            operationId: options.operationId,
            playerId,
            operationType: 'MINIGAME_HIGH_LOW_CHOOSE',
            requestHash: createRequestHash({
                operationType: 'MINIGAME_HIGH_LOW_CHOOSE', playerId,
                roundId: String(roundId), choice: normalizedChoice
            })
        }, async (client) => {
            const round = await this.roundRepository.findPlayerRound(
                client, playerId, roundId, { forUpdate: true }
            );
            if (!round) throw new Error('MINIGAME_ROUND_NOT_FOUND');
            if (round.gameId !== 'HIGH_LOW') throw new Error('MINIGAME_ROUND_GAME_MISMATCH');
            if (round.status !== 'ACTIVE') throw new Error('MINIGAME_ROUND_NOT_ACTIVE');
            if (new Date(round.expiresAt).getTime() <= settledAt.getTime()) {
                const refunded = await this.refundHighLowRound(
                    client, round, rules, settledAt, options.operationId
                );
                return {
                    status: 'HIGH_LOW_EXPIRED_REFUNDED',
                    roundId: round.roundId,
                    wager: round.wager,
                    payout: round.wager,
                    netDelta: '0',
                    balance: refunded.balance,
                    settledAt
                };
            }

            const outcome = this.highLowEngine.settle({
                paytable: round.inputSnapshot.paytable,
                wager: round.wager,
                seed: round.rngSnapshot.seed,
                choice: normalizedChoice
            });
            const settledRound = await this.roundRepository.settleRound(client, {
                roundId: round.roundId,
                playerId,
                payout: outcome.payout,
                netDelta: outcome.netDelta,
                outcomeSnapshot: outcome,
                settledAt
            });
            let balance = await this.walletRepository.getBalance(
                client, playerId, rules.currencyId, true
            );
            if (compareIntegerAmounts(outcome.payout, 0) > 0) {
                balance = await this.walletRepository.credit(client, {
                    playerId, currencyId: rules.currencyId, amount: outcome.payout
                });
                await this.resourceLedgerRepository.record(client, {
                    playerId,
                    resourceType: 'CURRENCY',
                    resourceId: rules.currencyId,
                    delta: outcome.payout,
                    balanceAfter: balance,
                    reason: 'MINIGAME_HIGH_LOW_PAYOUT',
                    referenceType: 'MINIGAME_ROUND',
                    referenceId: round.roundId,
                    operationId: options.operationId,
                    createdAt: settledAt
                });
            }
            return {
                status: outcome.isWin ? 'HIGH_LOW_WIN' : 'HIGH_LOW_LOSS',
                roundId: round.roundId,
                mapName: round.inputSnapshot.mapName,
                wager: round.wager,
                payout: outcome.payout,
                netDelta: outcome.netDelta,
                balance,
                choice: outcome.choice,
                hiddenNumber: outcome.hiddenNumber,
                midpointNumber: outcome.midpointNumber,
                isTie: outcome.isTie,
                settledAt: settledRound.settledAt
            };
        });
    }

    async expireHighLow(playerId, roundId, options = {}) {
        if (!options.operationId) throw new Error('MINIGAME_OPERATION_ID_REQUIRED');
        const rules = this.getRules();
        const settledAt = options.settledAt || this.timeProvider.now();
        return this.operationExecutor.execute({
            operationId: options.operationId,
            playerId,
            operationType: 'MINIGAME_HIGH_LOW_EXPIRE',
            requestHash: createRequestHash({
                operationType: 'MINIGAME_HIGH_LOW_EXPIRE', playerId, roundId: String(roundId)
            })
        }, async (client) => {
            const round = await this.roundRepository.findPlayerRound(
                client, playerId, roundId, { forUpdate: true }
            );
            if (!round) throw new Error('MINIGAME_ROUND_NOT_FOUND');
            if (round.status !== 'ACTIVE') {
                return { status: 'HIGH_LOW_ALREADY_CLOSED', roundId: round.roundId };
            }
            if (new Date(round.expiresAt).getTime() > settledAt.getTime()) {
                const error = new Error('HIGH_LOW_NOT_EXPIRED');
                error.expiresAt = round.expiresAt;
                throw error;
            }
            const refunded = await this.refundHighLowRound(
                client, round, rules, settledAt, options.operationId
            );
            return {
                status: 'HIGH_LOW_EXPIRED_REFUNDED',
                roundId: round.roundId,
                wager: round.wager,
                payout: round.wager,
                netDelta: '0',
                balance: refunded.balance,
                settledAt
            };
        });
    }

    createBlackjackResult(round, state, balance, status, extra = {}) {
        return {
            status,
            roundId: round.roundId,
            mapId: round.inputSnapshot.mapId,
            mapName: round.inputSnapshot.mapName,
            wager: state.totalWager,
            baseWager: state.baseWager,
            payout: state.outcome?.payout || '0',
            netDelta: state.outcome?.netDelta || `-${state.totalWager}`,
            balance,
            dealerHand: state.dealerHand,
            playerHands: state.playerHands,
            playerScore: this.blackjackEngine.scoreHand(state.playerHands[0].cards),
            dealerScore: this.blackjackEngine.scoreHand(state.dealerHand),
            actionCount: state.actions.length,
            canDouble: state.status === 'ACTIVE'
                && state.playerHands[0].cards.length === 2
                && state.actions.length === 0
                && compareIntegerAmounts(balance, state.baseWager) >= 0,
            outcome: state.outcome,
            expiresAt: round.expiresAt,
            settledAt: round.settledAt,
            ...extra
        };
    }

    async recordBlackjackLedger(client, payload) {
        return this.resourceLedgerRepository.record(client, {
            playerId: payload.playerId,
            resourceType: 'CURRENCY',
            resourceId: payload.currencyId,
            delta: payload.delta,
            balanceAfter: payload.balanceAfter,
            reason: payload.reason,
            referenceType: 'MINIGAME_ROUND',
            referenceId: payload.roundId,
            operationId: payload.operationId,
            createdAt: payload.createdAt
        });
    }

    async settleBlackjackState(client, round, state, rules, operationId, settledAt) {
        const settledRound = await this.roundRepository.settleRound(client, {
            roundId: round.roundId,
            playerId: round.playerId,
            wager: state.totalWager,
            payout: state.outcome.payout,
            netDelta: state.outcome.netDelta,
            outcomeSnapshot: state,
            settledAt
        });
        let balance = await this.walletRepository.getBalance(
            client, round.playerId, rules.currencyId, true
        );
        if (compareIntegerAmounts(state.outcome.payout, 0) > 0) {
            balance = await this.walletRepository.credit(client, {
                playerId: round.playerId,
                currencyId: rules.currencyId,
                amount: state.outcome.payout
            });
            await this.recordBlackjackLedger(client, {
                playerId: round.playerId,
                currencyId: rules.currencyId,
                delta: state.outcome.payout,
                balanceAfter: balance,
                reason: 'MINIGAME_BLACKJACK_PAYOUT',
                roundId: round.roundId,
                operationId,
                createdAt: settledAt
            });
        }
        return { round: settledRound, balance };
    }

    async startBlackjack(playerId, wagerInput, options = {}) {
        if (!options.operationId) throw new Error('MINIGAME_OPERATION_ID_REQUIRED');
        const wagerToken = String(wagerInput || '').trim().toUpperCase();
        const isWalletFraction = ['ALL', 'HALF'].includes(wagerToken);
        const fixedWager = isWalletFraction ? null : normalizeIntegerAmount(wagerInput);
        if (fixedWager != null && compareIntegerAmounts(fixedWager, 0) <= 0) {
            throw new Error('MINIGAME_WAGER_MUST_BE_POSITIVE');
        }
        const rules = this.getRules();
        const game = this.requireActiveGame('BLACKJACK');
        const startedAt = options.startedAt || this.timeProvider.now();
        return this.operationExecutor.execute({
            operationId: options.operationId,
            playerId,
            operationType: 'MINIGAME_BLACKJACK_START',
            requestHash: createRequestHash({
                operationType: 'MINIGAME_BLACKJACK_START', playerId,
                wagerInput: fixedWager ?? wagerToken,
                rulesRevision: rules.revision
            })
        }, async (client) => {
            const context = await this.loadContext(client, playerId);
            const activeRound = await this.roundRepository.findActiveRound(
                client, playerId, game.id, { forUpdate: true }
            );
            if (activeRound && new Date(activeRound.expiresAt).getTime() > startedAt.getTime()) {
                const balance = await this.walletRepository.getBalance(
                    client, playerId, rules.currencyId, true
                );
                return this.createBlackjackResult(
                    activeRound, activeRound.outcomeSnapshot, balance, 'BLACKJACK_ACTIVE_RESTORED'
                );
            }
            let autoSettledRoundId = null;
            if (activeRound) {
                const expiredState = this.blackjackEngine.applyAction(
                    activeRound.outcomeSnapshot, 'STAND', activeRound.inputSnapshot.paytable
                );
                await this.settleBlackjackState(
                    client, activeRound, expiredState, rules, options.operationId, startedAt
                );
                autoSettledRoundId = activeRound.roundId;
            }

            const minimumWager = multiplyBasisPoints(
                context.mapBasePrice, rules.betPolicy.minimumMultiplierBasisPoints
            );
            const balanceBefore = await this.walletRepository.getBalance(
                client, playerId, rules.currencyId, true
            );
            const wager = fixedWager ?? (
                wagerToken === 'HALF'
                    ? (BigInt(balanceBefore) / 2n).toString()
                    : balanceBefore
            );
            if (compareIntegerAmounts(wager, 0) <= 0) {
                throw new Error('MINIGAME_WAGER_MUST_BE_POSITIVE');
            }
            if (compareIntegerAmounts(wager, minimumWager) < 0) {
                const error = new Error('MINIGAME_WAGER_BELOW_MINIMUM');
                error.minimumWager = minimumWager;
                error.mapName = context.map.name;
                throw error;
            }
            if (compareIntegerAmounts(wager, balanceBefore) > 0) {
                const error = new Error('INSUFFICIENT_CURRENCY');
                error.balance = balanceBefore;
                throw error;
            }
            const seed = options.seed ?? this.seedProvider.nextSeed();
            const state = this.blackjackEngine.start({ seed, wager, rules: game.paytable });
            const expiresAt = new Date(startedAt.getTime() + game.sessionPolicy.ttlSeconds * 1000);
            const balanceAfterDebit = await this.walletRepository.debit(client, {
                playerId, currencyId: rules.currencyId, amount: wager
            });

            if (state.status === 'SETTLED') {
                const round = await this.roundRepository.recordSettledRound(client, {
                    playerId,
                    gameId: game.id,
                    rulesRevision: rules.revision,
                    operationId: options.operationId,
                    wager: state.totalWager,
                    payout: state.outcome.payout,
                    netDelta: state.outcome.netDelta,
                    inputSnapshot: {
                        mapId: context.map.id, mapName: context.map.name,
                        currencyId: rules.currencyId, minimumWager, paytable: game.paytable
                    },
                    outcomeSnapshot: state,
                    rngSnapshot: { algorithm: 'PARK_MILLER_16807', seed },
                    settledAt: startedAt
                });
                await this.recordBlackjackLedger(client, {
                    playerId, currencyId: rules.currencyId, delta: `-${wager}`,
                    balanceAfter: balanceAfterDebit, reason: 'MINIGAME_BLACKJACK_WAGER',
                    roundId: round.roundId, operationId: options.operationId, createdAt: startedAt
                });
                let balance = balanceAfterDebit;
                if (compareIntegerAmounts(state.outcome.payout, 0) > 0) {
                    balance = await this.walletRepository.credit(client, {
                        playerId, currencyId: rules.currencyId, amount: state.outcome.payout
                    });
                    await this.recordBlackjackLedger(client, {
                        playerId, currencyId: rules.currencyId, delta: state.outcome.payout,
                        balanceAfter: balance, reason: 'MINIGAME_BLACKJACK_PAYOUT',
                        roundId: round.roundId, operationId: options.operationId, createdAt: startedAt
                    });
                }
                return this.createBlackjackResult(
                    round, state, balance, 'BLACKJACK_SETTLED', { autoSettledRoundId }
                );
            }

            const round = await this.roundRepository.recordActiveRound(client, {
                playerId,
                gameId: game.id,
                rulesRevision: rules.revision,
                operationId: options.operationId,
                wager,
                netDelta: `-${wager}`,
                inputSnapshot: {
                    mapId: context.map.id, mapName: context.map.name,
                    currencyId: rules.currencyId, minimumWager, paytable: game.paytable
                },
                outcomeSnapshot: state,
                rngSnapshot: { algorithm: 'PARK_MILLER_16807', seed },
                startedAt,
                expiresAt
            });
            await this.recordBlackjackLedger(client, {
                playerId, currencyId: rules.currencyId, delta: `-${wager}`,
                balanceAfter: balanceAfterDebit, reason: 'MINIGAME_BLACKJACK_WAGER',
                roundId: round.roundId, operationId: options.operationId, createdAt: startedAt
            });
            return this.createBlackjackResult(
                round, state, balanceAfterDebit, 'BLACKJACK_STARTED', { autoSettledRoundId }
            );
        });
    }

    async actBlackjack(playerId, roundId, actionInput, options = {}) {
        if (!options.operationId) throw new Error('MINIGAME_OPERATION_ID_REQUIRED');
        const action = String(actionInput || '').toUpperCase();
        if (!['HIT', 'STAND', 'DOUBLE'].includes(action)) throw new Error('BLACKJACK_ACTION_INVALID');
        const rules = this.getRules();
        const settledAt = options.settledAt || this.timeProvider.now();
        return this.operationExecutor.execute({
            operationId: options.operationId,
            playerId,
            operationType: 'MINIGAME_BLACKJACK_ACTION',
            requestHash: createRequestHash({
                operationType: 'MINIGAME_BLACKJACK_ACTION', playerId,
                roundId: String(roundId), action
            })
        }, async (client) => {
            const round = await this.roundRepository.findPlayerRound(
                client, playerId, roundId, { forUpdate: true }
            );
            if (!round) throw new Error('MINIGAME_ROUND_NOT_FOUND');
            if (round.gameId !== 'BLACKJACK') throw new Error('MINIGAME_ROUND_GAME_MISMATCH');
            if (round.status !== 'ACTIVE') throw new Error('MINIGAME_ROUND_NOT_ACTIVE');
            const expired = new Date(round.expiresAt).getTime() <= settledAt.getTime();
            const effectiveAction = expired ? 'STAND' : action;
            const nextState = this.blackjackEngine.applyAction(
                round.outcomeSnapshot, effectiveAction, round.inputSnapshot.paytable
            );

            let balance = await this.walletRepository.getBalance(
                client, playerId, rules.currencyId, true
            );
            if (effectiveAction === 'DOUBLE') {
                balance = await this.walletRepository.debit(client, {
                    playerId, currencyId: rules.currencyId, amount: round.outcomeSnapshot.baseWager
                });
                await this.recordBlackjackLedger(client, {
                    playerId, currencyId: rules.currencyId,
                    delta: `-${round.outcomeSnapshot.baseWager}`,
                    balanceAfter: balance, reason: 'MINIGAME_BLACKJACK_DOUBLE_WAGER',
                    roundId: round.roundId, operationId: options.operationId, createdAt: settledAt
                });
            }

            if (nextState.status === 'ACTIVE') {
                const updated = await this.roundRepository.updateActiveRoundState(client, {
                    roundId: round.roundId,
                    playerId,
                    wager: nextState.totalWager,
                    netDelta: `-${nextState.totalWager}`,
                    outcomeSnapshot: nextState
                });
                return this.createBlackjackResult(updated, nextState, balance, 'BLACKJACK_ACTIVE');
            }
            const settled = await this.settleBlackjackState(
                client, round, nextState, rules, options.operationId, settledAt
            );
            return this.createBlackjackResult(
                settled.round,
                nextState,
                settled.balance,
                expired ? 'BLACKJACK_EXPIRED_AUTO_STAND' : 'BLACKJACK_SETTLED'
            );
        });
    }

    async expireBlackjack(playerId, roundId, options = {}) {
        return this.actBlackjack(playerId, roundId, 'STAND', options);
    }
}
