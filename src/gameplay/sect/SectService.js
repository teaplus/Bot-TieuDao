import { getGameDataManager } from '../../foundation/game-data/gameDataContext.js';
import { compareIntegerAmounts } from '../../shared/numeric/IntegerAmount.js';
import IdempotentOperationExecutor from '../../platform/idempotency/IdempotentOperationExecutor.js';
import { createRequestHash } from '../../platform/idempotency/createRequestHash.js';
import SystemTimeProvider from '../../platform/time/SystemTimeProvider.js';
import SecureSeedProvider from '../../platform/random/SecureSeedProvider.js';
import createSeededRandom from '../../platform/random/createSeededRandom.js';

export default class SectService {
    constructor(options = {}) {
        this.playerRuntimeRepository = options.playerRuntimeRepository;
        this.gameDataManager = options.gameDataManager || getGameDataManager();
        this.operationExecutor = options.operationExecutor || new IdempotentOperationExecutor(options);
        this.timeProvider = options.timeProvider || new SystemTimeProvider();
        this.seedProvider = options.seedProvider || new SecureSeedProvider();
    }

    async listSects(playerId) {
        const runtimePlayer = await this.loadRuntimePlayer(playerId);
        const sects = Object.values(this.gameDataManager.getCollection('sectTemplates') || {});

        return {
            playerId,
            currentSectId: runtimePlayer.sectId,
            sectPoints: runtimePlayer.currencies?.SECT_POINT
                ?? runtimePlayer.currencies?.sectPoints
                ?? '0',
            rejoinAvailableAt: runtimePlayer.sectRejoinAvailableAt,
            membershipPolicy: Object.freeze({
                ...this.getMembershipPolicy()
            }),
            sects: sects.map((sect) => this.createSectView(sect, runtimePlayer))
        };
    }

    async joinSect(playerId, sectId, options = {}) {
        if (!options.operationId) throw new Error('SECT_JOIN_OPERATION_ID_REQUIRED');

        return this.operationExecutor.execute({
            operationId: options.operationId,
            playerId,
            operationType: 'SECT_JOIN',
            requestHash: createRequestHash({ operationType: 'SECT_JOIN', playerId, sectId })
        }, async (client) => {
            const runtimePlayer = await this.loadRuntimePlayer(playerId, client);
            const sect = this.resolveSect(sectId);
            const joinedAt = options.joinedAt || this.timeProvider.now();
            if (runtimePlayer.sectId && runtimePlayer.sectId !== sect.id) {
                throw new Error('ALREADY_JOINED_SECT');
            }
            if (!runtimePlayer.sectId && runtimePlayer.sectRejoinAvailableAt
                && new Date(runtimePlayer.sectRejoinAvailableAt).getTime() > joinedAt.getTime()) {
                const error = new Error('SECT_REJOIN_COOLDOWN');
                error.rejoinAvailableAt = runtimePlayer.sectRejoinAvailableAt;
                throw error;
            }
            if (!this.playerRuntimeRepository || typeof this.playerRuntimeRepository.joinSect !== 'function') {
                throw new Error('SECT_REPOSITORY_REQUIRED');
            }

            const joined = await this.playerRuntimeRepository.joinSect(playerId, {
                sectId: sect.id,
                joinedAt
            }, { client, operationId: options.operationId });
            return {
                sect: this.createSectView(sect, { ...runtimePlayer, sectId: sect.id }),
                result: joined
            };
        });
    }

    async listExchangeRules(playerId) {
        const runtimePlayer = await this.loadRuntimePlayer(playerId);
        const sect = this.resolvePlayerSect(runtimePlayer);
        const rules = Object.values(this.gameDataManager.getCollection('sectExchangeRules') || {});

        return {
            playerId,
            sect: this.createSectView(sect, runtimePlayer),
            sectPoints: runtimePlayer.currencies?.SECT_POINT
                ?? runtimePlayer.currencies?.sectPoints
                ?? '0',
            rules: rules.map((rule) => this.createRuleView(rule, sect, runtimePlayer))
        };
    }

    async exchangeReward(playerId, ruleId, options = {}) {
        if (!options.operationId) throw new Error('SECT_EXCHANGE_OPERATION_ID_REQUIRED');

        return this.operationExecutor.execute({
            operationId: options.operationId,
            playerId,
            operationType: 'SECT_EXCHANGE',
            requestHash: createRequestHash({ operationType: 'SECT_EXCHANGE', playerId, ruleId })
        }, async (client) => {
            const runtimePlayer = await this.loadRuntimePlayer(playerId, client);
            const sect = this.resolvePlayerSect(runtimePlayer);
            const rule = this.resolveExchangeRule(ruleId);
            const validation = this.validateRule(rule, runtimePlayer, sect);

            if (!validation.available) {
                throw new Error(validation.reason);
            }

            if (!this.playerRuntimeRepository || typeof this.playerRuntimeRepository.exchangeTemplate !== 'function') {
                throw new Error('EXCHANGE_REPOSITORY_REQUIRED');
            }

            const rollSeed = options.rollSeed ?? this.seedProvider.nextSeed();
            const rewardSelection = this.rollRewardItem(rule, sect, rollSeed);
            const rewardItem = rewardSelection.item;
            const result = await this.playerRuntimeRepository.exchangeTemplate(playerId, {
                exchangeId: `SECT:${sect.id}:${rule.id}`,
                costs: [{ currencyId: rule.cost.currencyId, amount: rule.cost.amount }],
                rewards: [{
                    itemId: rewardItem.id,
                    quantity: 1,
                    rollSeed,
                    poolId: rewardSelection.pool.id,
                    entryWeight: rewardSelection.entry.weight
                }],
                exchangedAt: options.exchangedAt || new Date()
            }, { client, operationId: options.operationId });

            return {
                sect: this.createSectView(sect, runtimePlayer),
                rule: this.createRuleView(rule, sect, runtimePlayer),
                reward: {
                    itemId: rewardItem.id,
                    itemName: rewardItem.name,
                    quantity: 1,
                    poolId: rewardSelection.pool.id,
                    rollSeed
                },
                result
            };
        });
    }

    async leaveSect(playerId, options = {}) {
        if (!options.operationId) throw new Error('SECT_LEAVE_OPERATION_ID_REQUIRED');
        const policy = this.getMembershipPolicy();

        return this.operationExecutor.execute({
            operationId: options.operationId,
            playerId,
            operationType: 'SECT_LEAVE',
            requestHash: createRequestHash({
                operationType: 'SECT_LEAVE', playerId, policyRevision: policy.revision
            })
        }, async (client) => {
            const runtimePlayer = await this.loadRuntimePlayer(playerId, client);
            const sect = this.resolvePlayerSect(runtimePlayer);
            if (!this.playerRuntimeRepository || typeof this.playerRuntimeRepository.leaveSect !== 'function') {
                throw new Error('SECT_REPOSITORY_REQUIRED');
            }

            const leftAt = options.leftAt || this.timeProvider.now();
            const rejoinAvailableAt = new Date(
                leftAt.getTime() + (Number(policy.leaveCooldownSeconds) * 1000)
            );
            const result = await this.playerRuntimeRepository.leaveSect(playerId, {
                sectId: sect.id,
                rejoinAvailableAt,
                policyRevision: policy.revision
            }, { client, operationId: options.operationId });

            return {
                sect: this.createSectView(sect, runtimePlayer),
                leftAt,
                rejoinAvailableAt,
                retainSectPoints: policy.retainSectPoints,
                result
            };
        });
    }

    async loadRuntimePlayer(playerId, client = null) {
        const runtimePlayer = await this.playerRuntimeRepository?.findById(playerId, {
            client: client || undefined
        });
        if (!runtimePlayer) {
            throw new Error('PLAYER_NOT_FOUND');
        }

        return runtimePlayer;
    }

    resolveSect(sectId) {
        const sect = this.gameDataManager.getRecord('sectTemplates', sectId);
        if (!sect) {
            throw new Error('SECT_NOT_FOUND');
        }

        return sect;
    }

    getMembershipPolicy() {
        return this.gameDataManager.getCollection('sectPolicy');
    }

    resolvePlayerSect(runtimePlayer) {
        if (!runtimePlayer.sectId) {
            throw new Error('SECT_NOT_JOINED');
        }

        return this.resolveSect(runtimePlayer.sectId);
    }

    resolveExchangeRule(ruleId) {
        const rule = this.gameDataManager.getRecord('sectExchangeRules', ruleId);
        if (!rule) {
            throw new Error('SECT_EXCHANGE_RULE_NOT_FOUND');
        }

        return rule;
    }

    createSectView(sect, runtimePlayer) {
        return {
            id: sect.id,
            name: sect.name,
            element: sect.element,
            effects: sect.effects,
            joined: runtimePlayer.sectId === sect.id
        };
    }

    createRuleView(rule, sect, runtimePlayer) {
        const validation = this.validateRule(rule, runtimePlayer, sect);
        const pool = this.resolveRewardPool(rule, sect);
        const rewardItem = this.resolveFixedRewardItem(pool);

        return {
            id: rule.id,
            category: rule.category,
            grade: rule.grade,
            requiredRealm: rule.requiredRealm,
            cost: rule.cost,
            rewardPoolId: pool?.id || null,
            rewardPoolSize: pool?.entries?.length || 0,
            rewardItem: rewardItem ? {
                id: rewardItem.id,
                name: rewardItem.name,
                description: rewardItem.description,
                type: rewardItem.type,
                rarity: rewardItem.rarity,
                element: rewardItem.element,
                elementLabel: rewardItem.elementLabel,
                gradeLabel: rewardItem.gradeLabel,
                cultivationBonus: rewardItem.cultivationBonus ?? null,
                cooldownTurns: rewardItem.cooldownTurns ?? null,
                trigger: rewardItem.trigger || null,
                condition: rewardItem.condition || null,
                artId: rewardItem.artId || null,
                skillId: rewardItem.skillId || null
            } : null,
            available: validation.available,
            unavailableReason: validation.available ? null : validation.reason
        };
    }

    validateRule(rule, runtimePlayer, sect = null) {
        if (!this.isRealmUnlocked(rule.requiredRealm, runtimePlayer.realmId)) {
            return {
                available: false,
                reason: 'REALM_LOCKED'
            };
        }

        if (!this.gameDataManager.hasRecord('currencies', rule.cost.currencyId)) {
            return {
                available: false,
                reason: 'UNSUPPORTED_SECT_CURRENCY'
            };
        }


        if (sect) {
            const pool = this.resolveRewardPool(rule, sect);
            if (!pool || pool.entries.length === 0) {
                return { available: false, reason: 'SECT_REWARD_POOL_EMPTY' };
            }
            const rewardItem = this.resolveFixedRewardItem(pool);
            if (!rewardItem) {
                return { available: false, reason: 'SECT_REWARD_NOT_FOUND' };
            }
            if (pool.duplicatePolicy === 'DENY_OWNED'
                && this.isInheritanceOwned(rewardItem, runtimePlayer)) {
                return { available: false, reason: 'SECT_REWARD_ALREADY_OWNED' };
            }
        }

        const balance = runtimePlayer.currencies?.[rule.cost.currencyId]
            ?? runtimePlayer.currencies?.sectPoints
            ?? 0;
        if (compareIntegerAmounts(balance, rule.cost.amount) < 0) {
            return {
                available: false,
                reason: 'INSUFFICIENT_SECT_POINT'
            };
        }

        return {
            available: true,
            reason: null
        };
    }

    resolveRewardPool(rule, sect) {
        return this.gameDataManager.getRecord('sectRewardPools', `${sect.id}:${rule.id}`);
    }

    resolveFixedRewardItem(pool) {
        const itemId = pool?.entries?.length === 1 ? pool.entries[0].itemId : null;
        return itemId ? this.gameDataManager.getRecord('itemTemplates', itemId) : null;
    }

    isInheritanceOwned(item, runtimePlayer) {
        const inventoryOwned = runtimePlayer.inventory?.getAllEntries?.().some(
            (entry) => entry.templateId === item.id
        );
        if (inventoryOwned) return true;
        if (item.type === 'CULTIVATION_ART') {
            return runtimePlayer.cultivationArtIds?.includes(item.artId || item.id) || false;
        }
        if (item.type === 'SKILL_BOOK') {
            return runtimePlayer.learnedSkillIds?.includes(item.skillId) || false;
        }
        return false;
    }

    rollRewardItem(rule, sect, seed) {
        const pool = this.resolveRewardPool(rule, sect);
        if (!pool || pool.entries.length === 0) throw new Error('SECT_REWARD_POOL_EMPTY');
        const totalWeight = pool.entries.reduce((sum, entry) => sum + entry.weight, 0);
        let cursor = createSeededRandom(seed)() * totalWeight;
        const entry = pool.entries.find((candidate) => {
            cursor -= candidate.weight;
            return cursor < 0;
        }) || pool.entries[pool.entries.length - 1];
        const item = this.gameDataManager.getRecord('itemTemplates', entry.itemId);
        if (!item) throw new Error('SECT_REWARD_NOT_FOUND');
        return { pool, entry, item };
    }

    isRealmUnlocked(requiredRealmCode, playerRealmId) {
        if (!requiredRealmCode) {
            return true;
        }

        const realms = Object.values(this.gameDataManager.getCollection('realms') || {});
        const requiredRealm = realms.find((realm) => realm.code === requiredRealmCode);
        if (!requiredRealm) {
            return false;
        }

        return Number(playerRealmId || 0) >= Number(requiredRealm.id || 0);
    }
}
