import ItemFactory from '../../factories/ItemFactory.js';
import SkillFactory from '../../factories/SkillFactory.js';
import SectEffectResolver from '../sect/SectEffectResolver.js';
import SpiritRootEffectResolver from './SpiritRootEffectResolver.js';
import CultivationArtAffinityResolver from './CultivationArtAffinityResolver.js';

function createLegacyItem(runtimeEntry) {
    return ItemFactory.createItem(runtimeEntry.templateId, {
        id: runtimeEntry.runtimeId,
        quantity: runtimeEntry.quantity,
        rarity: runtimeEntry.rarity,
        equipped_slot: runtimeEntry.equippedSlot,
        instance_data: runtimeEntry.instanceData
    });
}

function createLegacySkill(runtimeSkill) {
    return SkillFactory.create(runtimeSkill.templateId);
}

export function createLegacyPlayerSnapshot(runtimePlayer) {
    const inventoryEntries = runtimePlayer.inventory.getAllEntries();
    const inventoryItems = inventoryEntries
        .map(createLegacyItem)
        .filter(Boolean);

    const skills = runtimePlayer.runtimeSkills
        .map(createLegacySkill)
        .filter(Boolean);

    return {
        runtimePlayer,
        inventoryItems,
        skills,
        playerData: {
            id: runtimePlayer.playerId,
            name: runtimePlayer.name,
            spiritual_root: runtimePlayer.spiritualRoot,
            spirit_root_id: runtimePlayer.spiritRootId,
            spirit_root_quality_tier_id: runtimePlayer.spiritRootQualityTierId,
            realm_id: runtimePlayer.realmId,
            realm_stage: runtimePlayer.realmStage,
            cultivation_art_id: runtimePlayer.cultivationArtId,
            cultivation: runtimePlayer.cultivation,
            spirit_stones: runtimePlayer.currencies.spiritStones,
            base_atk: runtimePlayer.baseStats.atk,
            base_def: runtimePlayer.baseStats.def,
            base_hp: runtimePlayer.baseStats.hp,
            base_spd: runtimePlayer.baseStats.spd,
            rebirth_count: runtimePlayer.rebirthCount,
            last_cultivate: runtimePlayer.progress.lastCultivateAt,
            equipments: inventoryItems.filter((item) => item.type === 'EQUIPMENT'),
            passive_skills: skills.filter((skill) => skill.type === 'PASSIVE'),
            active_buffs: [
                {
                    id: `cultivation-art-affinity:${runtimePlayer.cultivationArtId}`,
                    effects: new CultivationArtAffinityResolver().getEffects(runtimePlayer)
                },
                {
                    id: `sect:${runtimePlayer.sectId || 'NONE'}`,
                    effects: new SectEffectResolver().getCultivationEffects(runtimePlayer)
                },
                {
                    id: `spirit-root:${runtimePlayer.spiritRootId || 'NONE'}`,
                    effects: new SpiritRootEffectResolver().getCultivationEffects(runtimePlayer)
                }
            ]
        }
    };
}
