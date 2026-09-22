import Player from '../../core/Player.js';
import EffectResolver from '../../core/EffectResolver.js';
import { createLegacyPlayerSnapshot } from './createLegacyPlayerSnapshot.js';
import SystemTimeProvider from '../../platform/time/SystemTimeProvider.js';
import SpiritRootEffectResolver from './SpiritRootEffectResolver.js';
import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';

export function buildAttributeBonusProjection(player, spiritRootEffects = []) {
    const effects = EffectResolver.aggregateEffects([
        ...EffectResolver.getEquipmentEffects(player),
        ...EffectResolver.getCultivationArtEffects(player),
        ...spiritRootEffects
    ]);

    return Object.freeze(effects.map((effect) => Object.freeze({
        stat: effect.stat,
        mode: effect.mode,
        value: effect.value,
        sources: Object.freeze([...(effect.sources || [])])
    })));
}

export default class PlayerReadService {
    constructor(options = {}) {
        this.playerRuntimeRepository = options.playerRuntimeRepository;
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.timeProvider = options.timeProvider || new SystemTimeProvider();
        this.spiritRootEffectResolver = options.spiritRootEffectResolver
            || new SpiritRootEffectResolver(options);
    }

    async getCanonicalProfileView(playerId) {
        const runtimePlayer = await this.playerRuntimeRepository.findById(playerId);
        if (!runtimePlayer) {
            return null;
        }

        const snapshot = createLegacyPlayerSnapshot(runtimePlayer);
        const player = new Player(snapshot.playerData);
        const persistedCultivation = player.cultivation;
        const previewData = player.calculateOfflineCultivation(this.timeProvider.now());

        return {
            runtimePlayer,
            player,
            skills: snapshot.skills,
            spiritRootEffects: this.spiritRootEffectResolver.getEffectProjection?.(runtimePlayer)
                || Object.freeze([]),
            attributeBonuses: buildAttributeBonusProjection(
                player,
                this.spiritRootEffectResolver.getAttributeEffects(runtimePlayer)
            ),
            cultivationPreview: {
                ...previewData,
                persistedCultivation,
                projectedCultivation: player.cultivation,
                persisted: false
            }
        };
    }

    async getPublicProfileView(playerId) {
        const canonical = await this.getCanonicalProfileView(playerId);
        if (!canonical) {
            return null;
        }

        const { runtimePlayer, player, skills, cultivationPreview } = canonical;
        const spiritRootQuality = this.spiritRootEffectResolver.getQualityTier(runtimePlayer);

        return Object.freeze({
            name: player.name,
            realm: Object.freeze({
                name: player.realmInfo.name,
                stage: player.realmStage
            }),
            spiritualRoot: player.spiritualRoot,
            spiritRootQuality: spiritRootQuality ? Object.freeze({
                id: spiritRootQuality.id,
                name: spiritRootQuality.displayName,
                order: spiritRootQuality.order
            }) : null,
            cultivationArt: Object.freeze({
                name: player.cultivationArt.name,
                rarityName: player.cultivationArt.rarityInfo.name
            }),
            spiritStones: player.spiritStones,
            cultivation: Object.freeze({
                current: player.cultivation,
                speedPerMinute: cultivationPreview.gainPerMinute,
                pending: cultivationPreview.earned,
                previewPersisted: cultivationPreview.persisted
            }),
            stats: Object.freeze({
                hp: player.getFinalStat('hp'),
                atk: player.getFinalStat('atk'),
                def: player.getFinalStat('def'),
                spd: player.getFinalStat('spd')
            }),
            equipment: Object.freeze(player.equipments
                .filter((item) => item.isEquipped)
                .map((item) => Object.freeze({
                    slot: item.equippedSlot,
                    name: item.name,
                    rarityName: item.rarityInfo.name
                }))),
            skills: Object.freeze(skills.map((skill) => Object.freeze({
                name: skill.name,
                type: skill.type
            }))),
            effects: Object.freeze(player.effects.map((effect) => Object.freeze({
                stat: effect.stat,
                mode: effect.mode,
                value: effect.value
            })))
        });
    }

    async getManagementProfileView(playerId) {
        return this.getCanonicalProfileView(playerId);
    }

    async getProfileView(playerId) {
        return this.getManagementProfileView(playerId);
    }

    async getInventoryView(playerId) {
        const runtimePlayer = await this.playerRuntimeRepository.findById(playerId);
        if (!runtimePlayer) {
            return null;
        }

        const snapshot = createLegacyPlayerSnapshot(runtimePlayer);

        return {
            runtimePlayer,
            items: snapshot.inventoryItems,
            slotUsage: runtimePlayer.inventory.getAllEntries().length,
            slotCapacity: Number(
                this.gameDataManager.getCollection('itemRules')?.inventory?.defaultSlot || 0
            )
        };
    }
}

