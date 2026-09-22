import ItemGameDataResolver from '../../runtime/resolvers/ItemGameDataResolver.js';
import { createLegacyPlayerSnapshot } from './createLegacyPlayerSnapshot.js';
import CultivationArtAffinityResolver from './CultivationArtAffinityResolver.js';

const DIRECT_UNIT_OF_WORK = Object.freeze({ execute: (work) => work(null) });

function mapArtView(artData, active, affinity = null) {
    return {
        id: artData.id,
        name: artData.name,
        rarity: artData.rarity,
        description: artData.description,
        element: artData.element || null,
        cultivationBonus: affinity?.totalBonus ?? artData.cultivation_bonus ?? 0,
        baseCultivationBonus: affinity?.baseBonus ?? artData.baseCultivationBonus ?? 0,
        affinityCultivationBonus: affinity?.affinityBonus ?? 0,
        affinityPotentialBonus: artData.affinityCultivationBonus || 0,
        affinityMatched: affinity?.matched === true,
        effects: Object.freeze([
            ...(artData.effects || []),
            ...(affinity?.effects || [])
        ]),
        active
    };
}

export default class CultivationArtService {
    constructor(options = {}) {
        this.playerRuntimeRepository = options.playerRuntimeRepository;
        this.itemGameDataResolver = options.itemGameDataResolver || new ItemGameDataResolver();
        this.cultivationService = options.cultivationService;
        this.affinityResolver = options.affinityResolver || new CultivationArtAffinityResolver();
        this.unitOfWork = options.unitOfWork || DIRECT_UNIT_OF_WORK;
    }

    async listCultivationArts(playerId, runtimePlayer = null) {
        const player = runtimePlayer || await this.playerRuntimeRepository.findById(playerId);
        if (!player) return [];
        const states = await this.playerRuntimeRepository.listCultivationArtStates(playerId);

        return states
            .map((state) => {
                const artData = this.itemGameDataResolver.getCultivationArtData(state.artId);
                if (!artData) {
                    return null;
                }

                return mapArtView(
                    artData,
                    state.active,
                    this.affinityResolver.getProjection(player, state.artId)
                );
            })
            .filter(Boolean);
    }

    async listLearnableCultivationArts(playerId) {
        const runtimePlayer = await this.playerRuntimeRepository.findById(playerId);
        if (!runtimePlayer) {
            return null;
        }

        const learnedArts = await this.listCultivationArts(playerId, runtimePlayer);
        const learnedIds = new Set(learnedArts.map((art) => art.id));
        const snapshot = createLegacyPlayerSnapshot(runtimePlayer);

        const books = snapshot.inventoryItems.filter((item) => item.type === 'CULTIVATION_ART'
            && !learnedIds.has(item.cultivationArtId));

        return {
            runtimePlayer,
            books,
            learnedArts
        };
    }

    async learnCultivationArt(playerId, inventoryId) {
        return this.unitOfWork.execute(async (client) => {
            const runtimePlayer = await this.playerRuntimeRepository.findById(playerId, {
                client,
                forUpdate: Boolean(client)
            });
            if (!runtimePlayer) return null;

            const learnedIds = new Set(runtimePlayer.cultivationArtIds);
            const snapshot = createLegacyPlayerSnapshot(runtimePlayer);
            const selectedBook = snapshot.inventoryItems.find((item) => (
                String(item.uuid) === String(inventoryId)
                && item.type === 'CULTIVATION_ART'
                && !learnedIds.has(item.cultivationArtId)
            ));
            if (!selectedBook) throw new Error('ITEM_NOT_FOUND');

            const settlement = await this.cultivationService.settleRuntimePlayer(
                playerId,
                runtimePlayer,
                { client }
            );
            await this.playerRuntimeRepository.learnCultivationArt(playerId, {
                inventoryId,
                artId: selectedBook.cultivationArtId,
                itemId: selectedBook.id
            }, { client });

            const artData = this.itemGameDataResolver.getCultivationArtData(selectedBook.cultivationArtId);
            return {
                ...mapArtView(
                    artData,
                    true,
                    this.affinityResolver.getProjection(runtimePlayer, artData.id)
                ),
                cultivationSettlement: settlement.afkData
            };
        });
    }

    async equipCultivationArt(playerId, artId) {
        return this.unitOfWork.execute(async (client) => {
            const runtimePlayer = await this.playerRuntimeRepository.findById(playerId, {
                client,
                forUpdate: Boolean(client)
            });
            if (!runtimePlayer) return null;
            if (!runtimePlayer.cultivationArtIds.includes(artId)) {
                throw new Error('ART_NOT_LEARNED');
            }

            const artData = this.itemGameDataResolver.getCultivationArtData(artId);
            if (!artData) throw new Error('ART_NOT_FOUND');

            const settlement = await this.cultivationService.settleRuntimePlayer(
                playerId,
                runtimePlayer,
                { client }
            );
            await this.playerRuntimeRepository.equipCultivationArt(playerId, artId, { client });

            return {
                ...mapArtView(
                    artData,
                    true,
                    this.affinityResolver.getProjection(runtimePlayer, artData.id)
                ),
                cultivationSettlement: settlement.afkData
            };
        });
    }
}

