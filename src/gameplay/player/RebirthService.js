import Player from '../../core/Player.js';
import { createLegacyPlayerSnapshot } from './createLegacyPlayerSnapshot.js';
import RealmStatProgressionCalculator from '../../core/RealmStatProgressionCalculator.js';
import { compareDecimal } from '../../shared/numeric/FixedDecimal.js';
import { normalizeIntegerAmount } from '../../shared/numeric/IntegerAmount.js';
import { createRequestHash } from '../../platform/idempotency/createRequestHash.js';
import IdempotentOperationExecutor from '../../platform/idempotency/IdempotentOperationExecutor.js';
import SystemTimeProvider from '../../platform/time/SystemTimeProvider.js';
import RebirthRepository from '../../repositories/RebirthRepository.js';
import RebirthStatCalculator from './RebirthStatCalculator.js';

export default class RebirthService {
    constructor(options = {}) {
        this.playerRuntimeRepository = options.playerRuntimeRepository;
        this.gameDataManager = options.gameDataManager;
        this.operationExecutor = options.operationExecutor || new IdempotentOperationExecutor(options);
        this.rebirthRepository = options.rebirthRepository || new RebirthRepository(options);
        this.timeProvider = options.timeProvider || new SystemTimeProvider();
    }

    async preview(playerId, options = {}) {
        const rules = this.getRules();
        const runtimePlayer = await this.playerRuntimeRepository.findById(playerId);
        if (!runtimePlayer) return Object.freeze({ outcome: 'PLAYER_NOT_FOUND' });

        const evaluation = this.evaluate(runtimePlayer, rules, options.previewedAt || this.timeProvider.now());
        if (evaluation.outcome !== 'REBIRTH_ELIGIBLE') {
            return Object.freeze({ outcome: evaluation.outcome });
        }

        return Object.freeze({
            outcome: evaluation.outcome,
            currentRebirthCount: evaluation.currentRebirthCount,
            nextRebirthCount: evaluation.nextRebirthCount,
            baseStats: Object.freeze({ ...evaluation.baseStats }),
            resetRealmId: evaluation.resetRealmId,
            resetRealmName: evaluation.resetRealmName,
            resetRealmStage: evaluation.resetRealmStage,
            policyId: rules.id,
            policyRevision: rules.revision,
            previewIdentity: `${rules.id}:${rules.revision}:${evaluation.currentRebirthCount}:${evaluation.nextRebirthCount}`,
            retainedSpiritStone: runtimePlayer.currencies.SPIRIT_STONE,
            spiritRootId: runtimePlayer.spiritRootId,
            spiritRootQualityTierId: runtimePlayer.spiritRootQualityTierId,
            resetCultivationArtId: rules.resetBootstrap.cultivationArtId,
            retention: Object.freeze({ ...rules.retention })
        });
    }

    async rebirth(playerId, options = {}) {
        if (!options.operationId) throw new Error('REBIRTH_OPERATION_ID_REQUIRED');
        const rules = this.getRules();

        return this.operationExecutor.execute({
            operationId: options.operationId,
            playerId,
            operationType: 'REBIRTH',
            requestHash: createRequestHash({
                operationType: 'REBIRTH', playerId, policyId: rules.id,
                policyRevision: rules.revision,
                expectedRebirthCount: options.expectedRebirthCount ?? null,
                expectedPolicyRevision: options.expectedPolicyRevision ?? null
            })
        }, async (client) => {
            const runtimePlayer = await this.playerRuntimeRepository.findById(playerId, { client, forUpdate: true });
            if (!runtimePlayer) return { outcome: 'PLAYER_NOT_FOUND' };
            await this.rebirthRepository.assertNoActivityInProgress(client, playerId);

            const rebornAt = options.rebornAt || this.timeProvider.now();
            const evaluation = this.evaluate(runtimePlayer, rules, rebornAt);
            if (evaluation.outcome !== 'REBIRTH_ELIGIBLE') {
                await this.persistCultivation(client, playerId, evaluation.player);
                return { outcome: evaluation.outcome };
            }
            const staleCount = options.expectedRebirthCount !== undefined
                && normalizeIntegerAmount(options.expectedRebirthCount) !== evaluation.nextRebirthCount;
            const stalePolicy = options.expectedPolicyRevision !== undefined
                && Number(options.expectedPolicyRevision) !== Number(rules.revision);
            if (staleCount || stalePolicy) {
                return {
                    outcome: 'REBIRTH_PREVIEW_STALE',
                    currentRebirthCount: evaluation.currentRebirthCount,
                    nextRebirthCount: evaluation.nextRebirthCount,
                    policyRevision: rules.revision
                };
            }

            const { firstRealm, nextRebirthCount: nextCount, baseStats, player } = evaluation;
            const result = await this.rebirthRepository.applyReset(client, {
                playerId, operationId: options.operationId, policyId: rules.id,
                policyRevision: rules.revision, rebirthCount: nextCount,
                realmId: firstRealm.id, realmStage: rules.resetTarget.stage, baseStats,
                cultivationArtId: rules.resetBootstrap.cultivationArtId,
                retainedSpiritStone: runtimePlayer.currencies.SPIRIT_STONE, rebornAt,
                beforeSnapshot: {
                    realmId: runtimePlayer.realmId, realmStage: runtimePlayer.realmStage,
                    cultivation: player.cultivation, baseStats: runtimePlayer.baseStats,
                    cultivationArtId: runtimePlayer.cultivationArtId,
                    spiritRootId: runtimePlayer.spiritRootId, sectId: runtimePlayer.sectId,
                    spiritRootQualityTierId: runtimePlayer.spiritRootQualityTierId,
                    rebirthCount: runtimePlayer.rebirthCount || '0'
                }
            });
            return {
                outcome: 'REBIRTH_SUCCESS', rebirthCount: nextCount,
                realmId: firstRealm.id, realmName: firstRealm.name,
                realmStage: rules.resetTarget.stage, baseStats,
                retainedSpiritStone: runtimePlayer.currencies.SPIRIT_STONE,
                spiritRootQualityTierId: runtimePlayer.spiritRootQualityTierId,
                historyId: result.historyId, rebornAt: result.rebornAt
            };
        });
    }

    getRules() {
        const rules = this.gameDataManager.getCollection('rebirthRules');
        if (!rules?.enabled) throw new Error('REBIRTH_DISABLED');
        return rules;
    }

    evaluate(runtimePlayer, rules, evaluatedAt) {
        const player = new Player(createLegacyPlayerSnapshot(runtimePlayer).playerData);
        player.calculateOfflineCultivation(evaluatedAt);
        const realms = Object.values(this.gameDataManager.getCollection('realms') || {})
            .sort((left, right) => Number(left.order) - Number(right.order));
        const firstRealm = realms[0];
        const lastRealm = realms.at(-1);
        if (!firstRealm || !lastRealm) throw new Error('REBIRTH_REALM_DATA_UNAVAILABLE');

        const common = { player, firstRealm, lastRealm };
        if (player.realmId !== lastRealm.id || player.realmStage !== lastRealm.max_stage) {
            return { outcome: 'REBIRTH_NOT_AT_FINAL_STAGE', ...common };
        }
        if (compareDecimal(player.cultivation, player.realmInfo?.req_cul || 0) < 0) {
            return { outcome: 'REBIRTH_INSUFFICIENT_CULTIVATION', ...common };
        }

        const currentRebirthCount = normalizeIntegerAmount(runtimePlayer.rebirthCount || 0);
        const nextRebirthCount = (BigInt(currentRebirthCount) + 1n).toString();
        const baseStageStats = new RealmStatProgressionCalculator(
            realms,
            this.gameDataManager.getCollection('progressionRules')
        ).calculate(firstRealm.id, rules.resetTarget.stage);
        const baseStats = new RebirthStatCalculator(rules.baseStatBonus)
            .calculateStats(baseStageStats, nextRebirthCount);
        return {
            outcome: 'REBIRTH_ELIGIBLE', ...common, currentRebirthCount,
            nextRebirthCount, baseStats,
            resetRealmId: firstRealm.id, resetRealmName: firstRealm.name,
            resetRealmStage: rules.resetTarget.stage
        };
    }

    async persistCultivation(client, playerId, player) {
        await this.playerRuntimeRepository.updateCultivationState(playerId, {
            cultivation: player.cultivation,
            lastCultivateAt: player.lastCultivate
        }, { client });
    }
}
