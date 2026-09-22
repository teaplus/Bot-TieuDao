import ItemFactory from '../../factories/ItemFactory.js';
import ItemGenerator from '../../factories/ItemGenerator.js';
import SpiritRootRoller from './SpiritRootRoller.js';
import SpiritRootQualityRoller from './SpiritRootQualityRoller.js';
import SpiritRootEffectResolver from './SpiritRootEffectResolver.js';
import DaoNamePolicy from './DaoNamePolicy.js';
import RealmStatProgressionCalculator from '../../core/RealmStatProgressionCalculator.js';
import SecureSeedProvider from '../../platform/random/SecureSeedProvider.js';
import createSeededRandom from '../../platform/random/createSeededRandom.js';

const STARTER_EQUIPMENT_ID = 'EQ_FIRE_WEAPON';
const STARTER_EQUIPMENT_RARITY = 'COMMON';
export default class PlayerStartService {
    constructor(options = {}) {
        this.playerRuntimeRepository = options.playerRuntimeRepository;
        this.gameDataManager = options.gameDataManager;
        this.random = options.random || null;
        this.seedProvider = options.seedProvider || new SecureSeedProvider();
        this.spiritRootRoller = options.spiritRootRoller || null;
        this.spiritRootQualityRoller = options.spiritRootQualityRoller || null;
        this.spiritRootEffectResolver = options.spiritRootEffectResolver
            || new SpiritRootEffectResolver({ gameDataManager: this.gameDataManager });
        this.rules = this.gameDataManager.getCollection('characterCreationRules');
        this.daoNamePolicy = options.daoNamePolicy || new DaoNamePolicy(this.rules.daoName);
    }

    getRules() {
        return this.rules;
    }

    async hasPlayer(playerId) {
        return Boolean(await this.playerRuntimeRepository.findById(playerId));
    }

    validateDaoName(value) {
        return this.daoNamePolicy.validate(value);
    }

    async startPlayer(playerId, daoName, options = {}) {
        const name = this.validateDaoName(daoName);
        const rerollsUsed = Number(options.rerollsUsed);
        if (!options.destiny) throw new Error('CHARACTER_DESTINY_REQUIRED');
        if (!Number.isSafeInteger(rerollsUsed)
            || rerollsUsed < 0
            || rerollsUsed > this.rules.maxRerolls) {
            throw new Error('CHARACTER_REROLL_COUNT_INVALID');
        }

        const spiritualRoot = this.gameDataManager.requireRecord(
            'spiritRoots',
            options.destiny.spiritRootId
        );
        const spiritRootQuality = this.gameDataManager.requireRecord(
            'spiritRootQualityTiers',
            options.destiny.spiritRootQualityTierId
        );
        const starterTemplate = ItemFactory.getTemplate(STARTER_EQUIPMENT_ID);
        const starterData = ItemGenerator.rollEquipment(starterTemplate, STARTER_EQUIPMENT_RARITY, {
            grade: 'HOANG',
            gradeQuality: 'LOW'
        });
        const starterCultivationArtId = this.rules.starterCultivationArtId;
        const cultivationArt = ItemFactory.createItem(starterCultivationArtId);
        if (!cultivationArt) throw new Error('STARTER_CULTIVATION_ART_NOT_FOUND');
        const startingMap = Object.values(this.gameDataManager.getCollection('maps') || {})
            .find((map) => map.isStartingMap === true);
        if (!startingMap) throw new Error('MAP_STARTING_LOCATION_MISSING');
        const startingRealm = Object.values(this.gameDataManager.getCollection('realms') || {})
            .sort((left, right) => left.order - right.order)[0];
        if (!startingRealm) throw new Error('REALM_STARTING_STATE_MISSING');
        const startingRealmStage = 1;
        const startingBaseStats = new RealmStatProgressionCalculator(
            Object.values(this.gameDataManager.getCollection('realms') || {}),
            this.gameDataManager.getCollection('progressionRules')
        ).calculate(startingRealm.id, startingRealmStage);
        const starterRecipes = this.rules.starterRecipeIds.map((recipeId) => (
            this.gameDataManager.requireRecord('craftTemplates', recipeId)
        ));

        const createdPlayer = await this.playerRuntimeRepository.createPlayer(playerId, {
            name,
            realmId: startingRealm.id,
            realmStage: startingRealmStage,
            baseStats: startingBaseStats,
            spiritRootId: spiritualRoot.id,
            spiritualRoot: spiritualRoot.legacyValue,
            spiritRootQualityTierId: spiritRootQuality.id,
            creationRerollsUsed: rerollsUsed,
            creationRuleRevision: this.rules.revision,
            cultivationArtId: starterCultivationArtId,
            starterRecipeIds: starterRecipes.map((recipe) => recipe.id),
            spiritStones: 100,
            currentMapId: startingMap.id,
            starterEquipment: {
                itemId: STARTER_EQUIPMENT_ID,
                rarity: starterData.rarity,
                grade: starterData.grade,
                gradeQuality: starterData.gradeQuality,
                fixedEffects: starterData.fixedEffects,
                affixes: starterData.affixes,
                elementIds: starterData.elementIds,
                generatedName: starterData.generatedName,
                equipmentType: 'WEAPON',
                equippedSlot: 'WEAPON'
            },
            starterCultivationArtItem: null
        });

        return {
            daoName: name,
            spiritualRoot: spiritualRoot.displayName,
            spiritRootId: spiritualRoot.id,
            spiritRootQualityTierId: spiritRootQuality.id,
            spiritRootQualityName: spiritRootQuality.displayName,
            spiritStones: createdPlayer?.spiritStones || '100',
            cultivationArtName: cultivationArt.name,
            cultivationArtRarity: cultivationArt.rarityInfo.name,
            starterRecipes: starterRecipes.map((recipe) => ({
                id: recipe.id,
                name: recipe.name
            })),
            starterEquipment: ItemFactory.createItem(STARTER_EQUIPMENT_ID, {
                rarity: starterData.rarity,
                grade: starterData.grade,
                gradeQuality: starterData.gradeQuality,
                fixedEffects: starterData.fixedEffects,
                affixes: starterData.affixes,
                elementIds: starterData.elementIds,
                generatedName: starterData.generatedName,
                equippedSlot: 'WEAPON'
            }),
            currentMap: {
                id: startingMap.id,
                name: startingMap.displayName
            },
            baseStats: startingBaseStats
        };
    }

    rollDestiny() {
        const random = this.random || createSeededRandom(this.seedProvider.nextSeed());
        const spiritualRoot = (this.spiritRootRoller || new SpiritRootRoller({
            gameDataManager: this.gameDataManager,
            random
        })).roll({
            poolId: this.rules.spiritRootQualityPoolId,
            rebirthCount: this.rules.rebirthCount
        });
        const qualityRoll = (this.spiritRootQualityRoller || new SpiritRootQualityRoller({
            gameDataManager: this.gameDataManager,
            random
        })).roll(this.rules.spiritRootQualityPoolId, this.rules.rebirthCount);
        const spiritRootQuality = qualityRoll.qualityTier;
        const runtimeRoot = {
            spiritRootId: spiritualRoot.id,
            spiritRootQualityTierId: spiritRootQuality.id
        };

        return Object.freeze({
            spiritRootId: spiritualRoot.id,
            spiritRootName: spiritualRoot.displayName,
            spiritRootLegacyValue: spiritualRoot.legacyValue,
            elementIds: Object.freeze([...(spiritualRoot.elementIds || [])]),
            spiritRootQualityTierId: spiritRootQuality.id,
            spiritRootQualityName: spiritRootQuality.displayName,
            spiritRootQualityOrder: spiritRootQuality.order,
            effects: this.spiritRootEffectResolver.getEffectProjection(runtimeRoot)
        });
    }

    getCreationOdds() {
        const rootRoller = new SpiritRootRoller({
            gameDataManager: this.gameDataManager,
            random: () => 0
        });
        const weightedRoots = rootRoller.getWeightedRoots({
            poolId: this.rules.spiritRootQualityPoolId,
            rebirthCount: this.rules.rebirthCount
        });
        const rootTotal = weightedRoots.reduce((total, entry) => total + entry.weight, 0);
        const pool = this.gameDataManager.requireRecord(
            'spiritRootRerollPools',
            this.rules.spiritRootQualityPoolId
        );
        const qualityRoller = new SpiritRootQualityRoller({
            gameDataManager: this.gameDataManager,
            random: () => 0
        });
        const bracket = qualityRoller.resolveBracket(pool, this.rules.rebirthCount);
        const qualityTotal = bracket.entries.reduce((total, entry) => total + entry.weight, 0);

        return Object.freeze({
            roots: Object.freeze(weightedRoots.map((entry) => Object.freeze({
                id: entry.spiritRoot.id,
                name: entry.spiritRoot.displayName,
                percent: entry.weight / rootTotal * 100
            }))),
            qualities: Object.freeze(bracket.entries.map((entry) => {
                const quality = this.gameDataManager.requireRecord(
                    'spiritRootQualityTiers',
                    entry.qualityTierId
                );
                return Object.freeze({
                    id: quality.id,
                    name: quality.displayName,
                    percent: qualityTotal > 0 ? entry.weight / qualityTotal * 100 : 0
                });
            }))
        });
    }
}
