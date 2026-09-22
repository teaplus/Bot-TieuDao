import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import { createRequestHash } from '../../platform/idempotency/createRequestHash.js';
import SystemTimeProvider from '../../platform/time/SystemTimeProvider.js';
import IdempotencyRepository from '../../repositories/IdempotencyRepository.js';
import PlayerAccountRepository from '../../repositories/PlayerAccountRepository.js';
import PlayerWalletRepository from '../../repositories/PlayerWalletRepository.js';
import ResourceLedgerRepository from '../../repositories/ResourceLedgerRepository.js';
import SpiritStoneTransferRepository from '../../repositories/SpiritStoneTransferRepository.js';
import {
    compareIntegerAmounts,
    normalizeIntegerAmount
} from '../../shared/numeric/IntegerAmount.js';

export default class SpiritStoneTransferService {
    constructor(options = {}) {
        this.unitOfWork = options.unitOfWork;
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.idempotencyRepository = options.idempotencyRepository || new IdempotencyRepository();
        this.accountRepository = options.accountRepository || new PlayerAccountRepository();
        this.walletRepository = options.walletRepository || new PlayerWalletRepository();
        this.ledgerRepository = options.ledgerRepository || new ResourceLedgerRepository();
        this.transferRepository = options.transferRepository || new SpiritStoneTransferRepository();
        this.timeProvider = options.timeProvider || new SystemTimeProvider();
    }

    getRules() {
        const rules = this.gameDataManager.getCollection('spiritStoneTransferRules');
        if (!rules) throw new Error('SPIRIT_STONE_TRANSFER_RULES_NOT_FOUND');
        return rules;
    }

    normalizeRequest(senderPlayerId, recipientPlayerId, amountInput) {
        const senderId = String(senderPlayerId || '');
        const recipientId = String(recipientPlayerId || '');
        if (!senderId || !recipientId) throw new Error('SPIRIT_STONE_TRANSFER_PLAYER_REQUIRED');
        if (senderId === recipientId) throw new Error('SPIRIT_STONE_TRANSFER_SELF_FORBIDDEN');
        const amount = normalizeIntegerAmount(amountInput);
        if (compareIntegerAmounts(amount, this.getRules().minimumAmount) < 0) {
            throw new Error('SPIRIT_STONE_TRANSFER_AMOUNT_BELOW_MINIMUM');
        }
        return { senderId, recipientId, amount };
    }

    requireEligiblePlayers(players, senderId, recipientId) {
        const byId = new Map(players.map((player) => [player.playerId, player]));
        const sender = byId.get(senderId);
        const recipient = byId.get(recipientId);
        if (!sender || sender.accountStatus !== 'REGISTERED') {
            throw new Error('SPIRIT_STONE_TRANSFER_SENDER_NOT_REGISTERED');
        }
        const recipientEligibility = this.getRules().recipientEligibility;
        if (!recipient && recipientEligibility === 'REGISTERED_OR_GUEST_AUTO_CREATE') {
            return {
                sender,
                recipient: {
                    playerId: recipientId,
                    name: 'Lữ Khách',
                    accountStatus: 'GUEST',
                    pendingCreation: true
                }
            };
        }
        const recipientAllowed = recipientEligibility === 'REGISTERED_ONLY'
            ? recipient?.accountStatus === 'REGISTERED'
            : ['REGISTERED', 'GUEST'].includes(recipient?.accountStatus);
        if (!recipientAllowed) {
            throw new Error('SPIRIT_STONE_TRANSFER_RECIPIENT_NOT_REGISTERED');
        }
        return { sender, recipient };
    }

    async preview(senderPlayerId, recipientPlayerId, amountInput) {
        if (!this.unitOfWork) throw new Error('UNIT_OF_WORK_REQUIRED');
        const request = this.normalizeRequest(senderPlayerId, recipientPlayerId, amountInput);
        return this.unitOfWork.execute(async (database) => {
            const players = await this.transferRepository.findPlayers(
                database, [request.senderId, request.recipientId]
            );
            const eligible = this.requireEligiblePlayers(
                players, request.senderId, request.recipientId
            );
            const balance = await this.walletRepository.getBalance(
                database, request.senderId, this.getRules().currencyId
            );
            if (compareIntegerAmounts(request.amount, balance) > 0) {
                const error = new Error('INSUFFICIENT_CURRENCY');
                error.balance = balance;
                throw error;
            }
            return {
                senderPlayerId: request.senderId,
                senderName: eligible.sender.name,
                recipientPlayerId: request.recipientId,
                recipientName: eligible.recipient.name,
                recipientAccountStatus: eligible.recipient.accountStatus,
                recipientWillBeCreated: Boolean(eligible.recipient.pendingCreation),
                amount: request.amount,
                feeAmount: '0',
                receivedAmount: request.amount,
                policyRevision: this.getRules().revision,
                confirmationTtlSeconds: this.getRules().confirmation.ttlSeconds
            };
        });
    }

    async transfer(senderPlayerId, recipientPlayerId, amountInput, options = {}) {
        if (!this.unitOfWork) throw new Error('UNIT_OF_WORK_REQUIRED');
        if (!options.operationId) throw new Error('SPIRIT_STONE_TRANSFER_OPERATION_ID_REQUIRED');
        const request = this.normalizeRequest(senderPlayerId, recipientPlayerId, amountInput);
        const rules = this.getRules();
        const createdAt = options.createdAt || this.timeProvider.now();
        const requestHash = createRequestHash({
            operationType: 'SPIRIT_STONE_TRANSFER',
            senderPlayerId: request.senderId,
            recipientPlayerId: request.recipientId,
            amount: request.amount,
            policyRevision: rules.revision
        });

        return this.unitOfWork.execute(async (database) => {
            if (rules.recipientEligibility === 'REGISTERED_OR_GUEST_AUTO_CREATE') {
                await this.accountRepository.ensureGuest(database, request.recipientId);
            }
            const players = await this.transferRepository.findPlayers(
                database, [request.senderId, request.recipientId], { forUpdate: true }
            );
            const eligible = this.requireEligiblePlayers(
                players, request.senderId, request.recipientId
            );
            const reservation = await this.idempotencyRepository.reserve(database, {
                operationId: options.operationId,
                playerId: request.senderId,
                operationType: 'SPIRIT_STONE_TRANSFER',
                requestHash,
                retentionPolicy: 'DEFAULT'
            });
            if (reservation.status === 'COMPLETED') {
                return { ...reservation.response, idempotentReplay: true };
            }
            if (reservation.status === 'IN_PROGRESS') {
                throw new Error('IDEMPOTENCY_OPERATION_IN_PROGRESS');
            }

            const senderBalanceBefore = await this.walletRepository.getBalance(
                database, request.senderId, rules.currencyId, true
            );
            if (compareIntegerAmounts(request.amount, senderBalanceBefore) > 0) {
                const error = new Error('INSUFFICIENT_CURRENCY');
                error.balance = senderBalanceBefore;
                throw error;
            }
            const transfer = await this.transferRepository.create(database, {
                operationId: options.operationId,
                senderPlayerId: request.senderId,
                recipientPlayerId: request.recipientId,
                amount: request.amount,
                policyRevision: rules.revision,
                createdAt
            });
            const senderBalance = await this.walletRepository.debit(database, {
                playerId: request.senderId,
                currencyId: rules.currencyId,
                amount: request.amount
            });
            const recipientBalance = await this.walletRepository.credit(database, {
                playerId: request.recipientId,
                currencyId: rules.currencyId,
                amount: request.amount
            });
            await this.ledgerRepository.recordMany(database, [
                {
                    playerId: request.senderId,
                    resourceType: 'CURRENCY',
                    resourceId: rules.currencyId,
                    delta: `-${request.amount}`,
                    balanceAfter: senderBalance,
                    reason: 'SPIRIT_STONE_TRANSFER_SENT',
                    referenceType: 'SPIRIT_STONE_TRANSFER',
                    referenceId: transfer.transferId,
                    operationId: options.operationId,
                    createdAt
                },
                {
                    playerId: request.recipientId,
                    resourceType: 'CURRENCY',
                    resourceId: rules.currencyId,
                    delta: request.amount,
                    balanceAfter: recipientBalance,
                    reason: 'SPIRIT_STONE_TRANSFER_RECEIVED',
                    referenceType: 'SPIRIT_STONE_TRANSFER',
                    referenceId: transfer.transferId,
                    operationId: options.operationId,
                    createdAt
                }
            ]);
            const response = {
                status: 'SPIRIT_STONE_TRANSFER_COMPLETED',
                transferId: transfer.transferId,
                senderPlayerId: request.senderId,
                senderName: eligible.sender.name,
                recipientPlayerId: request.recipientId,
                recipientName: eligible.recipient.name,
                recipientAccountStatus: eligible.recipient.accountStatus,
                amount: request.amount,
                feeAmount: '0',
                receivedAmount: request.amount,
                policyRevision: rules.revision,
                createdAt: transfer.createdAt
            };
            await this.idempotencyRepository.complete(database, {
                operationId: options.operationId,
                response,
                responseRetentionDays: 30
            });
            return response;
        });
    }
}
