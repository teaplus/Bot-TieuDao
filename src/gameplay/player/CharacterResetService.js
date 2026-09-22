import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import IdempotentOperationExecutor from '../../platform/idempotency/IdempotentOperationExecutor.js';
import { createRequestHash } from '../../platform/idempotency/createRequestHash.js';
import SystemTimeProvider from '../../platform/time/SystemTimeProvider.js';
import CharacterResetRepository from '../../repositories/CharacterResetRepository.js';
import PlayerWalletRepository from '../../repositories/PlayerWalletRepository.js';
import ResourceLedgerRepository from '../../repositories/ResourceLedgerRepository.js';

export default class CharacterResetService {
    constructor(options = {}) {
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.unitOfWork = options.unitOfWork;
        this.operationExecutor = options.operationExecutor || new IdempotentOperationExecutor(options);
        this.repository = options.repository || new CharacterResetRepository();
        this.walletRepository = options.walletRepository || new PlayerWalletRepository();
        this.ledgerRepository = options.ledgerRepository || new ResourceLedgerRepository();
        this.timeProvider = options.timeProvider || new SystemTimeProvider();
    }

    getRules() {
        const rules = this.gameDataManager.getCollection('characterResetRules');
        if (!rules) throw new Error('CHARACTER_RESET_RULES_NOT_FOUND');
        return rules;
    }

    assertCooldown(player, now) {
        const cooldownSeconds = this.getRules().cooldownSeconds;
        if (!cooldownSeconds || !player.lastCharacterResetAt) return null;
        const availableAt = new Date(
            new Date(player.lastCharacterResetAt).getTime() + cooldownSeconds * 1000
        );
        if (availableAt.getTime() > now.getTime()) {
            const error = new Error('CHARACTER_RESET_COOLDOWN');
            error.availableAt = availableAt;
            throw error;
        }
        return availableAt;
    }

    async preview(playerId, options = {}) {
        if (!this.unitOfWork) throw new Error('UNIT_OF_WORK_REQUIRED');
        const now = options.now || this.timeProvider.now();
        return this.unitOfWork.execute(async (database) => {
            const player = await this.repository.getPlayer(database, playerId);
            if (!player || player.accountStatus !== 'REGISTERED') {
                throw new Error('CHARACTER_RESET_PLAYER_NOT_REGISTERED');
            }
            this.assertCooldown(player, now);
            await this.repository.assertNoActiveState(database, playerId);
            const retainedSpiritStone = await this.walletRepository.getBalance(
                database, playerId, 'SPIRIT_STONE'
            );
            return {
                playerId,
                daoName: player.name,
                retainedSpiritStone,
                resetCount: player.characterResetCount,
                cooldownSeconds: this.getRules().cooldownSeconds,
                confirmationTtlSeconds: this.getRules().confirmationTtlSeconds,
                policyRevision: this.getRules().revision
            };
        });
    }

    async reset(playerId, options = {}) {
        if (!options.operationId) throw new Error('CHARACTER_RESET_OPERATION_ID_REQUIRED');
        const rules = this.getRules();
        const resetAt = options.resetAt || this.timeProvider.now();
        return this.operationExecutor.execute({
            operationId: options.operationId,
            playerId,
            operationType: 'CHARACTER_RESET',
            requestHash: createRequestHash({
                operationType: 'CHARACTER_RESET', playerId, policyRevision: rules.revision
            })
        }, async (database) => {
            const player = await this.repository.getPlayer(database, playerId, { forUpdate: true });
            if (!player || player.accountStatus !== 'REGISTERED') {
                throw new Error('CHARACTER_RESET_PLAYER_NOT_REGISTERED');
            }
            this.assertCooldown(player, resetAt);
            await this.repository.assertNoActiveState(database, playerId);
            const retainedSpiritStone = await this.walletRepository.getBalance(
                database, playerId, 'SPIRIT_STONE', true
            );
            const beforeSnapshot = await this.repository.collectBeforeSnapshot(database, player);
            const result = await this.repository.resetCharacter(database, {
                playerId,
                operationId: options.operationId,
                policyRevision: rules.revision,
                retainedSpiritStone,
                beforeSnapshot,
                resetAt
            });
            await this.ledgerRepository.recordMany(database, result.resetCurrencies.map((entry) => ({
                playerId,
                resourceType: 'CURRENCY',
                resourceId: entry.currencyId,
                delta: `-${entry.previousAmount}`,
                balanceAfter: '0',
                reason: 'CHARACTER_RESET',
                referenceType: 'CHARACTER_RESET',
                referenceId: result.historyId,
                operationId: options.operationId,
                createdAt: resetAt
            })));
            return {
                status: 'CHARACTER_RESET_COMPLETED',
                playerId,
                historyId: result.historyId,
                resetNumber: result.resetNumber,
                retainedSpiritStone,
                resetAt: result.resetAt,
                nextResetAt: rules.cooldownSeconds > 0
                    ? new Date(resetAt.getTime() + rules.cooldownSeconds * 1000)
                    : null
            };
        });
    }
}
