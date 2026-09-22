import pool from '../database/postgres.js';
import { runInTransaction } from '../platform/database/runInTransaction.js';
import RuntimePlayerFactory from '../runtime/player/RuntimePlayerFactory.js';
import { assertInventoryCapacity } from '../gameplay/inventory/InventoryCapacityPolicy.js';
import { normalizeIntegerAmount } from '../shared/numeric/IntegerAmount.js';
import PlayerWalletRepository from './PlayerWalletRepository.js';
import PlayerInventoryRepository from './PlayerInventoryRepository.js';
import ResourceLedgerRepository from './ResourceLedgerRepository.js';
import PeriodCounterRepository from './PeriodCounterRepository.js';
import PlayerMapStateRepository from './PlayerMapStateRepository.js';

function negateIntegerAmount(value) {
    return (-BigInt(normalizeIntegerAmount(value))).toString();
}

function mapInventoryRow(row) {
    return {
        instanceId: String(row.id),
        itemId: row.item_id,
        quantity: Number(row.quantity),
        rarity: row.rarity || null,
        equippedSlot: row.equipped_slot || null,
        instanceData: row.instance_data || {}
    };
}

export default class PlayerRuntimeRepository {
    constructor(options = {}) {
        this.runtimePlayerFactory = options.runtimePlayerFactory || new RuntimePlayerFactory();
        this.walletRepository = options.walletRepository || new PlayerWalletRepository();
        this.inventoryRepository = options.inventoryRepository || new PlayerInventoryRepository();
        this.resourceLedgerRepository = options.resourceLedgerRepository || new ResourceLedgerRepository();
        this.periodCounterRepository = options.periodCounterRepository || new PeriodCounterRepository();
        this.mapStateRepository = options.mapStateRepository || new PlayerMapStateRepository();
    }

    async findById(playerId, options = {}) {
        const database = options.client || pool;
        const lockClause = options.forUpdate ? ' FOR UPDATE' : '';
        const playerResult = await database.query(
            `SELECT
                id,
                name,
                account_status,
                realm_id,
                spiritual_root,
                spirit_root_id,
                spirit_root_quality_tier_id,
                realm_stage,
                cultivation_art_id,
                sect_id,
                sect_rejoin_available_at,
                sect_policy_revision,
                rebirth_count,
                rebirth_policy_revision,
                COALESCE(
                    (SELECT amount FROM player_wallets WHERE player_id = players.id AND currency_id = 'SPIRIT_STONE'),
                    spirit_stones
                ) AS spirit_stones,
                COALESCE(
                    (SELECT amount FROM player_wallets WHERE player_id = players.id AND currency_id = 'SECT_POINT'),
                    sect_points
                ) AS sect_points,
                COALESCE(
                    (SELECT amount FROM player_wallets WHERE player_id = players.id AND currency_id = 'HONOR'),
                    honor_points
                ) AS honor_points,
                COALESCE(
                    (SELECT amount FROM player_wallets WHERE player_id = players.id AND currency_id = 'EVENT_POINT'),
                    event_points
                ) AS event_points,
                cultivation,
                base_atk,
                base_def,
                base_hp,
                base_spd,
                COALESCE(
                    (
                        SELECT accumulator.checkpoint_at
                        FROM idle_accumulators accumulator
                        WHERE accumulator.player_id = players.id
                          AND accumulator.source_id = 'CULTIVATION'
                    ),
                    last_cultivate
                ) AS last_cultivate,
                last_treasure_hunt,
                created_at
             FROM players
             WHERE id = $1
               AND ($2::boolean = TRUE OR account_status = 'REGISTERED')${lockClause}`,
            [playerId, options.includeGuest === true]
        );

        if (!playerResult.rows.length) {
            return null;
        }

        const walletBalances = await this.walletRepository.listBalances(database, playerId);

        const inventoryRows = await this.inventoryRepository.listEntries(database, playerId);

        const skillResult = await database.query(
            `SELECT skill_id, equipped_slot, loadout_revision
             FROM player_skills
             WHERE player_id = $1
             ORDER BY learned_at, skill_id`,
            [playerId]
        );

        const cultivationArtResult = await database.query(
            `SELECT art_id
             FROM player_cultivation_arts
             WHERE player_id = $1
             ORDER BY learned_at`,
            [playerId]
        );

        return this.runtimePlayerFactory.create({
            playerId: playerResult.rows[0].id,
            name: playerResult.rows[0].name,
            accountStatus: playerResult.rows[0].account_status,
            realmId: playerResult.rows[0].realm_id,
            spiritualRoot: playerResult.rows[0].spiritual_root,
            spiritRootId: playerResult.rows[0].spirit_root_id,
            spiritRootQualityTierId: playerResult.rows[0].spirit_root_quality_tier_id,
            realmStage: playerResult.rows[0].realm_stage,
            cultivationArtId: playerResult.rows[0].cultivation_art_id,
            sectId: playerResult.rows[0].sect_id,
            sectRejoinAvailableAt: playerResult.rows[0].sect_rejoin_available_at,
            sectPolicyRevision: playerResult.rows[0].sect_policy_revision,
            rebirthCount: playerResult.rows[0].rebirth_count,
            rebirthPolicyRevision: playerResult.rows[0].rebirth_policy_revision,
            spiritStones: playerResult.rows[0].spirit_stones,
            sectPoints: playerResult.rows[0].sect_points,
            honor: playerResult.rows[0].honor_points,
            eventPoints: playerResult.rows[0].event_points,
            walletBalances,
            cultivation: playerResult.rows[0].cultivation,
            baseAtk: playerResult.rows[0].base_atk,
            baseDef: playerResult.rows[0].base_def,
            baseHp: playerResult.rows[0].base_hp,
            baseSpd: playerResult.rows[0].base_spd,
            lastCultivate: playerResult.rows[0].last_cultivate,
            lastTreasureHunt: playerResult.rows[0].last_treasure_hunt,
            createdAt: playerResult.rows[0].created_at,
            updatedAt: null,
            inventory: inventoryRows.map(mapInventoryRow),
            learnedSkillIds: skillResult.rows.map((row) => row.skill_id),
            equippedSkillIds: skillResult.rows
                .filter((row) => row.equipped_slot != null)
                .sort((left, right) => left.equipped_slot - right.equipped_slot)
                .map((row) => row.skill_id),
            cultivationArtIds: cultivationArtResult.rows.map((row) => row.art_id)
        });
    }

    async createPlayer(playerId, payload, options = {}) {
        const create = async (client) => {
            const playerUpsert = await client.query(
                `INSERT INTO players (
                    id, name, realm_id, realm_stage,
                    base_atk, base_def, base_hp, base_spd,
                    spirit_root_id, spirit_root_quality_tier_id,
                    spiritual_root, cultivation_art_id, spirit_stones,
                    creation_rerolls_used, creation_rule_revision,
                    account_status, character_registered_at
                 ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15, 'REGISTERED', CURRENT_TIMESTAMP
                 )
                 ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    realm_id = EXCLUDED.realm_id,
                    realm_stage = EXCLUDED.realm_stage,
                    base_atk = EXCLUDED.base_atk,
                    base_def = EXCLUDED.base_def,
                    base_hp = EXCLUDED.base_hp,
                    base_spd = EXCLUDED.base_spd,
                    spirit_root_id = EXCLUDED.spirit_root_id,
                    spirit_root_quality_tier_id = EXCLUDED.spirit_root_quality_tier_id,
                    spiritual_root = EXCLUDED.spiritual_root,
                    cultivation_art_id = EXCLUDED.cultivation_art_id,
                    spirit_stones = players.spirit_stones
                        + CASE WHEN players.character_reset_count = 0
                            THEN EXCLUDED.spirit_stones ELSE 0 END,
                    creation_rerolls_used = EXCLUDED.creation_rerolls_used,
                    creation_rule_revision = EXCLUDED.creation_rule_revision,
                    account_status = 'REGISTERED',
                    character_registered_at = CURRENT_TIMESTAMP
                 WHERE players.account_status = 'GUEST'
                 RETURNING id, spirit_stones`,
                [
                    playerId,
                    payload.name,
                    payload.realmId,
                    payload.realmStage,
                    payload.baseStats.atk,
                    payload.baseStats.def,
                    payload.baseStats.hp,
                    payload.baseStats.spd,
                    payload.spiritRootId,
                    payload.spiritRootQualityTierId,
                    payload.spiritualRoot,
                    payload.cultivationArtId,
                    payload.spiritStones,
                    payload.creationRerollsUsed,
                    payload.creationRuleRevision
                ]
            );
            if (!playerUpsert.rowCount) {
                const error = new Error('PLAYER_ALREADY_REGISTERED');
                error.code = '23505';
                throw error;
            }

            await this.inventoryRepository.insertEquipment(client, {
                playerId,
                itemId: payload.starterEquipment.itemId,
                rarity: payload.starterEquipment.rarity,
                instanceData: {
                    affixes: payload.starterEquipment.affixes || [],
                    fixedEffects: payload.starterEquipment.fixedEffects || [],
                    grade: payload.starterEquipment.grade || null,
                    gradeQuality: payload.starterEquipment.gradeQuality || null,
                    equipmentType: payload.starterEquipment.equipmentType || null,
                    elementIds: payload.starterEquipment.elementIds || [],
                    generatedName: payload.starterEquipment.generatedName || null
                },
                equippedSlot: payload.starterEquipment.equippedSlot
            });

            if (payload.starterCultivationArtItem) {
                await this.inventoryRepository.insertStack(client, {
                    playerId,
                    itemId: payload.starterCultivationArtItem.itemId,
                    quantity: 1,
                    rarity: payload.starterCultivationArtItem.rarity,
                    instanceData: payload.starterCultivationArtItem.instanceData || {}
                });
            }

            await client.query(
                `INSERT INTO player_cultivation_arts (player_id, art_id)
                 VALUES ($1, $2)`,
                [playerId, payload.cultivationArtId]
            );

            await client.query(
                `INSERT INTO player_learned_recipes (player_id, recipe_id, source_ref)
                 SELECT $1, recipe_id, 'CHARACTER_CREATION'
                 FROM UNNEST($2::VARCHAR[]) AS recipe_id
                 ON CONFLICT (player_id, recipe_id) DO NOTHING`,
                [playerId, payload.starterRecipeIds]
            );

            await client.query(
                `INSERT INTO idle_accumulators (
                    player_id,
                    source_id,
                    checkpoint_at,
                    rules_revision
                 )
                 VALUES ($1, 'CULTIVATION', CURRENT_TIMESTAMP, 'cultivation-rules-v3')
                 ON CONFLICT (player_id, source_id) DO NOTHING`,
                [playerId]
            );

            const mapInitializedAt = new Date();
            await this.mapStateRepository.setCurrentMap(client, {
                playerId,
                mapId: payload.currentMapId,
                movedAt: mapInitializedAt
            });
            await this.mapStateRepository.recordMovement(client, {
                playerId,
                operationId: `MAP_INIT:${playerId}`,
                fromMapId: null,
                toMapId: payload.currentMapId,
                direction: 'INITIALIZE',
                movedAt: mapInitializedAt
            });
            return {
                playerId: playerUpsert.rows[0].id,
                spiritStones: normalizeIntegerAmount(playerUpsert.rows[0].spirit_stones)
            };
        };
        if (options.client) return create(options.client);
        return runInTransaction(create);
    }

    async joinSect(playerId, payload, options = {}) {
        const database = options.client || pool;
        const result = await database.query(
            `UPDATE players
             SET sect_id = $1
             WHERE id = $2
               AND (sect_id IS NULL OR sect_id = $1)
               AND (sect_id = $1 OR sect_rejoin_available_at IS NULL OR sect_rejoin_available_at <= $3)
             RETURNING id, sect_id`,
            [payload.sectId, playerId, payload.joinedAt || new Date()]
        );

        if (!result.rowCount) {
            throw new Error('SECT_MEMBERSHIP_CONFLICT');
        }

        return {
            status: 'JOINED_SECT',
            playerId,
            sectId: result.rows[0].sect_id
        };
    }

    async updateCultivationState(playerId, payload, options = {}) {
        const database = options.client || pool;
        await database.query(
            `UPDATE players
             SET cultivation = $1,
                 last_cultivate = $2
             WHERE id = $3`,
            [payload.cultivation, payload.lastCultivateAt, playerId]
        );
        await this.upsertCultivationCheckpoint(database, playerId, payload.lastCultivateAt);
    }

    async updateBreakthroughState(playerId, payload, options = {}) {
        const database = options.client || pool;
        await database.query(
            `UPDATE players
             SET realm_id = $1,
                 realm_stage = $2,
                 cultivation = $3,
                 base_atk = $4,
                 base_hp = $5,
                 base_def = $6,
                 base_spd = $7,
                 last_cultivate = $8
             WHERE id = $9`,
            [
                payload.realmId,
                payload.realmStage,
                payload.cultivation,
                payload.baseAtk,
                payload.baseHp,
                payload.baseDef,
                payload.baseSpd,
                payload.lastCultivateAt,
                playerId
            ]
        );
        await this.upsertCultivationCheckpoint(database, playerId, payload.lastCultivateAt);
    }

    async leaveSect(playerId, payload, options = {}) {
        const database = options.client || pool;
        const result = await database.query(
            `UPDATE players
             SET sect_id = NULL,
                 sect_rejoin_available_at = $1,
                 sect_policy_revision = $2
             WHERE id = $3
               AND sect_id = $4
             RETURNING id, sect_rejoin_available_at, sect_policy_revision`,
            [payload.rejoinAvailableAt, payload.policyRevision, playerId, payload.sectId]
        );

        if (!result.rowCount) throw new Error('SECT_MEMBERSHIP_CONFLICT');
        return {
            status: 'LEFT_SECT',
            playerId,
            previousSectId: payload.sectId,
            rejoinAvailableAt: result.rows[0].sect_rejoin_available_at,
            policyRevision: result.rows[0].sect_policy_revision
        };
    }

    async upsertCultivationCheckpoint(database, playerId, checkpointAt) {
        await database.query(
            `INSERT INTO idle_accumulators (
                player_id,
                source_id,
                checkpoint_at,
                rules_revision
             )
             VALUES ($1, 'CULTIVATION', $2, 'cultivation-rules-v1')
             ON CONFLICT (player_id, source_id)
             DO UPDATE SET checkpoint_at = EXCLUDED.checkpoint_at,
                           rules_revision = EXCLUDED.rules_revision,
                           updated_at = CURRENT_TIMESTAMP`,
            [playerId, checkpointAt]
        );
    }

    async listCultivationArtStates(playerId) {
        const result = await pool.query(
            `SELECT a.art_id, p.cultivation_art_id = a.art_id AS active
             FROM player_cultivation_arts a
             JOIN players p ON p.id = a.player_id
             WHERE a.player_id = $1
             ORDER BY a.learned_at`,
            [playerId]
        );

        return result.rows.map((row) => ({
            artId: row.art_id,
            active: row.active
        }));
    }

    async learnCultivationArt(playerId, payload, options = {}) {
        const work = async (client) => {
            const row = await this.inventoryRepository.findOwnedEntryForUpdate(
                client,
                playerId,
                payload.inventoryId,
                'STACK'
            );
            if (!row) {
                throw new Error('ITEM_NOT_FOUND');
            }

            if (String(row.item_id) !== String(payload.itemId)) {
                throw new Error('ITEM_NOT_FOUND');
            }

            const inserted = await client.query(
                `INSERT INTO player_cultivation_arts (player_id, art_id)
                 VALUES ($1, $2)
                 ON CONFLICT DO NOTHING
                 RETURNING art_id`,
                [playerId, payload.artId]
            );

            if (!inserted.rowCount) {
                throw new Error('ALREADY_LEARNED');
            }

            await this.inventoryRepository.consumeStackQuantity(client, payload.inventoryId, 1);
            await client.query(
                `UPDATE players
                 SET cultivation_art_id = $1
                 WHERE id = $2`,
                [payload.artId, playerId]
            );
        };

        return options.client ? work(options.client) : runInTransaction(work);
    }

    async equipCultivationArt(playerId, artId, options = {}) {
        const database = options.client || pool;
        const result = await database.query(
            `UPDATE players
             SET cultivation_art_id = $1
             WHERE id = $2
               AND EXISTS (
                    SELECT 1
                    FROM player_cultivation_arts
                    WHERE player_id = $2 AND art_id = $1
               )
             RETURNING cultivation_art_id`,
            [artId, playerId]
        );

        if (!result.rowCount) {
            throw new Error('ART_NOT_LEARNED');
        }
    }

    async equipItem(playerId, payload, options = {}) {
        const work = async (client) => {
            const row = await this.inventoryRepository.findOwnedEntryForUpdate(
                client,
                playerId,
                payload.inventoryId,
                'EQUIPMENT'
            );
            if (!row) {
                throw new Error('ITEM_NOT_FOUND');
            }

            if (String(row.item_id) !== String(payload.itemId)) {
                throw new Error('ITEM_NOT_FOUND');
            }

            await this.inventoryRepository.equip(client, playerId, payload.inventoryId, payload.slot);
        };

        return options.client ? work(options.client) : runInTransaction(work);
    }

    async unequipItem(playerId, slot, options = {}) {
        const database = options.client || pool;
        return this.inventoryRepository.unequip(database, playerId, slot);
    }

    async listSkillStates(playerId, options = {}) {
        const database = options.client || pool;
        const lockClause = options.forUpdate ? ' FOR UPDATE' : '';
        const result = await database.query(
            `SELECT skill_id, equipped_slot, loadout_revision
             FROM player_skills
             WHERE player_id = $1
             ORDER BY learned_at, skill_id${lockClause}`,
            [playerId]
        );

        return result.rows.map((row) => ({
            skillId: row.skill_id,
            equippedSlot: row.equipped_slot == null ? null : Number(row.equipped_slot),
            loadoutRevision: row.loadout_revision == null
                ? null
                : Number(row.loadout_revision)
        }));
    }

    async replaceSkillLoadout(playerId, skillIds, revision, options = {}) {
        const database = options.client || pool;
        await database.query(
            `UPDATE player_skills
             SET equipped_slot = NULL,
                 loadout_revision = $2
             WHERE player_id = $1`,
            [playerId, revision]
        );

        for (const [index, skillId] of skillIds.entries()) {
            const result = await database.query(
                `UPDATE player_skills
                 SET equipped_slot = $3,
                     loadout_revision = $4
                 WHERE player_id = $1
                   AND skill_id = $2
                 RETURNING skill_id`,
                [playerId, skillId, index + 1, revision]
            );
            if (!result.rowCount) throw new Error('SKILL_NOT_LEARNED');
        }
    }

    async learnSkill(playerId, payload) {
        await runInTransaction(async (client) => {
            const row = await this.inventoryRepository.findOwnedEntryForUpdate(
                client,
                playerId,
                payload.inventoryId,
                'STACK'
            );
            if (!row) {
                throw new Error('ITEM_NOT_FOUND');
            }

            if (String(row.item_id) !== String(payload.itemId)) {
                throw new Error('ITEM_NOT_FOUND');
            }

            const inserted = await client.query(
                `INSERT INTO player_skills (player_id, skill_id)
                 VALUES ($1, $2)
                 ON CONFLICT DO NOTHING
                 RETURNING skill_id`,
                [playerId, payload.skillId]
            );

            if (!inserted.rowCount) {
                throw new Error('ALREADY_LEARNED');
            }

            await this.inventoryRepository.consumeStackQuantity(client, payload.inventoryId, 1);
        });
    }

    async recordTreasureHuntCompletion(playerId, payload) {
        return runInTransaction(async (client) => {
            const playerResult = await client.query(
                `SELECT last_treasure_hunt
                 FROM players
                 WHERE id = $1 AND account_status = 'REGISTERED'
                 FOR UPDATE`,
                [playerId]
            );

            const player = playerResult.rows[0];
            if (!player) {
                throw new Error('PLAYER_NOT_FOUND');
            }

            const cooldownSeconds = Number(payload.cooldownSeconds || 0);
            const elapsed = player.last_treasure_hunt
                ? Math.floor((Date.now() - new Date(player.last_treasure_hunt).getTime()) / 1000)
                : cooldownSeconds;

            if (elapsed < cooldownSeconds) {
                const error = new Error('COOLDOWN');
                error.remainingSeconds = cooldownSeconds - elapsed;
                throw error;
            }

            const completedAt = payload.completedAt || new Date();
            await client.query(
                `UPDATE players
                 SET last_treasure_hunt = $1
                 WHERE id = $2`,
                [completedAt, playerId]
            );

            return {
                status: 'RECORDED',
                playerId,
                completedAt,
                cooldownSeconds
            };
        });
    }

    async applyRewards(playerId, rewards, options = {}) {
        const work = async (client) => {
            const appliedRewards = [];
            const rewardLedgerEntries = [];
            const playerLock = await client.query(
                `SELECT id FROM players WHERE id = $1 AND account_status = 'REGISTERED' FOR UPDATE`,
                [playerId]
            );

            if (!playerLock.rowCount) {
                throw new Error('PLAYER_NOT_FOUND');
            }

            const inventoryRows = await this.inventoryRepository.listCapacityRowsForUpdate(client, playerId);
            const inventoryCapacity = Number(options.inventoryCapacity || 0);
            assertInventoryCapacity(inventoryRows, rewards, inventoryCapacity);

            for (const reward of rewards) {
                if (reward.type === 'CURRENCY') {
                    const amount = normalizeIntegerAmount(reward.amount || 0);
                    const balanceAfter = await this.walletRepository.credit(client, {
                        playerId,
                        currencyId: reward.currencyId,
                        amount
                    });
                    rewardLedgerEntries.push({
                        resourceType: 'CURRENCY',
                        resourceId: reward.currencyId,
                        delta: amount,
                        balanceAfter,
                        reason: 'REWARD_CURRENCY'
                    });
                    appliedRewards.push({ ...reward, amount });
                    continue;
                }

                if (reward.type === 'EQUIPMENT') {
                    const inventoryId = await this.inventoryRepository.insertEquipment(client, {
                        playerId,
                        itemId: reward.itemId,
                        rarity: reward.rarity,
                        instanceData: {
                            affixes: reward.affixes || [],
                            fixedEffects: reward.fixedEffects || [],
                            grade: reward.grade || null,
                            gradeQuality: reward.gradeQuality || null,
                            equipmentType: reward.equipmentType || null,
                            elementIds: reward.elementIds || [],
                            generatedName: reward.generatedName || null
                        }
                    });
                    rewardLedgerEntries.push({
                        resourceType: 'EQUIPMENT',
                        resourceId: reward.itemId,
                        delta: normalizeIntegerAmount(reward.quantity || 1),
                        balanceAfter: await this.inventoryRepository.getEquipmentCount(
                            client, playerId, reward.itemId
                        ),
                        reason: 'REWARD_EQUIPMENT'
                    });

                    appliedRewards.push({
                        ...reward,
                        inventoryId
                    });
                    continue;
                }

                if (reward.type === 'ITEM') {
                    const existing = await this.inventoryRepository.findStackForUpdate(client, playerId, reward.itemId);

                    let inventoryId;
                    if (existing) {
                        inventoryId = existing.runtimeId;
                        await this.inventoryRepository.incrementStack(client, inventoryId, reward.quantity);
                    } else {
                        inventoryId = await this.inventoryRepository.insertStack(client, {
                            playerId,
                            itemId: reward.itemId,
                            quantity: reward.quantity,
                            rarity: reward.rarity
                        });
                    }
                    rewardLedgerEntries.push({
                        resourceType: 'ITEM',
                        resourceId: reward.itemId,
                        delta: normalizeIntegerAmount(reward.quantity),
                        balanceAfter: await this.inventoryRepository.getStackQuantity(
                            client, playerId, reward.itemId
                        ),
                        reason: 'REWARD_ITEM'
                    });

                    appliedRewards.push({
                        ...reward,
                        inventoryId
                    });
                    continue;
                }

                throw new Error(`UNSUPPORTED_REWARD_TYPE:${reward.type}`);
            }

            if (options.claimId) {
                await this.resourceLedgerRepository.recordMany(client, rewardLedgerEntries.map((entry) => ({
                    ...entry,
                    playerId,
                    referenceType: 'REWARD_CLAIM',
                    referenceId: options.claimId,
                    operationId: options.operationId
                })));
            }

            return appliedRewards;
        };

        return options.client ? work(options.client) : runInTransaction(work);
    }

    async consumeItemByTemplate(playerId, itemId, payload = {}, options = {}) {
        const work = async (client) => {
            const row = payload.inventoryId
                ? await this.inventoryRepository.findOwnedEntryForUpdate(
                    client, playerId, payload.inventoryId, 'STACK'
                )
                : await this.inventoryRepository.findStackForUpdate(client, playerId, itemId);
            const runtimeId = payload.inventoryId || row?.runtimeId;
            const quantity = BigInt(payload.quantity || 1);
            if (!row || String(row.item_id) !== String(itemId) || BigInt(row.quantity) < quantity) {
                throw new Error('ITEM_NOT_FOUND');
            }
            await this.inventoryRepository.consumeStackQuantity(client, runtimeId, quantity);
            if (options.operationId && options.referenceId) {
                const balanceAfter = await this.inventoryRepository.getStackQuantity(client, playerId, itemId);
                await this.resourceLedgerRepository.recordMany(client, [{
                    playerId,
                    resourceType: 'ITEM',
                    resourceId: itemId,
                    delta: normalizeIntegerAmount(-quantity),
                    balanceAfter,
                    reason: options.reason || 'ITEM_CONSUME',
                    referenceType: options.referenceType || 'ACTIVITY_RUN',
                    referenceId: options.referenceId,
                    operationId: options.operationId
                }]);
            }

            return {
                status: 'CONSUMED',
                playerId,
                itemId,
                inventoryId: runtimeId,
                quantity: Number(quantity)
            };
        };

        return options.client ? work(options.client) : runInTransaction(work);
    }

    async recordExplorationResult(playerId, payload, options = {}) {
        const database = options.client || pool;
        const result = await database.query(
            `INSERT INTO player_exploration_runs (
                player_id,
                outcome,
                monster_id,
                monster_template_id,
                reward_table_id,
                activity_run_id,
                encounter_type,
                event_id,
                completed_at
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id, completed_at`,
            [
                playerId,
                payload.outcome,
                payload.monsterId,
                payload.monsterTemplateId,
                payload.rewardTableId,
                payload.activityRunId || null,
                payload.encounterType || 'MONSTER',
                payload.eventId || null,
                payload.completedAt || new Date()
            ]
        );

        return {
            status: 'RECORDED',
            runId: String(result.rows[0].id),
            playerId,
            outcome: payload.outcome,
            monsterId: payload.monsterId,
            monsterTemplateId: payload.monsterTemplateId,
            rewardTableId: payload.rewardTableId,
            activityRunId: payload.activityRunId || null,
            completedAt: result.rows[0].completed_at
        };
    }

    async recordSecretRealmResult(playerId, payload, options = {}) {
        const database = options.client || pool;
        const result = await database.query(
            `INSERT INTO player_secret_realm_runs (
                player_id,
                outcome,
                wave_count,
                cleared_waves,
                boss_monster_id,
                reward_table_id,
                activity_run_id,
                completed_at
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, completed_at`,
            [
                playerId,
                payload.outcome,
                payload.waveCount,
                payload.clearedWaves,
                payload.bossMonsterId,
                payload.rewardTableId,
                payload.activityRunId || null,
                payload.completedAt || new Date()
            ]
        );

        return {
            status: 'RECORDED',
            runId: String(result.rows[0].id),
            playerId,
            outcome: payload.outcome,
            waveCount: payload.waveCount,
            clearedWaves: payload.clearedWaves,
            bossMonsterId: payload.bossMonsterId,
            rewardTableId: payload.rewardTableId,
            activityRunId: payload.activityRunId || null,
            completedAt: result.rows[0].completed_at
        };
    }

    async countGatheringRunsToday(playerId, gatheringId) {
        const result = await pool.query(
            `SELECT COUNT(*) AS count
             FROM player_gathering_runs
             WHERE player_id = $1
               AND gathering_id = $2
               AND completed_at >= CURRENT_DATE`,
            [playerId, gatheringId]
        );

        return Number(result.rows[0]?.count || 0);
    }

    async recordGatheringResult(playerId, payload, options = {}) {
        const database = options.client || pool;
        const result = await database.query(
            `INSERT INTO player_gathering_runs (
                player_id,
                gathering_id,
                reward_table_id,
                stamina_cost,
                activity_run_id,
                completed_at
             )
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, completed_at`,
            [
                playerId,
                payload.gatheringId,
                payload.rewardTableId,
                payload.staminaCost || 0,
                payload.activityRunId || null,
                payload.completedAt || new Date()
            ]
        );

        return {
            status: 'RECORDED',
            runId: String(result.rows[0].id),
            playerId,
            gatheringId: payload.gatheringId,
            rewardTableId: payload.rewardTableId,
            staminaCost: payload.staminaCost || 0,
            activityRunId: payload.activityRunId || null,
            completedAt: result.rows[0].completed_at
        };
    }

    async getProgressSummary(playerId) {
        const [
            explorationResult,
            secretRealmResult,
            gatheringResult,
            shopResult,
            craftResult,
            exchangeResult
        ] = await Promise.all([
            pool.query(
                `SELECT COUNT(*) AS total,
                        COUNT(*) FILTER (WHERE outcome = 'VICTORY') AS victories,
                        MAX(completed_at) AS last_completed_at
                 FROM player_exploration_runs
                 WHERE player_id = $1`,
                [playerId]
            ),
            pool.query(
                `SELECT COUNT(*) AS total,
                        COUNT(*) FILTER (WHERE outcome = 'CLEARED') AS clears,
                        MAX(completed_at) AS last_completed_at
                 FROM player_secret_realm_runs
                 WHERE player_id = $1`,
                [playerId]
            ),
            pool.query(
                `SELECT COUNT(*) AS total,
                        MAX(completed_at) AS last_completed_at
                 FROM player_gathering_runs
                 WHERE player_id = $1`,
                [playerId]
            ),
            pool.query(
                `SELECT COUNT(*) AS total,
                        MAX(purchased_at) AS last_completed_at
                 FROM player_shop_purchases
                 WHERE player_id = $1`,
                [playerId]
            ),
            pool.query(
                `SELECT COUNT(*) AS total,
                        MAX(crafted_at) AS last_completed_at
                 FROM player_craft_logs
                 WHERE player_id = $1`,
                [playerId]
            ),
            pool.query(
                `SELECT COUNT(*) AS total,
                        MAX(exchanged_at) AS last_completed_at
                 FROM player_exchange_logs
                 WHERE player_id = $1`,
                [playerId]
            )
        ]);

        const exploration = explorationResult.rows[0] || {};
        const secretRealm = secretRealmResult.rows[0] || {};
        const gathering = gatheringResult.rows[0] || {};
        const shop = shopResult.rows[0] || {};
        const craft = craftResult.rows[0] || {};
        const exchange = exchangeResult.rows[0] || {};

        return {
            exploration: {
                totalRuns: Number(exploration.total || 0),
                victories: Number(exploration.victories || 0),
                lastCompletedAt: exploration.last_completed_at || null
            },
            secretRealm: {
                totalRuns: Number(secretRealm.total || 0),
                clears: Number(secretRealm.clears || 0),
                lastCompletedAt: secretRealm.last_completed_at || null
            },
            gathering: {
                totalRuns: Number(gathering.total || 0),
                lastCompletedAt: gathering.last_completed_at || null
            },
            shop: {
                totalPurchases: Number(shop.total || 0),
                lastCompletedAt: shop.last_completed_at || null
            },
            craft: {
                totalCrafts: Number(craft.total || 0),
                lastCompletedAt: craft.last_completed_at || null
            },
            exchange: {
                totalExchanges: Number(exchange.total || 0),
                lastCompletedAt: exchange.last_completed_at || null
            }
        };
    }

    async purchaseShopEntry(playerId, payload, options = {}) {
        const work = async (client) => {
            await this.walletRepository.lockPlayer(client, playerId);

            let price = normalizeIntegerAmount(payload.price || 0);
            let currencyId = payload.currencyId;
            let product = payload.product || {
                kind: 'ITEM',
                templateId: payload.itemId,
                quantity: Number(payload.quantity || 1),
                snapshot: null
            };
            let productKind = String(product.kind || 'ITEM').toUpperCase();
            let templateId = product.templateId || payload.itemId;
            let quantity = Number(product.quantity || payload.quantity || 1);
            if (payload.sessionId) {
                const sessionEntryResult = await client.query(
                    `SELECT session.player_id, session.status, session.expires_at,
                            entry.product, entry.costs, entry.stock_remaining
                     FROM shop_sessions session
                     JOIN shop_session_entries entry ON entry.session_id = session.session_id
                     WHERE session.session_id = $1 AND entry.entry_id = $2
                     FOR UPDATE OF session, entry`,
                    [payload.sessionId, payload.entryId]
                );
                const sessionEntry = sessionEntryResult.rows[0];
                if (!sessionEntry || sessionEntry.player_id !== playerId) throw new Error('SHOP_SESSION_NOT_FOUND');
                if (sessionEntry.status !== 'ACTIVE'
                    || new Date(sessionEntry.expires_at).getTime() <= new Date(payload.purchasedAt).getTime()) {
                    throw new Error('SHOP_SESSION_EXPIRED');
                }
                if (Number(sessionEntry.stock_remaining) <= 0) throw new Error('SHOP_ENTRY_SOLD_OUT');
                product = sessionEntry.product;
                productKind = String(product.kind).toUpperCase();
                templateId = product.templateId;
                quantity = Number(product.quantity || 1);
                const cost = sessionEntry.costs?.[0];
                if (!cost) throw new Error('SHOP_ENTRY_COST_MISSING');
                currencyId = cost.currencyId;
                price = normalizeIntegerAmount(cost.amount);
                await client.query(
                    `UPDATE shop_session_entries
                     SET stock_remaining = stock_remaining - 1,
                         purchase_count = purchase_count + 1
                     WHERE session_id = $1 AND entry_id = $2`,
                    [payload.sessionId, payload.entryId]
                );
            }
            const inventoryRows = await this.inventoryRepository.listCapacityRowsForUpdate(client, playerId);
            if (productKind === 'CULTIVATION_ART_BOOK' || productKind === 'SKILL_BOOK') {
                const learnedTable = productKind === 'CULTIVATION_ART_BOOK'
                    ? 'player_cultivation_arts'
                    : 'player_skills';
                const learnedColumn = productKind === 'CULTIVATION_ART_BOOK' ? 'art_id' : 'skill_id';
                const learnedId = productKind === 'CULTIVATION_ART_BOOK'
                    ? (product.snapshot?.artId || templateId)
                    : (product.snapshot?.skillId || String(templateId).replace(/^BOOK_/, ''));
                const learned = await client.query(
                    `SELECT 1 FROM ${learnedTable} WHERE player_id = $1 AND ${learnedColumn} = $2`,
                    [playerId, learnedId]
                );
                if (learned.rowCount || inventoryRows.some((row) => row.item_id === templateId)) {
                    throw new Error('SHOP_PRODUCT_ALREADY_OWNED');
                }
            }
            assertInventoryCapacity(inventoryRows, [{
                type: productKind === 'EQUIPMENT' ? 'EQUIPMENT' : 'ITEM',
                itemId: templateId,
                quantity
            }], Number(payload.inventoryCapacity || 0));
            let counterValue = null;
            if (payload.periodLimit) {
                counterValue = await this.periodCounterRepository.incrementWithinLimit(client, {
                    playerId,
                    ...payload.periodLimit,
                    errorCode: 'SHOP_PURCHASE_LIMIT_REACHED'
                });
            } else if (Number(payload.dailyLimit || 0) > 0) {
                throw new Error('SHOP_PERIOD_LIMIT_REQUIRED');
            }

            const currencyBalance = await this.walletRepository.debit(client, {
                playerId,
                currencyId,
                amount: price
            });

            let inventoryId;
            let itemBalance;
            if (productKind === 'EQUIPMENT') {
                const snapshot = product.snapshot || {};
                inventoryId = await this.inventoryRepository.insertEquipment(client, {
                    playerId,
                    itemId: templateId,
                    rarity: snapshot.rarity || null,
                    instanceData: {
                        affixes: snapshot.affixes || [],
                        fixedEffects: snapshot.fixedEffects || [],
                        grade: snapshot.grade || null,
                        gradeQuality: snapshot.gradeQuality || null,
                        equipmentType: snapshot.equipmentType || null,
                        elementIds: snapshot.elementIds || [],
                        generatedName: snapshot.generatedName || null,
                        shopSnapshotRevision: snapshot.revision || null
                    }
                });
                itemBalance = await this.inventoryRepository.getEquipmentCount(
                    client, playerId, templateId
                );
            } else {
                inventoryId = await this.inventoryRepository.addStackableItem(client, {
                    playerId,
                    itemId: templateId,
                    quantity
                });
                itemBalance = await this.inventoryRepository.getStackQuantity(
                    client, playerId, templateId
                );
            }

            const purchaseResult = await client.query(
                `INSERT INTO player_shop_purchases (
                    player_id,
                    shop_id,
                    entry_id,
                    item_id,
                    quantity,
                    currency_id,
                    price,
                    product_kind,
                    product_snapshot,
                    session_id,
                    purchased_at,
                    operation_id
                 )
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12)
                 RETURNING id, purchased_at`,
                [
                    playerId,
                    payload.shopId,
                    payload.entryId,
                    templateId,
                    quantity,
                    currencyId,
                    price,
                    productKind,
                    JSON.stringify(product.snapshot || {}),
                    payload.sessionId || null,
                    payload.purchasedAt || new Date(),
                    options.operationId || null
                ]
            );
            const purchaseId = String(purchaseResult.rows[0].id);
            await this.resourceLedgerRepository.recordMany(client, [
                {
                    playerId,
                    resourceType: 'CURRENCY',
                    resourceId: currencyId,
                    delta: negateIntegerAmount(price),
                    balanceAfter: currencyBalance,
                    reason: 'SHOP_PURCHASE_COST',
                    referenceType: 'SHOP_PURCHASE',
                    referenceId: purchaseId,
                    operationId: options.operationId,
                    createdAt: purchaseResult.rows[0].purchased_at
                },
                {
                    playerId,
                    resourceType: productKind === 'EQUIPMENT' ? 'EQUIPMENT' : 'ITEM',
                    resourceId: templateId,
                    delta: normalizeIntegerAmount(quantity),
                    balanceAfter: itemBalance,
                    reason: productKind === 'EQUIPMENT'
                        ? 'SHOP_PURCHASE_EQUIPMENT'
                        : 'SHOP_PURCHASE_REWARD',
                    referenceType: 'SHOP_PURCHASE',
                    referenceId: purchaseId,
                    operationId: options.operationId,
                    createdAt: purchaseResult.rows[0].purchased_at
                }
            ]);

            return {
                status: 'PURCHASED',
                purchaseId,
                playerId,
                shopId: payload.shopId,
                entryId: payload.entryId,
                itemId: templateId,
                quantity,
                productKind,
                productSnapshot: product.snapshot || null,
                currencyId,
                sessionId: payload.sessionId || null,
                price,
                periodCounterValue: counterValue,
                inventoryId,
                purchasedAt: purchaseResult.rows[0].purchased_at
            };
        };

        return options.client ? work(options.client) : runInTransaction(work);
    }

    async getShopPurchaseCounter(playerId, payload, options = {}) {
        return this.periodCounterRepository.getValue(options.client || pool, {
            playerId,
            ...payload
        });
    }

    async craftRecipe(playerId, payload, options = {}) {
        const work = async (client) => {
            const currencyCost = normalizeIntegerAmount(payload.costCurrency.amount || 0);
            const currencyBalance = await this.walletRepository.debit(client, {
                playerId,
                currencyId: payload.costCurrency.currencyId,
                amount: currencyCost
            });

            const consumedMaterials = [];
            const materialLedgerEntries = [];
            for (const material of payload.materials || []) {
                const consumed = await this.inventoryRepository.consumeItemAcrossStacks(client, {
                    playerId,
                    itemId: material.itemId,
                    quantity: material.quantity,
                    errorCode: 'INSUFFICIENT_MATERIAL'
                });
                consumedMaterials.push(...consumed);
                materialLedgerEntries.push({
                    resourceType: 'ITEM',
                    resourceId: material.itemId,
                    delta: negateIntegerAmount(material.quantity),
                    balanceAfter: await this.inventoryRepository.getStackQuantity(
                        client, playerId, material.itemId
                    ),
                    reason: 'CRAFT_MATERIAL_COST'
                });
            }

            const inventoryId = await this.inventoryRepository.addStackableItem(client, {
                playerId,
                itemId: payload.resultItemId,
                quantity: payload.resultQuantity
            });
            const resultItemBalance = await this.inventoryRepository.getStackQuantity(
                client, playerId, payload.resultItemId
            );

            const craftResult = await client.query(
                `INSERT INTO player_craft_logs (
                    player_id,
                    recipe_id,
                    result_item_id,
                    quantity,
                    currency_id,
                    currency_cost,
                    crafted_at,
                    operation_id
                 )
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING id, crafted_at`,
                [
                    playerId,
                    payload.recipeId,
                    payload.resultItemId,
                    payload.resultQuantity,
                    payload.costCurrency.currencyId,
                    currencyCost,
                    payload.craftedAt || new Date(),
                    options.operationId || null
                ]
            );
            const craftId = String(craftResult.rows[0].id);
            const ledgerContext = {
                playerId,
                referenceType: 'CRAFT',
                referenceId: craftId,
                operationId: options.operationId,
                createdAt: craftResult.rows[0].crafted_at
            };
            await this.resourceLedgerRepository.recordMany(client, [
                {
                    ...ledgerContext,
                    resourceType: 'CURRENCY',
                    resourceId: payload.costCurrency.currencyId,
                    delta: negateIntegerAmount(currencyCost),
                    balanceAfter: currencyBalance,
                    reason: 'CRAFT_CURRENCY_COST'
                },
                ...materialLedgerEntries.map((entry) => ({ ...ledgerContext, ...entry })),
                {
                    ...ledgerContext,
                    resourceType: 'ITEM',
                    resourceId: payload.resultItemId,
                    delta: normalizeIntegerAmount(payload.resultQuantity),
                    balanceAfter: resultItemBalance,
                    reason: 'CRAFT_RESULT'
                }
            ]);

            return {
                status: 'CRAFTED',
                craftId,
                playerId,
                recipeId: payload.recipeId,
                resultItemId: payload.resultItemId,
                quantity: payload.resultQuantity,
                inventoryId,
                consumedMaterials,
                currencyId: payload.costCurrency.currencyId,
                currencyCost,
                craftedAt: craftResult.rows[0].crafted_at
            };
        };

        return options.client ? work(options.client) : runInTransaction(work);
    }

    async exchangeTemplate(playerId, payload, options = {}) {
        const work = async (client) => {
            const currencyCosts = (payload.costs || []).filter((cost) => cost.currencyId);
            const itemCosts = (payload.costs || []).filter((cost) => cost.itemId);
            const currencyRewards = (payload.rewards || []).filter((reward) => reward.currencyId);
            const itemRewards = (payload.rewards || []).filter((reward) => reward.itemId);
            const ledgerMutations = [];

            await this.walletRepository.lockPlayer(client, playerId);

            const periodCounterValues = [];
            for (const periodLimit of payload.periodLimits || []) {
                periodCounterValues.push({
                    periodType: periodLimit.periodType,
                    periodKey: periodLimit.periodKey,
                    value: await this.periodCounterRepository.incrementWithinLimit(client, {
                        playerId,
                        ...periodLimit,
                        errorCode: 'EXCHANGE_LIMIT_REACHED'
                    })
                });
            }

            for (const cost of currencyCosts) {
                const amount = normalizeIntegerAmount(cost.amount || 0);
                const balanceAfter = await this.walletRepository.debit(client, {
                    playerId,
                    currencyId: cost.currencyId,
                    amount
                });
                ledgerMutations.push({
                    resourceType: 'CURRENCY',
                    resourceId: cost.currencyId,
                    delta: negateIntegerAmount(amount),
                    balanceAfter,
                    reason: 'EXCHANGE_CURRENCY_COST'
                });
            }

            const consumedItems = [];
            for (const cost of itemCosts) {
                const consumed = await this.inventoryRepository.consumeItemAcrossStacks(client, {
                    playerId,
                    itemId: cost.itemId,
                    quantity: cost.quantity,
                    errorCode: 'INSUFFICIENT_ITEM_COST'
                });
                consumedItems.push(...consumed);
                ledgerMutations.push({
                    resourceType: 'ITEM',
                    resourceId: cost.itemId,
                    delta: negateIntegerAmount(cost.quantity),
                    balanceAfter: await this.inventoryRepository.getStackQuantity(
                        client, playerId, cost.itemId
                    ),
                    reason: 'EXCHANGE_ITEM_COST'
                });
            }

            const appliedRewards = [];
            for (const reward of currencyRewards) {
                const amount = normalizeIntegerAmount(reward.amount || 0);
                const balanceAfter = await this.walletRepository.credit(client, {
                    playerId,
                    currencyId: reward.currencyId,
                    amount
                });
                ledgerMutations.push({
                    resourceType: 'CURRENCY',
                    resourceId: reward.currencyId,
                    delta: amount,
                    balanceAfter,
                    reason: 'EXCHANGE_CURRENCY_REWARD'
                });

                appliedRewards.push({
                    type: 'CURRENCY',
                    currencyId: reward.currencyId,
                    amount
                });
            }

            for (const reward of itemRewards) {
                const quantity = reward.quantity || 1;
                const inventoryId = await this.inventoryRepository.addStackableItem(client, {
                    playerId,
                    itemId: reward.itemId,
                    quantity
                });
                ledgerMutations.push({
                    resourceType: 'ITEM',
                    resourceId: reward.itemId,
                    delta: normalizeIntegerAmount(quantity),
                    balanceAfter: await this.inventoryRepository.getStackQuantity(
                        client, playerId, reward.itemId
                    ),
                    reason: 'EXCHANGE_ITEM_REWARD'
                });

                appliedRewards.push({
                    type: 'ITEM',
                    itemId: reward.itemId,
                    quantity,
                    inventoryId
                });
            }

            const exchangeResult = await client.query(
                `INSERT INTO player_exchange_logs (
                    player_id,
                    exchange_id,
                    costs,
                    rewards,
                    exchanged_at,
                    operation_id
                 )
                 VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6)
                 RETURNING id, exchanged_at`,
                [
                    playerId,
                    payload.exchangeId,
                    JSON.stringify({
                        currencies: currencyCosts,
                        items: consumedItems
                    }),
                    JSON.stringify(appliedRewards),
                    payload.exchangedAt || new Date(),
                    options.operationId || null
                ]
            );
            const exchangeLogId = String(exchangeResult.rows[0].id);
            await this.resourceLedgerRepository.recordMany(client, ledgerMutations.map((entry) => ({
                ...entry,
                playerId,
                referenceType: 'EXCHANGE',
                referenceId: exchangeLogId,
                operationId: options.operationId,
                createdAt: exchangeResult.rows[0].exchanged_at
            })));

            return {
                status: 'EXCHANGED',
                exchangeLogId,
                playerId,
                exchangeId: payload.exchangeId,
                consumed: {
                    currencies: currencyCosts,
                    items: consumedItems
                },
                rewards: appliedRewards,
                periodCounterValues,
                exchangedAt: exchangeResult.rows[0].exchanged_at
            };
        };

        return options.client ? work(options.client) : runInTransaction(work);
    }
}
