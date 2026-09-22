import RuntimeEquipment from '../equipment/RuntimeEquipment.js';
import RuntimeInventory from '../inventory/RuntimeInventory.js';
import RuntimeItem from '../item/RuntimeItem.js';
import { normalizeDate, normalizeNumber } from '../shared/runtimeNormalization.js';
import { normalizeDecimal } from '../../shared/numeric/FixedDecimal.js';
import { normalizeIntegerAmount } from '../../shared/numeric/IntegerAmount.js';
import RuntimeSkill from '../skill/RuntimeSkill.js';
import RuntimePlayer from './RuntimePlayer.js';

function toRuntimeInventoryEntry(entry) {
    if (entry.equippedSlot) {
        return new RuntimeEquipment({
            runtimeId: entry.instanceId,
            templateId: entry.itemId,
            level: entry.instanceData?.level,
            fixedEffects: entry.instanceData?.fixedEffects,
            affixes: entry.instanceData?.affixes,
            grade: entry.instanceData?.grade,
            gradeQuality: entry.instanceData?.gradeQuality,
            enhanceLevel: entry.instanceData?.enhanceLevel,
            lockState: entry.instanceData?.lockState,
            createTime: entry.instanceData?.createTime,
            equippedSlot: entry.equippedSlot,
            rarity: entry.rarity,
            instanceData: entry.instanceData
        });
    }

    return new RuntimeItem({
        runtimeId: entry.instanceId,
        templateId: entry.itemId,
        quantity: entry.quantity,
        lockState: entry.instanceData?.lockState,
        createTime: entry.instanceData?.createTime,
        instanceData: entry.instanceData
    });
}

function createRuntimeInventory(entries) {
    const runtimeEntries = (entries || []).map(toRuntimeInventoryEntry);

    return new RuntimeInventory({
        runtimeItems: runtimeEntries.filter((entry) => entry instanceof RuntimeItem),
        runtimeEquipments: runtimeEntries.filter((entry) => entry instanceof RuntimeEquipment)
    });
}

function createRuntimeSkills(skillIds) {
    return (skillIds || []).map((templateId) => new RuntimeSkill({ templateId }));
}

export default class RuntimePlayerFactory {
    create(record) {
        const inventory = createRuntimeInventory(record.inventory);
        const learnedSkillIds = record.learnedSkillIds || record.skillIds || [];
        const equippedSkillIds = record.equippedSkillIds || record.skillIds || [];
        const runtimeSkills = createRuntimeSkills(learnedSkillIds);
        const walletBalances = Object.fromEntries(Object.entries(record.walletBalances || {}).map(
            ([currencyId, amount]) => [currencyId, normalizeIntegerAmount(amount)]
        ));
        const spiritStones = walletBalances.SPIRIT_STONE
            || normalizeIntegerAmount(record.spiritStones || 0);
        const sectPoints = walletBalances.SECT_POINT
            || normalizeIntegerAmount(record.sectPoints || 0);
        const honor = walletBalances.HONOR
            || normalizeIntegerAmount(record.honor || 0);
        const eventPoints = walletBalances.EVENT_POINT
            || normalizeIntegerAmount(record.eventPoints || 0);

        return new RuntimePlayer({
            playerId: record.playerId,
            name: record.name,
            accountStatus: record.accountStatus || 'REGISTERED',
            realmId: normalizeNumber(record.realmId, 1),
            realmStage: normalizeNumber(record.realmStage, 1),
            cultivation: normalizeDecimal(record.cultivation || 0),
            cultivationArtId: record.cultivationArtId || 'CP_NEUTRAL_HOANG',
            spiritualRoot: record.spiritualRoot || 'Tap Can',
            spiritRootId: record.spiritRootId || null,
            spiritRootQualityTierId: record.spiritRootQualityTierId || null,
            sectId: record.sectId || null,
            sectRejoinAvailableAt: normalizeDate(record.sectRejoinAvailableAt),
            sectPolicyRevision: record.sectPolicyRevision || null,
            rebirthCount: normalizeIntegerAmount(record.rebirthCount || 0),
            rebirthPolicyRevision: normalizeNumber(record.rebirthPolicyRevision, 1),
            currencies: {
                ...walletBalances,
                SPIRIT_STONE: spiritStones,
                SECT_POINT: sectPoints,
                HONOR: honor,
                EVENT_POINT: eventPoints,
                spiritStones,
                sectPoints,
                honor,
                eventPoints
            },
            baseStats: {
                atk: normalizeIntegerAmount(record.baseAtk ?? 10),
                def: normalizeIntegerAmount(record.baseDef ?? 10),
                hp: normalizeIntegerAmount(record.baseHp ?? 100),
                spd: normalizeIntegerAmount(record.baseSpd ?? 10)
            },
            inventory,
            equipmentIds: inventory.runtimeEquipments.map((equipment) => equipment.runtimeId),
            learnedSkillIds,
            equippedSkillIds,
            cultivationArtIds: Object.freeze([...(record.cultivationArtIds || [])]),
            runtimeSkills,
            activeEffects: [],
            progress: {
                lastTreasureHuntAt: normalizeDate(record.lastTreasureHunt),
                lastCultivateAt: normalizeDate(record.lastCultivate)
            },
            timestamps: {
                createdAt: normalizeDate(record.createdAt),
                updatedAt: normalizeDate(record.updatedAt)
            }
        });
    }
}
