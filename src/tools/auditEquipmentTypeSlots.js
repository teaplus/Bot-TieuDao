import fs from 'fs';
import EquipmentService from '../gameplay/player/EquipmentService.js';
import ItemFactory from '../factories/ItemFactory.js';
import { bootstrapGameData } from '../foundation/game-data/bootstrapGameData.js';
import { setGameDataManager } from '../foundation/game-data/gameDataContext.js';
import RuntimePlayerFactory from '../runtime/player/RuntimePlayerFactory.js';
import EffectFormatter from '../core/EffectFormatter.js';
import EquipCommand from '../commands/player/trangbi.js';

const gameDataManager = bootstrapGameData();
setGameDataManager(gameDataManager);

function assert(condition, message, details = null) {
    if (!condition) {
        const error = new Error(message);
        error.details = details;
        throw error;
    }
}

async function auditServiceReplacement() {
    const equippedArmor = ItemFactory.getTemplate('EQ_FIRE_ARMOR');
    const equippedNecklace = ItemFactory.getTemplate('EQ_FIRE_NECKLACE');
    const runtimePlayer = new RuntimePlayerFactory().create({
        playerId: 'equipment-type-audit',
        name: 'Equipment Type Audit',
        realmId: 1,
        realmStage: 1,
        cultivation: 0,
        cultivationArtId: 'CP_FIRE_HOANG',
        spiritualRoot: 'Hỏa Linh Căn',
        baseAtk: 10,
        baseDef: 10,
        baseHp: 100,
        baseSpd: 10,
        inventory: [
            { instanceId: 'E:1', itemId: 'EQ_FIRE_ARMOR', quantity: 1, rarity: 'COMMON', equippedSlot: 'ARMOR', instanceData: { equipmentType: 'ARMOR' } },
            {
                instanceId: 'E:2',
                itemId: 'EQ_WOOD_ARMOR',
                quantity: 1,
                rarity: 'COMMON',
                equippedSlot: null,
                instanceData: {
                    equipmentType: 'ARMOR',
                    fixedEffects: [{
                        modifierId: 'DEF_PERCENT',
                        attributeId: 'DEF',
                        stat: 'def',
                        mode: 'add_percent_base',
                        value: 0.1
                    }]
                }
            },
            { instanceId: 'E:3', itemId: 'EQ_FIRE_NECKLACE', quantity: 1, rarity: 'COMMON', equippedSlot: 'NECKLACE', instanceData: { equipmentType: 'NECKLACE' } },
            {
                instanceId: 'E:4',
                itemId: 'EQ_WOOD_WEAPON',
                quantity: 1,
                rarity: 'COMMON',
                equippedSlot: null,
                instanceData: {
                    equipmentType: 'WEAPON',
                    fixedEffects: [{
                        modifierId: 'ATK_PERCENT',
                        attributeId: 'ATK',
                        stat: 'atk',
                        mode: 'add_percent_base',
                        value: 0.2
                    }]
                }
            },
            {
                instanceId: 'E:5',
                itemId: 'EQ_FIRE_WEAPON',
                quantity: 1,
                rarity: 'COMMON',
                grade: 'HUYEN',
                gradeQuality: 'LOW',
                equippedSlot: null,
                instanceData: {
                    equipmentType: 'WEAPON',
                    grade: 'HUYEN',
                    gradeQuality: 'LOW',
                    fixedEffects: []
                }
            }
        ],
        skillIds: [],
        cultivationArtIds: ['CP_FIRE_HOANG']
    });
    let equipPayload = null;
    let unequipPayload = null;
    const service = new EquipmentService({
        unitOfWork: { execute: (work) => work({ transaction: true }) },
        cultivationService: {
            async settleRuntimePlayer() { return { afkData: { earned: '0', seconds: 0 } }; }
        },
        playerRuntimeRepository: {
            async findById() { return runtimePlayer; },
            async equipItem(_playerId, payload) { equipPayload = payload; },
            async unequipItem(_playerId, slot) {
                unequipPayload = { slot };
                return { inventoryId: 'E:1', itemId: 'EQ_FIRE_ARMOR' };
            }
        }
    });

    const preview = await service.previewEquipItem(runtimePlayer.playerId, 'E:2');
    assert(preview.statChanges.def.current === '10' && preview.statChanges.def.projected === '11',
        'Equipment preview did not use canonical Player stat calculation', preview.statChanges.def);
    assert(preview.replacedItem?.name === equippedArmor.name,
        'Equipment preview did not identify same-type replacement', preview);
    let realmLockedError = null;
    try {
        await service.previewEquipItem(runtimePlayer.playerId, 'E:5');
    } catch (error) {
        realmLockedError = error;
    }
    assert(realmLockedError?.code === 'EQUIPMENT_REALM_LOCKED'
        && realmLockedError?.requiredRealmCode === 'KET_DAN',
    'Equipment preview did not enforce grade requiredRealm', realmLockedError);
    const formattedEffect = EffectFormatter.format(preview.effects[0]);
    assert(formattedEffect.includes('+10%') && !formattedEffect.includes('0,1'),
        'Percent-rate effect is not formatted as a human-readable percentage', { formattedEffect });
    const loadoutPreview = await service.previewEquipmentLoadout(runtimePlayer.playerId, ['E:4', 'E:2']);
    assert(loadoutPreview.selections.length === 2 && loadoutPreview.hasChanges,
        'Multi-slot equipment preview did not retain both selections', loadoutPreview);
    assert(loadoutPreview.statChanges.atk.projected === '12'
        && loadoutPreview.statChanges.def.projected === '11',
    'Multi-slot equipment preview did not aggregate all selected equipment', loadoutPreview.statChanges);
    const unequipPreview = await service.previewEquipmentLoadout(
        runtimePlayer.playerId,
        ['E:4'],
        ['ARMOR']
    );
    assert(unequipPreview.selections.some((selection) => (
        selection.equipmentType === 'ARMOR'
            && selection.unequip
            && selection.replacedItem?.id === 'EQ_FIRE_ARMOR'
    )), 'Empty-slot selection did not preview the equipped item removal', unequipPreview);

    const result = await service.equipItem(runtimePlayer.playerId, 'E:2');
    assert(equipPayload?.slot === 'ARMOR', 'Equip mutation did not use ARMOR type', equipPayload);
    assert(result.replacedName === equippedArmor.name, 'Same-type equipment was not detected for replacement', result);
    assert(result.replacedName !== equippedNecklace.name, 'NECKLACE must not be replaced by ARMOR', result);
    const loadoutResult = await service.equipLoadout(runtimePlayer.playerId, ['E:4'], ['ARMOR']);
    assert(loadoutResult.equippedItems.some((item) => item.unequipped && item.equipmentType === 'ARMOR')
        && unequipPayload?.slot === 'ARMOR',
    'Empty-slot loadout did not persist the unequip action', { loadoutResult, unequipPayload });
    return { runtimePlayer, service };
}

async function auditDiscordPanelRuntime(fixture) {
    const payloads = [];
    let closedPayload = null;
    const user = {
        id: fixture.runtimePlayer.playerId,
        displayAvatarURL() { return 'https://example.com/avatar.png'; }
    };
    const components = [
        {
            user,
            customId: 'trangbi:equipment-panel-audit:select:WEAPON',
            values: ['E:4'],
            async deferUpdate() {}
        },
        {
            user,
            customId: 'trangbi:equipment-panel-audit:select:ARMOR',
            values: ['EMPTY_ARMOR'],
            async deferUpdate() {}
        },
        {
            user,
            customId: 'trangbi:equipment-panel-audit:confirm',
            async deferUpdate() {}
        },
        {
            user,
            customId: 'trangbi:equipment-panel-audit:close',
            async update(payload) { closedPayload = payload; }
        }
    ];
    const message = {
        async awaitMessageComponent(options) {
            const component = components.shift();
            assert(component && options.filter(component), 'ComponentSession rejected equipment panel component');
            return component;
        }
    };
    const interaction = {
        id: 'equipment-panel-audit',
        user,
        async deferReply() {},
        async editReply(payload) {
            payloads.push(payload);
            return message;
        }
    };
    await new EquipCommand().execute(interaction, {
        equipmentService: fixture.service,
        gameDataManager,
        logger: { error() {} }
    });

    assert(payloads[0]?.components?.length === 5,
        'Equipment panel must render four type rows and one action row');
    assert(payloads[0]?.components?.some((row) => row.toJSON().components?.some((component) => (
        component.options?.some((option) => option.value === 'EMPTY_ARMOR')
    ))), 'Equipment panel is missing the empty option used to unequip a slot');
    assert(payloads[0]?.embeds?.[0]?.data?.fields?.some((field) => field.name === 'Hiệu ứng chỉ số hiện tại'),
        'Equipment panel must always render current effects');
    assert(payloads[1]?.embeds?.[0]?.data?.fields?.some((field) => (
        field.name === 'Bộ trang bị đang chọn' && field.value.includes('Thanh Mộc')
    )),
    'First equipment selection was not retained in the pending loadout');
    assert(payloads[2]?.embeds?.[0]?.data?.fields?.some((field) => (
            field.name === 'Bộ trang bị đang chọn'
                && field.value.includes('Thanh Mộc')
                && field.value.includes('Để trống')
    )),
    'Selecting the empty armor option discarded the weapon selection or did not preview unequip');
    assert(payloads[2]?.embeds?.[0]?.data?.fields?.some((field) => field.name === 'Thuộc tính & hiệu ứng trang bị'),
        'Selecting equipment did not update the preview embed');
    assert(payloads[3]?.embeds?.[0]?.data?.fields?.some((field) => field.name === 'So sánh chỉ số vừa áp dụng'),
        'Saving equipment cleared the stat preview');
    assert(payloads[3]?.embeds?.[0]?.data?.fields?.some((field) => field.name.includes('vừa áp dụng')),
        'Saved equipment preview is not marked as applied');
    assert(closedPayload?.components?.every((row) => row.components.every((component) => component.data.disabled)),
        'Closing equipment panel did not disable all components');
}

function auditMigrationContract() {
    const migration = fs.readFileSync(
        new URL('../database/migrations/020_equipment_type_slots.sql', import.meta.url),
        'utf8'
    );
    assert(migration.includes('CREATE UNIQUE INDEX equipment_instances_player_slot_unique'), 'Active equipment unique index is missing');
    assert(migration.includes('PARTITION BY player_id'), 'Migration does not deterministically resolve duplicate types');
    assert(migration.includes("THEN 'ROBE'") && migration.includes("THEN 'ARMOR'"), 'Legacy migration does not separate ROBE and ARMOR');
    const necklaceMigration = fs.readFileSync(
        new URL('../database/migrations/031_equipment_necklace_wind_cutover.sql', import.meta.url),
        'utf8'
    );
    assert(necklaceMigration.includes("'NECKLACE'") && necklaceMigration.includes('EQ_WIND_'),
        'Necklace/Wind cutover migration is missing canonical replacements');
}

function auditEffectFormattingSemantics() {
    const rate = EffectFormatter.format({ stat: 'atk', mode: 'add_percent_base', value: 0.1 });
    const percentagePoint = EffectFormatter.format({ stat: 'critRate', mode: 'add_flat_base', value: 5 });
    const totalMultiplier = EffectFormatter.format({ stat: 'cultivation_speed', mode: 'mul_total', value: 1.5 });
    const negativeRate = EffectFormatter.format({ stat: 'atk', mode: 'add_percent_base', value: -0.2 });
    assert(rate.includes('+10%'), 'Percent rate 0.1 must display as +10%', { rate });
    assert(percentagePoint.includes('+5%') && !percentagePoint.includes('500%'),
        'Percentage-point stat must not be multiplied by 100', { percentagePoint });
    assert(totalMultiplier.includes('+50%'), 'Total multiplier 1.5 must display as +50%', { totalMultiplier });
    assert(negativeRate.includes('-20%') && !negativeRate.includes('+-'),
        'Negative percent formatting has an invalid sign', { negativeRate });
}

function auditDiscordSelectContract() {
    const equipCommand = fs.readFileSync(
        new URL('../commands/player/trangbi.js', import.meta.url),
        'utf8'
    );
    const unequipCommand = fs.readFileSync(
        new URL('../commands/player/thaotrangbi.js', import.meta.url),
        'utf8'
    );
    assert(equipCommand.includes('StringSelectMenuBuilder')
        && equipCommand.includes('types.length !== 4')
        && equipCommand.includes('trangbi:${sessionId}:select:${type.id}'),
    'Equip command must render four data-driven type select menus');
    assert(equipCommand.includes('Chỉ số chiến đấu dự kiến')
        && equipCommand.includes('Thuộc tính & hiệu ứng trang bị'),
    'Equip command must render stat and effect previews');
    assert(unequipCommand.includes('unequip_type:') && unequipCommand.includes('unequip_item:'),
        'Unequip command must select type before equipment instance');
    assert(equipCommand.includes("getCollection('equipmentTypes')"),
        'Equip type labels must come from data-driven equipment types');
}

try {
    const equipmentTypes = gameDataManager.getCollection('equipmentTypes');
    assert(equipmentTypes.ARMOR.slot === 'ARMOR', 'ARMOR type slot is not canonical');
    assert(equipmentTypes.NECKLACE.slot === 'NECKLACE', 'NECKLACE type slot is not canonical');
    assert(equipmentTypes.ARMOR.slot !== equipmentTypes.NECKLACE.slot, 'ARMOR and NECKLACE share a slot');
    const fixture = await auditServiceReplacement();
    await auditDiscordPanelRuntime(fixture);
    auditMigrationContract();
    auditEffectFormattingSemantics();
    auditDiscordSelectContract();
    console.log(JSON.stringify({
        status: 'PASS',
        equipmentTypes: Object.keys(equipmentTypes),
        invariant: 'ONE_EQUIPPED_ITEM_PER_EQUIPMENT_TYPE'
    }, null, 2));
} catch (error) {
    console.error(JSON.stringify({
        status: 'FAIL',
        message: error instanceof Error ? error.message : String(error),
        details: error?.details || null
    }, null, 2));
    process.exitCode = 1;
}
