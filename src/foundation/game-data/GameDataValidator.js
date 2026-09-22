import AppError from '../../shared/errors/AppError.js';

function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateElementWeights(path, action, gameData, errors) {
    if (action?.elementWeights == null) return;
    if (!isPlainObject(action.elementWeights)) {
        errors.push(`${path}.elementWeights must be an object`);
        return;
    }
    const entries = Object.entries(action.elementWeights);
    if (!['DAMAGE', 'CHAIN_DAMAGE'].includes(action.type)) {
        errors.push(`${path}.elementWeights is only supported for DAMAGE or CHAIN_DAMAGE`);
    }
    if (entries.length < 2) {
        errors.push(`${path}.elementWeights must contain at least two elements`);
    }
    if (action.element) {
        errors.push(`${path}.element and elementWeights are mutually exclusive`);
    }
    let total = 0;
    for (const [elementId, rawWeight] of entries) {
        if (!gameData.elements?.[elementId]) {
            errors.push(`${path}.elementWeights references missing elements.${elementId}`);
        }
        const weight = Number(rawWeight);
        if (!Number.isFinite(weight) || weight <= 0 || weight > 100) {
            errors.push(`${path}.elementWeights.${elementId} must be within (0, 100]`);
        } else {
            total += weight;
        }
    }
    if (Math.abs(total - 100) > 1e-9) {
        errors.push(`${path}.elementWeights must total exactly 100`);
    }
}

export default class GameDataValidator {
    validateAll(gameData) {
        const errors = [];

        this.validateRequiredCollections(gameData, errors);
        this.validateCrossReferences(gameData, errors);

        if (errors.length > 0) {
            throw new AppError('Game data validation failed', {
                code: 'GAME_DATA_VALIDATION_FAILED',
                details: { errors }
            });
        }
    }

    validateRequiredCollections(gameData, errors) {
        [
            'attributes',
            'elements',
            'elementRelations',
            'spiritRoots',
            'spiritRootQualityTiers',
            'spiritRootRerollPools',
            'idleSources',
            'cultivationRules',
            'progressionRules',
            'rebirthRules',
            'economyRules',
            'spiritStoneTransferRules',
            'earningActivities',
            'earningActivityPolicy',
            'miniGameRules',
            'slotRules',
            'wordChainRules',
            'rewardRuntimeRules',
            'idempotencyRules',
            'characterCreationRules',
            'characterResetRules',
            'breakthroughRules',
            'targets',
            'conditions',
            'actionTypes',
            'formulas',
            'coreEffects',
            'skillDefinitions',
            'battleRules',
            'realms',
            'itemTemplates',
            'skillRules',
            'skills',
            'effects',
            'cultivationArts',
            'rarities',
            'modifiers',
            'rewardTables',
            'monsterTemplates',
            'monsterVariants',
            'monsterQualityTiers',
            'monsterQualityRules',
            'monsterQualityPools',
            'monsterSkillCatalog',
            'secretRealmBossPools',
            'monsterAiProfiles',
            'monsterRules',
            'monsterRewardScaling',
            'maps',
            'monsterSpawnPools',
            'equipmentTypes',
            'equipmentGrades',
            'equipmentGradePools',
            'equipmentAffixes',
            'sectTemplates',
            'sectPolicy',
            'sectRewardPools',
            'sectExchangeRules',
            'gatheringRules',
            'gatheringResources',
            'mapGatheringPools',
            'gatheringTemplates',
            'craftTemplates',
            'professions',
            'professionGrades',
            'professionRules',
            'shopRules',
            'treasureHunt'
        ].forEach((collectionName) => {
            if (!isPlainObject(gameData[collectionName])) {
                errors.push(`${collectionName} must be a JSON object`);
                return;
            }

            if (Object.keys(gameData[collectionName]).length === 0) {
                errors.push(`${collectionName} must not be empty`);
            }
        });
    }

    validateCrossReferences(gameData, errors) {
        this.validateCoreDataCollections(gameData, errors);
        this.validateBattleRules(gameData, errors);
        this.validateCharacterCreationRules(gameData, errors);
        this.validateCharacterResetRules(gameData, errors);
        this.validateCultivationArtReferences(gameData, errors);
        this.validateItemTemplateReferences(gameData, errors);
        this.validateSkillReferences(gameData, errors);
        this.validateRewardTables(gameData, errors);
        this.validateMonsterRewardScaling(gameData, errors);
        this.validateMonsterData(gameData, errors);
        this.validateMapData(gameData, errors);
        this.validateEquipmentAffixes(gameData, errors);
        this.validateSectTemplates(gameData, errors);
        this.validateGatheringTemplates(gameData, errors);
        this.validateProfessionData(gameData, errors);
        this.validateShopRules(gameData, errors);
        this.validateEarningActivities(gameData, errors);
        this.validateSlotRules(gameData, errors);
        this.validateMiniGameRules(gameData, errors);
        this.validateSpiritStoneTransferRules(gameData, errors);
        this.validateWordChainRules(gameData, errors);
        this.validateTreasureHunt(gameData, errors);
        this.validateEconomyTemplates(gameData, errors);
    }

    validateEarningActivities(gameData, errors) {
        const policy = gameData.earningActivityPolicy || {};
        if (!Number.isSafeInteger(policy.version) || policy.version <= 0) {
            errors.push('earningActivityPolicy.version must be a positive safe integer');
        }
        if (!String(policy.revision || '').trim()) {
            errors.push('earningActivityPolicy.revision must not be blank');
        }
        if (!gameData.currencies?.[policy.currencyId]) {
            errors.push('earningActivityPolicy.currencyId references missing currency');
        }
        if (policy.scalingSource !== 'SHOP_MAP_BASE_PRICE') {
            errors.push('earningActivityPolicy.scalingSource must be SHOP_MAP_BASE_PRICE');
        }
        const commands = new Set();
        for (const [activityId, activity] of Object.entries(gameData.earningActivities || {})) {
            const path = `earningActivities.${activityId}`;
            if (!['DAILY', 'WORK'].includes(activity.type)) {
                errors.push(`${path}.type must be DAILY or WORK`);
            }
            if (!String(activity.command || '').trim()) {
                errors.push(`${path}.command must not be blank`);
            } else if (commands.has(activity.command)) {
                errors.push(`${path}.command duplicates ${activity.command}`);
            }
            commands.add(activity.command);
            if (activity.periodType !== 'DAILY'
                || !Number.isSafeInteger(activity.periodLimit) || activity.periodLimit <= 0) {
                errors.push(`${path} must define a positive DAILY period limit`);
            }
            if (activity.type === 'DAILY') {
                if (!Number.isSafeInteger(activity.rewardMultiplierBasisPoints)
                    || activity.rewardMultiplierBasisPoints <= 0) {
                    errors.push(`${path}.rewardMultiplierBasisPoints must be positive`);
                }
            } else {
                if (!Number.isSafeInteger(activity.cooldownSeconds) || activity.cooldownSeconds <= 0) {
                    errors.push(`${path}.cooldownSeconds must be positive`);
                }
                if (!Number.isSafeInteger(activity.rewardMinMultiplierBasisPoints)
                    || !Number.isSafeInteger(activity.rewardMaxMultiplierBasisPoints)
                    || activity.rewardMinMultiplierBasisPoints <= 0
                    || activity.rewardMaxMultiplierBasisPoints < activity.rewardMinMultiplierBasisPoints) {
                    errors.push(`${path} reward multiplier range is invalid`);
                }
                if (!Array.isArray(activity.flavors) || activity.flavors.length === 0) {
                    errors.push(`${path}.flavors must be a non-empty array`);
                }
            }
        }
    }

    validateSlotRules(gameData, errors) {
        const rules = gameData.slotRules || {};
        if (!Number.isSafeInteger(rules.version) || rules.version <= 0) {
            errors.push('slotRules.version must be a positive safe integer');
        }
        if (!String(rules.revision || '').trim()) {
            errors.push('slotRules.revision must not be blank');
        }
        if (!rules.profiles?.[rules.activeProfileId]) {
            errors.push('slotRules.activeProfileId references a missing profile');
        }
        for (const [profileId, profile] of Object.entries(rules.profiles || {})) {
            const path = `slotRules.profiles.${profileId}`;
            const symbols = profile.symbols || [];
            const symbolIds = new Set(symbols.map((symbol) => symbol.id));
            const totalWeight = symbols.reduce((total, symbol) => total + Number(symbol.weight || 0), 0);
            if (profile.id !== profileId || !String(profile.label || '').trim()) {
                errors.push(`${path} requires matching id and label`);
            }
            if (profile.reelCount !== 3 || profile.requiredMatchCount !== 3) {
                errors.push(`${path} requires exactly three reels and three matches`);
            }
            if (symbols.length === 0 || symbolIds.size !== symbols.length || totalWeight !== 100) {
                errors.push(`${path}.symbols must be unique, non-empty and total weight 100`);
            }
            if (symbols.some((symbol) => (
                !String(symbol.id || '').trim()
                || !String(symbol.label || '').trim()
                || !String(symbol.icon || '').trim()
                || !Number.isSafeInteger(symbol.weight)
                || symbol.weight <= 0
                || !Number.isSafeInteger(symbol.payoutMultiplierBasisPoints)
                || symbol.payoutMultiplierBasisPoints <= 0
            ))) {
                errors.push(`${path} contains an invalid symbol`);
            }
            if (!Number.isSafeInteger(profile.hitRate?.partsPerMillion)
                || profile.hitRate.partsPerMillion <= 0
                || profile.hitRate.partsPerMillion >= 1000000) {
                errors.push(`${path}.hitRate must be within (0, 1000000) ppm`);
            }
            if (!Number.isSafeInteger(profile.rtp?.partsPerMillion)
                || profile.rtp.partsPerMillion <= 0
                || profile.rtp.partsPerMillion >= 1000000) {
                errors.push(`${path}.rtp must be within (0, 1000000) ppm`);
            }
        }
    }

    validateMiniGameRules(gameData, errors) {
        const rules = gameData.miniGameRules || {};
        if (!Number.isSafeInteger(rules.version) || rules.version <= 0) {
            errors.push('miniGameRules.version must be a positive safe integer');
        }
        if (!String(rules.revision || '').trim()) {
            errors.push('miniGameRules.revision must not be blank');
        }
        if (!gameData.currencies?.[rules.currencyId]) {
            errors.push('miniGameRules.currencyId references missing currency');
        }
        if (rules.currencyPolicy !== 'VIRTUAL_ONLY_NO_REAL_MONEY_VALUE') {
            errors.push('miniGameRules.currencyPolicy must be VIRTUAL_ONLY_NO_REAL_MONEY_VALUE');
        }
        if (rules.betPolicy?.minimumSource !== 'SHOP_MAP_BASE_PRICE'
            || rules.betPolicy?.minimumMultiplierBasisPoints !== 10000
            || rules.betPolicy?.maximumSource !== 'WALLET_BALANCE'
            || rules.betPolicy?.dailyRoundLimit !== null) {
            errors.push('miniGameRules.betPolicy does not match approved unlimited-round policy');
        }
        for (const [gameId, game] of Object.entries(rules.games || {})) {
            const path = `miniGameRules.games.${gameId}`;
            if (![
                'ACTIVE', 'BALANCE_BLOCKED', 'SESSION_BLOCKED', 'GAMEPLAY_BLOCKED'
            ].includes(game.status)) {
                errors.push(`${path}.status is invalid`);
            }
            if (game.status === 'ACTIVE' && (!game.paytable || !game.rtp)) {
                errors.push(`${path} ACTIVE game requires paytable and rtp`);
            }
            if (game.status.endsWith('_BLOCKED') && !String(game.blockedBy || '').trim()) {
                errors.push(`${path}.blockedBy must not be blank`);
            }
            if (gameId === 'HIGH_LOW') {
                if (game.paytable?.minimumNumber !== 1
                    || game.paytable?.maximumNumber !== 101
                    || game.paytable?.midpointNumber !== 51
                    || game.paytable?.correctPayoutMultiplierBasisPoints !== 20000
                    || game.paytable?.tieSettlement !== 'LOSE_WAGER'
                    || game.rtp?.partsPerMillion !== 990099
                    || game.settlementPolicy !== 'PERSISTED_TWO_STEP') {
                    errors.push(`${path}.paytable does not match approved private 1..101 policy`);
                }
                if (game.sessionPolicy?.ttlSeconds !== 120
                    || game.sessionPolicy?.expirySettlement !== 'LAZY_REFUND_WAGER'
                    || game.sessionPolicy?.componentOwnership !== 'PLAYER_ONLY') {
                    errors.push(`${path}.sessionPolicy does not match approved lazy refund policy`);
                }
            }
            if (gameId === 'BLACKJACK') {
                if (game.paytable?.deckCount !== 1
                    || game.paytable?.dealerPolicy !== 'STAND_ALL_17'
                    || game.paytable?.naturalPayoutMultiplierBasisPoints !== 20000
                    || game.paytable?.winPayoutMultiplierBasisPoints !== 20000
                    || game.paytable?.pushPayoutMultiplierBasisPoints !== 10000
                    || game.paytable?.doublePolicy !== 'INITIAL_TWO_CARDS_ONE_DRAW_AUTO_STAND'
                    || game.paytable?.splitPolicy !== 'DISABLED'
                    || game.rtp?.model !== 'PLAYER_STRATEGY_DEPENDENT'
                    || game.settlementPolicy !== 'PERSISTED_MULTI_STEP') {
                    errors.push(`${path} does not match approved Blackjack MVP policy`);
                }
                if (game.sessionPolicy?.ttlSeconds !== 120
                    || game.sessionPolicy?.expirySettlement !== 'LAZY_AUTO_STAND'
                    || game.sessionPolicy?.componentOwnership !== 'PLAYER_ONLY') {
                    errors.push(`${path}.sessionPolicy does not match approved auto-stand policy`);
                }
            }
            const rtp = Number(game.rtp?.partsPerMillion);
            if (game.rtp?.model !== 'PLAYER_STRATEGY_DEPENDENT'
                && game.rtp && (!Number.isSafeInteger(rtp) || rtp < 0 || rtp >= 1000000)) {
                errors.push(`${path}.rtp.partsPerMillion must be an integer within [0, 1000000)`);
            }
            if (gameId === 'SLOT' && game.status === 'ACTIVE') {
                const symbols = game.paytable?.symbols || [];
                const weights = symbols.reduce((total, symbol) => total + Number(symbol.weight || 0), 0);
                if (game.paytable?.reelCount !== 3 || game.paytable?.requiredMatchCount !== 3) {
                    errors.push(`${path}.paytable requires exactly three reels and three matches`);
                }
                if (game.balanceSource !== 'SLOT_ACTIVE_PROFILE'
                    || game.balanceProfileId !== gameData.slotRules?.activeProfileId) {
                    errors.push(`${path} must resolve the active slotRules profile`);
                }
                if (!Array.isArray(symbols) || symbols.length === 0 || weights !== 100) {
                    errors.push(`${path}.paytable.symbols must be non-empty and total weight 100`);
                }
                if (symbols.some((symbol) => (
                    !String(symbol.id || '').trim()
                    || !String(symbol.label || '').trim()
                    || !String(symbol.icon || '').trim()
                    || !Number.isSafeInteger(symbol.weight)
                    || symbol.weight <= 0
                    || !Number.isSafeInteger(symbol.payoutMultiplierBasisPoints)
                    || symbol.payoutMultiplierBasisPoints <= 0
                ))) {
                    errors.push(`${path}.paytable contains an invalid symbol`);
                } else if (weights === 100) {
                    const calculatedRtp = symbols.reduce((total, symbol) => (
                        total
                        + (BigInt(symbol.weight) ** 3n)
                        * BigInt(symbol.payoutMultiplierBasisPoints)
                        * 1000000n
                    ), 0n) / (100n ** 3n * 10000n);
                    if (calculatedRtp !== BigInt(game.rtp?.partsPerMillion || -1)) {
                        errors.push(`${path}.rtp does not match the configured paytable`);
                    }
                }
                if (game.settlementPolicy !== 'ATOMIC_SINGLE_REQUEST') {
                    errors.push(`${path}.settlementPolicy must be ATOMIC_SINGLE_REQUEST`);
                }
            }
        }
    }

    validateSpiritStoneTransferRules(gameData, errors) {
        const rules = gameData.spiritStoneTransferRules || {};
        if (!Number.isSafeInteger(rules.version) || rules.version <= 0
            || !String(rules.revision || '').trim()
            || rules.currencyId !== 'SPIRIT_STONE'
            || rules.senderEligibility !== 'REGISTERED_ONLY'
            || rules.recipientEligibility !== 'REGISTERED_OR_GUEST_AUTO_CREATE'
            || rules.minimumAmount !== '1'
            || rules.maximumSource !== 'SENDER_WALLET_BALANCE'
            || rules.feeBasisPoints !== 0
            || rules.dailyTransferLimit !== null
            || rules.confirmation?.required !== true
            || rules.confirmation?.ttlSeconds !== 60
            || rules.confirmation?.ownerOnly !== true
            || rules.receiptVisibility !== 'PUBLIC_WITHOUT_BALANCES') {
            errors.push('spiritStoneTransferRules does not match approved Q-ECONOMY-017 policy');
        }
    }

    validateWordChainRules(gameData, errors) {
        const rules = gameData.wordChainRules || {};
        const input = rules.inputPolicy || {};
        const session = rules.sessionPolicy || {};
        const reward = rules.rewardPolicy || {};
        if (!Number.isSafeInteger(rules.version) || rules.version <= 0) {
            errors.push('wordChainRules.version must be a positive safe integer');
        }
        for (const [field, value] of [
            ['revision', rules.revision],
            ['dictionaryRevision', rules.dictionaryRevision],
            ['languageCode', rules.languageCode],
            ['command', rules.command]
        ]) {
            if (!String(value || '').trim()) errors.push(`wordChainRules.${field} must not be blank`);
        }
        if (input.partCount !== 2
            || !Number.isSafeInteger(input.maxLength) || input.maxLength <= 0
            || input.unicodeNormalization !== 'NFC'
            || input.casePolicy !== 'LOWERCASE_VI'
            || input.punctuationPolicy !== 'REJECT'
            || input.disallowConsecutiveSuccessfulPlayer !== true
            || !Array.isArray(input.denylist)) {
            errors.push('wordChainRules.inputPolicy does not match approved two-part policy');
        }
        if (session.scope !== 'GUILD_CHANNEL'
            || session.timeoutSeconds !== null
            || session.maxQualifiedFailures !== 10
            || session.failureCounterPolicy !== 'CUMULATIVE_NO_RESET_ON_SUCCESS'
            || session.manualStopSettlement !== 'CANCEL_NO_REWARD'
            || session.minimumDistinctParticipants !== 3) {
            errors.push('wordChainRules.sessionPolicy does not match approved session policy');
        }
        if (!gameData.currencies?.[reward.currencyId]
            || reward.scalingSource !== 'WINNER_MAP_BASE_PRICE'
            || reward.baseMultiplierBasisPoints !== 10000
            || reward.stepEveryValidMoves !== 10
            || reward.stepMultiplierBasisPoints !== 2500
            || reward.maximumMultiplierBasisPoints !== 20000
            || reward.periodType !== 'DAILY'
            || reward.periodLimit !== 10) {
            errors.push('wordChainRules.rewardPolicy does not match approved reward policy');
        }
    }

    validateBattleRules(gameData, errors) {
        const roundLimit = Number(gameData.battleRules?.roundLimit);
        if (!Number.isSafeInteger(roundLimit) || roundLimit < 1) {
            errors.push('battleRules.roundLimit must be a positive safe integer');
        }
    }

    validateCharacterCreationRules(gameData, errors) {
        const rules = gameData.characterCreationRules || {};
        if (!Number.isSafeInteger(rules.revision) || rules.revision <= 0) {
            errors.push('characterCreationRules.revision must be a positive safe integer');
        }
        if (!Number.isSafeInteger(rules.sessionTtlSeconds) || rules.sessionTtlSeconds <= 0) {
            errors.push('characterCreationRules.sessionTtlSeconds must be a positive safe integer');
        }
        if (!Number.isSafeInteger(rules.maxRerolls) || rules.maxRerolls < 0) {
            errors.push('characterCreationRules.maxRerolls must be a non-negative safe integer');
        }
        if (!/^\d+$/.test(String(rules.rebirthCount || ''))) {
            errors.push('characterCreationRules.rebirthCount must be a non-negative integer string');
        }
        if (!gameData.spiritRootRerollPools?.[rules.spiritRootQualityPoolId]) {
            errors.push(
                `characterCreationRules.spiritRootQualityPoolId references missing `
                + `spiritRootRerollPools.${rules.spiritRootQualityPoolId}`
            );
        }
        if (!Array.isArray(rules.starterRecipeIds) || rules.starterRecipeIds.length === 0) {
            errors.push('characterCreationRules.starterRecipeIds must be a non-empty array');
        } else {
            const starterRecipeIds = new Set(rules.starterRecipeIds);
            if (starterRecipeIds.size !== rules.starterRecipeIds.length) {
                errors.push('characterCreationRules.starterRecipeIds must not contain duplicates');
            }
            for (const recipeId of starterRecipeIds) {
                const recipe = gameData.craftTemplates?.[recipeId];
                if (!recipe) {
                    errors.push(
                        `characterCreationRules.starterRecipeIds references missing `
                        + `craftTemplates.${recipeId}`
                    );
                } else if (recipe.unlockMode !== 'LEARNED') {
                    errors.push(
                        `characterCreationRules starter recipe ${recipeId} must use LEARNED unlockMode`
                    );
                }
            }
        }

        const minimum = rules.daoName?.minLength;
        const maximum = rules.daoName?.maxLength;
        if (!Number.isSafeInteger(minimum) || minimum < 1) {
            errors.push('characterCreationRules.daoName.minLength must be a positive safe integer');
        }
        if (!Number.isSafeInteger(maximum) || maximum < minimum || maximum > 100) {
            errors.push(
                'characterCreationRules.daoName.maxLength must be between minLength and 100'
            );
        }
    }

    validateCharacterResetRules(gameData, errors) {
        const rules = gameData.characterResetRules || {};
        if (!Number.isSafeInteger(rules.version) || rules.version <= 0
            || !String(rules.revision || '').trim()
            || rules.command !== 'xoanhanvat'
            || !Array.isArray(rules.retainedCurrencyIds)
            || rules.retainedCurrencyIds.length !== 1
            || rules.retainedCurrencyIds[0] !== 'SPIRIT_STONE'
            || rules.retainEconomyHistory !== true
            || rules.starterCurrencyGrantOnRecreate !== false
            || !Number.isSafeInteger(rules.cooldownSeconds) || rules.cooldownSeconds < 0
            || rules.confirmationTtlSeconds !== 60
            || rules.activeStatePolicy !== 'BLOCK_ACTIVITY_CRAFT_MINIGAME'
            || rules.resetTargetAccountStatus !== 'GUEST') {
            errors.push('characterResetRules does not match approved Q-PLAYER-002 policy');
        }
    }

    validateMonsterRewardScaling(gameData, errors) {
        const config = gameData.monsterRewardScaling || {};
        const currency = config.currency || {};
        const realmOrders = new Set(
            Object.values(gameData.realms || {}).map((realm) => Number(realm.order))
        );
        if (!Number.isSafeInteger(config.version) || config.version <= 0) {
            errors.push('monsterRewardScaling.version must be a positive safe integer');
        }
        if (!config.id || !config.aliasId) {
            errors.push('monsterRewardScaling.id and aliasId are required');
        }
        if (config.coveragePolicy !== 'CONFIGURED_TIERS_ONLY') {
            errors.push('monsterRewardScaling.coveragePolicy must be CONFIGURED_TIERS_ONLY');
        }
        if (!realmOrders.has(currency.baseRealmOrder)
            || !Number.isSafeInteger(currency.baseMin)
            || !Number.isSafeInteger(currency.baseMax)
            || currency.baseMin <= 0
            || currency.baseMax < currency.baseMin
            || !Number.isFinite(currency.growthFactor)
            || currency.growthFactor <= 0
            || currency.roundingMode !== 'FLOOR') {
            errors.push('monsterRewardScaling.currency is invalid');
        }

        const tierOrders = new Set();
        const tableIds = new Set();
        const alias = gameData.monsterRules?.rewardResolution?.aliases?.[config.aliasId];
        if (!Array.isArray(config.tiers) || config.tiers.length === 0) {
            errors.push('monsterRewardScaling.tiers must be a non-empty array');
            return;
        }
        for (const [index, tier] of config.tiers.entries()) {
            const path = `monsterRewardScaling.tiers[${index}]`;
            if (!realmOrders.has(tier.realmOrder) || tierOrders.has(tier.realmOrder)) {
                errors.push(`${path}.realmOrder must be valid and unique`);
            }
            if (!tier.tableId || tableIds.has(tier.tableId)) {
                errors.push(`${path}.tableId must be non-empty and unique`);
            }
            if (!Number.isSafeInteger(tier.rollCount) || tier.rollCount <= 0) {
                errors.push(`${path}.rollCount must be a positive safe integer`);
            }
            const table = gameData.rewardTables?.[tier.tableId];
            if (!table) {
                errors.push(`${path}.tableId references missing reward table`);
            }
            if (alias?.realmOrderTableIds?.[String(tier.realmOrder)] !== tier.tableId) {
                errors.push(`${path} is not reflected in ${config.aliasId} alias`);
            }
            if (tier.equipment?.gradePoolId
                && !gameData.equipmentGradePools?.[tier.equipment.gradePoolId]) {
                errors.push(`${path}.equipment.gradePoolId references a missing grade pool`);
            }
            for (const [itemIndex, item] of (tier.items || []).entries()) {
                if (!gameData.itemTemplates?.[item.itemId]) {
                    errors.push(`${path}.items[${itemIndex}].itemId references a missing Item`);
                }
                if (!Number.isFinite(Number(item.chance))
                    || Number(item.chance) < 0
                    || Number(item.chance) > 100) {
                    errors.push(`${path}.items[${itemIndex}].chance must be within [0, 100]`);
                }
            }
            tierOrders.add(tier.realmOrder);
            tableIds.add(tier.tableId);
        }
    }

    validateProfessionData(gameData, errors) {
        const allowedStatuses = new Set(['ACTIVE', 'DEFINITION_ONLY']);
        const reservedOutputTypes = new Set(['ITEM', 'EQUIPMENT', 'FORMATION', 'PUPPET']);
        const realmCodes = new Set(Object.values(gameData.realms || {}).map((realm) => realm.code));

        for (const [professionId, profession] of Object.entries(gameData.professions || {})) {
            const path = `professions.${professionId}`;
            if (!allowedStatuses.has(profession.status)) errors.push(`${path}.status is unsupported`);
            if (!profession.name || !String(profession.name).trim()) errors.push(`${path}.name is required`);
            if (!Array.isArray(profession.outputTypes) || profession.outputTypes.length === 0) {
                errors.push(`${path}.outputTypes must be a non-empty array`);
            } else if (profession.outputTypes.some((type) => !reservedOutputTypes.has(type))) {
                errors.push(`${path}.outputTypes contains an unsupported output type`);
            }
        }

        const grades = Object.values(gameData.professionGrades || {}).sort((a, b) => a.grade - b.grade);
        if (grades.length !== 9 || grades.some((entry, index) => entry.grade !== index + 1)) {
            errors.push('professionGrades must define each grade from 1 through 9 exactly once');
        }
        for (const grade of grades) {
            const path = `professionGrades.${grade.grade}`;
            if (!realmCodes.has(grade.minRealm)) errors.push(`${path}.minRealm references missing realm ${grade.minRealm}`);
            if (!/^\d+$/.test(String(grade.cumulativeExperience))) errors.push(`${path}.cumulativeExperience must be an integer string`);
            if (!/^\d+$/.test(String(grade.recipeExperience))) errors.push(`${path}.recipeExperience must be an integer string`);
            if (!Number.isSafeInteger(grade.baseDurationMinutes) || grade.baseDurationMinutes <= 0) {
                errors.push(`${path}.baseDurationMinutes must be a positive safe integer`);
            }
        }
        for (let index = 1; index < grades.length; index += 1) {
            if (BigInt(grades[index].cumulativeExperience) <= BigInt(grades[index - 1].cumulativeExperience)) {
                errors.push('professionGrades cumulativeExperience must increase strictly');
            }
        }

        const rules = gameData.professionRules || {};
        if (!Number.isSafeInteger(rules.revision) || rules.revision <= 0) errors.push('professionRules.revision must be positive');
        if (rules.batch?.minimum !== 1 || rules.batch?.maximum !== 99 || rules.batch?.durationScaling !== 'LINEAR') {
            errors.push('professionRules.batch must match the approved 1..99 linear policy');
        }
        if (rules.slotsPerProfession !== 1 || rules.consumeInputsAt !== 'START' || rules.claimMode !== 'EXPLICIT') {
            errors.push('professionRules lazy job policy does not match the approved contract');
        }
        if (rules.cancelEnabled !== false || rules.offlineCapSeconds !== null) {
            errors.push('professionRules must disable cancel and offline cap for MVP');
        }
        if (JSON.stringify(rules.qualityOutputTypes || []) !== JSON.stringify(['EQUIPMENT'])) {
            errors.push('professionRules.qualityOutputTypes must contain only EQUIPMENT in MVP');
        }

        const unlockModes = new Set(rules.recipeUnlockModes || []);
        const executableOutputTypes = new Set(rules.executableOutputTypes || []);
        for (const [recipeId, recipe] of Object.entries(gameData.craftTemplates || {})) {
            const path = `craftTemplates.${recipeId}`;
            const profession = gameData.professions?.[recipe.professionId];
            if (!profession) errors.push(`${path}.professionId references missing profession ${recipe.professionId}`);
            if (!Number.isSafeInteger(recipe.professionGrade) || !gameData.professionGrades?.[String(recipe.professionGrade)]) {
                errors.push(`${path}.professionGrade must reference a profession grade`);
            }
            if (!unlockModes.has(recipe.unlockMode)) errors.push(`${path}.unlockMode is unsupported`);
            if (recipe.requiredRealm && !realmCodes.has(recipe.requiredRealm)) {
                errors.push(`${path}.requiredRealm references missing realm ${recipe.requiredRealm}`);
            }
            if (!gameData.currencies?.[recipe.costCurrency?.currencyId]) {
                errors.push(`${path}.costCurrency.currencyId references missing currency`);
            }
            for (const [index, material] of (recipe.materials || []).entries()) {
                if (!gameData.itemTemplates?.[material.itemId]) {
                    errors.push(`${path}.materials[${index}].itemId references missing item ${material.itemId}`);
                }
                if (!Number.isSafeInteger(material.quantity) || material.quantity <= 0) {
                    errors.push(`${path}.materials[${index}].quantity must be a positive safe integer`);
                }
            }
            if (recipe.durationMinutes != null
                && (!Number.isSafeInteger(recipe.durationMinutes) || recipe.durationMinutes <= 0)) {
                errors.push(`${path}.durationMinutes must be a positive safe integer when provided`);
            }
            if (!executableOutputTypes.has(recipe.output?.type)) errors.push(`${path}.output.type is not executable in MVP`);
            if (profession && !profession.outputTypes.includes(recipe.output?.type)) {
                errors.push(`${path}.output.type is not supported by ${recipe.professionId}`);
            }
            if (recipe.output?.type === 'ITEM' && !gameData.itemTemplates?.[recipe.output.itemId]) {
                errors.push(`${path}.output.itemId references missing item ${recipe.output?.itemId}`);
            }
            if (recipe.output?.type === 'EQUIPMENT' && !gameData.equipmentTemplates?.[recipe.output.equipmentTemplateId]) {
                errors.push(`${path}.output.equipmentTemplateId references missing equipment ${recipe.output?.equipmentTemplateId}`);
            }
            if (!Number.isSafeInteger(recipe.output?.quantity) || recipe.output.quantity <= 0) {
                errors.push(`${path}.output.quantity must be a positive safe integer`);
            }
        }
    }

    validateSectTemplates(gameData, errors) {
        const realmCodes = new Set(Object.values(gameData.realms || {}).map((realm) => realm.code));
        const supportedCategories = new Set(['CULTIVATION_ART', 'ATTACK', 'DEFENSE']);
        if (!gameData.sectPolicy?.revision) errors.push('sectPolicy.revision is required');
        if (!Number.isSafeInteger(gameData.sectPolicy?.leaveCooldownSeconds) || gameData.sectPolicy.leaveCooldownSeconds < 0) {
            errors.push('sectPolicy.leaveCooldownSeconds must be a non-negative safe integer');
        }
        if (gameData.sectPolicy?.retainSectPoints !== true) {
            errors.push('sectPolicy.retainSectPoints must be true for approved MVP policy');
        }

        for (const [sectId, sect] of Object.entries(gameData.sectTemplates || {})) {
            const path = `sectTemplates.${sectId}`;
            if (!sect.name || !String(sect.name).trim()) errors.push(`${path}.name is required`);
            if (sect.element && !gameData.elements?.[sect.element]) {
                errors.push(`${path}.element references missing elements.${sect.element}`);
            }
            if (!Array.isArray(sect.effects)) {
                errors.push(`${path}.effects must be an array`);
            } else if (new Set(sect.effects).size !== sect.effects.length) {
                errors.push(`${path}.effects must not contain duplicates`);
            } else if (sect.effects.some((effectId) => !effectId || !String(effectId).trim())) {
                errors.push(`${path}.effects must contain non-empty IDs`);
            }
            for (const [index, effectId] of (sect.effects || []).entries()) {
                const effect = gameData.coreEffects?.[effectId];
                if (!effect) {
                    errors.push(`${path}.effects[${index}] references missing coreEffects.${effectId}`);
                    continue;
                }
                if (!String(effect.displayName || effect.name || '').trim()) {
                    errors.push(`${path}.effects[${index}] must have a display name`);
                }
                if (!String(effect.description || '').trim()) {
                    errors.push(`${path}.effects[${index}] must have a description`);
                }
            }
        }

        for (const [ruleId, rule] of Object.entries(gameData.sectExchangeRules || {})) {
            const path = `sectExchangeRules.${ruleId}`;
            if (!supportedCategories.has(rule.category)) {
                errors.push(`${path}.category is unsupported`);
            }
            if (!rule.grade || !gameData.rarities?.[rule.grade]) {
                errors.push(`${path}.grade references missing rarities.${rule.grade || 'undefined'}`);
            }
            if (rule.requiredRealm && !realmCodes.has(rule.requiredRealm)) {
                errors.push(`${path}.requiredRealm references missing realm code ${rule.requiredRealm}`);
            }
            if (!rule.cost || !gameData.currencies?.[rule.cost.currencyId]) {
                errors.push(`${path}.cost.currencyId references missing currency`);
            }
            if (!Number.isSafeInteger(rule.cost?.amount) || rule.cost.amount <= 0) {
                errors.push(`${path}.cost.amount must be a positive safe integer`);
            }
        }


        const seenPoolKeys = new Set();
        for (const [poolId, pool] of Object.entries(gameData.sectRewardPools || {})) {
            const path = `sectRewardPools.${poolId}`;
            if (!gameData.sectTemplates?.[pool.sectId]) errors.push(`${path}.sectId references missing sectTemplates.${pool.sectId}`);
            if (!gameData.sectExchangeRules?.[pool.ruleId]) errors.push(`${path}.ruleId references missing sectExchangeRules.${pool.ruleId}`);
            const poolKey = `${pool.sectId}:${pool.ruleId}`;
            if (seenPoolKeys.has(poolKey)) errors.push(`${path} duplicates pool key ${poolKey}`);
            seenPoolKeys.add(poolKey);
            if (pool.duplicatePolicy !== 'DENY_OWNED') errors.push(`${path}.duplicatePolicy must be DENY_OWNED for fixed Sect inheritance policy`);
            if (!Array.isArray(pool.entries)) {
                errors.push(`${path}.entries must be an array`);
                continue;
            }
            if (pool.entries.length !== 1) {
                errors.push(`${path}.entries must contain exactly one fixed Sect inheritance`);
            }
            const itemIds = new Set();
            for (const [index, entry] of pool.entries.entries()) {
                if (!gameData.itemTemplates?.[entry.itemId]) errors.push(`${path}.entries[${index}].itemId references missing itemTemplates.${entry.itemId}`);
                if (!Number.isSafeInteger(entry.weight) || entry.weight <= 0) errors.push(`${path}.entries[${index}].weight must be a positive safe integer`);
                if (itemIds.has(entry.itemId)) errors.push(`${path}.entries contains duplicate itemId ${entry.itemId}`);
                itemIds.add(entry.itemId);
            }
        }

        for (const sectId of Object.keys(gameData.sectTemplates || {})) {
            for (const ruleId of Object.keys(gameData.sectExchangeRules || {})) {
                if (!seenPoolKeys.has(`${sectId}:${ruleId}`)) errors.push(`sectRewardPools missing pool ${sectId}:${ruleId}`);
            }
        }
    }

    validateGatheringTemplates(gameData, errors) {
        const realmCodes = new Set(Object.values(gameData.realms || {}).map((realm) => realm.code));
        const rules = gameData.gatheringRules || {};
        const familyIds = new Set(Object.keys(rules.families || {}));
        const roleIds = new Set(Object.keys(rules.roles || {}));
        if (rules.selectionMode !== 'WEIGHTED_ONE') {
            errors.push('gatheringRules.selectionMode must be WEIGHTED_ONE');
        }
        if (rules.resourceTierPolicy !== 'MAP_NAVIGATION_ORDER') {
            errors.push('gatheringRules.resourceTierPolicy must be MAP_NAVIGATION_ORDER');
        }
        if (Number(rules.activeRunLimit) !== 1) {
            errors.push('gatheringRules.activeRunLimit must be 1');
        }
        if (familyIds.size !== 2 || !familyIds.has('HERB') || !familyIds.has('ORE')) {
            errors.push('gatheringRules.families must define HERB and ORE');
        }
        for (const [familyId, family] of Object.entries(rules.families || {})) {
            if (!family.name || !family.activityName) {
                errors.push(`gatheringRules.families.${familyId} must define name and activityName`);
            }
            if (!Number.isSafeInteger(family.durationSeconds) || family.durationSeconds <= 0) {
                errors.push(`gatheringRules.families.${familyId}.durationSeconds must be a positive safe integer`);
            }
        }
        if (rules.families?.HERB?.durationSeconds !== 30
            || rules.families?.ORE?.durationSeconds !== 60) {
            errors.push('gatheringRules duration baseline must be HERB=30 and ORE=60 seconds');
        }
        for (const [roleId, role] of Object.entries(rules.roles || {})) {
            if (!Number.isSafeInteger(role.weight) || role.weight <= 0) {
                errors.push(`gatheringRules.roles.${roleId}.weight must be a positive safe integer`);
            }
            if (!Number.isSafeInteger(role.quantity?.min)
                || !Number.isSafeInteger(role.quantity?.max)
                || role.quantity.min <= 0
                || role.quantity.max < role.quantity.min) {
                errors.push(`gatheringRules.roles.${roleId}.quantity is invalid`);
            }
        }
        if (rules.roles?.PRIMARY?.weight !== 75 || rules.roles?.RARE?.weight !== 25
            || rules.roles?.PRIMARY?.quantity?.min !== 1
            || rules.roles?.PRIMARY?.quantity?.max !== 3
            || rules.roles?.RARE?.quantity?.min !== 1
            || rules.roles?.RARE?.quantity?.max !== 1) {
            errors.push('gatheringRules roles must match approved 75/25 and 1-3/1 baseline');
        }

        const resourceCounts = new Map();
        for (const [resourceId, resource] of Object.entries(gameData.gatheringResources || {})) {
            const path = `gatheringResources.${resourceId}`;
            const map = gameData.maps?.[resource.mapId];
            if (!map) errors.push(`${path}.mapId references missing maps.${resource.mapId}`);
            if (!familyIds.has(resource.family)) {
                errors.push(`${path}.family references missing gatheringRules family ${resource.family}`);
            }
            if (!roleIds.has(resource.role)) {
                errors.push(`${path}.role references missing gatheringRules role ${resource.role}`);
            }
            if (!Number.isSafeInteger(resource.resourceTier)
                || resource.resourceTier !== Number(map?.navigationOrder)) {
                errors.push(`${path}.resourceTier must match map navigationOrder`);
            }
            if (!gameData.itemTemplates?.[resourceId]) {
                errors.push(`${path} is missing from itemTemplates`);
            }
            const key = `${resource.mapId}:${resource.family}`;
            resourceCounts.set(key, (resourceCounts.get(key) || 0) + 1);
        }
        if (Object.keys(gameData.gatheringResources || {}).length !== 60) {
            errors.push('gatheringResources must define exactly 60 approved resources');
        }
        for (const map of Object.values(gameData.maps || {})) {
            for (const familyId of familyIds) {
                const key = `${map.id}:${familyId}`;
                if (resourceCounts.get(key) !== 2) {
                    errors.push(`gatheringResources must define exactly two ${familyId} resources for map ${map.id}`);
                }
            }
        }

        for (const [poolId, pool] of Object.entries(gameData.mapGatheringPools || {})) {
            const path = `mapGatheringPools.${poolId}`;
            if (!gameData.maps?.[pool.mapId]) errors.push(`${path}.mapId references missing map`);
            if (!familyIds.has(pool.resourceFamily)) errors.push(`${path}.resourceFamily is invalid`);
            if (pool.selectionMode !== 'WEIGHTED_ONE') errors.push(`${path}.selectionMode must be WEIGHTED_ONE`);
            if (!Array.isArray(pool.entries) || pool.entries.length !== 2) {
                errors.push(`${path}.entries must contain exactly two resources`);
            } else if (pool.entries.reduce((sum, entry) => sum + Number(entry.weight), 0) !== 100) {
                errors.push(`${path}.entry weights must total 100`);
            }
        }

        for (const [gatheringId, gathering] of Object.entries(gameData.gatheringTemplates || {})) {
            const path = `gatheringTemplates.${gatheringId}`;
            if (!gathering.name || !String(gathering.name).trim()) {
                errors.push(`${path}.name is required`);
            }
            if (gathering.requiredRealm && !realmCodes.has(gathering.requiredRealm)) {
                errors.push(`${path}.requiredRealm references missing realm code ${gathering.requiredRealm}`);
            }
            if (!Number.isInteger(gathering.duration) || gathering.duration <= 0) {
                errors.push(`${path}.duration must be a positive integer`);
            }
            if (!Number.isInteger(gathering.staminaCost) || gathering.staminaCost < 0) {
                errors.push(`${path}.staminaCost must be a non-negative integer`);
            }
            if (!Number.isInteger(gathering.dailyLimit) || gathering.dailyLimit < 0) {
                errors.push(`${path}.dailyLimit must be a non-negative integer`);
            }
            if (!gathering.rewardTableId || !gameData.rewardTables?.[gathering.rewardTableId]) {
                errors.push(`${path}.rewardTableId references missing rewardTables.${gathering.rewardTableId || 'undefined'}`);
            }
            if (gathering.mapId) {
                if (!gameData.maps?.[gathering.mapId]) {
                    errors.push(`${path}.mapId references missing maps.${gathering.mapId}`);
                }
                if (!familyIds.has(gathering.resourceFamily)) {
                    errors.push(`${path}.resourceFamily is invalid`);
                }
                if (Number(gathering.resourceTier) !== Number(gameData.maps?.[gathering.mapId]?.navigationOrder)) {
                    errors.push(`${path}.resourceTier must match map navigationOrder`);
                }
            }
        }
    }

    validateEconomyTemplates(gameData, errors) {
        const supportedPeriods = new Set(['DAILY', 'WEEKLY', 'MONTHLY', 'LIFETIME']);
        for (const [exchangeId, exchange] of Object.entries(gameData.exchangeTemplates || {})) {
            if (exchange.limit == null) continue;
            const path = `exchangeTemplates.${exchangeId}.limit`;
            if (!Array.isArray(exchange.limit)) {
                errors.push(`${path} must be an array`);
                continue;
            }

            const seenPeriods = new Set();
            exchange.limit.forEach((limit, index) => {
                const entryPath = `${path}[${index}]`;
                if (!isPlainObject(limit)) {
                    errors.push(`${entryPath} must be an object`);
                    return;
                }
                if (!supportedPeriods.has(limit.periodType)) {
                    errors.push(`${entryPath}.periodType must be DAILY, WEEKLY, MONTHLY or LIFETIME`);
                }
                if (!/^\d+$/.test(String(limit.value || '')) || BigInt(limit.value || 0) <= 0n) {
                    errors.push(`${entryPath}.value must be a positive integer string`);
                }
                if (seenPeriods.has(limit.periodType)) {
                    errors.push(`${path} must not repeat periodType ${limit.periodType}`);
                }
                seenPeriods.add(limit.periodType);
            });
        }
    }

    validateCultivationArtReferences(gameData, errors) {
        for (const [artId, art] of Object.entries(gameData.cultivationArts || {})) {
            if (!gameData.itemTemplates?.[art.itemId]) {
                errors.push(`cultivationArts.${artId}.itemId references missing itemTemplates.${art.itemId}`);
            }

            this.validateEffectList(`cultivationArts.${artId}.effects`, art.effects, gameData, errors);
        }
    }

    validateCoreDataCollections(gameData, errors) {
        this.validateAttributes(gameData, errors);
        this.validateElements(gameData, errors);
        this.validateElementRelations(gameData, errors);
        this.validateSpiritRoots(gameData, errors);
        this.validateIdleSources(gameData, errors);
        this.validateApprovedRuntimeRules(gameData, errors);
        this.validateRebirthRules(gameData, errors);
        this.validateRealms(gameData, errors);
        this.validateBreakthroughRules(gameData, errors);
        this.validateConditions(gameData, errors);
        this.validateCoreEffects(gameData, errors);
        this.validateSkillDefinitions(gameData, errors);
    }

    validateAttributes(gameData, errors) {
        for (const [attributeId, attribute] of Object.entries(gameData.attributes || {})) {
            if (!attribute.type) {
                errors.push(`attributes.${attributeId}.type is required`);
            }

            if (
                attribute.min != null
                && attribute.max != null
                && Number(attribute.min) > Number(attribute.max)
            ) {
                errors.push(`attributes.${attributeId}.min must be less than or equal to max`);
            }
        }
    }

    validateElements(gameData, errors) {
        for (const [elementId, element] of Object.entries(gameData.elements || {})) {
            if (!element.effectId) {
                errors.push(`elements.${elementId}.effectId is required`);
                continue;
            }

            if (!gameData.coreEffects?.[element.effectId]) {
                errors.push(`elements.${elementId}.effectId references missing coreEffects.${element.effectId}`);
            }

            if (element.mutation && !element.parentElement) {
                errors.push(`elements.${elementId}.parentElement is required when mutation is true`);
            }

            if (element.parentElement && !gameData.elements?.[element.parentElement]) {
                errors.push(`elements.${elementId}.parentElement references missing elements.${element.parentElement}`);
            }
        }
    }

    validateElementRelations(gameData, errors) {
        const supportedRelationTypes = new Set(['GENERATE', 'COUNTER']);
        for (const [relationId, relation] of Object.entries(gameData.elementRelations || {})) {
            const path = `elementRelations.${relationId}`;
            if (!supportedRelationTypes.has(relation.relationType)) {
                errors.push(`${path}.relationType must be GENERATE or COUNTER`);
            }
            if (!gameData.elements?.[relation.from]) {
                errors.push(`${path}.from references missing elements.${relation.from}`);
            }
            if (!gameData.elements?.[relation.to]) {
                errors.push(`${path}.to references missing elements.${relation.to}`);
            }
            if (relation.from && relation.from === relation.to) {
                errors.push(`${path} must not reference the same element in from and to`);
            }
            if (relation.effectId) {
                const effect = gameData.coreEffects?.[relation.effectId];
                if (!effect) {
                    errors.push(`${path}.effectId references missing coreEffects.${relation.effectId}`);
                } else if (!(effect.scopes || []).includes('ACTION')) {
                    errors.push(`${path}.effectId must reference a core Effect supporting ACTION scope`);
                }
            }
        }
    }

    validateSpiritRoots(gameData, errors) {
        let totalWeight = 0;

        for (const [spiritRootId, spiritRoot] of Object.entries(gameData.spiritRoots || {})) {
            if (!spiritRoot.displayName) {
                errors.push(`spiritRoots.${spiritRootId}.displayName is required`);
            }
            if (!spiritRoot.legacyValue || !String(spiritRoot.legacyValue).trim()) {
                errors.push(`spiritRoots.${spiritRootId}.legacyValue is required`);
            }
            if (!spiritRoot.archetype || !String(spiritRoot.archetype).trim()) {
                errors.push(`spiritRoots.${spiritRootId}.archetype is required`);
            }

            if (!Number.isFinite(spiritRoot.rollWeight) || spiritRoot.rollWeight < 0) {
                errors.push(`spiritRoots.${spiritRootId}.rollWeight must be a non-negative number`);
            } else {
                totalWeight += spiritRoot.rollWeight;
            }

            if (!Array.isArray(spiritRoot.elementIds)) {
                errors.push(`spiritRoots.${spiritRootId}.elementIds must be an array`);
            } else if (new Set(spiritRoot.elementIds).size !== spiritRoot.elementIds.length) {
                errors.push(`spiritRoots.${spiritRootId}.elementIds must not contain duplicates`);
            }
            for (const elementId of spiritRoot.elementIds || []) {
                if (!gameData.elements?.[elementId]) {
                    errors.push(`spiritRoots.${spiritRootId}.elementIds references missing elements.${elementId}`);
                }
            }
            if (spiritRoot.defensiveElementId
                && !(spiritRoot.elementIds || []).includes(spiritRoot.defensiveElementId)) {
                errors.push(`spiritRoots.${spiritRootId}.defensiveElementId must belong to elementIds`);
            }
            if (spiritRoot.affinityPolicy != null) {
                const policyPath = `spiritRoots.${spiritRootId}.affinityPolicy`;
                const affinityMode = spiritRoot.affinityPolicy.mode;
                if (!['ALL_NON_NEUTRAL_ELEMENTS', 'ALLOWED_ELEMENTS'].includes(affinityMode)) {
                    errors.push(`${policyPath}.mode is unsupported`);
                }
                if (affinityMode === 'ALLOWED_ELEMENTS') {
                    const allowed = spiritRoot.affinityPolicy.elementIds;
                    if (!Array.isArray(allowed) || !allowed.length
                        || new Set(allowed).size !== allowed.length) {
                        errors.push(`${policyPath}.elementIds must be a non-empty unique array`);
                    }
                    for (const elementId of allowed || []) {
                        if (!gameData.elements?.[elementId] || elementId === 'NEUTRAL') {
                            errors.push(`${policyPath}.elementIds contains invalid ${elementId}`);
                        }
                    }
                }
            }

            if (!Array.isArray(spiritRoot.effectIds)) {
                errors.push(`spiritRoots.${spiritRootId}.effectIds must be an array`);
            } else if (new Set(spiritRoot.effectIds).size !== spiritRoot.effectIds.length) {
                errors.push(`spiritRoots.${spiritRootId}.effectIds must not contain duplicates`);
            }
            for (const effectId of spiritRoot.effectIds || []) {
                if (!gameData.coreEffects?.[effectId]) {
                    errors.push(`spiritRoots.${spiritRootId}.effectIds references missing coreEffects.${effectId}`);
                }
            }
            if (!Array.isArray(spiritRoot.tags)) {
                errors.push(`spiritRoots.${spiritRootId}.tags must be an array`);
            } else if (new Set(spiritRoot.tags).size !== spiritRoot.tags.length) {
                errors.push(`spiritRoots.${spiritRootId}.tags must not contain duplicates`);
            }
        }

        if (totalWeight <= 0) {
            errors.push('spiritRoots must have a positive total rollWeight');
        }

        const orders = new Set();
        for (const [tierId, tier] of Object.entries(gameData.spiritRootQualityTiers || {})) {
            const path = `spiritRootQualityTiers.${tierId}`;
            if (!tier.displayName) errors.push(`${path}.displayName is required`);
            if (!Number.isSafeInteger(tier.order) || tier.order <= 0) {
                errors.push(`${path}.order must be a positive safe integer`);
            } else if (orders.has(tier.order)) {
                errors.push(`${path}.order must be unique`);
            }
            orders.add(tier.order);
            if (!Array.isArray(tier.effectIds)) {
                errors.push(`${path}.effectIds must be an array`);
            }
            for (const effectId of tier.effectIds || []) {
                if (!gameData.coreEffects?.[effectId]) {
                    errors.push(`${path}.effectIds references missing coreEffects.${effectId}`);
                }
            }
        }
        const expectedQualityTierIds = [
            'LOWER_GRADE', 'MIDDLE_GRADE', 'UPPER_GRADE', 'PEAK_GRADE',
            'HEAVENLY_GRADE', 'SAINT_GRADE', 'IMMORTAL_GRADE', 'DIVINE_GRADE'
        ];
        const orderedQualityTierIds = Object.values(gameData.spiritRootQualityTiers || {})
            .sort((left, right) => left.order - right.order)
            .map((tier) => tier.id);
        if (orderedQualityTierIds.join(',') !== expectedQualityTierIds.join(',')) {
            errors.push('spiritRootQualityTiers must define the approved eight-tier ladder');
        }

        for (const [poolId, pool] of Object.entries(gameData.spiritRootRerollPools || {})) {
            const path = `spiritRootRerollPools.${poolId}`;
            if (!Number.isSafeInteger(pool.revision) || pool.revision <= 0) {
                errors.push(`${path}.revision must be a positive safe integer`);
            }
            if (!['SPIRIT_ROOT_ROLL_WEIGHT', 'REBIRTH_BRACKETS'].includes(
                pool.templateWeightSource
            )) {
                errors.push(`${path}.templateWeightSource is invalid`);
            }
            if (pool.templateWeightSource === 'REBIRTH_BRACKETS') {
                this.validateSpiritRootTemplateWeightBrackets(gameData, pool, path, errors);
            }
            if (!Array.isArray(pool.qualityBrackets) || pool.qualityBrackets.length === 0) {
                errors.push(`${path}.qualityBrackets must be a non-empty array`);
                continue;
            }
            const bracketIds = new Set();
            let expectedMinimum = 0n;
            const sortedBrackets = [...pool.qualityBrackets].sort((left, right) => (
                BigInt(left.minRebirthCount) < BigInt(right.minRebirthCount) ? -1 : 1
            ));
            for (const [index, bracket] of sortedBrackets.entries()) {
                const bracketPath = `${path}.qualityBrackets.${bracket.id || index}`;
                if (!bracket.id || bracketIds.has(bracket.id)) {
                    errors.push(`${bracketPath}.id must be non-empty and unique`);
                }
                bracketIds.add(bracket.id);
                const minimum = BigInt(bracket.minRebirthCount);
                const maximum = bracket.maxRebirthCount == null
                    ? null
                    : BigInt(bracket.maxRebirthCount);
                if (minimum !== expectedMinimum) {
                    errors.push(`${bracketPath} must start at contiguous rebirth count ${expectedMinimum}`);
                }
                if (maximum != null && maximum < minimum) {
                    errors.push(`${bracketPath}.maxRebirthCount must be >= minRebirthCount`);
                }
                if (maximum == null && index !== sortedBrackets.length - 1) {
                    errors.push(`${bracketPath} open-ended bracket must be last`);
                }
                expectedMinimum = maximum == null ? expectedMinimum : maximum + 1n;
                const total = (bracket.entries || []).reduce(
                    (sum, entry) => sum + Number(entry.weight || 0),
                    0
                );
                if (total !== 100) errors.push(`${bracketPath}.entries weights must total 100`);
                const tierIds = new Set();
                for (const entry of bracket.entries || []) {
                    if (!gameData.spiritRootQualityTiers?.[entry.qualityTierId]) {
                        errors.push(`${bracketPath}.entries references missing quality tier ${entry.qualityTierId}`);
                    }
                    if (tierIds.has(entry.qualityTierId)) {
                        errors.push(`${bracketPath}.entries contains duplicate quality tier ${entry.qualityTierId}`);
                    }
                    tierIds.add(entry.qualityTierId);
                    if (!Number.isFinite(entry.weight) || entry.weight < 0) {
                        errors.push(`${bracketPath}.entries weight must be non-negative`);
                    }
                }
                if (tierIds.size !== expectedQualityTierIds.length
                    || expectedQualityTierIds.some((tierId) => !tierIds.has(tierId))) {
                    errors.push(`${bracketPath}.entries must contain all eight approved quality tiers`);
                }
            }
            if (sortedBrackets.at(-1)?.maxRebirthCount != null) {
                errors.push(`${path}.qualityBrackets must end with an open-ended bracket`);
            }
        }
    }

    validateSpiritRootTemplateWeightBrackets(gameData, pool, path, errors) {
        const brackets = pool.templateWeightBrackets;
        if (!Array.isArray(brackets) || brackets.length === 0) {
            errors.push(`${path}.templateWeightBrackets must be a non-empty array`);
            return;
        }
        const expectedRootIds = Object.keys(gameData.spiritRoots || {});
        const bracketIds = new Set();
        let expectedMinimum = 0n;
        const sorted = [...brackets].sort((left, right) => (
            BigInt(left.minRebirthCount) < BigInt(right.minRebirthCount) ? -1 : 1
        ));
        for (const [index, bracket] of sorted.entries()) {
            const bracketPath = `${path}.templateWeightBrackets.${bracket.id || index}`;
            if (!bracket.id || bracketIds.has(bracket.id)) {
                errors.push(`${bracketPath}.id must be non-empty and unique`);
            }
            bracketIds.add(bracket.id);
            const minimum = BigInt(bracket.minRebirthCount);
            const maximum = bracket.maxRebirthCount == null
                ? null
                : BigInt(bracket.maxRebirthCount);
            if (minimum !== expectedMinimum) {
                errors.push(`${bracketPath} must start at contiguous rebirth count ${expectedMinimum}`);
            }
            if (maximum != null && maximum < minimum) {
                errors.push(`${bracketPath}.maxRebirthCount must be >= minRebirthCount`);
            }
            if (maximum == null && index !== sorted.length - 1) {
                errors.push(`${bracketPath} open-ended bracket must be last`);
            }
            expectedMinimum = maximum == null ? expectedMinimum : maximum + 1n;
            const entries = bracket.entries || [];
            const total = entries.reduce((sum, entry) => sum + Number(entry.weight || 0), 0);
            if (Math.abs(total - 100) > Number.EPSILON * 100) {
                errors.push(`${bracketPath}.entries weights must total 100`);
            }
            const rootIds = new Set();
            for (const entry of entries) {
                if (!gameData.spiritRoots?.[entry.spiritRootId]) {
                    errors.push(`${bracketPath}.entries references missing Spirit Root ${entry.spiritRootId}`);
                }
                if (rootIds.has(entry.spiritRootId)) {
                    errors.push(`${bracketPath}.entries contains duplicate Spirit Root ${entry.spiritRootId}`);
                }
                rootIds.add(entry.spiritRootId);
                if (!Number.isFinite(entry.weight) || entry.weight < 0) {
                    errors.push(`${bracketPath}.entries weight must be non-negative`);
                }
            }
            if (rootIds.size !== expectedRootIds.length
                || expectedRootIds.some((rootId) => !rootIds.has(rootId))) {
                errors.push(`${bracketPath}.entries must contain every Spirit Root`);
            }
        }
        if (sorted.at(-1)?.maxRebirthCount != null) {
            errors.push(`${path}.templateWeightBrackets must end with an open-ended bracket`);
        }
    }

    validateIdleSources(gameData, errors) {
        for (const [sourceId, source] of Object.entries(gameData.idleSources || {})) {
            if (source.evaluationMode !== 'LAZY') {
                errors.push(`idleSources.${sourceId}.evaluationMode must be LAZY`);
            }

            if (!source.resourceType || !source.resourceId) {
                errors.push(`idleSources.${sourceId} must define resourceType and resourceId`);
            }
        }
    }

    validateApprovedRuntimeRules(gameData, errors) {
        if (gameData.cultivationRules?.calculationMode !== 'CONTINUOUS_ELAPSED_SECONDS') {
            errors.push('cultivationRules.calculationMode must be CONTINUOUS_ELAPSED_SECONDS');
        }

        if (gameData.cultivationRules?.rateUnit !== 'MINUTE') {
            errors.push('cultivationRules.rateUnit must be MINUTE');
        }
        if (gameData.cultivationRules?.baseGainPerMinute !== 60) {
            errors.push('cultivationRules.baseGainPerMinute must be 60');
        }

        if (gameData.cultivationRules?.offlineTimeLimit !== 'NONE') {
            errors.push('cultivationRules.offlineTimeLimit must be NONE');
        }

        if (gameData.cultivationRules?.cultivationOverflow?.efficiencyMultiplier !== '0.20') {
            errors.push('cultivationRules.cultivationOverflow.efficiencyMultiplier must be 0.20');
        }

        const artAffinity = gameData.cultivationArtAffinityPolicy || {};
        const expectedArtBonuses = {
            HOANG: '0.20', HUYEN: '0.25', DIA: '0.30',
            THIEN: '0.35', THANH: '0.40', THAN: '0.50'
        };
        if (artAffinity.mode !== 'MATCH_SPIRIT_ROOT_ELEMENT'
            || artAffinity.mismatchBonus !== '0'
            || artAffinity.neutralArt?.artId !== 'CP_NEUTRAL_HOANG'
            || artAffinity.neutralArt?.baseBonus !== '0.20'
            || artAffinity.neutralArt?.eligibleForAffinity !== false
            || JSON.stringify(artAffinity.gradeBonuses) !== JSON.stringify(expectedArtBonuses)) {
            errors.push('cultivationArtAffinityPolicy must preserve Q-CULT-004 option A');
        }
        if (!gameData.cultivationArts?.CP_NEUTRAL_HOANG
            || gameData.cultivationArts.CP_NEUTRAL_HOANG.element !== 'NEUTRAL') {
            errors.push('CP_NEUTRAL_HOANG must be the neutral starter cultivation art');
        }
        if (gameData.characterCreationRules?.starterCultivationArtId !== 'CP_NEUTRAL_HOANG') {
            errors.push('characterCreationRules must grant CP_NEUTRAL_HOANG');
        }
        if (gameData.rebirthRules?.resetBootstrap?.cultivationArtId !== 'CP_NEUTRAL_HOANG') {
            errors.push('rebirthRules must bootstrap CP_NEUTRAL_HOANG');
        }

        if (gameData.progressionRules?.stageEnabled !== true) {
            errors.push('progressionRules.stageEnabled must be true');
        }

        if (gameData.progressionRules?.minorBreakthroughSuccess !== 'GUARANTEED') {
            errors.push('progressionRules.minorBreakthroughSuccess must be GUARANTEED');
        }

        if (gameData.progressionRules?.stageValueFormula !== 'INITIAL * GROWTH_PER_STAGE ^ (STAGE - 1)') {
            errors.push('progressionRules.stageValueFormula must preserve cultivation Stage semantics');
        }
        if (gameData.progressionRules?.stageValueRounding !== 'FLOOR') {
            errors.push('progressionRules.stageValueRounding must be FLOOR');
        }
        const statProgression = gameData.progressionRules?.battleStatProgression;
        const factorMatches = (factor, numerator, denominator) => (
            factor?.numerator === numerator && factor?.denominator === denominator
        );
        if (statProgression?.revision !== 2
            || JSON.stringify(statProgression.attributes) !== JSON.stringify(['HP', 'ATK', 'DEF', 'SPD'])
            || statProgression.startingBaseSource !== 'FIRST_REALM_STAGE_ONE_INITIAL'
            || statProgression.laterRealmInitialPolicy !== 'DERIVED_IGNORE_AUTHORED_INITIAL'
            || statProgression.rounding !== 'FLOOR_EACH_TRANSITION'
            || !factorMatches(statProgression.minorDefault, '6', '5')
            || !factorMatches(statProgression.minorOverrides?.LUYEN_KHI, '11', '10')
            || !factorMatches(statProgression.majorDefault, '17', '10')
            || !factorMatches(statProgression.majorOverrides?.['LUYEN_KHI->TRUC_CO'], '3', '2')) {
            errors.push('progressionRules.battleStatProgression does not match approved Q-PROGRESSION-010');
        }

        if (gameData.economyRules?.timezone !== 'Asia/Ho_Chi_Minh') {
            errors.push('economyRules.timezone must be Asia/Ho_Chi_Minh');
        }

        if (gameData.rewardRuntimeRules?.applyMode !== 'ALL_OR_NOTHING') {
            errors.push('rewardRuntimeRules.applyMode must be ALL_OR_NOTHING');
        }

        if (gameData.rewardRuntimeRules?.overflowPolicy !== 'ROLLBACK_RETRYABLE') {
            errors.push('rewardRuntimeRules.overflowPolicy must be ROLLBACK_RETRYABLE');
        }
        const luckPolicy = gameData.rewardRuntimeRules?.luckChancePolicy || {};
        if (luckPolicy.formula !== 'RELATIVE_MULTIPLIER_CAP_100'
            || Number(luckPolicy.percentPerLuck) !== 1
            || Number(luckPolicy.luckCap) !== 100
            || Number(luckPolicy.chanceCapPercent) !== 100
            || luckPolicy.snapshotTiming !== 'ACTIVITY_START') {
            errors.push('rewardRuntimeRules.luckChancePolicy does not match the approved LUCK policy');
        }
        if (!Array.isArray(luckPolicy.eligibleRewardTypes)
            || luckPolicy.eligibleRewardTypes.join(',') !== 'ITEM,EQUIPMENT,SKILL,CULTIVATION_ART') {
            errors.push('rewardRuntimeRules.luckChancePolicy.eligibleRewardTypes is invalid');
        }
        if (!Array.isArray(luckPolicy.excludedRewardTypes)
            || luckPolicy.excludedRewardTypes.join(',') !== 'CURRENCY') {
            errors.push('rewardRuntimeRules.luckChancePolicy.excludedRewardTypes must be CURRENCY');
        }

        if (gameData.economyRules?.weeklyBoundary?.day !== 'MONDAY') {
            errors.push('economyRules.weeklyBoundary.day must be MONDAY');
        }

        if (gameData.idempotencyRules?.defaultResponseRetentionDays !== 30) {
            errors.push('idempotencyRules.defaultResponseRetentionDays must be 30');
        }
    }

    validateRebirthRules(gameData, errors) {
        const rules = gameData.rebirthRules || {};
        const expectedRetention = {
            PLAYER_IDENTITY: 'KEEP',
            SPIRIT_ROOT: 'KEEP',
            SPIRIT_STONE: 'KEEP',
            ACHIEVEMENTS: 'KEEP',
            COSMETICS: 'KEEP',
            REBIRTH_COUNT: 'KEEP',
            OTHER_CURRENCIES: 'RESET',
            INVENTORY: 'RESET',
            EQUIPMENT: 'RESET',
            LEARNED_SKILLS: 'RESET',
            CULTIVATION_ARTS: 'RESET',
            ACTIVE_LOADOUT: 'RESET',
            SECT_MEMBERSHIP: 'RESET'
        };

        if (rules.id !== 'REBIRTH_MVP_V1' || rules.revision !== 2 || rules.enabled !== true) {
            errors.push('rebirthRules must identify enabled REBIRTH_MVP_V1 revision 2');
        }
        if (rules.repeatPolicy !== 'UNLIMITED') {
            errors.push('rebirthRules.repeatPolicy must be UNLIMITED');
        }
        if (rules.eligibility?.realmPosition !== 'LAST_REALM'
            || rules.eligibility?.stagePosition !== 'MAX_STAGE'
            || rules.eligibility?.requiresCurrentStageCultivation !== true) {
            errors.push('rebirthRules.eligibility must require full cultivation at the final stage of the final realm');
        }
        if (rules.resetTarget?.realmPosition !== 'FIRST_REALM'
            || rules.resetTarget?.stage !== 1
            || rules.resetTarget?.cultivation !== '0') {
            errors.push('rebirthRules.resetTarget must be first realm, stage 1, cultivation 0');
        }

        for (const [domain, mode] of Object.entries(expectedRetention)) {
            if (rules.retention?.[domain] !== mode) {
                errors.push(`rebirthRules.retention.${domain} must be ${mode}`);
            }
        }

        const bonus = rules.baseStatBonus || {};
        if (bonus.formula !== 'REALM_STAGE_BASE_SQRT_REBIRTH'
            || bonus.coefficientNumerator !== '1'
            || bonus.coefficientDenominator !== '4'
            || bonus.rounding !== 'FLOOR'
            || bonus.calculationMode !== 'DERIVED_NOT_COMPOUNDED'
            || bonus.applicationOrder !== 'BEFORE_EFFECT_AND_EQUIPMENT') {
            errors.push('rebirthRules.baseStatBonus does not match the approved square-root policy');
        }
        if (JSON.stringify(bonus.stats) !== JSON.stringify(['HP', 'ATK', 'DEF', 'SPD'])) {
            errors.push('rebirthRules.baseStatBonus.stats must be HP, ATK, DEF, SPD');
        }
        if (rules.resetBootstrap?.cultivationArtId !== 'CP_NEUTRAL_HOANG'
            || rules.resetBootstrap?.grantCultivationArtOwnership !== true) {
            errors.push('rebirthRules.resetBootstrap must restore the runtime-required starter cultivation art');
        }
    }

    validateRealms(gameData, errors) {
        const realms = Object.values(gameData.realms || {}).sort((left, right) => left.id - right.id);
        const requiredAttributes = ['HP', 'ATK', 'DEF', 'SPD'];

        realms.forEach((realm, index) => {
            const path = `realms.${realm.id}`;
            if (!Number.isInteger(realm.id) || realm.id <= 0) {
                errors.push(`${path}.id must be a positive integer`);
            }

            if (index > 0 && realm.id !== realms[index - 1].id + 1) {
                errors.push(`${path}.id must be contiguous because realm progression advances to id + 1`);
            }

            if (!realm.code || !realm.name) {
                errors.push(`${path} must define code and display name`);
            }

            if (!Number.isInteger(realm.max_stage) || realm.max_stage <= 0) {
                errors.push(`${path}.max_stage must be a positive integer`);
            }

            for (const attributeId of requiredAttributes) {
                this.validateStageGrowthDefinition(
                    `${path}.attributes.${attributeId}`,
                    realm.attributes?.[attributeId],
                    errors
                );
            }

            this.validateStageGrowthDefinition(
                `${path}.cultivation.required`,
                realm.cultivation?.required,
                errors
            );
            this.validateStageGrowthDefinition(
                `${path}.cultivation.gain`,
                realm.cultivation?.gain,
                errors
            );

            if (!Number.isFinite(realm.success_rate) || realm.success_rate < 0 || realm.success_rate > 100) {
                errors.push(`${path}.success_rate must be between 0 and 100`);
            }

            if (index < realms.length - 1) {
                const rule = gameData.breakthroughRules?.[realm.code];
                if (!rule) {
                    errors.push(`${path}.code references missing breakthroughRules.${realm.code}`);
                } else if (rule.nextRealm !== realms[index + 1].code) {
                    errors.push(`breakthroughRules.${realm.code}.nextRealm must be ${realms[index + 1].code}`);
                }
            }
        });
    }

    validateStageGrowthDefinition(path, definition, errors) {
        if (!definition || !Number.isFinite(Number(definition.initial)) || Number(definition.initial) < 0) {
            errors.push(`${path}.initial must be a non-negative number`);
        }

        if (!definition || !Number.isFinite(Number(definition.growthPerStage)) || Number(definition.growthPerStage) <= 0) {
            errors.push(`${path}.growthPerStage must be a positive number`);
        }
    }

    validateBreakthroughRules(gameData, errors) {
        for (const [realmId, rule] of Object.entries(gameData.breakthroughRules || {})) {
            const lossPercent = rule.failureCultivationLossPercent;
            if (!Number.isFinite(lossPercent) || lossPercent < 0 || lossPercent > 100) {
                errors.push(`breakthroughRules.${realmId}.failureCultivationLossPercent must be between 0 and 100`);
            }
        }
    }

    validateConditions(gameData, errors) {
        for (const [conditionId, condition] of Object.entries(gameData.conditions || {})) {
            if (!condition.root || !isPlainObject(condition.root)) {
                errors.push(`conditions.${conditionId}.root must be an object`);
                continue;
            }
            this.validateConditionNode(`conditions.${conditionId}.root`, condition.root, gameData, errors);
        }
    }

    validateConditionNode(path, node, gameData, errors) {
        if (node.type === 'GROUP') {
            if (!['ALL', 'ANY'].includes(node.operator)) {
                errors.push(`${path}.operator must be ALL or ANY for GROUP`);
            }
            if (!Array.isArray(node.children) || node.children.length === 0) {
                errors.push(`${path}.children must be a non-empty array for GROUP`);
                return;
            }
            node.children.forEach((child, index) => {
                if (!isPlainObject(child)) {
                    errors.push(`${path}.children[${index}] must be an object`);
                    return;
                }
                this.validateConditionNode(`${path}.children[${index}]`, child, gameData, errors);
            });
            return;
        }

        if (node.type !== 'PREDICATE') {
            errors.push(`${path}.type must be GROUP or PREDICATE`);
            return;
        }
        if (!['HP_PERCENT', 'HAS_EFFECT', 'IS_ALIVE'].includes(node.predicate)) {
            errors.push(`${path}.predicate is unsupported`);
        }
        if (!['SELF', 'TARGET'].includes(node.subject)) {
            errors.push(`${path}.subject must be SELF or TARGET`);
        }

        if (node.predicate === 'HP_PERCENT') {
            if (!['LT', 'LTE', 'GT', 'GTE', 'EQ'].includes(node.operator)) {
                errors.push(`${path}.operator is invalid for HP_PERCENT`);
            }
            if (!Number.isFinite(Number(node.value)) || Number(node.value) < 0 || Number(node.value) > 100) {
                errors.push(`${path}.value must be between 0 and 100 for HP_PERCENT`);
            }
        }

        if (node.predicate === 'HAS_EFFECT') {
            if (node.operator !== 'IS' || typeof node.value !== 'boolean') {
                errors.push(`${path} must use operator IS and boolean value for HAS_EFFECT`);
            }
            const effectId = node.arguments?.effectId;
            if (!effectId || !gameData.coreEffects?.[effectId]) {
                errors.push(`${path}.arguments.effectId references missing coreEffects.${effectId || 'undefined'}`);
            }
        }

        if (node.predicate === 'IS_ALIVE' && (node.operator !== 'IS' || typeof node.value !== 'boolean')) {
            errors.push(`${path} must use operator IS and boolean value for IS_ALIVE`);
        }
    }

    validateCoreEffects(gameData, errors) {
        const allowedEffectTypes = new Set(['PASSIVE', 'STATUS', 'INSTANT', 'TRIGGER']);
        const allowedEvents = new Set([
            'BATTLE_START', 'ROUND_START', 'TURN_START', 'TURN_ACTION', 'BEFORE_ACTION', 'AFTER_ACTION',
            'ON_APPLY', 'ON_ATTACK', 'ON_HIT', 'ON_DAMAGE', 'ON_CRITICAL', 'ON_KILL',
            'ON_HEAL', 'ON_SHIELD', 'ON_EFFECT_APPLIED', 'ON_EFFECT_ADD', 'ON_EFFECT_REMOVE',
            'ON_DEATH', 'TURN_END', 'ROUND_END', 'BATTLE_END', 'HP_BELOW_PERCENT'
        ]);
        for (const [effectId, effect] of Object.entries(gameData.coreEffects || {})) {
            const isMarker = effect.tags?.includes('MARKER');
            const isControlDirective = Boolean(effect.controlDirective);
            const hasPassiveBindings = Array.isArray(effect.passiveBindings)
                && effect.passiveBindings.length > 0;
            for (const scope of effect.scopes || []) {
                if (!['ACTION', 'ENTITY', 'CULTIVATION', 'BREAKTHROUGH'].includes(scope)) {
                    errors.push(`coreEffects.${effectId}.scopes contains unsupported scope ${scope}`);
                }
            }
            if (effect.element && effect.element !== 'NEUTRAL' && !gameData.elements?.[effect.element]) {
                errors.push(`coreEffects.${effectId}.element references missing elements.${effect.element}`);
            }
            if (effect.defensiveElement && effect.defensiveElement !== 'NEUTRAL' && !gameData.elements?.[effect.defensiveElement]) {
                errors.push(`coreEffects.${effectId}.defensiveElement references missing elements.${effect.defensiveElement}`);
            }
            if (!effect.type) {
                errors.push(`coreEffects.${effectId}.type is required`);
            } else if (!allowedEffectTypes.has(effect.type)) {
                errors.push(`coreEffects.${effectId}.type is invalid`);
            }

            if (effect.duration != null && (!Number.isInteger(Number(effect.duration)) || Number(effect.duration) <= 0)) {
                errors.push(`coreEffects.${effectId}.duration must be a positive integer`);
            }

            if (effect.stackable && (!Number.isInteger(Number(effect.maxStack)) || Number(effect.maxStack) <= 0)) {
                errors.push(`coreEffects.${effectId}.maxStack must be a positive integer when stackable=true`);
            }

            for (const [bindingIndex, binding] of (effect.passiveBindings || []).entries()) {
                const path = `coreEffects.${effectId}.passiveBindings[${bindingIndex}]`;
                if (!['ACTION', 'ENTITY', 'CULTIVATION', 'BREAKTHROUGH'].includes(binding.scope)) {
                    errors.push(`${path}.scope is unsupported`);
                }
                if (!(effect.scopes || []).includes(binding.scope)) {
                    errors.push(`${path}.scope must be declared by the Effect`);
                }
                if (!binding.modifierId || !gameData.modifiers?.[binding.modifierId]) {
                    errors.push(`${path}.modifierId references missing modifiers.${binding.modifierId || 'undefined'}`);
                }
                if (binding.value != null && !Number.isFinite(Number(binding.value))) {
                    errors.push(`${path}.value must be numeric when provided`);
                }
                if (binding.scope === 'ACTION'
                    && ![
                        'ACTION_ELEMENT_MATCHES_SOURCE_AFFINITY',
                        'ACTION_ELEMENT_COUNTERS_TARGET'
                    ].includes(binding.predicate)) {
                    errors.push(`${path}.predicate is unsupported for ACTION binding`);
                }
                if (binding.scope !== 'ACTION' && binding.predicate != null) {
                    errors.push(`${path}.predicate is only supported for ACTION bindings`);
                }
            }

            if (!isMarker && !isControlDirective && !hasPassiveBindings
                && (!Array.isArray(effect.events) || effect.events.length === 0)) {
                errors.push(`coreEffects.${effectId}.events must be a non-empty array`);
            }

            if (isControlDirective && !['SKIP_ACTION', 'BASIC_ATTACK_ONLY'].includes(effect.controlDirective)) {
                errors.push(`coreEffects.${effectId}.controlDirective is invalid`);
            }

            for (const [eventIndex, event] of (effect.events || []).entries()) {
                if (!event.event || !allowedEvents.has(event.event)) {
                    errors.push(`coreEffects.${effectId}.events[${eventIndex}].event is invalid`);
                }
                if (event.chance != null && (!Number.isFinite(Number(event.chance)) || Number(event.chance) < 0 || Number(event.chance) > 100)) {
                    errors.push(`coreEffects.${effectId}.events[${eventIndex}].chance must be between 0 and 100`);
                }
                if (event.conditionId && !gameData.conditions?.[event.conditionId]) {
                    errors.push(`coreEffects.${effectId}.events[${eventIndex}].conditionId references missing conditions.${event.conditionId}`);
                }
            }

            if (!isMarker && !isControlDirective && !hasPassiveBindings
                && (!Array.isArray(effect.actions) || effect.actions.length === 0)) {
                errors.push(`coreEffects.${effectId}.actions must be a non-empty array`);
                continue;
            }

            effect.actions.forEach((action, index) => {
                if (!action.type) {
                    errors.push(`coreEffects.${effectId}.actions[${index}].type is required`);
                }

                if (!action.target) {
                    errors.push(`coreEffects.${effectId}.actions[${index}].target is required`);
                } else if (action.target !== 'TARGET' && !gameData.targets?.[action.target]) {
                    errors.push(`coreEffects.${effectId}.actions[${index}].target references missing targets.${action.target}`);
                }

                if (action.type && !gameData.actionTypes?.[action.type]) {
                    errors.push(`coreEffects.${effectId}.actions[${index}].type references missing actionTypes.${action.type}`);
                }

                if (action.conditionId && !gameData.conditions?.[action.conditionId]) {
                    errors.push(`coreEffects.${effectId}.actions[${index}].conditionId references missing conditions.${action.conditionId}`);
                }
                if (action.element && action.element !== 'NEUTRAL' && !gameData.elements?.[action.element]) {
                    errors.push(`coreEffects.${effectId}.actions[${index}].element references missing elements.${action.element}`);
                }
                validateElementWeights(`coreEffects.${effectId}.actions[${index}]`, action, gameData, errors);
                if (action.chance != null && (!Number.isFinite(Number(action.chance)) || Number(action.chance) < 0 || Number(action.chance) > 100)) {
                    errors.push(`coreEffects.${effectId}.actions[${index}].chance must be between 0 and 100`);
                }

                const actionArguments = action.arguments || {};
                if (actionArguments.formulaId && !gameData.formulas?.[actionArguments.formulaId]) {
                    errors.push(`coreEffects.${effectId}.actions[${index}].arguments.formulaId references missing formulas.${actionArguments.formulaId}`);
                }

                if (actionArguments.modifierId && !gameData.modifiers?.[actionArguments.modifierId]) {
                    errors.push(`coreEffects.${effectId}.actions[${index}].arguments.modifierId references missing modifiers.${actionArguments.modifierId}`);
                }

                if (actionArguments.effectId && !gameData.coreEffects?.[actionArguments.effectId]) {
                    errors.push(`coreEffects.${effectId}.actions[${index}].arguments.effectId references missing coreEffects.${actionArguments.effectId}`);
                }
            });
        }
    }

    validateSkillDefinitions(gameData, errors) {
        for (const [skillId, skill] of Object.entries(gameData.skillDefinitions || {})) {
            if (skill.element && skill.element !== 'NEUTRAL' && !gameData.elements?.[skill.element]) {
                errors.push(`skillDefinitions.${skillId}.element references missing elements.${skill.element}`);
            }

            if (!Array.isArray(skill.effects) || skill.effects.length === 0) {
                errors.push(`skillDefinitions.${skillId}.effects must be a non-empty array`);
                continue;
            }

            skill.effects.forEach((effectId, index) => {
                if (!gameData.coreEffects?.[effectId]) {
                    errors.push(`skillDefinitions.${skillId}.effects[${index}] references missing coreEffects.${effectId}`);
                }
            });
        }
    }

    validateItemTemplateReferences(gameData, errors) {
        for (const [itemId, item] of Object.entries(gameData.itemTemplates || {})) {
            if (item.status === 'DEPRECATED') {
                if (!item.replacedByItemId) {
                    errors.push(`itemTemplates.${itemId}.replacedByItemId is required when deprecated`);
                } else if (item.replacedByItemId === itemId) {
                    errors.push(`itemTemplates.${itemId}.replacedByItemId must not reference itself`);
                } else if (!gameData.itemTemplates?.[item.replacedByItemId]) {
                    errors.push(
                        `itemTemplates.${itemId}.replacedByItemId references missing`
                        + ` itemTemplates.${item.replacedByItemId}`
                    );
                }
            }

            if (item.skillId && !gameData.skills?.[item.skillId]) {
                errors.push(`itemTemplates.${itemId}.skillId references missing skills.${item.skillId}`);
            }

            if (item.artId && !gameData.cultivationArts?.[item.artId]) {
                errors.push(`itemTemplates.${itemId}.artId references missing cultivationArts.${item.artId}`);
            }

            for (const [index, action] of (item.actions || []).entries()) {
                if (action.type !== 'GRANT_CULTIVATION_PERCENT') continue;
                const path = `itemTemplates.${itemId}.actions[${index}]`;
                if (item.usable !== true) {
                    errors.push(`${path} requires item.usable = true`);
                }
                if (item.realmPolicy !== 'EXACT_REALM') {
                    errors.push(`${path} requires realmPolicy EXACT_REALM`);
                }
                if (!Object.values(gameData.realms || {}).some(
                    (realm) => realm.code === action.parameters?.realmCode
                )) {
                    errors.push(`${path}.parameters.realmCode references a missing Realm`);
                }
                const percent = Number(action.parameters?.requiredCultivationPercent);
                if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
                    errors.push(
                        `${path}.parameters.requiredCultivationPercent must be within (0, 100]`
                    );
                }
                if (action.parameters?.capAtBreakthroughThreshold !== true) {
                    errors.push(`${path}.parameters.capAtBreakthroughThreshold must be true`);
                }
            }

            this.validateEffectList(`itemTemplates.${itemId}.effects`, item.effects, gameData, errors);
            this.validateEffectList(`itemTemplates.${itemId}.fixed_effects`, item.fixed_effects, gameData, errors);
        }
    }

    validateSkillReferences(gameData, errors) {
        this.validatePlayerSkillLoadoutRules(gameData, errors);
        const selfSustainThreshold = Number(
            gameData.skillRules?.activeSkillSelection?.selfSustainPriorityBelowHpPercent
        );
        const displayLabels = gameData.skillRules?.displayLabels || {};
        for (const contentType of ['CULTIVATION_ART', 'ACTIVE', 'PASSIVE']) {
            if (!String(displayLabels.contentTypes?.[contentType] || '').trim()) {
                errors.push(`skillRules.displayLabels.contentTypes.${contentType} is required`);
            }
        }
        for (const elementId of [...Object.keys(gameData.elements || {}), 'NEUTRAL']) {
            if (!String(displayLabels.elements?.[elementId] || '').trim()) {
                errors.push(`skillRules.displayLabels.elements.${elementId} is required`);
            }
        }
        for (const grade of ['HOANG', 'HUYEN', 'DIA', 'THIEN', 'THANH', 'THAN']) {
            if (!String(displayLabels.grades?.[grade] || '').trim()) {
                errors.push(`skillRules.displayLabels.grades.${grade} is required`);
            }
        }
        if (!Number.isFinite(selfSustainThreshold)
            || selfSustainThreshold <= 0
            || selfSustainThreshold > 100) {
            errors.push(
                'skillRules.activeSkillSelection.selfSustainPriorityBelowHpPercent'
                + ' must be greater than 0 and at most 100'
            );
        }

        for (const [skillId, skill] of Object.entries(gameData.skills || {})) {
            this.validateEffectList(`skills.${skillId}.effects`, skill.effects, gameData, errors);
            const elementMode = skill.combat?.elementMode || skill.elementMode || 'FIXED';
            if (!['FIXED', 'INHERIT_CASTER'].includes(elementMode)) {
                errors.push(`skills.${skillId}.elementMode must be FIXED or INHERIT_CASTER`);
            }
            if (elementMode === 'INHERIT_CASTER' && skill.type !== 'ACTIVE') {
                errors.push(`skills.${skillId}.elementMode INHERIT_CASTER is only valid for Active Skill`);
            }
            if (elementMode === 'FIXED'
                && skill.combat?.element
                && skill.combat.element !== 'NEUTRAL'
                && !gameData.elements?.[skill.combat.element]) {
                errors.push(`skills.${skillId}.combat.element references missing elements.${skill.combat.element}`);
            }

            if (!Number.isSafeInteger(skill.cooldownTurns) || skill.cooldownTurns < 0) {
                errors.push(`skills.${skillId}.cooldownTurns must be a non-negative safe integer`);
            }
            if (skill.type === 'ACTIVE' && skill.cooldownTurns <= 0) {
                errors.push(`skills.${skillId}.cooldownTurns must be positive for an Active Skill`);
            }
            if (skill.type === 'PASSIVE' && skill.cooldownTurns !== 0) {
                errors.push(`skills.${skillId}.cooldownTurns must be 0 for a Passive Skill`);
            }

            const actions = skill.combat?.actions;
            if (!Array.isArray(actions) || actions.length === 0) {
                errors.push(`skills.${skillId}.combat.actions must be a non-empty array`);
                continue;
            }

            const localActionIds = new Set();
            const localOrders = new Set();
            actions.forEach((action, index) => {
                const path = `skills.${skillId}.combat.actions[${index}]`;
                if (typeof action?.id !== 'string' || !action.id.trim()) {
                    errors.push(`${path}.id must be a non-empty string`);
                } else {
                    if (localActionIds.has(action.id)) errors.push(`${path}.id duplicates ${action.id} in skill`);
                    localActionIds.add(action.id);
                }

                if (!Number.isSafeInteger(action?.order) || action.order < 1) {
                    errors.push(`${path}.order must be a positive safe integer`);
                } else if (localOrders.has(action.order)) {
                    errors.push(`${path}.order duplicates ${action.order} in skill`);
                } else {
                    localOrders.add(action.order);
                }

                const canonicalType = action?.type === 'APPLY_EFFECT' ? 'ADD_EFFECT' : action?.type;
                if (!canonicalType || !gameData.actionTypes?.[canonicalType]) {
                    errors.push(`${path}.type references missing actionTypes.${canonicalType || 'undefined'}`);
                }
                if (action?.formulaId && !gameData.formulas?.[action.formulaId]) {
                    errors.push(`${path}.formulaId references missing formulas.${action.formulaId}`);
                }
                if (action?.effectId && !gameData.coreEffects?.[action.effectId]) {
                    errors.push(`${path}.effectId references missing coreEffects.${action.effectId}`);
                }
                if (action?.modifierId && !gameData.modifiers?.[action.modifierId]) {
                    errors.push(`${path}.modifierId references missing modifiers.${action.modifierId}`);
                }
                if (action?.conditionId && !gameData.conditions?.[action.conditionId]) {
                    errors.push(`${path}.conditionId references missing conditions.${action.conditionId}`);
                }
                if (action?.chanceByVariant != null) {
                    if (!isPlainObject(action.chanceByVariant)) {
                        errors.push(`${path}.chanceByVariant must be an object`);
                    } else {
                        for (const [variantId, chance] of Object.entries(action.chanceByVariant)) {
                            if (variantId !== 'DEFAULT' && !gameData.monsterVariants?.[variantId]) {
                                errors.push(`${path}.chanceByVariant references missing monsterVariants.${variantId}`);
                            }
                            if (!Number.isFinite(Number(chance))
                                || Number(chance) < 0
                                || Number(chance) > 100) {
                                errors.push(`${path}.chanceByVariant.${variantId} must be between 0 and 100`);
                            }
                        }
                    }
                }
                if (action?.elementMode != null
                    && !['FIXED', 'INHERIT_CASTER'].includes(action.elementMode)) {
                    errors.push(`${path}.elementMode must be FIXED or INHERIT_CASTER`);
                }
                validateElementWeights(path, action, gameData, errors);
            });

            if (skill.combat?.element && !gameData.effects?.spirit) {
                continue;
            }
        }
    }

    validateEquipmentAffixes(gameData, errors) {
        const affixGroups = gameData.equipmentAffixes || {};

        for (const [slot, affixes] of Object.entries(affixGroups)) {
            if (!Array.isArray(affixes)) {
                errors.push(`equipmentAffixes.${slot} must be an array`);
                continue;
            }

            affixes.forEach((affix, index) => {
                if (!affix?.stat) {
                    errors.push(`equipmentAffixes.${slot}[${index}] is missing stat`);
                }
            });
        }
    }

    validateRewardTables(gameData, errors) {
        for (const [poolId, pool] of Object.entries(gameData.equipmentGradePools || {})) {
            if (!isPlainObject(pool.grades) || Object.keys(pool.grades).length === 0) {
                errors.push(`equipmentGradePools.${poolId}.grades must be a non-empty object`);
                continue;
            }
            for (const [gradeId, weight] of Object.entries(pool.grades)) {
                if (!gameData.equipmentGrades?.[gradeId]) {
                    errors.push(`equipmentGradePools.${poolId}.grades references missing equipmentGrades.${gradeId}`);
                }

                if (!Number.isFinite(Number(weight)) || Number(weight) <= 0) {
                    errors.push(`equipmentGradePools.${poolId}.grades.${gradeId} must be positive`);
                }
            }
        }

        for (const [tableId, table] of Object.entries(gameData.rewardTables || {})) {
            if (!Array.isArray(table.rewards)) {
                errors.push(`rewardTables.${tableId}.rewards must be an array`);
                continue;
            }

            if (!Number.isInteger(table.rollCount) || table.rollCount < 1) {
                errors.push(`rewardTables.${tableId}.rollCount must be a positive integer`);
            }
            if (!['INDEPENDENT_CHANCE', 'WEIGHTED_ONE'].includes(table.selectionMode)) {
                errors.push(`rewardTables.${tableId}.selectionMode is invalid`);
            }

            table.rewards.forEach((reward, index) => {
                if (!reward.rewardType) {
                    errors.push(`rewardTables.${tableId}.rewards[${index}] is missing rewardType`);
                }

                if (typeof reward.chance !== 'number') {
                    errors.push(`rewardTables.${tableId}.rewards[${index}].chance must be a number`);
                }

                if (reward.gradePoolId && !gameData.equipmentGradePools?.[reward.gradePoolId]) {
                    errors.push(`rewardTables.${tableId}.rewards[${index}].gradePoolId references missing equipmentGradePools.${reward.gradePoolId}`);
                }
                if (table.selectionMode === 'WEIGHTED_ONE'
                    && (!Number.isFinite(reward.weight) || reward.weight <= 0)) {
                    errors.push(`rewardTables.${tableId}.rewards[${index}].weight must be positive`);
                }
                if (table.selectionMode === 'WEIGHTED_ONE'
                    && reward.rewardType === 'ITEM'
                    && !gameData.itemTemplates?.[reward.itemId]) {
                    errors.push(`rewardTables.${tableId}.rewards[${index}].itemId references missing itemTemplates.${reward.itemId}`);
                }
            });
        }
    }

    validateMonsterData(gameData, errors) {
        const maxMonsterSkills = Number(gameData.monsterRules?.skillSlots?.maxSkills);
        if (!Number.isSafeInteger(maxMonsterSkills) || maxMonsterSkills < 1) {
            errors.push('monsterRules.skillSlots.maxSkills must be a positive safe integer');
        }

        const aliases = gameData.monsterRules?.rewardResolution?.aliases || {};
        const realmCodes = new Set(Object.values(gameData.realms || {}).map((realm) => realm.code));
        const realmOrders = new Set(Object.values(gameData.realms || {}).map((realm) => String(realm.order)));
        const qualityRules = gameData.monsterQualityRules || {};
        const qualityTiers = Object.values(gameData.monsterQualityTiers || {});
        const qualityOrders = new Set();
        const catalogSkillIds = new Set();

        if (qualityRules.formula !== 'ADDITIVE_FROM_ORIGINAL_BASE') {
            errors.push('monsterQualityRules.formula must be ADDITIVE_FROM_ORIGINAL_BASE');
        }
        if (!Number.isFinite(qualityRules.stepPercent) || qualityRules.stepPercent < 0) {
            errors.push('monsterQualityRules.stepPercent must be a non-negative number');
        }
        if (!gameData.monsterQualityTiers?.[qualityRules.defaultQualityId]) {
            errors.push('monsterQualityRules.defaultQualityId must reference monsterQualityTiers');
        }
        if (!Array.isArray(qualityRules.affectedStats)
            || qualityRules.affectedStats.join(',') !== 'HP,ATK,DEF,SPD') {
            errors.push('monsterQualityRules.affectedStats must be HP,ATK,DEF,SPD');
        }
        const rewardChancePolicy = qualityRules.rewardChancePolicy || {};
        if (rewardChancePolicy.formula !== 'RELATIVE_MULTIPLIER_CAP_100') {
            errors.push('monsterQualityRules.rewardChancePolicy.formula must be RELATIVE_MULTIPLIER_CAP_100');
        }
        if (!Array.isArray(rewardChancePolicy.eligibleRewardTypes)
            || rewardChancePolicy.eligibleRewardTypes.join(',') !== 'ITEM,EQUIPMENT,SKILL,CULTIVATION_ART') {
            errors.push('monsterQualityRules.rewardChancePolicy.eligibleRewardTypes is invalid');
        }
        if (!Array.isArray(rewardChancePolicy.excludedRewardTypes)
            || rewardChancePolicy.excludedRewardTypes.join(',') !== 'CURRENCY') {
            errors.push('monsterQualityRules.rewardChancePolicy.excludedRewardTypes must be CURRENCY');
        }
        if (rewardChancePolicy.capPercent !== 100) {
            errors.push('monsterQualityRules.rewardChancePolicy.capPercent must be 100');
        }
        for (const quality of qualityTiers) {
            if (!Number.isInteger(quality.order) || quality.order <= 0 || qualityOrders.has(quality.order)) {
                errors.push(`monsterQualityTiers.${quality.id}.order must be a unique positive integer`);
            }
            if (!Number.isFinite(Number(quality.rewardChanceBonusPercent))
                || Number(quality.rewardChanceBonusPercent) < 0) {
                errors.push(`monsterQualityTiers.${quality.id}.rewardChanceBonusPercent must be a non-negative number`);
            }
            qualityOrders.add(quality.order);
        }
        const qualityPoolRealmCodes = new Set();
        for (const [poolId, pool] of Object.entries(gameData.monsterQualityPools || {})) {
            const entryIds = new Set();
            const totalWeight = (pool.entries || []).reduce((total, entry) => total + entry.weight, 0);
            if (!realmCodes.has(pool.realmCode) || qualityPoolRealmCodes.has(pool.realmCode)) {
                errors.push(`monsterQualityPools.${poolId}.realmCode must be valid and unique`);
            }
            qualityPoolRealmCodes.add(pool.realmCode);
            if (!Array.isArray(pool.entries) || pool.entries.length === 0 || totalWeight !== 100) {
                errors.push(`monsterQualityPools.${poolId}.entries must be non-empty and total 100 weight`);
                continue;
            }
            for (const entry of pool.entries) {
                if (!gameData.monsterQualityTiers?.[entry.qualityId]
                    || !Number.isFinite(entry.weight) || entry.weight <= 0
                    || entryIds.has(entry.qualityId)) {
                    errors.push(`monsterQualityPools.${poolId} contains invalid/duplicate quality entry`);
                }
                entryIds.add(entry.qualityId);
            }
        }
        for (const [raceId, race] of Object.entries(gameData.monsterSkillCatalog || {})) {
            const skills = [...(race.skills || []), ...(race.bossSkills || [])];
            if (!race.name || skills.length === 0) {
                errors.push(`monsterSkillCatalog.${raceId} must define a name and at least one skill`);
            }
            for (const skill of skills) {
                if (!skill.id || !skill.name) {
                    errors.push(`monsterSkillCatalog.${raceId} contains a skill without id/name`);
                } else if (catalogSkillIds.has(skill.id)) {
                    errors.push(`monsterSkillCatalog contains duplicate skill id ${skill.id}`);
                }
                catalogSkillIds.add(skill.id);
            }
        }
        const bossPoolRealms = new Set();
        for (const [poolId, pool] of Object.entries(gameData.secretRealmBossPools || {})) {
            if (!realmCodes.has(pool.realmCode) || bossPoolRealms.has(pool.realmCode)) {
                errors.push(`secretRealmBossPools.${poolId}.realmCode must be valid and unique`);
            }
            bossPoolRealms.add(pool.realmCode);
            if (!Array.isArray(pool.entries) || pool.entries.length === 0) {
                errors.push(`secretRealmBossPools.${poolId}.entries must be non-empty`);
                continue;
            }
            for (const entry of pool.entries) {
                const monster = gameData.monsterTemplates?.[entry.monsterId];
                if (!monster || !monster.allowedVariants?.includes('BOSS')
                    || monster.realmCode !== pool.realmCode
                    || !Number.isFinite(entry.weight) || entry.weight <= 0) {
                    errors.push(`secretRealmBossPools.${poolId} contains invalid boss entry ${entry.monsterId}`);
                }
            }
        }

        for (const [aliasId, alias] of Object.entries(aliases)) {
            const path = `monsterRules.rewardResolution.aliases.${aliasId}`;
            if (!isPlainObject(alias)) {
                errors.push(`${path} must be an object`);
                continue;
            }

            if (alias.strategy !== 'BY_REALM_ORDER') {
                errors.push(`${path}.strategy must be BY_REALM_ORDER`);
            }

            if (!isPlainObject(alias.realmOrderTableIds) || Object.keys(alias.realmOrderTableIds).length === 0) {
                errors.push(`${path}.realmOrderTableIds must be a non-empty object`);
                continue;
            }

            for (const [realmOrder, rewardTableId] of Object.entries(alias.realmOrderTableIds)) {
                if (!realmOrders.has(realmOrder)) {
                    errors.push(`${path}.realmOrderTableIds.${realmOrder} references an unknown realm order`);
                }

                if (!gameData.rewardTables?.[rewardTableId]) {
                    errors.push(`${path}.realmOrderTableIds.${realmOrder} references missing rewardTables.${rewardTableId}`);
                }
            }
        }

        for (const [monsterId, monster] of Object.entries(gameData.monsterTemplates || {})) {
            if (!monster.element) {
                errors.push(`monsterTemplates.${monsterId}.element is required`);
            }

            if (!monster.realmCode) {
                errors.push(`monsterTemplates.${monsterId}.realmCode is required`);
            }

            if (monster.aiProfileId && !gameData.monsterAiProfiles?.[monster.aiProfileId]) {
                errors.push(`monsterTemplates.${monsterId}.aiProfileId references missing monsterAiProfiles.${monster.aiProfileId}`);
            }

            if (!Array.isArray(monster.skillIds)) {
                errors.push(`monsterTemplates.${monsterId}.skillIds must be an array`);
            } else {
                if (Number.isSafeInteger(maxMonsterSkills)
                    && monster.skillIds.length > maxMonsterSkills) {
                    errors.push(
                        `monsterTemplates.${monsterId}.skillIds exceeds`
                        + ` monsterRules.skillSlots.maxSkills (${maxMonsterSkills})`
                    );
                }
                const skillIds = new Set();
                monster.skillIds.forEach((skillId, index) => {
                    if (!gameData.skills?.[skillId]) {
                        errors.push(`monsterTemplates.${monsterId}.skillIds[${index}] references missing skills.${skillId}`);
                    }
                    if (skillIds.has(skillId)) {
                        errors.push(`monsterTemplates.${monsterId}.skillIds[${index}] duplicates ${skillId}`);
                    }
                    skillIds.add(skillId);
                });
            }

            if (!monster.rewardTableId) {
                errors.push(`monsterTemplates.${monsterId}.rewardTableId is required`);
                continue;
            }

            if (!gameData.rewardTables?.[monster.rewardTableId]) {
                const alias = aliases[monster.rewardTableId];
                if (!alias) {
                    errors.push(`monsterTemplates.${monsterId}.rewardTableId references missing reward table or alias ${monster.rewardTableId}`);
                    continue;
                }

                const realm = Object.values(gameData.realms || {}).find((candidate) => candidate.code === monster.realmCode);
                const realmOrder = String(realm?.order ?? '');
                const rewardTableId = alias.realmOrderTableIds?.[realmOrder];
                if (!rewardTableId) {
                    errors.push(`monsterTemplates.${monsterId}.rewardTableId alias ${monster.rewardTableId} has no mapping for realm order ${realmOrder || 'UNKNOWN'}`);
                } else if (!gameData.rewardTables?.[rewardTableId]) {
                    errors.push(`monsterTemplates.${monsterId}.rewardTableId alias ${monster.rewardTableId} resolves to missing rewardTables.${rewardTableId}`);
                }
            }
        }
    }

    validatePlayerSkillLoadoutRules(gameData, errors) {
        const loadout = gameData.skillRules?.playerLoadout || {};
        if (!Number.isSafeInteger(loadout.revision) || loadout.revision <= 0) {
            errors.push('skillRules.playerLoadout.revision must be a positive safe integer');
        }
        if (!Number.isSafeInteger(loadout.maxActiveSkills)
            || loadout.maxActiveSkills <= 0) {
            errors.push(
                'skillRules.playerLoadout.maxActiveSkills must be a positive safe integer'
            );
        }

        const realmsByCode = new Map(
            Object.values(gameData.realms || {}).map((realm) => [realm.code, realm])
        );
        const milestones = loadout.capacityMilestones || [];
        if (!Array.isArray(milestones) || milestones.length === 0) {
            errors.push('skillRules.playerLoadout.capacityMilestones must not be empty');
            return;
        }

        let previousOrder = 0;
        let previousCapacity = 0;
        const realmCodes = new Set();
        for (const [index, milestone] of milestones.entries()) {
            const path = `skillRules.playerLoadout.capacityMilestones[${index}]`;
            const realm = realmsByCode.get(milestone.realmCode);
            if (!realm) {
                errors.push(`${path}.realmCode references missing Realm ${milestone.realmCode}`);
                continue;
            }
            if (realmCodes.has(milestone.realmCode)) {
                errors.push(`${path}.realmCode must not repeat ${milestone.realmCode}`);
            }
            realmCodes.add(milestone.realmCode);
            if (realm.order <= previousOrder) {
                errors.push('skillRules.playerLoadout milestones must follow Realm order');
            }
            if (!Number.isSafeInteger(milestone.capacity)
                || milestone.capacity < 1
                || milestone.capacity > 25) {
                errors.push(`${path}.capacity must be an integer from 1 through 25`);
            }
            if (milestone.capacity < previousCapacity) {
                errors.push('skillRules.playerLoadout capacity must not decrease');
            }
            previousOrder = realm.order;
            previousCapacity = milestone.capacity;
        }

        const firstRealm = Object.values(gameData.realms || {})
            .sort((left, right) => left.order - right.order)[0];
        if (milestones[0]?.realmCode !== firstRealm?.code) {
            errors.push('skillRules.playerLoadout must start at the first Realm');
        }
        if (loadout.maxActiveSkills > Math.max(...milestones.map((entry) => entry.capacity))) {
            errors.push('skillRules.playerLoadout.maxActiveSkills exceeds maximum capacity');
        }
    }

    validateMapData(gameData, errors) {
        const realmOrders = new Set(Object.values(gameData.realms || {}).map((realm) => Number(realm.order)));
        const realmCodes = new Set(Object.values(gameData.realms || {}).map((realm) => realm.code));
        const supportedStatuses = new Set(['ACTIVE', 'CONTENT_PENDING', 'DISABLED']);
        const supportedSpawnTypes = new Set(['NORMAL', 'ELITE', 'BOSS']);
        const navigationOrders = new Set();
        let startingMapCount = 0;

        for (const [mapId, map] of Object.entries(gameData.maps || {})) {
            const path = `maps.${mapId}`;
            if (!supportedStatuses.has(map.status)) {
                errors.push(`${path}.status is not supported`);
            }

            if (!Number.isInteger(map.navigationOrder) || map.navigationOrder <= 0) {
                errors.push(`${path}.navigationOrder must be a positive integer`);
            } else if (navigationOrders.has(map.navigationOrder)) {
                errors.push(`${path}.navigationOrder must be unique`);
            } else {
                navigationOrders.add(map.navigationOrder);
            }

            if (map.isStartingMap === true) startingMapCount += 1;
            if (!realmCodes.has(map.realmCode)) {
                errors.push(`${path}.realmCode must reference a valid Realm code`);
            }

            if (map.unlockCondition?.type !== 'MIN_REALM_ORDER' || !realmOrders.has(Number(map.unlockCondition?.realmOrder))) {
                errors.push(`${path}.unlockCondition must reference a valid MIN_REALM_ORDER`);
            }

            if (!realmOrders.has(Number(map.recommendedRealmRange?.minOrder)) || !realmOrders.has(Number(map.recommendedRealmRange?.maxOrder))) {
                errors.push(`${path}.recommendedRealmRange must reference valid realm orders`);
            }

            if (map.status === 'ACTIVE' && !map.monsterSpawnPoolId) {
                errors.push(`${path}.monsterSpawnPoolId is required for ACTIVE maps`);
            }

            if (map.monsterSpawnPoolId && !gameData.monsterSpawnPools?.[map.monsterSpawnPoolId]) {
                errors.push(`${path}.monsterSpawnPoolId references missing monsterSpawnPools.${map.monsterSpawnPoolId}`);
            }
            if (map.monsterQualityPoolId && !gameData.monsterQualityPools?.[map.monsterQualityPoolId]) {
                errors.push(`${path}.monsterQualityPoolId references missing monsterQualityPools.${map.monsterQualityPoolId}`);
            }

            if (map.rewardModifier != null && !isPlainObject(map.rewardModifier)) {
                errors.push(`${path}.rewardModifier must be null or an object`);
            }
        }

        if (startingMapCount !== 1) {
            errors.push('maps must define exactly one isStartingMap');
        }

        for (const [poolId, pool] of Object.entries(gameData.monsterSpawnPools || {})) {
            const path = `monsterSpawnPools.${poolId}`;
            if (!Array.isArray(pool.entries) || pool.entries.length === 0) {
                errors.push(`${path}.entries must be a non-empty array`);
                continue;
            }

            pool.entries.forEach((entry, index) => {
                const entryPath = `${path}.entries[${index}]`;
                const monster = gameData.monsterTemplates?.[entry.monsterId];
                if (!monster) {
                    errors.push(`${entryPath}.monsterId references missing monsterTemplates.${entry.monsterId}`);
                }
                if (!Number.isFinite(entry.weight) || entry.weight <= 0) {
                    errors.push(`${entryPath}.weight must be positive`);
                }
                if (!supportedSpawnTypes.has(entry.spawnType)) {
                    errors.push(`${entryPath}.spawnType is not supported`);
                }
                if (entry.qualityId && !gameData.monsterQualityTiers?.[entry.qualityId]) {
                    errors.push(`${entryPath}.qualityId references missing monsterQualityTiers.${entry.qualityId}`);
                }
                if (entry.spawnType === 'BOSS' && entry.qualityId) {
                    errors.push(`${entryPath}.qualityId must be omitted for BOSS`);
                }
                if (monster && Array.isArray(monster.allowedVariants)
                    && !monster.allowedVariants.includes(entry.spawnType)) {
                    errors.push(`${entryPath}.spawnType ${entry.spawnType} is not allowed by monsterTemplates.${entry.monsterId}`);
                }
                if (!realmOrders.has(entry.minPlayerRealmOrder)) {
                    errors.push(`${entryPath}.minPlayerRealmOrder references an unknown realm order`);
                }
                if (entry.maxPlayerRealmOrder != null && !realmOrders.has(entry.maxPlayerRealmOrder)) {
                    errors.push(`${entryPath}.maxPlayerRealmOrder references an unknown realm order`);
                }
                if (entry.maxPlayerRealmOrder != null && entry.maxPlayerRealmOrder < entry.minPlayerRealmOrder) {
                    errors.push(`${entryPath}.maxPlayerRealmOrder must be >= minPlayerRealmOrder`);
                }
            });
        }
    }

    validateTreasureHunt(gameData, errors) {
        const treasureHunt = gameData.treasureHunt || {};

        if (!treasureHunt.rewardTableId) {
            errors.push('treasureHunt.rewardTableId is required');
        }

        if (treasureHunt.rewardTableId && !gameData.rewardTables?.[treasureHunt.rewardTableId]) {
            errors.push(`treasureHunt.rewardTableId references missing rewardTables.${treasureHunt.rewardTableId}`);
        }

        if (typeof treasureHunt.cooldown_seconds !== 'number') {
            errors.push('treasureHunt.cooldown_seconds must be a number');
        }
    }

    validateShopRules(gameData, errors) {
        const rules = gameData.shopRules || {};
        if (!gameData.currencies?.[rules.currencyId]) {
            errors.push(`shopRules.currencyId references missing currencies.${rules.currencyId}`);
        }
        const prices = rules.pricePolicy?.mapBasePrices || [];
        const activeMapIds = new Set(Object.values(gameData.maps || {})
            .filter((map) => map.status === 'ACTIVE')
            .map((map) => map.id));
        const priceMapIds = new Set();
        for (const [index, entry] of prices.entries()) {
            const path = `shopRules.pricePolicy.mapBasePrices[${index}]`;
            if (!activeMapIds.has(entry.mapId)) errors.push(`${path}.mapId references inactive/missing map`);
            if (priceMapIds.has(entry.mapId)) errors.push(`${path}.mapId is duplicated`);
            priceMapIds.add(entry.mapId);
            try {
                if (BigInt(entry.amount) <= 0n) errors.push(`${path}.amount must be positive`);
            } catch {
                errors.push(`${path}.amount must be a canonical integer`);
            }
        }
        for (const mapId of activeMapIds) {
            if (!priceMapIds.has(mapId)) errors.push(`shopRules.pricePolicy is missing map ${mapId}`);
        }
        const multiplierGroups = [
            ['productMultipliers', rules.pricePolicy?.productMultipliers],
            ['shopMultipliers', rules.pricePolicy?.shopMultipliers]
        ];
        for (const [groupName, group] of multiplierGroups) {
            for (const [id, value] of Object.entries(group || {})) {
                if (!/^\d+(?:\.\d+)?$/.test(String(value)) || Number(value) <= 0) {
                    errors.push(`shopRules.pricePolicy.${groupName}.${id} must be a positive decimal`);
                }
            }
        }
        const encounterEntries = rules.explorationEncounter?.entries || [];
        const supportedEncounterTypes = new Set(['MONSTER', 'MYSTERY_MERCHANT', 'FORTUNE_REWARD']);
        let totalWeight = 0;
        for (const [index, entry] of encounterEntries.entries()) {
            const path = `shopRules.explorationEncounter.entries[${index}]`;
            if (!supportedEncounterTypes.has(entry.type)) errors.push(`${path}.type is unsupported`);
            if (!Number.isFinite(entry.weight) || entry.weight <= 0) errors.push(`${path}.weight must be positive`);
            totalWeight += Number(entry.weight || 0);
        }
        if (totalWeight !== 100) errors.push('shopRules.explorationEncounter weights must total 100');
        if (rules.specialShop?.refreshPeriod !== 'WEEKLY') {
            errors.push('shopRules.specialShop.refreshPeriod must be WEEKLY');
        }
        const supportedProductKinds = new Set([
            'ITEM', 'CULTIVATION_ART_BOOK', 'SKILL_BOOK', 'EQUIPMENT'
        ]);
        const specialPattern = rules.specialShop?.slotPattern || [];
        if (specialPattern.length !== Number(rules.specialShop?.slotCount || 0)) {
            errors.push('shopRules.specialShop.slotPattern length must equal slotCount');
        }
        if (specialPattern.some((kind) => !supportedProductKinds.has(kind))) {
            errors.push('shopRules.specialShop.slotPattern contains unsupported kind');
        }
        for (const [path, value] of [
            ['specialShop.slotCount', rules.specialShop?.slotCount],
            ['mysteryMerchant.slotCount', rules.mysteryMerchant?.slotCount],
            ['mysteryMerchant.stockPerSlot', rules.mysteryMerchant?.stockPerSlot],
            ['mysteryMerchant.ttlSeconds', rules.mysteryMerchant?.ttlSeconds],
            ['mysteryMerchant.maxActiveSessionsPerPlayer', rules.mysteryMerchant?.maxActiveSessionsPerPlayer]
        ]) {
            if (!Number.isInteger(Number(value)) || Number(value) <= 0) {
                errors.push(`shopRules.${path} must be a positive integer`);
            }
        }
        const merchantWeights = rules.mysteryMerchant?.productWeights || {};
        const expectedMerchantKinds = [...supportedProductKinds];
        const merchantTotal = expectedMerchantKinds.reduce(
            (sum, kind) => sum + Number(merchantWeights[kind] || 0), 0
        );
        if (merchantTotal !== 100) errors.push('shopRules.mysteryMerchant.productWeights must total 100');
        if (Object.keys(merchantWeights).some((kind) => !expectedMerchantKinds.includes(kind))) {
            errors.push('shopRules.mysteryMerchant.productWeights contains unsupported kind');
        }
        if (rules.mysteryMerchant?.talismanStatus !== 'CONTENT_PENDING') {
            errors.push('shopRules.mysteryMerchant.talismanStatus must remain CONTENT_PENDING');
        }
    }

    validateEffectList(fieldPath, effects, gameData, errors) {
        if (effects == null) {
            return;
        }

        if (!Array.isArray(effects)) {
            errors.push(`${fieldPath} must be an array`);
            return;
        }

        effects.forEach((effect, index) => {
            if (!effect?.stat) {
                errors.push(`${fieldPath}[${index}] is missing stat`);
                return;
            }

            if (!gameData.effects?.[effect.stat]) {
                errors.push(`${fieldPath}[${index}].stat references missing effects.${effect.stat}`);
            }
        });
    }
}
