import { createRequestHash } from '../../platform/idempotency/createRequestHash.js';
import IdempotentOperationExecutor from '../../platform/idempotency/IdempotentOperationExecutor.js';
import {
    addDecimal,
    compareDecimal,
    maxDecimal,
    minDecimal,
    multiplyDecimal,
    normalizeDecimal,
    subtractDecimal
} from '../../shared/numeric/FixedDecimal.js';
import CultivationService from './CultivationService.js';

const SUPPORTED_ACTION_TYPE = 'GRANT_CULTIVATION_PERCENT';

export default class ItemUseService {
    constructor(options = {}) {
        this.playerRuntimeRepository = options.playerRuntimeRepository;
        this.gameDataManager = options.gameDataManager;
        this.operationExecutor = options.operationExecutor
            || new IdempotentOperationExecutor(options);
        this.cultivationService = options.cultivationService
            || new CultivationService(options);
    }

    async use(playerId, itemId, options = {}) {
        if (!options.operationId) throw new Error('ITEM_USE_OPERATION_ID_REQUIRED');
        const template = this.gameDataManager.getRecord('itemTemplates', itemId);
        if (!template || template.usable !== true) {
            return { outcome: 'ITEM_NOT_USABLE', itemId };
        }
        const action = (template.actions || []).find(
            (entry) => entry.type === SUPPORTED_ACTION_TYPE
        );
        if (!action) {
            return { outcome: 'ITEM_ACTION_NOT_SUPPORTED', itemId };
        }

        return this.operationExecutor.execute({
            operationId: options.operationId,
            playerId,
            operationType: 'ITEM_USE',
            requestHash: createRequestHash({
                operationType: 'ITEM_USE',
                playerId,
                itemId,
                quantity: 1
            })
        }, async (client) => {
            const runtimePlayer = await this.playerRuntimeRepository.findById(playerId, {
                client,
                forUpdate: true
            });
            if (!runtimePlayer) return { outcome: 'PLAYER_NOT_FOUND', itemId };

            const realm = this.gameDataManager.getRecord('realms', runtimePlayer.realmId);
            const requiredRealmCode = action.parameters?.realmCode;
            if (template.realmPolicy !== 'EXACT_REALM'
                || !requiredRealmCode
                || realm?.code !== requiredRealmCode) {
                return {
                    outcome: 'ITEM_REALM_MISMATCH',
                    itemId,
                    requiredRealmCode,
                    currentRealmCode: realm?.code || null
                };
            }

            const { player, afkData } = await this.cultivationService.settleRuntimePlayer(
                playerId,
                runtimePlayer,
                { client, now: options.usedAt }
            );
            const requiredCultivation = normalizeDecimal(player.realmInfo?.req_cul || 0);
            const remaining = maxDecimal(
                subtractDecimal(requiredCultivation, player.cultivation),
                0
            );
            if (compareDecimal(remaining, 0) <= 0) {
                return {
                    outcome: 'CULTIVATION_ALREADY_FULL',
                    itemId,
                    cultivation: player.cultivation,
                    requiredCultivation,
                    settledCultivation: afkData.earned
                };
            }

            const percent = Number(action.parameters.requiredCultivationPercent);
            const rawGain = multiplyDecimal(requiredCultivation, String(percent / 100));
            const appliedGain = action.parameters.capAtBreakthroughThreshold === true
                ? minDecimal(rawGain, remaining)
                : rawGain;
            const cultivation = addDecimal(player.cultivation, appliedGain);

            await this.playerRuntimeRepository.consumeItemByTemplate(
                playerId,
                itemId,
                { quantity: 1 },
                {
                    client,
                    operationId: options.operationId,
                    referenceId: options.operationId,
                    referenceType: 'ITEM_USE',
                    reason: 'CULTIVATION_PILL_USE'
                }
            );
            await this.playerRuntimeRepository.updateCultivationState(playerId, {
                cultivation,
                lastCultivateAt: player.lastCultivate
            }, { client });

            return {
                outcome: 'CULTIVATION_PILL_USED',
                itemId,
                itemName: template.name,
                cultivation,
                requiredCultivation,
                appliedGain,
                settledCultivation: afkData.earned,
                realmCode: realm.code
            };
        });
    }
}
