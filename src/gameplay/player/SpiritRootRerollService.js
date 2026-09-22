import Player from '../../core/Player.js';
import { createLegacyPlayerSnapshot } from './createLegacyPlayerSnapshot.js';
import { createRequestHash } from '../../platform/idempotency/createRequestHash.js';
import IdempotentOperationExecutor from '../../platform/idempotency/IdempotentOperationExecutor.js';
import createSeededRandom from '../../platform/random/createSeededRandom.js';
import SecureSeedProvider from '../../platform/random/SecureSeedProvider.js';
import SystemTimeProvider from '../../platform/time/SystemTimeProvider.js';
import SpiritRootRerollRepository from '../../repositories/SpiritRootRerollRepository.js';
import SpiritRootQualityRoller from './SpiritRootQualityRoller.js';
import SpiritRootRoller from './SpiritRootRoller.js';
import SpiritRootEffectResolver from './SpiritRootEffectResolver.js';

const REROLL_POOL_ID = 'SPIRIT_ROOT_REBIRTH_QUALITY_V1';

export default class SpiritRootRerollService {
    constructor(options = {}) {
        this.playerRuntimeRepository = options.playerRuntimeRepository;
        this.gameDataManager = options.gameDataManager;
        this.operationExecutor = options.operationExecutor || new IdempotentOperationExecutor(options);
        this.repository = options.repository || new SpiritRootRerollRepository(options);
        this.spiritRootEffectResolver = options.spiritRootEffectResolver
            || new SpiritRootEffectResolver({ gameDataManager: this.gameDataManager });
        this.seedProvider = options.seedProvider || new SecureSeedProvider();
        this.timeProvider = options.timeProvider || new SystemTimeProvider();
    }

    async preview(playerId) {
        const runtimePlayer = await this.playerRuntimeRepository.findById(playerId);
        if (!runtimePlayer) return Object.freeze({ outcome: 'PLAYER_NOT_FOUND' });
        const current = this.describe(
            runtimePlayer.spiritRootId,
            runtimePlayer.spiritRootQualityTierId
        );
        const entitlement = await this.repository.findOldestAvailable(playerId);
        if (!entitlement) return Object.freeze({
            outcome: 'SPIRIT_ROOT_NO_REROLL_AVAILABLE',
            current,
            availableCount: '0'
        });
        return Object.freeze({
            outcome: 'SPIRIT_ROOT_REROLL_AVAILABLE',
            entitlement,
            current,
            availableCount: entitlement.availableCount,
            pool: this.describePool(entitlement.rebirthNumber)
        });
    }

    async reroll(playerId, options = {}) {
        if (!options.operationId) throw new Error('SPIRIT_ROOT_REROLL_OPERATION_ID_REQUIRED');
        if (options.expectedEntitlementId == null) {
            throw new Error('SPIRIT_ROOT_REROLL_EXPECTED_ENTITLEMENT_REQUIRED');
        }
        const pool = this.gameDataManager.requireRecord('spiritRootRerollPools', REROLL_POOL_ID);
        return this.operationExecutor.execute({
            operationId: options.operationId,
            playerId,
            operationType: 'SPIRIT_ROOT_REROLL',
            requestHash: createRequestHash({
                operationType: 'SPIRIT_ROOT_REROLL', playerId,
                poolId: pool.id, poolRevision: pool.revision,
                expectedEntitlementId: options.expectedEntitlementId ?? null
            })
        }, async (client) => {
            const runtimePlayer = await this.playerRuntimeRepository.findById(
                playerId,
                { client, forUpdate: true }
            );
            if (!runtimePlayer) return { outcome: 'PLAYER_NOT_FOUND' };
            const entitlement = await this.repository.findOldestAvailable(playerId, {
                client,
                forUpdate: true
            });
            if (!entitlement) return { outcome: 'SPIRIT_ROOT_NO_REROLL_AVAILABLE' };
            if (options.expectedEntitlementId != null
                && String(options.expectedEntitlementId) !== entitlement.id) {
                return {
                    outcome: 'SPIRIT_ROOT_REROLL_PREVIEW_STALE',
                    entitlementId: entitlement.id
                };
            }

            const rolledAt = options.rolledAt || this.timeProvider.now();
            const player = new Player(createLegacyPlayerSnapshot(runtimePlayer).playerData);
            player.calculateOfflineCultivation(rolledAt);
            await this.playerRuntimeRepository.updateCultivationState(playerId, {
                cultivation: player.cultivation,
                lastCultivateAt: player.lastCultivate
            }, { client });

            const seed = options.seed ?? this.seedProvider.nextSeed();
            const roll = this.rollDifferentCombination({
                seed,
                rebirthNumber: entitlement.rebirthNumber,
                currentSpiritRootId: runtimePlayer.spiritRootId,
                currentQualityTierId: runtimePlayer.spiritRootQualityTierId
            });
            const persistence = await this.repository.applyReroll(client, {
                playerId,
                entitlementId: entitlement.id,
                operationId: options.operationId,
                poolId: pool.id,
                poolRevision: pool.revision,
                previousSpiritRootId: runtimePlayer.spiritRootId,
                previousQualityTierId: runtimePlayer.spiritRootQualityTierId,
                newSpiritRootId: roll.spiritRoot.id,
                newQualityTierId: roll.qualityTier.id,
                newLegacyValue: roll.spiritRoot.legacyValue,
                rollSnapshot: roll.snapshot,
                rolledAt
            });
            return Object.freeze({
                outcome: 'SPIRIT_ROOT_REROLL_SUCCESS',
                entitlementId: entitlement.id,
                entitlementRebirthNumber: entitlement.rebirthNumber,
                previous: this.describe(runtimePlayer.spiritRootId, runtimePlayer.spiritRootQualityTierId),
                current: this.describe(roll.spiritRoot.id, roll.qualityTier.id),
                rejectedExactDuplicates: roll.snapshot.rejectedDraws.length,
                historyId: persistence.historyId,
                rolledAt: persistence.rolledAt
            });
        });
    }

    rollDifferentCombination(input) {
        const random = createSeededRandom(input.seed);
        const spiritRootRoller = new SpiritRootRoller({
            gameDataManager: this.gameDataManager,
            random
        });
        const qualityRoller = new SpiritRootQualityRoller({ gameDataManager: this.gameDataManager, random });
        const pool = this.gameDataManager.requireRecord('spiritRootRerollPools', REROLL_POOL_ID);
        const bracket = qualityRoller.resolveBracket(pool, input.rebirthNumber);
        if (!bracket) throw new Error('SPIRIT_ROOT_QUALITY_BRACKET_NOT_FOUND');
        const rootRollOptions = {
            poolId: REROLL_POOL_ID,
            rebirthCount: input.rebirthNumber
        };
        const templateBracket = spiritRootRoller.resolveTemplateBracket(
            rootRollOptions.poolId,
            rootRollOptions.rebirthCount
        );
        const weightedRoots = spiritRootRoller.getWeightedRoots(rootRollOptions);
        const templateCount = weightedRoots.length;
        const qualityCount = bracket.entries.filter((entry) => entry.weight > 0).length;
        const maxAttempts = templateCount * qualityCount;
        const rejectedDraws = [];

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            const spiritRoot = spiritRootRoller.roll(rootRollOptions);
            const quality = qualityRoller.roll(REROLL_POOL_ID, input.rebirthNumber);
            const draw = Object.freeze({
                attempt,
                spiritRootId: spiritRoot.id,
                qualityTierId: quality.qualityTier.id
            });
            const exactDuplicate = spiritRoot.id === input.currentSpiritRootId
                && quality.qualityTier.id === input.currentQualityTierId;
            if (exactDuplicate) {
                rejectedDraws.push(draw);
                continue;
            }
            return Object.freeze({
                spiritRoot,
                qualityTier: quality.qualityTier,
                snapshot: Object.freeze({
                    seed: String(input.seed),
                    rebirthNumber: String(input.rebirthNumber),
                    bracketId: quality.bracket.id,
                    templateBracketId: templateBracket?.id || null,
                    templateWeights: Object.freeze(weightedRoots.map((entry) => Object.freeze({
                        spiritRootId: entry.spiritRoot.id,
                        weight: entry.weight
                    }))),
                    maxAttempts,
                    acceptedDraw: draw,
                    rejectedDraws: Object.freeze(rejectedDraws)
                })
            });
        }
        throw new Error('SPIRIT_ROOT_REROLL_DISTINCT_RESULT_EXHAUSTED');
    }

    describe(spiritRootId, qualityTierId) {
        const root = this.gameDataManager.requireRecord('spiritRoots', spiritRootId);
        const quality = this.gameDataManager.requireRecord('spiritRootQualityTiers', qualityTierId);
        return Object.freeze({
            spiritRootId: root.id,
            spiritRootName: root.displayName,
            archetype: root.archetype,
            elementIds: Object.freeze([...root.elementIds]),
            defensiveElementId: root.defensiveElementId,
            qualityTierId: quality.id,
            qualityName: quality.displayName,
            qualityOrder: quality.order,
            effects: this.spiritRootEffectResolver.getEffectProjection({
                spiritRootId: root.id,
                spiritRootQualityTierId: quality.id
            })
        });
    }

    describePool(rebirthNumber) {
        const pool = this.gameDataManager.requireRecord('spiritRootRerollPools', REROLL_POOL_ID);
        const roller = new SpiritRootQualityRoller({ gameDataManager: this.gameDataManager });
        const bracket = roller.resolveBracket(pool, rebirthNumber);
        if (!bracket) throw new Error('SPIRIT_ROOT_QUALITY_BRACKET_NOT_FOUND');
        const rootRoller = new SpiritRootRoller({ gameDataManager: this.gameDataManager });
        const templateBracket = rootRoller.resolveTemplateBracket(pool.id, rebirthNumber);
        const weightedRoots = rootRoller.getWeightedRoots({
            poolId: pool.id,
            rebirthCount: rebirthNumber
        });
        return Object.freeze({
            id: pool.id,
            revision: pool.revision,
            bracketId: bracket.id,
            templateBracketId: templateBracket?.id || null,
            rebirthNumber: String(rebirthNumber),
            spiritRootWeights: Object.freeze(weightedRoots.map((entry) => Object.freeze({
                spiritRootId: entry.spiritRoot.id,
                spiritRootName: entry.spiritRoot.displayName,
                weight: entry.weight
            }))),
            qualityWeights: Object.freeze(bracket.entries.map((entry) => Object.freeze({
                qualityTierId: entry.qualityTierId,
                qualityName: this.gameDataManager
                    .requireRecord('spiritRootQualityTiers', entry.qualityTierId).displayName,
                weight: entry.weight
            })))
        });
    }
}

export { REROLL_POOL_ID };
