import { createLegacyPlayerSnapshot } from './createLegacyPlayerSnapshot.js';
import Player from '../../core/Player.js';
import { BATTLE_STAT_DEFINITIONS } from '../../battle/stats/BattleStatPolicy.js';
import {
    compareBattleFixed,
    divideBattleFixed,
    multiplyBattleFixed,
    subtractBattleFixed
} from '../../battle/numeric/BattleFixed.js';
import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';

const DIRECT_UNIT_OF_WORK = Object.freeze({ execute: (work) => work(null) });

function getEquipmentType(item) {
    return String(item?.equipmentType || item?.slot || item?.equippedSlot || '').toUpperCase();
}

function toEquipmentRecord(item, equippedSlot = item.equippedSlot) {
    return {
        id: item.uuid,
        item_id: item.id,
        rarity: item.rarity,
        equipped_slot: equippedSlot,
        instance_data: {
            equipmentType: getEquipmentType(item),
            grade: item.grade,
            gradeQuality: item.gradeQuality,
            fixedEffects: [...(item.fixedEffects || [])],
            affixes: [...(item.affixes || [])]
        }
    };
}

function getBattleStats(player) {
    return Object.fromEntries(
        Object.keys(BATTLE_STAT_DEFINITIONS).map((stat) => [stat, player.getFinalStat(stat)])
    );
}

function getStatChanges(currentStats, projectedStats) {
    return Object.fromEntries(Object.keys(BATTLE_STAT_DEFINITIONS).map((stat) => {
        const current = currentStats[stat];
        const projected = projectedStats[stat];
        const delta = subtractBattleFixed(projected, current);
        const percentDelta = compareBattleFixed(current, 0) === 0
            ? null
            : multiplyBattleFixed(divideBattleFixed(delta, current), 100);
        return [stat, { current, projected, delta, percentDelta }];
    }));
}

export default class EquipmentService {
    constructor(options = {}) {
        this.playerRuntimeRepository = options.playerRuntimeRepository;
        this.cultivationService = options.cultivationService;
        this.unitOfWork = options.unitOfWork || DIRECT_UNIT_OF_WORK;
        this.gameDataManager = options.gameDataManager || getGameDataManager();
    }

    getEquipmentRequiredRealm(item) {
        const grade = this.gameDataManager?.getRecord('equipmentGrades', item?.grade);
        const qualityId = String(item?.gradeQuality || 'LOW').toUpperCase() === 'MEDIUM'
            ? 'MIDDLE'
            : String(item?.gradeQuality || 'LOW').toUpperCase();
        const quality = grade?.qualities?.find((entry) => entry.quality === qualityId);
        return quality?.requiredRealm || null;
    }

    assertEquipmentRealmUnlocked(runtimePlayer, items) {
        const realms = Object.values(this.gameDataManager?.getCollection('realms') || {});
        const currentRealm = realms.find(
            (realm) => Number(realm.id) === Number(runtimePlayer?.realmId)
        );
        for (const item of items) {
            const requiredRealmCode = this.getEquipmentRequiredRealm(item);
            if (!requiredRealmCode) continue;
            const requiredRealm = realms.find((realm) => realm.code === requiredRealmCode);
            if (!requiredRealm || !currentRealm
                || Number(currentRealm.order) < Number(requiredRealm.order)) {
                const error = new Error(`EQUIPMENT_REALM_LOCKED:${requiredRealmCode}`);
                error.code = 'EQUIPMENT_REALM_LOCKED';
                error.requiredRealmCode = requiredRealmCode;
                error.requiredRealmName = requiredRealm?.name || requiredRealmCode;
                throw error;
            }
        }
    }

    async listEquippableItems(playerId) {
        const runtimePlayer = await this.playerRuntimeRepository.findById(playerId);
        if (!runtimePlayer) {
            return null;
        }

        const snapshot = createLegacyPlayerSnapshot(runtimePlayer);
        const equipments = snapshot.inventoryItems.filter((item) => item.type === 'EQUIPMENT' && !item.isEquipped);

        return {
            runtimePlayer,
            equipments
        };
    }

    async listEquippedItems(playerId) {
        const runtimePlayer = await this.playerRuntimeRepository.findById(playerId);
        if (!runtimePlayer) {
            return null;
        }

        const snapshot = createLegacyPlayerSnapshot(runtimePlayer);
        const equippedItems = snapshot.inventoryItems.filter((item) => item.type === 'EQUIPMENT' && item.isEquipped);

        return {
            runtimePlayer,
            equippedItems
        };
    }

    async getEquipmentPanelView(playerId) {
        const runtimePlayer = await this.playerRuntimeRepository.findById(playerId);
        if (!runtimePlayer) return null;

        const snapshot = createLegacyPlayerSnapshot(runtimePlayer);
        const player = new Player(snapshot.playerData);
        return {
            runtimePlayer,
            player,
            equipments: snapshot.inventoryItems.filter((item) => item.type === 'EQUIPMENT'),
            currentStats: getBattleStats(player)
        };
    }

    async previewEquipItem(playerId, inventoryId) {
        const preview = await this.previewEquipmentLoadout(playerId, [inventoryId]);
        if (!preview) return null;

        return {
            ...preview.selections[0],
            currentStats: preview.currentStats,
            projectedStats: preview.projectedStats,
            statChanges: preview.statChanges,
            effects: preview.selections[0].selectedItem.getEffects()
        };
    }

    async previewEquipmentLoadout(playerId, inventoryIds = [], unequipTypes = []) {
        const panel = await this.getEquipmentPanelView(playerId);
        if (!panel) return null;

        const uniqueIds = [...new Set(inventoryIds.map(String))];
        const normalizedUnequipTypes = [...new Set(
            unequipTypes.map((type) => String(type).toUpperCase())
        )];
        if (!uniqueIds.length && !normalizedUnequipTypes.length) {
            throw new Error('EQUIPMENT_SELECTION_EMPTY');
        }
        const selectedItems = uniqueIds.map((inventoryId) => {
            const item = panel.equipments.find(
                (entry) => String(entry.uuid) === inventoryId
            );
            if (!item) throw new Error('ITEM_NOT_FOUND');
            return item;
        });
        this.assertEquipmentRealmUnlocked(panel.runtimePlayer, selectedItems);
        const selectedByType = new Map();
        for (const equipmentType of normalizedUnequipTypes) {
            if (!equipmentType) throw new Error('EQUIPMENT_TYPE_MISSING');
            selectedByType.set(equipmentType, null);
        }
        for (const selectedItem of selectedItems) {
            const equipmentType = getEquipmentType(selectedItem);
            if (!equipmentType) throw new Error('EQUIPMENT_TYPE_MISSING');
            if (selectedByType.has(equipmentType)) {
                throw new Error('DUPLICATE_EQUIPMENT_TYPE_SELECTION');
            }
            selectedByType.set(equipmentType, selectedItem);
        }
        const projectedEquipment = panel.equipments.map((item) => {
            const equipmentType = getEquipmentType(item);
            const selectedItem = selectedByType.get(equipmentType);
            if (selectedByType.has(equipmentType)
                && selectedItem
                && String(item.uuid) === String(selectedItem.uuid)) {
                return toEquipmentRecord(item, equipmentType);
            }
            if (selectedByType.has(equipmentType) && item.isEquipped) {
                return toEquipmentRecord(item, null);
            }
            return toEquipmentRecord(item);
        });
        const projectedPlayer = new Player({
            ...createLegacyPlayerSnapshot(panel.runtimePlayer).playerData,
            equipments: projectedEquipment
        });
        const projectedStats = getBattleStats(projectedPlayer);
        const selections = [...selectedByType.entries()].map(([equipmentType, selectedItem]) => {
            const currentItem = panel.equipments.find(
                (item) => item.isEquipped
                    && getEquipmentType(item) === equipmentType
            );
            if (!selectedItem) {
                return {
                    inventoryId: null,
                    alreadyEquipped: !currentItem,
                    equipmentType,
                    selectedItem: null,
                    replacedItem: currentItem || null,
                    unequip: true
                };
            }
            const replacedItem = currentItem
                && String(currentItem.uuid) !== String(selectedItem.uuid)
                ? currentItem
                : null;
            return {
                inventoryId: String(selectedItem.uuid),
                alreadyEquipped: selectedItem.isEquipped,
                equipmentType,
                selectedItem,
                replacedItem,
                unequip: false
            };
        });

        return {
            selections,
            hasChanges: selections.some((selection) => !selection.alreadyEquipped),
            currentStats: panel.currentStats,
            projectedStats,
            statChanges: getStatChanges(panel.currentStats, projectedStats)
        };
    }

    async equipItem(playerId, inventoryId) {
        const result = await this.equipLoadout(playerId, [inventoryId]);
        if (!result) return null;
        return {
            ...result.equippedItems[0],
            cultivationSettlement: result.cultivationSettlement
        };
    }

    async equipLoadout(playerId, inventoryIds = [], unequipTypes = []) {
        return this.unitOfWork.execute(async (client) => {
            const runtimePlayer = await this.playerRuntimeRepository.findById(playerId, {
                client,
                forUpdate: Boolean(client)
            });
            if (!runtimePlayer) return null;

            const snapshot = createLegacyPlayerSnapshot(runtimePlayer);
            const uniqueIds = [...new Set(inventoryIds.map(String))];
            const normalizedUnequipTypes = [...new Set(
                unequipTypes.map((type) => String(type).toUpperCase())
            )];
            if (!uniqueIds.length && !normalizedUnequipTypes.length) {
                throw new Error('EQUIPMENT_SELECTION_EMPTY');
            }
            const selectedItems = uniqueIds.map((inventoryId) => {
                const item = snapshot.inventoryItems.find(
                    (entry) => String(entry.uuid) === inventoryId
                );
                if (!item) throw new Error('ITEM_NOT_FOUND');
                if (item.type !== 'EQUIPMENT') throw new Error('NOT_EQUIPMENT');
                return item;
            });
            this.assertEquipmentRealmUnlocked(runtimePlayer, selectedItems);
            const selectedTypes = new Set(normalizedUnequipTypes);
            for (const item of selectedItems) {
                const equipmentType = getEquipmentType(item);
                if (!equipmentType) throw new Error('EQUIPMENT_TYPE_MISSING');
                if (selectedTypes.has(equipmentType)) {
                    throw new Error('DUPLICATE_EQUIPMENT_TYPE_SELECTION');
                }
                selectedTypes.add(equipmentType);
            }
            const unequippedItems = normalizedUnequipTypes.map((equipmentType) => (
                snapshot.inventoryItems.find(
                    (item) => item.type === 'EQUIPMENT'
                        && item.isEquipped
                        && getEquipmentType(item) === equipmentType
                ) || null
            )).filter(Boolean);
            const changedItems = [
                ...selectedItems.filter((item) => !item.isEquipped),
                ...unequippedItems
            ];

            const settlement = changedItems.length
                ? await this.cultivationService.settleRuntimePlayer(
                    playerId,
                    runtimePlayer,
                    { client }
                )
                : null;
            const equippedItems = [];
            for (const selectedItem of unequippedItems) {
                const equipmentType = getEquipmentType(selectedItem);
                await this.playerRuntimeRepository.unequipItem(
                    playerId,
                    equipmentType,
                    { client }
                );
                equippedItems.push({
                    name: selectedItem.name,
                    equipmentType,
                    slot: equipmentType,
                    replacedName: selectedItem.name,
                    alreadyEquipped: false,
                    unequipped: true
                });
            }
            for (const selectedItem of selectedItems) {
                const equipmentType = getEquipmentType(selectedItem);
                const replacedItem = snapshot.inventoryItems.find(
                    (item) => item.type === 'EQUIPMENT'
                        && item.isEquipped
                        && getEquipmentType(item) === equipmentType
                        && String(item.uuid) !== String(selectedItem.uuid)
                );
                if (!selectedItem.isEquipped) {
                    await this.playerRuntimeRepository.equipItem(playerId, {
                        inventoryId: String(selectedItem.uuid),
                        itemId: selectedItem.id,
                        slot: equipmentType
                    }, { client });
                }
                equippedItems.push({
                    name: selectedItem.name,
                    equipmentType,
                    slot: equipmentType,
                    replacedName: replacedItem?.name || null,
                    alreadyEquipped: selectedItem.isEquipped,
                    unequipped: false
                });
            }

            return {
                equippedItems,
                cultivationSettlement: settlement?.afkData || null
            };
        });
    }

    async unequipItem(playerId, equipmentType) {
        return this.unitOfWork.execute(async (client) => {
            const runtimePlayer = await this.playerRuntimeRepository.findById(playerId, {
                client,
                forUpdate: Boolean(client)
            });
            if (!runtimePlayer) return null;

            const snapshot = createLegacyPlayerSnapshot(runtimePlayer);
            const item = snapshot.inventoryItems.find(
                (entry) => entry.type === 'EQUIPMENT'
                    && entry.isEquipped
                    && getEquipmentType(entry) === String(equipmentType).toUpperCase()
            );
            if (!item) throw new Error('SLOT_EMPTY');

            const settlement = await this.cultivationService.settleRuntimePlayer(
                playerId,
                runtimePlayer,
                { client }
            );
            const result = await this.playerRuntimeRepository.unequipItem(
                playerId,
                item.equippedSlot,
                { client }
            );

            return {
                inventoryId: result.inventoryId,
                itemId: result.itemId,
                name: item.name || 'trang bi',
                equipmentType: getEquipmentType(item),
                cultivationSettlement: settlement.afkData
            };
        });
    }
}

